// =====================================================
// Analytics API Routes
// Dashboard stats and reporting
// =====================================================

import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase-admin.js';

const router = Router();

// =====================================================
// GET /api/analytics/dashboard - Main dashboard stats
// =====================================================
router.get('/dashboard', async (req, res) => {
  try {
    // Total contacts
    const { count: totalContacts } = await supabaseAdmin
      .from('contacts')
      .select('*', { count: 'exact', head: true });

    // Ready contacts (not opted out)
    const { count: readyContacts } = await supabaseAdmin
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('opted_out', false);

    // Active campaigns
    const { count: activeCampaigns } = await supabaseAdmin
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'running');

    // Messages sent today
    const today = new Date().toISOString().split('T')[0];
    const { count: sentToday } = await supabaseAdmin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('direction', 'outbound')
      .gte('created_at', today);

    // Replies today
    const { count: repliesToday } = await supabaseAdmin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('direction', 'inbound')
      .gte('created_at', today);

    // Interested (from intents)
    const { count: interested } = await supabaseAdmin
      .from('reply_intents')
      .select('*', { count: 'exact', head: true })
      .eq('detected_intent', 'interested');

    // Failed messages
    const { count: failed } = await supabaseAdmin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed');

    // Opt-outs
    const { count: optOuts } = await supabaseAdmin
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('opted_out', true);

    res.json({
      success: true,
      data: {
        total_contacts: totalContacts || 0,
        ready_contacts: readyContacts || 0,
        active_campaigns: activeCampaigns || 0,
        sent_today: sentToday || 0,
        replies_today: repliesToday || 0,
        interested: interested || 0,
        failed: failed || 0,
        opt_outs: optOuts || 0
      }
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

// =====================================================
// GET /api/analytics/campaigns/:id - Campaign detailed stats
// =====================================================
router.get('/campaigns/:id', async (req, res) => {
  try {
    const { data: stats, error } = await supabaseAdmin
      .from('campaign_stats')
      .select('*')
      .eq('campaign_id', req.params.id)
      .single();

    if (error) throw error;

    // Get timeline of sends
    const { data: timeline } = await supabaseAdmin.rpc('get_campaign_timeline', {
      campaign_id: req.params.id
    });

    res.json({
      success: true,
      data: {
        ...stats,
        timeline: timeline || []
      }
    });
  } catch (err) {
    console.error('Error fetching campaign stats:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch campaign stats' });
  }
});

// =====================================================
// GET /api/analytics/template-performance - Template comparison
// =====================================================
router.get('/template-performance', async (req, res) => {
  try {
    // Get reply rates by template
    const { data: templateStats, error } = await supabaseAdmin
      .from('campaigns')
      .select(`
        template_id,
        message_templates:template_id (name),
        campaign_stats(*)
      `);

    if (error) throw error;

    const performance = templateStats?.map(c => ({
      template_id: c.template_id,
      template_name: (c as unknown as { message_templates: { name: string } }).message_templates?.name,
      total_sent: c.campaign_stats?.sent || 0,
      replies: c.campaign_stats?.replied || 0,
      reply_rate: c.campaign_stats?.sent > 0
        ? ((c.campaign_stats?.replied || 0) / c.campaign_stats.sent * 100).toFixed(2) + '%'
        : '0%'
    }));

    res.json({ success: true, data: performance });
  } catch (err) {
    console.error('Error fetching template performance:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch template performance' });
  }
});

export default router;
