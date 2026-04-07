/// <reference types="node" />
import { supabaseAdmin, parseArgs } from './supabaseAdmin';

const IRAQI_E164_MOBILE = /^\+9647\d{8}$/;

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const campaignId = args.get('campaign-id');
  const templateId = args.get('template-id');
  const expectedCount = Number(args.get('expected-count') || 3);

  if (!campaignId) throw new Error('Missing --campaign-id=<uuid>');

  let query = supabaseAdmin
    .from('messages')
    .select('id,business_id,campaign_id,template_id,status,phone,selected_phone,phone_source', { count: 'exact' })
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
    .limit(expectedCount);

  if (templateId) {
    query = query.eq('template_id', templateId);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to verify queue rows: ${error.message}`);

  const rows = data || [];
  console.log(`[verify-queue] fetched_rows=${rows.length} total_count=${count ?? rows.length}`);

  rows.forEach((row, index) => {
    const selectedPhone = row.selected_phone || row.phone;
    const validPhone = Boolean(selectedPhone && IRAQI_E164_MOBILE.test(selectedPhone));

    console.log(
      `[verify-queue] row#${index + 1} message_id=${row.id} business_id=${row.business_id} status=${row.status} selected_phone=${selectedPhone ?? 'null'} source=${row.phone_source ?? 'null'} valid_phone=${validPhone}`,
    );
  });

  const invalidRows = rows.filter((row) => {
    const selectedPhone = row.selected_phone || row.phone;
    return !selectedPhone || !IRAQI_E164_MOBILE.test(selectedPhone);
  });

  if (rows.length < expectedCount) {
    throw new Error(`Expected at least ${expectedCount} queue rows, found ${rows.length}.`);
  }

  if (invalidRows.length > 0) {
    throw new Error(`Found ${invalidRows.length} queue row(s) with invalid selected_phone/phone.`);
  }

  console.log(`[verify-queue] PASS rows_checked=${rows.length} expected_min=${expectedCount}`);
}

run().catch((error) => {
  console.error('[verifyQueueRows] Fatal:', error);
  process.exitCode = 1;
});
