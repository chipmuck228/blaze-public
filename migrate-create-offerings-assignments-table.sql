-- ============================================================================
-- 迁移脚本：创建 offerings_assignments 表并迁移数据
-- 目的：创建新的 offerings_assignments 表支持 offerings，保持 course_assignments 表不变（向后兼容）
-- 日期：2025-01-XX
-- ============================================================================

-- ==================== 第一步：创建 offerings_assignments 表 ====================

-- 创建 offerings_assignments 表（对应 course_assignments，但引用 offerings 表）
CREATE TABLE IF NOT EXISTS offerings_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id UUID NOT NULL REFERENCES offerings(id) ON DELETE CASCADE,  -- 关联到 offerings 表
  category_id UUID NOT NULL REFERENCES course_categories(id) ON DELETE CASCADE,
  series_id UUID NOT NULL REFERENCES course_series(id) ON DELETE CASCADE,
  location_id UUID REFERENCES course_locations(id) ON DELETE SET NULL,
  display_order INTEGER DEFAULT 0,      -- 在该 Series 中的显示顺序
  is_active BOOLEAN DEFAULT TRUE,        -- 该分配是否激活
  assignment_config JSONB DEFAULT '{}',  -- Assignment 级别的类型特定配置（JSONB）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(offering_id, category_id, series_id, location_id)  -- 防止重复分配
);

-- ==================== 第二步：创建索引 ====================

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_offerings_assignments_offering_id ON offerings_assignments(offering_id);
CREATE INDEX IF NOT EXISTS idx_offerings_assignments_category_id ON offerings_assignments(category_id);
CREATE INDEX IF NOT EXISTS idx_offerings_assignments_series_id ON offerings_assignments(series_id);
CREATE INDEX IF NOT EXISTS idx_offerings_assignments_location_id ON offerings_assignments(location_id);
CREATE INDEX IF NOT EXISTS idx_offerings_assignments_is_active ON offerings_assignments(is_active);

-- 为 JSONB 字段创建 GIN 索引（用于高效查询 assignment_config）
CREATE INDEX IF NOT EXISTS idx_offerings_assignments_assignment_config ON offerings_assignments USING GIN (assignment_config);

-- ==================== 第三步：创建触发器 ====================

-- 删除已存在的触发器（如果存在，确保脚本可以重新运行）
DROP TRIGGER IF EXISTS trigger_update_offerings_assignments_updated_at ON offerings_assignments;

-- 创建 updated_at 自动更新触发器
CREATE OR REPLACE FUNCTION update_offerings_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_offerings_assignments_updated_at
  BEFORE UPDATE ON offerings_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_offerings_assignments_updated_at();

-- ==================== 第四步：迁移数据 ====================

-- 从 course_assignments 表迁移数据到 offerings_assignments 表
-- 通过 course_id 找到对应的 offering_id（因为 offerings 表的数据是从 courses 表迁移的，id 相同）
INSERT INTO offerings_assignments (
  offering_id,
  category_id,
  series_id,
  location_id,
  display_order,
  is_active,
  assignment_config,
  created_at,
  updated_at
)
SELECT DISTINCT
  ca.course_id AS offering_id,  -- course_id 和 offering_id 相同（因为数据是从 courses 迁移的）
  ca.category_id,
  ca.series_id,
  ca.location_id,
  ca.display_order,
  ca.is_active,
  '{}'::JSONB AS assignment_config,  -- 初始化为空 JSON 对象
  ca.created_at,
  ca.updated_at
FROM course_assignments ca
WHERE ca.course_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM offerings o WHERE o.id = ca.course_id
  )
ON CONFLICT (offering_id, category_id, series_id, location_id) DO NOTHING;  -- 如果已存在，跳过

-- ==================== 第五步：启用 Row Level Security (RLS) ====================

-- 启用 RLS（如果需要）
ALTER TABLE offerings_assignments ENABLE ROW LEVEL SECURITY;

-- 删除已存在的 RLS 策略（如果存在，确保脚本可以重新运行）
DROP POLICY IF EXISTS "Anyone can view published offerings assignments" ON offerings_assignments;
DROP POLICY IF EXISTS "Service role can manage offerings assignments" ON offerings_assignments;

-- 创建 RLS 策略
-- 策略 1：允许所有人查看已发布的 offerings assignments
CREATE POLICY "Anyone can view published offerings assignments" ON offerings_assignments
  FOR SELECT
  USING (
    is_active = TRUE
    AND EXISTS (
      SELECT 1 FROM offerings o 
      WHERE o.id = offerings_assignments.offering_id 
        AND o.status = 'published'
    )
  );

-- 策略 2：允许服务角色（service_role）管理所有 offerings assignments
CREATE POLICY "Service role can manage offerings assignments" ON offerings_assignments
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ==================== 第六步：创建关联表（可选，用于双向同步）====================

-- 创建关联表，用于记录 course_assignments 和 offerings_assignments 之间的对应关系
-- 这样可以保持两个表的同步（如果需要）
CREATE TABLE IF NOT EXISTS assignment_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_assignment_id UUID NOT NULL REFERENCES course_assignments(id) ON DELETE CASCADE,
  offering_assignment_id UUID NOT NULL REFERENCES offerings_assignments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_assignment_id, offering_assignment_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_assignment_mapping_course_assignment_id ON assignment_mapping(course_assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_mapping_offering_assignment_id ON assignment_mapping(offering_assignment_id);

-- 填充关联表数据
INSERT INTO assignment_mapping (course_assignment_id, offering_assignment_id)
SELECT 
  ca.id AS course_assignment_id,
  oa.id AS offering_assignment_id
FROM course_assignments ca
JOIN offerings_assignments oa ON (
  ca.course_id = oa.offering_id
  AND ca.category_id = oa.category_id
  AND ca.series_id = oa.series_id
  AND (ca.location_id = oa.location_id OR (ca.location_id IS NULL AND oa.location_id IS NULL))
)
ON CONFLICT (course_assignment_id, offering_assignment_id) DO NOTHING;

-- ==================== 第七步：数据验证 ====================

-- 验证数据迁移是否成功
DO $$
DECLARE
  course_assignments_count INTEGER;
  offerings_assignments_count INTEGER;
  mapping_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO course_assignments_count FROM course_assignments;
  SELECT COUNT(*) INTO offerings_assignments_count FROM offerings_assignments;
  SELECT COUNT(*) INTO mapping_count FROM assignment_mapping;
  
  RAISE NOTICE '数据迁移统计：';
  RAISE NOTICE '- course_assignments 表：% 条记录', course_assignments_count;
  RAISE NOTICE '- offerings_assignments 表：% 条记录', offerings_assignments_count;
  RAISE NOTICE '- assignment_mapping 关联表：% 条记录', mapping_count;
  
  IF course_assignments_count = 0 THEN
    RAISE WARNING 'course_assignments 表中没有数据';
  ELSIF offerings_assignments_count = course_assignments_count THEN
    RAISE NOTICE '✅ 数据迁移成功：所有 course_assignments 记录都已迁移到 offerings_assignments';
  ELSE
    RAISE WARNING '⚠️ 数据迁移可能不完整：course_assignments 有 % 条，offerings_assignments 有 % 条', 
      course_assignments_count, offerings_assignments_count;
  END IF;
END $$;

-- ==================== 第八步：添加注释 ====================

-- 添加表注释
COMMENT ON TABLE offerings_assignments IS 'Offerings 分配表：支持多种类型的 offering 分配到 Category + Series + Location，对应 course_assignments 表';
COMMENT ON TABLE assignment_mapping IS 'Assignment 映射表：记录 course_assignments 和 offerings_assignments 之间的对应关系，用于保持同步';

-- 添加字段注释
COMMENT ON COLUMN offerings_assignments.offering_id IS '关联到 offerings 表（新表）';
COMMENT ON COLUMN offerings_assignments.assignment_config IS 'Assignment 级别的类型特定配置（JSONB），可以覆盖 offering 的默认配置';

-- ==================== 完成 ====================

-- 输出完成信息
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'offerings_assignments 表创建完成！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '已完成的工作：';
  RAISE NOTICE '1. ✅ 创建 offerings_assignments 表';
  RAISE NOTICE '2. ✅ 从 course_assignments 迁移数据';
  RAISE NOTICE '3. ✅ 创建 assignment_mapping 关联表';
  RAISE NOTICE '4. ✅ course_assignments 表保持不变（向后兼容）';
  RAISE NOTICE '';
  RAISE NOTICE '表结构说明：';
  RAISE NOTICE '- course_assignments: 引用 courses 表（旧表，保持不变）';
  RAISE NOTICE '- offerings_assignments: 引用 offerings 表（新表，支持多类型）';
  RAISE NOTICE '- assignment_mapping: 记录两个表之间的对应关系';
  RAISE NOTICE '';
  RAISE NOTICE '下一步：';
  RAISE NOTICE '1. 逐步更新应用代码，使用 offerings_assignments 表';
  RAISE NOTICE '2. 旧代码仍可使用 course_assignments 表（向后兼容）';
  RAISE NOTICE '3. 新创建的 assignment 应该使用 offerings_assignments 表';
  RAISE NOTICE '4. 考虑创建视图或函数统一查询两个表（如果需要）';
END $$;

