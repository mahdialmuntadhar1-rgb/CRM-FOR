import { supabase } from '../lib/supabase';

export interface HealthCheckResult {
  ok: boolean;
  supabase: {
    configuredUrl: string;
    expectedUrl: string;
    urlMatchesLockedProject: boolean;
  };
  env: Record<string, boolean>;
  tables: Array<{ table: string; ok: boolean; error: string | null }>;
  missingTables: Array<{ table: string; error: string | null }>;
  error?: string;
}

export const healthService = {
  async run(): Promise<HealthCheckResult> {
    const { data, error } = await supabase.functions.invoke('crm-health', { body: {} });

    if (error) {
      return {
        ok: false,
        supabase: {
          configuredUrl: import.meta.env.VITE_SUPABASE_URL || '',
          expectedUrl: 'https://ujdsxzvvgaugypwtugdl.supabase.co',
          urlMatchesLockedProject: (import.meta.env.VITE_SUPABASE_URL || '') === 'https://ujdsxzvvgaugypwtugdl.supabase.co',
        },
        env: {},
        tables: [],
        missingTables: [],
        error: error.message,
      };
    }

    return data as HealthCheckResult;
  },
};
