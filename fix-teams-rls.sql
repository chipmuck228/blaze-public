-- 修复 Teams 表的 RLS 策略
-- 这个脚本添加 INSERT、UPDATE 和 DELETE 策略

-- 注意：如果使用服务角色密钥（SUPABASE_SERVICE_ROLE_KEY），
-- 这些策略实际上不会被使用（服务角色会绕过 RLS）。
-- 但如果使用匿名密钥，这些策略会生效。

-- 删除现有的策略（如果存在）
DROP POLICY IF EXISTS "Service role can manage teams" ON teams;
DROP POLICY IF EXISTS "Service role can manage team social networks" ON team_social_networks;
DROP POLICY IF EXISTS "Admins can insert teams" ON teams;
DROP POLICY IF EXISTS "Admins can update teams" ON teams;
DROP POLICY IF EXISTS "Admins can delete teams" ON teams;
DROP POLICY IF EXISTS "Admins can insert team social networks" ON team_social_networks;
DROP POLICY IF EXISTS "Admins can update team social networks" ON team_social_networks;
DROP POLICY IF EXISTS "Admins can delete team social networks" ON team_social_networks;

-- 方案 1：允许所有操作（推荐用于服务端 API）
-- 这允许通过服务角色密钥或匿名密钥进行所有操作
-- 注意：这假设你的 API 路由已经有身份验证和授权检查

-- 允许所有操作（INSERT, UPDATE, DELETE）在 teams 表上
-- 因为 API 路由已经检查了管理员权限
CREATE POLICY "Allow all operations on teams" ON teams
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 允许所有操作（INSERT, UPDATE, DELETE）在 team_social_networks 表上
CREATE POLICY "Allow all operations on team social networks" ON team_social_networks
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 方案 2（备选）：如果你想要更严格的策略，可以使用以下代码替代上面的策略
-- 这要求用户必须是管理员角色

/*
-- 允许管理员插入团队成员
CREATE POLICY "Admins can insert teams" ON teams
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- 允许管理员更新团队成员
CREATE POLICY "Admins can update teams" ON teams
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- 允许管理员删除团队成员
CREATE POLICY "Admins can delete teams" ON teams
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- 允许管理员插入社交媒体链接
CREATE POLICY "Admins can insert team social networks" ON team_social_networks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- 允许管理员更新社交媒体链接
CREATE POLICY "Admins can update team social networks" ON team_social_networks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- 允许管理员删除社交媒体链接
CREATE POLICY "Admins can delete team social networks" ON team_social_networks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
*/
