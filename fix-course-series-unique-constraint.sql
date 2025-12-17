-- =========================================================
-- fix-course-series-unique-constraint.sql
-- 修复 course_series 表的唯一约束，支持多 franchise 架构
-- =========================================================
--
-- 问题：
-- 当前约束：UNIQUE(category_id, name)
-- 这意味着：同一 category 下的 name 必须唯一（跨所有 franchise）
--
-- 需求：
-- 同一 franchise 下的 programs 名字必须不同
-- 不同 franchise 下的 programs 名字可以相同
--
-- 解决方案：
-- 将唯一约束改为：UNIQUE(franchise_id, category_id, name)
-- 这样，不同 franchise 可以有相同名字的 program（只要 category 和 name 相同）
--
-- =========================================================

BEGIN;

-- 1. 删除旧的唯一约束
ALTER TABLE course_series
  DROP CONSTRAINT IF EXISTS course_series_category_id_name_key;

-- 2. 添加新的唯一约束（包含 franchise_id）
-- 注意：如果 franchise_id 为 NULL，PostgreSQL 会将其视为不同的值
-- 因此，如果 franchise_id 为 NULL，仍然可以创建多个相同 (category_id, name) 的记录
-- 如果需要确保 franchise_id 不为 NULL，可以添加 NOT NULL 约束
ALTER TABLE course_series
  ADD CONSTRAINT course_series_franchise_category_name_key
  UNIQUE(franchise_id, category_id, name);

-- 3. 可选：如果希望 franchise_id 不能为 NULL（推荐）
-- 这样可以确保每个 series 都明确属于一个 franchise
-- 取消下面的注释以启用：
--
-- ALTER TABLE course_series
--   ALTER COLUMN franchise_id SET NOT NULL;

-- 4. 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_course_series_franchise_category_name
  ON course_series(franchise_id, category_id, name);

COMMIT;

-- =========================================================
-- 验证脚本
-- =========================================================
--
-- 验证新约束是否生效：
--
-- -- 测试 1：同一 franchise，同一 category，不同 name（应该成功）
-- INSERT INTO course_series (category_id, franchise_id, name, display_name)
-- VALUES 
--   ('category-uuid', 'franchise-uuid', 'winter-2025', 'Winter 2025'),
--   ('category-uuid', 'franchise-uuid', 'spring-2025', 'Spring 2025');
-- -- ✅ 应该成功
--
-- -- 测试 2：同一 franchise，同一 category，相同 name（应该失败）
-- INSERT INTO course_series (category_id, franchise_id, name, display_name)
-- VALUES 
--   ('category-uuid', 'franchise-uuid', 'winter-2025', 'Winter 2025');
-- -- ❌ 应该失败：duplicate key
--
-- -- 测试 3：不同 franchise，同一 category，相同 name（应该成功）
-- INSERT INTO course_series (category_id, franchise_id, name, display_name)
-- VALUES 
--   ('category-uuid', 'franchise-1-uuid', 'winter-2025', 'Winter 2025'),
--   ('category-uuid', 'franchise-2-uuid', 'winter-2025', 'Winter 2025');
-- -- ✅ 应该成功：不同 franchise 可以有相同名字
--
-- =========================================================

