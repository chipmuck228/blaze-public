import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from "@/lib/typed-error"
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { getDateRangeFromParams } from '@/lib/traffic-api-utils'

/**
 * GET /api/admin/traffic/devices
 * 获取设备类型统计
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

    // 获取设备类型数据
    const { data: visits } = await supabaseAdmin
      .from('traffic_visits')
      .select('device_type')
      .gte('created_at', dateRange.startStr)
      .lte('created_at', dateRange.endStr)

    // 统计各设备类型的访问量
    const deviceCounts: Record<string, number> = {}
    visits?.forEach((visit) => {
      const device = visit.device_type || 'desktop'
      deviceCounts[device] = (deviceCounts[device] || 0) + 1
    })

    const total = visits?.length || 0

    // 转换为数组并格式化
    const devices = ['mobile', 'desktop', 'tablet']
      .map((device) => ({
        name: formatDeviceName(device),
        visits: deviceCounts[device] || 0,
        percentage:
          total > 0 ? Math.round(((deviceCounts[device] || 0) / total) * 100 * 10) / 10 : 0,
      }))
      .filter((d) => d.visits > 0)
      .sort((a, b) => b.visits - a.visits)

    return NextResponse.json(
      {
        devices,
        total,
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error('Error fetching traffic devices:', error)
    return NextResponse.json(
      { error: getErrorMessage(error) || 'Failed to fetch traffic devices' },
      { status: 500 }
    )
  }
}

function formatDeviceName(device: string): string {
  const deviceMap: Record<string, string> = {
    mobile: 'Mobile',
    desktop: 'Desktop',
    tablet: 'Tablet',
  }
  return deviceMap[device] || device.charAt(0).toUpperCase() + device.slice(1)
}
