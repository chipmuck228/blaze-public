import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { getDateRangeFromParams } from '@/lib/traffic-api-utils'

/**
 * GET /api/admin/traffic/summary
 * 获取流量摘要数据（KPI 卡片）
 */
export async function GET(request: NextRequest) {
  try {
    // 检查权限
    const session = await auth()
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period')
    const startDateParam = searchParams.get('start_date')
    const endDateParam = searchParams.get('end_date')

    // 计算日期范围
    const dateRange = getDateRangeFromParams(period, startDateParam, endDateParam)
    const startDateStr = dateRange.startStr
    const endDateStr = dateRange.endStr

    // 计算上一个月同期日期范围（用于 MoM 对比）
    const prevStartDate = new Date(dateRange.start)
    prevStartDate.setMonth(prevStartDate.getMonth() - 1)
    const prevEndDate = new Date(dateRange.end)
    prevEndDate.setMonth(prevEndDate.getMonth() - 1)

    const prevStartDateStr = prevStartDate.toISOString()
    const prevEndDateStr = prevEndDate.toISOString()

    // 1. 获取当前周期访问量
    const { count: currentVisits } = await supabaseAdmin
      .from('traffic_visits')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDateStr)
      .lte('created_at', endDateStr)

    // 2. 获取上一个月同期访问量
    const { count: previousVisits } = await supabaseAdmin
      .from('traffic_visits')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', prevStartDateStr)
      .lte('created_at', prevEndDateStr)

    // 3. 获取当前周期跳出访问量
    const { count: currentBounces } = await supabaseAdmin
      .from('traffic_visits')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDateStr)
      .lte('created_at', endDateStr)
      .eq('is_bounce', true)

    // 4. 获取上一个月同期跳出访问量
    const { count: previousBounces } = await supabaseAdmin
      .from('traffic_visits')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', prevStartDateStr)
      .lte('created_at', prevEndDateStr)
      .eq('is_bounce', true)

    // 5. 获取当前周期唯一访客数
    const { data: currentUniqueSessions } = await supabaseAdmin
      .from('traffic_sessions')
      .select('session_id')
      .gte('first_visit_at', startDateStr)
      .lte('first_visit_at', endDateStr)

    const currentUniqueVisitors = new Set(
      currentUniqueSessions?.map((s) => s.session_id) || []
    ).size

    // 6. 获取上一个月同期唯一访客数
    const { data: previousUniqueSessions } = await supabaseAdmin
      .from('traffic_sessions')
      .select('session_id')
      .gte('first_visit_at', prevStartDateStr)
      .lte('first_visit_at', prevEndDateStr)

    const previousUniqueVisitors = new Set(
      previousUniqueSessions?.map((s) => s.session_id) || []
    ).size

    // 7. 获取当前周期页面浏览量
    const { count: currentPageviews } = await supabaseAdmin
      .from('traffic_pageviews')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDateStr)
      .lte('created_at', endDateStr)

    // 8. 获取上一个月同期页面浏览量
    const { count: previousPageviews } = await supabaseAdmin
      .from('traffic_pageviews')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', prevStartDateStr)
      .lte('created_at', prevEndDateStr)

    // 计算 MoM 变化百分比
    const calculateMomChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0
      return Math.round(((current - previous) / previous) * 100)
    }

    const visitsMomChange = calculateMomChange(
      currentVisits || 0,
      previousVisits || 0
    )

    const bounceRateCurrent =
      (currentVisits || 0) > 0
        ? ((currentBounces || 0) / (currentVisits || 0)) * 100
        : 0
    const bounceRatePrevious =
      (previousVisits || 0) > 0
        ? ((previousBounces || 0) / (previousVisits || 0)) * 100
        : 0
    const bounceRateMomChange = Math.round(
      bounceRateCurrent - bounceRatePrevious
    )

    const uniqueVisitorsMomChange = calculateMomChange(
      currentUniqueVisitors,
      previousUniqueVisitors
    )

    const pageviewsMomChange = calculateMomChange(
      currentPageviews || 0,
      previousPageviews || 0
    )

    return NextResponse.json(
      {
        visits: {
          total: currentVisits || 0,
          mom_change: visitsMomChange,
          mom_change_type: visitsMomChange >= 0 ? 'increase' : 'decrease',
        },
        bounce_rate: {
          value: Math.round(bounceRateCurrent * 100) / 100,
          mom_change: bounceRateMomChange,
          mom_change_type: bounceRateMomChange >= 0 ? 'increase' : 'decrease',
        },
        unique_visitors: {
          total: currentUniqueVisitors,
          mom_change: uniqueVisitorsMomChange,
          mom_change_type:
            uniqueVisitorsMomChange >= 0 ? 'increase' : 'decrease',
        },
        pageviews: {
          total: currentPageviews || 0,
          mom_change: pageviewsMomChange,
          mom_change_type: pageviewsMomChange >= 0 ? 'increase' : 'decrease',
        },
        period: {
          start: startDateStr,
          end: endDateStr,
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error fetching traffic summary:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch traffic summary' },
      { status: 500 }
    )
  }
}
