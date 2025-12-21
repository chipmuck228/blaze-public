# 支付方式管理功能设置指南

## 概述

已在用户 Profile 页面添加了完整的支付方式管理功能，允许用户添加、查看、设置默认和删除支付方式。

## 功能特性

### 1. 添加支付方式
- 使用 Stripe Elements 安全收集支付信息（PCI 合规）
- 使用 Setup Intent（不立即收费，仅保存支付方式）
- 支持信用卡/借记卡

### 2. 管理支付方式
- 查看所有已保存的支付方式
- 设置默认支付方式
- 删除支付方式
- 显示卡片品牌、最后4位数字、过期日期

### 3. 安全性
- 所有支付信息由 Stripe 处理，符合 PCI 合规要求
- 服务器端验证用户身份
- 验证支付方式所有权

## 数据库迁移

运行以下 SQL 迁移脚本：

```sql
-- 文件: migrate-add-user-stripe-customer-id.sql
-- 在 Supabase SQL Editor 中执行
```

或者使用 Supabase CLI：

```bash
supabase db push
```

## 环境变量配置

确保 `.env.local` 文件中包含：

```env
# Stripe 配置
STRIPE_SECRET_KEY=sk_test_...  # 或 sk_live_... (生产环境) - 服务端使用
STRIPE_PUBLISHABLE_KEY=pk_test_...  # 或 pk_live_... (生产环境) - 服务端使用（可选）
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # 前端使用（必须！）
```

**重要说明**：
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` 是**必须的**，因为前端需要它来初始化 Stripe Elements
- `STRIPE_PUBLISHABLE_KEY` 是可选的（如果只用于服务端）
- 两个变量可以使用相同的值（Publishable Key 是公开的，可以安全地暴露在客户端）

**重要**：`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` 必须设置，否则前端无法加载 Stripe Elements。

## API 端点

### GET `/api/user/payment-methods`
获取用户的所有支付方式

**响应**：
```json
[
  {
    "id": "pm_...",
    "type": "card",
    "card": {
      "brand": "visa",
      "last4": "4242",
      "exp_month": 12,
      "exp_year": 2025
    },
    "is_default": true,
    "created": 1234567890
  }
]
```

### POST `/api/user/payment-methods`
创建 Setup Intent 用于添加支付方式

**响应**：
```json
{
  "client_secret": "seti_...",
  "customer_id": "cus_..."
}
```

### DELETE `/api/user/payment-methods/[id]`
删除支付方式

### PATCH `/api/user/payment-methods/[id]`
设置默认支付方式

## 组件结构

### 1. `AddPaymentMethodDialog`
- 位置：`src/components/payment/AddPaymentMethodDialog.tsx`
- 功能：显示对话框，使用 Stripe Elements 收集支付信息
- 使用：`@stripe/react-stripe-js` 和 `@stripe/stripe-js`

### 2. Profile 页面集成
- 位置：`src/app/profile/page.tsx`
- 功能：显示支付方式列表，管理操作

## 使用流程

### 用户添加支付方式

1. 用户访问 Profile 页面 → Payment Methods tab
2. 点击 "Add Payment Method" 按钮
3. 对话框打开，显示 Stripe Elements 支付表单
4. 用户输入卡片信息
5. 点击 "Add Payment Method"
6. Stripe 验证并保存支付方式
7. 对话框关闭，支付方式列表刷新

### 用户管理支付方式

1. **设置默认**：
   - 点击 "Set as Default" 按钮
   - 该支付方式被标记为默认

2. **删除支付方式**：
   - 点击 "Remove" 按钮
   - 确认后删除

## 技术实现

### Stripe Customer 管理

- 函数：`getOrCreateStripeCustomer()` (在 `src/lib/stripe-customer.ts`)
- 功能：自动创建或获取用户的 Stripe Customer ID
- 存储：`users.stripe_customer_id` 字段

### Setup Intent

- 用途：保存支付方式而不立即收费
- 创建：通过 POST `/api/user/payment-methods`
- 确认：在前端使用 `stripe.confirmSetup()`

## 最佳实践

### 1. 安全性
- ✅ 使用 Stripe Elements（PCI 合规）
- ✅ 服务器端验证用户身份
- ✅ 验证支付方式所有权
- ✅ 不存储完整的卡片信息

### 2. 用户体验
- ✅ 清晰的错误提示
- ✅ 加载状态指示
- ✅ 确认对话框（删除操作）
- ✅ 自动刷新列表

### 3. 错误处理
- ✅ 网络错误处理
- ✅ Stripe API 错误处理
- ✅ 用户友好的错误消息

## 测试

### 使用测试卡号

Stripe 提供以下测试卡号：

**成功**：
- 卡号：`4242 4242 4242 4242`
- 过期日期：任何未来日期
- CVC：任何 3 位数字
- ZIP：任何 5 位数字

**需要 3D Secure**：
- 卡号：`4000 0025 0000 3155`

**支付失败**：
- 卡号：`4000 0000 0000 0002`

## 故障排除

### 问题 1：Stripe Elements 不加载

**原因**：`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` 未设置

**解决**：
1. 检查 `.env.local` 文件
2. 确保变量名正确
3. 重启开发服务器

### 问题 2：Setup Intent 创建失败

**原因**：Stripe Customer 创建失败或 API Key 无效

**解决**：
1. 检查 `STRIPE_SECRET_KEY` 是否正确
2. 查看服务器日志
3. 验证 Stripe 账户状态

### 问题 3：支付方式无法删除

**原因**：支付方式不属于用户或已被删除

**解决**：
1. 检查服务器日志
2. 验证 Stripe Customer ID 是否正确
3. 检查支付方式是否仍然存在

## 下一步

1. **运行数据库迁移**：执行 `migrate-add-user-stripe-customer-id.sql`
2. **配置环境变量**：确保 `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` 已设置
3. **测试功能**：使用测试卡号添加支付方式
4. **集成到支付流程**：在结账时允许用户选择已保存的支付方式（可选）

## 相关文件

- `src/components/payment/AddPaymentMethodDialog.tsx` - 添加支付方式对话框
- `src/app/profile/page.tsx` - Profile 页面
- `src/app/api/user/payment-methods/route.ts` - 支付方式 API
- `src/app/api/user/payment-methods/[id]/route.ts` - 单个支付方式操作 API
- `src/lib/stripe-customer.ts` - Stripe Customer 管理
- `migrate-add-user-stripe-customer-id.sql` - 数据库迁移脚本

