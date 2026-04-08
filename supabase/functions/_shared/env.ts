// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2';

export const REQUIRED_SUPABASE_URL = 'https://ujdsxzvvgaugypwtugdl.supabase.co';

export function getAdminClient() {
  const url = Deno.env.get('SUPABASE_URL') || '';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getNabdaConfig() {
  return {
    apiUrl: Deno.env.get('NABDA_API_URL') || '',
    instanceId: Deno.env.get('NABDA_INSTANCE_ID') || '',
    apiToken: Deno.env.get('NABDA_API_TOKEN') || '',
  };
}

export function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
