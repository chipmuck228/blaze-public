-- Newsletter 异步通知系统数据库迁移脚本
-- 创建重发任务表和通知表

-- 1. Newsletter 重发任务表
CREATE TABLE IF NOT EXISTS newsletter_retry_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  task_type TEXT NOT NULL DEFAULT 'retry_failed_sends',
  send_ids UUID[] NOT NULL,
  campaign_id UUID REFERENCES newsletter_campaigns(id),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  total_count INTEGER DEFAULT 0,
  processed_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_newsletter_retry_tasks_user_id ON newsletter_retry_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_retry_tasks_status ON newsletter_retry_tasks(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_retry_tasks_created_at ON newsletter_retry_tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_newsletter_retry_tasks_user_status ON newsletter_retry_tasks(user_id, status);

-- 注释
COMMENT ON TABLE newsletter_retry_tasks IS 'Newsletter 重发任务表，用于异步处理重发操作';
COMMENT ON COLUMN newsletter_retry_tasks.status IS '任务状态：pending(待处理), processing(处理中), completed(已完成), failed(失败)';
COMMENT ON COLUMN newsletter_retry_tasks.send_ids IS '要重发的 send ID 数组';
COMMENT ON COLUMN newsletter_retry_tasks.total_count IS '总邮件数';
COMMENT ON COLUMN newsletter_retry_tasks.processed_count IS '已处理数';
COMMENT ON COLUMN newsletter_retry_tasks.success_count IS '成功数';
COMMENT ON COLUMN newsletter_retry_tasks.failed_count IS '失败数';
COMMENT ON COLUMN newsletter_retry_tasks.skipped_count IS '跳过数（永久失败等）';

-- 2. 管理员通知表
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  type TEXT NOT NULL, -- 'retry_task_completed', 'retry_task_failed', 'newsletter_sent', etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB, -- 附加数据（如任务 ID、统计信息等）
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_admin_notifications_user_id ON admin_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON admin_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON admin_notifications(type);

-- RLS 策略
ALTER TABLE newsletter_retry_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- RLS 策略：重发任务表（服务端可管理所有）
CREATE POLICY "Service can manage retry_tasks" ON newsletter_retry_tasks
  FOR ALL USING (true) WITH CHECK (true);

-- RLS 策略：通知表
CREATE POLICY "Users can view their own notifications" ON admin_notifications
  FOR SELECT USING (true); -- 允许服务端查询所有通知

CREATE POLICY "Service can manage notifications" ON admin_notifications
  FOR ALL USING (true) WITH CHECK (true);

-- 注释
COMMENT ON TABLE admin_notifications IS '管理员通知表，用于异步任务完成通知';
COMMENT ON COLUMN admin_notifications.type IS '通知类型：retry_task_completed, retry_task_failed, newsletter_sent 等';
COMMENT ON COLUMN admin_notifications.data IS '附加数据（JSON），如任务统计信息、错误详情等';

-- 创建触发器自动更新 updated_at
CREATE OR REPLACE FUNCTION update_newsletter_retry_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_newsletter_retry_tasks_updated_at ON newsletter_retry_tasks;
CREATE TRIGGER trigger_update_newsletter_retry_tasks_updated_at
    BEFORE UPDATE ON newsletter_retry_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_newsletter_retry_tasks_updated_at();
