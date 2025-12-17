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
    let franchiseId: string | null = null
    if (franchiseCode) {
      const franchise = await getFranchiseByCode(franchiseCode)
      if (!franchise) {
        return NextResponse.json(
          { error: "Invalid franchise code" },
          { status: 400 }
        )
      }
      franchiseId = franchise.id
    }

    // 构建基础查询
    const buildBaseQuery = () => {
      let query = supabaseAdmin
        .from("course_enrollments")
        .select("id", { count: "exact", head: true })
      
      if (franchiseId) {
        query = query.eq("franchise_id", franchiseId)
      }
      
      return query
    }

    // 获取总数
    const { count: total } = await buildBaseQuery()

    // 按状态统计
    const statusCounts = await Promise.all([
      buildBaseQuery().eq("status", "enrolled"),
      buildBaseQuery().eq("status", "reserved"),
      buildBaseQuery().eq("status", "cart"),
      buildBaseQuery().eq("status", "waitlisted"),
      buildBaseQuery().eq("status", "cancelled"),
      buildBaseQuery().eq("status", "expired"),
      buildBaseQuery().eq("status", "completed"),
    ])

    // 按支付状态统计
    const paymentStatusCounts = await Promise.all([
      buildBaseQuery().eq("payment_status", "paid"),
      buildBaseQuery().eq("payment_status", "pending"),
      buildBaseQuery().eq("payment_status", "unpaid"),
      buildBaseQuery().eq("payment_status", "refunded"),
      buildBaseQuery().eq("payment_status", "failed"),
    ])

    // 计算总收入（已支付的注册）
    let revenueQuery = supabaseAdmin
      .from("course_enrollments")
      .select("amount_paid")
      .eq("payment_status", "paid")
      .not("amount_paid", "is", null)
    
    if (franchiseId) {
      revenueQuery = revenueQuery.eq("franchise_id", franchiseId)
    }
    
    const { data: paidEnrollments } = await revenueQuery

    const totalRevenue = paidEnrollments?.reduce((sum, e) => sum + (parseFloat(e.amount_paid) || 0), 0) || 0

    // 计算本月收入
    const thisMonth = new Date()
    thisMonth.setDate(1)
    thisMonth.setHours(0, 0, 0, 0)

    let thisMonthQuery = supabaseAdmin
      .from("course_enrollments")
      .select("amount_paid")
      .eq("payment_status", "paid")
      .not("amount_paid", "is", null)
      .gte("enrolled_at", thisMonth.toISOString())
    
    if (franchiseId) {
      thisMonthQuery = thisMonthQuery.eq("franchise_id", franchiseId)
    }
    
    const { data: thisMonthEnrollments } = await thisMonthQuery

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

