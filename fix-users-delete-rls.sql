-- ==================== 修复 Users 表 DELETE 权限 ====================
-- 在 Supabase SQL Editor 中运行此脚本

-- 检查现有的 RLS 策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- ==================== 添加 DELETE 策略 ====================

-- 先删除可能存在的旧策略（如果存在）
DROP POLICY IF EXISTS "Service can delete users" ON users;

-- 允许服务端删除用户（用于 Admin 管理）
CREATE POLICY "Service can delete users" ON users
  FOR DELETE USING (true);

-- 验证策略已创建
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- ==================== 说明 ====================
-- 注意：即使使用 service_role_key，明确添加 DELETE 策略也是最佳实践
-- 这样可以确保：
-- 1. 代码更清晰（明确允许的操作）
-- 2. 如果将来切换到其他认证方式，策略仍然有效
-- 3. 符合最小权限原则（只允许必要的操作）

