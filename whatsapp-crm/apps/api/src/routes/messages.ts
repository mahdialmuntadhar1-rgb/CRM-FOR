// =====================================================
// Messages API Routes
// Send and manage WhatsApp messages
// =====================================================

import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase-admin.js';
import { sendWhatsAppMessage, sendWhatsAppMessageSafe } from '../lib/nabda-client.js';
import { renderTemplate } from './templates.js';
import { normalizePhone, isOptOutKeyword } from '@whatsapp-crm/shared';

const router = Router();

// =====================================================
// GET /api/messages - List messages
// =====================================================
router.get('/', async (req, res) => {
  try {
    const { contact_id, campaign_id, direction, limit = 50 } = req.query;

    let query = supabaseAdmin
      .from('messages')
      .select('*');

    if (contact_id) query = query.eq('contact_id', contact_id);
    if (campaign_id) query = query.eq('campaign_id', campaign_id);
    if (direction) query = query.eq('direction', direction);

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
});

// =====================================================
// POST /api/messages/send-test - Send test message
// =====================================================
router.post('/send-test', async (req, res) => {
  try {
    const { phone, template_id, custom_message, test_mode = true } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    // Normalize phone
    const phoneResult = normalizePhone(phone);
    if (!phoneResult.isValid || !phoneResult.normalized) {
      return res.status(400).json({
        success: false,
        error: `Invalid phone number: ${phoneResult.reason}`
      });
    }

    // Get message content
    let message: string;
    
    if (custom_message) {
      message = custom_message;
    } else if (template_id) {
      const { data: template, error } = await supabaseAdmin
        .from('message_templates')
        .select('*')
        .eq('id', template_id)
        .single();

      if (error || !template) {
        return res.status(400).json({
          success: false,
          error: 'Template not found'
        });
      }

      // Get or create contact for variable substitution
      const { data: contact } = await supabaseAdmin
        .from('contacts')
        .select('*')
        .eq('normalized_phone', phoneResult.normalized)
        .single();

      const variables = {
        business_name: contact?.business_name || 'أبو علي',
        category: contact?.category || 'مطعم',
        city: contact?.city || 'بغداد',
        governorate: contact?.governorate || 'بغداد',
        claim_link: `https://malabazen.iq/claim/test`,
        short_name: contact?.contact_name || contact?.business_name || 'أبو علي'
      };

      message = renderTemplate(template.body, variables, { fallbackMissing: true });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Either template_id or custom_message is required'
      });
    }

    // Check test mode
    const allowedTestNumbers = process.env.TEST_PHONE_NUMBERS?.split(',') || [];
    
    // Send via Nabda
    const result = await sendWhatsAppMessageSafe(
      phoneResult.normalized,
      message,
      test_mode,
      allowedTestNumbers
    );

    // Log message to database
    const { data: contact } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('normalized_phone', phoneResult.normalized)
      .single();

    await supabaseAdmin.from('messages').insert({
      contact_id: contact?.id || '00000000-0000-0000-0000-000000000000',
      direction: 'outbound',
      provider: 'nabda',
      phone: phoneResult.normalized,
      body: message,
      status: result.status,
      sent_at: result.status === 'sent' ? new Date().toISOString() : null
    });

    res.json({
      success: result.status === 'sent',
      data: result,
      message: result.blocked ? 'Blocked by test mode' : undefined
    });
  } catch (err) {
    console.error('Error sending test message:', err);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

// =====================================================
// POST /api/messages/manual-send - Manual message to contact
// =====================================================
router.post('/manual-send', async (req, res) => {
  try {
    const { contact_id, message } = req.body;

    if (!contact_id || !message) {
      return res.status(400).json({
        success: false,
        error: 'contact_id and message are required'
      });
    }

    // Get contact
    const { data: contact, error } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('id', contact_id)
      .single();

    if (error || !contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }

    if (contact.opted_out) {
      return res.status(400).json({
        success: false,
        error: 'Contact has opted out'
      });
    }

    // Send
    const result = await sendWhatsAppMessage(contact.normalized_phone, message);

    // Log
    const { data: messageRecord } = await supabaseAdmin
      .from('messages')
      .insert({
        contact_id,
        direction: 'outbound',
        provider: 'nabda',
        phone: contact.normalized_phone,
        body: message,
        status: result.status,
        sent_at: result.status === 'sent' ? new Date().toISOString() : null
      })
      .select()
      .single();

    // Update contact last_contacted_at
    await supabaseAdmin
      .from('contacts')
      .update({ last_contacted_at: new Date().toISOString() })
      .eq('id', contact_id);

    res.json({
      success: result.status === 'sent',
      data: { result, message: messageRecord }
    });
  } catch (err) {
    console.error('Error sending manual message:', err);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

// =====================================================
// POST /api/messages/detect-intent - Analyze incoming message
// =====================================================
router.post('/detect-intent', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'text is required'
      });
    }

    const lower = text.toLowerCase().trim();
    
    // Intent detection rules (Arabic + English)
    const intents = {
      interested: ['نعم', 'yes', 'مهتم', 'اريد', 'أريد', 'حاب', 'احب', 'details', 'تفاصيل'],
      stop: ['stop', 'إلغاء', 'الغاء', 'لا ترسل', 'unsubscribe', 'block', 'حظر'],
      price: ['price', 'سعر', 'كلفة', 'cost', 'how much', 'بكم', 'فلوس'],
      claim: ['claim', 'تعديل', 'عدل', 'edit', 'update', 'my page'],
      not_now: ['not now', 'بعدين', 'لاحقاً', 'busy', 'مشغول', 'مو هسه']
    };

    let detectedIntent = 'unknown';
    let confidence = 0.5;

    for (const [intent, keywords] of Object.entries(intents)) {
      if (keywords.some(kw => lower.includes(kw.toLowerCase()))) {
        detectedIntent = intent;
        confidence = 0.85;
        break;
      }
    }

    res.json({
      success: true,
      data: {
        text,
        detected_intent: detectedIntent,
        confidence,
        should_opt_out: detectedIntent === 'stop'
      }
    });
  } catch (err) {
    console.error('Error detecting intent:', err);
    res.status(500).json({ success: false, error: 'Failed to detect intent' });
  }
});

export default router;
