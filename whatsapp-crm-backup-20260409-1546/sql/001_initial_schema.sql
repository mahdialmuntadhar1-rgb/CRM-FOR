-- =====================================================
-- WhatsApp CRM Database Schema
-- Supabase PostgreSQL
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. CONTACTS TABLE
-- =====================================================
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_name TEXT NOT NULL,
    contact_name TEXT,
    normalized_phone TEXT NOT NULL UNIQUE,
    raw_phone TEXT,
    category TEXT,
    governorate TEXT,
    city TEXT,
    whatsapp_status TEXT DEFAULT 'unknown', -- unknown, valid, invalid, opted_out
    source TEXT DEFAULT 'manual',
    tags JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '{}',
    last_contacted_at TIMESTAMP WITH TIME ZONE,
    opted_out BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for contacts
CREATE INDEX idx_contacts_normalized_phone ON contacts(normalized_phone);
CREATE INDEX idx_contacts_governorate ON contacts(governorate);
CREATE INDEX idx_contacts_category ON contacts(category);
CREATE INDEX idx_contacts_whatsapp_status ON contacts(whatsapp_status);
CREATE INDEX idx_contacts_opted_out ON contacts(opted_out);
CREATE INDEX idx_contacts_tags ON contacts USING GIN(tags);

-- =====================================================
-- 2. CAMPAIGNS TABLE
-- =====================================================
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft', -- draft, running, paused, completed, failed
    mode TEXT NOT NULL DEFAULT 'reply_first', -- reply_first, link_first, mixed
    template_id UUID,
    daily_limit INTEGER DEFAULT 50,
    min_delay_seconds INTEGER DEFAULT 45,
    max_delay_seconds INTEGER DEFAULT 120,
    batch_size INTEGER DEFAULT 5,
    active_hours_start TIME DEFAULT '09:00',
    active_hours_end TIME DEFAULT '18:00',
    timezone TEXT DEFAULT 'Asia/Baghdad',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for campaigns
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_mode ON campaigns(mode);

-- =====================================================
-- 3. MESSAGE TEMPLATES TABLE
-- =====================================================
CREATE TABLE message_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    language TEXT DEFAULT 'ar',
    template_type TEXT NOT NULL DEFAULT 'initial', -- initial, followup_1, followup_2, reply_auto, optout_confirm
    body TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    cta_type TEXT DEFAULT 'reply', -- none, reply, link, mixed
    is_active BOOLEAN DEFAULT TRUE,
    variants JSONB DEFAULT '[]', -- Template spinning variants
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for templates
CREATE INDEX idx_templates_type ON message_templates(template_type);
CREATE INDEX idx_templates_active ON message_templates(is_active);

-- =====================================================
-- 4. CAMPAIGN RECIPIENTS TABLE (Queue)
-- =====================================================
CREATE TABLE campaign_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- pending, queued, sending, sent, delivered, read, replied, failed, opted_out
    send_after TIMESTAMP WITH TIME ZONE,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    attempt_count INTEGER DEFAULT 0,
    personalized_message TEXT,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campaign_id, contact_id)
);

-- Indexes for campaign recipients
CREATE INDEX idx_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX idx_recipients_contact ON campaign_recipients(contact_id);
CREATE INDEX idx_recipients_status ON campaign_recipients(status);
CREATE INDEX idx_recipients_send_after ON campaign_recipients(send_after);
CREATE INDEX idx_recipients_pending ON campaign_recipients(campaign_id, status) WHERE status = 'pending';

-- =====================================================
-- 5. MESSAGES TABLE (Message Log)
-- =====================================================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    direction TEXT NOT NULL, -- outbound, inbound
    provider TEXT DEFAULT 'nabda',
    provider_message_id TEXT,
    phone TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT,
    event_payload JSONB DEFAULT '{}',
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    received_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for messages
CREATE INDEX idx_messages_campaign ON messages(campaign_id);
CREATE INDEX idx_messages_contact ON messages(contact_id);
CREATE INDEX idx_messages_provider_id ON messages(provider_message_id);
CREATE INDEX idx_messages_direction ON messages(direction);
CREATE INDEX idx_messages_phone ON messages(phone);
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- =====================================================
-- 6. REPLY INTENTS TABLE (Intent Detection)
-- =====================================================
CREATE TABLE reply_intents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    detected_intent TEXT NOT NULL, -- interested, ask_price, ask_details, claim_listing, not_now, stop, unknown
    confidence DECIMAL(3,2),
    extracted_entities JSONB DEFAULT '{}',
    handled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for reply intents
CREATE INDEX idx_intents_message ON reply_intents(message_id);
CREATE INDEX idx_intents_contact ON reply_intents(contact_id);
CREATE INDEX idx_intents_intent ON reply_intents(detected_intent);
CREATE INDEX idx_intents_handled ON reply_intents(handled);

-- =====================================================
-- 7. AUTOMATION RULES TABLE
-- =====================================================
CREATE TABLE automation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    trigger_type TEXT NOT NULL, -- incoming_message, message_sent, message_delivered, no_reply_after_hours
    conditions JSONB DEFAULT '{}',
    action_type TEXT NOT NULL, -- send_template, tag_contact, mark_opt_out, schedule_followup, assign_manual_review
    action_config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for automation rules
CREATE INDEX idx_rules_active ON automation_rules(is_active);
CREATE INDEX idx_rules_trigger ON automation_rules(trigger_type);

-- =====================================================
-- 8. WEBHOOK EVENTS TABLE
-- =====================================================
CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for webhook events
CREATE INDEX idx_webhook_processed ON webhook_events(processed);
CREATE INDEX idx_webhook_provider ON webhook_events(provider);
CREATE INDEX idx_webhook_type ON webhook_events(event_type);
CREATE INDEX idx_webhook_received ON webhook_events(received_at DESC);

-- =====================================================
-- 9. CONVERSATIONS VIEW (For Inbox)
-- =====================================================
CREATE OR REPLACE VIEW conversations AS
SELECT 
    c.id as contact_id,
    c.business_name,
    c.contact_name,
    c.normalized_phone,
    c.whatsapp_status,
    c.opted_out,
    COUNT(CASE WHEN m.direction = 'inbound' AND m.read_at IS NULL THEN 1 END) as unread_count,
    MAX(m.created_at) as last_message_at,
    (SELECT body FROM messages WHERE contact_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_preview,
    (SELECT direction FROM messages WHERE contact_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_direction
FROM contacts c
LEFT JOIN messages m ON c.id = m.contact_id
GROUP BY c.id, c.business_name, c.contact_name, c.normalized_phone, c.whatsapp_status, c.opted_out;

-- =====================================================
-- 10. CAMPAIGN STATS VIEW
-- =====================================================
CREATE OR REPLACE VIEW campaign_stats AS
SELECT 
    c.id as campaign_id,
    c.name as campaign_name,
    c.status,
    COUNT(cr.id) as total_recipients,
    COUNT(CASE WHEN cr.status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN cr.status = 'queued' THEN 1 END) as queued,
    COUNT(CASE WHEN cr.status = 'sending' THEN 1 END) as sending,
    COUNT(CASE WHEN cr.status = 'sent' THEN 1 END) as sent,
    COUNT(CASE WHEN cr.status = 'delivered' THEN 1 END) as delivered,
    COUNT(CASE WHEN cr.status = 'read' THEN 1 END) as read,
    COUNT(CASE WHEN cr.status = 'replied' THEN 1 END) as replied,
    COUNT(CASE WHEN cr.status = 'failed' THEN 1 END) as failed,
    COUNT(CASE WHEN cr.status = 'opted_out' THEN 1 END) as opted_out
FROM campaigns c
LEFT JOIN campaign_recipients cr ON c.id = cr.campaign_id
GROUP BY c.id, c.name, c.status;

-- =====================================================
-- 11. ROW LEVEL SECURITY POLICIES (Enable for frontend)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reply_intents ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (service role bypasses)
CREATE POLICY "Allow all" ON contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON message_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON campaign_recipients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON reply_intents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- 12. FUNCTIONS & TRIGGERS
-- =====================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON message_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipients_updated_at BEFORE UPDATE ON campaign_recipients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rules_updated_at BEFORE UPDATE ON automation_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 13. SEED DATA - Default Templates (Arabic-first)
-- =====================================================

-- Template A: Reply-first intro
INSERT INTO message_templates (name, language, template_type, body, variables, cta_type, variants) VALUES (
    'Reply-first Introduction',
    'ar',
    'initial',
    'مرحباً {{business_name}} 🌟 نحن نعمل على دليل محلي منظم للأعمال في العراق وشفنا نشاطكم. إذا تحب تعرف شلون نظهر نشاطكم بشكل أفضل وتوصلون لزباين أكثر، رد علينا بكلمة: نعم',
    '["business_name"]',
    'reply',
    '[
    "مرحباً {{business_name}} 🌟 شفنا عملكم الرائع ونحب نضيفكم لدليل الأعمال المحلي. رد بـ ''نعم'' إذا تحب تعرف أكثر",
    "{{business_name}} — أعمالكم مميزة 🌟 نبني دليل للعراق ونحب نشملكم. رد ''نعم'' للتفاصيل",
    "هلا {{business_name}} 👋 لاحظنا نشاطكم المميز. عندنا فكرة تفيدكم. رد ''نعم" إذا تحب تسمع"
]'
);

-- Template B: Very short intro
INSERT INTO message_templates (name, language, template_type, body, variables, cta_type, variants) VALUES (
    'Short Introduction',
    'ar',
    'initial',
    'هلا {{business_name}}، عندنا صفحة مبدئية لنشاطكم داخل دليل أعمال محلي. إذا تحب تعرف التفاصيل أو تعدل المعلومات، رد علينا بكلمة نعم',
    '["business_name"]',
    'reply',
    '[
    "{{business_name}} — صفحتكم جاهزة بالدليل 📝 رد ''نعم'' لتشوفونها",
    "عندنا معلومات عن {{business_name}} بالدليل. رد ''نعم'' لتصحيح أو تحديث",
    "{{business_name}} موجود بالدليل المحلي 📋 رد ''نعم'' للتفاصيل"
]'
);

-- Template C: Link-first
INSERT INTO message_templates (name, language, template_type, body, variables, cta_type) VALUES (
    'Link-first Claim',
    'ar',
    'initial',
    'مرحباً {{business_name}}، هذه صفحتكم المبدئية داخل دليل الأعمال: {{claim_link}} إذا تحب نعدل البيانات أو نفعّلها بشكل أفضل، رد علينا هنا مباشرة',
    '["business_name", "claim_link"]',
    'mixed'
);

-- Template D: Follow-up after no reply
INSERT INTO message_templates (name, language, template_type, body, variables, cta_type, variants) VALUES (
    'Follow-up Reminder',
    'ar',
    'followup_1',
    'مرحباً {{business_name}}، فقط تذكير سريع بخصوص صفحتكم داخل دليل الأعمال. إذا تحب نرسل التفاصيل، فقط رد بكلمة نعم',
    '["business_name"]',
    'reply',
    '[
    "{{business_name}} — تذكير ودي 🔔 رد ''نعم'' إذا تحب تعرف أكثر عن الدليل",
    "لم ننساكم {{business_name}} 😊 رد ''نعم'' ونرسلكم التفاصيل"
]'
);

-- Template E: Interested auto-reply
INSERT INTO message_templates (name, language, template_type, body, variables, cta_type) VALUES (
    'Interested Response',
    'ar',
    'reply_auto',
    'أهلاً وسهلاً 🌟
فائدتكم من الظهور داخل الدليل:

• ظهور أسهل للناس القريبة منكم
• معلومات منظّمة بدل التشتت
• فرصة أكبر للوصول والاتصال

إذا تحب، نرسل لك الرابط أو نثبت البيانات خطوة بخطوة',
    '[]',
    'none'
);

-- Template F: Opt-out confirmation
INSERT INTO message_templates (name, language, template_type, body, variables, cta_type) VALUES (
    'Opt-out Confirmation',
    'ar',
    'optout_confirm',
    'تم، لن نرسل لكم رسائل أخرى. شكراً لكم ونعتذر عن الإزعاج',
    '[]',
    'none'
);

-- Template G: Benefits explanation
INSERT INTO message_templates (name, language, template_type, body, variables, cta_type) VALUES (
    'Benefits Explanation',
    'ar',
    'followup_2',
    'شكراً {{business_name}}! 🌟

لما تكونون بالدليل المحلي:
✅ الناس تلاقيكم بسهولة حسب المنطقة
✅ معلوماتكم موحّدة وصحيحة
✅ فرصة للتعليقات والتواصل

ها الرابط: {{claim_link}}
أو رد ''عدل'' إذا تحب نعدل البيانات عنكم',
    '["business_name", "claim_link"]',
    'mixed'
);
