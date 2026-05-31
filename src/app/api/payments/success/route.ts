import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from "@/lib/typed-error"
import { auth } from '@/auth'
import { stripe } from '@/lib/stripe'
import { 
  getEnrollmentByStripeSessionId, 
  confirmEnrollment,
  getInstanceEnrollmentByStripeSessionId,
  confirmInstanceEnrollment
} from '@/lib/db'
import { supabaseAdmin } from '@/lib/supabase'

type CheckoutEnrollment = {
  id: string
  payment_status?: string
  payer_user_id?: string
  user_id?: string
}

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

    // 优先使用 instance_enrollments
    let enrollment: CheckoutEnrollment | null =
      (await getInstanceEnrollmentByStripeSessionId(sessionId)) as CheckoutEnrollment | null
    let isInstanceEnrollment = true
    
    if (!enrollment) {
      // 回退到旧的 course_enrollments 表
      enrollment = (await getEnrollmentByStripeSessionId(sessionId)) as CheckoutEnrollment | null
      isInstanceEnrollment = false
    }

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
          if (isInstanceEnrollment) {
            await confirmInstanceEnrollment(
              enrollment.id,
              enrollment.payer_user_id!,
              paymentIntentId,
              (checkoutSession.amount_total || 0) / 100,
              paymentIntentId
            )
          } else {
            await confirmEnrollment(
              enrollment.id,
              enrollment.user_id!,
              paymentIntentId,
              (checkoutSession.amount_total || 0) / 100,
              paymentIntentId
            )
          }
        } catch (error: unknown) {
          console.error('Error confirming enrollment:', error)
          // 继续返回，即使更新失败（Webhook 可能会处理）
        }
      }
    }

    // 获取所有相关的注册（通过 session ID 直接查询）
    const enrollmentIds = checkoutSession.metadata?.enrollment_ids
      ? JSON.parse(checkoutSession.metadata.enrollment_ids)
      : [enrollment.id]

    // 优先查询 instance_enrollments
    let allEnrollments = null
    const { data: instanceEnrollments } = await supabaseAdmin
      .from('instance_enrollments')
      .select(`
        *,
        instance:instance_v2(
          *,
          offering:offerings_v2(*),
          location:course_locations(*)
        )
      `)
      .eq('stripe_checkout_session_id', sessionId)
      .in('id', enrollmentIds)
    
    if (instanceEnrollments && instanceEnrollments.length > 0) {
      allEnrollments = instanceEnrollments
    } else {
      // 回退到旧的 course_enrollments
      const { data: courseEnrollments } = await supabaseAdmin
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
      
      allEnrollments = courseEnrollments
    }

    const enrollments = allEnrollments || []

    return NextResponse.json({
      success: true,
      session_id: sessionId,
      payment_status: checkoutSession.payment_status,
      enrollments: enrollments.filter(Boolean),
    })
  } catch (error: unknown) {
    console.error('Error verifying payment:', error)
    return NextResponse.json(
      { error: getErrorMessage(error) || 'Failed to verify payment' },
      { status: 500 }
    )
  }
}

