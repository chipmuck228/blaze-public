# Google Maps API 设置指南

## 错误：This API project is not authorized to use this API

### 问题原因
这个错误通常是因为：
1. **Maps Embed API 没有被启用**
2. **API Key 的限制设置不正确**
3. **API Key 和项目不匹配**

### 解决步骤

#### 1. 启用 Maps Embed API

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 选择你的项目
3. 进入 **"API 和服务"** > **"库"**
4. 搜索 **"Maps Embed API"**
5. 点击进入，然后点击 **"启用"** 按钮

#### 2. 检查 API Key 设置

1. 进入 **"API 和服务"** > **"凭据"**
2. 找到你的 API Key，点击编辑
3. 检查 **"API 限制"**：
   - 选择 **"限制密钥"**
   - 确保勾选了 **"Maps Embed API"**
   - 如果还有其他限制，确保也包含 Maps Embed API

#### 3. 检查应用限制

在 API Key 编辑页面，检查 **"应用限制"**：
- 如果选择 **"HTTP 引荐来源网址（网站）"**，确保添加了：
  - `http://localhost:3000/*`
  - `https://yourdomain.com/*`（生产环境）
- 或者暂时选择 **"无"** 进行测试（不推荐用于生产环境）

#### 4. 等待生效

API 启用后可能需要几分钟才能生效。如果仍然报错，请等待 5-10 分钟后重试。

### 验证步骤

1. 在 Google Cloud Console 中，进入 **"API 和服务"** > **"已启用的 API"**
2. 确认以下 API 都已启用：
   - ✅ Maps Embed API
   - ✅ Maps JavaScript API（如果将来需要使用）

### 环境变量配置

在 `.env.local` 文件中添加：

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

### 测试

重启开发服务器后，访问首页的 "Our Locations" 部分，切换到 "Map" tab，应该能看到地图。

### 如果仍然无法使用

如果启用 API 后仍然无法使用，可以：
1. 检查浏览器控制台是否有其他错误信息
2. 确认 API Key 是否正确复制（没有多余的空格）
3. 检查 Google Cloud Console 中的 API 使用情况，看是否有错误日志
4. 考虑使用备用方案（见下方）

---

## 备用方案：使用静态地图或 OpenStreetMap

如果 Google Maps API 设置有问题，可以考虑使用：

### 方案 1：OpenStreetMap + Leaflet（免费，无需 API Key）

### 方案 2：静态地图图片

### 方案 3：简化地图视图（仅显示地址列表）

