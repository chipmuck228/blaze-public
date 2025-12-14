-- 课程注册系统数据库表创建脚本
-- 基于 COURSE_ENROLLMENT_DESIGN.md 设计方案

-- ==================== 1. 核心表：course_enrollments ====================

CREATE TABLE IF NOT EXISTS course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES course_instances(id) ON DELETE CASCADE,
  
  -- 注册状态
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'cart',           -- 在注册清单中（未支付）
    'reserved',       -- 已保留（支付中）
    'enrolled',       -- 已正式注册
    'waitlisted',     -- 在等待列表中
    'cancelled',      -- 已取消
    'expired',        -- 已过期（自动释放）
    'completed'       -- 课程已完成
  )),
  
  -- 时间相关
  added_to_cart_at TIMESTAMP WITH TIME ZONE,        -- 加入清单时间
  cart_expires_at TIMESTAMP WITH TIME ZONE,         -- 清单过期时间
  reserved_at TIMESTAMP WITH TIME ZONE,             -- 保留时间（支付中）
  reserved_expires_at TIMESTAMP WITH TIME ZONE,     -- 保留过期时间
  enrolled_at TIMESTAMP WITH TIME ZONE,              -- 正式注册时间
  waitlisted_at TIMESTAMP WITH TIME ZONE,           -- 加入等待列表时间
  waitlist_position INTEGER,                        -- 等待列表位置
  waitlist_notified_at TIMESTAMP WITH TIME ZONE,     -- 等待列表通知时间
  waitlist_expires_at TIMESTAMP WITH TIME ZONE,     -- 等待列表过期时间（用户需要在指定时间内完成注册）
  cancelled_at TIMESTAMP WITH TIME ZONE,             -- 取消时间
  cancelled_reason TEXT,                            -- 取消原因
  
  -- 支付相关
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN (
    'unpaid',         -- 未支付
    'pending',        -- 支付中
    'paid',           -- 已支付
    'refunded',       -- 已退款
    'failed'          -- 支付失败
  )),
  payment_method_id UUID,                            -- 支付方式ID（预留，关联 payment_methods 表）
  amount_paid DECIMAL(10, 2),                        -- 实际支付金额
  currency TEXT DEFAULT 'USD',
  payment_transaction_id TEXT,                      -- 支付交易ID
  
  -- 元数据
  notes TEXT,                                        -- 备注（用户或管理员）
  metadata JSONB,                                    -- 扩展信息（JSON格式）
  
  -- 审计字段
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_instance_id ON course_enrollments(instance_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON course_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_cart_expires ON course_enrollments(cart_expires_at) WHERE status = 'cart';
CREATE INDEX IF NOT EXISTS idx_enrollments_reserved_expires ON course_enrollments(reserved_expires_at) WHERE status = 'reserved';
CREATE INDEX IF NOT EXISTS idx_enrollments_waitlist ON course_enrollments(instance_id, waitlist_position) WHERE status = 'waitlisted';
CREATE INDEX IF NOT EXISTS idx_enrollments_waitlist_expires ON course_enrollments(waitlist_expires_at) WHERE status = 'waitlisted';
CREATE INDEX IF NOT EXISTS idx_enrollments_user_instance ON course_enrollments(user_id, instance_id);

-- 唯一约束：确保用户在同一实例上不能同时有多个活跃状态
-- 注意：PostgreSQL 不支持部分唯一索引的 WHERE 子句包含多个条件，使用触发器实现

-- ==================== 2. 注册状态历史表 ====================

CREATE TABLE IF NOT EXISTS enrollment_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES users(id),              -- 谁触发的状态变更（用户ID或系统）
  change_reason TEXT,                                -- 变更原因
  metadata JSONB,                                    -- 变更时的额外信息
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enrollment_history_enrollment_id ON enrollment_status_history(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_history_created_at ON enrollment_status_history(created_at);

-- ==================== 3. 等待列表通知表 ====================

CREATE TABLE IF NOT EXISTS waitlist_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'spot_available',    -- 名额可用通知
    'expiring_soon',     -- 即将过期提醒
    'expired'            -- 已过期通知
  )),
  notification_method TEXT NOT NULL CHECK (notification_method IN (
    'email',
    'sms',
    'in_app'
  )),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_waitlist_notifications_enrollment_id ON waitlist_notifications(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_notifications_sent_at ON waitlist_notifications(sent_at);

-- ==================== 4. 注册配置表 ====================

CREATE TABLE IF NOT EXISTS enrollment_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入默认配置
INSERT INTO enrollment_config (config_key, config_value, description) VALUES
('cart_expiry_minutes', '15', '注册清单过期时间（分钟）'),
('reserved_expiry_minutes', '10', '支付保留过期时间（分钟）'),
('waitlist_notification_hours', '24', '等待列表通知有效期（小时）'),
('waitlist_auto_expire_days', '7', '等待列表自动过期时间（天）')
ON CONFLICT (config_key) DO NOTHING;

-- ==================== 5. 触发器：自动更新 current_students ====================

CREATE OR REPLACE FUNCTION update_instance_student_count()
RETURNS TRIGGER AS $$
BEGIN
  -- 当状态变为 enrolled 时，增加 current_students
  IF NEW.status = 'enrolled' AND (OLD.status IS NULL OR OLD.status != 'enrolled') THEN
    UPDATE course_instances
    SET current_students = current_students + 1,
        updated_at = NOW()
    WHERE id = NEW.instance_id;
  END IF;
  
  -- 当状态从 enrolled 变为其他状态时，减少 current_students
  IF OLD.status = 'enrolled' AND NEW.status != 'enrolled' THEN
    UPDATE course_instances
    SET current_students = GREATEST(0, current_students - 1),
        updated_at = NOW()
    WHERE id = NEW.instance_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_instance_student_count
AFTER INSERT OR UPDATE ON course_enrollments
FOR EACH ROW
EXECUTE FUNCTION update_instance_student_count();

-- ==================== 6. 触发器：记录状态变更历史 ====================

CREATE OR REPLACE FUNCTION log_enrollment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果状态发生变化，记录历史
  IF OLD.status IS NULL OR OLD.status != NEW.status THEN
    INSERT INTO enrollment_status_history (
      enrollment_id,
      from_status,
      to_status,
      changed_by,
      change_reason,
      metadata
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      NEW.user_id,  -- 默认使用用户ID，如果是系统操作可以后续更新
      CASE 
        WHEN NEW.status = 'expired' AND OLD.status = 'cart' THEN 'Cart expired automatically'
        WHEN NEW.status = 'expired' AND OLD.status = 'reserved' THEN 'Reserved expired automatically'
        WHEN NEW.status = 'expired' AND OLD.status = 'waitlisted' THEN 'Waitlist expired automatically'
        ELSE 'Status changed'
      END,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'timestamp', NOW()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_enrollment_status_change
AFTER INSERT OR UPDATE ON course_enrollments
FOR EACH ROW
EXECUTE FUNCTION log_enrollment_status_change();

-- ==================== 7. 函数：更新等待列表位置 ====================

CREATE OR REPLACE FUNCTION update_waitlist_positions(instance_id_param UUID)
RETURNS void AS $$
DECLARE
  pos INTEGER := 1;
  rec RECORD;
BEGIN
  -- 按加入时间排序，更新等待列表位置
  FOR rec IN
    SELECT id FROM course_enrollments
    WHERE instance_id = instance_id_param
      AND status = 'waitlisted'
    ORDER BY waitlisted_at ASC
  LOOP
    UPDATE course_enrollments
    SET waitlist_position = pos,
        updated_at = NOW()
    WHERE id = rec.id;
    pos := pos + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ==================== 8. 函数：处理过期的注册 ====================

CREATE OR REPLACE FUNCTION process_expired_enrollments()
RETURNS TABLE(
  processed_count INTEGER,
  freed_spots INTEGER
) AS $$
DECLARE
  cart_expired_count INTEGER;
  reserved_expired_count INTEGER;
  waitlist_expired_count INTEGER;
  instance_rec RECORD;
BEGIN
  -- 处理过期的 cart
  UPDATE course_enrollments
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'cart'
    AND cart_expires_at < NOW();
  
  GET DIAGNOSTICS cart_expired_count = ROW_COUNT;
  
  -- 处理过期的 reserved（pending payment）
  UPDATE course_enrollments
  SET status = 'expired',
      payment_status = CASE 
        WHEN payment_status = 'pending' THEN 'failed'
        ELSE payment_status
      END,
      updated_at = NOW()
  WHERE status = 'reserved'
    AND reserved_expires_at < NOW();
  
  GET DIAGNOSTICS reserved_expired_count = ROW_COUNT;
  
  -- 处理过期的 waitlist（超过自动过期时间且未收到通知，或通知已过期）
  UPDATE course_enrollments
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'waitlisted'
    AND (
      -- 情况1：超过自动过期时间且从未收到通知
      (waitlisted_at < NOW() - INTERVAL '7 days' AND waitlist_notified_at IS NULL)
      OR
      -- 情况2：收到通知但超过通知有效期
      (waitlist_expires_at IS NOT NULL AND waitlist_expires_at < NOW())
    );
  
  GET DIAGNOSTICS waitlist_expired_count = ROW_COUNT;
  
  -- 更新所有受影响实例的等待列表位置
  FOR instance_rec IN
    SELECT DISTINCT instance_id 
    FROM course_enrollments 
    WHERE status = 'waitlisted'
  LOOP
    PERFORM update_waitlist_positions(instance_rec.instance_id);
  END LOOP;
  
  RETURN QUERY SELECT
    (cart_expired_count + reserved_expired_count + waitlist_expired_count)::INTEGER as processed_count,
    (cart_expired_count + reserved_expired_count)::INTEGER as freed_spots;
END;
$$ LANGUAGE plpgsql;

-- ==================== 9. 函数：获取实例可用容量 ====================

CREATE OR REPLACE FUNCTION get_instance_available_capacity(instance_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  instance_max INTEGER;
  enrolled_count INTEGER;
  reserved_count INTEGER;
  cart_count INTEGER;
  available INTEGER;
BEGIN
  -- 获取实例最大容量
  SELECT COALESCE(max_students, 0) INTO instance_max
  FROM course_instances
  WHERE id = instance_id_param;
  
  -- 统计已注册数量
  SELECT COUNT(*) INTO enrolled_count
  FROM course_enrollments
  WHERE instance_id = instance_id_param
    AND status = 'enrolled';
  
  -- 统计已保留数量（支付中）
  SELECT COUNT(*) INTO reserved_count
  FROM course_enrollments
  WHERE instance_id = instance_id_param
    AND status = 'reserved'
    AND reserved_expires_at > NOW();
  
  -- 统计购物车中数量（未过期）
  SELECT COUNT(*) INTO cart_count
  FROM course_enrollments
  WHERE instance_id = instance_id_param
    AND status = 'cart'
    AND cart_expires_at > NOW();
  
  -- 计算可用容量
  available := instance_max - enrolled_count - reserved_count - cart_count;
  
  RETURN GREATEST(0, available);
END;
$$ LANGUAGE plpgsql;

-- ==================== 10. RLS 策略 ====================

-- 启用 RLS
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollment_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollment_config ENABLE ROW LEVEL SECURITY;

-- course_enrollments RLS 策略
-- 用户只能查看和操作自己的注册
CREATE POLICY "Users can view their own enrollments"
  ON course_enrollments FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own enrollments"
  ON course_enrollments FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own enrollments"
  ON course_enrollments FOR UPDATE
  USING (auth.uid()::text = user_id::text);

-- 管理员可以查看所有注册
CREATE POLICY "Admins can view all enrollments"
  ON course_enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

-- enrollment_status_history RLS 策略
CREATE POLICY "Users can view their enrollment history"
  ON enrollment_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM course_enrollments
      WHERE id = enrollment_status_history.enrollment_id
      AND user_id::text = auth.uid()::text
    )
  );

-- waitlist_notifications RLS 策略
CREATE POLICY "Users can view their notifications"
  ON waitlist_notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM course_enrollments
      WHERE id = waitlist_notifications.enrollment_id
      AND user_id::text = auth.uid()::text
    )
  );

-- enrollment_config RLS 策略（只读，管理员可修改）
CREATE POLICY "Everyone can view config"
  ON enrollment_config FOR SELECT
  USING (true);

-- ==================== 11. 注释 ====================

COMMENT ON TABLE course_enrollments IS '课程注册表，管理用户的课程注册状态';
COMMENT ON TABLE enrollment_status_history IS '注册状态变更历史表，用于审计追踪';
COMMENT ON TABLE waitlist_notifications IS '等待列表通知表';
COMMENT ON TABLE enrollment_config IS '注册系统配置表';

COMMENT ON COLUMN course_enrollments.status IS '注册状态：cart(清单中), reserved(已保留), enrolled(已注册), waitlisted(等待列表), cancelled(已取消), expired(已过期), completed(已完成)';
COMMENT ON COLUMN course_enrollments.waitlist_position IS '等待列表位置，从1开始，越小越优先';

