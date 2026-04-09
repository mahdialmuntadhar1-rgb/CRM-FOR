// =====================================================
// Inbox API Routes
// Conversation management
// =====================================================

import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase-admin.js';

const router = Router();

// =====================================================
// GET /api/inbox/conversations - List all conversations
// =====================================================
router.get('/conversations', async (req, res) => {
  try {
    const { search, unread_only, limit = 50 } = req.query;

    let query = supabaseAdmin
      .from('conversations')
      .select('*');

    if (search) {
      query = query.or(`business_name.ilike.%${search}%,normalized_phone.ilike.%${search}%`);
    }
    
    if (unread_only === 'true') {
      query = query.gt('unread_count', 0);
    }

    const { data, error } = await query
      .order('last_message_at', { ascending: false })
      .limit(Number(limit));

    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch conversations' });
  }
});

// =====================================================
// GET /api/inbox/:contact_id/messages - Get conversation
// =====================================================
router.get('/:contact_id/messages', async (req, res) => {
  try {
    const { limit = 100 } = req.query;

    // Get messages
    const { data: messages, error } = await supabaseAdmin
      .from('messages')
      .select(`
        *,
        reply_intents(*)
      `)
      .eq('contact_id', req.params.contact_id)
      .order('created_at', { ascending: true })
      .limit(Number(limit));

    if (error) throw error;

    // Mark inbound messages as read
    await supabaseAdmin
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('contact_id', req.params.contact_id)
      .eq('direction', 'inbound')
      .is('read_at', null);

    // Get contact details
    const { data: contact } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('id', req.params.contact_id)
      .single();

    res.json({
      success: true,
      data: {
        contact,
        messages
      }
    });
  } catch (err) {
    console.error('Error fetching conversation:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch conversation' });
  }
});

// =====================================================
// POST /api/inbox/:contact_id/reply - Reply to conversation
// =====================================================
router.post('/:contact_id/reply', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'message is required'
      });
    }

    // Get contact
    const { data: contact, error } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('id', req.params.contact_id)
      .single();

    if (error || !contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }

    // Note: Actual sending would use the Nabda client
    // For now, just log the reply
    const { data: messageRecord } = await supabaseAdmin
      .from('messages')
      .insert({
        contact_id: req.params.contact_id,
        direction: 'outbound',
        provider: 'nabda',
        phone: contact.normalized_phone,
        body: message,
        status: 'pending',
        sent_at: new Date().toISOString()
      })
      .select()
      .single();

    res.json({
      success: true,
      data: messageRecord
    });
  } catch (err) {
    console.error('Error sending reply:', err);
    res.status(500).json({ success: false, error: 'Failed to send reply' });
  }
});

// =====================================================
// POST /api/inbox/:contact_id/quick-action - Quick actions
// =====================================================
router.post('/:contact_id/quick-action', async (req, res) => {
  try {
    const { action } = req.body;
    const contactId = req.params.contact_id;

    switch (action) {
      case 'mark_interested': {
        await supabaseAdmin
          .from('contacts')
          .update({ tags: ['interested'] })
          .eq('id', contactId);
        break;
      }
      case 'mark_claimed': {
        await supabaseAdmin
          .from('contacts')
          .update({ tags: ['claimed'], whatsapp_status: 'converted' })
          .eq('id', contactId);
        break;
      }
      case 'mark_opt_out': {
        await supabaseAdmin
          .from('contacts')
          .update({ opted_out: true, whatsapp_status: 'opted_out' })
          .eq('id', contactId);
        break;
      }
      default:
        return res.status(400).json({
          success: false,
          error: 'Unknown action'
        });
    }

    res.json({
      success: true,
      message: `Action ${action} completed`
    });
  } catch (err) {
    console.error('Error processing quick action:', err);
    res.status(500).json({ success: false, error: 'Failed to process action' });
  }
});

export default router;
