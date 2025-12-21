-- 添加 Stripe 支付相关字段到 course_enrollments 表
-- 基于 STRIPE_PAYMENT_DESIGN.md 设计方案

-- 添加 Stripe 相关字段
ALTER TABLE course_enrollments 
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_refund_id TEXT,
  ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS refund_reason TEXT,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP WITH TIME ZONE;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_enrollments_stripe_session 
  ON course_enrollments(stripe_checkout_session_id) 
  WHERE stripe_checkout_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_enrollments_stripe_payment_intent 
  ON course_enrollments(stripe_payment_intent_id) 
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_enrollments_stripe_customer 
  ON course_enrollments(stripe_customer_id) 
  WHERE stripe_customer_id IS NOT NULL;

-- 可选：创建支付事件审计表（用于记录所有 Stripe Webhook 事件）
CREATE TABLE IF NOT EXISTS stripe_payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID REFERENCES course_enrollments(id) ON DELETE CASCADE,
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  stripe_object_id TEXT,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_stripe_events_enrollment 
  ON stripe_payment_events(enrollment_id);

CREATE INDEX IF NOT EXISTS idx_stripe_events_stripe_id 
  ON stripe_payment_events(stripe_event_id);

CREATE INDEX IF NOT EXISTS idx_stripe_events_processed 
  ON stripe_payment_events(processed);

CREATE INDEX IF NOT EXISTS idx_stripe_events_type 
  ON stripe_payment_events(event_type);

-- 添加注释
COMMENT ON COLUMN course_enrollments.stripe_checkout_session_id IS 'Stripe Checkout Session ID';
COMMENT ON COLUMN course_enrollments.stripe_payment_intent_id IS 'Stripe Payment Intent ID';
COMMENT ON COLUMN course_enrollments.stripe_customer_id IS 'Stripe Customer ID (optional, for saving customer info)';
COMMENT ON COLUMN course_enrollments.stripe_refund_id IS 'Stripe Refund ID (if refunded)';
COMMENT ON COLUMN course_enrollments.refund_amount IS 'Refund amount';
COMMENT ON COLUMN course_enrollments.refund_reason IS 'Reason for refund';
COMMENT ON COLUMN course_enrollments.refunded_at IS 'Refund timestamp';

