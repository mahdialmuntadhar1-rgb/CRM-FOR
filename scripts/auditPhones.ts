/// <reference types="node" />
import { supabaseAdmin, PHONE_FIELDS, BusinessRow, resolveExistingBusinessPhoneFields } from './supabaseAdmin';
import { normalizeIraqiPhone, selectBestBusinessPhone } from '../src/lib/phonePipeline';

interface SchemaColumnRow {
  column_name: string;
  data_type: string;
  is_nullable: 'YES' | 'NO';
}

async function fetchTableColumns(tableName: string): Promise<SchemaColumnRow[]> {
  const { data, error } = await supabaseAdmin
    .from('information_schema.columns')
    .select('column_name,data_type,is_nullable')
    .eq('table_schema', 'public')
    .eq('table_name', tableName)
    .order('ordinal_position', { ascending: true });

  if (error) {
    throw new Error(`Schema audit failed for ${tableName}: ${error.message}`);
  }

  return (data as SchemaColumnRow[]) || [];
}

function summarizeInvalidSamples(rows: BusinessRow[]) {
  const issues = new Map<string, number>();

  for (const row of rows) {
    for (const field of PHONE_FIELDS) {
      const value = row[field];
      const result = normalizeIraqiPhone(value ?? null);
      if (!result.isValid) {
        const key = `${field}:${result.reason}`;
        issues.set(key, (issues.get(key) || 0) + 1);
      }
    }
  }

  return Array.from(issues.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
}

async function runAudit() {
  const businessesColumns = await fetchTableColumns('businesses');
  const messagesColumns = await fetchTableColumns('messages');

  const existingPhoneFields = await resolveExistingBusinessPhoneFields();

  if (existingPhoneFields.length === 0) {
    throw new Error('No expected phone fields found on businesses table.');
  }

  const { data: businesses, error } = await supabaseAdmin
    .from('businesses')
    .select(['id', 'name', ...existingPhoneFields, 'normalized_phone', 'normalized_phone_source', 'phone_valid', 'phone_invalid_reason'].join(','));

  if (error) {
    throw new Error(`Failed to fetch businesses: ${error.message}`);
  }

  const rows = (businesses || []) as unknown as BusinessRow[];

  let withAtLeastOnePhone = 0;
  let validSelectedPhone = 0;
  const invalidReasonCounts = new Map<string, number>();
  const normalizedDuplicates = new Map<string, number>();

  rows.forEach((row) => {
    const hasAnyPhone = existingPhoneFields.some((field) => {
      const value = row[field];
      return Boolean(value && value.trim().length > 0);
    });

    if (hasAnyPhone) withAtLeastOnePhone += 1;

    const selected = selectBestBusinessPhone(row);

    if (selected.isValid && selected.selectedPhone) {
      validSelectedPhone += 1;
      normalizedDuplicates.set(selected.selectedPhone, (normalizedDuplicates.get(selected.selectedPhone) || 0) + 1);
    } else {
      const key = selected.invalidReason || 'unknown_invalid_reason';
      invalidReasonCounts.set(key, (invalidReasonCounts.get(key) || 0) + 1);
    }
  });

  const duplicateCount = Array.from(normalizedDuplicates.values()).filter((count) => count > 1).length;

  console.log('=== Phone Pipeline Audit ===');
  console.log('businesses columns:', businessesColumns.map((c) => c.column_name).join(', '));
  console.log('messages columns:', messagesColumns.map((c) => c.column_name).join(', '));
  console.log(`detected phone fields: ${existingPhoneFields.join(', ')}`);
  console.log(`total businesses: ${rows.length}`);
  console.log(`businesses with at least one phone field populated: ${withAtLeastOnePhone}`);
  console.log(`businesses with valid normalized selected phone: ${validSelectedPhone}`);
  console.log(`businesses excluded: ${rows.length - validSelectedPhone}`);
  console.log(`duplicate normalized selected phones: ${duplicateCount}`);

  console.log('\nTop invalid reasons (selected phone level):');
  Array.from(invalidReasonCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([reason, count]) => console.log(`- ${reason}: ${count}`));

  console.log('\nField-level invalid samples:');
  summarizeInvalidSamples(rows).forEach(([issue, count]) => console.log(`- ${issue}: ${count}`));
}

runAudit().catch((error) => {
  console.error('[auditPhones] Fatal:', error);
  process.exitCode = 1;
});
