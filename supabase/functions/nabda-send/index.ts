// @ts-nocheck
import { getAdminClient, getNabdaConfig, jsonResponse } from '../_shared/env.ts';
import { sendViaNabda } from '../_shared/nabda.ts';

interface SendRequest {
  messageId?: string;
  phone?: string;
  text?: string;
}

Deno.serve(async (req) => {
  try {
    const body = (await req.json().catch(() => ({}))) as SendRequest;
    const client = getAdminClient();
    const nabda = getNabdaConfig();

    if (!nabda.apiUrl || !nabda.instanceId || !nabda.apiToken) {
      return jsonResponse({ ok: false, error: 'NABDA_API_URL / NABDA_INSTANCE_ID / NABDA_API_TOKEN are required' }, 400);
    }

    let messageId = body.messageId;
    let phone = body.phone;
    let text = body.text;
    let campaignId: string | null = null;

    if (messageId) {
      const { data: message, error } = await client
        .from('messages')
        .select('id,campaign_id,normalized_phone,rendered_message,status')
        .eq('id', messageId)
        .single();

      if (error || !message) {
        return jsonResponse({ ok: false, error: `Message not found: ${messageId}` }, 404);
      }

      phone = message.normalized_phone;
      text = message.rendered_message;
      campaignId = message.campaign_id;

      await client.from('messages').update({ status: 'sending', attempts: 1 }).eq('id', messageId);
    }

    if (!phone || !text) {
      return jsonResponse({ ok: false, error: 'Provide messageId or both phone and text' }, 400);
    }

    const result = await sendViaNabda(nabda, { phone, text });

    if (messageId) {
      const status = result.ok ? 'sent' : 'failed';
      await client
        .from('messages')
        .update({
          status,
          sent_at: result.ok ? new Date().toISOString() : null,
          last_error: result.ok ? null : result.error || JSON.stringify(result.raw),
          provider_message_id: result.providerMessageId,
          attempts: result.ok ? 1 : 1,
        })
        .eq('id', messageId);
    }

    await client.from('send_logs').insert({
      message_id: messageId || null,
      campaign_id: campaignId,
      normalized_phone: phone,
      status: result.ok ? 'sent' : 'failed',
      provider: 'nabda',
      provider_message_id: result.providerMessageId,
      details: result.ok ? 'Sent via nabda-send edge function' : result.error || 'Nabda failed',
      payload: result.raw,
    });

    return jsonResponse({ ok: result.ok, ...result }, result.ok ? 200 : 502);
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
