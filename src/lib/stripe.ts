import Stripe from 'stripe'

// 延迟初始化 Stripe，避免在模块加载时抛出错误
let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    })
  }
  return stripeInstance
}

// 为了向后兼容，导出 stripe
export const stripe = getStripe()

// 获取 Stripe 公钥（用于前端）
export function getStripePublishableKey(): string {
  return process.env.STRIPE_PUBLISHABLE_KEY || ''
}

// 验证 Webhook 签名
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, secret)
}

// 重新导出价格计算函数（从 db.ts）
export type { EnrollmentPriceInfo } from './db'
export { calculateEnrollmentTotal } from './db'

