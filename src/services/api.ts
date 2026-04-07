import { 
  Campaign, 
  Template, 
  Message, 
  Conversation, 
  ConversationMessage, 
  FAQAnswer, 
  ExperimentMetric,
  Business
} from '../types';

// Mock Data
const MOCK_TEMPLATES: Template[] = [
  {
    id: 't1',
    name: 'Welcome Offer',
    language: 'Arabic',
    tone: 'Friendly',
    objective: 'New Customer Acquisition',
    cta_type: 'send_profile_link',
    body: 'Hello {{business_name}}, we are excited to offer you a special discount for our services in {{city}}! Check our profile here: {{profile_link}}',
    is_active: true,
    last_updated: '2024-03-20T10:00:00Z'
  },
  {
    id: 't2',
    name: 'Follow-up Survey',
    language: 'English',
    tone: 'Professional',
    objective: 'Customer Feedback',
    cta_type: 'ask_for_reply',
    body: 'Hi {{business_name}}, how was your experience with us? Please reply with a number from 1-10.',
    is_active: true,
    last_updated: '2024-03-19T15:30:00Z'
  },
  {
    id: 't3',
    name: 'Urgent Update',
    language: 'Arabic',
    tone: 'Urgent',
    objective: 'System Notification',
    cta_type: 'no_link',
    body: 'Attention {{business_name}}! Your subscription for {{category}} services is about to expire.',
    is_active: false,
    last_updated: '2024-03-18T09:00:00Z'
  }
];

const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: 'c1',
    name: 'Ramadan Special 2024',
    notes: 'Targeting cafes in Baghdad',
    language: 'Arabic',
    filters: { governorate: 'Baghdad', category: 'Cafe' },
    template_ids: ['t1'],
    strategy: 'single_template',
    status: 'completed',
    total_targets: 150,
    sent_count: 148,
    failed_count: 2,
    replied_count: 45,
    created_at: '2024-03-10T08:00:00Z'
  },
  {
    id: 'c2',
    name: 'Basra Outreach Q1',
    language: 'Arabic',
    filters: { governorate: 'Basra' },
    template_ids: ['t1', 't2'],
    strategy: 'weighted_ab_test',
    weights: { 't1': 70, 't2': 30 },
    status: 'sending',
    total_targets: 500,
    sent_count: 230,
    failed_count: 5,
    replied_count: 12,
    created_at: '2024-03-15T12:00:00Z'
  }
];

const MOCK_MESSAGES: Message[] = [
  {
    id: 'm1',
    campaign_id: 'c2',
    template_id: 't1',
    business_id: 'b1',
    business_name: 'Al Noor Cafe',
    phone: '+964 770 123 4567',
    status: 'sent',
    sent_at: '2024-03-15T12:05:00Z',
    created_at: '2024-03-15T12:00:00Z',
    attempt_count: 1,
    rendered_body: 'Hello Al Noor Cafe, we are excited to offer you a special discount for our services in Baghdad!'
  },
  {
    id: 'm2',
    campaign_id: 'c2',
    template_id: 't2',
    business_id: 'b2',
    business_name: 'Basra Tech',
    phone: '+964 780 987 6543',
    status: 'failed',
    error_message: 'Invalid phone number format',
    created_at: '2024-03-15T12:01:00Z',
    attempt_count: 3,
    rendered_body: 'Hi Basra Tech, how was your experience with us? Please reply with a number from 1-10.'
  }
];

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv1',
    business_id: 'b1',
    business_name: 'Al Noor Cafe',
    phone: '+964 770 123 4567',
    last_message_snippet: 'Thank you for the offer!',
    last_message_at: '2024-03-15T14:20:00Z',
    unread_count: 1,
    status: 'unread',
    detected_language: 'Arabic',
    detected_intent: 'positive_feedback'
  },
  {
    id: 'conv2',
    business_id: 'b3',
    business_name: 'Erbil Logistics',
    phone: '+964 750 111 2222',
    last_message_snippet: 'What are your prices?',
    last_message_at: '2024-03-14T10:15:00Z',
    unread_count: 0,
    status: 'answered',
    detected_language: 'Kurdish',
    detected_intent: 'pricing_query'
  }
];

const MOCK_FAQS: FAQAnswer[] = [
  {
    id: 'f1',
    intent_key: 'pricing_query',
    language: 'Arabic',
    question_patterns: ['كم السعر', 'الأسعار', 'price'],
    short_answer: 'Our basic plan starts at $50/month.',
    full_answer: 'Thank you for your interest! Our basic plan starts at $50/month, which includes up to 1000 messages. For larger volumes, we have custom enterprise plans.',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z'
  }
];

const MOCK_EXPERIMENTS: ExperimentMetric[] = [
  {
    template_id: 't1',
    template_name: 'Welcome Offer (Friendly)',
    sent: 1000,
    replied: 250,
    reply_rate: 25,
    positive_replies: 180,
    failed: 10,
    clicks: 450
  },
  {
    template_id: 't2',
    template_name: 'Welcome Offer (Direct)',
    sent: 1000,
    replied: 150,
    reply_rate: 15,
    positive_replies: 90,
    failed: 12,
    clicks: 300
  }
];

// Service Layer
export const api = {
  // Templates
  getTemplates: async () => MOCK_TEMPLATES,
  getTemplate: async (id: string) => MOCK_TEMPLATES.find(t => t.id === id),
  createTemplate: async (template: Omit<Template, 'id' | 'last_updated'>) => ({ ...template, id: Math.random().toString(), last_updated: new Date().toISOString() }),
  
  // Campaigns
  getCampaigns: async () => MOCK_CAMPAIGNS,
  getCampaign: async (id: string) => MOCK_CAMPAIGNS.find(c => c.id === id),
  createCampaign: async (campaign: Omit<Campaign, 'id' | 'created_at' | 'sent_count' | 'failed_count' | 'replied_count'>) => ({ ...campaign, id: Math.random().toString(), created_at: new Date().toISOString(), sent_count: 0, failed_count: 0, replied_count: 0 }),

  // Messages / Queue
  getMessages: async (filters?: any) => MOCK_MESSAGES,
  getQueueStats: async () => ({
    queued: 120,
    sending: 45,
    sent: 1450,
    failed: 23
  }),

  // Conversations
  getConversations: async () => MOCK_CONVERSATIONS,
  getConversationMessages: async (convId: string): Promise<ConversationMessage[]> => [
    { id: 'msg1', conversation_id: convId, text: 'Hello, I saw your offer.', sender_type: 'business', created_at: '2024-03-15T14:10:00Z' },
    { id: 'msg2', conversation_id: convId, text: 'Hi! Yes, we have a special Ramadan discount.', sender_type: 'admin', created_at: '2024-03-15T14:15:00Z' },
    { id: 'msg3', conversation_id: convId, text: 'Thank you for the offer!', sender_type: 'business', created_at: '2024-03-15T14:20:00Z' }
  ],

  // FAQ
  getFAQs: async () => MOCK_FAQS,
  
  // Experiments
  getExperimentMetrics: async () => MOCK_EXPERIMENTS,

  // Dashboard Stats
  getDashboardStats: async () => ({
    totalCampaigns: 12,
    totalQueued: 120,
    totalSent: 5430,
    totalFailed: 89,
    totalReplies: 1240,
    activeTemplates: 8
  })
};
