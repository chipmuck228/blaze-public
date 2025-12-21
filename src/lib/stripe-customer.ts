import { stripe } from './stripe'
import { supabaseAdmin } from './supabase'

/**
 * 获取或创建用户的 Stripe Customer
 * 如果用户已有 stripe_customer_id，则返回；否则创建新的 Customer 并保存到数据库
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<string> {
  // 1. 检查用户是否已有 Stripe Customer ID
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single()

  if (userError) {
    throw new Error(`Failed to fetch user: ${userError.message}`)
  }

  // 2. 如果已有 Customer ID，验证它是否仍然有效
  if (user.stripe_customer_id) {
    try {
      const customer = await stripe.customers.retrieve(user.stripe_customer_id)
      if (customer && !customer.deleted) {
        return user.stripe_customer_id
      }
      // 如果 Customer 已被删除，继续创建新的
    } catch (error) {
      // Customer 不存在，继续创建新的
      console.warn(`Stripe Customer ${user.stripe_customer_id} not found, creating new one`)
    }
  }

  // 3. 创建新的 Stripe Customer
  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    metadata: {
      user_id: userId,
    },
  })

  // 4. 保存到数据库
  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({
      stripe_customer_id: customer.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (updateError) {
    console.error('Failed to save Stripe Customer ID to database:', updateError)
    // 即使保存失败，也返回 Customer ID（因为 Stripe 已创建成功）
  }

  return customer.id
}

/**
 * 获取用户的 Stripe Customer ID
 */
export async function getUserStripeCustomerId(userId: string): Promise<string | null> {
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single()

  if (error || !user) {
    return null
  }

  return user.stripe_customer_id || null
}

