import { createClient } from '@supabase/supabase-js';

// Fallback to placeholder values to prevent "supabaseUrl is required" error during initialization
// when environment variables are not yet configured in AI Studio secrets.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project-id.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('Supabase credentials missing. The app is using placeholder values. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment secrets.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
