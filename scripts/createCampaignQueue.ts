/// <reference types="node" />
import { supabaseAdmin, parseArgs } from './supabaseAdmin';

interface CandidateBusiness {
  id: string;
  name: string | null;
  normalized_phone: string | null;
  normalized_phone_source: string | null;
  phone_valid: boolean | null;
  phone_invalid_reason: string | null;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const campaignId = args.get('campaign-id');
  const templateId = args.get('template-id');
  const messageTemplate = args.get('message') || 'Hello {{business_name}}';
  const dryRun = args.get('dry-run') !== 'false';
  const tinyTest = args.get('tiny-test') === 'true';
  const explicitLimit = Number(args.get('limit') || 0);
  const limit = tinyTest ? Math.min(3, explicitLimit || 3) : explicitLimit;

  if (!campaignId) throw new Error('Missing --campaign-id=<uuid>');
  if (!templateId) throw new Error('Missing --template-id=<uuid>');

  let query = supabaseAdmin
    .from('businesses')
    .select('id,name,normalized_phone,normalized_phone_source,phone_valid,phone_invalid_reason')
    .eq('phone_valid', true)
    .not('normalized_phone', 'is', null);

  if (limit > 0) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load valid audience: ${error.message}`);

  const candidates = (data || []) as CandidateBusiness[];

  const queueRows = candidates
    .filter((biz) => Boolean(biz.normalized_phone))
    .map((biz) => {
      const renderedBody = messageTemplate.replaceAll('{{business_name}}', biz.name || 'Business');
      console.log(
        `[queue] include business_id=${biz.id} selected_phone=${biz.normalized_phone} source=${biz.normalized_phone_source ?? 'unknown'} status=pending`,
      );

      return {
        campaign_id: campaignId,
        template_id: templateId,
        business_id: biz.id,
        phone: biz.normalized_phone,
        selected_phone: biz.normalized_phone,
        phone_source: biz.normalized_phone_source,
        rendered_body: renderedBody,
        status: 'pending',
        attempt_count: 0,
      };
    });

  console.log(`[queue] eligible_businesses=${candidates.length} queued_rows=${queueRows.length} dry_run=${dryRun} tiny_test=${tinyTest}`);

  if (dryRun || queueRows.length === 0) {
    if (queueRows.length === 0) console.log('[queue] No valid recipients found.');
    return;
  }

  const { error: insertError } = await supabaseAdmin.from('messages').insert(queueRows);
  if (insertError) throw new Error(`Failed to create queue rows: ${insertError.message}`);

  console.log(`[queue] inserted=${queueRows.length}`);
}

run().catch((error) => {
  console.error('[createCampaignQueue] Fatal:', error);
  process.exitCode = 1;
});
