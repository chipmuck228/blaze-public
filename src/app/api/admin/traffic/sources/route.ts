import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from "@/lib/typed-error"
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { getDateRangeFromParams } from '@/lib/traffic-api-utils'

/**
 * GET /api/admin/traffic/sources
 * 获取访问来源统计
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

    // 获取访问来源数据
    const { data: visits } = await supabaseAdmin
      .from('traffic_visits')
      .select('source_type')
      .gte('created_at', dateRange.startStr)
      .lte('created_at', dateRange.endStr)

    // 统计各来源的访问量
    const sourceCounts: Record<string, number> = {}
    visits?.forEach((visit) => {
      const source = visit.source_type || 'other'
      sourceCounts[source] = (sourceCounts[source] || 0) + 1
    })

    const total = visits?.length || 0

    // 转换为数组并排序
    const sources = Object.entries(sourceCounts)
      .map(([name, visits]) => ({
        name: formatSourceName(name),
        visits,
        percentage: total > 0 ? Math.round((visits / total) * 100 * 10) / 10 : 0,
      }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, limit)

    return NextResponse.json(
      {
        sources,
        total,
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error('Error fetching traffic sources:', error)
    return NextResponse.json(
      { error: getErrorMessage(error) || 'Failed to fetch traffic sources' },
      { status: 500 }
    )
  }
}

function formatSourceName(source: string): string {
  const sourceMap: Record<string, string> = {
    direct: 'Direct',
    google: 'Google',
    bing: 'Bing',
    social: 'Social',
    other: 'Other',
  }
  return sourceMap[source] || source.charAt(0).toUpperCase() + source.slice(1)
}
