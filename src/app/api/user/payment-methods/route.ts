import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { stripe } from "@/lib/stripe"
import { getOrCreateStripeCustomer, getUserStripeCustomerId } from "@/lib/stripe-customer"

// GET: 获取用户的所有支付方式
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // 获取用户的 Stripe Customer ID
    const customerId = await getUserStripeCustomerId(session.user.id)
    
    if (!customerId) {
      // 用户还没有 Stripe Customer，返回空数组
      return NextResponse.json([])
    }

    // 从 Stripe 获取支付方式
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    })

    // 获取默认支付方式
    const customer = await stripe.customers.retrieve(customerId)
    const defaultPaymentMethodId = 
      typeof customer !== 'deleted' && customer.invoice_settings?.default_payment_method
        ? customer.invoice_settings.default_payment_method as string
        : null

    // 格式化返回数据
    const formattedMethods = paymentMethods.data.map((pm) => {
      const card = pm.card
      return {
        id: pm.id,
        type: pm.type,
        card: card ? {
          brand: card.brand,
          last4: card.last4,
          exp_month: card.exp_month,
          exp_year: card.exp_year,
        } : null,
        is_default: pm.id === defaultPaymentMethodId,
        created: pm.created,
      }
    })

    return NextResponse.json(formattedMethods)
  } catch (error: any) {
    console.error("Error fetching payment methods:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch payment methods" },
      { status: 500 }
    )
  }
}

// POST: 创建 Setup Intent 用于添加支付方式
export async function POST() {
  try {
    const session = await auth()

    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // 获取或创建 Stripe Customer
    const customerId = await getOrCreateStripeCustomer(
      session.user.id,
      session.user.email,
      session.user.name || undefined
    )

    // 创建 Setup Intent（用于保存支付方式，不立即收费）
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    })

    return NextResponse.json({
      client_secret: setupIntent.client_secret,
      customer_id: customerId,
    })
  } catch (error: any) {
    console.error("Error creating setup intent:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create setup intent" },
      { status: 500 }
    )
  }
}
