import { createClient } from '@supabase/supabase-js';

const REQUIRED_URL = 'https://ujdsxzvvgaugypwtugdl.supabase.co';
const REQUIRED_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXMiOiJzdXBhYmFzZSIsInJlZiI6InVqZHN4enZ2Z2F1Z3lwd3R1Z2RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNzQ3NjYsImV4cCI6MjA5MDk1MDc2Nn0.XlWRSUAFTBYq3udqmBSkXI2bA73MlyriC1nWuwP4C7c';

const configuredUrl = import.meta.env.VITE_SUPABASE_URL || REQUIRED_URL;
const configuredAnon = import.meta.env.VITE_SUPABASE_ANON_KEY || REQUIRED_ANON_KEY;

if (configuredUrl !== REQUIRED_URL) {
  console.error('Blocked: This CRM is locked to its dedicated Supabase project URL.');
}

export const supabase = createClient(REQUIRED_URL, configuredAnon, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const crmSupabaseProject = REQUIRED_URL;
