// =====================================================
// Supabase Database Types (generated from schema)
// This represents the SQL schema in TypeScript
// =====================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      contacts: {
        Row: {
          id: string;
          business_name: string;
          contact_name: string | null;
          normalized_phone: string;
          raw_phone: string | null;
          category: string | null;
          governorate: string | null;
          city: string | null;
          whatsapp_status: string | null;
          source: string | null;
          tags: Json | null;
          custom_fields: Json | null;
          last_contacted_at: string | null;
          opted_out: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_name: string;
          contact_name?: string | null;
          normalized_phone: string;
          raw_phone?: string | null;
          category?: string | null;
          governorate?: string | null;
          city?: string | null;
          whatsapp_status?: string | null;
          source?: string | null;
          tags?: Json | null;
          custom_fields?: Json | null;
          last_contacted_at?: string | null;
          opted_out?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_name?: string;
          contact_name?: string | null;
          normalized_phone?: string;
          raw_phone?: string | null;
          category?: string | null;
          governorate?: string | null;
          city?: string | null;
          whatsapp_status?: string | null;
          source?: string | null;
          tags?: Json | null;
          custom_fields?: Json | null;
          last_contacted_at?: string | null;
          opted_out?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      campaigns: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          status: string;
          mode: string;
          template_id: string | null;
          daily_limit: number;
          min_delay_seconds: number;
          max_delay_seconds: number;
          batch_size: number;
          active_hours_start: string | null;
          active_hours_end: string | null;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          status?: string;
          mode: string;
          template_id?: string | null;
          daily_limit?: number;
          min_delay_seconds?: number;
          max_delay_seconds?: number;
          batch_size?: number;
          active_hours_start?: string | null;
          active_hours_end?: string | null;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          status?: string;
          mode?: string;
          template_id?: string | null;
          daily_limit?: number;
          min_delay_seconds?: number;
          max_delay_seconds?: number;
          batch_size?: number;
          active_hours_start?: string | null;
          active_hours_end?: string | null;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      message_templates: {
        Row: {
          id: string;
          name: string;
          language: string;
          template_type: string;
          body: string;
          variables: Json;
          cta_type: string;
          is_active: boolean;
          variants: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          language?: string;
          template_type?: string;
          body: string;
          variables?: Json;
          cta_type?: string;
          is_active?: boolean;
          variants?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          language?: string;
          template_type?: string;
          body?: string;
          variables?: Json;
          cta_type?: string;
          is_active?: boolean;
          variants?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      campaign_recipients: {
        Row: {
          id: string;
          campaign_id: string;
          contact_id: string;
          status: string;
          send_after: string | null;
          last_attempt_at: string | null;
          attempt_count: number;
          personalized_message: string | null;
          last_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          contact_id: string;
          status?: string;
          send_after?: string | null;
          last_attempt_at?: string | null;
          attempt_count?: number;
          personalized_message?: string | null;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          contact_id?: string;
          status?: string;
          send_after?: string | null;
          last_attempt_at?: string | null;
          attempt_count?: number;
          personalized_message?: string | null;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          campaign_id: string | null;
          contact_id: string;
          direction: string;
          provider: string;
          provider_message_id: string | null;
          phone: string;
          body: string;
          status: string | null;
          event_payload: Json;
          sent_at: string | null;
          delivered_at: string | null;
          read_at: string | null;
          received_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id?: string | null;
          contact_id: string;
          direction: string;
          provider?: string;
          provider_message_id?: string | null;
          phone: string;
          body: string;
          status?: string | null;
          event_payload?: Json;
          sent_at?: string | null;
          delivered_at?: string | null;
          read_at?: string | null;
          received_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string | null;
          contact_id?: string;
          direction?: string;
          provider?: string;
          provider_message_id?: string | null;
          phone?: string;
          body?: string;
          status?: string | null;
          event_payload?: Json;
          sent_at?: string | null;
          delivered_at?: string | null;
          read_at?: string | null;
          received_at?: string | null;
          created_at?: string;
        };
      };
      reply_intents: {
        Row: {
          id: string;
          message_id: string;
          contact_id: string;
          detected_intent: string;
          confidence: number | null;
          extracted_entities: Json;
          handled: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          contact_id: string;
          detected_intent: string;
          confidence?: number | null;
          extracted_entities?: Json;
          handled?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          contact_id?: string;
          detected_intent?: string;
          confidence?: number | null;
          extracted_entities?: Json;
          handled?: boolean;
          created_at?: string;
        };
      };
      automation_rules: {
        Row: {
          id: string;
          name: string;
          is_active: boolean;
          trigger_type: string;
          conditions: Json;
          action_type: string;
          action_config: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          is_active?: boolean;
          trigger_type: string;
          conditions?: Json;
          action_type: string;
          action_config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          is_active?: boolean;
          trigger_type?: string;
          conditions?: Json;
          action_type?: string;
          action_config?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      webhook_events: {
        Row: {
          id: string;
          provider: string;
          event_type: string;
          payload: Json;
          processed: boolean;
          processed_at: string | null;
          error_message: string | null;
          received_at: string;
        };
        Insert: {
          id?: string;
          provider: string;
          event_type: string;
          payload?: Json;
          processed?: boolean;
          processed_at?: string | null;
          error_message?: string | null;
          received_at?: string;
        };
        Update: {
          id?: string;
          provider?: string;
          event_type?: string;
          payload?: Json;
          processed?: boolean;
          processed_at?: string | null;
          error_message?: string | null;
          received_at?: string;
        };
      };
    };
    Views: {
      conversations: {
        Row: {
          contact_id: string;
          business_name: string;
          contact_name: string | null;
          normalized_phone: string;
          whatsapp_status: string;
          opted_out: boolean;
          unread_count: number;
          last_message_at: string | null;
          last_message_preview: string | null;
          last_message_direction: string | null;
        };
      };
      campaign_stats: {
        Row: {
          campaign_id: string;
          campaign_name: string;
          status: string;
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
        };
      };
    };
    Functions: {};
  };
}
