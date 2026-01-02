import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取用户的付费记录
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // 获取所有已付费的注册记录
    const { data, error } = await supabaseAdmin
      .from('course_enrollments')
      .select(`
        id,
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
              slug
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
              name
            )
          ),
          location:course_locations(
            id,
            name
          )
        )
      `)
      .eq('user_id', session.user.id)
      .in('payment_status', ['paid', 'refunded'])
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch billing history: ${error.message}`)
    }

    // 格式化数据
    const billingHistory = (data || []).map((enrollment: any) => {
      const instance = Array.isArray(enrollment.instance) ? enrollment.instance[0] : enrollment.instance
      const assignment = instance?.assignment ? (Array.isArray(instance.assignment) ? instance.assignment[0] : instance.assignment) : null
      const course = assignment?.course ? (Array.isArray(assignment.course) ? assignment.course[0] : assignment.course) : null
      const category = assignment?.category ? (Array.isArray(assignment.category) ? assignment.category[0] : assignment.category) : null
      const series = assignment?.series ? (Array.isArray(assignment.series) ? assignment.series[0] : assignment.series) : null
      const location = instance?.location ? (Array.isArray(instance.location) ? instance.location[0] : instance.location) : null

      return {
        id: enrollment.id,
        amount: enrollment.amount_paid || 0,
        currency: enrollment.currency || 'USD',
        payment_status: enrollment.payment_status,
        payment_transaction_id: enrollment.payment_transaction_id,
        stripe_checkout_session_id: enrollment.stripe_checkout_session_id,
        stripe_payment_intent_id: enrollment.stripe_payment_intent_id,
        enrolled_at: enrollment.enrolled_at,
        created_at: enrollment.created_at,
        course: course ? {
          id: course.id,
          name: course.name,
          slug: course.slug,
        } : null,
        category: category ? {
          id: category.id,
          name: category.name,
          display_name: category.display_name,
        } : null,
        series: series ? {
          id: series.id,
          name: series.name,
          display_name: series.display_name,
        } : null,
        location: location ? {
          id: location.id,
          name: location.name,
        } : null,
        instance: instance ? {
          id: instance.id,
          start_date: instance.start_date,
          end_date: instance.end_date,
          start_time: instance.start_time,
          end_time: instance.end_time,
        } : null,
      }
    })

    return NextResponse.json({ billingHistory })
  } catch (error: any) {
    console.error("Error fetching billing history:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch billing history" },
      { status: 500 }
    )
  }
}

