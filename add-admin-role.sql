-- 添加管理员角色字段到 users 表
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 更新现有用户为普通用户（如果还没有设置）
UPDATE users SET role = 'user' WHERE role IS NULL;

-- 示例：创建一个管理员用户（请替换为实际的邮箱和用户ID）
-- UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';

