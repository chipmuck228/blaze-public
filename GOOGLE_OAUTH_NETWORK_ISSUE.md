# Google OAuth 网络连接问题

## 问题诊断

测试显示无法连接到 Google 服务器：
```bash
curl: (28) Failed to connect to accounts.google.com port 443
```

这表明您的网络环境无法直接访问 Google 的 OAuth 服务器。

## 可能的原因

1. **网络限制**：某些地区或网络环境限制了对 Google 服务的访问
2. **防火墙**：公司或组织的防火墙可能阻止了连接
3. **代理配置**：需要配置代理才能访问外部服务

## 解决方案

### 方案 1：配置代理（推荐）

如果您的网络环境需要代理才能访问 Google 服务，可以配置 Node.js 使用代理：

1. **设置环境变量**：
   ```bash
   export HTTP_PROXY=http://your-proxy:port
   export HTTPS_PROXY=http://your-proxy:port
   ```

2. **或在 `.env.local` 中添加**：
   ```env
   HTTP_PROXY=http://your-proxy:port
   HTTPS_PROXY=http://your-proxy:port
   ```

3. **重启开发服务器**

### 方案 2：使用 VPN

如果您的网络环境限制了对 Google 的访问，可以使用 VPN 服务。

### 方案 3：暂时禁用 Google OAuth

如果暂时无法解决网络问题，可以暂时禁用 Google OAuth：

1. **注释掉 Google Provider**（在 `src/auth.ts` 中）：
   ```typescript
   providers: [
     CredentialsProvider({...}),
     // 暂时禁用 Google OAuth
     // ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
     //   ? [GoogleProvider({...})]
     //   : []),
   ],
   ```

2. **或者移除环境变量**：
   从 `.env.local` 中移除或注释掉：
   ```env
   # GOOGLE_CLIENT_ID=...
   # GOOGLE_CLIENT_SECRET=...
   ```

### 方案 4：使用其他 OAuth Provider

考虑使用其他 OAuth 提供商，如：
- GitHub OAuth
- Microsoft OAuth
- 其他本地可用的 OAuth 服务

## 测试网络连接

运行以下命令测试网络连接：

```bash
# 测试 Google OAuth 服务器
curl -I https://accounts.google.com

# 如果失败，尝试使用代理
curl -I --proxy http://your-proxy:port https://accounts.google.com
```

## 生产环境注意事项

在生产环境中：
- 确保服务器可以访问 Google 的 OAuth 服务器
- 如果使用代理，确保代理配置正确
- 考虑使用 CDN 或反向代理来改善连接

## 临时解决方案

如果 Google OAuth 暂时不可用，用户可以：
1. 使用邮箱/密码注册和登录
2. 等待网络问题解决后再启用 Google OAuth

