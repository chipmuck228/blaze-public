-- ==================== 更新用户角色为 Coach ====================
-- 使用方法：在 Supabase SQL Editor 中运行此脚本

-- 方法 1: 更新特定邮箱的用户为 coach
-- 请将 'coach@test.com' 替换为实际的邮箱地址
UPDATE users 
SET role = 'coach', 
    email_verified = TRUE
WHERE email = 'coach@test.com';

-- 方法 2: 查看所有用户及其角色
SELECT id, name, email, role, email_verified, created_at
FROM users
ORDER BY created_at DESC;

-- 方法 3: 查看所有 coach 用户
SELECT id, name, email, role, email_verified, created_at
FROM users
WHERE role = 'coach';

-- 方法 4: 查看所有 role 为 NULL 或 'user' 的用户（可能需要更新）
SELECT id, name, email, role, email_verified, created_at
FROM users
WHERE role IS NULL OR role = 'user';

