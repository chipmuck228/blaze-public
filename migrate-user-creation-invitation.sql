-- ==================== 用户创建和邀请系统数据库迁移 ====================
-- 添加用户创建、邀请、测试用户相关字段

-- ==================== 第一步：添加字段到 users 表 ====================

-- 添加测试用户标记
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS is_test_user BOOLEAN DEFAULT FALSE;

-- 添加创建者字段（记录是哪个 Admin 创建的）
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- 添加邀请相关字段
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS invitation_token TEXT,
  ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMP WITH TIME ZONE;

-- 添加密码管理相关字段
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS password_set_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMP WITH TIME ZONE;

-- ==================== 第二步：创建索引 ====================

-- 邀请令牌索引（用于快速查找）
CREATE INDEX IF NOT EXISTS idx_users_invitation_token ON users(invitation_token);

-- 测试用户索引
CREATE INDEX IF NOT EXISTS idx_users_is_test_user ON users(is_test_user);

-- 创建者索引
CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by);

-- 邀请过期时间索引（用于清理过期邀请）
CREATE INDEX IF NOT EXISTS idx_users_invitation_expires_at ON users(invitation_expires_at);

-- 邀请令牌唯一索引（确保每个令牌唯一）
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_invitation_token_unique 
  ON users(invitation_token) 
  WHERE invitation_token IS NOT NULL;

-- ==================== 第三步：添加约束 ====================

-- 检查约束：用户必须有密码或邀请令牌（测试用户除外）
-- 注意：这个约束可能太严格，因为现有用户可能没有这些字段
-- 如果需要，可以先检查现有数据，再添加约束
-- ALTER TABLE users 
--   ADD CONSTRAINT check_user_has_password_or_invitation 
--   CHECK (
--     password_hash IS NOT NULL OR 
--     invitation_token IS NOT NULL OR 
--     is_test_user = TRUE
--   );

-- ==================== 第四步：创建辅助函数 ====================

-- 生成随机密码函数（12位，包含大小写字母、数字、特殊字符）
CREATE OR REPLACE FUNCTION generate_random_password(length INTEGER DEFAULT 12)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 生成邀请令牌函数（UUID v4）
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
  RETURN gen_random_uuid()::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ==================== 第五步：数据迁移（可选） ====================

-- 为现有用户设置默认值
UPDATE users 
SET 
  is_test_user = FALSE,
  must_change_password = FALSE
WHERE is_test_user IS NULL OR must_change_password IS NULL;

-- ==================== 验证 ====================

-- 检查字段是否添加成功
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'users' 
--   AND column_name IN ('is_test_user', 'created_by', 'invitation_token', 
--                       'invitation_expires_at', 'invitation_sent_at', 
--                       'password_set_at', 'must_change_password', 'last_password_change')
-- ORDER BY column_name;

-- 检查索引是否创建成功
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'users' 
--   AND indexname LIKE '%invitation%' OR indexname LIKE '%test%' OR indexname LIKE '%created_by%';

