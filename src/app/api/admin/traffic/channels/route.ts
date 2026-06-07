import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/lib/typed-error'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { getDateRangeFromParams } from '@/lib/traffic-api-utils'
import {
  buildVisitBreakdown,
  channelFromSourceType,
  formatChannelLabel,
  formatSourceTypeLabel,
  platformLabelFromVisit,
  type TrafficChannel,
} from '@/lib/traffic-utils'

/**
 * GET /api/admin/traffic/channels
 * Channel rollup plus search-engine and social-platform breakdowns.
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
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    const dateRange = getDateRangeFromParams(period, startDateParam, endDateParam)

    const { data: visits } = await supabaseAdmin
      .from('traffic_visits')
      .select('source_type, referrer_domain')
      .gte('created_at', dateRange.startStr)
      .lte('created_at', dateRange.endStr)

    const total = visits?.length || 0
    const channelCounts: Record<string, number> = {}
    const searchCounts: Record<string, number> = {}
    const socialCounts: Record<string, number> = {}

    visits?.forEach((visit) => {
      const sourceType = visit.source_type || 'other'
      const channel = channelFromSourceType(sourceType)
      channelCounts[channel] = (channelCounts[channel] || 0) + 1

      const platform = platformLabelFromVisit(sourceType, visit.referrer_domain)
      if (channel === 'organic_search' && platform) {
        searchCounts[platform] = (searchCounts[platform] || 0) + 1
      }
      if (channel === 'social' && platform) {
        socialCounts[platform] = (socialCounts[platform] || 0) + 1
      }
    })

    const channels = buildVisitBreakdown(
      channelCounts,
      total,
      (key) => formatChannelLabel(key as TrafficChannel),
      limit
    )

    const search_engines = buildVisitBreakdown(searchCounts, total, (k) => k, limit)

    const social_platforms = buildVisitBreakdown(socialCounts, total, (k) => k, limit)

    const source_type_breakdown = buildVisitBreakdown(
      visits?.reduce<Record<string, number>>((acc, v) => {
        const st = v.source_type || 'other'
        acc[st] = (acc[st] || 0) + 1
        return acc
      }, {}) ?? {},
      total,
      formatSourceTypeLabel,
      limit
    )

    return NextResponse.json(
      {
        channels,
        search_engines,
        social_platforms,
        source_type_breakdown,
        total,
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error('Error fetching traffic channels:', error)
    return NextResponse.json(
      { error: getErrorMessage(error) || 'Failed to fetch traffic channels' },
      { status: 500 }
    )
  }
}
