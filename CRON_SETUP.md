# 后台任务配置说明

## 概述

课程注册系统需要定期执行后台任务来处理过期的注册和检查等待列表。本文档说明如何配置这些任务。

## 任务说明

### 1. 处理过期注册任务

**路径**: `/api/cron/process-expired-enrollments`

**功能**:
- 处理过期的 cart 状态注册（超过 15 分钟）
- 处理过期的 reserved 状态注册（超过 10 分钟）
- 处理过期的 waitlist 状态注册（超过 7 天或通知过期）
- 检查等待列表并发送通知

**建议频率**: 每 1-5 分钟执行一次

## 配置方法

### 方法 1: Vercel Cron Jobs（推荐）

如果项目部署在 Vercel，可以使用 Vercel Cron Jobs。

#### 步骤 1: 创建 `vercel.json`

项目根目录已包含 `vercel.json` 文件，配置如下：

```json
{
  "crons": [
    {
      "path": "/api/cron/process-expired-enrollments",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

这会将任务配置为每 5 分钟执行一次。

#### 步骤 2: 设置环境变量（可选但推荐）

在 Vercel 项目设置中添加 `CRON_SECRET` 环境变量，用于保护 cron 端点：

1. 进入 Vercel 项目设置
2. 选择 "Environment Variables"
3. 添加变量：
   - Key: `CRON_SECRET`
   - Value: 生成一个随机字符串（例如使用 `openssl rand -hex 32`）

#### 步骤 3: 更新 API 路由（如果需要）

如果设置了 `CRON_SECRET`，Vercel 会自动在请求头中添加 `x-vercel-cron` 头。你可以更新 `/api/cron/process-expired-enrollments/route.ts` 来验证这个头：

```typescript
// 验证 Vercel Cron 请求
const cronHeader = request.headers.get("x-vercel-cron")
if (!cronHeader) {
  // 如果不是 Vercel Cron，检查 Bearer token
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
```

#### 步骤 4: 部署

提交代码并推送到 Git，Vercel 会自动部署并启用 Cron Jobs。

### 方法 2: 外部 Cron 服务

如果不在 Vercel 上部署，可以使用外部 cron 服务（如 cron-job.org, EasyCron 等）。

#### 步骤 1: 设置环境变量

在你的部署环境中设置 `CRON_SECRET` 环境变量。

#### 步骤 2: 配置 Cron 服务

在 cron 服务中配置：

- **URL**: `https://your-domain.com/api/cron/process-expired-enrollments`
- **Method**: GET 或 POST
- **Headers**: 
  ```
  Authorization: Bearer YOUR_CRON_SECRET
  ```
- **Schedule**: `*/5 * * * *` (每 5 分钟)

### 方法 3: Supabase Edge Functions

如果使用 Supabase，可以创建 Edge Function 来调用 API。

#### 步骤 1: 创建 Edge Function

```typescript
// supabase/functions/process-expired-enrollments/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const cronSecret = Deno.env.get("CRON_SECRET")
  const apiUrl = Deno.env.get("API_URL") || "https://your-domain.com"
  
  const response = await fetch(`${apiUrl}/api/cron/process-expired-enrollments`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${cronSecret}`,
    },
  })
  
  const data = await response.json()
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  })
})
```

#### 步骤 2: 配置 Supabase Cron

在 Supabase Dashboard 中配置 PostgreSQL Cron：

```sql
-- 创建 cron job（每 5 分钟执行一次）
SELECT cron.schedule(
  'process-expired-enrollments',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/process-expired-enrollments',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  ) AS request_id;
  $$
);
```

## 测试

### 手动测试

你可以手动调用 API 来测试：

```bash
# 使用 curl
curl -X GET https://your-domain.com/api/cron/process-expired-enrollments \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# 或使用 Postman/Insomnia
```

### 查看日志

- **Vercel**: 在 Vercel Dashboard 的 "Functions" 标签页查看日志
- **Supabase**: 在 Supabase Dashboard 的 "Edge Functions" 标签页查看日志
- **其他**: 查看你的部署平台的日志

## 监控

建议设置监控来确保任务正常运行：

1. **健康检查**: 定期检查 API 是否可访问
2. **错误告警**: 如果任务失败，发送通知
3. **性能监控**: 跟踪任务执行时间

## 故障排除

### 任务未执行

1. 检查 `vercel.json` 是否正确配置
2. 检查 Vercel 项目设置中的 Cron Jobs 是否启用
3. 查看 Vercel 日志是否有错误

### 401 Unauthorized 错误

1. 检查 `CRON_SECRET` 环境变量是否正确设置
2. 检查请求头中的 Authorization 是否正确

### 任务执行但无效果

1. 检查数据库中是否有过期的注册
2. 检查数据库函数是否正常工作
3. 查看 API 日志了解详细错误信息

## 最佳实践

1. **频率设置**: 
   - Cart 过期时间：15 分钟 → 建议每 1-2 分钟执行
   - Reserved 过期时间：10 分钟 → 建议每 1-2 分钟执行
   - Waitlist 检查：建议每 5 分钟执行

2. **错误处理**: 
   - 任务应该优雅地处理错误，不会因为单个错误而停止
   - 记录所有错误以便调试

3. **性能优化**:
   - 如果数据量很大，考虑分批处理
   - 使用数据库索引优化查询

4. **安全性**:
   - 始终使用 `CRON_SECRET` 保护端点
   - 不要在生产环境中暴露 cron 端点给未授权用户

## 相关文件

- `/api/cron/process-expired-enrollments/route.ts` - Cron API 路由
- `/api/admin/enrollments/process-expired/route.ts` - 管理员手动触发端点
- `vercel.json` - Vercel Cron 配置
- `src/lib/db.ts` - 数据库函数（`processExpiredEnrollments`, `checkWaitlistAndNotify`）

