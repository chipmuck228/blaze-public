# 修复用户删除功能

## 问题描述

在 Admin 的 User Management 页面中无法删除用户。

## 原因分析

问题很可能是由于 **RLS (Row Level Security) 策略缺少 DELETE 权限**。

虽然 `service_role` 密钥应该绕过 RLS，但为了确保删除操作能够正常工作，我们需要明确添加 DELETE 策略。

## 解决方案

### 方法 1：运行修复脚本（推荐）

在 Supabase SQL Editor 中运行 `fix-users-delete-rls.sql`：

```sql
-- 添加 DELETE 策略
CREATE POLICY IF NOT EXISTS "Service can delete users" ON users
  FOR DELETE USING (true);
```

### 方法 2：更新现有的 RLS 策略文件

如果已经运行过 `fix-rls-policies.sql`，可以再次运行更新后的版本，或者单独运行：

```sql
-- 检查现有策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- 添加 DELETE 策略
CREATE POLICY IF NOT EXISTS "Service can delete users" ON users
  FOR DELETE USING (true);
```

## 验证

运行以下 SQL 查询验证策略是否已创建：

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users' AND cmd = 'DELETE'
ORDER BY policyname;
```

应该看到 `"Service can delete users"` 策略。

## 其他可能的问题

如果添加了 DELETE 策略后仍然无法删除，请检查：

1. **外键约束**：
   - 检查是否有其他表引用了该用户
   - 检查外键约束是否设置了 `ON DELETE CASCADE` 或 `ON DELETE RESTRICT`

2. **Service Role Key**：
   - 确保 `.env.local` 中设置了 `SUPABASE_SERVICE_ROLE_KEY`
   - 确保 API 路由使用的是 `supabaseAdmin`（service role）

3. **浏览器控制台错误**：
   - 打开浏览器开发者工具
   - 查看 Network 标签页中的 DELETE 请求
   - 查看 Console 标签页中的错误信息

4. **数据库日志**：
   - 在 Supabase Dashboard 中查看数据库日志
   - 查找与删除操作相关的错误

## 测试步骤

1. 运行修复脚本
2. 刷新 Admin User Management 页面
3. 尝试删除一个测试用户
4. 检查是否成功删除
5. 如果失败，查看浏览器控制台和网络请求的详细错误信息

## 已更新的文件

1. ✅ `fix-users-delete-rls.sql` - 新建的修复脚本
2. ✅ `fix-rls-policies.sql` - 更新了，包含 DELETE 策略
3. ✅ `src/app/admin/users/page.tsx` - 改进了错误处理，显示更详细的错误信息

