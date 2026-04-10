// =====================================================
// Supabase Admin Client - BACKEND ONLY
// Service role key - NEVER expose to frontend!
// =====================================================

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'Missing Supabase credentials. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.'
  );
}

// Admin client with service role - for protected operations
export const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// =====================================================
// Secure Logging Helper
// Never log the full service role key
// =====================================================
export function logSupabaseConfig(): void {
  const maskedKey = serviceRoleKey 
    ? `${serviceRoleKey.slice(0, 8)}...${serviceRoleKey.slice(-4)}` 
    : 'NOT SET';
  
  console.log('[Supabase Admin] URL:', supabaseUrl);
  console.log('[Supabase Admin] Key (masked):', maskedKey);
}
