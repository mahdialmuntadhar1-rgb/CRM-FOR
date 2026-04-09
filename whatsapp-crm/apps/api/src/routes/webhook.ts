// =====================================================
// Webhook API Routes
// Receive and process Nabda WhatsApp events
// =====================================================

import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase-admin.js';
import { normalizePhone, isOptOutKeyword, detectIntent } from '@whatsapp-crm/shared';
import type { WebhookEvent } from '@whatsapp-crm/shared';

const router = Router();

// =====================================================
// POST /webhook/nabda - Receive Nabda webhook events
// =====================================================
router.post('/nabda', async (req, res) => {
  try {
    const payload = req.body;
    
    // Log raw event
    const { data: eventRecord } = await supabaseAdmin
      .from('webhook_events')
      .insert({
        provider: 'nabda',
        event_type: payload.event || 'unknown',
        payload: payload,
        processed: false
      })
      .select()
      .single();

    // Acknowledge receipt immediately
    res.status(200).json({ received: true, event_id: eventRecord.id });

    // Process asynchronously
    processWebhookEvent(payload, eventRecord.id).catch(err => {
      console.error('Error processing webhook:', err);
    });

  } catch (err) {
    console.error('Error receiving webhook:', err);
    // Always return 200 to prevent retries
    res.status(200).json({ received: true, error: 'Processing failed' });
  }
});

// =====================================================
// Process webhook event asynchronously
// =====================================================
async function processWebhookEvent(payload: Record<string, unknown>, eventId: string) {
  try {
    const event = payload.event as string;
    const data = payload.data as Record<string, unknown> || {};
    
    const phoneRaw = data.phone as string;
    const messageId = data.messageId as string || data.message_id as string;
    const status = data.status as string;
    const messageText = data.message as string;

    if (!phoneRaw) {
      throw new Error('No phone number in webhook payload');
    }

    // Normalize phone
    const phoneResult = normalizePhone(phoneRaw);
    if (!phoneResult.isValid || !phoneResult.normalized) {
      throw new Error(`Invalid phone in webhook: ${phoneResult.reason}`);
    }

    const phone = phoneResult.normalized;

    // Find or create contact
    let { data: contact } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('normalized_phone', phone)
      .single();

    if (!contact) {
      // Auto-create contact from webhook (inbound message)
      const { data: newContact } = await supabaseAdmin
        .from('contacts')
        .insert({
          business_name: 'Unknown',
          normalized_phone: phone,
          raw_phone: phoneRaw,
          whatsapp_status: 'valid',
          source: 'webhook'
        })
        .select()
        .single();
      
      contact = newContact;
    }

    // Process by event type
    switch (event) {
      case 'message.received':
      case 'message_received': {
        // Store inbound message
        const { data: messageRecord } = await supabaseAdmin
          .from('messages')
          .insert({
            contact_id: contact.id,
            direction: 'inbound',
            provider: 'nabda',
            provider_message_id: messageId,
            phone: phone,
            body: messageText || '',
            received_at: new Date().toISOString()
          })
          .select()
          .single();

        // Detect intent
        if (messageText) {
          const { intent, confidence } = detectIntent(messageText);
          
          await supabaseAdmin.from('reply_intents').insert({
            message_id: messageRecord.id,
            contact_id: contact.id,
            detected_intent: intent,
            confidence: confidence,
            handled: false
          });

          // Auto-opt-out if stop keyword detected
          if (intent === 'stop' || isOptOutKeyword(messageText)) {
            await supabaseAdmin
              .from('contacts')
              .update({ opted_out: true, whatsapp_status: 'opted_out' })
              .eq('id', contact.id);

            // Send opt-out confirmation
            // TODO: Queue opt-out confirmation message
          }
        }
        break;
      }

      case 'message.sent':
      case 'message_sent': {
        // Update outbound message status
        await supabaseAdmin
          .from('messages')
          .update({ 
            status: 'sent',
            provider_message_id: messageId,
            sent_at: new Date().toISOString()
          })
          .eq('phone', phone)
          .is('sent_at', null);
        break;
      }

      case 'message.delivered':
      case 'message_delivered': {
        // Update message status and campaign_recipient
        await supabaseAdmin
          .from('messages')
          .update({ 
            status: 'delivered',
            delivered_at: new Date().toISOString()
          })
          .eq('provider_message_id', messageId);

        // Update campaign_recipient status
        await supabaseAdmin
          .from('campaign_recipients')
          .update({ status: 'delivered' })
          .eq('contact_id', contact.id)
          .eq('status', 'sent');
        break;
      }

      case 'message.read':
      case 'message_read': {
        await supabaseAdmin
          .from('messages')
          .update({ 
            status: 'read',
            read_at: new Date().toISOString()
          })
          .eq('provider_message_id', messageId);
        break;
      }

      case 'message.failed':
      case 'message_failed': {
        await supabaseAdmin
          .from('messages')
          .update({ 
            status: 'failed',
            event_payload: { error: data.error || 'Unknown error' }
          })
          .eq('provider_message_id', messageId);

        await supabaseAdmin
          .from('campaign_recipients')
          .update({ status: 'failed', last_error: data.error as string })
          .eq('contact_id', contact.id)
          .eq('status', 'sending');
        break;
      }
    }

    // Mark event as processed
    await supabaseAdmin
      .from('webhook_events')
      .update({ 
        processed: true, 
        processed_at: new Date().toISOString() 
      })
      .eq('id', eventId);

  } catch (err) {
    console.error('Error in processWebhookEvent:', err);
    
    // Mark event as failed
    await supabaseAdmin
      .from('webhook_events')
      .update({ 
        processed: true,
        processed_at: new Date().toISOString(),
        error_message: (err as Error).message
      })
      .eq('id', eventId);
  }
}

// =====================================================
// GET /webhook/nabda - For webhook verification (if needed)
// =====================================================
router.get('/nabda', (req, res) => {
  // Some providers require GET verification
  res.status(200).send('Webhook endpoint active');
});

export default router;
