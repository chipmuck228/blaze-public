import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/lib/typed-error'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { getDateRangeFromParams } from '@/lib/traffic-api-utils'
import { buildVisitBreakdown } from '@/lib/traffic-utils'

/**
 * GET /api/admin/traffic/referrer-domains
 * Top external referrer hostnames (excludes null/empty).
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

    const dateRange = getDateRangeFromParams(period, startDateParam, endDateParam)

    const { data: visits } = await supabaseAdmin
      .from('traffic_visits')
      .select('referrer_domain, source_type')
      .gte('created_at', dateRange.startStr)
      .lte('created_at', dateRange.endStr)
      .not('referrer_domain', 'is', null)

    const withReferrer =
      visits?.filter(
        (v) =>
          v.referrer_domain &&
          v.source_type !== 'direct'
      ) ?? []

    const total = withReferrer.length
    const domainCounts: Record<string, number> = {}

    withReferrer.forEach((visit) => {
      const domain = visit.referrer_domain as string
      domainCounts[domain] = (domainCounts[domain] || 0) + 1
    })

    const domains = buildVisitBreakdown(domainCounts, total, (d) => d, limit).map(
      (row) => ({
        domain: row.name,
        visits: row.visits,
        percentage: row.percentage,
      })
    )

    return NextResponse.json(
      {
        domains,
        total,
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error('Error fetching referrer domains:', error)
    return NextResponse.json(
      { error: getErrorMessage(error) || 'Failed to fetch referrer domains' },
      { status: 500 }
    )
  }
}
