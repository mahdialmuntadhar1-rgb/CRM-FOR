// @ts-nocheck
export interface NabdaSendInput {
  phone: string;
  text: string;
}

export interface NabdaSendResult {
  ok: boolean;
  providerMessageId: string | null;
  raw: unknown;
  error?: string;
}

export async function sendViaNabda(config: { apiUrl: string; instanceId: string; apiToken: string }, payload: NabdaSendInput): Promise<NabdaSendResult> {
  const endpoint = `${config.apiUrl.replace(/\/$/, '')}/instances/${config.instanceId}/messages/send`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.apiToken}`,
    },
    body: JSON.stringify({ to: payload.phone, message: payload.text }),
  });

  const raw = await response.json().catch(() => ({}));
  const providerMessageId = (raw?.id || raw?.message_id || raw?.data?.id || null) as string | null;

  if (!response.ok) {
    return {
      ok: false,
      providerMessageId,
      raw,
      error: `Nabda send failed (${response.status})`,
    };
  }

  return { ok: true, providerMessageId, raw };
}
