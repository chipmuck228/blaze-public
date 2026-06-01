import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from "@/lib/typed-error"
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { getDateRangeFromParams } from '@/lib/traffic-api-utils'

/**
 * GET /api/admin/traffic/visits-chart
 * 获取访问量趋势图表数据
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
    const granularity = searchParams.get('granularity') || 'day'

    // 计算日期范围
    const dateRange = getDateRangeFromParams(period, startDateParam, endDateParam)
    const startDateStr = dateRange.startStr
    const endDateStr = dateRange.endStr

    // 获取访问数据
    const { data: visits } = await supabaseAdmin
      .from('traffic_visits')
      .select('created_at')
      .gte('created_at', startDateStr)
      .lte('created_at', endDateStr)
      .order('created_at', { ascending: true })

    // 获取页面浏览数据
    const { data: pageviews } = await supabaseAdmin
      .from('traffic_pageviews')
      .select('created_at')
      .gte('created_at', startDateStr)
      .lte('created_at', endDateStr)
      .order('created_at', { ascending: true })

    // 获取唯一访客数据
    const { data: sessions } = await supabaseAdmin
      .from('traffic_sessions')
      .select('first_visit_at')
      .gte('first_visit_at', startDateStr)
      .lte('first_visit_at', endDateStr)
      .order('first_visit_at', { ascending: true })

    // 按日期分组统计
    const visitsByDate: Record<string, { visits: number; unique: Set<string>; pageviews: number }> = {}

    visits?.forEach((visit) => {
      const date = new Date(visit.created_at).toISOString().split('T')[0]
      if (!visitsByDate[date]) {
        visitsByDate[date] = { visits: 0, unique: new Set(), pageviews: 0 }
      }
      visitsByDate[date].visits++
    })

    pageviews?.forEach((pv) => {
      const date = new Date(pv.created_at).toISOString().split('T')[0]
      if (!visitsByDate[date]) {
        visitsByDate[date] = { visits: 0, unique: new Set(), pageviews: 0 }
      }
      visitsByDate[date].pageviews++
    })

    sessions?.forEach((session) => {
      const date = new Date(session.first_visit_at).toISOString().split('T')[0]
      if (!visitsByDate[date]) {
        visitsByDate[date] = { visits: 0, unique: new Set(), pageviews: 0 }
      }
      visitsByDate[date].unique.add(session.first_visit_at)
    })

    // 转换为数组格式
    const chartData = Object.entries(visitsByDate)
      .map(([date, stats]) => ({
        date,
        visits: stats.visits,
        unique_visitors: stats.unique.size,
        pageviews: stats.pageviews,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // 计算总数和 MoM 变化
    const totalVisits = visits?.length || 0
    const totalUniqueVisitors = new Set(sessions?.map((s) => s.first_visit_at) || []).size
    const totalPageviews = pageviews?.length || 0

    // 计算上一个月同期数据（用于 MoM）
    const prevStartDate = new Date(dateRange.start)
    prevStartDate.setMonth(prevStartDate.getMonth() - 1)
    const prevEndDate = new Date(dateRange.end)
    prevEndDate.setMonth(prevEndDate.getMonth() - 1)

    const { count: previousVisits } = await supabaseAdmin
      .from('traffic_visits')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', prevStartDate.toISOString())
      .lte('created_at', prevEndDate.toISOString())

    const momChange =
      (previousVisits || 0) > 0
        ? Math.round(((totalVisits - (previousVisits || 0)) / (previousVisits || 0)) * 100)
        : totalVisits > 0 ? 100 : 0

    return NextResponse.json(
      {
        data: chartData,
        total: {
          visits: totalVisits,
          unique_visitors: totalUniqueVisitors,
          pageviews: totalPageviews,
          mom_change: momChange,
        },
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error('Error fetching visits chart:', error)
    return NextResponse.json(
      { error: getErrorMessage(error) || 'Failed to fetch visits chart' },
      { status: 500 }
    )
  }
}
