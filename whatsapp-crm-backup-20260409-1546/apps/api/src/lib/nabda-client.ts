// =====================================================
// Nabda WhatsApp API Client
// Backend-only: Handles sending messages via Nabda
// =====================================================

import type { NabdaSendResult } from '@whatsapp-crm/shared';
import { stripPlus } from '@whatsapp-crm/shared';

const NABDA_API_URL = process.env.NABDA_API_URL || 'https://api.nabdaotp.com';
const NABDA_INSTANCE_ID = process.env.NABDA_INSTANCE_ID || '';
const NABDA_API_TOKEN = process.env.NABDA_API_TOKEN || '';

if (!NABDA_INSTANCE_ID || !NABDA_API_TOKEN) {
  console.warn('[Nabda] Missing NABDA_INSTANCE_ID or NABDA_API_TOKEN');
}

// =====================================================
// Send WhatsApp Message
// =====================================================
export async function sendWhatsAppMessage(
  phone: string,
  message: string,
  attempt = 1,
  maxRetries = 3
): Promise<NabdaSendResult> {
  const phoneSent = stripPlus(phone);
  const url = `${NABDA_API_URL}/inst/${NABDA_INSTANCE_ID}/messages/send`;
  
  const timestamp = new Date().toISOString();
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NABDA_API_TOKEN}`
      },
      body: JSON.stringify({ phone: phoneSent, message })
    });

    const responseText = await response.text();
    
    // Parse JSON response if possible
    let data: { messageId?: string; id?: string; message_id?: string; status?: string; error?: string } = {};
    try {
      data = JSON.parse(responseText);
    } catch {
      // Not JSON - could be error HTML page
    }

    const messageId = data.messageId || data.id || data.message_id;
    
    if (response.ok) {
      return {
        timestamp,
        phone_input: phone,
        phone_normalized: phone,
        phone_sent: phoneSent,
        message_preview: message.slice(0, 80),
        status: 'sent',
        http_status: response.status,
        message_id: messageId,
        retry_count: attempt
      };
    }

    // Handle retryable errors (rate limit, server errors)
    if (isRetryable(response.status) && attempt < maxRetries) {
      const delay = calculateBackoff(attempt);
      await sleep(delay);
      return sendWhatsAppMessage(phone, message, attempt + 1, maxRetries);
    }

    // Non-retryable failure
    return {
      timestamp,
      phone_input: phone,
      phone_normalized: phone,
      phone_sent: phoneSent,
      message_preview: message.slice(0, 80),
      status: 'failed',
      http_status: response.status,
      error: sanitizeError(response.status, responseText),
      retry_count: attempt
    };

  } catch (error) {
    const err = error as Error;
    
    // Network errors are retryable
    if (attempt < maxRetries) {
      const delay = calculateBackoff(attempt);
      await sleep(delay);
      return sendWhatsAppMessage(phone, message, attempt + 1, maxRetries);
    }

    return {
      timestamp,
      phone_input: phone,
      phone_normalized: phone,
      phone_sent: phoneSent,
      message_preview: message.slice(0, 80),
      status: 'failed',
      error: err.message,
      retry_count: attempt
    };
  }
}

// =====================================================
// Test Mode: Only send to test numbers
// =================================================-----
export async function sendWhatsAppMessageSafe(
  phone: string,
  message: string,
  testMode = false,
  allowedTestNumbers: string[] = []
): Promise<NabdaSendResult & { blocked?: boolean }> {
  // In test mode, only allow test numbers
  if (testMode && !allowedTestNumbers.includes(phone)) {
    return {
      timestamp: new Date().toISOString(),
      phone_input: phone,
      phone_normalized: phone,
      phone_sent: phone,
      message_preview: message.slice(0, 80),
      status: 'failed',
      error: 'TEST_MODE: Number not in allowed test list',
      retry_count: 0,
      blocked: true
    };
  }

  return sendWhatsAppMessage(phone, message);
}

// =====================================================
// Utility Functions
// =====================================================

function isRetryable(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

function calculateBackoff(attempt: number): number {
  const base = 1000;
  const max = 30000;
  const jitter = Math.random() * 1000;
  return Math.min(base * Math.pow(2, attempt) + jitter, max);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function sanitizeError(status: number, responseText: string): string {
  // Don't leak HTML error pages or tokens in logs
  if (responseText.startsWith('<')) {
    return `HTTP ${status}: HTML error page received - check URL/credentials`;
  }
  // Limit length and remove any potential tokens
  const sanitized = responseText
    .slice(0, 200)
    .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(/[a-zA-Z0-9]{40,}/g, '[TOKEN]');
  return `HTTP ${status}: ${sanitized}`;
}

// =====================================================
// Webhook Verification (if Nabda supports signatures)
// =====================================================
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // TODO: Implement if Nabda provides signature verification
  // For now, return true (rely on other security measures)
  return true;
}
