/// <reference types="node" />
import { supabaseAdmin, parseArgs, PHONE_FIELDS, BusinessRow } from './supabaseAdmin';
import { selectBestBusinessPhone } from '../src/lib/phonePipeline';

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = args.get('dry-run') !== 'false';
  const limit = Number(args.get('limit') || 0);

  const { data: columns, error: columnsError } = await supabaseAdmin
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'businesses');

  if (columnsError) {
    throw new Error(`Cannot inspect businesses schema: ${columnsError.message}`);
  }

  const columnSet = new Set((columns || []).map((c: { column_name: string }) => c.column_name));
  const existingPhoneFields = PHONE_FIELDS.filter((field) => columnSet.has(field));

  if (existingPhoneFields.length === 0) {
    throw new Error('No phone fields found in businesses table.');
  }

  let query = supabaseAdmin
    .from('businesses')
    .select(['id', 'name', ...existingPhoneFields, 'normalized_phone', 'normalized_phone_source', 'phone_valid', 'phone_invalid_reason'].join(','));

  if (limit > 0) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Cannot fetch businesses: ${error.message}`);
  }

  const rows = (data || []) as unknown as BusinessRow[];
  const updates = rows.map((row) => {
    const selected = selectBestBusinessPhone(row);

    console.log(
      `[normalize] business_id=${row.id} selected=${selected.selectedPhone ?? 'null'} source=${selected.phoneSource ?? 'null'} valid=${selected.isValid} reason=${selected.invalidReason ?? 'none'}`,
    );

    return {
      id: row.id,
      normalized_phone: selected.selectedPhone,
      normalized_phone_source: selected.phoneSource,
      phone_valid: selected.isValid,
      phone_invalid_reason: selected.invalidReason,
    };
  });

  console.log(`\n[normalize] evaluated=${rows.length} dry_run=${dryRun}`);

  if (dryRun) {
    console.log('[normalize] Dry run complete. No database writes performed.');
    return;
  }

  if (updates.length === 0) {
    console.log('[normalize] No rows to update.');
    return;
  }

  const { error: upsertError } = await supabaseAdmin.from('businesses').upsert(updates, { onConflict: 'id' });
  if (upsertError) {
    throw new Error(`Failed to update normalized fields: ${upsertError.message}`);
  }

  console.log(`[normalize] Updated ${updates.length} businesses.`);
}

run().catch((error) => {
  console.error('[normalizeBusinessesPhones] Fatal:', error);
  process.exitCode = 1;
});
