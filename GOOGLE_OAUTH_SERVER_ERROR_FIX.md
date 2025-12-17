# Google OAuth 服务器错误排查指南

## 错误现象

点击 Google 登录按钮后，显示：
```
Server error
There is a problem with the server configuration.
Check the server logs for more information.
```

## 可能的原因

### 1. 网络连接问题（最常见）

NextAuth.js 无法连接到 Google OAuth 服务器。

**检查方法**：
```bash
# 在终端中运行
curl -I https://accounts.google.com
curl -I https://oauth2.googleapis.com
```

如果连接失败，说明网络无法访问 Google 服务。

**解决方案**：
- 使用 VPN
- 配置代理（见下文）
- 检查防火墙设置

### 2. 环境变量问题

环境变量未正确加载或格式错误。

**检查方法**：
1. 查看服务器启动时的日志，应该看到：
   ```
   🔍 NextAuth 配置检查:
     AUTH_SECRET: ✅ Set
     NEXTAUTH_URL: http://localhost:3000
     GOOGLE_CLIENT_ID: ✅ Set
     GOOGLE_CLIENT_SECRET: ✅ Set
   ```

2. 如果看到 `❌ Missing`，说明环境变量未设置。

**解决方案**：
- 检查 `.env.local` 文件是否存在
- 确保变量名正确（大小写敏感）
- 确保没有多余的空格或引号
- 重启开发服务器

### 3. Google Provider 配置问题

Google Provider 初始化失败。

**检查方法**：
访问 `http://localhost:3000/api/auth/providers`，应该看到 Google provider。

**解决方案**：
- 确保 `GOOGLE_CLIENT_ID` 和 `GOOGLE_CLIENT_SECRET` 正确
- 确保 Google Console 中的配置正确

### 4. NextAuth.js 版本问题

NextAuth.js 版本不兼容。

**检查方法**：
```bash
npm list next-auth
```

**解决方案**：
- 确保使用 `next-auth@^5.0.0-beta.30` 或更高版本
- 如果版本不对，更新：
  ```bash
  npm install next-auth@latest
  ```

## 详细排查步骤

### 步骤 1：检查服务器日志

查看运行 `npm run dev` 的终端窗口，查找错误信息：

```
Error: fetch failed
TypeError: fetch failed
Error: connect ECONNREFUSED
Error: getaddrinfo ENOTFOUND
```

这些错误通常表示网络连接问题。

### 步骤 2：检查环境变量

创建测试脚本 `test-env.js`：

```javascript
require('dotenv').config({ path: '.env.local' })

console.log('=== 环境变量检查 ===')
console.log('AUTH_SECRET:', process.env.AUTH_SECRET ? '✅ Set' : '❌ Missing')
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL || '❌ Missing')
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing')
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing')

if (process.env.GOOGLE_CLIENT_ID) {
  console.log('GOOGLE_CLIENT_ID 长度:', process.env.GOOGLE_CLIENT_ID.length)
  console.log('GOOGLE_CLIENT_ID 前10个字符:', process.env.GOOGLE_CLIENT_ID.substring(0, 10) + '...')
}
```

运行：
```bash
node test-env.js
```

### 步骤 3：测试网络连接

```bash
# 测试 Google OAuth 服务器
curl -v https://accounts.google.com
curl -v https://oauth2.googleapis.com

# 如果失败，尝试使用代理
curl -v --proxy http://your-proxy:port https://accounts.google.com
```

### 步骤 4：检查 Google Console 配置

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 选择项目 "blaze"
3. 转到 **API 和服务** > **凭据**
4. 检查 OAuth 2.0 客户端 ID：
   - 应用类型：Web 应用
   - 已授权的重定向 URI：`http://localhost:3000/api/auth/callback/google`
   - 确保没有尾随斜杠

### 步骤 5：检查 NextAuth.js 路由

访问以下 URL 测试：

```bash
# 应该返回 providers 列表
curl http://localhost:3000/api/auth/providers

# 应该返回 302 重定向到 Google
curl -I http://localhost:3000/api/auth/signin/google
```

## 解决方案

### 方案 1：配置代理（如果网络受限）

如果您的网络环境需要代理才能访问 Google：

1. **在 `.env.local` 中添加**：
   ```env
   HTTP_PROXY=http://your-proxy:port
   HTTPS_PROXY=http://your-proxy:port
   ```

2. **或在启动脚本中设置**：
   ```bash
   export HTTP_PROXY=http://your-proxy:port
   export HTTPS_PROXY=http://your-proxy:port
   npm run dev
   ```

### 方案 2：使用 VPN

如果网络限制了对 Google 的访问，使用 VPN 服务。

### 方案 3：改进错误处理

已更新 `src/app/login/page.tsx` 以显示更详细的错误信息。

### 方案 4：添加调试日志

在 `src/auth.ts` 中，已经有开发环境的日志输出。检查终端中是否有错误信息。

## 临时解决方案

如果暂时无法解决网络问题：

1. **使用邮箱/密码登录**：用户可以使用传统的邮箱/密码注册和登录
2. **等待网络问题解决**：一旦网络可以访问 Google，Google OAuth 会自动恢复

## 生产环境注意事项

在生产环境中：

1. **确保服务器可以访问 Google**：
   - 检查服务器网络配置
   - 确保防火墙允许访问 Google OAuth 服务器
   - 如果使用代理，确保代理配置正确

2. **监控错误日志**：
   - 设置错误监控（如 Sentry）
   - 定期检查服务器日志

3. **备用方案**：
   - 提供多种登录方式（邮箱/密码、其他 OAuth 提供商）
   - 确保至少有一种登录方式始终可用

## 下一步

1. **查看服务器日志**：检查运行 `npm run dev` 的终端窗口中的错误信息
2. **测试网络连接**：运行 `curl` 命令测试 Google 服务器
3. **检查环境变量**：使用测试脚本验证环境变量
4. **检查 Google Console**：确保配置正确

如果问题仍然存在，请提供：
- 服务器日志中的完整错误信息
- 网络连接测试结果
- 环境变量检查结果

