-- 添加 featured slogan 相关字段
ALTER TABLE course_categories
ADD COLUMN IF NOT EXISTS featured_slogan TEXT,
ADD COLUMN IF NOT EXISTS featured_subtitle TEXT;

-- 添加注释
COMMENT ON COLUMN course_categories.featured_slogan IS 'Main slogan for featured category display in hero section';
COMMENT ON COLUMN course_categories.featured_subtitle IS 'Subtitle for featured category display in hero section';
