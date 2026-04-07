/// <reference types="node" />
import { supabaseAdmin, parseArgs } from './supabaseAdmin';

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const limit = Number(args.get('limit') || 20);

  const { data, error } = await supabaseAdmin
    .from('businesses')
    .select('id,name,normalized_phone,normalized_phone_source,phone_valid,phone_invalid_reason')
    .eq('phone_valid', true)
    .not('normalized_phone', 'is', null)
    .limit(limit);

  if (error) throw new Error(`Failed to preview audience: ${error.message}`);

  console.log(`=== Valid Audience Preview (limit=${limit}) ===`);
  for (const row of data || []) {
    console.log(
      `business_id=${row.id} name=${row.name ?? 'N/A'} selected_phone=${row.normalized_phone} source=${row.normalized_phone_source ?? 'unknown'}`,
    );
  }
}

run().catch((error) => {
  console.error('[previewAudience] Fatal:', error);
  process.exitCode = 1;
});
