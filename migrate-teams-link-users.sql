-- ==================== Teams 表关联 Users 表迁移脚本 ====================
-- 方案 A：Teams 表通过 user_id 关联 Users 表
-- 目标：确保每个 Teams 记录都关联一个 Users 记录（role='coach'）

-- ==================== 第一步：添加 user_id 字段 ====================

-- 添加 user_id 字段（允许 NULL，以便后续迁移）
ALTER TABLE teams 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_teams_user_id ON teams(user_id);

-- ==================== 第二步：数据迁移策略 ====================

-- 对于现有的 Teams 记录，我们需要：
-- 1. 检查 Users 表中是否存在对应的 coach（通过 name 匹配）
-- 2. 如果存在，更新 Teams 表的 user_id
-- 3. 如果不存在，创建新的 Users 记录（role='coach'），然后关联

-- 注意：这个迁移脚本需要手动执行，因为需要处理数据匹配逻辑
-- 建议在 Supabase SQL Editor 中逐步执行

-- ==================== 第三步：迁移现有数据（示例） ====================

-- 示例：为 "Dave W. 1" 创建或关联 Users 记录
-- 注意：实际迁移时，需要为每个 Teams 记录执行类似操作

-- 方法 1：如果 Users 表中已存在对应的 coach（通过 name 匹配）
-- UPDATE teams 
-- SET user_id = (
--   SELECT id FROM users 
--   WHERE name = teams.name AND role = 'coach'
--   LIMIT 1
-- )
-- WHERE user_id IS NULL;

-- 方法 2：如果 Users 表中不存在，创建新的 Users 记录
-- 注意：这需要为每个 Teams 记录创建临时用户
-- INSERT INTO users (name, email, role, email_verified)
-- SELECT 
--   name,
--   LOWER(REPLACE(name, ' ', '.')) || '@temp.blaze.com' as email,
--   'coach' as role,
--   FALSE as email_verified
-- FROM teams
-- WHERE user_id IS NULL
--   AND NOT EXISTS (
--     SELECT 1 FROM users 
--     WHERE name = teams.name AND role = 'coach'
--   )
-- RETURNING id, name;

-- 然后更新 Teams 表的 user_id：
-- UPDATE teams t
-- SET user_id = u.id
-- FROM users u
-- WHERE t.name = u.name 
--   AND u.role = 'coach'
--   AND t.user_id IS NULL;

-- ==================== 第四步：添加约束 ====================

-- 确保 user_id 唯一（一个 coach 只能有一条 Teams 记录）
ALTER TABLE teams 
  ADD CONSTRAINT teams_user_id_unique UNIQUE(user_id);

-- 确保 user_id 对应的用户是 coach（使用触发器，因为 CHECK 约束不支持子查询）
CREATE OR REPLACE FUNCTION validate_team_user_is_coach()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM users 
      WHERE id = NEW.user_id AND role = 'coach'
    ) THEN
      RAISE EXCEPTION 'Team user_id must reference a user with role=''coach''';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_team_user_is_coach_trigger
  BEFORE INSERT OR UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION validate_team_user_is_coach();

-- ==================== 第五步：添加可选字段 ====================

-- 添加 is_featured 字段（控制是否在首页展示）
ALTER TABLE teams 
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

-- 添加 is_active 字段（控制是否激活）
ALTER TABLE teams 
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 添加 bio 字段（详细个人简介，可选）
ALTER TABLE teams 
  ADD COLUMN IF NOT EXISTS bio TEXT;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_teams_is_featured ON teams(is_featured);
CREATE INDEX IF NOT EXISTS idx_teams_is_active ON teams(is_active);

-- ==================== 第六步：更新现有数据 ====================

-- 将所有现有的 Teams 记录设置为 is_featured = TRUE（在首页展示）
UPDATE teams 
SET is_featured = TRUE 
WHERE is_featured IS NULL OR is_featured = FALSE;

-- 将所有现有的 Teams 记录设置为 is_active = TRUE（激活）
UPDATE teams 
SET is_active = TRUE 
WHERE is_active IS NULL OR is_active = FALSE;

-- ==================== 第七步：数据迁移辅助函数 ====================

-- 创建一个函数来帮助迁移数据
CREATE OR REPLACE FUNCTION migrate_team_to_user(team_name TEXT, user_email TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_team_id UUID;
  v_email TEXT;
BEGIN
  -- 查找 Teams 记录
  SELECT id INTO v_team_id FROM teams WHERE name = team_name LIMIT 1;
  
  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Team not found: %', team_name;
  END IF;
  
  -- 如果已有关联，返回现有的 user_id
  SELECT user_id INTO v_user_id FROM teams WHERE id = v_team_id;
  IF v_user_id IS NOT NULL THEN
    RETURN v_user_id;
  END IF;
  
  -- 生成 email（如果未提供）
  IF user_email IS NULL THEN
    v_email := LOWER(REPLACE(team_name, ' ', '.')) || '@temp.blaze.com';
  ELSE
    v_email := user_email;
  END IF;
  
  -- 检查 Users 表中是否已存在
  SELECT id INTO v_user_id FROM users WHERE email = v_email AND role = 'coach' LIMIT 1;
  
  -- 如果不存在，创建新的 Users 记录
  IF v_user_id IS NULL THEN
    INSERT INTO users (name, email, role, email_verified)
    VALUES (team_name, v_email, 'coach', FALSE)
    RETURNING id INTO v_user_id;
  END IF;
  
  -- 更新 Teams 表的 user_id
  UPDATE teams SET user_id = v_user_id WHERE id = v_team_id;
  
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- ==================== 使用说明 ====================

-- 迁移现有 Teams 记录的方法：
-- 
-- 方法 1：使用辅助函数（推荐）
-- SELECT migrate_team_to_user('Dave W. 1', 'dave.w.1@blaze.com');
-- SELECT migrate_team_to_user('Max K.', 'max.k@blaze.com');
-- -- ... 为每个 Teams 记录执行
--
-- 方法 2：手动创建 Users 记录，然后更新 Teams
-- INSERT INTO users (name, email, role, email_verified)
-- VALUES ('Dave W. 1', 'dave.w.1@blaze.com', 'coach', FALSE)
-- RETURNING id;
--
-- UPDATE teams SET user_id = '<返回的id>' WHERE name = 'Dave W. 1';

-- ==================== 验证 ====================

-- 检查是否有 Teams 记录没有关联 Users
-- SELECT id, name, user_id FROM teams WHERE user_id IS NULL;

-- 检查是否有 user_id 关联的用户不是 coach
-- SELECT t.id, t.name, t.user_id, u.role
-- FROM teams t
-- JOIN users u ON t.user_id = u.id
-- WHERE u.role != 'coach';

-- 检查所有 Teams 记录及其关联的 Users
-- SELECT 
--   t.id as team_id,
--   t.name as team_name,
--   t.user_id,
--   u.name as user_name,
--   u.email,
--   u.role
-- FROM teams t
-- LEFT JOIN users u ON t.user_id = u.id
-- ORDER BY t.display_order;

