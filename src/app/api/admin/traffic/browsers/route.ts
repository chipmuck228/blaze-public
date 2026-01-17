import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { getDateRangeFromParams } from '@/lib/traffic-api-utils'

/**
 * GET /api/admin/traffic/browsers
 * 获取浏览器类型统计
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
    const limit = parseInt(searchParams.get('limit') || '10')

    // 计算日期范围
    const dateRange = getDateRangeFromParams(period, startDateParam, endDateParam)

    // 获取浏览器数据
    const { data: visits } = await supabaseAdmin
      .from('traffic_visits')
      .select('browser_name')
      .gte('created_at', dateRange.startStr)
      .lte('created_at', dateRange.endStr)

    // 统计各浏览器的访问量
    const browserCounts: Record<string, number> = {}
    visits?.forEach((visit) => {
      const browser = visit.browser_name || 'Others'
      browserCounts[browser] = (browserCounts[browser] || 0) + 1
    })

    const total = visits?.length || 0

    // 转换为数组并排序
    const browsers = Object.entries(browserCounts)
      .map(([name, visits]) => ({
        name,
        visits,
        percentage: total > 0 ? Math.round((visits / total) * 100 * 10) / 10 : 0,
      }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, limit)

    return NextResponse.json(
      {
        browsers,
        total,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error fetching traffic browsers:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch traffic browsers' },
      { status: 500 }
    )
  }
}
