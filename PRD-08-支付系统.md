# PRD-08: 支付系统

**版本**: 1.0  
**日期**: 2025-12  
**状态**: 已实施

---

## 1. 概述

### 1.1 文档目的

本文档描述 Blaze Robotics Academy 支付系统的功能需求，包括 Stripe 支付集成、支付方式管理、订单管理和退款处理等核心功能。

### 1.2 核心价值

- **安全性**：使用 Stripe 处理支付，符合 PCI 合规要求
- **便捷性**：支持保存支付方式，快速结账
- **可靠性**：完整的支付状态跟踪和错误处理
- **灵活性**：支持多种支付场景和退款处理

---

## 2. 支付流程

### 2.1 支付流程概览

```
用户选择课程
    ↓
加入购物车
    ↓
点击 "Proceed to Checkout"
    ↓
创建 Stripe Checkout Session
    ↓
跳转到 Stripe 支付页面
    ↓
用户完成支付
    ↓
Stripe Webhook 通知
    ↓
更新报名状态为 enrolled
    ↓
显示支付成功页面
```

### 2.2 详细流程

#### 2.2.1 创建支付会话
- **API**：`POST /api/payments/create-checkout-session`
- **输入**：
  - `enrollment_ids`：报名 ID 数组
- **流程**：
  1. 验证用户身份
  2. 验证报名记录（状态、容量、先修条件）
  3. 计算总价
  4. 创建 Stripe Checkout Session
  5. 更新报名状态为 `reserved`
  6. 保存 Stripe Session ID
  7. 返回支付 URL

#### 2.2.2 Stripe 支付页面
- **内容**：
  - 课程列表和价格
  - 支付表单（Stripe Elements）
  - 支付按钮
- **支付方式**：
  - 信用卡/借记卡
  - 未来支持：其他支付方式

#### 2.2.3 支付成功处理
- **Webhook 事件**：`checkout.session.completed`、`payment_intent.succeeded`
- **流程**：
  1. 验证 Webhook 签名
  2. 获取报名记录
  3. 更新报名状态为 `enrolled`
  4. 更新支付状态为 `paid`
  5. 保存 Stripe 信息
  6. 确认实例容量

#### 2.2.4 支付失败处理
- **Webhook 事件**：`payment_intent.payment_failed`
- **流程**：
  1. 更新支付状态为 `failed`
  2. 保持报名状态为 `reserved`（等待过期）
  3. 记录失败原因

---

## 3. 支付方式管理

### 3.1 添加支付方式

#### 3.1.1 功能描述
- **入口**：用户 Profile → Payment Methods → Add Payment Method
- **流程**：
  1. 打开添加支付方式对话框
  2. 创建 Stripe Setup Intent
  3. 显示 Stripe Elements 支付表单
  4. 用户输入卡片信息
  5. 确认 Setup Intent
  6. 保存支付方式到 Stripe Customer
  7. 刷新支付方式列表

#### 3.1.2 用户故事
- **作为** 注册用户
- **我希望** 保存我的支付方式
- **以便** 下次结账时快速支付

### 3.2 查看支付方式

#### 3.2.1 功能描述
- **显示内容**：
  - 卡片品牌（Visa、Mastercard 等）
  - 最后 4 位数字
  - 过期日期
  - 是否默认支付方式
- **操作**：
  - 设置默认支付方式
  - 删除支付方式

### 3.3 设置默认支付方式

#### 3.3.1 功能描述
- **操作**：点击 "Set as Default"
- **流程**：
  1. 更新 Stripe Customer 的默认支付方式
  2. 刷新支付方式列表

### 3.4 删除支付方式

#### 3.4.1 功能描述
- **操作**：点击 "Remove"
- **流程**：
  1. 确认删除
  2. 如果是默认支付方式，先取消默认设置
  3. 从 Stripe 删除支付方式
  4. 刷新支付方式列表

---

## 4. 订单管理

### 4.1 订单信息

#### 4.1.1 订单字段
- **报名信息**：
  - 报名 ID
  - 课程名称
  - 实例信息（地点、日期、时间）
  - 价格
- **支付信息**：
  - Stripe Session ID
  - Stripe Payment Intent ID
  - 支付金额
  - 支付状态
  - 支付时间
- **订单状态**：
  - 报名状态
  - 支付状态

### 4.2 订单查询

#### 4.2.1 用户查询
- **API**：`GET /api/user/enrollments`
- **返回**：用户的所有报名记录（包含支付信息）

#### 4.2.2 管理员查询
- **API**：`GET /api/admin/enrollments`
- **返回**：所有报名记录（包含支付信息）
- **筛选**：按支付状态、报名状态筛选

---

## 5. 退款处理

### 5.1 退款流程

#### 5.1.1 管理员发起退款
- **入口**：管理员门户 → Enrollments → Refund
- **流程**：
  1. 选择要退款的报名
  2. 输入退款金额（可以部分退款）
  3. 输入退款原因
  4. 调用 Stripe Refund API
  5. 更新报名状态为 `cancelled`
  6. 更新支付状态为 `refunded`
  7. 保存退款信息
  8. 释放实例容量

#### 5.1.2 Webhook 处理
- **事件**：`charge.refunded`
- **流程**：
  1. 验证 Webhook 签名
  2. 获取报名记录
  3. 更新退款信息
  4. 更新报名状态

### 5.2 退款信息

#### 5.2.1 退款字段
- `refund_amount`：退款金额
- `refund_reason`：退款原因
- `refunded_at`：退款时间
- `stripe_refund_id`：Stripe Refund ID

---

## 6. 支付安全

### 6.1 PCI 合规

#### 6.1.1 Stripe Elements
- **使用**：Stripe Elements 收集支付信息
- **优势**：
  - 支付信息不经过我们的服务器
  - Stripe 处理 PCI 合规
  - 支持 3D Secure

#### 6.1.2 数据存储
- **不存储**：完整的卡片信息
- **只存储**：Stripe 返回的 ID（Payment Method ID、Customer ID）

### 6.2 Webhook 安全

#### 6.2.1 签名验证
- **方法**：使用 Stripe Webhook Secret 验证签名
- **实现**：`stripe.webhooks.constructEvent()`

#### 6.2.2 幂等性
- **方法**：使用 Stripe Event ID 作为唯一标识
- **实现**：检查事件是否已处理

### 6.3 用户验证

#### 6.3.1 支付会话验证
- **检查**：确保支付会话属于当前用户
- **实现**：通过 `metadata.user_id` 验证

#### 6.3.2 报名验证
- **检查**：确保报名记录属于当前用户
- **实现**：通过 `user_id` 字段验证

---

## 7. 多租户支持

### 7.1 Franchise 隔离

#### 7.1.1 数据隔离
- **字段**：`course_enrollments.franchise_id`
- **查询**：按 `franchise_id` 过滤

#### 7.1.2 Stripe Connect（未来）
- **计划**：每个 Franchise 使用独立的 Stripe 账户
- **实现**：通过 Stripe Connect 实现

---

## 8. 错误处理

### 8.1 支付失败场景

#### 8.1.1 卡片被拒绝
- **处理**：显示错误消息
- **用户操作**：重试支付或使用其他支付方式

#### 8.1.2 网络错误
- **处理**：显示网络错误消息
- **用户操作**：重试支付

#### 8.1.3 超时
- **处理**：显示超时错误消息
- **用户操作**：重试支付

### 8.2 用户友好错误

#### 8.2.1 错误消息映射
- **技术错误** → **用户友好消息**
- 示例：
  - "card_declined" → "Your card was declined. Please try another payment method."
  - "insufficient_funds" → "Insufficient funds. Please check your account balance."
  - "expired_card" → "Your card has expired. Please use a different card."

---

## 9. 用户故事

### 9.1 用户故事

#### 故事 1：完成支付
- **作为** 注册用户
- **我希望** 安全地完成课程支付
- **以便** 正式注册课程

#### 故事 2：保存支付方式
- **作为** 注册用户
- **我希望** 保存我的支付方式
- **以便** 下次结账时快速支付

#### 故事 3：查看订单
- **作为** 注册用户
- **我希望** 查看我的支付历史
- **以便** 跟踪我的订单

### 9.2 管理员故事

#### 故事 1：处理退款
- **作为** 管理员
- **我希望** 处理用户退款请求
- **以便** 提供良好的客户服务

#### 故事 2：查看支付统计
- **作为** 管理员
- **我希望** 查看支付统计信息
- **以便** 了解业务状况

---

## 10. 非功能需求

### 10.1 性能要求
- **创建支付会话**：< 2 秒
- **Webhook 处理**：< 1 秒
- **支付方式加载**：< 1 秒

### 10.2 可靠性要求
- **支付成功率**：> 99%
- **Webhook 处理**：确保不丢失事件
- **数据一致性**：确保支付状态和报名状态一致

### 10.3 安全性要求
- **PCI 合规**：使用 Stripe Elements
- **Webhook 验证**：验证所有 Webhook 请求
- **用户验证**：确保用户只能访问自己的支付信息

---

## 11. 技术实现

### 11.1 Stripe 集成

#### 11.1.1 前端
- **库**：`@stripe/stripe-js`、`@stripe/react-stripe-js`
- **组件**：Stripe Elements（PaymentElement）
- **功能**：收集支付信息、显示支付表单

#### 11.1.2 后端
- **库**：`stripe` (Node.js SDK)
- **功能**：
  - 创建 Checkout Session
  - 创建 Setup Intent
  - 处理 Webhook
  - 处理退款

### 11.2 数据模型

#### 11.2.1 报名表扩展
- `stripe_checkout_session_id`：Stripe Session ID
- `stripe_payment_intent_id`：Stripe Payment Intent ID
- `stripe_customer_id`：Stripe Customer ID
- `stripe_refund_id`：Stripe Refund ID
- `refund_amount`：退款金额
- `refund_reason`：退款原因
- `refunded_at`：退款时间

#### 11.2.2 用户表扩展
- `stripe_customer_id`：Stripe Customer ID

#### 11.2.3 支付事件表
- `stripe_payment_events`：支付事件审计表（可选）

### 11.3 API 端点

#### 11.3.1 支付 API
- `POST /api/payments/create-checkout-session`：创建支付会话
- `GET /api/payments/success`：支付成功验证
- `GET /api/payments/cancel`：支付取消
- `POST /api/payments/webhook`：Stripe Webhook

#### 11.3.2 支付方式 API
- `GET /api/user/payment-methods`：获取支付方式列表
- `POST /api/user/payment-methods`：创建 Setup Intent
- `DELETE /api/user/payment-methods/[id]`：删除支付方式
- `PATCH /api/user/payment-methods/[id]`：设置默认支付方式

---

## 12. 测试场景

### 12.1 支付测试

#### 12.1.1 成功支付
- **测试卡号**：`4242 4242 4242 4242`
- **验证**：
  - ✅ 支付成功
  - ✅ 报名状态更新为 `enrolled`
  - ✅ 支付状态更新为 `paid`
  - ✅ 实例容量正确更新

#### 12.1.2 支付失败
- **测试卡号**：`4000 0000 0000 0002`
- **验证**：
  - ✅ 支付失败
  - ✅ 报名状态保持为 `reserved`
  - ✅ 支付状态更新为 `failed`

#### 12.1.3 3D Secure
- **测试卡号**：`4000 0025 0000 3155`
- **验证**：
  - ✅ 触发 3D Secure 验证
  - ✅ 验证成功后支付成功

### 12.2 Webhook 测试

#### 12.2.1 使用 Stripe CLI
```bash
stripe listen --forward-to localhost:3000/api/payments/webhook
```

#### 12.2.2 测试事件
- `checkout.session.completed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`

---

## 13. 验收标准

### 13.1 功能验收
- ✅ 可以创建支付会话
- ✅ 可以完成支付
- ✅ 可以保存支付方式
- ✅ 可以管理支付方式
- ✅ 可以处理退款
- ✅ Webhook 正确处理
- ✅ 支付状态正确更新

### 13.2 安全验收
- ✅ PCI 合规（使用 Stripe Elements）
- ✅ Webhook 签名验证
- ✅ 用户验证正确
- ✅ 不存储完整卡片信息

---

## 14. 未来扩展

### 14.1 计划功能
- ⏳ 支持更多支付方式（Apple Pay、Google Pay）
- ⏳ 支持分期付款
- ⏳ 支持优惠券和折扣码
- ⏳ 支持订阅支付（如果未来有订阅课程）
- ⏳ Stripe Connect（多 Franchise 独立账户）

---

## 15. 附录

### 15.1 相关文档
- `STRIPE_PAYMENT_DESIGN.md`：支付系统设计
- `STRIPE_SETUP.md`：Stripe 设置指南
- `PAYMENT_METHOD_SETUP.md`：支付方式管理设置

### 15.2 测试卡号
- **成功支付**：`4242 4242 4242 4242`
- **需要 3D Secure**：`4000 0025 0000 3155`
- **支付失败**：`4000 0000 0000 0002`

### 15.3 Stripe 资源
- [Stripe 文档](https://stripe.com/docs)
- [Stripe 测试卡号](https://stripe.com/docs/testing)
- [Stripe Webhook 指南](https://stripe.com/docs/webhooks)

