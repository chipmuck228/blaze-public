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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_newsletter_sends_campaign ON newsletter_sends(campaign_id);
CREATE INDEX idx_newsletter_sends_subscriber ON newsletter_sends(subscriber_id);
CREATE INDEX idx_newsletter_sends_status ON newsletter_sends(status);

-- 注释
COMMENT ON TABLE newsletter_sends IS 'Newsletter 发送详情记录';
COMMENT ON COLUMN newsletter_sends.status IS '发送状态：pending(待发送), sent(已发送), failed(失败), bounced(退回)';
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
- 使用富文本编辑器（如 TipTap 或 React Quill）
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
返回成功响应
  ↓
前端显示 Sonner 成功提示
  ↓
重置表单
```

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
批量发送邮件
  ↓
更新发送状态和统计
  ↓
显示发送结果
```

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
1. Admin 模板编辑器（富文本）
2. 定时发送功能
3. 发送历史查看
4. 发送统计
5. 退订统计和分析

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
- TipTap 或 React Quill（富文本编辑器）

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

## 十四、未来扩展

1. **邮件模板系统**：支持模板变量、条件逻辑
2. **订阅者分组**：按标签、地区等分组发送
3. **自动化规则**：基于事件的自动发送（如新课程发布）
4. **分析统计**：打开率、点击率、退订率等
5. **A/B 测试**：测试不同主题和内容的效果
6. **多语言支持**：支持多语言 Newsletter
