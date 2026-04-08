// @ts-nocheck
import { getAdminClient, getNabdaConfig, jsonResponse } from '../_shared/env.ts';
import { sendViaNabda } from '../_shared/nabda.ts';

Deno.serve(async (req) => {
  try {
    const body = (await req.json().catch(() => ({}))) as { batchSize?: number; delayMs?: number };
    const batchSize = Math.max(1, Math.min(50, Number(body.batchSize || 10)));
    const delayMs = Math.max(0, Number(body.delayMs || 1000));

    const client = getAdminClient();
    const nabda = getNabdaConfig();

    if (!nabda.apiUrl || !nabda.instanceId || !nabda.apiToken) {
      return jsonResponse({ ok: false, error: 'Nabda env vars are missing' }, 400);
    }

    const { data: messages, error } = await client
      .from('messages')
      .select('id,campaign_id,normalized_phone,rendered_message,attempts')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(batchSize);

    if (error) {
      return jsonResponse({ ok: false, error: error.message }, 500);
    }

    const results: Array<{ messageId: string; ok: boolean; error?: string }> = [];

    for (const message of messages || []) {
      const nextAttempt = (message.attempts || 0) + 1;
      await client.from('messages').update({ status: 'sending', attempts: nextAttempt }).eq('id', message.id);

      const sent = await sendViaNabda(nabda, {
        phone: message.normalized_phone,
        text: message.rendered_message,
      });

      const nextStatus = sent.ok ? 'sent' : 'failed';
      await client
        .from('messages')
        .update({
          status: nextStatus,
          sent_at: sent.ok ? new Date().toISOString() : null,
          last_error: sent.ok ? null : sent.error || JSON.stringify(sent.raw),
          provider_message_id: sent.providerMessageId,
        })
        .eq('id', message.id);

      await client.from('send_logs').insert({
        message_id: message.id,
        campaign_id: message.campaign_id,
        normalized_phone: message.normalized_phone,
        status: nextStatus,
        provider: 'nabda',
        provider_message_id: sent.providerMessageId,
        details: sent.ok ? 'Queued message sent' : sent.error || 'Nabda send failed',
        payload: sent.raw,
      });

      results.push({ messageId: message.id, ok: sent.ok, error: sent.error });

      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    return jsonResponse({ ok: true, processed: results.length, results });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
