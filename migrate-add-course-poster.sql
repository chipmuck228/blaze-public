-- 为 courses 表添加招贴画字段
-- 用于存储课程招贴画的 URL（存储在 Vercel Blob）

ALTER TABLE courses
ADD COLUMN IF NOT EXISTS poster_url TEXT;

-- 添加注释
COMMENT ON COLUMN courses.poster_url IS 'URL of the course poster image stored in Vercel Blob';

