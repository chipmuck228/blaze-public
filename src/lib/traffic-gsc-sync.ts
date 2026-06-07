import { supabaseAdmin } from '@/lib/supabase'
import {
  fetchGscQueryRows,
  getDefaultGscSyncDateRange,
  getGscConfig,
  type GscQueryRow,
} from '@/lib/gsc-client'

const UPSERT_BATCH = 500

export async function syncTrafficGscQueries(options?: {
  startDate?: string
  endDate?: string
}): Promise<{
  configured: boolean
  rowsFetched: number
  rowsUpserted: number
  startDate: string
  endDate: string
  siteUrl: string | null
}> {
  const { siteUrl, configured } = getGscConfig()
  if (!configured || !siteUrl) {
    return {
      configured: false,
      rowsFetched: 0,
      rowsUpserted: 0,
      startDate: options?.startDate ?? '',
      endDate: options?.endDate ?? '',
      siteUrl,
    }
  }

  const range = options?.startDate && options?.endDate
    ? { startDate: options.startDate, endDate: options.endDate }
    : getDefaultGscSyncDateRange()

  const fetched = await fetchGscQueryRows(range.startDate, range.endDate)
  const syncedAt = new Date().toISOString()
  let rowsUpserted = 0

  for (let i = 0; i < fetched.length; i += UPSERT_BATCH) {
    const chunk = fetched.slice(i, i + UPSERT_BATCH)
    const payload = chunk.map((row) => gscRowToRecord(row, syncedAt))
    const { error } = await supabaseAdmin
      .from('traffic_gsc_queries')
      .upsert(payload, { onConflict: 'site_url,date,query,page' })

    if (error) {
      throw error
    }
    rowsUpserted += chunk.length
  }

  return {
    configured: true,
    rowsFetched: fetched.length,
    rowsUpserted,
    startDate: range.startDate,
    endDate: range.endDate,
    siteUrl,
  }
}

function gscRowToRecord(row: GscQueryRow, syncedAt: string) {
  return {
    site_url: row.site_url,
    date: row.date,
    query: row.query,
    page: row.page,
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
    synced_at: syncedAt,
  }
}
