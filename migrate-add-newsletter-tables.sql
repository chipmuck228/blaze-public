-- Newsletter 订阅功能数据库迁移脚本

-- 1. 订阅者表
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  unsubscribe_token TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 订阅者表索引
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_active ON newsletter_subscribers(is_active, subscribed_at);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_unsubscribe_token ON newsletter_subscribers(unsubscribe_token);

-- 订阅者表注释
COMMENT ON TABLE newsletter_subscribers IS 'Newsletter 订阅者列表';
COMMENT ON COLUMN newsletter_subscribers.email IS '订阅者邮箱地址';
COMMENT ON COLUMN newsletter_subscribers.is_active IS '是否处于订阅状态';
COMMENT ON COLUMN newsletter_subscribers.unsubscribe_token IS '退订令牌，用于退订链接';

-- 2. Newsletter 模板表
CREATE TABLE IF NOT EXISTS newsletter_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  content_html TEXT NOT NULL,
  content_text TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 模板表索引
CREATE INDEX IF NOT EXISTS idx_newsletter_templates_active ON newsletter_templates(is_active, created_at);

-- 模板表注释
COMMENT ON TABLE newsletter_templates IS 'Newsletter 内容模板';
COMMENT ON COLUMN newsletter_templates.name IS '模板名称';
COMMENT ON COLUMN newsletter_templates.subject IS '邮件主题';
COMMENT ON COLUMN newsletter_templates.content_html IS 'HTML 格式的邮件内容';
COMMENT ON COLUMN newsletter_templates.content_text IS '纯文本格式的邮件内容（可选）';

-- 3. Newsletter 发送任务表
CREATE TABLE IF NOT EXISTS newsletter_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES newsletter_templates(id),
  subject TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled'
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 发送任务表索引
CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_status ON newsletter_campaigns(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_template ON newsletter_campaigns(template_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_created_by ON newsletter_campaigns(created_by);

-- 发送任务表注释
COMMENT ON TABLE newsletter_campaigns IS 'Newsletter 发送任务记录';
COMMENT ON COLUMN newsletter_campaigns.status IS '发送状态：draft(草稿), scheduled(已计划), sending(发送中), sent(已发送), failed(失败), cancelled(已取消)';
COMMENT ON COLUMN newsletter_campaigns.scheduled_at IS '计划发送时间（用于定时发送）';
COMMENT ON COLUMN newsletter_campaigns.sent_at IS '实际发送时间';

-- 4. Newsletter 发送详情表
CREATE TABLE IF NOT EXISTS newsletter_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES newsletter_campaigns(id) ON DELETE CASCADE,
  subscriber_id UUID REFERENCES newsletter_subscribers(id),
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'bounced'
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 发送详情表索引
CREATE INDEX IF NOT EXISTS idx_newsletter_sends_campaign ON newsletter_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_sends_subscriber ON newsletter_sends(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_sends_status ON newsletter_sends(status);

-- 发送详情表注释
COMMENT ON TABLE newsletter_sends IS 'Newsletter 发送详情记录';
COMMENT ON COLUMN newsletter_sends.status IS '发送状态：pending(待发送), sent(已发送), failed(失败), bounced(退回)';

-- 启用 RLS（Row Level Security）
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_sends ENABLE ROW LEVEL SECURITY;

-- RLS 策略：订阅者表（公开读取，服务端可管理所有）
CREATE POLICY "Public can read active subscribers" ON newsletter_subscribers
  FOR SELECT USING (is_active = true);

CREATE POLICY "Service can manage subscribers" ON newsletter_subscribers
  FOR ALL USING (true) WITH CHECK (true);

-- RLS 策略：模板表（服务端可管理所有）
-- 注意：虽然策略允许所有操作，但 API 路由已经验证了管理员权限
CREATE POLICY "Service can manage templates" ON newsletter_templates
  FOR ALL USING (true) WITH CHECK (true);

-- RLS 策略：发送任务表（服务端可管理所有）
CREATE POLICY "Service can manage campaigns" ON newsletter_campaigns
  FOR ALL USING (true) WITH CHECK (true);

-- RLS 策略：发送详情表（服务端可管理所有）
CREATE POLICY "Service can manage sends" ON newsletter_sends
  FOR ALL USING (true) WITH CHECK (true);
