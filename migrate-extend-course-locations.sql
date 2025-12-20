-- =========================================================
-- migrate-extend-course-locations.sql
-- 扩展 course_locations 表以支持更详细的 campus 信息（阶段2）
-- =========================================================

-- 说明：
-- 1. 为 course_locations 表添加新字段：description, phone, email, parking_info, check_in_info, amenities
-- 2. 这些字段用于在 franchise 页面显示更详细的 campus 信息

-- =========================================================
-- 1. 扩展 course_locations 表
-- =========================================================

ALTER TABLE course_locations 
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS parking_info TEXT,
  ADD COLUMN IF NOT EXISTS check_in_info TEXT,
  ADD COLUMN IF NOT EXISTS amenities JSONB;

-- =========================================================
-- 2. 添加注释（可选）
-- =========================================================

COMMENT ON COLUMN course_locations.description IS 'Campus description and overview';
COMMENT ON COLUMN course_locations.phone IS 'Campus contact phone number';
COMMENT ON COLUMN course_locations.email IS 'Campus contact email address';
COMMENT ON COLUMN course_locations.parking_info IS 'Parking information and instructions';
COMMENT ON COLUMN course_locations.check_in_info IS 'Check-in procedures and information';
COMMENT ON COLUMN course_locations.amenities IS 'Campus amenities (JSONB): {"parking": "...", "wifi": "...", "accessibility": "..."}';

-- =========================================================
-- 3. 验证更新结果（可选，执行时可取消注释）
-- =========================================================

-- 查看表结构
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'course_locations'
-- ORDER BY ordinal_position;

