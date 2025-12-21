# Stripe 支付系统设置指南

## 1. 环境变量配置

在 `.env.local` 文件中添加以下环境变量：

```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_...  # 测试环境密钥（服务端使用）
STRIPE_PUBLISHABLE_KEY=pk_test_...  # 测试环境公钥（服务端使用，可选）
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # 测试环境公钥（客户端使用，必须！）
STRIPE_WEBHOOK_SECRET=whsec_...  # Webhook 签名密钥

# 应用 URL（用于构建支付成功/取消 URL）
NEXT_PUBLIC_APP_URL=http://localhost:3000  # 开发环境
# 生产环境使用实际域名，如：https://blazeroboticsacademy.org
```

**重要**：
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` 是**必须的**，用于前端 Stripe Elements
- `STRIPE_PUBLISHABLE_KEY` 和 `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` 可以使用相同的值（Publishable Key 是公开的）

## 2. 获取 Stripe API Keys

### 2.1 创建 Stripe 账户

1. 访问 [Stripe 官网](https://stripe.com/)
2. 注册账户
3. 完成账户验证（KYC）

### 2.2 获取测试 API Keys

1. 登录 [Stripe Dashboard](https://dashboard.stripe.com/)
2. 进入 **Developers** → **API keys**
3. 复制 **Secret key** (以 `sk_test_` 开头)
4. 复制 **Publishable key** (以 `pk_test_` 开头)

### 2.3 配置 Webhook

1. 在 Stripe Dashboard 中，进入 **Developers** → **Webhooks**
2. 点击 **Add endpoint**
3. 输入 Webhook URL：
   - **开发环境**: `https://your-ngrok-url.ngrok.io/api/payments/webhook`
   - **生产环境**: `https://yoursite.com/api/payments/webhook`
4. 选择要监听的事件：
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. 复制 **Signing secret** (以 `whsec_` 开头)

### 2.4 本地开发 Webhook 测试

使用 [Stripe CLI](https://stripe.com/docs/stripe-cli) 进行本地测试：

```bash
# 安装 Stripe CLI
# macOS: brew install stripe/stripe-cli/stripe
# 其他平台: https://stripe.com/docs/stripe-cli

# 登录
stripe login

# 转发 Webhook 到本地
stripe listen --forward-to localhost:3000/api/payments/webhook

# 复制输出的 webhook signing secret 到 .env.local
```

## 3. 数据库迁移

运行数据库迁移脚本：

```sql
-- 在 Supabase SQL Editor 中执行
-- 文件: migrate-add-stripe-fields.sql
```

或者使用 Supabase CLI：

```bash
supabase db push
```

## 4. 测试支付流程

### 4.1 使用测试卡号

Stripe 提供以下测试卡号：

**成功支付**:
- 卡号: `4242 4242 4242 4242`
- 过期日期: 任何未来日期
- CVC: 任何 3 位数字
- ZIP: 任何 5 位数字

**需要 3D Secure**:
- 卡号: `4000 0025 0000 3155`

**支付失败**:
- 卡号: `4000 0000 0000 0002`

### 4.2 测试流程

1. 将课程加入购物车
2. 点击 "Checkout"
3. 使用测试卡号完成支付
4. 验证支付成功页面显示
5. 检查数据库中的注册状态是否更新为 `enrolled`

## 5. 生产环境配置

### 5.1 切换到生产环境

1. 在 Stripe Dashboard 中切换到 **Live mode**
2. 获取生产环境的 API Keys
3. 更新 `.env.local` 或 Vercel 环境变量：
   - `STRIPE_SECRET_KEY` → 生产环境密钥 (以 `sk_live_` 开头)
   - `STRIPE_PUBLISHABLE_KEY` → 生产环境公钥 (以 `pk_live_` 开头)
4. 配置生产环境的 Webhook URL

### 5.2 Vercel 环境变量

在 Vercel Dashboard 中设置环境变量：

1. 进入项目 **Settings** → **Environment Variables**
2. 添加以下变量：
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_APP_URL`
3. 选择适用的环境（Production, Preview, Development）

## 6. 监控和调试

### 6.1 Stripe Dashboard

- 查看所有支付交易
- 查看 Webhook 事件日志
- 查看错误和失败原因

### 6.2 日志记录

系统会记录以下信息：
- 支付会话创建
- Webhook 事件处理
- 支付成功/失败
- 错误信息

### 6.3 常见问题

**Webhook 未触发**:
- 检查 Webhook URL 是否正确
- 检查 Webhook 签名密钥是否正确
- 查看 Stripe Dashboard 中的 Webhook 日志

**支付成功但状态未更新**:
- 检查 Webhook 是否正常处理
- 检查数据库连接
- 查看服务器日志

**金额不匹配**:
- 检查价格计算逻辑
- 验证数据库中的价格数据

## 7. 安全注意事项

1. **永远不要**在前端代码中暴露 Secret Key
2. **始终**验证 Webhook 签名
3. **使用** HTTPS（生产环境）
4. **定期**检查 Stripe Dashboard 中的异常活动
5. **启用** Stripe 的欺诈检测功能

## 8. 下一步

- [ ] 配置 Stripe Connect（多租户支持）
- [ ] 实现退款功能
- [ ] 添加支付收据邮件
- [ ] 实现支付历史记录
- [ ] 添加优惠券支持

