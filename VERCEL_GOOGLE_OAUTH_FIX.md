# Vercel 部署 Google OAuth redirect_uri_mismatch 错误修复

## 错误信息

```
错误 400： redirect_uri_mismatch
```

## 问题原因

Google Console 中配置的 redirect URI 与 NextAuth.js 实际使用的 redirect URI 不匹配。

## 解决方案

### 步骤 1：检查 Vercel 环境变量

在 Vercel 项目设置中，确保设置了以下环境变量：

1. 访问 Vercel Dashboard
2. 选择您的项目 `blaze-wheat`
3. 转到 **Settings** > **Environment Variables**
4. 检查以下变量：

```env
AUTH_SECRET=your-auth-secret
NEXTAUTH_URL=https://blaze-wheat.vercel.app
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**关键点**：
- `NEXTAUTH_URL` 必须设置为 `https://blaze-wheat.vercel.app`（没有尾随斜杠）
- 确保所有环境变量都已添加到 **Production** 环境

### 步骤 2：验证 Google Console 配置

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 选择项目 "blaze"
3. 转到 **API 和服务** > **凭据**
4. 点击您的 OAuth 2.0 客户端 ID
5. 检查 **已授权的重定向 URI** 列表：

**必须包含**（精确匹配，不能有尾随斜杠）：
```
https://blaze-wheat.vercel.app/api/auth/callback/google
```

**如果使用自定义域名**，也需要添加：
```
https://your-custom-domain.com/api/auth/callback/google
```

### 步骤 3：检查 NextAuth.js 配置

在 `src/auth.ts` 中，确保 `trustHost: true` 已设置：

```typescript
export const authConfig = {
  secret: process.env.AUTH_SECRET,
  trustHost: true, // ✅ 这个很重要，允许 NextAuth 自动检测 host
  // ... 其他配置
}
```

### 步骤 4：重新部署

修改环境变量后，需要重新部署：

1. 在 Vercel Dashboard 中，转到 **Deployments**
2. 点击 **Redeploy** 或推送新的代码

### 步骤 5：验证修复

1. 访问 `https://blaze-wheat.vercel.app/api/auth/providers`
2. 应该看到 Google provider，并且 `callbackUrl` 应该是：
   ```json
   {
     "google": {
       "callbackUrl": "https://blaze-wheat.vercel.app/api/auth/callback/google"
     }
   }
   ```

3. 测试 Google 登录：
   - 访问 `https://blaze-wheat.vercel.app/login`
   - 点击 Google 登录按钮
   - 应该能成功重定向到 Google 并返回

## 常见问题

### Q1: 为什么需要 `NEXTAUTH_URL`？

A: NextAuth.js 使用 `NEXTAUTH_URL` 来构建完整的回调 URL。如果不设置，NextAuth.js 会尝试自动检测，但在某些情况下可能不准确。

### Q2: 如果使用自定义域名怎么办？

A: 
1. 在 Google Console 中添加自定义域名的 redirect URI：
   ```
   https://your-custom-domain.com/api/auth/callback/google
   ```
2. 在 Vercel 中设置 `NEXTAUTH_URL` 为自定义域名：
   ```env
   NEXTAUTH_URL=https://your-custom-domain.com
   ```

### Q3: 开发环境和生产环境需要不同的配置吗？

A: 是的，建议：

**开发环境**（`.env.local`）：
```env
NEXTAUTH_URL=http://localhost:3000
```

**生产环境**（Vercel Environment Variables）：
```env
NEXTAUTH_URL=https://blaze-wheat.vercel.app
```

### Q4: 如何确认 redirect URI 是否匹配？

A: 
1. 访问 `https://blaze-wheat.vercel.app/api/auth/providers`
2. 查看返回的 JSON 中的 `callbackUrl`
3. 确保它与 Google Console 中的 redirect URI **完全匹配**（包括协议、域名、路径）

## 详细检查清单

### Vercel 环境变量 ✅
- [ ] `AUTH_SECRET` 已设置
- [ ] `NEXTAUTH_URL=https://blaze-wheat.vercel.app` 已设置（无尾随斜杠）
- [ ] `GOOGLE_CLIENT_ID` 已设置
- [ ] `GOOGLE_CLIENT_SECRET` 已设置
- [ ] 所有变量都已添加到 **Production** 环境

### Google Console 配置 ✅
- [ ] OAuth 2.0 客户端 ID 已创建
- [ ] 应用类型：Web 应用
- [ ] Redirect URI：`https://blaze-wheat.vercel.app/api/auth/callback/google`（无尾随斜杠）
- [ ] OAuth 同意屏幕已配置

### NextAuth.js 配置 ✅
- [ ] `trustHost: true` 已设置
- [ ] `secret` 已设置

### 部署 ✅
- [ ] 环境变量修改后已重新部署
- [ ] 部署成功完成

## 测试步骤

### 步骤 1：验证环境变量

在 Vercel 中，可以通过以下方式验证：

1. 访问 Vercel Dashboard
2. 转到 **Settings** > **Environment Variables**
3. 确认所有变量都已设置

### 步骤 2：验证 API 端点

访问以下 URL，应该返回正确的 callback URL：

```
https://blaze-wheat.vercel.app/api/auth/providers
```

返回的 JSON 中，`google.callbackUrl` 应该是：
```
https://blaze-wheat.vercel.app/api/auth/callback/google
```

### 步骤 3：测试登录流程

1. 访问 `https://blaze-wheat.vercel.app/login`
2. 点击 Google 登录按钮
3. 应该重定向到 Google 登录页面
4. 授权后应该能成功返回并登录

## 如果问题仍然存在

### 检查 1：查看 Vercel 日志

1. 在 Vercel Dashboard 中，转到 **Deployments**
2. 点击最新的部署
3. 查看 **Logs** 标签
4. 查找与 NextAuth 相关的错误

### 检查 2：验证 redirect URI 格式

确保 Google Console 中的 redirect URI：
- ✅ 使用 `https://`（不是 `http://`）
- ✅ 没有尾随斜杠
- ✅ 路径完全匹配：`/api/auth/callback/google`
- ✅ 域名完全匹配：`blaze-wheat.vercel.app`

### 检查 3：清除缓存

1. 在 Vercel Dashboard 中，转到 **Deployments**
2. 点击 **Redeploy**，选择 **Use existing Build Cache** 为 **No**
3. 重新部署

## 总结

**问题**：`redirect_uri_mismatch` 错误

**根本原因**：Google Console 中的 redirect URI 与 NextAuth.js 实际使用的不匹配

**解决方案**：
1. ✅ 在 Vercel 中设置 `NEXTAUTH_URL=https://blaze-wheat.vercel.app`
2. ✅ 在 Google Console 中添加正确的 redirect URI
3. ✅ 确保 `trustHost: true` 已设置
4. ✅ 重新部署应用

**验证**：访问 `/api/auth/providers` 检查 `callbackUrl` 是否匹配

