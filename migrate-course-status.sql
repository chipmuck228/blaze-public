-- 课程状态管理迁移脚本
-- 将 is_active 布尔值替换为 status 枚举类型，支持更细粒度的状态管理

-- ==================== 第一步：创建状态枚举类型 ====================

-- 创建课程状态枚举类型
CREATE TYPE course_status AS ENUM (
  'draft',        -- 草稿：课程正在设计中，尚未完成，不能分配
  'published',    -- 已发布：课程已完成设计，可以分配和上架
  'suspended',    -- 暂停：临时下架，已有实例不受影响，但不能再创建新实例
  'archived'      -- 已归档：课程不再使用，保留历史记录，不可见
);

-- ==================== 第二步：修改 courses 表 ====================

-- 添加新的 status 列（默认值为 'draft'）
ALTER TABLE courses 
  ADD COLUMN IF NOT EXISTS status course_status DEFAULT 'draft';

-- 将现有的 is_active 数据迁移到 status
-- is_active = TRUE -> 'published'
-- is_active = FALSE -> 'archived'
UPDATE courses 
SET status = CASE 
  WHEN is_active = TRUE THEN 'published'::course_status
  WHEN is_active = FALSE THEN 'archived'::course_status
  ELSE 'draft'::course_status
END;

-- 将 status 设置为 NOT NULL（在数据迁移后）
ALTER TABLE courses 
  ALTER COLUMN status SET NOT NULL;

-- 创建 status 索引（替代 is_active 索引）
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);

-- 删除旧的 is_active 列（可选，建议先保留一段时间以便回滚）
-- ALTER TABLE courses DROP COLUMN IF EXISTS is_active;

-- ==================== 第三步：更新 RLS 策略 ====================

-- 删除旧的 RLS 策略（基于 is_active）
DROP POLICY IF EXISTS "Anyone can view courses" ON courses;

-- 创建新的 RLS 策略（基于 status）
-- 只允许查看 published 状态的课程
CREATE POLICY "Anyone can view published courses" ON courses
  FOR SELECT USING (status = 'published');

-- 管理员可以查看所有状态的课程
CREATE POLICY "Admin can view all courses" ON courses
  FOR SELECT USING (auth.role() = 'admin');

-- ==================== 第四步：添加约束和验证 ====================

-- 添加 CHECK 约束确保 status 值有效（虽然枚举类型已经保证，但这是额外保障）
-- 注意：PostgreSQL 的枚举类型已经提供了类型安全，这个 CHECK 是可选的

-- ==================== 第五步：创建辅助函数 ====================

-- 创建函数：检查课程是否可以分配（只有 published 状态可以）
CREATE OR REPLACE FUNCTION can_assign_course(course_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM courses 
    WHERE id = course_id 
    AND status = 'published'
  );
END;
$$ LANGUAGE plpgsql;

-- 创建函数：检查课程是否可见（published 状态可见）
CREATE OR REPLACE FUNCTION is_course_visible(course_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM courses 
    WHERE id = course_id 
    AND status = 'published'
  );
END;
$$ LANGUAGE plpgsql;

-- ==================== 第六步：更新相关查询 ====================

-- 注意：以下查询需要在前端代码中更新：
-- 1. 所有使用 is_active = TRUE 的查询应改为 status = 'published'
-- 2. 所有使用 is_active = FALSE 的查询应改为 status = 'archived' 或 status != 'published'
-- 3. 在创建 course_assignment 时，应检查课程状态是否为 'published'

-- ==================== 回滚脚本（如果需要） ====================

-- 如果需要回滚，执行以下操作：
-- 1. ALTER TABLE courses DROP COLUMN IF EXISTS status;
-- 2. DROP TYPE IF EXISTS course_status;
-- 3. ALTER TABLE courses ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
-- 4. UPDATE courses SET is_active = (status = 'published');
-- 5. 恢复旧的 RLS 策略

