import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { getFranchiseByCode } from "@/lib/db"

// GET: 获取注册统计数据
export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const franchiseCode = searchParams.get("franchise")

    // 如果指定了 franchise，则解析为 franchise_id
    let baseQuery = supabaseAdmin.from("course_enrollments")
    if (franchiseCode) {
      const franchise = await getFranchiseByCode(franchiseCode)
      if (!franchise) {
        return NextResponse.json(
          { error: "Invalid franchise code" },
          { status: 400 }
        )
      }
      baseQuery = baseQuery.eq("franchise_id", franchise.id)
    }

    // 获取总数
    const { count: total } = await baseQuery
      .select("id", { count: "exact", head: true })

    // 按状态统计
    const statusCounts = await Promise.all([
      baseQuery
        .clone()
        .select("id", { count: "exact", head: true })
        .eq("status", "enrolled"),
      baseQuery
        .clone()
        .select("id", { count: "exact", head: true })
        .eq("status", "reserved"),
      baseQuery
        .clone()
        .select("id", { count: "exact", head: true })
        .eq("status", "cart"),
      baseQuery
        .clone()
        .select("id", { count: "exact", head: true })
        .eq("status", "waitlisted"),
      baseQuery
        .clone()
        .select("id", { count: "exact", head: true })
        .eq("status", "cancelled"),
      baseQuery
        .clone()
        .select("id", { count: "exact", head: true })
        .eq("status", "expired"),
      baseQuery
        .clone()
        .select("id", { count: "exact", head: true })
        .eq("status", "completed"),
    ])

    // 按支付状态统计
    const paymentStatusCounts = await Promise.all([
      baseQuery
        .clone()
        .select("id", { count: "exact", head: true })
        .eq("payment_status", "paid"),
      baseQuery
        .clone()
        .select("id", { count: "exact", head: true })
        .eq("payment_status", "pending"),
      baseQuery
        .clone()
        .select("id", { count: "exact", head: true })
        .eq("payment_status", "unpaid"),
      baseQuery
        .clone()
        .select("id", { count: "exact", head: true })
        .eq("payment_status", "refunded"),
      baseQuery
        .clone()
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

