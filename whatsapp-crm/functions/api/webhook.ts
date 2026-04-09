import { json, error, type Env } from "../_shared/types";

// Strategy B follow-up message
const STRATEGY_B_FOLLOWUP = `ممتاز! 🎉

Iraq Compass هو دليل الأعمال العراقي الأول.
500+ مشروع مسجل. العملاء يبحثون عنك كل يوم.

سجّل مشروعك مجاناً هنا 👇
https://iraq-compass.pages.dev`;

interface WebhookPayload {
  event?: string;
  phone?: string;
  message?: string;
  from?: string;
  body?: string;
  text?: string;
  timestamp?: string;
}

// Supabase client for Cloudflare Workers
async function supabaseRequest(
  env: Env,
  path: string,
  method: string,
  body?: unknown
): Promise<{ data?: unknown; error?: string }> {
  const url = `${env.SUPABASE_URL}/rest/v1/${path}`;
  const headers: Record<string, string> = {
    'apikey': env.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
  };

  if (method === 'GET') {
    headers['Accept'] = 'application/vnd.pgrst.object+json';
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { error: `HTTP ${response.status}: ${errorText}` };
    }

    const data = await response.json();
    return { data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

async function getBusinessByPhone(env: Env, phone: string): Promise<{ id?: string; name?: string; phone?: string } | null> {
  const cleanPhone = phone.replace(/\+/g, '').replace(/\s/g, '');
  
  const { data, error } = await supabaseRequest(
    env,
    `businesses?phone=eq.${cleanPhone}&select=id,name,phone`,
    'GET'
  );

  if (error || !data) {
    console.error('Error looking up phone:', error);
    return null;
  }

  return data as { id: string; name: string; phone: string };
}

async function updateBusinessStatus(
  env: Env,
  id: string,
  status: string,
  sentAt?: string
): Promise<void> {
  const update: { whatsapp_status: string; whatsapp_sent_at?: string } = {
    whatsapp_status: status,
  };

  if (sentAt) {
    update.whatsapp_sent_at = sentAt;
  }

  await supabaseRequest(env, `businesses?id=eq.${id}`, 'PATCH', update);
}

async function sendWhatsAppMessage(env: Env, phone: string, message: string): Promise<boolean> {
  const cleanPhone = phone.replace(/\+/g, '').replace(/\s/g, '').replace(/-/g, '');

  if (!cleanPhone.startsWith('964')) {
    console.error(`Invalid phone: ${phone}`);
    return false;
  }

  try {
    const response = await fetch(`${env.NABDA_BASE_URL}/message/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.NABDA_TOKEN}`,
      },
      body: JSON.stringify({
        phone: cleanPhone,
        message: message,
      }),
    });

    return response.ok;
  } catch (err) {
    console.error('Error sending message:', err);
    return false;
  }
}

function shouldSendFollowUp(message: string): boolean {
  const normalized = message.toLowerCase().trim();
  const positiveResponses = ['نعم', 'yes', 'yeah', 'yup', 'sure', 'ok', 'تمام', 'أكيد', 'بالتأكيد'];
  return positiveResponses.some((response) => normalized.includes(response));
}

// Main webhook handler
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const payload = await context.request.json() as WebhookPayload;
    
    console.log('Webhook received:', JSON.stringify(payload));

    const event = payload.event || payload.type || 'message.received';
    const phone = payload.phone || payload.from || '';
    const message = payload.message || payload.body || payload.text || '';

    if (!phone || !message) {
      return json({ received: true, action: 'ignored', reason: 'missing phone or message' });
    }

    // Look up contact
    const business = await getBusinessByPhone(context.env, phone);
    
    if (!business) {
      console.log(`Contact not found: ${phone}`);
      return json({ received: true, action: 'ignored', reason: 'contact not found' });
    }

    console.log(`Contact found: ${business.name} (${business.phone})`);

    // Check for positive response
    if (shouldSendFollowUp(message)) {
      console.log(`Positive response from ${business.name}, sending follow-up...`);
      
      const sent = await sendWhatsAppMessage(context.env, business.phone, STRATEGY_B_FOLLOWUP);
      
      if (sent) {
        await updateBusinessStatus(context.env, business.id, 'replied', new Date().toISOString());
        console.log(`Follow-up sent to ${business.name}`);
        return json({ 
          received: true, 
          action: 'follow_up_sent',
          business: business.name 
        });
      } else {
        console.error(`Failed to send follow-up to ${business.name}`);
        return json({ received: true, action: 'failed', error: 'send failed' });
      }
    }

    return json({ 
      received: true, 
      action: 'no_action',
      reason: 'not a positive response'
    });

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook error:', errorMessage);
    return json({ received: true, error: errorMessage });
  }
};

// Health check and info
export const onRequestGet: PagesFunction<Env> = async (context) => {
  return json({
    status: 'ok',
    service: 'whatsapp-crm-webhook',
    strategy: 'B',
    endpoints: {
      post: '/api/webhook - Receive WhatsApp webhooks',
    },
    env: {
      supabase: !!context.env.SUPABASE_URL,
      nabda: !!context.env.NABDA_TOKEN,
    },
  });
};

// Handle OPTIONS for CORS
export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
