-- 课程系统重构迁移脚本
-- 从层级模型迁移到 Assignment 模型（方案A）

-- ==================== 第一步：创建新表 ====================

-- 1. 创建课程-子类标签关联表（多对多）
CREATE TABLE IF NOT EXISTS course_subcategory_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  subcategory_id UUID NOT NULL REFERENCES course_subcategories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id, subcategory_id)
);

-- 2. 创建课程分配表（核心多对多关系）
CREATE TABLE IF NOT EXISTS course_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES course_categories(id) ON DELETE CASCADE,
  series_id UUID NOT NULL REFERENCES course_series(id) ON DELETE CASCADE,
  location_id UUID REFERENCES course_locations(id) ON DELETE SET NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id, category_id, series_id, location_id)
);

-- 3. 创建临时表用于存储旧数据（必须在删除表之前）
-- 备份 course_subcategories（在删除之前）
DROP TABLE IF EXISTS course_subcategories_backup CASCADE;
CREATE TABLE course_subcategories_backup AS
SELECT * FROM course_subcategories;

-- 备份 course_instances
DROP TABLE IF EXISTS course_instances_backup CASCADE;
CREATE TABLE course_instances_backup AS
SELECT * FROM course_instances;

-- 备份 courses（保存 subcategory_id 用于迁移）
DROP TABLE IF EXISTS courses_backup CASCADE;
CREATE TABLE courses_backup AS
SELECT * FROM courses;

-- ==================== 第二步：修改现有表 ====================

-- 1. 修改 course_subcategories 表（移除 series_id，改为独立标签）
-- 先创建新表
CREATE TABLE IF NOT EXISTS course_subcategories_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 迁移数据（去重，因为可能有多个 series 有相同的 subcategory）
INSERT INTO course_subcategories_new (id, name, display_name, description, display_order, is_active, created_at, updated_at)
SELECT DISTINCT ON (name)
  id,
  name,
  display_name,
  description,
  display_order,
  is_active,
  created_at,
  updated_at
FROM course_subcategories_backup
ORDER BY name, created_at;

-- 删除旧表并重命名
DROP TABLE IF EXISTS course_subcategories CASCADE;
ALTER TABLE course_subcategories_new RENAME TO course_subcategories;

-- 2. 修改 courses 表（移除 subcategory_id）
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_subcategory_id_fkey;
ALTER TABLE courses DROP COLUMN IF EXISTS subcategory_id;

-- 3. 修改 course_instances 表（添加 assignment_id，移除 course_id）
ALTER TABLE course_instances ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES course_assignments(id) ON DELETE CASCADE;
ALTER TABLE course_instances DROP CONSTRAINT IF EXISTS course_instances_course_id_fkey;
ALTER TABLE course_instances DROP COLUMN IF EXISTS course_id;

-- 添加 days_of_week 字段（如果不存在）
ALTER TABLE course_instances ADD COLUMN IF NOT EXISTS days_of_week INTEGER[];

-- 修改 price 字段名为 price_override
ALTER TABLE course_instances RENAME COLUMN price TO price_override;

-- ==================== 第三步：迁移数据 ====================

-- 1. 创建 course_subcategory_tags（基于旧的 subcategory_id）
-- 从备份的 courses 表中获取 subcategory_id，创建标签关联
INSERT INTO course_subcategory_tags (course_id, subcategory_id)
SELECT DISTINCT
  c.id as course_id,
  c.subcategory_id as subcategory_id
FROM courses_backup c
WHERE c.subcategory_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM course_subcategory_tags cst
    WHERE cst.course_id = c.id
      AND cst.subcategory_id = c.subcategory_id
  );

-- 2. 创建 course_assignments（基于旧的层级关系）
-- 从 courses -> subcategories -> series -> categories 创建 assignments
INSERT INTO course_assignments (course_id, category_id, series_id, location_id, display_order, is_active, created_at, updated_at)
SELECT DISTINCT
  c.id as course_id,
  cc.id as category_id,
  cs.id as series_id,
  ci.location_id,
  c.display_order,
  c.is_active,
  c.created_at,
  c.updated_at
FROM courses_backup c
JOIN course_subcategories_backup csc ON c.subcategory_id = csc.id
JOIN course_series cs ON csc.series_id = cs.id
JOIN course_categories cc ON cs.category_id = cc.id
LEFT JOIN course_instances_backup ci ON c.id = ci.course_id
WHERE NOT EXISTS (
  SELECT 1 FROM course_assignments ca
  WHERE ca.course_id = c.id
    AND ca.category_id = cc.id
    AND ca.series_id = cs.id
    AND (ca.location_id = ci.location_id OR (ca.location_id IS NULL AND ci.location_id IS NULL))
);

-- 3. 更新 course_instances 的 assignment_id
-- 需要匹配 course_id, location_id 来找到对应的 assignment
UPDATE course_instances ci
SET assignment_id = ca.id
FROM course_instances_backup cib
JOIN course_assignments ca ON ca.course_id = cib.course_id
WHERE ci.id = cib.id
  AND ci.assignment_id IS NULL
  AND (ca.location_id = cib.location_id OR (ca.location_id IS NULL AND cib.location_id IS NULL));

-- 如果还有未匹配的实例（可能因为 location 不匹配），尝试匹配 course_id（忽略 location）
UPDATE course_instances ci
SET assignment_id = (
  SELECT ca.id
  FROM course_instances_backup cib
  JOIN course_assignments ca ON ca.course_id = cib.course_id
  WHERE ci.id = cib.id
    AND ci.assignment_id IS NULL
  LIMIT 1
)
WHERE ci.assignment_id IS NULL
  AND EXISTS (
    SELECT 1 FROM course_instances_backup cib
    WHERE ci.id = cib.id
  );

-- ==================== 第四步：创建索引 ====================

CREATE INDEX IF NOT EXISTS idx_course_subcategory_tags_course_id ON course_subcategory_tags(course_id);
CREATE INDEX IF NOT EXISTS idx_course_subcategory_tags_subcategory_id ON course_subcategory_tags(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_course_assignments_course_id ON course_assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_assignments_category_id ON course_assignments(category_id);
CREATE INDEX IF NOT EXISTS idx_course_assignments_series_id ON course_assignments(series_id);
CREATE INDEX IF NOT EXISTS idx_course_assignments_location_id ON course_assignments(location_id);
CREATE INDEX IF NOT EXISTS idx_course_instances_assignment_id ON course_instances(assignment_id);

-- ==================== 第五步：创建 RLS 策略 ====================

-- 启用 RLS
ALTER TABLE course_subcategory_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_assignments ENABLE ROW LEVEL SECURITY;

-- course_subcategory_tags 策略
CREATE POLICY "Allow all operations on course_subcategory_tags" ON course_subcategory_tags
  FOR ALL USING (true) WITH CHECK (true);

-- course_assignments 策略
CREATE POLICY "Allow all operations on course_assignments" ON course_assignments
  FOR ALL USING (true) WITH CHECK (true);

-- ==================== 第六步：创建触发器 ====================

-- 更新 course_assignments 的 updated_at
CREATE OR REPLACE FUNCTION update_course_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_course_assignments_updated_at
  BEFORE UPDATE ON course_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_course_assignments_updated_at();

-- ==================== 第七步：添加触发器验证 ====================

-- 创建函数：验证 series 是否属于指定的 category
CREATE OR REPLACE FUNCTION validate_series_belongs_to_category()
RETURNS TRIGGER AS $$
BEGIN
  -- 检查 series 是否属于指定的 category
  IF NOT EXISTS (
    SELECT 1 FROM course_series cs
    WHERE cs.id = NEW.series_id
      AND cs.category_id = NEW.category_id
  ) THEN
    RAISE EXCEPTION 'Series % does not belong to category %', NEW.series_id, NEW.category_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器：在插入或更新时验证
CREATE TRIGGER validate_assignment_series_category
  BEFORE INSERT OR UPDATE ON course_assignments
  FOR EACH ROW
  EXECUTE FUNCTION validate_series_belongs_to_category();

-- ==================== 第八步：清理临时表 ====================

-- 在确认数据迁移成功后，可以删除备份表
-- DROP TABLE IF EXISTS course_subcategories_backup;
-- DROP TABLE IF EXISTS course_instances_backup;

