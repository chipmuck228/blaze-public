-- ==================== 创建 Coach 用户 ====================
-- 方法 1: 如果用户已存在，直接更新角色
-- 请将 'your-email@example.com' 替换为实际的邮箱地址

-- 更新现有用户为 coach
UPDATE users 
SET role = 'coach', 
    email_verified = TRUE  -- Coach 可以跳过邮箱验证
WHERE email = 'your-email@example.com';

-- 方法 2: 创建新用户（需要先通过注册页面注册，然后运行上面的 UPDATE 语句）
-- 或者使用下面的 Node.js 脚本创建

-- 注意：由于密码需要 bcrypt 加密，建议使用 Node.js 脚本创建新用户
-- 如果用户已存在，可以直接使用方法 1 更新角色

