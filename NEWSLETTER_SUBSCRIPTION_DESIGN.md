# Newsletter 订阅功能设计方案

## 一、概述

本方案实现完整的 Newsletter 订阅功能，包括用户订阅、订阅管理、Newsletter 内容编辑和发送功能。支持一键发送和定时发送两种发送方式。同时提供完整的用户退订流程，确保符合邮件营销法规要求（如 GDPR、CAN-SPAM）。

## 二、数据库设计

### 2.1 表结构设计

#### 2.1.1 newsletter_subscribers（订阅者表）

存储所有订阅用户的邮箱信息。

```sql
CREATE TABLE newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  unsubscribe_token TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_newsletter_subscribers_email ON newsletter_subscribers(email);
CREATE INDEX idx_newsletter_subscribers_active ON newsletter_subscribers(is_active, subscribed_at);
CREATE INDEX idx_newsletter_subscribers_unsubscribe_token ON newsletter_subscribers(unsubscribe_token);

-- 注释
COMMENT ON TABLE newsletter_subscribers IS 'Newsletter 订阅者列表';
COMMENT ON COLUMN newsletter_subscribers.email IS '订阅者邮箱地址';
COMMENT ON COLUMN newsletter_subscribers.is_active IS '是否处于订阅状态';
COMMENT ON COLUMN newsletter_subscribers.unsubscribe_token IS '退订令牌，用于退订链接';
```

#### 2.1.2 newsletter_templates（Newsletter 模板表）

存储 Newsletter 的内容模板，支持编辑和版本管理。

```sql
CREATE TABLE newsletter_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  content_html TEXT NOT NULL,
  content_text TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_newsletter_templates_active ON newsletter_templates(is_active, created_at);

-- 注释
COMMENT ON TABLE newsletter_templates IS 'Newsletter 内容模板';
COMMENT ON COLUMN newsletter_templates.name IS '模板名称';
COMMENT ON COLUMN newsletter_templates.subject IS '邮件主题';
COMMENT ON COLUMN newsletter_templates.content_html IS 'HTML 格式的邮件内容';
COMMENT ON COLUMN newsletter_templates.content_text IS '纯文本格式的邮件内容（可选）';
```

#### 2.1.3 newsletter_campaigns（Newsletter 发送记录表）

记录每次 Newsletter 的发送任务和状态。

```sql
CREATE TABLE newsletter_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES newsletter_templates(id),
  subject TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled'
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_newsletter_campaigns_status ON newsletter_campaigns(status, scheduled_at);
CREATE INDEX idx_newsletter_campaigns_template ON newsletter_campaigns(template_id);
CREATE INDEX idx_newsletter_campaigns_created_by ON newsletter_campaigns(created_by);

-- 注释
COMMENT ON TABLE newsletter_campaigns IS 'Newsletter 发送任务记录';
COMMENT ON COLUMN newsletter_campaigns.status IS '发送状态：draft(草稿), scheduled(已计划), sending(发送中), sent(已发送), failed(失败), cancelled(已取消)';
COMMENT ON COLUMN newsletter_campaigns.scheduled_at IS '计划发送时间（用于定时发送）';
COMMENT ON COLUMN newsletter_campaigns.sent_at IS '实际发送时间';
```

#### 2.1.4 newsletter_sends（Newsletter 发送详情表）

记录每封邮件的发送详情，用于追踪和统计。

```sql
CREATE TABLE newsletter_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES newsletter_campaigns(id) ON DELETE CASCADE,
  subscriber_id UUID REFERENCES newsletter_subscribers(id),
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'bounced'
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  is_permanent_failure BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_newsletter_sends_campaign ON newsletter_sends(campaign_id);
CREATE INDEX idx_newsletter_sends_subscriber ON newsletter_sends(subscriber_id);
CREATE INDEX idx_newsletter_sends_status ON newsletter_sends(status);

-- 索引
CREATE INDEX idx_newsletter_sends_status ON newsletter_sends(status);
CREATE INDEX idx_newsletter_sends_failed ON newsletter_sends(status, created_at) WHERE status = 'failed';
CREATE INDEX idx_newsletter_sends_campaign_status ON newsletter_sends(campaign_id, status);

-- 注释
COMMENT ON TABLE newsletter_sends IS 'Newsletter 发送详情记录';
COMMENT ON COLUMN newsletter_sends.status IS '发送状态：pending(待发送), sent(已发送), failed(失败), bounced(退回)';
COMMENT ON COLUMN newsletter_sends.error_message IS '失败原因（当 status = failed 时）';
COMMENT ON COLUMN newsletter_sends.retry_count IS '重试次数，用于限制重试次数';
COMMENT ON COLUMN newsletter_sends.last_retry_at IS '最后重试时间';
COMMENT ON COLUMN newsletter_sends.is_permanent_failure IS '是否为永久失败（如邮箱地址无效），永久失败的邮件不应再重试';
```

### 2.2 数据库迁移脚本

创建迁移文件：`migrate-add-newsletter-tables.sql`

## 三、API 设计

### 3.1 公开 API（无需认证）

#### 3.1.1 POST /api/public/newsletter/subscribe

用户订阅 Newsletter。

**请求体：**
```json
{
  "email": "user@example.com"
}
```

**响应：**
```json
{
  "success": true,
  "message": "Successfully subscribed to newsletter"
}
```

**错误响应：**
```json
{
  "error": "Email already subscribed"
}
```

**实现逻辑：**
1. 验证邮箱格式
2. 检查是否已订阅
3. 创建订阅记录（新订阅）或更新订阅记录（重新订阅）
4. **自动发送欢迎邮件**（异步，不阻塞响应）：
   - 新订阅：发送"Welcome to Our Newsletter!"邮件
   - 重新订阅：发送"Welcome Back to Our Newsletter!"邮件
   - 邮件包含退订链接（使用 `unsubscribe_token`）
   - HTML 格式，响应式设计
5. 返回成功响应

**欢迎邮件内容：**
- 欢迎信息和感谢
- 期望内容说明（最新更新、独家内容、特别优惠、技巧和最佳实践）
- 退订链接（自动添加）
- 品牌风格和设计

**错误处理：**
- 邮件发送失败不影响订阅成功
- 记录错误日志但不抛出异常

#### 3.1.2 GET /api/public/newsletter/unsubscribe?token={token}

用户退订 Newsletter（通过邮件中的退订链接）。

**查询参数：**
- `token`: 退订令牌（必需）

**响应（成功）：**
```json
{
  "success": true,
  "message": "Successfully unsubscribed",
  "email": "user@example.com"
}
```

**响应（失败）：**
```json
{
  "error": "Invalid or expired unsubscribe token"
}
```

**错误情况：**
- Token 不存在
- Token 已使用（用户已退订）
- Token 格式错误

**实现逻辑：**
1. 验证 token 格式
2. 查询 `newsletter_subscribers` 表，查找匹配的 `unsubscribe_token`
3. 检查订阅者状态：
   - 如果 `is_active = false`，返回"已退订"错误
   - 如果 `is_active = true`，执行退订操作
4. 更新记录：
   - `is_active = false`
   - `unsubscribed_at = NOW()`
   - `updated_at = NOW()`
5. 返回成功响应

#### 3.1.3 GET /api/public/newsletter/information-clause

获取信息保护条款内容（用于弹窗显示）。

**响应：**
```json
{
  "title": "Information Clause",
  "content": "..."
}
```

### 3.2 Admin API（需要认证）

#### 3.2.1 GET /api/admin/newsletter/subscribers

获取订阅者列表（支持分页和搜索）。

**查询参数：**
- `page`: 页码（默认 1）
- `limit`: 每页数量（默认 20）
- `search`: 搜索关键词（邮箱）
- `is_active`: 是否活跃（true/false）

**响应：**
```json
{
  "subscribers": [
    {
      "id": "...",
      "email": "...",
      "subscribed_at": "...",
      "is_active": true
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

#### 3.2.2 DELETE /api/admin/newsletter/subscribers/[id]

删除订阅者（软删除，设置 is_active = false）。

#### 3.2.3 GET /api/admin/newsletter/templates

获取所有 Newsletter 模板。

**响应：**
```json
{
  "templates": [
    {
      "id": "...",
      "name": "...",
      "subject": "...",
      "is_active": true,
      "created_at": "..."
    }
  ]
}
```

#### 3.2.4 GET /api/admin/newsletter/templates/[id]

获取单个模板详情。

#### 3.2.5 POST /api/admin/newsletter/templates

创建新模板。

**请求体：**
```json
{
  "name": "Monthly Newsletter",
  "subject": "Latest Updates",
  "content_html": "<html>...</html>",
  "content_text": "Plain text version"
}
```

#### 3.2.6 PUT /api/admin/newsletter/templates/[id]

更新模板。

#### 3.2.7 DELETE /api/admin/newsletter/templates/[id]

删除模板。

#### 3.2.8 GET /api/admin/newsletter/campaigns

获取发送任务列表。

**查询参数：**
- `page`: 页码
- `limit`: 每页数量
- `status`: 状态筛选

#### 3.2.9 POST /api/admin/newsletter/campaigns/send

立即发送 Newsletter。

**请求体：**
```json
{
  "template_id": "...",
  "subject": "Custom Subject (可选，覆盖模板主题)",
  "test_email": "test@example.com (可选，测试发送)"
}
```

**响应：**
```json
{
  "campaign_id": "...",
  "status": "sending",
  "total_recipients": 100
}
```

#### 3.2.10 POST /api/admin/newsletter/campaigns/schedule

定时发送 Newsletter。

**请求体：**
```json
{
  "template_id": "...",
  "subject": "Custom Subject (可选)",
  "scheduled_at": "2024-12-25T10:00:00Z"
}
```

**响应：**
```json
{
  "campaign_id": "...",
  "status": "scheduled",
  "scheduled_at": "..."
}
```

#### 3.2.11 GET /api/admin/newsletter/campaigns/[id]

获取发送任务详情（包括发送统计）。

#### 3.2.12 POST /api/admin/newsletter/campaigns/[id]/cancel

取消已计划的发送任务。

#### 3.2.13 GET /api/admin/newsletter/failed-sends

获取失败邮件列表。

**查询参数：**
- `page`: 页码（默认 1）
- `limit`: 每页数量（默认 20）
- `campaign_id`: 筛选特定 campaign（可选）
- `email`: 搜索邮箱（可选）
- `start_date`: 开始日期（可选）
- `end_date`: 结束日期（可选）

**响应：**
```json
{
  "failed_sends": [
    {
      "id": "...",
      "campaign_id": "...",
      "campaign_subject": "Monthly Newsletter",
      "subscriber_id": "...",
      "email": "user@example.com",
      "status": "failed",
      "error_message": "SMTP connection timeout",
      "created_at": "2024-01-15T10:00:00Z",
      "retry_count": 0
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

#### 3.2.14 POST /api/admin/newsletter/failed-sends/retry

重发失败的邮件。

**请求体：**
```json
{
  "send_ids": ["id1", "id2", "id3"],  // 要重发的 send ID 列表
  "campaign_id": "..."  // 可选：重发整个 campaign 的所有失败邮件
}
```

**响应：**
```json
{
  "success": true,
  "retried_count": 3,
  "failed_count": 0,
  "message": "Successfully retried 3 failed emails"
}
```

**错误响应：**
```json
{
  "error": "Some emails failed to retry",
  "retried_count": 2,
  "failed_count": 1,
  "failed_sends": [
    {
      "send_id": "id3",
      "error": "Subscriber no longer active"
    }
  ]
}
```

#### 3.2.15 GET /api/admin/newsletter/failed-sends/stats

获取失败邮件统计信息。

**查询参数：**
- `start_date`: 开始日期（可选）
- `end_date`: 结束日期（可选）

**响应：**
```json
{
  "total_failed": 150,
  "failed_by_reason": {
    "SMTP connection timeout": 45,
    "Invalid email address": 30,
    "Mailbox full": 25,
    "DNS resolution failed": 20,
    "Other": 30
  },
  "failed_by_campaign": [
    {
      "campaign_id": "...",
      "campaign_subject": "Monthly Newsletter",
      "failed_count": 50
    }
  ],
  "recent_failures": [
    {
      "date": "2024-01-15",
      "count": 10
    }
  ]
}
```

## 四、前端组件设计

### 4.1 退订页面组件

**文件：** `src/app/newsletter/unsubscribe/page.tsx`（新建）

**功能：**
1. 从 URL 参数获取 `token`
2. 调用退订 API
3. 显示退订结果
4. 提供重新订阅选项

**状态管理：**
- `token`: URL 参数中的 token
- `status`: 'loading' | 'success' | 'error'
- `error`: 错误信息
- `email`: 退订的邮箱（成功时显示）

**UI 设计：**
- 居中布局
- 清晰的视觉反馈（成功/失败图标）
- 友好的错误提示
- 重新订阅按钮（成功时显示）

**页面结构：**
```tsx
<div className="min-h-screen flex items-center justify-center">
  <Card>
    {status === 'loading' && <LoadingState />}
    {status === 'success' && <SuccessState email={email} />}
    {status === 'error' && <ErrorState error={error} />}
  </Card>
</div>
```

**成功状态显示：**
- ✓ 成功图标
- "您已成功退订 Newsletter"
- 退订的邮箱地址
- "我们很抱歉看到您离开。如果您改变主意，可以随时重新订阅。"
- [重新订阅] 按钮（跳转到首页）

**错误状态显示：**
- ✗ 错误图标
- 错误消息（根据错误类型显示不同消息）
- "请检查链接是否正确，或联系客服。"

### 4.2 Newsletter 组件更新

**文件：** `src/components/Newsletter.tsx`

**功能：**
1. 订阅表单提交
2. 使用 Sonner 显示成功/失败提示
3. Information clause 弹窗

**状态管理：**
- `email`: 邮箱地址
- `consent`: 同意状态
- `isSubmitting`: 提交状态

**交互流程：**
1. 用户输入邮箱
2. 勾选同意复选框
3. 点击 Subscribe 按钮
4. 调用 API 提交订阅
5. 显示 Sonner 提示（成功/失败）
6. 重置表单

### 4.3 Information Clause 弹窗组件

**文件：** `src/components/InformationClauseDialog.tsx`（新建）

**功能：**
- 显示信息保护条款内容
- 使用 Dialog 组件实现弹窗
- 从 API 获取条款内容

**Props：**
```typescript
interface InformationClauseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}
```

### 4.4 Sonner Toast 配置

**文件：** `src/app/layout.tsx`

**需要添加：**
```tsx
import { Toaster } from "sonner"

// 在组件中添加
<Toaster position="top-center" richColors />
```

## 五、Admin 页面设计

### 5.1 订阅者列表页面

**路径：** `/admin/newsletter/subscribers`

**功能：**
1. 显示订阅者列表（表格）
2. 搜索功能（按邮箱）
3. 筛选功能（活跃/非活跃）
4. 分页功能
5. 删除订阅者（软删除）
6. 导出 CSV 功能（可选）

**表格列：**
- Email
- Subscribed At
- Status (Active/Inactive)
- Actions (Delete)

### 5.2 Newsletter 模板管理页面

**路径：** `/admin/newsletter/templates`

**功能：**
1. 模板列表（卡片或表格）
2. 创建新模板
3. 编辑模板
4. 删除模板
5. 预览模板
6. 设置活动模板

**模板编辑器：**
- 使用 TipTap 富文本编辑器
- 支持 HTML 编辑
- 预览功能
- 变量占位符支持（如 `{{unsubscribe_link}}`）

**模板字段：**
- Name（模板名称）
- Subject（邮件主题）
- Content HTML（HTML 内容）
- Content Text（纯文本内容，可选）

### 5.3 Newsletter 发送页面

**路径：** `/admin/newsletter/send`

**功能：**
1. 选择模板
2. 预览邮件内容
3. 选择发送方式：
   - 立即发送
   - 定时发送（选择日期时间）
4. 测试发送（发送到指定邮箱）
5. 发送统计显示

**发送流程：**
1. 选择模板
2. 预览内容
3. 选择发送方式
4. 确认发送
5. 显示发送进度/状态

### 5.4 发送历史页面

**路径：** `/admin/newsletter/campaigns`

**功能：**
1. 显示所有发送任务
2. 状态筛选
3. 查看发送详情
4. 取消已计划的发送
5. 发送统计（成功率、打开率等）

**表格列：**
- Template Name
- Subject
- Status
- Scheduled At / Sent At
- Recipients
- Success Rate
- Actions

## 六、后台任务设计

### 6.1 定时发送任务

**实现方式：**
- 使用 Vercel Cron Jobs 或 Supabase Edge Functions Cron
- 定期检查 `newsletter_campaigns` 表中 `status = 'scheduled'` 且 `scheduled_at <= NOW()` 的记录
- 执行发送任务

**Cron 配置：**
- 频率：每分钟检查一次（或每 5 分钟）
- 路径：`/api/cron/newsletter-send`

### 6.2 发送任务执行流程

1. 查询待发送的 campaign
2. 查询活跃的订阅者列表
3. 为每个订阅者创建 `newsletter_sends` 记录（status = 'pending'）
4. 批量发送邮件（使用队列或并发控制）
5. 更新发送状态
6. 更新 campaign 统计信息

### 6.3 邮件发送服务

**使用现有邮件服务：**
- 复用 `src/lib/email.ts` 中的邮件发送功能
- 或集成第三方服务（如 SendGrid、Mailgun）

**邮件内容处理：**
- 替换变量占位符（如 `{{unsubscribe_link}}`）
- 生成退订链接（包含 unsubscribe_token）
- 支持 HTML 和纯文本两种格式

**退订链接生成逻辑：**
```typescript
// 伪代码
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const unsubscribeLink = `${baseUrl}/newsletter/unsubscribe?token=${subscriber.unsubscribe_token}`

// 在邮件模板中替换占位符
const emailContent = template.content_html.replace(
  /{{unsubscribe_link}}/g,
  unsubscribeLink
)
```

**邮件模板变量：**
- `{{unsubscribe_link}}`：退订链接（必需）
- `{{preferences_link}}`：偏好设置链接（可选，未来功能）
- `{{user_email}}`：用户邮箱（可选）

## 七、功能流程设计

### 7.1 用户订阅流程

```
用户访问首页
  ↓
看到 Newsletter 组件
  ↓
输入邮箱地址
  ↓
勾选同意复选框
  ↓
点击 Subscribe 按钮
  ↓
前端验证（邮箱格式、同意状态）
  ↓
调用 POST /api/public/newsletter/subscribe
  ↓
后端验证邮箱格式
  ↓
检查是否已订阅
  ↓
创建订阅记录（生成 unsubscribe_token）
  ↓
异步发送欢迎邮件（包含退订链接）
  ↓
返回成功响应
  ↓
前端显示 Sonner 成功提示
  ↓
重置表单
```

**欢迎邮件功能：**
- **新订阅时**：自动发送欢迎邮件，包含：
  - 欢迎信息和感谢
  - 期望内容说明（最新更新、独家内容、特别优惠、技巧和最佳实践）
  - 退订链接（使用用户的 `unsubscribe_token`）
- **重新订阅时**：发送"欢迎回来"邮件
- **邮件格式**：HTML 格式，响应式设计
- **发送方式**：异步发送，不阻塞订阅响应
- **错误处理**：发送失败不影响订阅成功

### 7.2 信息条款查看流程

```
用户点击 "information clause" 链接
  ↓
打开 InformationClauseDialog
  ↓
调用 GET /api/public/newsletter/information-clause
  ↓
显示条款内容
  ↓
用户关闭弹窗
```

### 7.3 Admin 发送 Newsletter 流程

#### 7.3.1 立即发送

```
Admin 进入发送页面
  ↓
选择模板
  ↓
预览邮件内容
  ↓
（可选）测试发送到指定邮箱
  ↓
点击 "Send Now"
  ↓
确认对话框
  ↓
调用 POST /api/admin/newsletter/campaigns/send
  ↓
创建 campaign 记录（status = 'sending'）
  ↓
查询活跃订阅者
  ↓
创建发送记录（newsletter_sends）
  ↓
立即显示进度条（0%）
  ↓
建立 SSE 连接，实时推送进度
  ↓
批量发送邮件（异步处理）
  ↓
每发送10封或每10%进度更新一次 campaign 进度
  ↓
SSE 每2秒推送进度更新到前端
  ↓
前端实时显示进度（已发送/失败数量、百分比）
  ↓
发送完成后更新 campaign 状态
  ↓
创建通知记录（newsletter_sent 或 newsletter_failed）
  ↓
SSE 推送完成事件
  ↓
前端显示完成状态
  ↓
用户可通过通知中心查看详细结果
```

**实时进度显示功能：**
- **立即显示**：点击发送后立即显示进度条（0%）
- **实时更新**：SSE 每2秒推送进度更新
- **进度信息**：
  - 进度条（百分比）
  - 已发送数量
  - 失败数量
  - 总收件人数
  - 发送状态（sending/sent/failed）
- **用户提示**：发送中显示"You can leave this page and check back later"

**用户离开页面后返回功能：**
- **自动恢复**：页面加载时检查是否有正在发送的 campaign
- **恢复进度**：如果有，自动恢复进度显示并重新连接 SSE
- **状态同步**：用户可以随时返回查看发送进度

**遗留 Campaign 检测和修复：**
- **检测机制**：页面加载时检查 campaign 创建时间
  - 如果创建超过30分钟且没有进度（`sent_count === 0 && failed_count === 0`），判定为卡住
  - 如果所有邮件已处理但状态仍为 "sending"，判定为状态不一致
- **修复策略**：
  - 卡住的 campaign：不恢复状态显示，避免误导用户
  - 状态不一致的 campaign：不恢复状态显示，让 SSE 流自动修复
- **自动修复**：SSE 流检测到异常状态时自动修复
  - 所有邮件已处理但状态仍为 "sending" → 自动更新状态并发送 `completed` 事件
  - 卡住的 campaign → 自动标记为 "failed" 并发送 `completed` 事件

**发送结果异步通知：**
- **通知类型**：
  - `newsletter_sent`：发送成功
  - `newsletter_failed`：发送失败
- **通知内容**：
  - Campaign ID
  - 邮件主题
  - 发送统计（总数、成功数、失败数）
- **通知显示**：通过通知中心显示，不在发送页面显示 toast

#### 7.3.2 定时发送

```
Admin 进入发送页面
  ↓
选择模板
  ↓
预览邮件内容
  ↓
选择 "Schedule Send"
  ↓
选择日期和时间
  ↓
点击 "Schedule"
  ↓
调用 POST /api/admin/newsletter/campaigns/schedule
  ↓
创建 campaign 记录（status = 'scheduled', scheduled_at）
  ↓
返回成功响应
  ↓
显示计划成功提示
  ↓
定时任务在指定时间执行发送
```

### 7.4 用户退订流程

#### 7.4.1 退订链接生成

**在邮件模板中：**
- 使用占位符 `{{unsubscribe_link}}`
- 发送邮件时，系统自动替换为完整的退订链接
- 链接格式：`{BASE_URL}/newsletter/unsubscribe?token={unsubscribe_token}`

**链接示例：**
```
https://blazerobotics.com/newsletter/unsubscribe?token=abc123def456...
```

#### 7.4.2 退订页面设计

**路径：** `/newsletter/unsubscribe`

**功能：**
1. 从 URL 参数获取 `token`
2. 调用 API 验证 token 并执行退订
3. 显示退订结果页面

**页面状态：**
- **加载中**：显示加载动画
- **成功**：显示退订成功消息和重新订阅选项
- **失败**：显示错误信息（token 无效、已退订等）

**页面内容：**
```
┌─────────────────────────────────────┐
│  Newsletter Unsubscribe              │
├─────────────────────────────────────┤
│                                     │
│  [加载中/成功/失败状态]              │
│                                     │
│  成功时显示：                        │
│  ✓ 您已成功退订 Newsletter           │
│                                      │
│  我们很抱歉看到您离开。               │
│  如果您改变主意，可以随时重新订阅。   │
│                                      │
│  [重新订阅按钮]                      │
│                                      │
│  失败时显示：                        │
│  ✗ 退订链接无效或已过期              │
│                                      │
│  请检查链接是否正确，或联系客服。    │
│                                     │
└─────────────────────────────────────┘
```

#### 7.4.3 退订流程详细步骤

```
用户收到 Newsletter 邮件
  ↓
邮件底部包含退订链接
  ↓
用户点击退订链接
  ↓
浏览器打开：/newsletter/unsubscribe?token={token}
  ↓
前端页面加载，显示加载状态
  ↓
调用 GET /api/public/newsletter/unsubscribe?token={token}
  ↓
后端验证 token：
  - 查询 newsletter_subscribers 表
  - 检查 token 是否存在
  - 检查订阅者是否已退订
  ↓
如果 token 有效且未退订：
  - 更新 is_active = false
  - 设置 unsubscribed_at = NOW()
  - 返回成功响应
  ↓
如果 token 无效或已退订：
  - 返回错误响应
  ↓
前端根据响应显示结果：
  - 成功：显示退订成功页面
  - 失败：显示错误信息
  ↓
（可选）提供重新订阅功能
```

#### 7.4.4 重新订阅功能

**场景：**
- 用户误操作退订
- 用户改变主意想重新订阅

**实现方式：**
1. 在退订成功页面提供"重新订阅"按钮
2. 点击后跳转到首页的 Newsletter 订阅组件
3. 用户输入邮箱并重新订阅
4. 系统检测到是重新订阅，更新现有记录而非创建新记录

#### 7.4.5 退订邮件模板要求

**在邮件模板中必须包含：**
- 退订链接（使用 `{{unsubscribe_link}}` 占位符）
- 链接应清晰可见，但不应过于突出
- 建议位置：邮件底部

**HTML 模板示例：**
```html
<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; font-size: 12px; color: #666;">
  <p>
    You are receiving this email because you subscribed to our newsletter.
    <br>
    <a href="{{unsubscribe_link}}" style="color: #666; text-decoration: underline;">
      Unsubscribe
    </a>
    | 
    <a href="{{preferences_link}}" style="color: #666; text-decoration: underline;">
      Update Preferences
    </a>
  </p>
</div>
```

#### 7.4.6 退订统计和分析

**记录退订信息：**
- `unsubscribed_at`：退订时间
- `is_active`：订阅状态（false 表示已退订）

**统计指标：**
- 退订率 = 退订人数 / 总订阅人数
- 退订趋势（按时间统计）
- 退订原因（可选，通过调查问卷收集）

#### 7.4.7 退订后处理

**立即生效：**
- 用户退订后，`is_active` 立即设置为 `false`
- 后续发送的 Newsletter 会自动排除已退订用户

**数据保留：**
- 保留订阅记录（不删除）
- 保留退订时间戳
- 用于统计分析和合规要求

**重新订阅：**
- 用户可以通过首页重新订阅
- 系统检测到已存在的邮箱，更新 `is_active = true`
- 重置 `unsubscribed_at = NULL`

## 八、用户退订功能详细设计

### 8.1 退订 Token 设计

#### 8.1.1 Token 生成
- **生成时机**：用户订阅时自动生成
- **生成方式**：使用 `crypto.randomBytes(32).toString('hex')` 生成 64 字符的随机字符串
- **唯一性**：数据库 `UNIQUE` 约束确保每个 token 唯一
- **存储**：存储在 `newsletter_subscribers.unsubscribe_token` 字段

#### 8.1.2 Token 安全性
- **不可猜测**：使用加密安全的随机数生成器
- **足够长度**：64 字符（32 字节的十六进制表示）
- **唯一性保证**：数据库唯一约束
- **不包含敏感信息**：token 本身不包含邮箱或其他个人信息

#### 8.1.3 Token 有效期（可选增强）
- **当前设计**：token 永久有效（简化实现）
- **未来增强**：可以添加过期时间字段
  ```sql
  ALTER TABLE newsletter_subscribers
  ADD COLUMN unsubscribe_token_expires_at TIMESTAMP WITH TIME ZONE;
  ```

### 8.2 退订 API 详细设计

#### 8.2.1 GET /api/public/newsletter/unsubscribe

**实现逻辑：**
```typescript
1. 从查询参数获取 token
2. 验证 token 格式（64 字符十六进制）
3. 查询数据库：
   SELECT * FROM newsletter_subscribers 
   WHERE unsubscribe_token = token
4. 检查结果：
   - 如果不存在：返回 "Invalid token"
   - 如果 is_active = false：返回 "Already unsubscribed"
   - 如果 is_active = true：执行退订
5. 更新数据库：
   UPDATE newsletter_subscribers
   SET 
     is_active = false,
     unsubscribed_at = NOW(),
     updated_at = NOW()
   WHERE unsubscribe_token = token
6. 返回成功响应（包含邮箱地址）
```

**错误处理：**
- Token 缺失：返回 400 Bad Request
- Token 无效：返回 404 Not Found
- 已退订：返回 400 Bad Request（友好提示）
- 数据库错误：返回 500 Internal Server Error

### 8.3 退订页面设计

#### 8.3.1 页面路由

**路径：** `/newsletter/unsubscribe`

**文件：** `src/app/newsletter/unsubscribe/page.tsx`

#### 8.3.2 页面状态

**加载状态：**
- 显示加载动画
- 提示："正在处理退订请求..."

**成功状态：**
- 显示成功图标（✓）
- 显示成功消息："您已成功退订 Newsletter"
- 显示退订的邮箱地址
- 提供重新订阅按钮（跳转到首页）

**失败状态：**
- 显示错误图标（✗）
- 显示错误消息：
  - "退订链接无效或已过期"
  - "您已经退订了 Newsletter"
  - "发生错误，请稍后重试"
- 提供联系客服选项

#### 8.3.3 UI 设计规范

**布局：**
- 居中卡片布局
- 最大宽度：500px
- 响应式设计（移动端友好）

**颜色方案：**
- 成功：绿色主题
- 错误：红色主题
- 加载：蓝色/灰色主题

**交互元素：**
- 重新订阅按钮：主要按钮样式，跳转到首页
- 联系客服链接：次要链接样式

### 8.4 邮件中的退订链接

#### 8.4.1 链接位置

**建议位置：**
- 邮件底部
- 清晰可见但不突出
- 符合邮件营销最佳实践

#### 8.4.2 链接样式

**HTML 示例：**
```html
<div style="margin-top: 40px; padding: 20px; border-top: 1px solid #e0e0e0; text-align: center; font-size: 12px; color: #666;">
  <p style="margin: 0 0 10px 0;">
    You are receiving this email because you subscribed to our newsletter.
  </p>
  <p style="margin: 0;">
    <a href="{{unsubscribe_link}}" style="color: #666; text-decoration: underline;">
      Unsubscribe from this list
    </a>
  </p>
</div>
```

**纯文本版本：**
```
---
You are receiving this email because you subscribed to our newsletter.
To unsubscribe, visit: {{unsubscribe_link}}
```

#### 8.4.3 链接生成时机

**在发送邮件时：**
1. 查询订阅者的 `unsubscribe_token`
2. 构建完整 URL：`{BASE_URL}/newsletter/unsubscribe?token={token}`
3. 替换模板中的 `{{unsubscribe_link}}` 占位符
4. 发送邮件

### 8.5 退订后处理逻辑

#### 8.5.1 立即生效

**退订操作：**
- 设置 `is_active = false`
- 记录 `unsubscribed_at` 时间戳
- 更新 `updated_at` 时间戳

**后续发送：**
- 查询活跃订阅者时自动排除 `is_active = false` 的记录
- 确保已退订用户不会收到新的 Newsletter

#### 8.5.2 数据保留

**保留数据的原因：**
- 合规要求（GDPR、CAN-SPAM）
- 统计分析需要
- 防止重复订阅

**保留的数据：**
- 邮箱地址
- 订阅时间
- 退订时间
- 订阅历史记录

#### 8.5.3 重新订阅流程

**检测逻辑：**
- 用户重新订阅时，检查邮箱是否已存在
- 如果存在且 `is_active = false`，执行重新订阅：
  - 设置 `is_active = true`
  - 重置 `unsubscribed_at = NULL`
  - 更新 `subscribed_at = NOW()`
  - 生成新的 `unsubscribe_token`（可选，或复用旧的）

**用户体验：**
- 显示"欢迎回来"消息
- 不需要重新验证邮箱（如果之前已验证）

### 8.6 退订统计和分析

#### 8.6.1 统计指标

**基础指标：**
- 总订阅人数
- 活跃订阅人数
- 退订人数
- 退订率 = 退订人数 / 总订阅人数

**时间维度：**
- 每日退订数
- 每周退订数
- 每月退订数
- 退订趋势图

**分析维度：**
- 按时间段分析（哪些时间段退订率高）
- 按邮件主题分析（哪些主题导致更多退订）
- 按订阅时长分析（新订阅者 vs 老订阅者）

#### 8.6.2 Admin 统计页面（可选）

**功能：**
- 显示退订统计图表
- 退订趋势分析
- 导出退订数据（CSV）

**路径：** `/admin/newsletter/analytics`（未来功能）

## 九、安全考虑

### 9.1 邮箱验证
- 前端和后端双重验证邮箱格式
- 防止恶意输入

### 9.2 退订安全
- 使用唯一 token 进行退订
- Token 存储在数据库中，不可猜测
- Token 长度足够（64 字符）
- Token 不包含敏感信息
- Token 有效期管理（可选，当前为永久有效）

### 9.3 退订链接安全
- HTTPS 传输（生产环境）
- Token 在 URL 中传递（GET 请求）
- 考虑使用 POST 请求（未来增强）
- 记录退订操作日志（可选）

### 9.4 防止滥用
- Token 一次性使用（可选，当前设计允许重复使用）
- Rate limiting（防止暴力破解 token）
- 记录失败的退订尝试

### 9.5 发送限制
- 防止批量发送滥用
- 实现发送速率限制
- 监控发送失败率

### 9.6 数据保护
- 订阅者邮箱数据加密存储（可选）
- 符合 GDPR 要求
- 提供数据导出和删除功能
- 退订数据保留（符合合规要求）

### 9.7 合规性要求

#### 9.7.1 GDPR 合规
- **退订权利**：用户有权随时退订
- **数据保留**：保留退订记录（合规要求）
- **数据访问**：用户可以请求查看自己的订阅数据
- **数据删除**：用户可以请求删除自己的数据（可选功能）

#### 9.7.2 CAN-SPAM 合规
- **退订链接**：每封邮件必须包含退订链接
- **退订处理**：10 个工作日内处理退订请求（本系统为立即处理）
- **退订后停止发送**：退订后不再发送邮件
- **退订链接可见性**：链接必须清晰可见

## 十、实施优先级

### 高优先级（MVP）
1. ✅ 数据库表结构创建
2. ✅ 用户订阅 API 和前端
3. ✅ Information clause 弹窗
4. ✅ Admin 订阅者列表查看
5. ✅ Admin 模板管理（基础）
6. ✅ 立即发送功能
7. ✅ **用户退订 API**
8. ✅ **退订页面组件**
9. ✅ **邮件中退订链接生成**

### 中优先级
1. ✅ Admin 模板编辑器（富文本）
2. ✅ 定时发送功能
3. ✅ 发送历史查看
4. ✅ 发送统计
5. ✅ 退订统计和分析
6. **失败邮件追踪和重发功能**（新增）
   - 失败邮件列表查看
   - 失败原因显示和分析
   - 单个/批量重发功能
   - 失败统计图表
   - 智能重试机制（避免永久失败邮件重复重试）

### 低优先级
1. 邮件模板变量系统（扩展）
2. A/B 测试功能
3. 邮件打开率追踪
4. 订阅者分组功能
5. 自动化发送规则
6. Token 有效期管理
7. 退订原因收集
8. 偏好设置页面

## 十一、退订功能实施检查清单

### 11.1 API 实施
- [ ] 实现 `GET /api/public/newsletter/unsubscribe` API
- [ ] Token 验证逻辑
- [ ] 退订状态更新逻辑
- [ ] 错误处理（无效 token、已退订等）
- [ ] 返回友好的错误消息

### 11.2 前端页面实施
- [ ] 创建 `/newsletter/unsubscribe` 页面
- [ ] 实现加载状态
- [ ] 实现成功状态（带重新订阅按钮）
- [ ] 实现错误状态（友好的错误提示）
- [ ] 响应式设计

### 11.3 邮件模板实施
- [ ] 在邮件模板中添加 `{{unsubscribe_link}}` 占位符
- [ ] 发送邮件时替换占位符为实际链接
- [ ] 确保链接在 HTML 和纯文本版本中都存在
- [ ] 链接样式符合邮件客户端兼容性

### 11.4 测试验证
- [ ] 测试退订链接生成
- [ ] 测试退订流程（有效 token）
- [ ] 测试无效 token 处理
- [ ] 测试已退订用户再次点击链接
- [ ] 测试重新订阅功能
- [ ] 测试退订后不再收到邮件

### 11.5 合规性检查
- [ ] 退订链接在每封邮件中都存在
- [ ] 退订链接清晰可见
- [ ] 退订立即生效
- [ ] 退订数据保留（符合 GDPR）
- [ ] 提供重新订阅选项

## 十二、技术栈

### 前端
- React / Next.js
- Sonner（Toast 通知）
- shadcn/ui 组件（Dialog, Table, Form）
- TipTap（富文本编辑器）

### 后端
- Next.js API Routes
- Supabase（数据库）
- 现有邮件服务（`src/lib/email.ts`）
- Vercel Cron Jobs（定时任务）

### 数据库
- PostgreSQL（通过 Supabase）

## 十三、注意事项

1. **邮件服务限制**：注意邮件服务商的发送限制（如每日发送量）
2. **退订链接**：确保退订链接在邮件中正确显示，符合邮件营销法规
3. **错误处理**：完善的错误处理和用户提示
4. **性能优化**：批量发送时使用队列或并发控制
5. **测试**：提供测试发送功能，避免误发
6. **日志记录**：记录所有发送和退订操作，便于排查问题
7. **合规性**：确保符合邮件营销相关法规（如 GDPR、CAN-SPAM）
8. **退订 Token 安全**：确保 token 足够随机和安全
9. **退订后处理**：确保退订用户立即从发送列表中排除
10. **用户体验**：退订流程应简单明了，避免用户困惑

## 十四、失败邮件追踪和重发功能详细设计

### 14.1 功能概述

管理员需要能够：
1. **查看失败邮件列表**：了解哪些邮件发送失败
2. **查看失败原因**：了解失败的具体原因（SMTP 错误、邮箱无效等）
3. **重发失败邮件**：支持单个或批量重发
4. **失败统计**：查看失败趋势和原因分布
5. **智能重试**：避免永久失败的邮件重复重试

### 14.2 数据库扩展

#### 14.2.1 newsletter_sends 表扩展

在 `newsletter_sends` 表中添加以下字段（如果尚未存在）：

```sql
ALTER TABLE newsletter_sends
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_permanent_failure BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 添加索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_newsletter_sends_failed 
ON newsletter_sends(status, created_at) 
WHERE status = 'failed';

CREATE INDEX IF NOT EXISTS idx_newsletter_sends_campaign_status 
ON newsletter_sends(campaign_id, status);
```

#### 14.2.2 newsletter_retry_tasks 表（新增）

用于记录异步重发任务：

```sql
CREATE TABLE IF NOT EXISTS newsletter_retry_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  task_type TEXT NOT NULL DEFAULT 'retry_failed_sends',
  send_ids UUID[] NOT NULL,
  campaign_id UUID REFERENCES newsletter_campaigns(id),
  status TEXT NOT NULL DEFAULT 'pending',
  total_count INTEGER DEFAULT 0,
  processed_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_retry_tasks_user_id ON newsletter_retry_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_retry_tasks_status ON newsletter_retry_tasks(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_retry_tasks_created_at ON newsletter_retry_tasks(created_at DESC);

COMMENT ON TABLE newsletter_retry_tasks IS 'Newsletter 重发任务表，用于异步处理重发操作';
COMMENT ON COLUMN newsletter_retry_tasks.status IS '任务状态：pending(待处理), processing(处理中), completed(已完成), failed(失败)';
```

#### 14.2.3 admin_notifications 表（新增）

用于存储管理员通知：

```sql
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_user_id ON admin_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON admin_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at DESC);

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON admin_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can manage notifications" ON admin_notifications
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE admin_notifications IS '管理员通知表，用于异步任务完成通知';
COMMENT ON COLUMN admin_notifications.type IS '通知类型：retry_task_completed, retry_task_failed 等';
```

### 14.3 失败原因分类

**临时性错误（可重试）：**
- SMTP 连接超时
- SMTP 服务器暂时不可用
- DNS 解析失败（临时）
- 网络连接问题

**永久性错误（不应重试）：**
- 邮箱地址格式无效
- 邮箱域名不存在
- 邮箱地址不存在（550 错误）
- 订阅者已退订

**需要人工处理：**
- 邮箱已满（可能需要稍后重试）
- 邮件被标记为垃圾邮件
- 其他未知错误

### 14.4 API 实现细节

#### 14.4.1 GET /api/admin/newsletter/failed-sends

**实现逻辑：**
1. 查询 `newsletter_sends` 表，筛选 `status = 'failed'`
2. 支持按 `campaign_id`、`email`、日期范围筛选
3. 关联查询 `newsletter_campaigns` 获取 campaign 信息
4. 返回分页结果

**错误处理：**
- 无效的日期范围
- 无效的 campaign_id
- 数据库查询错误

#### 14.4.2 POST /api/admin/newsletter/failed-sends/retry

**实现逻辑（同步模式 - 已弃用）：**
1. 验证请求参数（send_ids 或 campaign_id）
2. 查询要重发的邮件记录
3. 检查每个邮件：
   - 如果 `is_permanent_failure = true`，跳过
   - 如果 `retry_count >= 3`，标记为永久失败并跳过
   - 如果订阅者已退订（`is_active = false`），跳过
4. 获取对应的 campaign 和 template
5. 逐个重发邮件
6. 更新发送记录：
   - 成功：`status = 'sent'`, `sent_at = NOW()`
   - 失败：`retry_count += 1`, `last_retry_at = NOW()`, 更新 `error_message`
7. 返回重发结果

**实现逻辑（异步模式 - 推荐）：**
1. 验证请求参数（send_ids 或 campaign_id）
2. 验证用户权限（管理员）
3. 创建重发任务记录（`newsletter_retry_tasks` 表）
4. 立即返回任务 ID 和状态（`pending`）
5. 后台异步处理重发任务：
   - 查询要重发的邮件记录
   - 检查每个邮件（跳过永久失败、超过重试次数、已退订的）
   - 逐个重发邮件
   - 更新发送记录和任务状态
6. 任务完成后发送通知（通过通知系统）

**重发限制：**
- 每个邮件最多重试 3 次
- 永久失败的邮件不重试
- 已退订的订阅者不重试

**异步处理优势：**
- 用户无需等待长时间操作完成
- 可以离开页面，稍后查看结果
- 支持批量处理大量邮件
- 避免 HTTP 请求超时

#### 14.4.3 GET /api/admin/newsletter/failed-sends/stats

**实现逻辑：**
1. 统计总失败数
2. 按 `error_message` 分组统计失败原因
3. 按 `campaign_id` 分组统计各 campaign 的失败数
4. 按日期分组统计最近失败趋势

#### 14.4.4 GET /api/admin/newsletter/failed-sends/retry-tasks

**获取重发任务列表**

**实现逻辑：**
1. 验证用户权限（管理员）
2. 查询 `newsletter_retry_tasks` 表
3. 筛选当前用户的任务
4. 支持按状态筛选（pending, processing, completed, failed）
5. 支持分页
6. 返回任务列表和总数

#### 14.4.5 GET /api/admin/newsletter/failed-sends/retry-tasks/[id]

**获取单个任务详情**

**实现逻辑：**
1. 验证用户权限（管理员）
2. 查询 `newsletter_retry_tasks` 表
3. 验证任务属于当前用户
4. 返回任务详细信息（包含进度统计）

#### 14.4.6 POST /api/admin/newsletter/failed-sends/retry-tasks/process

**后台任务处理器**

**实现逻辑：**
1. 获取任务 ID（从请求 body）
2. 查询任务记录（状态为 pending）
3. 更新任务状态为 processing
4. 获取要重发的邮件记录（包含 campaign、template、subscriber）
5. 逐个处理邮件重发：
   - 检查永久失败标记，跳过
   - 检查重试次数限制（>=3），标记为永久失败并跳过
   - 检查订阅者状态，已退订则跳过
   - 准备邮件内容（替换 unsubscribe link）
   - 调用 `sendNewsletterEmail` 发送邮件
   - 更新发送记录状态（成功或失败）
6. 每处理 10 个邮件更新一次任务进度
7. 任务完成后：
   - 更新任务状态为 completed
   - 创建通知记录（`admin_notifications`）
8. 错误处理：任务失败时更新状态并创建失败通知

**关键特性：**
- 异步处理，不阻塞 HTTP 响应
- 详细的日志记录
- 智能跳过永久失败的邮件
- 自动更新重试次数和错误信息

#### 14.4.7 GET /api/admin/newsletter/campaigns/send/stream

**Server-Sent Events (SSE) Newsletter 发送进度流**

**实现逻辑：**
1. 验证用户权限（管理员）
2. 获取 `campaign_id` 查询参数
3. 建立 SSE 连接，设置响应头：
   - `Content-Type: text/event-stream`
   - `Cache-Control: no-cache, no-transform`
   - `Connection: keep-alive`
   - `X-Accel-Buffering: no`
4. 发送初始连接消息（`connected` 事件）
5. 定期检查 campaign 进度（每 2 秒）：
   - 查询 `newsletter_campaigns` 表（包含 `created_at` 字段）
   - 获取 `sent_count`、`failed_count`、`total_recipients`、`status`、`created_at`
   - 计算进度百分比
   - 如果计数有变化，推送 `progress` 事件
   - **自动修复机制**：
     a. 如果所有邮件已处理（`sent_count + failed_count >= total_recipients`）但状态仍为 "sending"，自动更新状态并推送 `completed` 事件
     b. 如果 campaign 创建超过30分钟且没有进度（`sent_count === 0 && failed_count === 0`），自动标记为 "failed" 并推送 `completed` 事件
6. 发送完成时推送 `completed` 事件
7. 发送心跳消息（每 30 秒）保持连接活跃
8. 监听客户端断开连接，清理资源

**事件格式：**
- `connected`: `{ type: "connected", message: "Connected to campaign stream" }`
- `progress`: `{ type: "progress", campaign_id, sent_count, failed_count, total_recipients, progress, status }`
- `completed`: `{ type: "completed", campaign_id, sent_count, failed_count, total_recipients, status }`
- `heartbeat`: `: heartbeat`

**使用场景：**
- Admin 发送 Newsletter 时实时显示进度
- 用户离开页面后返回时恢复进度显示
- 自动修复遗留的 "sending" 状态 campaign
- 自动修复状态不一致的 campaign

#### 14.4.8 GET /api/admin/notifications/stream

**Server-Sent Events (SSE) 实时通知流**

**实现逻辑：**
1. 验证用户权限（管理员）
2. 建立 SSE 连接，设置响应头：
   - `Content-Type: text/event-stream`
   - `Cache-Control: no-cache, no-transform`
   - `Connection: keep-alive`
   - `X-Accel-Buffering: no`（禁用 Nginx 缓冲）
3. 发送初始连接消息（`connected` 事件）
4. 定期检查新通知（每 3 秒）：
   - 查询 `admin_notifications` 表
   - 筛选当前用户的未读通知
   - 检查 `created_at > lastCheckTime` 的新通知
   - 如果发现新通知，推送 `new_notifications` 事件
5. 发送心跳消息（每 30 秒）保持连接活跃
6. 监听客户端断开连接，清理资源

**事件格式：**
- `connected`: `{ type: "connected", message: "Connected to notification stream" }`
- `new_notifications`: `{ type: "new_notifications", count: <number> }`
- `heartbeat`: `: heartbeat`（注释消息，不触发 onmessage）

**错误处理：**
- 连接断开时正确清理资源
- 数据库查询错误记录日志但不中断连接
- 发送数据失败时记录错误

**性能优化：**
- 使用索引优化通知查询
- 限制查询结果数量（最多 10 条）
- 后台检查不阻塞主线程
- 只在有新通知时才推送事件

#### 14.4.8 GET /api/admin/notifications

**获取通知列表**

**实现逻辑：**
1. 验证用户权限（管理员）
2. 查询 `admin_notifications` 表
3. 支持筛选：
   - `is_read`: true/false（筛选已读/未读）
   - `type`: 通知类型
   - `page`: 页码
   - `limit`: 每页数量
4. 返回通知列表和未读数量

#### 14.4.11 PUT /api/admin/notifications/[id]/read

**标记通知为已读**

**实现逻辑：**
1. 验证用户权限（管理员）
2. 验证通知属于当前用户
3. 更新 `is_read = true`, `read_at = NOW()`
4. 返回成功响应

#### 14.4.12 PUT /api/admin/notifications/read-all

**标记所有通知为已读**

**实现逻辑：**
1. 验证用户权限（管理员）
2. 批量更新当前用户的所有未读通知
3. 设置 `is_read = true`, `read_at = NOW()`
4. 返回成功响应

### 14.5 前端页面实现

#### 14.5.1 失败邮件列表页面

**路由：** `/admin/newsletter/failed-sends`

**功能模块：**
1. **统计概览卡片**
   - 总失败数
   - 可重试数量
   - 永久失败数量
   - 最近 7 天失败趋势

2. **筛选器**
   - Campaign 下拉选择
   - 邮箱搜索框
   - 日期范围选择器
   - 失败原因筛选

3. **操作栏**
   - 全选/取消全选
   - 批量重发选中邮件
   - 重发当前筛选条件下的所有邮件
   - 导出 CSV

4. **失败邮件表格**
   - 选择框（checkbox）
   - Campaign 名称/主题
   - 订阅者邮箱
   - 失败时间
   - 失败原因（带颜色标签）
   - 重试次数
   - 操作按钮（单个重发）

**UI 设计要点：**
- 失败原因使用不同颜色的 Badge 显示
- 永久失败的邮件使用灰色显示，禁用重发按钮
- 重试次数超过限制的邮件显示警告图标
- 支持表格排序（按时间、失败原因等）

#### 14.5.2 重发确认对话框

**触发时机：** 点击重发按钮时

**内容：**
- 显示将要重发的邮件数量
- 显示重发邮件列表（可选，如果数量少）
- 警告信息（如果有永久失败的邮件将被跳过）
- 确认/取消按钮

**重发进度：**（可选）
- 显示重发进度条
- 实时更新成功/失败数量

#### 14.5.3 失败统计图表

**位置：** 失败邮件列表页面顶部

**图表类型：**
1. **失败原因分布饼图**：显示各种失败原因的比例
2. **失败趋势折线图**：显示最近 30 天的失败趋势
3. **Campaign 失败柱状图**：显示各 campaign 的失败数量

### 14.6 错误处理策略

#### 14.6.1 错误分类

**自动识别永久失败：**
- 邮箱格式错误（正则验证）
- 550 错误（邮箱不存在）
- 553 错误（邮箱域名无效）
- 订阅者已退订

**自动识别临时失败：**
- 连接超时
- DNS 解析失败
- SMTP 服务器 4xx 错误（临时）

#### 14.6.2 重试策略

1. **立即重试**：管理员手动触发
2. **延迟重试**：（可选）自动延迟重试，如 1 小时后
3. **重试限制**：最多 3 次
4. **智能跳过**：永久失败的邮件自动跳过

### 14.7 实施检查清单

#### 14.7.1 数据库
- [ ] 添加 `retry_count` 字段
- [ ] 添加 `last_retry_at` 字段
- [ ] 添加 `is_permanent_failure` 字段
- [ ] 添加 `updated_at` 字段
- [ ] 创建失败邮件查询索引
- [ ] 更新现有记录的默认值

#### 14.7.2 API
- [ ] 实现 `GET /api/admin/newsletter/failed-sends`
- [ ] 实现 `POST /api/admin/newsletter/failed-sends/retry`
- [ ] 实现 `GET /api/admin/newsletter/failed-sends/stats`
- [ ] 错误处理和验证
- [ ] 权限验证（仅管理员）

#### 14.7.3 前端
- [x] 创建失败邮件列表页面
- [x] 实现筛选功能
- [x] 实现批量选择
- [x] 实现重发功能（异步模式）
- [x] 实现统计图表
- [x] 实现导出功能
- [x] 实现通知中心组件（NotificationCenter）
- [x] 实现 SSE 实时通知更新
- [x] 实现任务状态轮询
- [x] 错误处理和用户提示

#### 14.7.4 测试
- [ ] 测试失败邮件查询
- [ ] 测试单个重发
- [ ] 测试批量重发
- [ ] 测试永久失败识别
- [ ] 测试重试次数限制
- [ ] 测试已退订订阅者跳过

### 14.8 用户体验优化

1. **清晰的失败原因显示**：使用图标和颜色区分不同类型的错误
2. **智能筛选建议**：根据失败原因提供快速筛选选项
3. **批量操作确认**：批量重发前显示确认对话框
4. **重发结果反馈**：显示详细的重发结果（成功/失败数量）
5. **导出功能**：支持导出失败邮件列表为 CSV，便于分析

### 14.9 性能考虑

1. **分页加载**：失败邮件列表使用分页，避免一次性加载大量数据
2. **索引优化**：为常用查询字段创建索引
3. **异步重发**：批量重发使用异步处理，避免阻塞
4. **缓存统计**：失败统计信息可以缓存，定期更新
5. **实时通知更新（SSE）**：使用 Server-Sent Events 替代轮询，实现服务器主动推送
   - 避免频繁的 HTTP 请求
   - 只在有新通知时才刷新 UI
   - 减少服务器负载和网络流量
   - 提供更好的用户体验
6. **任务批处理**：大量邮件分批处理，避免单次处理过多导致超时

### 14.10 用户体验优化

#### 14.10.1 异步操作反馈

**即时反馈：**
- 用户点击重发后立即显示"任务已创建"消息
- 显示任务 ID（便于追踪）
- 提供任务详情链接

**进度追踪：**
- 任务详情页面显示实时进度
- 显示已处理/总数
- 显示预计剩余时间（可选）

**完成通知：**
- 通过通知中心显示完成消息
- Toast 通知（如果用户在当前页面）
- 邮件通知（可选，用于重要任务）

#### 14.10.2 通知管理

**通知中心功能：**
- 显示未读通知数量徽章
- **通知列表（最多5个）**：按时间顺序显示最多5个最新通知
- 标记为已读功能
- 一键标记全部已读
- **清除通知显示**：清除所有通知显示（不删除数据库，仅隐藏）
- 通知详情查看
- 通知跳转到相关页面
- **实时更新机制（SSE）**：使用 Server-Sent Events 实现实时通知推送
- **View all notifications 按钮**：始终显示，点击跳转到完整通知页面

**通知类型：**
- `retry_task_completed`：重发任务完成
- `retry_task_failed`：重发任务失败
- `newsletter_sent`：Newsletter 发送成功（✅ 已实现）
- `newsletter_failed`：Newsletter 发送失败（✅ 已实现）
- 系统告警（未来扩展）

**通知显示优化：**
- **数量限制**：最多显示5个最新通知（按时间顺序，最新的在前）
- **清除功能**：添加"Clear"按钮，清除所有通知显示（本地状态，不删除数据库）
- **过滤机制**：已清除的通知不再显示，直到有新通知
- **View all 按钮**：始终显示"View all notifications"按钮，点击跳转到完整通知页面

**实时通知更新机制（SSE）：**

**设计目标：**
- 避免频繁刷新 UI，提升用户体验
- 实现服务器主动推送通知更新
- 减少不必要的网络请求
- 提供备用机制确保可靠性

**技术实现：**

1. **SSE API 端点**：`GET /api/admin/notifications/stream`
   - 建立 Server-Sent Events 连接
   - 服务器每 3 秒检查新通知（后台检查，不刷新 UI）
   - 检测到新通知时推送 `new_notifications` 事件
   - 每 30 秒发送心跳保持连接
   - 正确处理连接断开和资源清理

2. **前端实现**：
   - 使用 `EventSource` 连接 SSE 流
   - 监听 `new_notifications` 事件
   - 只在收到推送事件时才刷新通知列表
   - SSE 失败时自动回退到 10 秒轮询（备用机制）
   - 保留自定义事件监听（`refreshNotifications`）用于即时刷新

3. **工作流程：**
   ```
   用户打开页面
     ↓
   NotificationCenter 建立 SSE 连接
     ↓
   服务器后台检查（每3秒，不刷新UI）
     ↓
   检测到新通知 → 推送事件
     ↓
   客户端接收事件 → 刷新通知列表
   ```

4. **优势：**
   - ✅ 通知列表不会频繁刷新（只在有新通知时刷新）
   - ✅ 新通知实时推送（3秒内）
   - ✅ 更流畅的用户体验
   - ✅ 减少服务器负载（相比频繁轮询）
   - ✅ 有备用机制，可靠性高

5. **API 端点详情：**

   **GET /api/admin/notifications/stream**
   - **认证**：需要管理员权限
   - **响应类型**：`text/event-stream`
   - **事件类型**：
     - `connected`：连接建立成功
     - `new_notifications`：检测到新通知（包含 count）
     - `heartbeat`：心跳消息（保持连接）
   - **检查频率**：每 3 秒检查一次新通知
   - **心跳间隔**：每 30 秒发送一次心跳

6. **前端组件实现：**

   **NotificationCenter 组件：**
   - 使用 `EventSource` 连接 `/api/admin/notifications/stream`
   - 监听 `onmessage` 事件处理推送
   - 监听 `onerror` 事件处理连接错误
   - SSE 失败时自动回退到轮询机制
   - 组件卸载时正确关闭 SSE 连接

7. **双重保障机制：**
   - **主要机制**：SSE 实时推送
   - **备用机制**：自定义事件监听（`refreshNotifications`）
   - **兜底机制**：SSE 失败时自动回退到 10 秒轮询

8. **性能优化：**
   - SSE 连接保持打开，避免频繁建立连接
   - 服务器后台检查，不阻塞主线程
   - 只在有新通知时才推送，减少网络流量
   - 心跳机制保持连接活跃，避免超时

#### 14.10.3 错误处理

**任务失败处理：**
- 记录详细错误信息
- 通知用户任务失败
- 提供重试选项（如果适用）
- 记录到日志系统

**部分成功处理：**
- 显示成功/失败/跳过统计
- 提供失败邮件列表链接
- 允许针对失败邮件再次重试

## 十五、已实现功能总结

### 15.1 核心功能（✅ 已实现）

1. **用户订阅功能**：✅ 已实现
   - 订阅表单和验证
   - **自动发送欢迎邮件**（✅ 新增）
   - 退订功能
   - 重新订阅功能

2. **Newsletter 发送功能**：✅ 已实现
   - 模板管理
   - 立即发送
   - 定时发送
   - **实时进度显示（SSE）**（✅ 新增）
   - **用户离开页面后返回查看进度**（✅ 新增）
   - **发送结果异步通知**（✅ 新增）

3. **失败邮件管理**：✅ 已实现
   - 失败邮件列表
   - 重发功能（异步）
   - 失败统计

4. **通知系统**：✅ 已实现
   - 实时通知推送（SSE）
   - **通知中心优化（最多5个）**（✅ 新增）
   - **清除通知显示功能**（✅ 新增）
   - 通知详情页面

### 15.2 新增功能详细说明

#### 15.2.1 自动发送欢迎邮件

**功能描述：**
- 用户订阅时自动发送欢迎邮件
- 重新订阅时发送"欢迎回来"邮件
- 邮件包含退订链接

**实现位置：**
- API: `POST /api/public/newsletter/subscribe`
- 异步发送，不阻塞订阅响应

#### 15.2.2 SSE 实时推送发送进度

**功能描述：**
- 发送 Newsletter 时实时显示进度
- SSE 每2秒推送进度更新
- 用户可离开页面，返回后继续查看进度

**实现位置：**
- API: `GET /api/admin/newsletter/campaigns/send/stream`

#### 15.2.3 数据同步机制和页面状态恢复

**功能描述：**
- 页面加载时自动检测遗留的 "sending" 状态 campaign
- 自动恢复发送进度显示
- 检测并修复卡住的 campaign
- 确保状态一致性

**实现机制：**

1. **页面加载时的状态恢复**
   - 页面加载时调用 `checkActiveCampaign()` 函数
   - 查询状态为 "sending" 的 campaign
   - 如果找到，恢复进度显示并重新连接 SSE
   - 检查 campaign 是否卡住（超过30分钟且没有进度）
   - 如果卡住，不恢复状态，避免显示错误的发送中状态

2. **遗留 Campaign 检测**
   - 检查 campaign 创建时间（`created_at`）
   - 如果创建超过30分钟且 `sent_count === 0 && failed_count === 0`，判定为卡住
   - 如果所有邮件已处理（`sent_count + failed_count >= total_recipients`）但状态仍为 "sending"，判定为状态不一致

3. **SSE 流自动修复机制**
   - SSE 流每2秒检查 campaign 状态
   - 如果检测到所有邮件已处理但状态仍为 "sending"，自动更新状态
   - 如果检测到 campaign 卡住（超过30分钟且没有进度），自动标记为 "failed"
   - 发送 `completed` 事件给前端，确保状态同步

4. **状态同步流程**
   ```
   页面加载
     ↓
   checkActiveCampaign()
     ↓
   查询 status='sending' 的 campaign
     ↓
   检查是否卡住或状态不一致
     ↓
   如果正常：恢复进度显示 + 连接 SSE
   如果异常：清理状态，不恢复显示
     ↓
   SSE 流持续监控
     ↓
   检测到状态不一致 → 自动修复
     ↓
   发送 completed 事件 → 前端更新状态
   ```

**关键代码位置：**
- 前端：`src/app/admin/newsletter/send/page.tsx` - `checkActiveCampaign()` 函数
- 后端 SSE：`src/app/api/admin/newsletter/campaigns/send/stream/route.ts` - 卡住检测和自动修复逻辑

**错误处理：**
- 如果 `sendEmailsAsync` 函数执行失败，确保更新 campaign 状态为 "failed"
- 添加 `.catch()` 处理 Promise rejection
- 添加详细的日志记录，便于调试和追踪问题

**性能优化：**
- 页面加载时只查询最新的 "sending" campaign（`limit=1`）
- SSE 流使用心跳机制保持连接活跃
- 状态检查使用数据库索引优化查询性能
- 前端: `/admin/newsletter/send` 页面

#### 15.2.3 通知中心优化

**功能描述：**
- 最多显示5个最新通知（按时间顺序）
- 添加"Clear"按钮清除通知显示（不删除数据库）
- "View all notifications"按钮始终显示

**实现位置：**
- 组件: `NotificationCenter.tsx`
- 页面: `/admin/notifications`

## 十六、未来扩展

1. **邮件模板系统**：支持模板变量、条件逻辑
2. **自动重试机制**：系统自动重试临时失败的邮件（延迟重试）
3. **失败邮件通知**：失败率达到阈值时通知管理员
4. **任务队列系统**：使用专业的任务队列（如 Bull、BullMQ）处理大量异步任务
5. **邮件发送优先级**：支持设置邮件发送优先级，重要邮件优先发送
6. **批量操作历史**：记录所有批量操作历史，支持撤销和重做
7. **WebSocket 实时通知**：未来可考虑使用 WebSocket 替代 SSE，支持双向通信（可选）
8. **订阅者分组**：按标签、地区等分组发送
9. **自动化规则**：基于事件的自动发送（如新课程发布）
10. **分析统计**：打开率、点击率、退订率等
11. **A/B 测试**：测试不同主题和内容的效果
12. **多语言支持**：支持多语言 Newsletter

### 5.5 失败邮件管理页面

**路径：** `/admin/newsletter/failed-sends`

**功能：**
1. 显示所有失败邮件列表
2. 显示失败原因（error_message）
3. 支持按 campaign、邮箱、日期范围筛选
4. 支持批量重发失败邮件
5. 支持单个邮件重发
6. 显示失败统计信息
7. 支持导出失败邮件列表

**UI 组件：**
- Table（失败邮件列表）
- Badge（失败原因分类）
- Button（重发、批量重发、导出）
- Select（筛选器）
- DateRangePicker（日期范围选择）
- Card（统计卡片）
- Dialog（重发确认）
- Checkbox（批量选择）

**页面结构：**
```tsx
<div>
  <h1>Failed Email Management</h1>
  
  {/* 统计卡片 */}
  <div className="grid grid-cols-4 gap-4">
    <Card>
      <CardHeader>Total Failed</CardHeader>
      <CardContent>{totalFailed}</CardContent>
    </Card>
    <Card>
      <CardHeader>Retryable</CardHeader>
      <CardContent>{retryableCount}</CardContent>
    </Card>
    <Card>
      <CardHeader>Permanent Failures</CardHeader>
      <CardContent>{permanentFailures}</CardContent>
    </Card>
    <Card>
      <CardHeader>Failed Last 7 Days</CardHeader>
      <CardContent>{recentFailures}</CardContent>
    </Card>
  </div>

  {/* 筛选器 */}
  <div className="flex gap-4">
    <Select>Campaign</Select>
    <Input>Email Search</Input>
    <DateRangePicker />
    <Select>Error Type</Select>
  </div>

  {/* 操作栏 */}
  <div className="flex gap-2">
    <Button>Retry Selected</Button>
    <Button>Retry All</Button>
    <Button>Export CSV</Button>
  </div>

  {/* 失败邮件列表 */}
  <Table>
    <thead>
      <tr>
        <th><Checkbox /> Select</th>
        <th>Campaign</th>
        <th>Email</th>
        <th>Failed At</th>
        <th>Error Message</th>
        <th>Retry Count</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {failedSends.map(send => (
        <tr key={send.id}>
          <td><Checkbox /></td>
          <td>{send.campaign_subject}</td>
          <td>{send.email}</td>
          <td>{formatDate(send.created_at)}</td>
          <td>
            <Badge variant="destructive">
              {send.error_message}
            </Badge>
          </td>
          <td>{send.retry_count}</td>
          <td>
            <Button 
              onClick={() => retrySend(send.id)}
              disabled={send.is_permanent_failure || send.retry_count >= 3}
            >
              Retry
            </Button>
          </td>
        </tr>
      ))}
    </tbody>
  </Table>
</div>
```

**失败原因分类：**
- SMTP 连接错误（超时、拒绝连接等）- 可重试
- 邮箱地址无效（格式错误、域名不存在等）- 永久失败
- 邮箱已满 - 可重试
- DNS 解析失败 - 可重试
- 订阅者已退订 - 永久失败
- 其他错误 - 根据具体情况判断

**重发功能：**
1. **单个重发**：点击单行的 "Retry" 按钮
2. **批量重发**：选择多个邮件后点击 "Retry Selected"
3. **全部重发**：重发当前筛选条件下的所有失败邮件
4. **重发限制**：
   - 每个邮件最多重试 3 次
   - 如果订阅者已退订，跳过重发
   - 如果邮箱地址无效，标记为永久失败

**重发流程：**
1. 用户选择要重发的邮件
2. 点击重发按钮
3. 显示确认对话框（显示将要重发的邮件数量）
4. 确认后调用重发 API
5. 显示重发进度（可选）
6. 显示重发结果（成功/失败数量）
7. 更新列表状态

**失败统计图表：**
- 失败原因分布饼图
- 失败趋势折线图（最近 30 天）
- Campaign 失败柱状图

