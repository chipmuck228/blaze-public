-- 修复 RLS 策略
-- 在 Supabase SQL Editor 中运行此脚本

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Service can insert users" ON users;
DROP POLICY IF EXISTS "Service can select users" ON users;
DROP POLICY IF EXISTS "Service can update users" ON users;
DROP POLICY IF EXISTS "Service can manage reset tokens" ON password_reset_tokens;

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

-- 允许服务端删除用户（用于 Admin 管理）
CREATE POLICY "Service can delete users" ON users
  FOR DELETE USING (true);

-- 允许用户查看自己的数据
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- 允许用户更新自己的数据
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- 密码重置令牌表的策略
CREATE POLICY "Service can manage reset tokens" ON password_reset_tokens
  FOR ALL USING (true) WITH CHECK (true);

-- 验证策略已创建
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('users', 'password_reset_tokens')
ORDER BY tablename, policyname;

