import { NextRequest, NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 发送发票邮件
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params

    // 获取注册记录
    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from('course_enrollments')
      .select(`
        id,
        user_id,
        amount_paid,
        currency,
        payment_status,
        payment_transaction_id,
        stripe_checkout_session_id,
        stripe_payment_intent_id,
        enrolled_at,
        created_at,
        instance:course_instances(
          id,
          start_date,
          end_date,
          start_time,
          end_time,
          assignment:course_assignments(
            id,
            course:courses(
              id,
              name,
              slug,
              description
            ),
            category:course_categories(
              id,
              name,
              display_name
            ),
            series:course_series(
              id,
              name,
              display_name
            ),
            location:course_locations(
              id,
              name,
              address,
              city,
              state,
              zip_code
            )
          ),
          location:course_locations(
            id,
            name,
            address,
            city,
            state,
            zip_code
          )
        )
      `)
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single()

    if (enrollmentError || !enrollment) {
      return NextResponse.json(
        { error: "Enrollment not found" },
        { status: 404 }
      )
    }

    // 获取用户信息
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, name, email')
      .eq('id', session.user.id)
      .single()

    if (!user || !user.email) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 404 }
      )
    }

    // 格式化数据
    const instance = Array.isArray(enrollment.instance) ? enrollment.instance[0] : enrollment.instance
    const assignment = instance?.assignment ? (Array.isArray(instance.assignment) ? instance.assignment[0] : instance.assignment) : null
    const course = assignment?.course ? (Array.isArray(assignment.course) ? assignment.course[0] : assignment.course) : null
    const category = assignment?.category ? (Array.isArray(assignment.category) ? assignment.category[0] : assignment.category) : null
    const series = assignment?.series ? (Array.isArray(assignment.series) ? assignment.series[0] : assignment.series) : null
    const location = instance?.location ? (Array.isArray(instance.location) ? instance.location[0] : instance.location) : null

    // 获取 Stripe 收据 URL（如果有）
    let stripeReceiptUrl: string | null = null
    if (enrollment.stripe_checkout_session_id) {
      try {
        const { stripe } = await import('@/lib/stripe')
        const checkoutSession = await stripe.checkout.sessions.retrieve(
          enrollment.stripe_checkout_session_id,
          { expand: ['payment_intent'] }
        )
        if (checkoutSession.payment_intent) {
          const paymentIntent = typeof checkoutSession.payment_intent === 'string'
            ? await stripe.paymentIntents.retrieve(checkoutSession.payment_intent, { expand: ['charges'] })
            : checkoutSession.payment_intent
          
          if (paymentIntent.latest_charge) {
            const chargeId = typeof paymentIntent.latest_charge === 'string'
              ? paymentIntent.latest_charge
              : paymentIntent.latest_charge.id
            
            const charge = await stripe.charges.retrieve(chargeId)
            if (charge.receipt_url) {
              stripeReceiptUrl = charge.receipt_url
            }
          }
        }
      } catch (stripeError) {
        console.error('Error fetching Stripe receipt:', stripeError)
        // 继续发送邮件，即使没有 Stripe 收据 URL
      }
    }

    // 准备发票数据
    const invoiceData = {
      invoice_number: `INV-${enrollment.id.substring(0, 8).toUpperCase()}`,
      date: new Date(enrollment.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      payment_date: enrollment.enrolled_at
        ? new Date(enrollment.enrolled_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : null,
      course: course ? {
        name: course.name,
        description: course.description,
      } : null,
      category: category ? {
        name: category.display_name || category.name,
      } : null,
      series: series ? {
        name: series.display_name || series.name,
      } : null,
      location: location ? {
        name: location.name,
        address: [location.address, location.city, location.state, location.zip_code]
          .filter(Boolean)
          .join(', '),
      } : null,
      instance: instance ? {
        start_date: instance.start_date,
        start_time: instance.start_time,
        end_time: instance.end_time,
      } : null,
      items: [
        {
          description: course?.name || 'Course Enrollment',
          quantity: 1,
          unit_price: enrollment.amount_paid || 0,
          total: enrollment.amount_paid || 0,
        },
      ],
      subtotal: enrollment.amount_paid || 0,
      tax: 0,
      total: enrollment.amount_paid || 0,
      currency: enrollment.currency || 'USD',
      payment_status: enrollment.payment_status,
      payment_transaction_id: enrollment.payment_transaction_id,
      stripe_receipt_url: stripeReceiptUrl,
    }

    // 发送邮件（使用动态导入避免模块缓存问题）
    const { sendInvoiceEmail } = await import('@/lib/email')
    await sendInvoiceEmail(user.email, user.name || 'Customer', invoiceData)

    return NextResponse.json({ 
      success: true,
      message: 'Invoice sent successfully' 
    })
  } catch (error: unknown) {
    console.error("Error sending invoice email:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to send invoice email" },
      { status: 500 }
    )
  }
}

