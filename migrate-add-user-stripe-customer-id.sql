-- 添加 Stripe Customer ID 到 users 表
-- 用于存储用户的 Stripe Customer ID，以便管理支付方式

ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer 
  ON users(stripe_customer_id) 
  WHERE stripe_customer_id IS NOT NULL;

-- 添加注释
COMMENT ON COLUMN users.stripe_customer_id IS 'Stripe Customer ID for payment method management';

