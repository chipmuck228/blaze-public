# Teams 表 RLS 策略修复指南

## 问题描述

在尝试向 `teams` 表插入数据时，出现以下错误：
```
Failed to create team member: new row violates row-level security policy for table "teams"
```

## 原因分析

`teams` 表启用了 Row Level Security (RLS)，但只创建了 SELECT 策略（允许所有人查看），没有创建 INSERT、UPDATE 和 DELETE 策略。

虽然代码使用了 `supabaseAdmin`（应该使用服务角色密钥绕过 RLS），但如果：
1. `SUPABASE_SERVICE_ROLE_KEY` 环境变量未设置
2. 或者服务角色密钥配置不正确

那么 `supabaseAdmin` 会回退到使用匿名密钥，从而受到 RLS 限制。

## 解决方案

### 方案 1：运行 SQL 脚本（推荐）

1. 登录到 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目
3. 进入 **SQL Editor**
4. 运行 `fix-teams-rls.sql` 文件中的 SQL 脚本

这个脚本会：
- 添加允许所有操作（INSERT、UPDATE、DELETE）的 RLS 策略
- 因为 API 路由已经检查了管理员权限，所以这是安全的

### 方案 2：确保服务角色密钥已设置

1. 在 Supabase Dashboard 中，进入 **Settings** → **API**
2. 复制 **service_role** 密钥（**注意：这是敏感信息，不要公开**）
3. 在项目的 `.env.local` 文件中添加：

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

4. 重启开发服务器

使用服务角色密钥时，`supabaseAdmin` 会完全绕过 RLS，不需要额外的策略。

## 验证修复

运行 SQL 脚本后，尝试：

1. 在 Admin 页面添加新的团队成员
2. 编辑现有团队成员
3. 删除团队成员

如果所有操作都成功，说明修复完成。

## 安全说明

**重要**：虽然 SQL 脚本添加了允许所有操作的策略，但这是安全的，因为：

1. API 路由 (`/api/admin/teams`) 已经检查了用户身份验证
2. API 路由已经检查了管理员角色 (`session.user.role !== "admin"`)
3. 只有通过身份验证的管理员才能访问这些 API

RLS 策略是额外的安全层，但主要的安全检查在 API 路由层面。

## 故障排除

### 仍然出现 RLS 错误

1. **检查策略是否已创建**：
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'teams';
   ```

2. **检查服务角色密钥**：
   确保 `.env.local` 中的 `SUPABASE_SERVICE_ROLE_KEY` 已正确设置

3. **检查环境变量**：
   在代码中添加日志，确认 `supabaseAdmin` 使用的是服务角色密钥：
   ```typescript
   console.log('Using service role:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
   ```

### 策略创建失败

如果策略创建失败，可能是因为：
- 策略名称已存在（脚本会先删除，但如果有其他名称的策略，可能需要手动删除）
- 权限不足（确保使用 Supabase Dashboard 的 SQL Editor，它有完整权限）

## 相关文件

- `fix-teams-rls.sql` - RLS 策略修复脚本
- `src/lib/db.ts` - 数据库操作函数
- `src/lib/supabase.ts` - Supabase 客户端配置
- `src/app/api/admin/teams/route.ts` - Teams API 路由

