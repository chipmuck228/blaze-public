-- 添加 featured categories 相关字段
ALTER TABLE course_categories 
ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS poster_url TEXT,
ADD COLUMN IF NOT EXISTS featured_display_order INTEGER DEFAULT 0;

-- 添加索引优化查询
CREATE INDEX IF NOT EXISTS idx_categories_featured 
ON course_categories(featured, is_active, featured_display_order) 
WHERE featured = TRUE AND is_active = TRUE;

-- 添加注释
COMMENT ON COLUMN course_categories.featured IS 'Whether this category is featured in the hero section';
COMMENT ON COLUMN course_categories.poster_url IS 'Poster image URL for featured display';
COMMENT ON COLUMN course_categories.featured_display_order IS 'Display order in hero section (lower number = higher priority)';
