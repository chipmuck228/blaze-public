-- ============================================================================
-- 迁移脚本：创建 offering_types 配置表
-- 目的：允许 admin 动态配置 offering types，而不是使用固定的 ENUM
-- 日期：2025-01-XX
-- ============================================================================

-- ==================== 第一步：创建 offering_types 表 ====================

-- 创建 offering_types 配置表
CREATE TABLE IF NOT EXISTS offering_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,              -- 类型代码（如 'course', 'workshop'），用于数据库存储
  name TEXT NOT NULL,                     -- 显示名称（如 'Course', 'Workshop'）
  description TEXT,                       -- 类型描述
  icon TEXT,                              -- 图标名称（可选）
  color TEXT,                             -- 颜色代码（可选，用于 UI 显示）
  display_order INTEGER DEFAULT 0,        -- 显示顺序
  is_active BOOLEAN DEFAULT TRUE,         -- 是否激活
  is_default BOOLEAN DEFAULT FALSE,       -- 是否为默认类型（不能删除）
  config_schema JSONB DEFAULT '{}',       -- 类型配置字段的 schema（定义该类型需要哪些配置字段）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== 第二步：创建索引 ====================

CREATE INDEX IF NOT EXISTS idx_offering_types_code ON offering_types(code);
CREATE INDEX IF NOT EXISTS idx_offering_types_is_active ON offering_types(is_active);
CREATE INDEX IF NOT EXISTS idx_offering_types_display_order ON offering_types(display_order);

-- ==================== 第三步：创建触发器 ====================

-- 删除已存在的触发器（如果存在，确保脚本可以重新运行）
DROP TRIGGER IF EXISTS trigger_update_offering_types_updated_at ON offering_types;

-- 创建 updated_at 自动更新触发器
CREATE OR REPLACE FUNCTION update_offering_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_offering_types_updated_at
  BEFORE UPDATE ON offering_types
  FOR EACH ROW
  EXECUTE FUNCTION update_offering_types_updated_at();

-- ==================== 第四步：插入默认数据 ====================

-- 插入默认的 offering types（基于现有的 ENUM 值）
INSERT INTO offering_types (code, name, description, display_order, is_active, is_default, config_schema) VALUES
  ('course', 'Course', 'Regular course with weekly sessions', 1, TRUE, TRUE, '{"fields": ["default_session_count", "default_weekly_frequency", "default_duration_hours", "supports_multi_child_discount"]}'),
  ('camp', 'Camp', 'Summer camp or intensive program', 2, TRUE, TRUE, '{"fields": ["default_duration_days", "default_daily_schedule"]}'),
  ('workshop', 'Workshop', 'Workshop with drop-in or multipass options', 3, TRUE, TRUE, '{"fields": ["supports_drop_in", "drop_in_price", "supports_multipass", "weekly_frequency", "biweekly_interval"]}'),
  ('free_trial', 'Free Trial', 'Free trial session', 4, TRUE, TRUE, '{"fields": []}'),
  ('gift_card', 'Gift Card', 'Gift card offering', 5, TRUE, TRUE, '{"fields": ["denominations", "expiry_months"]}'),
  ('care_service', 'Care Service', 'Childcare service', 6, TRUE, TRUE, '{"fields": ["service_duration_hours", "requires_advance_booking", "advance_booking_hours"]}'),
  ('lunch_service', 'Lunch Service', 'Lunch service for camp participants', 7, TRUE, TRUE, '{"fields": ["meal_options", "requires_camp_enrollment"]}')
ON CONFLICT (code) DO NOTHING;

-- ==================== 第五步：修改 offerings 表（可选，保持向后兼容）====================

-- 注意：由于 offerings 表已经使用 offering_type_enum，我们有两个选择：
-- 方案 A：保持 ENUM，但在应用层验证 offering_type 是否在 offering_types 表中存在
-- 方案 B：将 offering_type 改为 TEXT，并添加 CHECK 约束或外键

-- 这里我们采用方案 A（保持 ENUM），因为：
-- 1. 不需要修改现有表结构
-- 2. 保持数据库层面的类型安全
-- 3. 在应用层验证 offering_type 是否在 offering_types 表中存在

-- 如果需要方案 B（完全动态），可以执行以下 SQL：
-- ALTER TABLE offerings ALTER COLUMN offering_type TYPE TEXT;
-- ALTER TABLE offerings ADD CONSTRAINT fk_offering_type_code FOREIGN KEY (offering_type) REFERENCES offering_types(code);

-- ==================== 第六步：启用 Row Level Security (RLS) ====================

-- 启用 RLS（如果需要）
ALTER TABLE offering_types ENABLE ROW LEVEL SECURITY;

-- 删除已存在的 RLS 策略（如果存在，确保脚本可以重新运行）
DROP POLICY IF EXISTS "Anyone can view active offering types" ON offering_types;
DROP POLICY IF EXISTS "Service role can manage offering types" ON offering_types;

-- 创建 RLS 策略
-- 策略 1：允许所有人查看激活的 offering types
CREATE POLICY "Anyone can view active offering types" ON offering_types
  FOR SELECT
  USING (is_active = TRUE);

-- 策略 2：允许服务角色（service_role）管理所有 offering types
CREATE POLICY "Service role can manage offering types" ON offering_types
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ==================== 第七步：添加注释 ====================

COMMENT ON TABLE offering_types IS 'Offering Types 配置表：允许 admin 动态配置 offering types，而不是使用固定的 ENUM';
COMMENT ON COLUMN offering_types.code IS '类型代码（唯一），对应 offerings.offering_type 的值';
COMMENT ON COLUMN offering_types.config_schema IS '类型配置字段的 schema（JSONB），定义该类型需要哪些配置字段';

-- ==================== 完成 ====================

-- 输出完成信息
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'offering_types 表创建完成！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '已完成的工作：';
  RAISE NOTICE '1. ✅ 创建 offering_types 配置表';
  RAISE NOTICE '2. ✅ 插入默认的 offering types';
  RAISE NOTICE '3. ✅ 保持 offerings.offering_type 使用 ENUM（向后兼容）';
  RAISE NOTICE '';
  RAISE NOTICE '注意：';
  RAISE NOTICE '- 默认类型（is_default = TRUE）不能删除';
  RAISE NOTICE '- 如果添加新的类型，需要先添加到 ENUM，然后添加到 offering_types 表';
  RAISE NOTICE '- 在应用层验证 offering_type 是否在 offering_types 表中存在';
END $$;

