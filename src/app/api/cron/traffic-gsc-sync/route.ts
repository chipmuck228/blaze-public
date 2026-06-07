import { NextResponse } from 'next/server'
import { getErrorMessage } from '@/lib/typed-error'
import { syncTrafficGscQueries } from '@/lib/traffic-gsc-sync'

/**
 * Cron: sync Google Search Console query data into traffic_gsc_queries.
 * GET with Authorization: Bearer CRON_SECRET
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const startDate = url.searchParams.get('start_date') ?? undefined
    const endDate = url.searchParams.get('end_date') ?? undefined

    const result = await syncTrafficGscQueries(
      startDate && endDate ? { startDate, endDate } : undefined
    )

    if (!result.configured) {
      return NextResponse.json({
        success: false,
        message: 'GSC not configured (set GSC_SITE_URL and GSC_SERVICE_ACCOUNT_JSON)',
        ...result,
        timestamp: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    console.error('traffic-gsc-sync cron error:', error)
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error) || 'GSC sync failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
