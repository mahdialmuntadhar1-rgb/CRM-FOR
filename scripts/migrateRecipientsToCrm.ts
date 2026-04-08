/// <reference types="node" />
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { normalizeIraqiPhone } from '../src/lib/phonePipeline';

const CRM_LOCKED_URL = 'https://ujdsxzvvgaugypwtugdl.supabase.co';
const DEFAULT_SOURCE_TABLES = ['businesses', 'contacts'];
const PHONE_FIELD_PRIORITY = ['whatsapp', 'phone', 'mobile', 'phone1', 'phone2', 'phone_1', 'phone_2', 'mobile_phone'] as const;
const NAME_FIELD_PRIORITY = ['display_name', 'name', 'business_name', 'contact_name', 'full_name', 'owner_name'] as const;
const GOVERNORATE_FIELDS = ['governorate', 'province', 'city'] as const;
const CATEGORY_FIELDS = ['category', 'segment', 'business_type', 'industry'] as const;
const ALTERNATE_PHONE_FIELDS = ['phone2', 'phone_2', 'alternate_phone', 'alt_phone'] as const;

const currentFileDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentFileDir, '..');
for (const envFile of [resolve(repoRoot, '.env'), resolve(repoRoot, '.env.local')]) {
  if (existsSync(envFile)) dotenv.config({ path: envFile, override: false });
}

function parseArgs(argv: string[]) {
  return new Map(
    argv
      .filter((token) => token.startsWith('--'))
      .map((token) => {
        const [key, value] = token.replace('--', '').split('=');
        return [key, value ?? 'true'] as const;
      }),
  );
}

function pickFirst(row: Record<string, any>, fields: readonly string[]) {
  for (const field of fields) {
    const v = row[field];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

function selectExistingColumns(allColumns: string[], preferred: readonly string[]) {
  const set = new Set(allColumns);
  return preferred.filter((c) => set.has(c));
}

async function fetchColumns(client: ReturnType<typeof createClient>, table: string) {
  const { data, error } = await client
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_schema', 'public')
    .eq('table_name', table);

  if (error) throw new Error(`Cannot inspect columns for ${table}: ${error.message}`);
  return (data || []).map((r: { column_name: string }) => r.column_name);
}

async function fetchAllRows(client: ReturnType<typeof createClient>, table: string, columns: string[]) {
  const pageSize = 1000;
  let from = 0;
  const all: Record<string, any>[] = [];

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await client.from(table).select(columns.join(',')).range(from, to);
    if (error) throw new Error(`Cannot fetch ${table} rows (${from}-${to}): ${error.message}`);
    const rows = data || [];
    all.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return all;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = args.get('dry-run') !== 'false';
  const sourceTables = (args.get('source-tables') || DEFAULT_SOURCE_TABLES.join(','))
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

  const sourceUrl = process.env.SOURCE_SUPABASE_URL;
  const sourceServiceKey = process.env.SOURCE_SUPABASE_SERVICE_ROLE_KEY;
  const targetUrl = process.env.TARGET_SUPABASE_URL || process.env.SUPABASE_URL || CRM_LOCKED_URL;
  const targetServiceKey = process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!sourceUrl || !sourceServiceKey) {
    throw new Error('Missing SOURCE_SUPABASE_URL or SOURCE_SUPABASE_SERVICE_ROLE_KEY.');
  }
  if (!targetServiceKey) {
    throw new Error('Missing TARGET_SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY.');
  }
  if (targetUrl !== CRM_LOCKED_URL) {
    throw new Error(`Blocked: TARGET_SUPABASE_URL must be ${CRM_LOCKED_URL}`);
  }
  if (sourceUrl === targetUrl) {
    throw new Error('Blocked: source and target Supabase URLs are identical.');
  }

  const source = createClient(sourceUrl, sourceServiceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const target = createClient(targetUrl, targetServiceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const sourceProject = new URL(sourceUrl).hostname.split('.')[0];
  const targetProject = new URL(targetUrl).hostname.split('.')[0];

  console.log('A. Database mapping');
  console.log(`- source list database: ${sourceUrl} (project_ref=${sourceProject})`);
  console.log(`- target CRM messaging database: ${targetUrl} (project_ref=${targetProject})`);

  const { data: existingContacts, error: existingError } = await target
    .from('contacts')
    .select('id,normalized_phone,source_project,source_table,source_record_id,updated_at');
  if (existingError) throw new Error(`Cannot read target contacts: ${existingError.message}`);

  const existingByNormalized = new Set((existingContacts || []).map((r) => r.normalized_phone).filter(Boolean));

  const imports: Record<string, any>[] = [];
  const reportByTable: Record<string, any> = {};
  const sampleTransforms: Array<{ raw: string | null; normalized: string | null; reason: string | null }> = [];

  for (const table of sourceTables) {
    const cols = await fetchColumns(source, table);
    if (!cols.length) continue;

    const idField = cols.includes('id') ? 'id' : cols.includes('uuid') ? 'uuid' : null;
    const nameFields = selectExistingColumns(cols, NAME_FIELD_PRIORITY);
    const phoneFields = selectExistingColumns(cols, PHONE_FIELD_PRIORITY);
    const govFields = selectExistingColumns(cols, GOVERNORATE_FIELDS);
    const categoryFields = selectExistingColumns(cols, CATEGORY_FIELDS);
    const altPhoneFields = selectExistingColumns(cols, ALTERNATE_PHONE_FIELDS);
    const updatedAtField = cols.includes('updated_at') ? 'updated_at' : cols.includes('modified_at') ? 'modified_at' : null;

    const selectedCols = Array.from(new Set([...(idField ? [idField] : []), ...nameFields, ...phoneFields, ...govFields, ...categoryFields, ...altPhoneFields, ...(updatedAtField ? [updatedAtField] : [])]));
    const rows = await fetchAllRows(source, table, selectedCols);

    let withCandidate = 0;
    let valid = 0;
    let invalid = 0;
    let missing = 0;
    let duplicates = 0;
    const seenInSource = new Set<string>();

    for (const row of rows) {
      const name = pickFirst(row, nameFields) || null;

      let selectedField: string | null = null;
      let rawPhone: string | null = null;
      for (const field of phoneFields) {
        const value = row[field];
        if (typeof value === 'string' && value.trim()) {
          selectedField = field;
          rawPhone = value.trim();
          break;
        }
      }

      const whatsappPhone = typeof row.whatsapp === 'string' ? row.whatsapp.trim() : null;
      const alternatePhone = pickFirst(row, altPhoneFields);

      if (rawPhone) withCandidate += 1;
      const normalized = normalizeIraqiPhone(rawPhone);
      if (sampleTransforms.length < 12) {
        sampleTransforms.push({ raw: rawPhone, normalized: normalized.normalized, reason: normalized.reason });
      }

      if (!rawPhone) missing += 1;
      else if (!normalized.isValid || !normalized.normalized) invalid += 1;
      else valid += 1;

      const duplicateInSource = normalized.normalized ? seenInSource.has(normalized.normalized) : false;
      if (normalized.normalized && !duplicateInSource) seenInSource.add(normalized.normalized);
      if (duplicateInSource) duplicates += 1;

      const duplicateInTarget = Boolean(normalized.normalized && existingByNormalized.has(normalized.normalized));
      const isDuplicate = duplicateInSource || duplicateInTarget;
      const hasUsableName = Boolean(name && name.trim().length > 0);

      const validityStatus = !rawPhone
        ? 'missing_phone'
        : normalized.isValid && normalized.normalized
          ? 'valid'
          : 'invalid';

      const duplicateStatus = isDuplicate
        ? duplicateInSource
          ? 'duplicate_in_source'
          : 'duplicate_in_target'
        : 'unique';

      const readyToSend = validityStatus === 'valid' && !isDuplicate && hasUsableName;

      imports.push({
        source_project: sourceProject,
        source_table: table,
        source_record_id: idField ? String(row[idField]) : null,
        source_phone_field: selectedField,
        original_name: name,
        display_name: name,
        raw_phone: rawPhone,
        normalized_phone: normalized.normalized,
        whatsapp_phone: whatsappPhone,
        alternate_phone: alternatePhone,
        governorate: pickFirst(row, govFields),
        category: pickFirst(row, categoryFields),
        phone_candidates: phoneFields.reduce(
          (acc, field) => {
            if (typeof row[field] === 'string' && row[field].trim()) acc[field] = row[field].trim();
            return acc;
          },
          {} as Record<string, string>,
        ),
        is_phone_valid: validityStatus === 'valid',
        is_duplicate: isDuplicate,
        ready_to_send: readyToSend,
        validity_status: validityStatus,
        duplicate_status: duplicateStatus,
        imported_at: new Date().toISOString(),
        source_updated_at: updatedAtField ? row[updatedAtField] : null,
      });
    }

    reportByTable[table] = {
      sourceRecords: rows.length,
      withPhoneCandidate: withCandidate,
      validNormalized: valid,
      invalid,
      duplicates,
      missing,
    };

    console.log(`\nB. Source table: ${table}`);
    console.log(`- name fields: ${nameFields.join(', ') || '(none)'}`);
    console.log(`- phone fields: ${phoneFields.join(', ') || '(none)'}`);
    console.log(`- governorate fields: ${govFields.join(', ') || '(none)'}`);
    console.log(`- category fields: ${categoryFields.join(', ') || '(none)'}`);
    console.log(`- rows: ${rows.length}, candidates: ${withCandidate}, valid: ${valid}, invalid: ${invalid}, duplicates: ${duplicates}, missing: ${missing}`);
  }

  const upserts = imports.filter((row) => row.source_record_id);

  if (!dryRun && upserts.length) {
    const chunkSize = 500;
    for (let i = 0; i < upserts.length; i += chunkSize) {
      const chunk = upserts.slice(i, i + chunkSize);
      const { error } = await target.from('contacts').upsert(chunk, { onConflict: 'source_project,source_table,source_record_id' });
      if (error) throw new Error(`Failed importing chunk ${i}-${i + chunk.length - 1}: ${error.message}`);
    }
  }

  const importedCount = dryRun ? 0 : upserts.length;
  const skippedCount = imports.length - upserts.length;

  console.log('\nC. Canonical Nabda send format chosen');
  console.log('- +9647XXXXXXXXX (E.164 with leading +), matching `messages.normalized_phone` -> Nabda `to` payload.');

  console.log('\nD. Normalization rules implemented');
  console.log('- Strip non-digit/non-plus symbols, collapse 00 and repeated 964 prefixes.');
  console.log('- Accept 07XXXXXXXXX, 7XXXXXXXXX, 9647XXXXXXXXX, +9647XXXXXXXXX.');
  console.log('- Reject malformed, non-mobile, or non-Iraqi patterns.');

  console.log('\nH. Counts summary');
  const totals = Object.values(reportByTable).reduce(
    (acc: any, item: any) => {
      acc.sourceRecords += item.sourceRecords;
      acc.withPhoneCandidate += item.withPhoneCandidate;
      acc.validNormalized += item.validNormalized;
      acc.invalid += item.invalid;
      acc.duplicates += item.duplicates;
      acc.missing += item.missing;
      return acc;
    },
    { sourceRecords: 0, withPhoneCandidate: 0, validNormalized: 0, invalid: 0, duplicates: 0, missing: 0 },
  );
  console.log({ ...totals, imported: importedCount, skipped: skippedCount, dryRun });

  console.log('\nDiagnostics: sample before/after');
  sampleTransforms.slice(0, 10).forEach((s, idx) => console.log(`${idx + 1}. raw=${s.raw ?? 'null'} => normalized=${s.normalized ?? 'null'} reason=${s.reason ?? 'ok'}`));
}

main().catch((error) => {
  console.error('[migrateRecipientsToCrm] Fatal:', error);
  process.exitCode = 1;
});
