# 修复 RLS 策略错误

## 问题
注册时出现错误：`Failed to create user: new row violates row-level security policy for table "users"`

## 原因
Supabase 的 Row Level Security (RLS) 已启用，但缺少允许服务端插入数据的策略。

## 解决方案

### 方法 1：更新数据库策略（推荐）

在 Supabase SQL Editor 中运行以下 SQL 来添加必要的策略：

```sql
-- 删除旧的策略（如果存在）
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- 创建新的策略
-- 允许服务端插入用户（用于注册）
CREATE POLICY "Service can insert users" ON users
  FOR INSERT WITH CHECK (true);

-- 允许服务端查看所有用户（用于验证、登录等）
CREATE POLICY "Service can select users" ON users
  FOR SELECT USING (true);

-- 允许服务端更新用户（用于验证邮箱、重置密码等）
CREATE POLICY "Service can update users" ON users
  FOR UPDATE USING (true);

-- 允许用户查看自己的数据
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- 允许用户更新自己的数据
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- 密码重置令牌表的策略
CREATE POLICY "Service can manage reset tokens" ON password_reset_tokens
  FOR ALL USING (true) WITH CHECK (true);
```

### 方法 2：确保使用 Service Role Key

确保您的 `.env.local` 文件中正确设置了 `SUPABASE_SERVICE_ROLE_KEY`：

```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**重要**：Service Role Key 应该自动绕过 RLS，但如果仍然遇到问题，使用方法 1 添加策略。

### 方法 3：临时禁用 RLS（仅用于测试，不推荐生产环境）

```sql
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens DISABLE ROW LEVEL SECURITY;
```

⚠️ **警告**：禁用 RLS 会降低安全性，仅用于测试。

## 验证

运行更新后的 `supabase-schema.sql` 文件，或直接在 Supabase SQL Editor 中执行上述 SQL 语句。

## 获取 Service Role Key

1. 登录 Supabase Dashboard
2. 进入您的项目
3. 转到 Settings → API
4. 找到 "service_role" key（注意：这是敏感密钥，不要暴露在客户端代码中）
5. 复制到 `.env.local` 文件

