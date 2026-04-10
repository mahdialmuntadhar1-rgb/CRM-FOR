// =====================================================
// Supabase Client - FRONTEND SAFE
// Uses ANON KEY only - no service role key here!
// =====================================================

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

// =====================================================
// Type-safe query helpers
// =====================================================

export async function fetchContacts(
  options?: {
    governorate?: string;
    category?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }
) {
  let query = supabase
    .from('contacts')
    .select('*', { count: 'exact' });

  if (options?.governorate) {
    query = query.eq('governorate', options.governorate);
  }
  if (options?.category) {
    query = query.eq('category', options.category);
  }
  if (options?.status) {
    query = query.eq('whatsapp_status', options.status);
  }
  if (options?.search) {
    query = query.or(`business_name.ilike.%${options.search}%,normalized_phone.ilike.%${options.search}%`);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  return query.order('created_at', { ascending: false });
}

export async function fetchCampaigns(status?: string) {
  let query = supabase
    .from('campaigns')
    .select(`
      *,
      message_templates:template_id (name, body)
    `);
  
  if (status) {
    query = query.eq('status', status);
  }
  
  return query.order('created_at', { ascending: false });
}

export async function fetchCampaignStats(campaignId?: string) {
  let query = supabase
    .from('campaign_stats')
    .select('*');
  
  if (campaignId) {
    query = query.eq('campaign_id', campaignId).single();
  }
  
  return query;
}

export async function fetchConversations(search?: string) {
  let query = supabase
    .from('conversations')
    .select('*');
  
  if (search) {
    query = query.or(`business_name.ilike.%${search}%,normalized_phone.ilike.%${search}%`);
  }
  
  return query.order('last_message_at', { ascending: false });
}

export async function fetchMessages(contactId: string, limit = 50) {
  return supabase
    .from('messages')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: true })
    .limit(limit);
}

export async function fetchTemplates(type?: string, activeOnly = true) {
  let query = supabase
    .from('message_templates')
    .select('*');
  
  if (type) {
    query = query.eq('template_type', type);
  }
  if (activeOnly) {
    query = query.eq('is_active', true);
  }
  
  return query.order('name');
}
