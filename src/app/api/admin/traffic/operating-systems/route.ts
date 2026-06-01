import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from "@/lib/typed-error"
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { getDateRangeFromParams } from '@/lib/traffic-api-utils'

/**
 * GET /api/admin/traffic/operating-systems
 * 获取操作系统统计
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

    // 获取操作系统数据
    const { data: visits } = await supabaseAdmin
      .from('traffic_visits')
      .select('os_name')
      .gte('created_at', dateRange.startStr)
      .lte('created_at', dateRange.endStr)

    // 统计各操作系统的访问量
    const osCounts: Record<string, number> = {}
    visits?.forEach((visit) => {
      const os = visit.os_name || 'Other'
      osCounts[os] = (osCounts[os] || 0) + 1
    })

    const total = visits?.length || 0

    // 转换为数组并排序
    const operatingSystems = Object.entries(osCounts)
      .map(([name, visits]) => ({
        name: formatOSName(name),
        visits,
        percentage: total > 0 ? Math.round((visits / total) * 100 * 10) / 10 : 0,
      }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, limit)

    return NextResponse.json(
      {
        operating_systems: operatingSystems,
        total,
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error('Error fetching traffic operating systems:', error)
    return NextResponse.json(
      { error: getErrorMessage(error) || 'Failed to fetch traffic operating systems' },
      { status: 500 }
    )
  }
}

function formatOSName(os: string): string {
  const osMap: Record<string, string> = {
    iOS: 'iOS',
    Windows: 'Windows',
    macOS: 'macOS',
    Android: 'Android',
    Linux: 'Linux',
    Other: 'Other',
  }
  return osMap[os] || os
}
