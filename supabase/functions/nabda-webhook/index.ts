// @ts-nocheck
import { getAdminClient, jsonResponse } from '../_shared/env.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405);
  }

  try {
    const payload = await req.json().catch(() => ({}));
    const eventType = payload?.event || payload?.type || 'unknown';
    const providerMessageId = payload?.message_id || payload?.id || payload?.data?.message_id || null;
    const phone = payload?.from || payload?.to || payload?.phone || payload?.data?.phone || null;
    const text = payload?.text || payload?.body || payload?.message || payload?.data?.text || null;

    const client = getAdminClient();

    await client.from('webhook_events').insert({
      source: 'nabda',
      event_type: eventType,
      payload,
    });

    if (providerMessageId) {
      const { data: message } = await client
        .from('messages')
        .select('id')
        .eq('provider_message_id', providerMessageId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (message) {
        if (eventType === 'message.sent' || eventType === 'message.ack') {
          await client.from('messages').update({ status: 'sent' }).eq('id', message.id);
        }

        if (eventType === 'message.received') {
          await client.from('messages').update({ status: 'replied' }).eq('id', message.id);
        }

        await client.from('replies').insert({
          message_id: message.id,
          provider_message_id: providerMessageId,
          normalized_phone: phone,
          body: text,
          event_type: eventType,
          payload,
        });
      }
    }

    return jsonResponse({ ok: true, eventType });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
