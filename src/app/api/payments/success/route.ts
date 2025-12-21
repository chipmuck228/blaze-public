import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { stripe } from '@/lib/stripe'
import { getEnrollmentByStripeSessionId, confirmEnrollment } from '@/lib/db'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = req.nextUrl.searchParams
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'session_id is required' },
        { status: 400 }
      )
    }

    // 从 Stripe 获取 Session 详情
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId)

    // 验证 Session 属于当前用户
    if (checkoutSession.metadata?.user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 403 }
      )
    }

    // 获取注册记录
    const enrollment = await getEnrollmentByStripeSessionId(sessionId)

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Enrollment not found' },
        { status: 404 }
      )
    }

    // 如果支付成功但状态还未更新，手动更新
    if (checkoutSession.payment_status === 'paid' && enrollment.payment_status !== 'paid') {
      const paymentIntentId = checkoutSession.payment_intent as string
      if (paymentIntentId) {
        try {
          await confirmEnrollment(
            enrollment.id,
            enrollment.user_id,
            paymentIntentId,
            (checkoutSession.amount_total || 0) / 100,
            paymentIntentId
          )
        } catch (error: any) {
          console.error('Error confirming enrollment:', error)
          // 继续返回，即使更新失败（Webhook 可能会处理）
        }
      }
    }

    // 获取所有相关的注册（通过 session ID 直接查询）
    const enrollmentIds = checkoutSession.metadata?.enrollment_ids
      ? JSON.parse(checkoutSession.metadata.enrollment_ids)
      : [enrollment.id]

    const { data: allEnrollments } = await supabaseAdmin
      .from('course_enrollments')
      .select(`
        *,
        instance:course_instances(
          *,
          assignment:course_assignments(
            *,
            course:courses(*),
            category:course_categories(*),
            series:course_series(*),
            location:course_locations(*)
          ),
          location:course_locations(*)
        )
      `)
      .eq('stripe_checkout_session_id', sessionId)
      .in('id', enrollmentIds)

    const enrollments = allEnrollments || []

    return NextResponse.json({
      success: true,
      session_id: sessionId,
      payment_status: checkoutSession.payment_status,
      enrollments: enrollments.filter(Boolean),
    })
  } catch (error: any) {
    console.error('Error verifying payment:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to verify payment' },
      { status: 500 }
    )
  }
}

