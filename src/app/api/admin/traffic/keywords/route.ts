import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/lib/typed-error'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { getDateRangeFromParams } from '@/lib/traffic-api-utils'
import { getGscConfig } from '@/lib/gsc-client'

type GscDbRow = {
  query: string
  page: string
  clicks: number
  impressions: number
  ctr: number | null
  position: number | null
  synced_at: string
}

/**
 * GET /api/admin/traffic/keywords
 * Aggregated Search Console queries for the selected date range.
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
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const sort = searchParams.get('sort') === 'impressions' ? 'impressions' : 'clicks'

    const { siteUrl, configured } = getGscConfig()
    const dateRange = getDateRangeFromParams(period, startDateParam, endDateParam)
    const rangeStart = dateRange.start.toISOString().slice(0, 10)
    const rangeEnd = dateRange.end.toISOString().slice(0, 10)

    if (!configured || !siteUrl) {
      return NextResponse.json({
        configured: false,
        message:
          'Set GSC_SITE_URL and GSC_SERVICE_ACCOUNT_JSON, add the service account to Search Console, then run /api/cron/traffic-gsc-sync.',
        data_source: 'google_search_console',
        queries: [],
        top_pages: [],
        total_clicks: 0,
        total_impressions: 0,
        last_synced_at: null,
      })
    }

    const { data: rows, error } = await supabaseAdmin
      .from('traffic_gsc_queries')
      .select('query, page, clicks, impressions, ctr, position, synced_at')
      .eq('site_url', siteUrl)
      .gte('date', rangeStart)
      .lte('date', rangeEnd)

    if (error) {
      throw error
    }

    const list = (rows ?? []) as GscDbRow[]
    let lastSyncedAt: string | null = null

    const queryAgg: Record<
      string,
      { clicks: number; impressions: number; positionSum: number; weight: number }
    > = {}
    const pageAgg: Record<string, { clicks: number; impressions: number }> = {}

    list.forEach((row) => {
      if (row.synced_at && (!lastSyncedAt || row.synced_at > lastSyncedAt)) {
        lastSyncedAt = row.synced_at
      }

      const q = row.query || '(not provided)'
      if (!queryAgg[q]) {
        queryAgg[q] = { clicks: 0, impressions: 0, positionSum: 0, weight: 0 }
      }
      queryAgg[q].clicks += row.clicks
      queryAgg[q].impressions += row.impressions
      if (row.impressions > 0 && row.position != null) {
        queryAgg[q].positionSum += row.position * row.impressions
        queryAgg[q].weight += row.impressions
      }

      const page = row.page || '(unknown)'
      if (!pageAgg[page]) {
        pageAgg[page] = { clicks: 0, impressions: 0 }
      }
      pageAgg[page].clicks += row.clicks
      pageAgg[page].impressions += row.impressions
    })

    const total_clicks = list.reduce((s, r) => s + r.clicks, 0)
    const total_impressions = list.reduce((s, r) => s + r.impressions, 0)

    const queries = Object.entries(queryAgg)
      .map(([query, agg]) => ({
        query,
        clicks: agg.clicks,
        impressions: agg.impressions,
        ctr:
          agg.impressions > 0
            ? Math.round((agg.clicks / agg.impressions) * 10000) / 100
            : 0,
        position:
          agg.weight > 0
            ? Math.round((agg.positionSum / agg.weight) * 100) / 100
            : 0,
      }))
      .sort((a, b) =>
        sort === 'impressions'
          ? b.impressions - a.impressions
          : b.clicks - a.clicks
      )
      .slice(0, limit)

    const top_pages = Object.entries(pageAgg)
      .map(([page, agg]) => ({
        page,
        clicks: agg.clicks,
        impressions: agg.impressions,
        ctr:
          agg.impressions > 0
            ? Math.round((agg.clicks / agg.impressions) * 10000) / 100
            : 0,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, limit)

    return NextResponse.json({
      configured: true,
      data_source: 'google_search_console',
      site_url: siteUrl,
      message: list.length === 0 ? 'No GSC rows for this range. Run the GSC sync cron after connecting Search Console.' : null,
      queries,
      top_pages,
      total_clicks,
      total_impressions,
      last_synced_at: lastSyncedAt,
      period: { start: rangeStart, end: rangeEnd },
    })
  } catch (error: unknown) {
    console.error('Error fetching traffic keywords:', error)
    return NextResponse.json(
      { error: getErrorMessage(error) || 'Failed to fetch keywords' },
      { status: 500 }
    )
  }
}
