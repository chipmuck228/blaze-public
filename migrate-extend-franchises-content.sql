-- =========================================================
-- migrate-extend-franchises-content.sql
-- 扩展 franchises 表以支持页面内容管理（阶段1）
-- =========================================================

-- 说明：
-- 1. 为现有 franchises 添加默认 branding_config
-- 2. 定义标准 JSON 结构，包含 hero、contact、social、highlights、branding、seo

-- =========================================================
-- 1. 为现有 franchises 添加默认 branding_config（如果为空）
-- =========================================================

UPDATE franchises
SET branding_config = jsonb_build_object(
  'hero', jsonb_build_object(
    'title', name,
    'description', 'Local robotics, coding, and engineering programs for students in the ' || 
                   CASE 
                     WHEN code = 'bellevue' THEN 'Bellevue'
                     WHEN code = 'belred' THEN 'Bel-Red'
                     WHEN code = 'issaquah' THEN 'Issaquah'
                     WHEN code = 'cherrycrest' THEN 'Cherry Crest'
                     ELSE INITCAP(REPLACE(code, '_', ' '))
                   END || ' area.'
  ),
  'highlights', jsonb_build_object(
    'programs', 'Age-appropriate robotics, coding, and STEM programs designed for local students.',
    'schedule', 'After-school and weekend offerings during the school year, plus camps during breaks.',
    'focus', 'Hands-on learning, teamwork, and preparing students for real-world robotics challenges.'
  ),
  'contact', jsonb_build_object(
    'email', NULL,
    'phone', NULL,
    'address', NULL,
    'businessHours', jsonb_build_object(
      'monday', '9:00 AM - 6:00 PM',
      'tuesday', '9:00 AM - 6:00 PM',
      'wednesday', '9:00 AM - 6:00 PM',
      'thursday', '9:00 AM - 6:00 PM',
      'friday', '9:00 AM - 6:00 PM',
      'saturday', '10:00 AM - 4:00 PM',
      'sunday', 'Closed'
    )
  ),
  'social', jsonb_build_object(
    'facebook', NULL,
    'instagram', NULL,
    'twitter', NULL,
    'youtube', NULL
  ),
  'branding', jsonb_build_object(
    'logoUrl', NULL,
    'primaryColor', NULL,
    'secondaryColor', NULL,
    'accentColor', NULL
  ),
  'seo', jsonb_build_object(
    'title', name || ' | Blaze Robotics Academy',
    'description', 'Join ' || name || ' for hands-on robotics and coding programs designed for students in the ' ||
                   CASE 
                     WHEN code = 'bellevue' THEN 'Bellevue'
                     WHEN code = 'belred' THEN 'Bel-Red'
                     WHEN code = 'issaquah' THEN 'Issaquah'
                     WHEN code = 'cherrycrest' THEN 'Cherry Crest'
                     ELSE INITCAP(REPLACE(code, '_', ' '))
                   END || ' area.',
    'keywords', 'robotics, coding, ' || 
                CASE 
                  WHEN code = 'bellevue' THEN 'Bellevue'
                  WHEN code = 'belred' THEN 'Bel-Red'
                  WHEN code = 'issaquah' THEN 'Issaquah'
                  WHEN code = 'cherrycrest' THEN 'Cherry Crest'
                  ELSE INITCAP(REPLACE(code, '_', ' '))
                END || ', STEM education'
  )
)
WHERE branding_config IS NULL OR branding_config = '{}'::jsonb;

-- =========================================================
-- 2. 验证更新结果（可选，执行时可取消注释）
-- =========================================================

-- 查看更新后的 branding_config 结构
-- SELECT 
--   code,
--   name,
--   branding_config->'hero'->>'title' AS hero_title,
--   branding_config->'hero'->>'description' AS hero_description,
--   branding_config->'highlights'->>'programs' AS highlight_programs
-- FROM franchises
-- ORDER BY code;

