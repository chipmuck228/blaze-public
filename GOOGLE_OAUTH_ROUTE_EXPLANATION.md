# Google OAuth 回调路由说明

## 为什么找不到 `/api/auth/callback/google` 文件？

**这是正常的！** NextAuth.js v5 (auth.js) 使用 **动态路由** 来自动处理所有认证相关的路由，包括 Google OAuth 回调。

## NextAuth.js 路由机制

### 1. Catch-All 路由

NextAuth.js 使用 `[...nextauth]` 这个 catch-all 路由来处理所有认证相关的请求：

```
src/app/api/auth/[...nextauth]/route.ts
```

这个文件会处理以下所有路由：

- `/api/auth/signin` - 登录页面
- `/api/auth/signout` - 登出
- `/api/auth/callback/google` - Google OAuth 回调 ⭐
- `/api/auth/callback/credentials` - 凭证登录回调
- `/api/auth/session` - 获取当前会话
- `/api/auth/providers` - 获取可用的认证提供者
- `/api/auth/csrf` - CSRF token
- 等等...

### 2. 工作原理

当用户点击 Google 登录按钮时：

1. **前端**：调用 `signIn('google')`
2. **NextAuth.js**：重定向到 Google 登录页面
3. **Google**：用户授权后，重定向回 `/api/auth/callback/google`
4. **NextAuth.js**：`[...nextauth]` 路由捕获这个请求
5. **处理**：执行 `signIn` callback，创建/更新用户
6. **完成**：重定向到指定页面

### 3. 验证路由是否工作

#### 方法 1：检查 providers 端点

访问以下 URL，应该能看到 Google provider：

```
http://localhost:3000/api/auth/providers
```

如果看到类似以下内容，说明路由正常工作：

```json
{
  "google": {
    "id": "google",
    "name": "Google",
    "type": "oauth",
    "signinUrl": "http://localhost:3000/api/auth/signin/google",
    "callbackUrl": "http://localhost:3000/api/auth/callback/google"
  },
  "credentials": {
    "id": "credentials",
    "name": "Credentials",
    "type": "credentials"
  }
}
```

#### 方法 2：检查浏览器网络请求

1. 打开浏览器开发者工具（F12）
2. 切换到 Network 标签
3. 点击 Google 登录按钮
4. 查看是否有对 `/api/auth/callback/google` 的请求

## 常见问题排查

### 问题 1：`redirect_uri_mismatch` 错误

**原因**：Google Console 中配置的 redirect URI 与 NextAuth.js 实际使用的 URI 不匹配。

**解决方案**：

1. **检查 `.env.local` 中的 `NEXTAUTH_URL`**：
   ```env
   NEXTAUTH_URL=http://localhost:3000
   ```

2. **确保 Google Console 中的 redirect URI 完全匹配**：
   ```
   http://localhost:3000/api/auth/callback/google
   ```
   
   ⚠️ 注意：
   - 不能有尾随斜杠：`/api/auth/callback/google/` ❌
   - 协议必须匹配：`http://` vs `https://`
   - 端口必须匹配：`:3000`

3. **如果使用生产环境**，需要添加生产环境的 redirect URI：
   ```
   https://your-domain.com/api/auth/callback/google
   ```

### 问题 2：找不到路由文件

**这不是问题！** NextAuth.js 会自动处理这些路由。你只需要：

1. ✅ 确保 `src/app/api/auth/[...nextauth]/route.ts` 存在
2. ✅ 确保它导出了 `handlers`：
   ```typescript
   import { handlers } from "@/auth"
   export const { GET, POST } = handlers
   ```
3. ✅ 确保 `src/auth.ts` 正确配置了 GoogleProvider

### 问题 3：Google 登录按钮不工作

**检查清单**：

1. ✅ 环境变量已设置：
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `AUTH_SECRET`
   - `NEXTAUTH_URL`

2. ✅ Google Console 配置：
   - OAuth 2.0 客户端 ID 已创建
   - Redirect URI 已添加
   - OAuth 同意屏幕已配置

3. ✅ 开发服务器已重启（修改环境变量后必须重启）

4. ✅ 检查浏览器控制台和服务器日志中的错误信息

## 验证步骤

### 步骤 1：检查路由文件

```bash
# 确认文件存在
ls -la src/app/api/auth/[...nextauth]/route.ts
```

### 步骤 2：检查环境变量

```bash
# 在项目根目录创建测试脚本
cat > test-env.js << 'EOF'
require('dotenv').config({ path: '.env.local' })
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing')
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing')
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL || '❌ Missing')
EOF

node test-env.js
```

### 步骤 3：测试 API 端点

```bash
# 启动开发服务器
npm run dev

# 在另一个终端测试
curl http://localhost:3000/api/auth/providers
```

### 步骤 4：检查 Google Console

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 选择项目 "blaze"
3. 转到 **API 和服务** > **凭据**
4. 点击你的 OAuth 2.0 客户端 ID
5. 检查 **已授权的重定向 URI** 列表：
   - ✅ `http://localhost:3000/api/auth/callback/google`

## 总结

- ✅ **不需要**创建 `/api/auth/callback/google` 文件
- ✅ NextAuth.js 会自动处理这个路由
- ✅ 只需要确保 `[...nextauth]` 路由文件存在并正确导出
- ✅ 确保 Google Console 中的 redirect URI 配置正确
- ✅ 确保环境变量正确设置

如果仍然遇到问题，请检查：
1. 服务器日志中的详细错误信息
2. 浏览器控制台中的错误
3. Google Console 中的 OAuth 配置
4. 网络连接是否正常

