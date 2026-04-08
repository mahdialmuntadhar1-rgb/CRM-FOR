import { createClient } from '@supabase/supabase-js';

const REQUIRED_URL = 'https://ujdsxzvvgaugypwtugdl.supabase.co';

const configuredUrl = import.meta.env.VITE_SUPABASE_URL || REQUIRED_URL;
const configuredAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (configuredUrl !== REQUIRED_URL) {
  console.error('Blocked: This CRM is locked to its dedicated Supabase project URL.');
}

if (!configuredAnon) {
  console.error('Missing VITE_SUPABASE_ANON_KEY. Frontend cannot connect to Supabase without it.');
}

export const supabase = createClient(REQUIRED_URL, configuredAnon || 'missing-anon-key', {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const crmSupabaseProject = REQUIRED_URL;
