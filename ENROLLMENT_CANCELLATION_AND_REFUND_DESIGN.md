# 报名取消、退款和调换功能设计方案

**版本**: 1.0  
**日期**: 2025-12  
**状态**: 设计阶段 📋

---

## 📋 目录

1. [需求概述](#需求概述)
2. [数据库设计](#数据库设计)
3. [功能设计](#功能设计)
4. [API 设计](#api-设计)
5. [业务流程](#业务流程)
6. [实施计划](#实施计划)

---

## 需求概述

### 需求 1：用户提前 30 天取消 - 扣除 3% 费用后退款

**场景**：用户提前 30 天或更早取消已支付的 enrollment

**规则**：
- 扣除 3% 的手续费
- 扣除相关税费（如果有）
- 剩余金额退还到用户账户（原支付方式）或转为 credit

**条件**：
- 必须在 instance 开始日期前 30 天或更早
- enrollment 状态必须是 `enrolled` 且 `payment_status` 为 `paid`
- 用户主动取消

### 需求 2：退款转 Credit

**场景**：用户可以选择将退款金额转为账户 credit，用于下次报名

**规则**：
- 退款金额可以全部或部分转为 credit
- Credit 有有效期（如 1 年）
- Credit 可以用于支付新的 enrollment
- Credit 余额可以查询

### 需求 3：紧急情况调换

**场景**：用户因疾病或其他紧急情况无法参加某个 instance 或某次课

**规则**：
- 用户可以申请调换到其他 instance 或 session
- 需要提供原因（疾病、紧急情况等）
- 需要管理员审核批准
- 调换后原 enrollment 取消，创建新的 enrollment

### 需求 4：管理员取消 Instance 并退款

**场景**：管理员取消某个 instance（如因天气、讲师问题等）

**规则**：
- 管理员可以取消整个 instance
- 自动处理所有已支付的 enrollment
- 可以选择退款到账户或转为 credit
- 自动发送邮件通知所有受影响用户

---

## 数据库设计

### 1. 用户账户 Credit 表

```sql
-- 用户账户余额表
CREATE TABLE IF NOT EXISTS user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Credit 信息
  balance DECIMAL(10, 2) NOT NULL DEFAULT 0,  -- 当前余额
  currency TEXT DEFAULT 'USD',
  
  -- 有效期
  expires_at TIMESTAMP WITH TIME ZONE,  -- Credit 过期时间（可选）
  
  -- 审计字段
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 唯一约束：每个用户只有一个 credit 记录
  UNIQUE(user_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credits_expires_at ON user_credits(expires_at) WHERE expires_at IS NOT NULL;

-- Credit 交易历史表
CREATE TABLE IF NOT EXISTS user_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credit_id UUID NOT NULL REFERENCES user_credits(id) ON DELETE CASCADE,
  
  -- 交易信息
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'credit',      -- 增加 credit（退款转 credit）
    'debit',       -- 减少 credit（使用 credit 支付）
    'expired',     -- Credit 过期
    'refund'       -- 退款（从 credit 中扣除）
  )),
  amount DECIMAL(10, 2) NOT NULL,  -- 交易金额（正数表示增加，负数表示减少）
  balance_after DECIMAL(10, 2) NOT NULL,  -- 交易后余额
  
  -- 关联信息
  enrollment_id UUID REFERENCES course_enrollments(id),  -- 关联的 enrollment
  refund_id UUID REFERENCES enrollment_refunds(id),      -- 关联的退款记录
  related_transaction_id UUID REFERENCES user_credit_transactions(id),  -- 关联交易（如退款和 credit 的关联）
  
  -- 备注
  description TEXT,
  metadata JSONB,
  
  -- 审计字段
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id)  -- 谁创建的交易（系统或管理员）
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON user_credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_credit_id ON user_credit_transactions(credit_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_enrollment_id ON user_credit_transactions(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON user_credit_transactions(created_at);
```

### 2. 退款记录表

```sql
-- 退款记录表
CREATE TABLE IF NOT EXISTS enrollment_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 退款信息
  refund_type TEXT NOT NULL CHECK (refund_type IN (
    'full',           -- 全额退款
    'partial',        -- 部分退款（扣除手续费）
    'credit'          -- 转为 credit
  )),
  
  -- 金额信息
  original_amount DECIMAL(10, 2) NOT NULL,  -- 原始支付金额
  refund_amount DECIMAL(10, 2) NOT NULL,    -- 实际退款金额
  fee_amount DECIMAL(10, 2) DEFAULT 0,      -- 扣除的手续费
  tax_amount DECIMAL(10, 2) DEFAULT 0,      -- 扣除的税费
  credit_amount DECIMAL(10, 2) DEFAULT 0,   -- 转为 credit 的金额
  
  -- 退款方式
  refund_method TEXT NOT NULL CHECK (refund_method IN (
    'original_payment',  -- 退回到原支付方式
    'credit',            -- 转为 credit
    'split'              -- 部分退款，部分 credit
  )),
  
  -- 支付平台信息
  payment_provider TEXT,  -- 'stripe', 'amilia', etc.
  payment_transaction_id TEXT,  -- 原支付交易 ID
  refund_transaction_id TEXT,   -- 退款交易 ID（支付平台返回）
  
  -- 状态
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',    -- 待处理
    'processing', -- 处理中
    'completed',  -- 已完成
    'failed',     -- 失败
    'cancelled'   -- 已取消
  )),
  
  -- 原因和备注
  refund_reason TEXT,  -- 退款原因
  cancellation_reason TEXT,  -- 取消原因
  admin_notes TEXT,    -- 管理员备注
  
  -- 时间信息
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  -- 申请时间
  processed_at TIMESTAMP WITH TIME ZONE,  -- 处理时间
  completed_at TIMESTAMP WITH TIME ZONE,  -- 完成时间
  
  -- 提前取消信息
  days_before_start INTEGER,  -- 距离开始日期的天数
  is_early_cancellation BOOLEAN DEFAULT false,  -- 是否为提前取消
  
  -- 审计字段
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),  -- 谁创建的退款（用户或管理员）
  processed_by UUID REFERENCES users(id)  -- 谁处理的退款（管理员）
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_refunds_enrollment_id ON enrollment_refunds(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_user_id ON enrollment_refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON enrollment_refunds(status);
CREATE INDEX IF NOT EXISTS idx_refunds_created_at ON enrollment_refunds(created_at);
```

### 3. 调换申请表

```sql
-- 调换申请表
CREATE TABLE IF NOT EXISTS enrollment_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 原 enrollment
  from_enrollment_id UUID NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
  from_instance_id UUID NOT NULL REFERENCES course_instances(id),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 目标 instance（可选，如果只是申请调换但未指定目标）
  to_instance_id UUID REFERENCES course_instances(id),
  
  -- 调换类型
  transfer_type TEXT NOT NULL CHECK (transfer_type IN (
    'instance',   -- 调换到其他 instance
    'session'     -- 调换到其他 session（单次课）
  )),
  
  -- 状态
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',    -- 待审核
    'approved',   -- 已批准
    'rejected',   -- 已拒绝
    'completed',  -- 已完成（已创建新 enrollment）
    'cancelled'   -- 已取消
  )),
  
  -- 申请信息
  reason TEXT NOT NULL,  -- 调换原因（疾病、紧急情况等）
  reason_category TEXT CHECK (reason_category IN (
    'illness',           -- 疾病
    'emergency',         -- 紧急情况
    'family_emergency',  -- 家庭紧急情况
    'other'              -- 其他
  )),
  supporting_documents JSONB,  -- 支持文件（如医生证明等）
  
  -- 审核信息
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES users(id),  -- 审核的管理员
  review_notes TEXT,  -- 审核备注
  
  -- 新 enrollment（调换完成后）
  to_enrollment_id UUID REFERENCES course_enrollments(id),
  
  -- 时间信息
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- 审计字段
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_transfers_from_enrollment_id ON enrollment_transfers(from_enrollment_id);
CREATE INDEX IF NOT EXISTS idx_transfers_user_id ON enrollment_transfers(user_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON enrollment_transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_to_instance_id ON enrollment_transfers(to_instance_id);
```

### 4. 扩展 course_enrollments 表

```sql
-- 添加新字段到 course_enrollments 表
ALTER TABLE course_enrollments
ADD COLUMN IF NOT EXISTS cancellation_fee_percentage DECIMAL(5, 2) DEFAULT 3.00,  -- 取消手续费百分比
ADD COLUMN IF NOT EXISTS cancellation_fee_amount DECIMAL(10, 2),  -- 实际扣除的手续费
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10, 2) DEFAULT 0,  -- 税费
ADD COLUMN IF NOT EXISTS refund_id UUID REFERENCES enrollment_refunds(id),  -- 关联的退款记录
ADD COLUMN IF NOT EXISTS transfer_id UUID REFERENCES enrollment_transfers(id),  -- 关联的调换申请
ADD COLUMN IF NOT EXISTS is_transferred BOOLEAN DEFAULT false,  -- 是否已调换
ADD COLUMN IF NOT EXISTS transferred_from_enrollment_id UUID REFERENCES course_enrollments(id),  -- 从哪个 enrollment 调换而来
ADD COLUMN IF NOT EXISTS early_cancellation_days INTEGER;  -- 提前取消的天数
```

### 5. 扩展 course_instances 表

```sql
-- 添加取消相关字段到 course_instances 表
ALTER TABLE course_instances
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,  -- 取消时间
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES users(id),  -- 谁取消的
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,  -- 取消原因
ADD COLUMN IF NOT EXISTS cancellation_refund_policy TEXT DEFAULT 'full',  -- 退款策略：'full', 'credit', 'split'
ADD COLUMN IF NOT EXISTS cancellation_notification_sent BOOLEAN DEFAULT false;  -- 是否已发送通知
```

---

## 功能设计

### 功能 1：用户提前取消 Enrollment

#### 1.1 取消条件检查

**API**: `POST /api/enrollments/[id]/cancel`

**检查项**：
1. enrollment 状态必须是 `enrolled` 且 `payment_status` 为 `paid`
2. instance 开始日期必须 >= 当前日期 + 30 天
3. 用户必须是 enrollment 的所有者

**计算退款金额**：
```typescript
function calculateRefundAmount(
  originalAmount: number,
  daysBeforeStart: number,
  taxAmount: number = 0
): {
  refundAmount: number
  feeAmount: number
  taxAmount: number
  netRefund: number
} {
  // 提前 30 天或更早：扣除 3% 手续费
  const feePercentage = 0.03
  const feeAmount = originalAmount * feePercentage
  
  // 计算净退款金额
  const netRefund = originalAmount - feeAmount - taxAmount
  
  return {
    refundAmount: originalAmount,
    feeAmount,
    taxAmount,
    netRefund
  }
}
```

#### 1.2 退款处理流程

1. **创建退款记录**
   - 状态：`pending`
   - 记录原始金额、手续费、税费、净退款金额

2. **用户选择退款方式**
   - 选项 1：退回到原支付方式
   - 选项 2：转为 credit
   - 选项 3：部分退款，部分 credit

3. **执行退款**
   - 如果选择原支付方式：调用支付平台退款 API
   - 如果选择 credit：增加用户 credit 余额
   - 如果选择 split：同时执行两种方式

4. **更新 enrollment 状态**
   - 状态改为 `cancelled`
   - 记录取消时间和原因
   - 关联退款记录

5. **发送通知**
   - 邮件通知用户退款详情

### 功能 2：Credit 管理

#### 2.1 Credit 余额查询

**API**: `GET /api/user/credits`

**返回**：
```json
{
  "balance": 150.00,
  "currency": "USD",
  "expires_at": "2026-12-31T23:59:59Z",
  "transactions": [
    {
      "id": "...",
      "type": "credit",
      "amount": 150.00,
      "balance_after": 150.00,
      "description": "Refund from enrollment cancellation",
      "created_at": "2025-12-01T10:00:00Z"
    }
  ]
}
```

#### 2.2 使用 Credit 支付

**流程**：
1. 用户在结账时选择使用 credit
2. 检查 credit 余额是否足够
3. 如果足够，扣除 credit 余额
4. 如果不足，使用 credit + 其他支付方式
5. 记录 credit 交易

#### 2.3 Credit 过期处理

**后台任务**：
- 定期检查过期的 credit
- 将过期 credit 余额设为 0
- 记录过期交易

### 功能 3：调换申请

#### 3.1 用户提交调换申请

**API**: `POST /api/enrollments/[id]/transfer`

**请求体**：
```json
{
  "to_instance_id": "target-instance-id",  // 可选，如果不指定则由管理员分配
  "transfer_type": "instance",  // "instance" 或 "session"
  "reason": "I have a medical emergency and cannot attend",
  "reason_category": "illness",
  "supporting_documents": [
    {
      "type": "medical_certificate",
      "url": "https://..."
    }
  ]
}
```

**流程**：
1. 验证原 enrollment 状态（必须是 `enrolled`）
2. 验证目标 instance 是否有空位
3. 创建调换申请记录
4. 通知管理员审核

#### 3.2 管理员审核调换申请

**API**: `PATCH /api/admin/transfers/[id]`

**请求体**：
```json
{
  "status": "approved",  // "approved" 或 "rejected"
  "to_instance_id": "target-instance-id",  // 如果用户未指定，管理员可以指定
  "review_notes": "Approved due to medical emergency"
}
```

**批准流程**：
1. 取消原 enrollment
2. 创建新的 enrollment（状态为 `enrolled`）
3. 如果原 enrollment 已支付，转移支付信息到新 enrollment
4. 更新调换申请状态为 `completed`
5. 通知用户调换完成

**拒绝流程**：
1. 更新调换申请状态为 `rejected`
2. 记录拒绝原因
3. 通知用户

### 功能 4：管理员取消 Instance

#### 4.1 取消 Instance

**API**: `POST /api/admin/instances/[id]/cancel`

**请求体**：
```json
{
  "reason": "Instructor unavailable",
  "refund_policy": "full",  // "full", "credit", "split"
  "refund_method": "original_payment",  // "original_payment", "credit", "split"
  "send_notification": true
}
```

**流程**：
1. 更新 instance 状态为 `cancelled`
2. 记录取消原因和时间
3. 查找所有相关的 enrollment（状态为 `enrolled` 或 `reserved`）
4. 对每个 enrollment 执行退款：
   - 如果选择 `original_payment`：退回到原支付方式
   - 如果选择 `credit`：转为 credit
   - 如果选择 `split`：部分退款，部分 credit
5. 更新所有 enrollment 状态为 `cancelled`
6. 发送邮件通知所有受影响用户
7. 记录所有退款记录

#### 4.2 批量退款处理

**优化**：
- 使用队列处理大量退款
- 异步发送邮件通知
- 提供退款进度查询

---

## API 设计

### 用户 API

#### 1. 取消 Enrollment

```
POST /api/enrollments/[id]/cancel
```

**请求体**：
```json
{
  "refund_method": "original_payment",  // "original_payment", "credit", "split"
  "credit_amount": 0,  // 如果选择 split，指定转为 credit 的金额
  "reason": "Personal reasons"
}
```

**响应**：
```json
{
  "success": true,
  "refund": {
    "id": "refund-id",
    "refund_amount": 145.50,
    "fee_amount": 4.50,
    "tax_amount": 0,
    "net_refund": 145.50,
    "refund_method": "original_payment",
    "status": "processing"
  },
  "enrollment": {
    "id": "enrollment-id",
    "status": "cancelled"
  }
}
```

#### 2. 查询 Credit 余额

```
GET /api/user/credits
```

**响应**：
```json
{
  "balance": 150.00,
  "currency": "USD",
  "expires_at": "2026-12-31T23:59:59Z",
  "transactions": [...]
}
```

#### 3. 提交调换申请

```
POST /api/enrollments/[id]/transfer
```

**请求体**：
```json
{
  "to_instance_id": "target-instance-id",
  "transfer_type": "instance",
  "reason": "Medical emergency",
  "reason_category": "illness"
}
```

**响应**：
```json
{
  "success": true,
  "transfer": {
    "id": "transfer-id",
    "status": "pending",
    "from_enrollment_id": "...",
    "to_instance_id": "..."
  }
}
```

#### 4. 查询调换申请状态

```
GET /api/enrollments/[id]/transfer
```

### 管理员 API

#### 1. 取消 Instance

```
POST /api/admin/instances/[id]/cancel
```

**请求体**：
```json
{
  "reason": "Instructor unavailable",
  "refund_policy": "full",
  "refund_method": "original_payment",
  "send_notification": true
}
```

**响应**：
```json
{
  "success": true,
  "instance": {
    "id": "instance-id",
    "status": "cancelled"
  },
  "refunds": {
    "total": 10,
    "processed": 0,
    "pending": 10
  },
  "job_id": "refund-job-id"  // 用于查询退款进度
}
```

#### 2. 审核调换申请

```
PATCH /api/admin/transfers/[id]
```

**请求体**：
```json
{
  "status": "approved",
  "to_instance_id": "target-instance-id",
  "review_notes": "Approved"
}
```

#### 3. 查询退款进度

```
GET /api/admin/refunds/jobs/[job_id]
```

**响应**：
```json
{
  "job_id": "refund-job-id",
  "status": "processing",
  "total": 10,
  "completed": 5,
  "failed": 0,
  "pending": 5
}
```

---

## 业务流程

### 流程 1：用户提前取消 Enrollment

```
用户请求取消
    ↓
检查取消条件（提前 30 天）
    ↓
计算退款金额（扣除 3% 手续费和税费）
    ↓
用户选择退款方式
    ↓
创建退款记录
    ↓
执行退款（支付平台或 credit）
    ↓
更新 enrollment 状态
    ↓
发送通知
```

### 流程 2：调换申请

```
用户提交调换申请
    ↓
验证申请条件
    ↓
创建调换申请记录
    ↓
通知管理员
    ↓
管理员审核
    ↓
[批准] 取消原 enrollment + 创建新 enrollment
    ↓
[拒绝] 更新申请状态 + 通知用户
```

### 流程 3：管理员取消 Instance

```
管理员取消 instance
    ↓
查找所有相关 enrollment
    ↓
创建批量退款任务
    ↓
异步处理每个 enrollment 退款
    ↓
发送邮件通知
    ↓
更新所有 enrollment 状态
```

---

## 实施计划

### 阶段 1：数据库迁移（1 周）

1. 创建新表：
   - `user_credits`
   - `user_credit_transactions`
   - `enrollment_refunds`
   - `enrollment_transfers`

2. 扩展现有表：
   - `course_enrollments` 添加新字段
   - `course_instances` 添加取消相关字段

3. 创建索引和约束

### 阶段 2：核心功能开发（3-4 周）

1. **Credit 管理**（1 周）
   - Credit 余额查询
   - Credit 交易记录
   - Credit 过期处理

2. **退款功能**（1-2 周）
   - 提前取消退款计算
   - 支付平台退款集成
   - 退款记录管理

3. **调换功能**（1 周）
   - 调换申请提交
   - 管理员审核
   - 自动创建新 enrollment

### 阶段 3：管理员功能（1-2 周）

1. Instance 取消功能
2. 批量退款处理
3. 退款进度查询

### 阶段 4：通知系统（1 周）

1. 邮件模板设计
2. 退款通知
3. 调换通知
4. Instance 取消通知

### 阶段 5：测试和优化（2 周）

1. 单元测试
2. 集成测试
3. 端到端测试
4. 性能优化

---

## 配置项

### enrollment_config 表新增配置

```sql
INSERT INTO enrollment_config (config_key, config_value, description) VALUES
('early_cancellation_days', '30', '提前取消的天数要求'),
('cancellation_fee_percentage', '3.00', '提前取消手续费百分比'),
('credit_expiry_days', '365', 'Credit 有效期（天）'),
('refund_processing_days', '5', '退款处理时间（工作日）'),
('transfer_approval_required', 'true', '调换是否需要管理员审核')
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value;
```

---

## 安全考虑

1. **权限控制**：
   - 用户只能取消自己的 enrollment
   - 只有管理员可以取消 instance
   - 只有管理员可以审核调换申请

2. **数据验证**：
   - 验证退款金额计算
   - 验证 credit 余额
   - 验证调换条件

3. **审计日志**：
   - 记录所有退款操作
   - 记录所有调换操作
   - 记录所有 credit 交易

---

## 邮件模板

### 1. 退款通知

**主题**：Your enrollment cancellation and refund

**内容**：
```
Dear [User Name],

Your enrollment for [Course Name] has been cancelled.

Refund Details:
- Original Amount: $[amount]
- Cancellation Fee (3%): $[fee]
- Tax: $[tax]
- Net Refund: $[net_refund]
- Refund Method: [method]

Your refund is being processed and will be completed within [X] business days.

Thank you for your understanding.
```

### 2. 调换批准通知

**主题**：Your transfer request has been approved

**内容**：
```
Dear [User Name],

Your transfer request has been approved.

Original Enrollment:
- Course: [Course Name]
- Instance: [Instance Details]

New Enrollment:
- Course: [Course Name]
- Instance: [New Instance Details]

Your enrollment has been automatically transferred.
```

### 3. Instance 取消通知

**主题**：Important: [Course Name] has been cancelled

**内容**：
```
Dear [User Name],

We regret to inform you that [Course Name] - [Instance Details] has been cancelled.

Reason: [Reason]

Refund Details:
- Refund Amount: $[amount]
- Refund Method: [method]
- Processing Time: [X] business days

We apologize for any inconvenience caused.
```

---

## 总结

本设计方案涵盖了所有 4 个需求：

1. ✅ **提前 30 天取消**：扣除 3% 手续费后退款
2. ✅ **退款转 Credit**：支持退款转为 credit，用于下次报名
3. ✅ **紧急调换**：支持用户申请调换到其他 instance
4. ✅ **管理员取消 Instance**：支持管理员取消 instance 并自动退款

所有功能都包含完整的数据模型、API 设计和业务流程。

---

**最后更新**: 2025-12

