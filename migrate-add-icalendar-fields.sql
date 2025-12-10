-- 为 course_instances 表添加 iCalendar (RFC5545) 支持字段
-- 支持例外日期（跳过、改期）功能

-- ==================== 第一步：添加 iCalendar 字段 ====================

-- 添加 RRULE 字段（重复规则）
ALTER TABLE course_instances ADD COLUMN IF NOT EXISTS icalendar_rrule TEXT;

-- 添加排除日期字段（EXDATE - 跳过的日期）
ALTER TABLE course_instances ADD COLUMN IF NOT EXISTS icalendar_exdates TEXT[];

-- 添加额外日期字段（RDATE - 改期的日期）
ALTER TABLE course_instances ADD COLUMN IF NOT EXISTS icalendar_rdates TEXT[];

-- 添加时区字段
ALTER TABLE course_instances ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Los_Angeles';

-- ==================== 第二步：创建索引 ====================

CREATE INDEX IF NOT EXISTS idx_course_instances_timezone ON course_instances(timezone);

-- ==================== 第三步：创建例外日期管理表（可选，用于更详细的管理） ====================

CREATE TABLE IF NOT EXISTS course_instance_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES course_instances(id) ON DELETE CASCADE,
  exception_type TEXT NOT NULL CHECK (exception_type IN ('skip', 'reschedule', 'time_change')),
  original_date DATE NOT NULL,  -- 原定日期
  new_date DATE,                 -- 改期后的日期（如果是 reschedule）
  new_start_time TIME,           -- 改期后的开始时间（如果是 time_change）
  new_end_time TIME,             -- 改期后的结束时间（如果是 time_change）
  reason TEXT,                   -- 原因（如 "法定节假日"）
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(instance_id, original_date)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_course_instance_exceptions_instance_id ON course_instance_exceptions(instance_id);
CREATE INDEX IF NOT EXISTS idx_course_instance_exceptions_original_date ON course_instance_exceptions(original_date);
CREATE INDEX IF NOT EXISTS idx_course_instance_exceptions_new_date ON course_instance_exceptions(new_date);
CREATE INDEX IF NOT EXISTS idx_course_instance_exceptions_type ON course_instance_exceptions(exception_type);

-- 创建更新时间戳触发器
CREATE OR REPLACE FUNCTION update_course_instance_exceptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_course_instance_exceptions_updated_at
  BEFORE UPDATE ON course_instance_exceptions
  FOR EACH ROW
  EXECUTE FUNCTION update_course_instance_exceptions_updated_at();

-- ==================== 第四步：启用 RLS（如果需要） ====================

ALTER TABLE course_instance_exceptions ENABLE ROW LEVEL SECURITY;

-- 允许所有操作（因为 API 路由已经检查了管理员权限）
CREATE POLICY "Allow all operations on course_instance_exceptions" ON course_instance_exceptions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ==================== 第五步：添加注释 ====================

COMMENT ON COLUMN course_instances.icalendar_rrule IS 'iCalendar RRULE string for recurrence pattern (e.g., FREQ=WEEKLY;BYDAY=TU)';
COMMENT ON COLUMN course_instances.icalendar_exdates IS 'Array of excluded dates in YYYYMMDD format (e.g., ["20250121"])';
COMMENT ON COLUMN course_instances.icalendar_rdates IS 'Array of additional dates in YYYYMMDDTHHMMSS format (e.g., ["20250219T090000"])';
COMMENT ON COLUMN course_instances.timezone IS 'Timezone identifier (e.g., America/Los_Angeles)';

