export type Governorate = 
  | 'Baghdad' | 'Basra' | 'Nineveh' | 'Erbil' | 'Najaf' | 'Karbala' 
  | 'Anbar' | 'Babil' | 'Diyala' | 'Duhok' | 'Kirkuk' | 'Maysan' 
  | 'Muthanna' | 'Qadisiyah' | 'Salah al-Din' | 'Sulaymaniyah' | 'Wasit' | 'Dhi Qar';

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
}

export interface Campaign {
  id: string;
  name: string;
  message_text: string;
  filters: {
    governorate?: Governorate;
    city?: string;
    category?: string;
  };
  status: 'draft' | 'queued' | 'sending' | 'completed' | 'paused';
  total_targets: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
}

export interface Message {
  id: string;
  campaign_id: string;
  business_id: string;
  status: 'queued' | 'sent' | 'failed';
  error_message?: string;
  sent_at?: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  business_id: string;
  last_message_at: string;
  unread_count: number;
  business?: Business;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  text: string;
  sender_type: 'business' | 'admin';
  created_at: string;
}

export interface Post {
  id: string;
  business_id: string;
  title: string;
  content: string;
  image_url?: string;
  created_at: string;
}
