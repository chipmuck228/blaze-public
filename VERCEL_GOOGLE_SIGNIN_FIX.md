# Vercel Google Sign In 问题排查和修复

## 问题描述

在 Vercel 部署后，Google Sign Up 可以登录，但 Google Sign In 无法登录，没有错误提示，但仍然处于 "signin/signup" 状态。

## 可能的原因

1. **数据库连接问题**：Vercel 上的 Supabase 连接可能有问题
2. **环境变量配置问题**：Vercel 环境变量可能未正确设置
3. **错误处理不完善**：`signIn` callback 返回 `false` 时，前端无法获取错误信息
4. **Session 创建问题**：即使 `signIn` callback 成功，JWT/Session callback 可能有问题

## 已实施的修复

### 1. 改进错误处理和日志记录

- **`src/auth.ts`**：
  - 在 `signIn` callback 中添加了详细的错误日志
  - 将 `return false` 改为 `throw error`，以便 NextAuth 可以正确处理错误
  - 添加了成功日志以便追踪

- **`src/lib/db.ts`**：
  - 在 `createOrUpdateGoogleUser` 中添加了详细的错误日志
  - 添加了数据验证（检查返回的数据是否存在）
  - 改进了错误消息，包含更多上下文信息

- **`src/app/login/page.tsx`**：
  - 添加了更友好的错误消息
  - 添加了更详细的日志记录
  - 改进了错误处理逻辑
  - **关键修复**：添加了 `updateSession()` 调用来强制更新 session
  - **关键修复**：处理了 `signIn` 返回 `undefined` 或 `null` 的情况（OAuth 回调已完成但 session 未更新）
  - **关键修复**：在所有成功情况下都更新 session 并等待后再重定向，确保前端状态正确更新

### 2. 检查清单

#### 环境变量检查

确保在 Vercel 中设置了以下环境变量：

1. **AUTH_SECRET**：NextAuth 的密钥
   ```bash
   # 在本地生成
   openssl rand -base64 32
   ```

2. **NEXTAUTH_URL**：你的 Vercel 部署 URL
   ```
   https://your-app.vercel.app
   ```

3. **GOOGLE_CLIENT_ID**：Google OAuth Client ID

4. **GOOGLE_CLIENT_SECRET**：Google OAuth Client Secret

5. **Supabase 环境变量**：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

#### Google Console 配置检查

1. **Authorized redirect URIs** 必须包含：
   ```
   https://your-app.vercel.app/api/auth/callback/google
   ```

2. **Authorized JavaScript origins** 必须包含：
   ```
   https://your-app.vercel.app
   ```

#### 数据库检查

1. **检查用户表**：确保 `users` 表存在且结构正确
2. **检查 RLS 策略**：确保 Supabase RLS 策略允许服务角色访问
3. **检查连接**：确保 Vercel 可以连接到 Supabase

## 调试步骤

### 1. 检查 Vercel 日志

1. 登录 Vercel Dashboard
2. 选择你的项目
3. 进入 "Deployments" 标签
4. 点击最新的部署
5. 查看 "Functions" 标签中的日志
6. 查找包含 "Google sign in" 或 "Error" 的日志

### 2. 检查浏览器控制台

1. 打开浏览器开发者工具（F12）
2. 切换到 "Console" 标签
3. 尝试 Google Sign In
4. 查看是否有错误消息或日志

### 3. 检查网络请求

1. 打开浏览器开发者工具（F12）
2. 切换到 "Network" 标签
3. 尝试 Google Sign In
4. 查找对 `/api/auth/callback/google` 的请求
5. 检查请求的状态码和响应

### 4. 测试 API 端点

访问以下 URL 检查 NextAuth 配置：

```
https://your-app.vercel.app/api/auth/providers
```

应该返回包含 Google provider 的 JSON。

## 常见错误和解决方案

### 错误 1: "OAuthSignin" 或 "OAuthCallback"

**原因**：OAuth 流程中的问题

**解决方案**：
1. 检查 Google Console 中的 redirect URI 配置
2. 确保 `NEXTAUTH_URL` 环境变量正确设置
3. 检查 `AUTH_SECRET` 是否正确

### 错误 2: "Failed to create/update user in database"

**原因**：数据库连接或权限问题

**解决方案**：
1. 检查 Supabase 环境变量是否正确设置
2. 检查 Supabase RLS 策略
3. 检查 Supabase 服务是否正常运行

### 错误 3: "Missing email or name from Google account"

**原因**：Google 账户信息不完整

**解决方案**：
1. 确保 Google 账户有邮箱和名称
2. 检查 Google OAuth 权限范围

### 错误 4: 没有错误提示，但登录失败

**原因**：`signIn` callback 返回 `false` 但没有抛出错误

**解决方案**：
- 已修复：现在会抛出错误并记录详细日志
- 检查 Vercel 日志以查看具体错误

### 错误 5: 登录成功（200 OK）但前端状态未更新

**原因**：Session 没有立即更新，导致前端仍然显示未登录状态

**解决方案**：
- **已修复**：在登录成功后调用 `updateSession()` 强制更新 session
- **已修复**：处理了 `signIn` 返回 `undefined` 或 `null` 的情况（OAuth 回调已完成）
- **已修复**：在所有成功情况下都等待 session 更新后再重定向
- 如果问题仍然存在，检查浏览器控制台中的 session 更新日志

## 验证修复

1. **重新部署**：将修复后的代码部署到 Vercel
2. **清除浏览器缓存**：清除浏览器缓存和 cookies
3. **测试 Sign In**：尝试使用 Google Sign In
4. **检查日志**：查看 Vercel 日志和浏览器控制台
5. **验证 Session**：登录后检查是否创建了有效的 session

## 如果问题仍然存在

1. **检查 Vercel 日志**：查看最新的错误日志
2. **检查 Supabase 日志**：查看 Supabase Dashboard 中的日志
3. **测试本地环境**：在本地测试 Google Sign In 是否正常工作
4. **联系支持**：如果问题持续，提供详细的错误日志

## 额外建议

1. **使用 Vercel 的 Environment Variables**：确保所有环境变量都在 Vercel 中正确设置
2. **使用 Vercel 的 Preview Deployments**：在合并到生产之前测试修复
3. **监控错误**：使用 Vercel 的 Analytics 和 Logs 功能监控错误
4. **定期检查**：定期检查 Google Console 和 Supabase 的状态

