-- =========================================================
-- fix-franchise-data.sql
-- 修复 franchise 数据：确保所有 franchise 都有 name 和 branding_config
-- =========================================================

-- 1. 检查当前数据状态
SELECT 
  code,
  name,
  branding_config IS NULL AS has_no_branding_config,
  branding_config = '{}'::jsonb AS has_empty_branding_config
FROM franchises
WHERE is_active = true
ORDER BY code;

-- 2. 修复 name 为 null 的 franchise
UPDATE franchises
SET name = CASE 
  WHEN code = 'bellevue' THEN 'Bellevue Robotics Academy'
  WHEN code = 'belred' THEN 'Bel-Red Robotics Academy'
  WHEN code = 'issaquah' THEN 'Issaquah Robotics Academy'
  WHEN code = 'cherrycrest' THEN 'Cherry Crest Robotics Academy'
  WHEN code = 'sammamish' THEN 'Sammamish Robotics Academy'
  ELSE INITCAP(REPLACE(code, '_', ' ')) || ' Robotics Academy'
END
WHERE name IS NULL AND is_active = true;

-- 3. 为没有 branding_config 的 franchise 添加默认配置
UPDATE franchises
SET branding_config = jsonb_build_object(
  'hero', jsonb_build_object(
    'title', COALESCE(name, INITCAP(REPLACE(code, '_', ' ')) || ' Robotics Academy'),
    'description', 'Local robotics, coding, and engineering programs for students in the ' || 
                   CASE 
                     WHEN code = 'bellevue' THEN 'Bellevue'
                     WHEN code = 'belred' THEN 'Bel-Red'
                     WHEN code = 'issaquah' THEN 'Issaquah'
                     WHEN code = 'cherrycrest' THEN 'Cherry Crest'
                     WHEN code = 'sammamish' THEN 'Sammamish'
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
    'title', COALESCE(name, INITCAP(REPLACE(code, '_', ' ')) || ' Robotics Academy') || ' | Blaze Robotics Academy',
    'description', 'Join ' || COALESCE(name, INITCAP(REPLACE(code, '_', ' ')) || ' Robotics Academy') || 
                   ' for hands-on robotics and coding programs designed for students in the ' ||
                   CASE 
                     WHEN code = 'bellevue' THEN 'Bellevue'
                     WHEN code = 'belred' THEN 'Bel-Red'
                     WHEN code = 'issaquah' THEN 'Issaquah'
                     WHEN code = 'cherrycrest' THEN 'Cherry Crest'
                     WHEN code = 'sammamish' THEN 'Sammamish'
                     ELSE INITCAP(REPLACE(code, '_', ' '))
                   END || ' area.',
    'keywords', 'robotics, coding, ' || 
                CASE 
                  WHEN code = 'bellevue' THEN 'Bellevue'
                  WHEN code = 'belred' THEN 'Bel-Red'
                  WHEN code = 'issaquah' THEN 'Issaquah'
                  WHEN code = 'cherrycrest' THEN 'Cherry Crest'
                  WHEN code = 'sammamish' THEN 'Sammamish'
                  ELSE INITCAP(REPLACE(code, '_', ' '))
                END || ', STEM education'
  )
)
WHERE (branding_config IS NULL OR branding_config = '{}'::jsonb) 
  AND is_active = true;

-- 4. 验证修复结果
SELECT 
  code,
  name,
  branding_config IS NOT NULL AS has_branding_config,
  branding_config->'hero'->>'title' AS hero_title,
  branding_config->'hero'->>'description' AS hero_description
FROM franchises
WHERE is_active = true
ORDER BY code;

