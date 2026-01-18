-- Newsletter 失败邮件追踪和重发功能数据库迁移脚本
-- 为 newsletter_sends 表添加重试相关字段

-- 添加重试相关字段
ALTER TABLE newsletter_sends
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_permanent_failure BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 更新现有记录的默认值
UPDATE newsletter_sends
SET retry_count = 0,
    is_permanent_failure = FALSE,
    updated_at = COALESCE(updated_at, created_at)
WHERE retry_count IS NULL OR is_permanent_failure IS NULL OR updated_at IS NULL;

-- 添加索引以优化失败邮件查询性能
CREATE INDEX IF NOT EXISTS idx_newsletter_sends_failed 
ON newsletter_sends(status, created_at) 
WHERE status = 'failed';

CREATE INDEX IF NOT EXISTS idx_newsletter_sends_campaign_status 
ON newsletter_sends(campaign_id, status);

CREATE INDEX IF NOT EXISTS idx_newsletter_sends_permanent_failure 
ON newsletter_sends(is_permanent_failure, status) 
WHERE status = 'failed';

-- 添加字段注释
COMMENT ON COLUMN newsletter_sends.retry_count IS '重试次数，用于限制重试次数（最多 3 次）';
COMMENT ON COLUMN newsletter_sends.last_retry_at IS '最后重试时间';
COMMENT ON COLUMN newsletter_sends.is_permanent_failure IS '是否为永久失败（如邮箱地址无效、订阅者已退订），永久失败的邮件不应再重试';
COMMENT ON COLUMN newsletter_sends.updated_at IS '记录更新时间';

-- 创建触发器自动更新 updated_at
CREATE OR REPLACE FUNCTION update_newsletter_sends_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_newsletter_sends_updated_at ON newsletter_sends;
CREATE TRIGGER trigger_update_newsletter_sends_updated_at
    BEFORE UPDATE ON newsletter_sends
    FOR EACH ROW
    EXECUTE FUNCTION update_newsletter_sends_updated_at();
