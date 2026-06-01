import { NextResponse } from 'next/server'
import { getErrorMessage } from "@/lib/typed-error"
import { auth } from '@/auth'
import { stripe } from '@/lib/stripe'
import { 
  checkoutInstanceEnrollments, 
  calculateInstanceEnrollmentTotal, 
  updateInstanceEnrollmentStripeInfo,
  getInstanceEnrollmentById 
} from '@/lib/db'
import { isStudentAccount } from '@/lib/permissions'

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 验证用户不是学生账户（学生账户不能支付）
    const isStudent = await isStudentAccount(session.user.id)
    if (isStudent) {
      return NextResponse.json(
        { 
          error: 'Student accounts cannot checkout. Payment must be initiated by the payer.',
          code: 'STUDENT_CANNOT_PAY'
        },
        { status: 403 }
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

    // 验证所有注册都属于当前用户（付款人）且状态为 cart
    const enrollments = await Promise.all(
      enrollment_ids.map(id => getInstanceEnrollmentById(id))
    )

    const invalidEnrollments = enrollments.filter(
      (e) => !e || e.payer_user_id !== session.user.id || e.status !== 'cart' || e.is_synced === true
    )

    if (invalidEnrollments.length > 0) {
      // 提供更详细的错误信息
      const now = new Date().toISOString()
      const expired = invalidEnrollments.filter(e => 
        e && e.status === 'cart' && e.cart_expires_at && e.cart_expires_at <= now
      )
      const wrongStatus = invalidEnrollments.filter(e => e && e.status !== 'cart')
      const synced = invalidEnrollments.filter(e => e && e.is_synced === true)
      
      let errorMessage = 'Some enrollments are invalid or not in cart'
      if (expired.length > 0) {
        errorMessage = 'Some items in your cart have expired. Please refresh the page and try again.'
      } else if (synced.length > 0) {
        errorMessage = 'Cannot checkout synced cart items. Please checkout from the payer account.'
      } else if (wrongStatus.length > 0) {
        errorMessage = `Some enrollments are no longer in cart (status: ${wrongStatus.map(e => e?.status).join(', ')}).`
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      )
    }

    // 先结账（转为 reserved 状态）
    const reservedEnrollments = await checkoutInstanceEnrollments(
      enrollment_ids,
      session.user.id
    )

    // 计算总金额
    const { total, currency, items } = await calculateInstanceEnrollmentTotal(enrollment_ids)

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
              ...(item.instanceName && { description: `${item.instanceName} - ${item.studentName}` }),
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
    } catch (stripeError: unknown) {
      console.error('Stripe API error:', stripeError)
      return NextResponse.json(
        { 
          error: getErrorMessage(stripeError) || 'Failed to create payment session',
          details:
            process.env.NODE_ENV === "development" && stripeError instanceof Error
              ? stripeError.stack
              : undefined
        },
        { status: 500 }
      )
    }

    // 更新所有注册记录，保存 Stripe Checkout Session ID
    await Promise.all(
      enrollment_ids.map(id =>
        updateInstanceEnrollmentStripeInfo(id, {
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
  } catch (error: unknown) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: getErrorMessage(error) || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
