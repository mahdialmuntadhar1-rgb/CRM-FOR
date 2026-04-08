export type SendMode =
  | 'test_phone_only'
  | 'one_random'
  | 'three_random'
  | 'ten_random'
  | 'first_n'
  | 'all_filtered'
  | 'manual_selected';

export type QueueStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'replied' | 'cancelled';

export interface Contact {
  id: string;
  original_name: string | null;
  display_name: string | null;
  raw_phone: string | null;
  normalized_phone: string | null;
  governorate: string | null;
  category: string | null;
  is_phone_valid: boolean;
  is_duplicate: boolean;
  ready_to_send: boolean;
  last_sent_at: string | null;
  last_message_status: QueueStatus | null;
  created_at?: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  body: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Campaign {
  id: string;
  name: string;
  template_id: string;
  filter_summary: string;
  send_mode: SendMode;
  target_count: number;
  status: 'draft' | 'queued' | 'running' | 'paused' | 'done';
  created_at?: string;
}

export interface MessageQueueItem {
  id: string;
  campaign_id: string;
  contact_id: string;
  template_id: string;
  rendered_message: string;
  normalized_phone: string;
  status: QueueStatus;
  attempts: number;
  last_error: string | null;
  sent_at: string | null;
  created_at?: string;
}

export interface SendLog {
  id: string;
  message_id: string;
  campaign_id: string;
  normalized_phone: string;
  status: QueueStatus;
  provider: 'nabda';
  provider_message_id: string | null;
  details: string | null;
  created_at?: string;
}

export interface RecipientFilter {
  query: string;
  governorate: string;
  category: string;
  validity: 'all' | 'valid' | 'invalid';
  sentState: 'all' | 'sent' | 'not_sent';
}

export interface NormalizationStats {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
}
