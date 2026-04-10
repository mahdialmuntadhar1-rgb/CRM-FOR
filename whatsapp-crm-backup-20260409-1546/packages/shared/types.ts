// =====================================================
// WhatsApp CRM - Shared Types
// Used by both frontend and backend
// =====================================================

// -----------------------------------------------------
// CONTACTS
// -----------------------------------------------------
export interface Contact {
  id: string;
  business_name: string;
  contact_name?: string;
  normalized_phone: string;
  raw_phone?: string;
  category?: string;
  governorate?: string;
  city?: string;
  whatsapp_status: 'unknown' | 'valid' | 'invalid' | 'opted_out';
  source: string;
  tags: string[];
  custom_fields: Record<string, unknown>;
  last_contacted_at?: string;
  opted_out: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContactInsert {
  business_name: string;
  contact_name?: string;
  normalized_phone: string;
  raw_phone?: string;
  category?: string;
  governorate?: string;
  city?: string;
  whatsapp_status?: Contact['whatsapp_status'];
  source?: string;
  tags?: string[];
  custom_fields?: Record<string, unknown>;
}

// -----------------------------------------------------
// CAMPAIGNS
// -----------------------------------------------------
export type CampaignStatus = 'draft' | 'running' | 'paused' | 'completed' | 'failed';
export type CampaignMode = 'reply_first' | 'link_first' | 'mixed';

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: CampaignStatus;
  mode: CampaignMode;
  template_id?: string;
  daily_limit: number;
  min_delay_seconds: number;
  max_delay_seconds: number;
  batch_size: number;
  active_hours_start?: string;
  active_hours_end?: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignInsert {
  name: string;
  description?: string;
  mode: CampaignMode;
  template_id?: string;
  daily_limit?: number;
  min_delay_seconds?: number;
  max_delay_seconds?: number;
  batch_size?: number;
}

// -----------------------------------------------------
// MESSAGE TEMPLATES
// -----------------------------------------------------
export type TemplateType = 'initial' | 'followup_1' | 'followup_2' | 'reply_auto' | 'optout_confirm';
export type CtaType = 'none' | 'reply' | 'link' | 'mixed';

export interface MessageTemplate {
  id: string;
  name: string;
  language: string;
  template_type: TemplateType;
  body: string;
  variables: string[];
  cta_type: CtaType;
  is_active: boolean;
  variants: string[];
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------
// CAMPAIGN RECIPIENTS (Queue)
// -----------------------------------------------------
export type RecipientStatus = 
  | 'pending' 
  | 'queued' 
  | 'sending' 
  | 'sent' 
  | 'delivered' 
  | 'read' 
  | 'replied' 
  | 'failed' 
  | 'opted_out';

export interface CampaignRecipient {
  id: string;
  campaign_id: string;
  contact_id: string;
  status: RecipientStatus;
  send_after?: string;
  last_attempt_at?: string;
  attempt_count: number;
  personalized_message?: string;
  last_error?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  contact?: Contact;
}

// -----------------------------------------------------
// MESSAGES
// -----------------------------------------------------
export type MessageDirection = 'outbound' | 'inbound';
export type MessageProvider = 'nabda';

export interface Message {
  id: string;
  campaign_id?: string;
  contact_id: string;
  direction: MessageDirection;
  provider: MessageProvider;
  provider_message_id?: string;
  phone: string;
  body: string;
  status?: string;
  event_payload: Record<string, unknown>;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  received_at?: string;
  created_at: string;
}

// -----------------------------------------------------
// REPLY INTENTS
// -----------------------------------------------------
export type DetectedIntent = 
  | 'interested' 
  | 'ask_price' 
  | 'ask_details' 
  | 'claim_listing' 
  | 'not_now' 
  | 'stop' 
  | 'unknown';

export interface ReplyIntent {
  id: string;
  message_id: string;
  contact_id: string;
  detected_intent: DetectedIntent;
  confidence?: number;
  extracted_entities: Record<string, unknown>;
  handled: boolean;
  created_at: string;
}

// -----------------------------------------------------
// AUTOMATION RULES
// -----------------------------------------------------
export type TriggerType = 
  | 'incoming_message' 
  | 'message_sent' 
  | 'message_delivered' 
  | 'no_reply_after_hours';

export type ActionType = 
  | 'send_template' 
  | 'tag_contact' 
  | 'mark_opt_out' 
  | 'schedule_followup' 
  | 'assign_manual_review';

export interface AutomationRule {
  id: string;
  name: string;
  is_active: boolean;
  trigger_type: TriggerType;
  conditions: Record<string, unknown>;
  action_type: ActionType;
  action_config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------
// WEBHOOK EVENTS
// -----------------------------------------------------
export interface WebhookEvent {
  id: string;
  provider: string;
  event_type: string;
  payload: Record<string, unknown>;
  processed: boolean;
  processed_at?: string;
  error_message?: string;
  received_at: string;
}

// -----------------------------------------------------
// VIEWS
// -----------------------------------------------------
export interface Conversation {
  contact_id: string;
  business_name: string;
  contact_name?: string;
  normalized_phone: string;
  whatsapp_status: string;
  opted_out: boolean;
  unread_count: number;
  last_message_at?: string;
  last_message_preview?: string;
  last_message_direction?: MessageDirection;
}

export interface CampaignStats {
  campaign_id: string;
  campaign_name: string;
  status: CampaignStatus;
  total_recipients: number;
  pending: number;
  queued: number;
  sending: number;
  sent: number;
  delivered: number;
  read: number;
  replied: number;
  failed: number;
  opted_out: number;
}

// -----------------------------------------------------
// API RESPONSES
// -----------------------------------------------------
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// -----------------------------------------------------
// IMPORT / EXPORT
// -----------------------------------------------------
export interface ImportPreview {
  totalRows: number;
  validNumbers: number;
  duplicates: number;
  invalids: number;
  readyToSend: number;
  sample: Partial<Contact>[];
  errors: Array<{ row: number; reason: string }>;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; reason: string }>;
}

// -----------------------------------------------------
// NABDA SPECIFIC
// -----------------------------------------------------
export interface NabdaSendResult {
  timestamp: string;
  phone_input: string;
  phone_normalized: string;
  phone_sent: string;
  message_preview: string;
  status: 'sent' | 'failed' | 'skipped_optout' | 'skipped_invalid_phone';
  http_status?: number;
  message_id?: string;
  error?: string;
  retry_count: number;
}

export interface NabdaWebhookPayload {
  event: string;
  data: {
    phone?: string;
    message?: string;
    messageId?: string;
    status?: string;
    timestamp?: string;
    [key: string]: unknown;
  };
}
