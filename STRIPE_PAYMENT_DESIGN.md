# Stripe 支付系统设计方案

## 1. 概述

### 1.1 设计目标
- 集成 Stripe 作为支付处理平台
- 支持课程注册的完整支付流程
- 支持多租户（Franchise）架构
- 提供安全的支付处理和退款机制
- 实现支付状态同步和错误处理

### 1.2 业务场景
1. **用户结账流程**：
   - 用户将课程加入购物车（Cart）
   - 点击结账 → 状态转为 `reserved`（保留 10 分钟）
   - 跳转到 Stripe Checkout 页面
   - 完成支付 → 状态转为 `enrolled`（正式注册）

2. **支付失败处理**：
   - 支付失败 → 状态保持 `reserved`，`payment_status` 为 `failed`
   - 保留时间到期后自动释放名额

3. **退款处理**：
   - 管理员发起退款
   - 通过 Stripe API 处理退款
   - 更新注册状态为 `cancelled`，`payment_status` 为 `refunded`

---

## 2. 架构设计

### 2.1 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Cart Page  │  │ Checkout UI │  │ Payment Page │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Routes (Next.js)                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  POST /api/payments/create-checkout-session          │  │
│  │  GET  /api/payments/success                          │  │
│  │  GET  /api/payments/cancel                          │  │
│  │  POST /api/payments/webhook                         │  │
│  │  POST /api/payments/refund                          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   Supabase   │   │    Stripe    │   │   Database   │
│  PostgreSQL  │   │     API      │   │   Functions  │
└──────────────┘   └──────────────┘   └──────────────┘
```

### 2.2 数据流

#### 2.2.1 支付流程
```
User → Cart → Checkout → Create Stripe Session → Redirect to Stripe
                                                         │
                                                         ▼
User completes payment ← Stripe Checkout ← Stripe processes payment
         │
         ▼
Stripe sends webhook → Update enrollment status → Confirm enrollment
```

#### 2.2.2 Webhook 流程
```
Stripe Event → Webhook Endpoint → Verify Signature → Process Event
                                                          │
                    ┌─────────────────────────────────────┘
                    ▼
        ┌───────────────────────┐
        │  payment_intent.succeeded  │ → Update to 'enrolled'
        │  payment_intent.failed     │ → Update to 'failed'
        │  charge.refunded           │ → Update to 'refunded'
        └───────────────────────┘
```

---

## 3. 数据库设计

### 3.1 扩展 `course_enrollments` 表

**新增字段**：
```sql
ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS
  stripe_checkout_session_id TEXT,              -- Stripe Checkout Session ID
  stripe_payment_intent_id TEXT,                -- Stripe Payment Intent ID
  stripe_customer_id TEXT,                      -- Stripe Customer ID（可选，用于保存客户信息）
  stripe_refund_id TEXT,                        -- Stripe Refund ID（如果退款）
  refund_amount DECIMAL(10, 2),                 -- 退款金额
  refund_reason TEXT,                           -- 退款原因
  refunded_at TIMESTAMP WITH TIME ZONE;         -- 退款时间
```

**索引**：
```sql
CREATE INDEX IF NOT EXISTS idx_enrollments_stripe_session 
  ON course_enrollments(stripe_checkout_session_id);

CREATE INDEX IF NOT EXISTS idx_enrollments_stripe_payment_intent 
  ON course_enrollments(stripe_payment_intent_id);
```

### 3.2 新增 `stripe_payment_events` 表（可选，用于审计）

```sql
CREATE TABLE IF NOT EXISTS stripe_payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID REFERENCES course_enrollments(id) ON DELETE CASCADE,
  stripe_event_id TEXT UNIQUE NOT NULL,         -- Stripe Event ID
  event_type TEXT NOT NULL,                     -- payment_intent.succeeded, etc.
  stripe_object_id TEXT,                        -- Payment Intent ID, Charge ID, etc.
  payload JSONB NOT NULL,                       -- 完整的事件数据
  processed BOOLEAN DEFAULT FALSE,              -- 是否已处理
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_stripe_events_enrollment ON stripe_payment_events(enrollment_id);
CREATE INDEX idx_stripe_events_stripe_id ON stripe_payment_events(stripe_event_id);
CREATE INDEX idx_stripe_events_processed ON stripe_payment_events(processed);
```

---

## 4. API 设计

### 4.1 创建支付会话

**Endpoint**: `POST /api/payments/create-checkout-session`

**请求体**：
```json
{
  "enrollment_ids": ["uuid1", "uuid2"],
  "success_url": "https://yoursite.com/enrollments/success?session_id={CHECKOUT_SESSION_ID}",
  "cancel_url": "https://yoursite.com/enrollments/cancel"
}
```

**功能**：
1. 验证所有 `enrollment_ids` 属于当前用户且状态为 `reserved`
2. 计算总金额（从 `course_instances` 获取价格）
3. 创建 Stripe Checkout Session
4. 更新 `course_enrollments` 记录，保存 `stripe_checkout_session_id`
5. 返回 Checkout Session URL

**响应**：
```json
{
  "checkout_session_id": "cs_test_...",
  "url": "https://checkout.stripe.com/pay/cs_test_...",
  "total_amount": 299.99,
  "currency": "USD"
}
```

### 4.2 支付成功页面

**Endpoint**: `GET /api/payments/success`

**查询参数**：
- `session_id`: Stripe Checkout Session ID

**功能**：
1. 验证 Session ID
2. 从 Stripe 获取 Session 详情
3. 验证支付状态
4. 更新注册状态（如果 Webhook 尚未处理）
5. 返回成功页面

### 4.3 支付取消页面

**Endpoint**: `GET /api/payments/cancel`

**功能**：
1. 显示取消信息
2. 提供返回购物车的链接
3. 可选：延长 `reserved` 状态的保留时间

### 4.4 Webhook 处理

**Endpoint**: `POST /api/payments/webhook`

**功能**：
1. 验证 Stripe 签名（确保请求来自 Stripe）
2. 解析事件类型
3. 处理不同事件：
   - `checkout.session.completed`: 确认支付会话完成
   - `payment_intent.succeeded`: 支付成功，更新为 `enrolled`
   - `payment_intent.payment_failed`: 支付失败，更新为 `failed`
   - `charge.refunded`: 退款完成，更新为 `refunded`
4. 记录事件到 `stripe_payment_events` 表（如果使用）
5. 返回 200 状态码（确认收到）

**安全性**：
- 使用 Stripe Webhook 签名验证
- 幂等性处理（防止重复处理同一事件）
- 错误处理和重试机制

### 4.5 退款 API

**Endpoint**: `POST /api/admin/payments/refund`

**权限**: 仅管理员

**请求体**：
```json
{
  "enrollment_id": "uuid",
  "amount": 299.99,  // 可选，部分退款
  "reason": "Customer requested refund"
}
```

**功能**：
1. 验证管理员权限
2. 验证注册状态和支付状态
3. 调用 Stripe Refund API
4. 更新数据库状态
5. 发送退款确认邮件（可选）

---

## 5. 价格计算逻辑

### 5.1 价格来源优先级

1. **实例级价格覆盖** (`course_instances.price_override`)
   - 如果实例有 `price_override`，使用该价格
   
2. **课程基础价格** (`courses.base_price`)
   - 如果实例没有价格覆盖，使用课程的基础价格

3. **默认价格**
   - 如果都没有，返回错误或使用配置的默认价格

### 5.2 多课程总价计算

```typescript
function calculateTotalAmount(enrollments: CourseEnrollment[]): number {
  return enrollments.reduce((total, enrollment) => {
    const instance = enrollment.instance
    const price = instance?.price_override ?? 
                  instance?.assignment?.course?.base_price ?? 
                  0
    return total + price
  }, 0)
}
```

### 5.3 货币处理

- 默认货币：`USD`
- 支持从 `courses.currency` 或 `course_enrollments.currency` 获取
- 多货币支持（如果未来需要）

---

## 6. Stripe 配置

### 6.1 环境变量

```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_...  # 或 sk_live_... (生产环境)
STRIPE_PUBLISHABLE_KEY=pk_test_...  # 或 pk_live_... (生产环境)
STRIPE_WEBHOOK_SECRET=whsec_...  # Webhook 签名密钥

# Stripe 配置
STRIPE_CURRENCY=USD
STRIPE_MODE=payment  # 或 subscription（如果未来支持订阅）
```

### 6.2 Stripe 账户设置

1. **创建 Stripe 账户**
   - 注册 Stripe 账户
   - 完成账户验证（KYC）
   - 配置银行账户（用于接收付款）

2. **配置 Webhook**
   - 在 Stripe Dashboard 中创建 Webhook Endpoint
   - URL: `https://yoursite.com/api/payments/webhook`
   - 监听事件：
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `charge.refunded`

3. **测试模式**
   - 使用测试 API Keys 进行开发
   - 使用测试卡号进行测试
   - Stripe 提供测试卡号列表

---

## 7. 多租户（Franchise）支持

### 7.1 Stripe Connect（推荐方案）

**方案 A：使用 Stripe Connect（每个 Franchise 独立账户）**

- 每个 Franchise 有自己的 Stripe Connect 账户
- 支付直接进入 Franchise 的 Stripe 账户
- 适合：每个 Franchise 独立运营、独立财务

**实现**：
- 在 `franchises` 表中添加 `stripe_account_id`
- 创建 Checkout Session 时指定 `stripe_account`
- Webhook 需要处理不同账户的事件

### 7.2 统一账户 + 分账（备选方案）

**方案 B：统一 Stripe 账户 + 内部分账**

- 所有支付进入主账户
- 通过内部系统进行分账
- 适合：统一管理、统一财务

**实现**：
- 在 `course_enrollments` 中记录 `franchise_id`
- 支付成功后，通过内部系统记录分账信息
- 定期对账和分账

### 7.3 推荐方案

**建议使用方案 A（Stripe Connect）**，因为：
- 符合多租户架构
- 每个 Franchise 独立财务
- 更清晰的账务管理
- 符合 Stripe 最佳实践

---

## 8. 安全性设计

### 8.1 API 安全

1. **Webhook 签名验证**
   - 使用 `stripe.webhooks.constructEvent()` 验证签名
   - 确保请求来自 Stripe

2. **用户身份验证**
   - 所有支付相关 API 需要用户登录
   - 验证 `enrollment_ids` 属于当前用户

3. **管理员权限验证**
   - 退款等敏感操作需要管理员权限
   - 使用 NextAuth.js 的 role 检查

### 8.2 数据安全

1. **敏感信息存储**
   - 不存储完整的信用卡信息
   - 只存储 Stripe 返回的 ID（如 `payment_intent_id`）
   - 使用 Stripe Customer ID 存储客户信息（可选）

2. **PCI 合规性**
   - 使用 Stripe Checkout（Stripe 处理 PCI 合规）
   - 避免直接处理信用卡信息

### 8.3 防重复支付

1. **幂等性处理**
   - Webhook 事件使用 `stripe_event_id` 作为唯一标识
   - 检查事件是否已处理

2. **状态检查**
   - 创建支付会话前检查注册状态
   - 支付成功后再次验证状态

---

## 9. 错误处理

### 9.1 支付失败场景

1. **用户取消支付**
   - 状态保持 `reserved`
   - 保留时间到期后自动释放

2. **支付处理失败**
   - Webhook 收到 `payment_intent.payment_failed`
   - 更新 `payment_status` 为 `failed`
   - 发送失败通知（可选）

3. **网络错误**
   - 重试机制
   - 记录错误日志
   - 提供用户友好的错误消息

### 9.2 异常情况处理

1. **Webhook 延迟**
   - 支付成功页面主动检查支付状态
   - 如果 Webhook 未处理，手动更新状态

2. **重复 Webhook**
   - 使用 `stripe_event_id` 防止重复处理
   - 幂等性检查

3. **金额不匹配**
   - 验证支付金额与订单金额一致
   - 不一致时记录错误并通知管理员

---

## 10. 用户体验设计

### 10.1 支付流程 UI

1. **购物车页面**
   - 显示总金额
   - "Checkout" 按钮
   - 显示保留时间倒计时

2. **支付页面（Stripe Checkout）**
   - Stripe 托管的支付页面
   - 支持多种支付方式（信用卡、Apple Pay、Google Pay 等）
   - 移动端优化

3. **支付成功页面**
   - 显示成功消息
   - 显示注册的课程信息
   - 提供下载收据链接（可选）

4. **支付失败页面**
   - 友好的错误提示
   - 提供重试选项
   - 联系支持链接

### 10.2 支付状态显示

- **Cart**: "In Cart" - 显示倒计时
- **Reserved**: "Payment Pending" - 显示支付链接
- **Enrolled**: "Enrolled" - 显示课程详情
- **Failed**: "Payment Failed" - 显示重试选项

---

## 11. 测试策略

### 11.1 测试卡号

使用 Stripe 提供的测试卡号：
- 成功：`4242 4242 4242 4242`
- 需要 3D Secure：`4000 0025 0000 3155`
- 失败：`4000 0000 0000 0002`

### 11.2 测试场景

1. **正常支付流程**
   - 创建支付会话
   - 完成支付
   - 验证状态更新

2. **支付失败**
   - 使用失败卡号
   - 验证错误处理

3. **Webhook 处理**
   - 模拟各种 Webhook 事件
   - 验证状态同步

4. **退款流程**
   - 创建退款
   - 验证状态更新

---

## 12. 监控和日志

### 12.1 日志记录

1. **支付事件日志**
   - 记录所有支付相关操作
   - 记录 Webhook 事件
   - 记录错误信息

2. **审计日志**
   - 记录退款操作
   - 记录状态变更
   - 记录管理员操作

### 12.2 监控指标

1. **支付成功率**
   - 监控支付成功/失败比例
   - 识别异常模式

2. **Webhook 处理时间**
   - 监控 Webhook 响应时间
   - 识别延迟问题

3. **错误率**
   - 监控 API 错误率
   - 设置告警阈值

---

## 13. 实施计划

### 13.1 Phase 1: 基础集成（MVP）

1. **设置 Stripe 账户**
   - 创建测试账户
   - 配置 Webhook
   - 获取 API Keys

2. **实现核心功能**
   - 创建支付会话 API
   - Webhook 处理
   - 支付成功/失败页面

3. **数据库更新**
   - 添加 Stripe 相关字段
   - 创建索引

4. **测试**
   - 使用测试卡号测试
   - 验证完整流程

### 13.2 Phase 2: 增强功能

1. **退款功能**
   - 实现退款 API
   - 管理员界面

2. **多租户支持**
   - 集成 Stripe Connect
   - 配置 Franchise Stripe 账户

3. **审计和日志**
   - 实现事件记录
   - 添加监控

### 13.3 Phase 3: 高级功能

1. **订阅支持**（如果未来需要）
   - 月度/年度订阅
   - 自动续费

2. **优惠券和折扣**
   - Stripe Coupons 集成
   - 促销代码

3. **发票和收据**
   - 自动生成发票
   - 邮件发送收据

---

## 14. 成本考虑

### 14.1 Stripe 费用

- **交易手续费**: 2.9% + $0.30 per transaction（美国）
- **国际卡**: 额外 1% 费用
- **退款**: 手续费不退还

### 14.2 优化建议

1. **最小订单金额**
   - 设置最小订单金额（如 $10）
   - 避免小额交易的高手续费比例

2. **批量处理**
   - 合并多个课程到一次支付
   - 减少交易次数

3. **本地支付方式**
   - 考虑支持 ACH（美国）或其他本地支付方式
   - 降低手续费

---

## 15. 合规性

### 15.1 税务处理

1. **销售税**
   - 根据地点计算销售税
   - 使用 Stripe Tax（可选）
   - 或手动计算并添加到订单

2. **发票要求**
   - 生成符合要求的发票
   - 包含税务信息

### 15.2 退款政策

1. **退款窗口**
   - 定义退款政策（如 7 天内）
   - 在支付页面显示

2. **部分退款**
   - 支持部分退款
   - 记录退款原因

---

## 16. 未来扩展

### 16.1 可能的增强功能

1. **分期付款**
   - 使用 Stripe Installments
   - 支持多期支付

2. **订阅模式**
   - 月度/年度订阅
   - 自动续费

3. **会员计划**
   - 会员折扣
   - 会员专享课程

4. **积分系统**
   - 支付获得积分
   - 积分抵扣

---

## 17. 总结

本设计方案提供了完整的 Stripe 支付集成方案，包括：

✅ **核心功能**：支付流程、Webhook 处理、退款
✅ **多租户支持**：Stripe Connect 集成
✅ **安全性**：签名验证、权限控制
✅ **用户体验**：友好的支付流程和错误处理
✅ **可扩展性**：支持未来功能扩展

**下一步**：根据此设计方案开始实施 Phase 1（MVP）功能。

