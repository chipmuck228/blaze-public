import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// GET: 获取注册统计数据
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 获取总数
    const { count: total } = await supabaseAdmin
      .from("course_enrollments")
      .select("id", { count: "exact", head: true })

    // 按状态统计
    const statusCounts = await Promise.all([
      supabaseAdmin
        .from("course_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("status", "enrolled"),
      supabaseAdmin
        .from("course_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("status", "reserved"),
      supabaseAdmin
        .from("course_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("status", "cart"),
      supabaseAdmin
        .from("course_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("status", "waitlisted"),
      supabaseAdmin
        .from("course_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("status", "cancelled"),
      supabaseAdmin
        .from("course_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("status", "expired"),
      supabaseAdmin
        .from("course_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed"),
    ])

    // 按支付状态统计
    const paymentStatusCounts = await Promise.all([
      supabaseAdmin
        .from("course_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("payment_status", "paid"),
      supabaseAdmin
        .from("course_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("payment_status", "pending"),
      supabaseAdmin
        .from("course_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("payment_status", "unpaid"),
      supabaseAdmin
        .from("course_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("payment_status", "refunded"),
      supabaseAdmin
        .from("course_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("payment_status", "failed"),
    ])

    // 计算总收入（已支付的注册）
    const { data: paidEnrollments } = await supabaseAdmin
      .from("course_enrollments")
      .select("amount_paid")
      .eq("payment_status", "paid")
      .not("amount_paid", "is", null)

    const totalRevenue = paidEnrollments?.reduce((sum, e) => sum + (parseFloat(e.amount_paid) || 0), 0) || 0

    // 计算本月收入
    const thisMonth = new Date()
    thisMonth.setDate(1)
    thisMonth.setHours(0, 0, 0, 0)

    const { data: thisMonthEnrollments } = await supabaseAdmin
      .from("course_enrollments")
      .select("amount_paid")
      .eq("payment_status", "paid")
      .not("amount_paid", "is", null)
      .gte("enrolled_at", thisMonth.toISOString())

    const thisMonthRevenue = thisMonthEnrollments?.reduce((sum, e) => sum + (parseFloat(e.amount_paid) || 0), 0) || 0

    return NextResponse.json({
      total: total || 0,
      by_status: {
        enrolled: statusCounts[0].count || 0,
        reserved: statusCounts[1].count || 0,
        cart: statusCounts[2].count || 0,
        waitlisted: statusCounts[3].count || 0,
        cancelled: statusCounts[4].count || 0,
        expired: statusCounts[5].count || 0,
        completed: statusCounts[6].count || 0,
      },
      by_payment_status: {
        paid: paymentStatusCounts[0].count || 0,
        pending: paymentStatusCounts[1].count || 0,
        unpaid: paymentStatusCounts[2].count || 0,
        refunded: paymentStatusCounts[3].count || 0,
        failed: paymentStatusCounts[4].count || 0,
      },
      revenue: {
        total: totalRevenue,
        this_month: thisMonthRevenue,
      },
    })
  } catch (error: any) {
    console.error("Error fetching enrollment stats:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch enrollment stats" },
      { status: 500 }
    )
  }
}

