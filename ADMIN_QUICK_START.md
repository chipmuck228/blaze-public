# 管理员系统快速开始

## 1. 数据库设置

在 Supabase SQL Editor 中运行：

```sql
-- 添加 role 字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
UPDATE users SET role = 'user' WHERE role IS NULL;
```

## 2. 创建第一个管理员

将您的账户设置为管理员：

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

## 3. 访问管理员页面

1. 访问：`http://localhost:3000/admin/login`
2. 使用管理员账户登录
3. 进入管理员仪表板

## 4. 使用用户管理

- 访问 `/admin/users` 查看所有用户
- 点击用户行的 "..." 菜单
- 选择 "Edit" 编辑用户信息
- 选择 "Delete" 删除用户

## 功能列表

✅ **用户管理**
- 查看所有用户
- 搜索用户
- 编辑用户（姓名、邮箱、角色、验证状态）
- 删除用户

✅ **安全保护**
- 只有管理员可以访问
- API 权限验证
- 防止自删除

