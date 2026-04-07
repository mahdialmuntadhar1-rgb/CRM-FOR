/// <reference types="node" />
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL (or VITE_SUPABASE_URL) for admin scripts.');
}

if (!supabaseServiceRoleKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY for admin scripts.');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export const PHONE_FIELDS = ['whatsapp', 'phone', 'phone_1', 'phone_2'] as const;
export type PhoneField = (typeof PHONE_FIELDS)[number];

export interface BusinessRow {
  id: string;
  name?: string | null;
  whatsapp?: string | null;
  phone?: string | null;
  phone_1?: string | null;
  phone_2?: string | null;
  normalized_phone?: string | null;
  normalized_phone_source?: string | null;
  phone_valid?: boolean | null;
  phone_invalid_reason?: string | null;
}

export function parseArgs(argv: string[]) {
  return new Map(
    argv
      .filter((token) => token.startsWith('--'))
      .map((token) => {
        const [key, value] = token.replace('--', '').split('=');
        return [key, value ?? 'true'] as const;
      }),
  );
}
