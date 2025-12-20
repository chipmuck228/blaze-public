# Gemini API 连接超时问题解决方案

## 问题描述

在使用 Google Gemini API 时遇到连接超时错误：

```
Connect Timeout Error (attempted addresses: 142.250.73.138:443, timeout: 10000ms)
```

## 原因分析

1. **网络限制**: 某些网络环境无法直接访问 Google 服务
2. **超时时间过短**: 默认超时可能不足以建立连接
3. **需要代理**: 可能需要通过代理服务器访问

## 解决方案

### 方案 1: 配置代理（推荐）

如果您的网络环境需要代理才能访问 Google 服务：

#### 步骤 1: 在 `.env.local` 中添加代理配置

```env
# HTTP/HTTPS 代理
HTTP_PROXY=http://127.0.0.1:7890
HTTPS_PROXY=http://127.0.0.1:7890

# 排除本地地址
NO_PROXY=localhost,127.0.0.1,0.0.0.0
```

**常见代理端口**:
- Clash: `127.0.0.1:7890` (HTTP) 或 `127.0.0.1:7891` (SOCKS5)
- V2Ray: `127.0.0.1:1080` (SOCKS5)
- Shadowsocks: `127.0.0.1:1080` (SOCKS5)

#### 步骤 2: 测试代理连接

```bash
# 测试是否能通过代理访问 Google
curl -I --proxy http://127.0.0.1:7890 https://generativelanguage.googleapis.com
```

#### 步骤 3: 重启开发服务器

```bash
npm run dev
```

### 方案 2: 使用系统级 VPN

如果您的 VPN 是浏览器扩展，它只影响浏览器流量，不影响 Node.js：

1. **使用系统级 VPN 客户端**（而不是浏览器扩展）
   - macOS: ClashX, Viscosity, Tunnelblick 等
   - Windows: 系统 VPN 设置或 VPN 客户端
   - Linux: NetworkManager 或命令行 VPN

2. **连接到 VPN**

3. **重启开发服务器**

### 方案 3: 使用 SOCKS5 代理

如果您的代理是 SOCKS5 类型：

#### 步骤 1: 安装 SOCKS 代理支持

```bash
npm install socks-proxy-agent
```

#### 步骤 2: 配置环境变量

```env
HTTP_PROXY=socks5://127.0.0.1:7891
HTTPS_PROXY=socks5://127.0.0.1:7891
```

#### 步骤 3: 重启开发服务器

### 方案 4: 检查防火墙和网络设置

1. **检查防火墙**: 确保允许访问 `generativelanguage.googleapis.com`
2. **检查网络**: 确认网络环境允许访问 Google 服务
3. **联系网络管理员**: 如果是公司网络，可能需要申请访问权限

## 验证配置

### 测试 1: 检查环境变量

```bash
# 在终端中检查
echo $HTTP_PROXY
echo $HTTPS_PROXY
```

### 测试 2: 测试 Google API 连接

```bash
# 直接测试（不使用代理）
curl -I --max-time 10 https://generativelanguage.googleapis.com

# 使用代理测试
curl -I --proxy http://127.0.0.1:7890 --max-time 10 https://generativelanguage.googleapis.com
```

### 测试 3: 在代码中测试

创建一个测试文件 `test-gemini-connection.js`:

```javascript
require('dotenv').config({ path: '.env.local' })

const https = require('https')

console.log('HTTP_PROXY:', process.env.HTTP_PROXY || '未设置')
console.log('HTTPS_PROXY:', process.env.HTTPS_PROXY || '未设置')

const options = {
  hostname: 'generativelanguage.googleapis.com',
  path: '/',
  method: 'GET',
  timeout: 10000
}

const req = https.request(options, (res) => {
  console.log('✅ 连接成功！状态码:', res.statusCode)
  res.on('data', () => {})
  res.on('end', () => {
    console.log('✅ 测试完成')
    process.exit(0)
  })
})

req.on('error', (error) => {
  console.error('❌ 连接失败:', error.message)
  process.exit(1)
})

req.on('timeout', () => {
  console.error('❌ 连接超时')
  req.destroy()
  process.exit(1)
})

req.end()
```

运行测试：

```bash
node test-gemini-connection.js
```

## 常见问题

### Q: 如何知道我的代理端口？

A: 
- 查看 VPN 客户端的设置/配置页面
- 查看系统网络设置中的代理配置
- 常见端口：
  - Clash: 7890 (HTTP), 7891 (SOCKS5)
  - V2Ray: 1080 (SOCKS5)

### Q: 浏览器 VPN 扩展是否提供代理？

A: 大多数浏览器 VPN 扩展只影响浏览器流量，不提供系统级代理。需要使用系统级 VPN 客户端。

### Q: 配置代理后仍然超时？

A: 
1. 确认代理服务器正在运行
2. 确认端口号正确
3. 尝试使用 `curl` 测试代理是否工作
4. 检查代理类型（HTTP vs SOCKS5）

### Q: 在 Vercel 部署时如何处理？

A: 
- Vercel 服务器通常可以直接访问 Google 服务
- 如果仍然有问题，可以在 Vercel 环境变量中配置代理
- 或者考虑使用其他 AI 提供商

## 临时解决方案

如果暂时无法解决网络问题，可以考虑：

1. **使用其他 AI 模型**: 切换到其他可用的 AI 提供商
2. **本地测试**: 在可以访问 Google 服务的环境中测试
3. **使用 API 中转服务**: 通过第三方服务访问 Gemini API

## 总结

**最佳方案**: 使用系统级 VPN 或配置 HTTP/HTTPS 代理

**关键步骤**:
1. 在 `.env.local` 中配置 `HTTP_PROXY` 和 `HTTPS_PROXY`
2. 重启开发服务器
3. 验证连接

