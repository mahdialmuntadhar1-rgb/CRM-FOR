// @ts-nocheck
import { getAdminClient, getNabdaConfig, jsonResponse, REQUIRED_SUPABASE_URL } from '../_shared/env.ts';

const REQUIRED_TABLES = ['contacts', 'message_templates', 'campaigns', 'messages', 'send_logs', 'replies', 'crm_settings', 'webhook_events'];

Deno.serve(async () => {
  try {
    const client = getAdminClient();
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const nabda = getNabdaConfig();

    const tableChecks = await Promise.all(
      REQUIRED_TABLES.map(async (table) => {
        const { error } = await client.from(table).select('*', { head: true, count: 'exact' }).limit(1);
        return { table, ok: !error, error: error?.message || null };
      }),
    );

    const missingTables = tableChecks.filter((t) => !t.ok).map((t) => ({ table: t.table, error: t.error }));

    const payload = {
      ok: missingTables.length === 0,
      supabase: {
        configuredUrl: supabaseUrl,
        expectedUrl: REQUIRED_SUPABASE_URL,
        urlMatchesLockedProject: supabaseUrl === REQUIRED_SUPABASE_URL,
      },
      env: {
        SUPABASE_URL: Boolean(Deno.env.get('SUPABASE_URL')),
        SUPABASE_SERVICE_ROLE_KEY: Boolean(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')),
        NABDA_API_URL: Boolean(nabda.apiUrl),
        NABDA_INSTANCE_ID: Boolean(nabda.instanceId),
        NABDA_API_TOKEN: Boolean(nabda.apiToken),
      },
      tables: tableChecks,
      missingTables,
    };

    return jsonResponse(payload, payload.ok ? 200 : 503);
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
