import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/lib/typed-error'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { getDateRangeFromParams } from '@/lib/traffic-api-utils'
import { formatGeoLabel } from '@/lib/traffic-geo'

/**
 * GET /api/admin/traffic/geography
 * Visitor geography from traffic_visits.country_code (and optional region).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period')
    const startDateParam = searchParams.get('start_date')
    const endDateParam = searchParams.get('end_date')
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const groupBy = searchParams.get('groupBy') === 'region' ? 'region' : 'country'

    const dateRange = getDateRangeFromParams(period, startDateParam, endDateParam)

    const { data: visits, error } = await supabaseAdmin
      .from('traffic_visits')
      .select('country_code, region')
      .gte('created_at', dateRange.startStr)
      .lte('created_at', dateRange.endStr)
      .not('country_code', 'is', null)

    if (error) {
      throw error
    }

    const withGeo = visits ?? []
    const totalVisits = withGeo.length

    const { count: allVisits } = await supabaseAdmin
      .from('traffic_visits')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', dateRange.startStr)
      .lte('created_at', dateRange.endStr)

    const counts: Record<string, number> = {}
    const codeByKey: Record<string, string> = {}

    withGeo.forEach((row) => {
      const code = (row.country_code as string)?.toUpperCase()
      if (!code) return
      const key =
        groupBy === 'region' && row.region
          ? `${code}|${row.region}`
          : code
      counts[key] = (counts[key] || 0) + 1
      codeByKey[key] = code
    })

    const denom = totalVisits || 1
    const countries = Object.entries(counts)
      .map(([key, visitCount]) => {
        const code = codeByKey[key] ?? key.split('|')[0]
        const region = key.includes('|') ? key.split('|').slice(1).join('|') : null
        return {
          code,
          name: formatGeoLabel(code, region, groupBy),
          visits: visitCount,
          percentage: Math.round((visitCount / denom) * 1000) / 10,
        }
      })
      .sort((a, b) => b.visits - a.visits)
      .slice(0, limit)

    return NextResponse.json(
      {
        countries,
        total: totalVisits,
        total_visits_in_range: allVisits ?? 0,
        geo_coverage_percent:
          (allVisits ?? 0) > 0
            ? Math.round((totalVisits / (allVisits ?? 1)) * 1000) / 10
            : 0,
        group_by: groupBy,
        has_geo_data: totalVisits > 0,
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error('Error fetching traffic geography:', error)
    return NextResponse.json(
      { error: getErrorMessage(error) || 'Failed to fetch geography' },
      { status: 500 }
    )
  }
}
