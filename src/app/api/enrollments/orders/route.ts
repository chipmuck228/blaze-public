import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// GET: 获取用户的订单列表（基于 instance_enrollments）
export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // 可选：all, enrolled, waitlisted, cancelled

    // 构建查询
    let query = supabaseAdmin
      .from('instance_enrollments')
      .select(`
        id,
        user_id,
        payer_user_id,
        instance_id,
        student_id,
        student_name,
        status,
        payment_status,
        amount_paid,
        tax_amount,
        enrolled_at,
        waitlist_position,
        created_at,
        updated_at,
        instance:instance_v2(
          id,
          start_date,
          end_date,
          start_time,
          end_time,
          is_course_type,
          offering:offerings_v2(
            id,
            name,
            description,
            base_price
          ),
          location:course_locations(
            id,
            name,
            address
          ),
          franchise:franchises_v2(
            id,
            code,
            name
          )
        )
      `)
      .or(`user_id.eq.${session.user.id},payer_user_id.eq.${session.user.id}`)
      .order('created_at', { ascending: false })

    // 应用状态筛选
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching orders:', error)
      return NextResponse.json(
        { error: getErrorMessage(error) || "Failed to fetch orders" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      enrollments: data || [],
      total: data?.length || 0
    })
  } catch (error: unknown) {
    console.error("Error fetching orders:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch orders" },
      { status: 500 }
    )
  }
}
