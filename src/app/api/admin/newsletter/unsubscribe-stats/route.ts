import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * GET /api/admin/newsletter/unsubscribe-stats
 * 获取退订统计信息
 */
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")

    // 1. 获取总体订阅统计
    const { count: totalSubscribers, error: totalError } = await supabaseAdmin
      .from("newsletter_subscribers")
      .select("*", { count: "exact", head: true })

    if (totalError) {
      throw totalError
    }

    const { count: activeSubscribers, error: activeError } = await supabaseAdmin
      .from("newsletter_subscribers")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)

    if (activeError) {
      throw activeError
    }

    const { count: unsubscribedCount, error: unsubscribedError } = await supabaseAdmin
      .from("newsletter_subscribers")
      .select("*", { count: "exact", head: true })
      .eq("is_active", false)

    if (unsubscribedError) {
      throw unsubscribedError
    }

    const unsubscribeRate = totalSubscribers && totalSubscribers > 0
      ? (unsubscribedCount || 0) / totalSubscribers * 100
      : 0

    // 2. 获取退订趋势（按日期）
    let unsubscribeQuery = supabaseAdmin
      .from("newsletter_subscribers")
      .select("unsubscribed_at, subscribed_at")
      .eq("is_active", false)
      .not("unsubscribed_at", "is", null)

    if (startDate) {
      unsubscribeQuery = unsubscribeQuery.gte("unsubscribed_at", startDate)
    }
    if (endDate) {
      unsubscribeQuery = unsubscribeQuery.lte("unsubscribed_at", endDate)
    }

    const { data: unsubscribedUsers, error: unsubscribedUsersError } = await unsubscribeQuery

    if (unsubscribedUsersError) {
      throw unsubscribedUsersError
    }

    // 按日期统计退订
    const dailyUnsubscribeStats: Record<string, {
      date: string
      unsubscribed: number
      subscribed: number
    }> = {}

    unsubscribedUsers?.forEach((user) => {
      if (user.unsubscribed_at) {
        const date = new Date(user.unsubscribed_at).toISOString().split("T")[0]
        if (!dailyUnsubscribeStats[date]) {
          dailyUnsubscribeStats[date] = {
            date,
            unsubscribed: 0,
            subscribed: 0,
          }
        }
        dailyUnsubscribeStats[date].unsubscribed++
      }
      if (user.subscribed_at) {
        const date = new Date(user.subscribed_at).toISOString().split("T")[0]
        if (!dailyUnsubscribeStats[date]) {
          dailyUnsubscribeStats[date] = {
            date,
            unsubscribed: 0,
            subscribed: 0,
          }
        }
        dailyUnsubscribeStats[date].subscribed++
      }
    })

    const dailyUnsubscribeStatsArray = Object.values(dailyUnsubscribeStats).sort((a, b) =>
      a.date.localeCompare(b.date)
    )

    // 3. 获取订阅趋势（按日期）
    let subscribeQuery = supabaseAdmin
      .from("newsletter_subscribers")
      .select("subscribed_at")

    if (startDate) {
      subscribeQuery = subscribeQuery.gte("subscribed_at", startDate)
    }
    if (endDate) {
      subscribeQuery = subscribeQuery.lte("subscribed_at", endDate)
    }

    const { data: subscribedUsers, error: subscribedUsersError } = await subscribeQuery

    if (subscribedUsersError) {
      console.error("Error fetching subscribed users:", subscribedUsersError)
    }

    const dailySubscribeStats: Record<string, number> = {}
    subscribedUsers?.forEach((user) => {
      if (user.subscribed_at) {
        const date = new Date(user.subscribed_at).toISOString().split("T")[0]
        dailySubscribeStats[date] = (dailySubscribeStats[date] || 0) + 1
      }
    })

    // 合并订阅和退订数据
    const combinedDailyStats = Object.keys({ ...dailySubscribeStats, ...dailyUnsubscribeStats })
      .map((date) => ({
        date,
        subscribed: dailySubscribeStats[date] || 0,
        unsubscribed: dailyUnsubscribeStats[date]?.unsubscribed || 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // 4. 计算净增长（订阅数 - 退订数）
    const netGrowth = combinedDailyStats.map((stat) => ({
      ...stat,
      net_growth: stat.subscribed - stat.unsubscribed,
    }))

    // 5. 按时间段统计（最近7天、30天、90天）
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()

    const { count: unsubscribedLast7Days } = await supabaseAdmin
      .from("newsletter_subscribers")
      .select("*", { count: "exact", head: true })
      .eq("is_active", false)
      .gte("unsubscribed_at", sevenDaysAgo)

    const { count: unsubscribedLast30Days } = await supabaseAdmin
      .from("newsletter_subscribers")
      .select("*", { count: "exact", head: true })
      .eq("is_active", false)
      .gte("unsubscribed_at", thirtyDaysAgo)

    const { count: unsubscribedLast90Days } = await supabaseAdmin
      .from("newsletter_subscribers")
      .select("*", { count: "exact", head: true })
      .eq("is_active", false)
      .gte("unsubscribed_at", ninetyDaysAgo)

    return NextResponse.json({
      overview: {
        total_subscribers: totalSubscribers || 0,
        active_subscribers: activeSubscribers || 0,
        unsubscribed_count: unsubscribedCount || 0,
        unsubscribe_rate: Math.round(unsubscribeRate * 100) / 100,
      },
      daily_stats: netGrowth,
      period_stats: {
        last_7_days: unsubscribedLast7Days || 0,
        last_30_days: unsubscribedLast30Days || 0,
        last_90_days: unsubscribedLast90Days || 0,
      },
    })
  } catch (error: unknown) {
    console.error("Error fetching unsubscribe statistics:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch unsubscribe statistics" },
      { status: 500 }
    )
  }
}
