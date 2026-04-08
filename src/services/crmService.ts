import { supabase } from '../lib/supabase';
import { normalizeBusinessName, normalizeIraqiPhone, renderTemplate } from '../lib/crmTransformers';
import { Campaign, Contact, MessageQueueItem, MessageTemplate, RecipientFilter, SendLog, SendMode } from '../types/crm';


function throwIfError(error: any, table?: string) {
  if (!error) return;
  const raw = error.message || String(error);
  if (raw.includes('schema cache') || raw.includes('does not exist') || raw.includes('relation')) {
    throw new Error(`Missing required CRM table${table ? ` (${table})` : ''}: ${raw}. Run the CRM schema migration in Supabase.`);
  }
  throw error;
}

const TABLES = {
  contacts: 'contacts',
  templates: 'message_templates',
  campaigns: 'campaigns',
  messages: 'messages',
  sendLogs: 'send_logs',
};

export const crmService = {
  async getTemplates() {
    const { data, error } = await supabase.from(TABLES.templates).select('*').order('updated_at', { ascending: false });
    throwIfError(error, TABLES.templates);
    return (data || []) as MessageTemplate[];
  },

  async upsertTemplate(payload: Partial<MessageTemplate>) {
    const body = {
      id: payload.id,
      name: payload.name,
      body: payload.body,
      is_active: Boolean(payload.is_active),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from(TABLES.templates).upsert(body).select().single();
    throwIfError(error, TABLES.templates);

    if (payload.is_active) {
      await supabase.from(TABLES.templates).update({ is_active: false }).neq('id', data.id);
      await supabase.from(TABLES.templates).update({ is_active: true }).eq('id', data.id);
    }

    return data as MessageTemplate;
  },

  async deleteTemplate(id: string) {
    const { error } = await supabase.from(TABLES.templates).delete().eq('id', id);
    throwIfError(error, TABLES.templates);
  },

  async getContacts() {
    const { data, error } = await supabase.from(TABLES.contacts).select('*').order('created_at', { ascending: false }).limit(5000);
    throwIfError(error, TABLES.contacts);
    return (data || []) as Contact[];
  },

  async normalizeContacts(sourceContacts: Contact[]) {
    const seen = new Set<string>();
    const updates = sourceContacts.map((contact) => {
      const phoneResult = normalizeIraqiPhone(contact.raw_phone);
      const normalized = phoneResult.normalized;
      const duplicate = normalized ? seen.has(normalized) : false;
      if (normalized && !duplicate) seen.add(normalized);

      return {
        id: contact.id,
        display_name: normalizeBusinessName(contact.original_name),
        normalized_phone: normalized,
        is_phone_valid: phoneResult.isValid,
        is_duplicate: duplicate,
        ready_to_send: phoneResult.isValid && !duplicate,
      };
    });

    if (!updates.length) return 0;
    const { error } = await supabase.from(TABLES.contacts).upsert(updates);
    throwIfError(error, TABLES.contacts);
    return updates.length;
  },

  filterContacts(contacts: Contact[], filter: RecipientFilter) {
    return contacts.filter((c) => {
      const target = `${c.display_name || ''} ${c.original_name || ''} ${c.raw_phone || ''}`.toLowerCase();
      const q = filter.query.trim().toLowerCase();
      const matchesQ = !q || target.includes(q);
      const matchesGov = !filter.governorate || c.governorate === filter.governorate;
      const matchesCategory = !filter.category || c.category === filter.category;
      const matchesValidity =
        filter.validity === 'all' ||
        (filter.validity === 'valid' && c.is_phone_valid) ||
        (filter.validity === 'invalid' && !c.is_phone_valid);
      const matchesSent =
        filter.sentState === 'all' ||
        (filter.sentState === 'sent' && Boolean(c.last_sent_at)) ||
        (filter.sentState === 'not_sent' && !c.last_sent_at);

      return matchesQ && matchesGov && matchesCategory && matchesValidity && matchesSent;
    });
  },

  pickRecipients(params: {
    mode: SendMode;
    contacts: Contact[];
    manualIds: string[];
    firstN: number;
    testPhone: string;
  }) {
    const candidates = params.contacts.filter((c) => c.ready_to_send && c.normalized_phone);
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);

    if (params.mode === 'test_phone_only') {
      const normalized = normalizeIraqiPhone(params.testPhone).normalized;
      if (!normalized) return [];
      return [
        {
          id: 'test-phone',
          original_name: 'My Test Number',
          display_name: 'My Test Number',
          raw_phone: params.testPhone,
          normalized_phone: normalized,
          governorate: null,
          category: null,
          is_phone_valid: true,
          is_duplicate: false,
          ready_to_send: true,
          last_sent_at: null,
          last_message_status: null,
        } as Contact,
      ];
    }

    if (params.mode === 'manual_selected') {
      const wanted = new Set(params.manualIds);
      return candidates.filter((c) => wanted.has(c.id));
    }

    if (params.mode === 'one_random') return shuffled.slice(0, 1);
    if (params.mode === 'three_random') return shuffled.slice(0, 3);
    if (params.mode === 'ten_random') return shuffled.slice(0, 10);
    if (params.mode === 'first_n') return candidates.slice(0, Math.max(0, params.firstN));

    return candidates;
  },

  async createCampaignAndQueue(params: {
    name: string;
    template: MessageTemplate;
    contacts: Contact[];
    sendMode: SendMode;
    filterSummary: string;
  }) {
    const { data: campaign, error: campaignError } = await supabase
      .from(TABLES.campaigns)
      .insert({
        name: params.name,
        template_id: params.template.id,
        send_mode: params.sendMode,
        filter_summary: params.filterSummary,
        target_count: params.contacts.length,
        status: 'queued',
      })
      .select()
      .single();

    throwIfError(campaignError, TABLES.campaigns);

    const rows = params.contacts
      .filter((c) => c.normalized_phone)
      .map((c) => ({
        campaign_id: campaign.id,
        contact_id: c.id,
        template_id: params.template.id,
        normalized_phone: c.normalized_phone,
        rendered_message: renderTemplate(params.template.body, c),
        status: 'pending',
        attempts: 0,
      }));

    if (rows.length) {
      const { error: queueError } = await supabase.from(TABLES.messages).insert(rows);
      throwIfError(queueError, TABLES.messages);
    }

    return campaign as Campaign;
  },

  async getQueueAndLogs() {
    const [{ data: messages, error: msgError }, { data: logs, error: logError }] = await Promise.all([
      supabase.from(TABLES.messages).select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from(TABLES.sendLogs).select('*').order('created_at', { ascending: false }).limit(200),
    ]);

    throwIfError(msgError, TABLES.messages);
    throwIfError(logError, TABLES.sendLogs);

    return {
      messages: (messages || []) as MessageQueueItem[],
      logs: (logs || []) as SendLog[],
    };
  },
};
