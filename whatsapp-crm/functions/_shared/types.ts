// Cloudflare Pages Functions shared types

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  NABDA_BASE_URL: string;
  NABDA_TOKEN: string;
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export function error(message: string, status = 400): Response {
  return json({ error: message }, status);
}
