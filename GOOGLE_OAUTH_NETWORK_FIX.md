# Google OAuth 网络连接问题修复指南

## 错误信息

```
[auth][error] TypeError: fetch failed
    at async getAuthorizationUrl
```

这个错误表示 NextAuth 无法连接到 Google 的 OAuth 服务器。

## 可能的原因

1. **网络连接问题**：服务器无法访问 Google 的 OAuth API (`https://accounts.google.com`)
2. **防火墙/代理限制**：需要配置代理或 VPN
3. **环境变量问题**：`NEXTAUTH_URL` 配置不正确
4. **Google OAuth 配置问题**：Client ID/Secret 配置错误

## 解决方案

### 方案 1：配置系统代理（推荐）

如果您使用 VPN 或代理，需要配置 Node.js 使用代理：

#### 1.1 在 `.env.local` 中添加代理配置

```env
# HTTP/HTTPS 代理配置
HTTP_PROXY=http://proxy.example.com:8080
HTTPS_PROXY=http://proxy.example.com:8080
NO_PROXY=localhost,127.0.0.1
```

#### 1.2 或者在启动命令中设置

```bash
export HTTP_PROXY=http://proxy.example.com:8080
export HTTPS_PROXY=http://proxy.example.com:8080
npm run dev
```

### 方案 2：检查网络连接

测试服务器是否可以访问 Google OAuth API：

```bash
# 测试连接
curl -v https://accounts.google.com/.well-known/openid-configuration

# 如果失败，检查是否需要代理
curl -v --proxy http://proxy.example.com:8080 https://accounts.google.com/.well-known/openid-configuration
```

### 方案 3：验证环境变量

确保 `.env.local` 文件包含：

```env
# NextAuth 配置
AUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**重要**：
- `NEXTAUTH_URL` 必须与 Google Console 中配置的 redirect URI 匹配
- 开发环境：`http://localhost:3000`
- 生产环境：`https://your-domain.com`

### 方案 4：检查 Google Console 配置

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 选择您的项目
3. 转到 **API 和服务** > **凭据**
4. 检查 OAuth 2.0 客户端 ID：
   - **已授权的重定向 URI** 必须包含：
     - `http://localhost:3000/api/auth/callback/google` (开发环境)
     - `https://your-domain.com/api/auth/callback/google` (生产环境)

### 方案 5：使用自定义 HTTP Agent（高级）

如果代理配置不工作，可以在 NextAuth 配置中使用自定义 HTTP Agent：

创建 `src/lib/http-agent.ts`：

```typescript
import { HttpsProxyAgent } from 'https-proxy-agent'
import { HttpProxyAgent } from 'http-proxy-agent'

export function getHttpAgent() {
  const httpProxy = process.env.HTTP_PROXY
  const httpsProxy = process.env.HTTPS_PROXY

  if (httpsProxy) {
    return new HttpsProxyAgent(httpsProxy)
  }
  if (httpProxy) {
    return new HttpProxyAgent(httpProxy)
  }
  return undefined
}
```

然后在 `src/auth.ts` 中使用（如果 NextAuth 支持）：

```typescript
import { getHttpAgent } from '@/lib/http-agent'

export const authConfig = {
  // ... 其他配置
  // 注意：NextAuth v5 可能不支持直接配置 HTTP Agent
  // 这种情况下，使用环境变量 HTTP_PROXY/HTTPS_PROXY 更可靠
}
```

### 方案 6：临时禁用 Google OAuth（测试）

如果问题持续，可以临时禁用 Google OAuth 来测试其他功能：

在 `src/auth.ts` 中注释掉 GoogleProvider：

```typescript
providers: [
  CredentialsProvider({
    // ... 配置
  }),
  // 临时注释掉 Google OAuth
  // ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  //   ? [
  //       GoogleProvider({
  //         clientId: process.env.GOOGLE_CLIENT_ID,
  //         clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  //       }),
  //     ]
  //   : []),
],
```

## 诊断步骤

### 1. 检查环境变量

在 `src/auth.ts` 中已经有调试日志，启动服务器时查看控制台输出：

```
🔍 NextAuth 配置检查:
  AUTH_SECRET: ✅ Set
  NEXTAUTH_URL: http://localhost:3000
  GOOGLE_CLIENT_ID: ✅ Set
  GOOGLE_CLIENT_SECRET: ✅ Set
```

### 2. 测试 Google OAuth API 连接

```bash
# 测试能否访问 Google OAuth 配置
curl https://accounts.google.com/.well-known/openid-configuration

# 应该返回 JSON 配置
```

### 3. 检查防火墙/网络设置

- 确保端口 443 (HTTPS) 未被阻止
- 检查公司/学校网络是否有防火墙限制
- 如果使用 VPN，确保 VPN 已连接

### 4. 查看详细错误日志

在开发模式下，NextAuth 会输出详细错误。查看终端输出中的完整错误堆栈。

## 常见问题

### Q: 为什么本地开发需要代理？

A: 如果您的网络环境（如公司网络、学校网络）限制了对外部 API 的访问，或者您使用了 VPN，Node.js 可能无法直接连接到 Google 的服务器。配置代理可以让 Node.js 通过代理服务器访问外部 API。

### Q: 如何知道是否需要代理？

A: 运行以下命令测试：

```bash
curl -v https://accounts.google.com/.well-known/openid-configuration
```

如果连接超时或失败，说明需要配置代理。

### Q: 代理配置会影响其他功能吗？

A: 不会。`HTTP_PROXY` 和 `HTTPS_PROXY` 环境变量只影响需要访问外部 API 的功能（如 Google OAuth、Stripe、AI API 等）。本地 API 路由不受影响。

### Q: 生产环境也需要代理吗？

A: 通常不需要。Vercel 等云平台通常可以直接访问 Google 的 API。如果生产环境也遇到连接问题，检查：
1. Vercel 环境变量是否正确设置
2. Google Console 中的 redirect URI 是否匹配生产域名

## 快速修复清单

- [ ] 检查 `.env.local` 中的 `NEXTAUTH_URL` 是否正确
- [ ] 检查 `.env.local` 中的 `GOOGLE_CLIENT_ID` 和 `GOOGLE_CLIENT_SECRET` 是否正确
- [ ] 检查 Google Console 中的 redirect URI 是否匹配
- [ ] 如果使用 VPN/代理，配置 `HTTP_PROXY` 和 `HTTPS_PROXY`
- [ ] 重启开发服务器（`npm run dev`）
- [ ] 清除 Next.js 缓存（`rm -rf .next`）

## 如果问题仍然存在

1. 查看完整的错误堆栈（终端输出）
2. 检查网络连接（`curl` 测试）
3. 尝试使用其他网络环境（如手机热点）
4. 检查是否有防火墙/安全软件阻止连接

