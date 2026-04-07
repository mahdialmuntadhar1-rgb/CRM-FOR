/// <reference types="node" />
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const currentFileDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentFileDir, '..');
const explicitEnvFile = process.env.ENV_FILE ? resolve(process.cwd(), process.env.ENV_FILE) : null;
const candidateEnvFiles = [
  explicitEnvFile,
  resolve(repoRoot, '.env'),
  resolve(repoRoot, '.env.local'),
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '.env.local'),
].filter((path): path is string => Boolean(path));

for (const envFile of candidateEnvFiles) {
  if (!existsSync(envFile)) continue;
  dotenv.config({ path: envFile, override: false });
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL (or VITE_SUPABASE_URL) for admin scripts.');
}

if (!supabaseServiceRoleKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY for admin scripts.');
}

if (process.env.SUPABASE_BYPASS_PROXY !== 'false') {
  for (const key of ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'npm_config_http_proxy', 'npm_config_https_proxy']) {
    delete process.env[key];
  }
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export const PHONE_FIELDS = ['whatsapp', 'phone', 'phone1', 'phone2', 'phone_1', 'phone_2'] as const;
export type PhoneField = (typeof PHONE_FIELDS)[number];

const PHONE_FIELD_PRIORITY: PhoneField[] = ['whatsapp', 'phone', 'phone1', 'phone2', 'phone_1', 'phone_2'];

export async function resolveExistingBusinessPhoneFields() {
  const { data, error } = await supabaseAdmin
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'businesses');

  if (error) {
    throw new Error(`Cannot inspect businesses schema: ${error.message}`);
  }

  const existingColumns = new Set((data || []).map((row: { column_name: string }) => row.column_name));
  return PHONE_FIELD_PRIORITY.filter((field) => existingColumns.has(field));
}

export interface BusinessRow {
  id: string;
  name?: string | null;
  whatsapp?: string | null;
  phone?: string | null;
  phone1?: string | null;
  phone2?: string | null;
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
