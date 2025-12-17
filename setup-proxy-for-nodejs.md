# 为 Node.js 配置代理以访问 Google OAuth

## 问题

- ✅ 浏览器（使用 VPN）可以访问 Google
- ❌ Node.js/终端无法访问 Google
- ❌ NextAuth.js 无法完成 Google OAuth

## 解决方案

### 方案 1：使用系统级 VPN（最简单，推荐）

如果您的 VPN 是浏览器扩展，它只影响浏览器，不影响系统级流量。

**步骤**：
1. **安装系统级 VPN 客户端**（而不是浏览器扩展）
   - macOS: 使用 VPN 客户端（如 Tunnelblick、Viscosity、ClashX 等）
   - Windows: 使用系统 VPN 设置或 VPN 客户端
   - Linux: 使用 NetworkManager 或命令行 VPN

2. **连接到 VPN**
3. **所有流量（包括 Node.js）都会通过 VPN**
4. **重启开发服务器**：
   ```bash
   npm run dev
   ```

### 方案 2：配置 Node.js 使用代理

如果您的 VPN 提供代理服务器，可以配置 Node.js 使用该代理。

#### 步骤 1：查找 VPN 的代理信息

查看您的 VPN 客户端设置，找到：
- 代理服务器地址（如 `127.0.0.1:7890`）
- 代理类型（HTTP/HTTPS/SOCKS5）

**常见 VPN 代理端口**：
- Clash: `127.0.0.1:7890` (HTTP) 或 `127.0.0.1:7891` (SOCKS5)
- V2Ray: `127.0.0.1:1080` (SOCKS5)
- Shadowsocks: `127.0.0.1:1080` (SOCKS5)

#### 步骤 2：在 `.env.local` 中添加代理配置

```env
# HTTP/HTTPS 代理（如果 VPN 提供 HTTP 代理）
HTTP_PROXY=http://127.0.0.1:7890
HTTPS_PROXY=http://127.0.0.1:7890

# 或者使用 SOCKS5 代理（如果 VPN 提供 SOCKS5 代理）
# HTTP_PROXY=socks5://127.0.0.1:7891
# HTTPS_PROXY=socks5://127.0.0.1:7891

# 排除本地地址（不需要代理）
NO_PROXY=localhost,127.0.0.1,0.0.0.0
```

**注意**：将 `127.0.0.1:7890` 替换为您的实际代理地址和端口。

#### 步骤 3：安装 SOCKS5 代理支持（如果需要）

如果使用 SOCKS5 代理，Node.js 默认不支持，需要安装额外库：

```bash
npm install socks-proxy-agent
```

#### 步骤 4：修改启动脚本（如果需要 SOCKS5 支持）

如果使用 SOCKS5 代理，可能需要修改代码。但首先尝试方案 2 的步骤 2，看看 HTTP 代理是否足够。

#### 步骤 5：重启开发服务器

```bash
npm run dev
```

### 方案 3：使用全局代理工具（macOS）

#### 使用 Proxifier

1. 安装 [Proxifier](https://www.proxifier.com/)
2. 配置规则：让 Node.js 进程使用代理
3. 启动开发服务器

## 快速测试

### 测试 1：检查代理是否生效

```bash
# 设置代理环境变量（临时测试）
export HTTP_PROXY=http://127.0.0.1:7890
export HTTPS_PROXY=http://127.0.0.1:7890

# 测试连接
curl -I --max-time 10 https://accounts.google.com
```

如果看到 HTTP 响应（200 或 302），说明代理配置成功。

### 测试 2：检查 .env.local 是否生效

```bash
# 加载 .env.local 并测试
node -e "require('dotenv').config({ path: '.env.local' }); console.log('HTTP_PROXY:', process.env.HTTP_PROXY || '未设置'); console.log('HTTPS_PROXY:', process.env.HTTPS_PROXY || '未设置')"
```

## 推荐操作步骤

### 如果您使用 Clash 或类似 VPN

1. **查找代理端口**：
   - 打开 Clash 客户端
   - 查看 HTTP 代理端口（通常是 7890）
   - 或查看 SOCKS5 代理端口（通常是 7891）

2. **在 `.env.local` 中添加**：
   ```env
   HTTP_PROXY=http://127.0.0.1:7890
   HTTPS_PROXY=http://127.0.0.1:7890
   NO_PROXY=localhost,127.0.0.1
   ```

3. **重启开发服务器**：
   ```bash
   npm run dev
   ```

4. **测试**：
   - 访问 `http://localhost:3000/login`
   - 点击 Google 登录按钮
   - 应该能重定向到 Google 登录页面

### 如果您使用其他 VPN

1. **查看 VPN 客户端设置**，找到代理服务器地址和端口
2. **按照方案 2 的步骤配置**
3. **测试连接**

## 验证

### 验证 1：测试终端连接

```bash
# 设置代理（如果还没在 .env.local 中设置）
export HTTP_PROXY=http://your-proxy:port
export HTTPS_PROXY=http://your-proxy:port

# 测试
curl -I --max-time 10 https://accounts.google.com
```

### 验证 2：测试 Node.js 连接

创建 `test-google-connection.js`：

```javascript
require('dotenv').config({ path: '.env.local' })

const https = require('https')

console.log('HTTP_PROXY:', process.env.HTTP_PROXY || '未设置')
console.log('HTTPS_PROXY:', process.env.HTTPS_PROXY || '未设置')

const options = {
  hostname: 'accounts.google.com',
  path: '/',
  method: 'GET',
  timeout: 5000
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

运行：
```bash
node test-google-connection.js
```

## 常见问题

### Q: 如何知道我的 VPN 代理端口？

A: 
- 查看 VPN 客户端的设置/配置页面
- 查看系统网络设置中的代理配置
- 如果是 Clash，默认 HTTP 代理是 7890，SOCKS5 是 7891

### Q: 浏览器 VPN 扩展是否提供代理？

A: 大多数浏览器 VPN 扩展（如 Chrome 扩展）只影响浏览器流量，不提供系统级代理。需要使用系统级 VPN 客户端。

### Q: 如何确认代理是否生效？

A: 
1. 在终端运行 `curl -I --max-time 10 https://accounts.google.com`
2. 如果成功连接（看到 HTTP 响应），说明代理生效
3. 如果仍然超时，说明代理配置不正确或未生效

### Q: 使用 SOCKS5 代理需要额外配置吗？

A: 
- Node.js 的 `fetch` 和 `https` 模块默认支持 HTTP 代理（通过环境变量）
- 如果使用 SOCKS5 代理，可能需要安装 `socks-proxy-agent` 并修改代码
- 建议先尝试 HTTP 代理（如果 VPN 提供）

## 总结

**最佳方案**：使用系统级 VPN（方案 1）

**备选方案**：配置 Node.js 使用代理（方案 2）

**下一步**：
1. 选择适合您的方案
2. 按照步骤配置
3. 测试连接
4. 重启开发服务器
5. 测试 Google 登录

