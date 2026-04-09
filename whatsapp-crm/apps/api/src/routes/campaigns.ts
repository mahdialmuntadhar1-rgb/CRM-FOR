// =====================================================
// Campaigns API Routes
// Campaign management and queue operations
// =====================================================

import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase-admin.js';
import type { CampaignInsert } from '@whatsapp-crm/shared';

const router = Router();

// =====================================================
// GET /api/campaigns - List campaigns with stats
// =====================================================
router.get('/', async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;

    let query = supabaseAdmin
      .from('campaigns')
      .select(`
        *,
        campaign_stats(*)
      `);

    if (status) query = query.eq('status', status);

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    console.error('Error fetching campaigns:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch campaigns' });
  }
});

// =====================================================
// GET /api/campaigns/:id - Get campaign with recipients
// =====================================================
router.get('/:id', async (req, res) => {
  try {
    const { data: campaign, error } = await supabaseAdmin
      .from('campaigns')
      .select(`
        *,
        message_templates:template_id (*),
        campaign_stats(*)
      `)
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    res.json({ success: true, data: campaign });
  } catch (err) {
    console.error('Error fetching campaign:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch campaign' });
  }
});

// =====================================================
// POST /api/campaigns - Create new campaign
// =====================================================
router.post('/', async (req, res) => {
  try {
    const { name, mode, template_id, contact_ids, filters } = req.body;

    if (!name || !mode || !template_id) {
      return res.status(400).json({
        success: false,
        error: 'name, mode, and template_id are required'
      });
    }

    // Validate template exists
    const { data: template, error: templateError } = await supabaseAdmin
      .from('message_templates')
      .select('*')
      .eq('id', template_id)
      .single();

    if (templateError || !template) {
      return res.status(400).json({
        success: false,
        error: 'Template not found'
      });
    }

    // Create campaign
    const campaignData: CampaignInsert = {
      name,
      mode,
      template_id,
      daily_limit: req.body.daily_limit || 50,
      min_delay_seconds: req.body.min_delay_seconds || 45,
      max_delay_seconds: req.body.max_delay_seconds || 120,
      batch_size: req.body.batch_size || 5,
      active_hours_start: req.body.active_hours_start || '09:00',
      active_hours_end: req.body.active_hours_end || '18:00'
    };

    const { data: campaign, error } = await supabaseAdmin
      .from('campaigns')
      .insert(campaignData)
      .select()
      .single();

    if (error) throw error;

    // Add recipients
    let recipientCount = 0;
    
    if (contact_ids && contact_ids.length > 0) {
      // Specific contacts selected
      const { data: contacts } = await supabaseAdmin
        .from('contacts')
        .select('id')
        .in('id', contact_ids)
        .eq('opted_out', false);

      if (contacts && contacts.length > 0) {
        const recipients = contacts.map(c => ({
          campaign_id: campaign.id,
          contact_id: c.id,
          status: 'pending'
        }));

        const { error: recipientError } = await supabaseAdmin
          .from('campaign_recipients')
          .insert(recipients);

        if (!recipientError) recipientCount = recipients.length;
      }
    } else if (filters) {
      // Filter-based selection
      let contactQuery = supabaseAdmin
        .from('contacts')
        .select('id')
        .eq('opted_out', false);

      if (filters.governorate) {
        contactQuery = contactQuery.eq('governorate', filters.governorate);
      }
      if (filters.category) {
        contactQuery = contactQuery.eq('category', filters.category);
      }
      if (filters.limit) {
        contactQuery = contactQuery.limit(filters.limit);
      }

      const { data: contacts } = await contactQuery;

      if (contacts && contacts.length > 0) {
        const recipients = contacts.map(c => ({
          campaign_id: campaign.id,
          contact_id: c.id,
          status: 'pending'
        }));

        const { error: recipientError } = await supabaseAdmin
          .from('campaign_recipients')
          .insert(recipients);

        if (!recipientError) recipientCount = recipients.length;
      }
    }

    res.status(201).json({
      success: true,
      data: {
        campaign,
        recipients_added: recipientCount
      }
    });
  } catch (err) {
    console.error('Error creating campaign:', err);
    res.status(500).json({ success: false, error: 'Failed to create campaign' });
  }
});

// =====================================================
// POST /api/campaigns/:id/start - Start campaign
// =====================================================
router.post('/:id/start', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .update({ status: 'running', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('status', 'draft') // Can only start from draft
      .select()
      .single();

    if (error || !data) {
      return res.status(400).json({
        success: false,
        error: 'Campaign not found or not in draft status'
      });
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error('Error starting campaign:', err);
    res.status(500).json({ success: false, error: 'Failed to start campaign' });
  }
});

// =====================================================
// POST /api/campaigns/:id/pause - Pause campaign
// =====================================================
router.post('/:id/pause', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .update({ status: 'paused', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('status', 'running') // Can only pause running
      .select()
      .single();

    if (error || !data) {
      return res.status(400).json({
        success: false,
        error: 'Campaign not found or not running'
      });
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error('Error pausing campaign:', err);
    res.status(500).json({ success: false, error: 'Failed to pause campaign' });
  }
});

// =====================================================
// POST /api/campaigns/:id/resume - Resume campaign
// =====================================================
router.post('/:id/resume', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .update({ status: 'running', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('status', 'paused') // Can only resume paused
      .select()
      .single();

    if (error || !data) {
      return res.status(400).json({
        success: false,
        error: 'Campaign not found or not paused'
      });
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error('Error resuming campaign:', err);
    res.status(500).json({ success: false, error: 'Failed to resume campaign' });
  }
});

// =====================================================
// DELETE /api/campaigns/:id - Delete campaign
// =====================================================
router.delete('/:id', async (req, res) => {
  try {
    // Can only delete draft campaigns
    const { error } = await supabaseAdmin
      .from('campaigns')
      .delete()
      .eq('id', req.params.id)
      .eq('status', 'draft');

    if (error) throw error;

    res.json({ success: true, message: 'Campaign deleted' });
  } catch (err) {
    console.error('Error deleting campaign:', err);
    res.status(500).json({ success: false, error: 'Failed to delete campaign' });
  }
});

// =====================================================
// GET /api/campaigns/:id/recipients - List recipients
// =====================================================
router.get('/:id/recipients', async (req, res) => {
  try {
    const { status, limit = 100, offset = 0 } = req.query;

    let query = supabaseAdmin
      .from('campaign_recipients')
      .select(`
        *,
        contacts:contact_id (*)
      `)
      .eq('campaign_id', req.params.id);

    if (status) query = query.eq('status', status);

    const { data, error, count } = await query
      .order('created_at', { ascending: true })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) throw error;

    res.json({
      success: true,
      data,
      total: count,
      page: Math.floor(Number(offset) / Number(limit)) + 1,
      pageSize: Number(limit)
    });
  } catch (err) {
    console.error('Error fetching recipients:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch recipients' });
  }
});

export default router;
