# Google OAuth VPN/代理配置指南

## 问题描述

- ✅ 浏览器（使用 VPN）可以访问 Google Console
- ❌ 终端/Node.js 无法连接到 `oauth2.google.com` 和 `accounts.google.com`
- ❌ NextAuth.js 无法完成 Google OAuth 流程

**原因**：浏览器使用了 VPN，但 Node.js 进程没有使用 VPN/代理。

## 解决方案

### 方案 1：使用系统级 VPN（推荐）

如果您的 VPN 是浏览器扩展（如 Chrome 扩展），它只影响浏览器流量，不影响系统级流量。

**解决方案**：
1. **使用系统级 VPN 客户端**（而不是浏览器扩展）
   - macOS: 使用 VPN 客户端（如 Tunnelblick、Viscosity 等）
   - Windows: 使用系统 VPN 设置
   - Linux: 使用 NetworkManager 或命令行 VPN

2. **配置系统 VPN 后，所有流量（包括 Node.js）都会通过 VPN**

### 方案 2：配置 Node.js 使用代理

如果 VPN 提供了代理服务器，可以配置 Node.js 使用该代理。

#### 步骤 1：获取 VPN 代理信息

查看您的 VPN 客户端设置，找到：
- 代理服务器地址（如 `127.0.0.1:1080`）
- 代理类型（HTTP/HTTPS/SOCKS5）

#### 步骤 2：配置环境变量

在 `.env.local` 文件中添加：

```env
# HTTP 代理（如果需要）
HTTP_PROXY=http://127.0.0.1:1080
HTTPS_PROXY=http://127.0.0.1:1080

# 或者使用 SOCKS5 代理
HTTP_PROXY=socks5://127.0.0.1:1080
HTTPS_PROXY=socks5://127.0.0.1:1080

# 排除本地地址（不需要代理）
NO_PROXY=localhost,127.0.0.1,0.0.0.0
```

**注意**：将 `127.0.0.1:1080` 替换为您的实际代理地址和端口。

#### 步骤 3：安装代理支持库（如果需要）

如果使用 SOCKS5 代理，可能需要安装额外的库：

```bash
npm install socks-proxy-agent
```

#### 步骤 4：重启开发服务器

```bash
npm run dev
```

### 方案 3：使用全局代理工具（macOS）

#### 使用 Proxifier 或类似工具

1. 安装 Proxifier（或类似工具）
2. 配置规则：让 Node.js 进程使用代理
3. 启动开发服务器

### 方案 4：配置 NextAuth.js 使用自定义 HTTP Agent

如果上述方法都不行，可以在 NextAuth.js 配置中使用自定义的 HTTP Agent。

#### 修改 `src/auth.ts`：

```typescript
import { HttpsProxyAgent } from 'https-proxy-agent'

// 创建代理 agent（如果需要）
const proxyAgent = process.env.HTTPS_PROXY 
  ? new HttpsProxyAgent(process.env.HTTPS_PROXY)
  : undefined

export const authConfig = {
  // ... 其他配置
  providers: [
    // ... 其他 providers
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            // 如果 NextAuth.js 支持，可以传递 httpOptions
            // httpOptions: {
            //   agent: proxyAgent
            // }
          }),
        ]
      : []),
  ],
}
```

**注意**：NextAuth.js v5 可能不直接支持自定义 HTTP Agent，这取决于具体实现。

## 快速测试

### 测试 1：检查代理是否生效

```bash
# 设置代理环境变量
export HTTP_PROXY=http://127.0.0.1:1080
export HTTPS_PROXY=http://127.0.0.1:1080

# 测试连接
curl -v https://accounts.google.com
```

如果成功，说明代理配置正确。

### 测试 2：在 Node.js 中测试

创建测试文件 `test-proxy.js`：

```javascript
require('dotenv').config({ path: '.env.local' })

const https = require('https')
const { HttpsProxyAgent } = require('https-proxy-agent')

const proxyUrl = process.env.HTTPS_PROXY
const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined

const options = {
  hostname: 'accounts.google.com',
  path: '/',
  method: 'GET',
  agent: agent
}

const req = https.request(options, (res) => {
  console.log('✅ 连接成功！状态码:', res.statusCode)
  res.on('data', () => {})
  res.on('end', () => {
    console.log('✅ 测试完成')
  })
})

req.on('error', (error) => {
  console.error('❌ 连接失败:', error.message)
})

req.end()
```

运行：
```bash
npm install https-proxy-agent
node test-proxy.js
```

## 推荐方案

### 对于开发环境

**最佳方案**：使用系统级 VPN

1. 安装系统级 VPN 客户端
2. 连接到 VPN
3. 所有流量（包括 Node.js）都会通过 VPN
4. 不需要额外配置

### 如果只能使用浏览器 VPN

**备选方案**：配置代理

1. 查看浏览器 VPN 是否提供代理服务器
2. 在 `.env.local` 中配置代理
3. 重启开发服务器

## 验证步骤

### 步骤 1：测试终端连接

```bash
# 设置代理（如果使用方案 2）
export HTTP_PROXY=http://your-proxy:port
export HTTPS_PROXY=http://your-proxy:port

# 测试连接
curl -I --max-time 10 https://accounts.google.com
```

如果看到 HTTP 响应（200 或 302），说明代理配置成功。

### 步骤 2：测试 Node.js 连接

```bash
# 确保环境变量已设置
node -e "console.log('HTTP_PROXY:', process.env.HTTP_PROXY || '未设置')"
node -e "console.log('HTTPS_PROXY:', process.env.HTTPS_PROXY || '未设置')"
```

### 步骤 3：重启开发服务器

```bash
npm run dev
```

### 步骤 4：测试 Google 登录

1. 访问 `http://localhost:3000/login`
2. 点击 Google 登录按钮
3. 应该能重定向到 Google 登录页面

## 常见问题

### Q: 如何找到 VPN 的代理地址？

A: 
- 查看 VPN 客户端的设置/配置
- 查看系统网络设置中的代理配置
- 如果使用浏览器 VPN 扩展，可能不提供代理服务器

### Q: 浏览器 VPN 扩展是否提供代理？

A: 大多数浏览器 VPN 扩展（如 Chrome 扩展）只影响浏览器流量，不提供系统级代理。需要使用系统级 VPN 客户端。

### Q: 如何确认代理是否生效？

A: 
1. 在终端运行 `curl -v https://accounts.google.com`
2. 如果成功连接，说明代理生效
3. 如果仍然超时，说明代理配置不正确或未生效

## 总结

**问题**：浏览器 VPN 不影响 Node.js 进程

**解决方案**：
1. ✅ **使用系统级 VPN**（最简单，推荐）
2. ✅ **配置 Node.js 使用代理**（如果 VPN 提供代理）
3. ✅ **使用全局代理工具**（macOS 可以使用 Proxifier）

**下一步**：
1. 选择适合您的方案
2. 按照步骤配置
3. 测试连接
4. 重启开发服务器
5. 测试 Google 登录

