export type Governorate = 
  | 'Baghdad' | 'Basra' | 'Nineveh' | 'Erbil' | 'Najaf' | 'Karbala' 
  | 'Anbar' | 'Babil' | 'Diyala' | 'Duhok' | 'Kirkuk' | 'Maysan' 
  | 'Muthanna' | 'Qadisiyah' | 'Salah al-Din' | 'Sulaymaniyah' | 'Wasit' | 'Dhi Qar';

export type Language = 'Arabic' | 'Kurdish' | 'English';
export type Tone = 'Friendly' | 'Professional' | 'Direct' | 'Urgent';
export type CTAType = 'no_link' | 'ask_for_reply' | 'send_profile_link' | 'send_claim_link' | 'send_dashboard_link' | 'send_more_info_prompt';
export type CampaignStatus = 'draft' | 'queued' | 'sending' | 'completed' | 'paused';
export type MessageStatus = 'queued' | 'sending' | 'sent' | 'failed';
export type StrategyType = 'single_template' | 'random_template' | 'even_rotation' | 'weighted_ab_test';

export interface Business {
  id: string;
  name: string;
  phone: string;
  whatsapp_enabled: boolean;
  governorate: Governorate;
  city: string;
  category: string;
  address?: string;
  created_at: string;
  owner_id?: string;
  tags?: string[];
}

export interface Template {
  id: string;
  name: string;
  language: Language;
  tone: Tone;
  objective: string;
  cta_type: CTAType;
  body: string;
  is_active: boolean;
  last_updated: string;
}

export interface Campaign {
  id: string;
  name: string;
  notes?: string;
  language: Language;
  filters: {
    governorate?: Governorate;
    city?: string;
    category?: string;
    tags?: string[];
  };
  template_ids: string[];
  strategy: StrategyType;
  weights?: Record<string, number>; // template_id -> weight
  status: CampaignStatus;
  total_targets: number;
  sent_count: number;
  failed_count: number;
  replied_count: number;
  created_at: string;
}

export interface Message {
  id: string;
  campaign_id: string;
  template_id: string;
  business_id: string;
  business_name: string;
  phone: string;
  status: MessageStatus;
  error_message?: string;
  sent_at?: string;
  created_at: string;
  attempt_count: number;
  rendered_body: string;
}

export interface Conversation {
  id: string;
  business_id: string;
  business_name: string;
  phone: string;
  last_message_snippet: string;
  last_message_at: string;
  unread_count: number;
  status: 'unread' | 'answered' | 'waiting';
  detected_language?: Language;
  detected_intent?: string;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  text: string;
  sender_type: 'business' | 'admin';
  created_at: string;
  status?: 'sent' | 'delivered' | 'read';
}

export interface FAQAnswer {
  id: string;
  intent_key: string;
  language: Language;
  question_patterns: string[];
  short_answer: string;
  full_answer: string;
  is_active: boolean;
  created_at: string;
}

export interface ExperimentMetric {
  template_id: string;
  template_name: string;
  sent: number;
  replied: number;
  reply_rate: number;
  positive_replies: number;
  failed: number;
  clicks?: number;
}
