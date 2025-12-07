# 管理员系统设置指南

## 功能概述

管理员系统包含以下功能：
- ✅ 管理员登录页面 (`/admin/login`)
- ✅ 管理员仪表板 (`/admin`)
- ✅ 用户管理 (`/admin/users`)
  - 查看所有用户
  - 编辑用户信息
  - 删除用户
  - 搜索用户
  - 用户状态显示（已验证/未验证）
  - 角色管理（User/Admin）

## 数据库设置

### 1. 添加管理员角色字段

在 Supabase SQL Editor 中运行 `add-admin-role.sql`：

```sql
-- 添加管理员角色字段到 users 表
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 更新现有用户为普通用户（如果还没有设置）
UPDATE users SET role = 'user' WHERE role IS NULL;
```

### 2. 创建管理员账户

有两种方式创建管理员：

#### 方式 1：通过数据库直接设置

```sql
-- 将现有用户设置为管理员
UPDATE users SET role = 'admin' WHERE email = 'your-admin-email@example.com';
```

#### 方式 2：通过用户管理界面

1. 使用普通账户登录
2. 访问 `/admin/login`（如果已有管理员权限）
3. 或先通过数据库设置一个管理员账户
4. 登录后访问 `/admin/users`
5. 编辑用户，将角色改为 "Admin"

## 访问管理员页面

### 管理员登录

访问：`http://localhost:3000/admin/login`

使用管理员账户的邮箱和密码登录。

### 管理员仪表板

登录后自动跳转到：`http://localhost:3000/admin`

## 功能说明

### 用户管理 (`/admin/users`)

#### 查看用户列表
- 显示所有注册用户
- 显示用户姓名、邮箱、验证状态、角色、注册时间
- 支持搜索功能

#### 编辑用户
- 点击用户行的操作菜单（三个点）
- 选择 "Edit"
- 可以修改：
  - 姓名
  - 邮箱
  - 角色（User/Admin）
  - 邮箱验证状态

#### 删除用户
- 点击用户行的操作菜单
- 选择 "Delete"
- 确认删除
- **注意**：不能删除自己的账户

### 安全特性

- ✅ 路由保护：只有管理员可以访问 `/admin/*` 路径
- ✅ API 保护：所有管理员 API 都验证管理员权限
- ✅ 防止自删除：管理员不能删除自己的账户
- ✅ 管理员可以跳过邮箱验证登录

## API 路由

### 用户管理
- `GET /api/admin/users` - 获取所有用户列表
- `PATCH /api/admin/users/[id]` - 更新用户信息
- `DELETE /api/admin/users/[id]` - 删除用户

所有 API 都需要管理员权限。

## 快速开始

1. **运行数据库迁移**
   ```sql
   -- 在 Supabase SQL Editor 中运行
   ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));
   CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
   ```

2. **创建第一个管理员**
   ```sql
   -- 将您的账户设置为管理员
   UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
   ```

3. **访问管理员页面**
   - 访问 `http://localhost:3000/admin/login`
   - 使用管理员账户登录
   - 开始管理用户

## 注意事项

⚠️ **重要**：
- 确保至少有一个管理员账户
- 不要删除所有管理员账户
- 管理员账户可以跳过邮箱验证直接登录
- 生产环境建议添加更细粒度的权限控制

## 未来扩展

可以考虑添加：
- 用户活动日志
- 批量操作（批量删除、批量修改角色）
- 用户统计图表
- 导出用户数据
- 更详细的权限系统（多个角色级别）

