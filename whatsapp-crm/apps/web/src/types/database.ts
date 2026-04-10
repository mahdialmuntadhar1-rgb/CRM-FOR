export interface Database {
  public: {
    Tables: {
      contacts: {
        Row: {
          id: string;
          business_name: string;
          normalized_phone: string;
          whatsapp_status?: string;
          governorate?: string;
          category?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_name: string;
          normalized_phone: string;
          whatsapp_status?: string;
          governorate?: string;
          category?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_name?: string;
          normalized_phone?: string;
          whatsapp_status?: string;
          governorate?: string;
          category?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      message_templates: {
        Row: {
          id: string;
          name: string;
          body: string;
          template_type: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          body: string;
          template_type: string;
          is_active: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          body?: string;
          template_type?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      campaigns: {
        Row: {
          id: string;
          name: string;
          status: string;
          template_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          status?: string;
          template_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          status?: string;
          template_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      campaign_stats: {
        Row: {
          id: string;
          campaign_id: string;
          total_sent: number;
          total_delivered: number;
          total_failed: number;
          total_replied: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          total_sent?: number;
          total_delivered?: number;
          total_failed?: number;
          total_replied?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          total_sent?: number;
          total_delivered?: number;
          total_failed?: number;
          total_replied?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          contact_id: string;
          business_name: string;
          normalized_phone: string;
          last_message_at: string;
          last_message_text: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          contact_id: string;
          business_name: string;
          normalized_phone: string;
          last_message_at?: string;
          last_message_text?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          contact_id?: string;
          business_name?: string;
          normalized_phone?: string;
          last_message_at?: string;
          last_message_text?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          contact_id: string;
          message_text: string;
          message_type: string;
          direction: 'inbound' | 'outbound';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          contact_id: string;
          message_text: string;
          message_type?: string;
          direction?: 'inbound' | 'outbound';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          contact_id?: string;
          message_text?: string;
          message_type?: string;
          direction?: 'inbound' | 'outbound';
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
