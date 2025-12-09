# Google OAuth 故障排除指南

## 常见错误：`TypeError: fetch failed`

这个错误通常发生在 NextAuth 尝试连接到 Google OAuth 服务器时。

### 1. 检查环境变量

确保 `.env.local` 文件中包含以下变量：

```env
# 必需
AUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000  # 开发环境
# 或
NEXTAUTH_URL=https://your-domain.com  # 生产环境

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 2. 验证 Google Cloud Console 配置

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 选择您的项目
3. 转到 **API 和服务** > **凭据**
4. 检查您的 OAuth 2.0 客户端 ID：
   - **应用类型**：Web 应用
   - **已授权的 JavaScript 源**：
     - `http://localhost:3000` (开发环境)
     - `https://your-domain.com` (生产环境)
   - **已授权的重定向 URI**：
     - `http://localhost:3000/api/auth/callback/google` (开发环境)
     - `https://your-domain.com/api/auth/callback/google` (生产环境)

### 3. 检查网络连接

确保服务器可以访问 Google 的 OAuth 服务器：
- 检查防火墙设置
- 检查代理配置
- 确保没有网络限制

### 4. 验证环境变量是否正确加载

在 `src/auth.ts` 中添加调试日志（仅用于开发）：

```typescript
console.log('Google Client ID:', process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Missing')
console.log('Google Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'Missing')
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL)
```

### 5. 重启开发服务器

修改环境变量后，必须重启开发服务器：

```bash
# 停止服务器 (Ctrl+C)
# 然后重新启动
npm run dev
```

### 6. 检查 NextAuth 版本

确保使用兼容的 NextAuth 版本：

```bash
npm list next-auth
```

应该显示 `next-auth@^5.0.0-beta.30` 或更高版本。

### 7. 清除 Next.js 缓存

如果问题持续存在，尝试清除缓存：

```bash
rm -rf .next
npm run dev
```

## 其他常见问题

### 问题：重定向 URI 不匹配

**错误信息**：`redirect_uri_mismatch`

**解决方案**：
- 确保 Google Cloud Console 中的重定向 URI 与 `NEXTAUTH_URL/api/auth/callback/google` 完全匹配
- 检查是否有尾随斜杠或协议不匹配（http vs https）

### 问题：客户端 ID 或密钥无效

**错误信息**：`invalid_client`

**解决方案**：
- 验证 `.env.local` 中的 `GOOGLE_CLIENT_ID` 和 `GOOGLE_CLIENT_SECRET` 是否正确
- 确保没有多余的空格或引号
- 重新生成客户端密钥（如果需要）

### 问题：OAuth 同意屏幕未配置

**错误信息**：`access_denied`

**解决方案**：
1. 在 Google Cloud Console 中转到 **OAuth 同意屏幕**
2. 配置应用信息
3. 添加测试用户（如果应用处于测试模式）
4. 发布应用（如果需要）

## 测试步骤

1. **验证环境变量**：
   ```bash
   node -e "console.log(process.env.GOOGLE_CLIENT_ID)"
   ```

2. **检查 NextAuth 路由**：
   访问 `http://localhost:3000/api/auth/providers` 应该显示 Google provider

3. **测试登录流程**：
   - 访问登录页面
   - 点击 Google 登录按钮
   - 应该重定向到 Google 登录页面

## 如果问题仍然存在

1. 检查服务器日志中的详细错误信息
2. 验证 Google Cloud Console 中的 API 是否已启用：
   - Google+ API
   - Google Identity API
3. 检查 NextAuth 文档：https://next-auth.js.org/providers/google
4. 查看 NextAuth GitHub Issues：https://github.com/nextauthjs/next-auth/issues

