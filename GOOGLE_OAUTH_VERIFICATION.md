# Google OAuth 配置验证结果

## ✅ 验证结果：配置正常

访问 `http://localhost:3000/api/auth/providers` 得到的结果：

```json
{
  "credentials": {
    "id": "credentials",
    "name": "Credentials",
    "type": "credentials",
    "signinUrl": "http://localhost:3000/api/auth/signin/credentials",
    "callbackUrl": "http://localhost:3000/api/auth/callback/credentials"
  },
  "google": {
    "id": "google",
    "name": "Google",
    "type": "oidc",
    "signinUrl": "http://localhost:3000/api/auth/signin/google",
    "callbackUrl": "http://localhost:3000/api/auth/callback/google"
  }
}
```

## ✅ 这证明了什么？

1. **NextAuth.js 路由正常工作** ✅
   - `/api/auth/[...nextauth]` 路由正确捕获请求
   - 所有认证端点都可以访问

2. **Google Provider 已正确注册** ✅
   - `GOOGLE_CLIENT_ID` 和 `GOOGLE_CLIENT_SECRET` 环境变量已加载
   - Google Provider 已成功初始化

3. **回调 URL 配置正确** ✅
   - 回调 URL：`http://localhost:3000/api/auth/callback/google`
   - 这与 Google Console 中配置的 redirect URI 应该匹配

## 🔍 下一步验证

### 1. 验证 Google Console 配置

确保 Google Cloud Console 中的配置与上述结果匹配：

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 选择项目 "blaze"
3. 转到 **API 和服务** > **凭据**
4. 点击你的 OAuth 2.0 客户端 ID
5. 检查 **已授权的重定向 URI**：
   - ✅ 必须包含：`http://localhost:3000/api/auth/callback/google`
   - ⚠️ 注意：不能有尾随斜杠
   - ⚠️ 注意：协议必须是 `http://`（开发环境）

### 2. 测试登录流程

#### 步骤 1：访问登录页面
```
http://localhost:3000/login
```

#### 步骤 2：点击 Google 登录按钮
- 应该重定向到 Google 登录页面
- URL 应该类似：`https://accounts.google.com/o/oauth2/v2/auth?...`

#### 步骤 3：授权后
- Google 会重定向回：`http://localhost:3000/api/auth/callback/google?...`
- NextAuth.js 会处理回调并创建/更新用户
- 最终重定向到首页或指定页面

### 3. 如果遇到错误

#### 错误 1：`redirect_uri_mismatch`

**原因**：Google Console 中的 redirect URI 与 NextAuth.js 使用的不匹配

**解决方案**：
1. 检查 Google Console 中的 redirect URI 是否完全匹配：
   ```
   http://localhost:3000/api/auth/callback/google
   ```
2. 确保没有尾随斜杠
3. 确保协议匹配（http vs https）
4. 保存后等待几分钟让更改生效

#### 错误 2：`invalid_client`

**原因**：客户端 ID 或密钥错误

**解决方案**：
1. 检查 `.env.local` 中的值是否正确
2. 确保没有多余的空格或引号
3. 重新生成客户端密钥（如果需要）

#### 错误 3：`access_denied`

**原因**：OAuth 同意屏幕未配置或测试用户未添加

**解决方案**：
1. 在 Google Cloud Console 中转到 **OAuth 同意屏幕**
2. 配置应用信息（应用名称、用户支持电子邮件等）
3. 如果应用处于测试模式，添加测试用户
4. 发布应用（如果需要）

#### 错误 4：`fetch failed` 或网络错误

**原因**：服务器无法连接到 Google OAuth 服务器

**解决方案**：
1. 检查网络连接
2. 检查防火墙设置
3. 检查代理配置
4. 查看服务器日志中的详细错误信息

## 📋 完整检查清单

### 环境变量 ✅
- [x] `GOOGLE_CLIENT_ID` 已设置
- [x] `GOOGLE_CLIENT_SECRET` 已设置
- [ ] `AUTH_SECRET` 已设置
- [ ] `NEXTAUTH_URL=http://localhost:3000` 已设置

### Google Console 配置
- [ ] OAuth 2.0 客户端 ID 已创建
- [ ] 应用类型：Web 应用
- [ ] Redirect URI：`http://localhost:3000/api/auth/callback/google`
- [ ] OAuth 同意屏幕已配置
- [ ] 测试用户已添加（如果应用处于测试模式）

### NextAuth.js 配置 ✅
- [x] `src/app/api/auth/[...nextauth]/route.ts` 存在
- [x] `src/auth.ts` 中 GoogleProvider 已配置
- [x] Providers 端点返回 Google provider

### 测试
- [ ] 访问 `/api/auth/providers` 返回 Google provider ✅
- [ ] 点击 Google 登录按钮能重定向到 Google
- [ ] 授权后能成功回调并登录

## 🚀 如果一切正常但仍无法登录

1. **清除浏览器缓存和 Cookie**
   - 清除 localhost 的 Cookie
   - 清除浏览器缓存

2. **重启开发服务器**
   ```bash
   # 停止服务器 (Ctrl+C)
   npm run dev
   ```

3. **检查服务器日志**
   - 查看终端中的详细错误信息
   - 查看浏览器控制台中的错误

4. **检查数据库连接**
   - 确保 Supabase 连接正常
   - 确保 `createOrUpdateGoogleUser` 函数正常工作

## 📝 调试技巧

### 启用详细日志

在 `src/auth.ts` 中，已经有开发环境的日志输出。检查终端中是否有：

```
🔍 NextAuth 配置检查:
  AUTH_SECRET: ✅ Set
  NEXTAUTH_URL: http://localhost:3000
  GOOGLE_CLIENT_ID: ✅ Set
  GOOGLE_CLIENT_SECRET: ✅ Set
```

### 检查浏览器网络请求

1. 打开浏览器开发者工具（F12）
2. 切换到 Network 标签
3. 点击 Google 登录按钮
4. 查看请求和响应：
   - `/api/auth/signin/google` - 应该返回 302 重定向到 Google
   - `/api/auth/callback/google` - 应该返回 302 重定向到首页

## 总结

✅ **你的 NextAuth.js 配置是正确的！**

如果 Google 登录仍然有问题，最可能的原因是：
1. Google Console 中的 redirect URI 配置不匹配
2. OAuth 同意屏幕未正确配置
3. 环境变量中的值有误

按照上述检查清单逐一验证，应该能解决问题。

