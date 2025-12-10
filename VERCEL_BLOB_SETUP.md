# Vercel Blob Storage 设置指南

## 概述

团队成员头像现在使用 Vercel Blob Storage 进行存储，而不是本地文件路径。

## 设置步骤

### 1. 在 Vercel 中启用 Blob Storage

1. 登录到 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择您的项目
3. 进入 **Storage** 标签页
4. 点击 **Create Database** 或 **Add Storage**
5. 选择 **Blob** 存储类型
6. 创建 Blob 存储实例

### 2. 获取访问令牌

在 Vercel Dashboard 中：
1. 进入项目的 **Settings** → **Environment Variables**
2. 找到或创建 `BLOB_READ_WRITE_TOKEN` 环境变量
3. 复制令牌值

### 3. 配置环境变量

在项目的 `.env.local` 文件中添加：

```env
BLOB_READ_WRITE_TOKEN=your_token_here
```

**注意**：在生产环境中，Vercel 会自动从项目设置中读取环境变量，无需手动配置。

### 4. 验证配置

上传功能应该可以正常工作。如果遇到问题，请检查：

1. `BLOB_READ_WRITE_TOKEN` 环境变量是否正确设置
2. Vercel Blob Storage 是否已在项目中启用
3. API 路由 `/api/admin/teams/upload` 是否正常工作

## 功能特性

- ✅ 支持图片文件上传（JPG, PNG, GIF, WebP 等）
- ✅ 文件大小限制：最大 5MB
- ✅ 自动生成唯一文件名
- ✅ 图片预览功能
- ✅ 上传进度指示
- ✅ 错误处理和验证

## API 端点

### POST `/api/admin/teams/upload`

上传团队成员头像图片到 Vercel Blob Storage。

**请求**：
- Content-Type: `multipart/form-data`
- Body: FormData with `file` field

**响应**：
```json
{
  "url": "https://xxx.public.blob.vercel-storage.com/team-avatars/xxx.jpg"
}
```

**错误响应**：
```json
{
  "error": "Error message"
}
```

## 使用说明

1. 在 Admin 页面中，点击 "Add Team Member" 或编辑现有成员
2. 在 "Avatar Image" 字段中，点击文件选择按钮
3. 选择图片文件（最大 5MB）
4. 图片会自动上传到 Vercel Blob Storage
5. 上传成功后，会显示预览和上传后的 URL
6. 点击 "Save" 保存团队成员信息

## 故障排除

### 错误：`BLOB_READ_WRITE_TOKEN is not defined`

**解决方案**：
1. 确保在 Vercel Dashboard 中已创建 Blob Storage
2. 检查环境变量是否正确设置
3. 在本地开发时，确保 `.env.local` 文件包含 `BLOB_READ_WRITE_TOKEN`

### 错误：`Failed to upload file`

**可能原因**：
1. 文件大小超过 5MB
2. 文件类型不是图片
3. 网络连接问题
4. Vercel Blob Storage 配额已满

**解决方案**：
1. 检查文件大小和类型
2. 检查网络连接
3. 在 Vercel Dashboard 中检查存储配额

## 存储位置

所有上传的头像图片存储在：
```
team-avatars/{timestamp}-{random}.{extension}
```

例如：
```
team-avatars/1703123456789-abc123def456.jpg
```

## 注意事项

- 上传的图片是公开访问的（`access: "public"`）
- 图片 URL 会永久存储在数据库中
- 删除团队成员时，建议同时删除对应的 Blob 文件（需要额外实现）
- 定期清理未使用的图片可以节省存储空间

