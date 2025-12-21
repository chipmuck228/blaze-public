import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { stripe } from '@/lib/stripe'
import { 
  checkoutCart, 
  calculateEnrollmentTotal, 
  updateEnrollmentStripeInfo,
  getEnrollmentById 
} from '@/lib/db'

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    let body
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const { enrollment_ids, success_url, cancel_url } = body

    if (!enrollment_ids || !Array.isArray(enrollment_ids) || enrollment_ids.length === 0) {
      return NextResponse.json(
        { error: 'enrollment_ids array is required' },
        { status: 400 }
      )
    }

    // 验证所有注册都属于当前用户且状态为 cart（checkoutCart 会进行更详细的验证）
    // 这里只做基本检查，详细验证在 checkoutCart 中进行
    const enrollments = await Promise.all(
      enrollment_ids.map(id => getEnrollmentById(id))
    )

    const invalidEnrollments = enrollments.filter(
      (e) => !e || e.user_id !== session.user.id || e.status !== 'cart'
    )

    if (invalidEnrollments.length > 0) {
      // 提供更详细的错误信息
      const now = new Date().toISOString()
      const expired = invalidEnrollments.filter(e => 
        e && e.status === 'cart' && e.cart_expires_at && e.cart_expires_at <= now
      )
      const wrongStatus = invalidEnrollments.filter(e => e && e.status !== 'cart')
      
      let errorMessage = 'Some enrollments are invalid or not in cart'
      if (expired.length > 0) {
        errorMessage = 'Some items in your cart have expired. Please refresh the page and try again.'
      } else if (wrongStatus.length > 0) {
        errorMessage = `Some enrollments are no longer in cart (status: ${wrongStatus.map(e => e?.status).join(', ')}).`
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      )
    }

    // 先结账（转为 reserved 状态）
    const reservedEnrollments = await checkoutCart(
      enrollment_ids,
      session.user.id
    )

    // 计算总金额
    const { total, currency, items } = await calculateEnrollmentTotal(enrollment_ids)

    if (total <= 0) {
      return NextResponse.json(
        { error: 'Total amount must be greater than 0' },
        { status: 400 }
      )
    }

    // 构建成功和取消 URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                    'http://localhost:3000'
    
    const finalSuccessUrl = success_url || `${baseUrl}/enrollments/success?session_id={CHECKOUT_SESSION_ID}`
    const finalCancelUrl = cancel_url || `${baseUrl}/enrollments/cancel`

    // 检查 Stripe 是否已配置
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY is not configured')
      return NextResponse.json(
        { error: 'Payment system is not configured. Please contact support.' },
        { status: 500 }
      )
    }

    // 创建 Stripe Checkout Session
    let checkoutSession
    try {
      checkoutSession = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: items.map(item => ({
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: item.courseName,
              ...(item.instanceName && { description: `Instance: ${item.instanceName}` }),
            },
            unit_amount: Math.round(item.amount * 100), // 转换为分（Stripe 使用最小货币单位）
          },
          quantity: 1,
        })),
        success_url: finalSuccessUrl,
        cancel_url: finalCancelUrl,
        customer_email: session.user.email || undefined,
        metadata: {
          user_id: session.user.id,
          enrollment_ids: JSON.stringify(enrollment_ids),
        },
      })
    } catch (stripeError: any) {
      console.error('Stripe API error:', stripeError)
      return NextResponse.json(
        { 
          error: stripeError.message || 'Failed to create payment session',
          details: process.env.NODE_ENV === 'development' ? stripeError.stack : undefined
        },
        { status: 500 }
      )
    }

    // 更新所有注册记录，保存 Stripe Checkout Session ID
    await Promise.all(
      enrollment_ids.map(id =>
        updateEnrollmentStripeInfo(id, {
          checkout_session_id: checkoutSession.id,
        })
      )
    )

    return NextResponse.json({
      checkout_session_id: checkoutSession.id,
      url: checkoutSession.url,
      total_amount: total,
      currency,
    })
  } catch (error: any) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

