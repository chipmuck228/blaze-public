import { google } from 'googleapis'

export interface GscQueryRow {
  site_url: string
  date: string
  query: string
  page: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export function getGscConfig(): {
  siteUrl: string | null
  configured: boolean
} {
  const siteUrl = process.env.GSC_SITE_URL?.trim() || null
  const configured = Boolean(siteUrl && parseServiceAccountJson())
  return { siteUrl, configured }
}

export function parseServiceAccountJson(): Record<string, unknown> | null {
  const raw = process.env.GSC_SERVICE_ACCOUNT_JSON?.trim()
  if (!raw) return null
  try {
    if (raw.startsWith('{')) {
      return JSON.parse(raw) as Record<string, unknown>
    }
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf8')) as Record<string, unknown>
  } catch {
    return null
  }
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Default sync window: yesterday back 2 days (3 days total). */
export function getDefaultGscSyncDateRange(): { startDate: string; endDate: string } {
  const end = new Date()
  end.setUTCDate(end.getUTCDate() - 1)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - 2)
  return { startDate: toIsoDate(start), endDate: toIsoDate(end) }
}

/**
 * Pull Search Console rows (date + query + page dimensions).
 */
export async function fetchGscQueryRows(
  startDate: string,
  endDate: string
): Promise<GscQueryRow[]> {
  const siteUrl = process.env.GSC_SITE_URL?.trim()
  const credentials = parseServiceAccountJson()
  if (!siteUrl || !credentials) {
    throw new Error('GSC_SITE_URL and GSC_SERVICE_ACCOUNT_JSON must be set')
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  })

  const searchconsole = google.searchconsole({ version: 'v1', auth })
  const rows: GscQueryRow[] = []
  let startRow = 0
  const rowLimit = 25000

  while (true) {
    const res = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['date', 'query', 'page'],
        rowLimit,
        startRow,
        dataState: 'final',
      },
    })

    const batch = res.data.rows ?? []
    for (const row of batch) {
      const keys = row.keys ?? []
      rows.push({
        site_url: siteUrl,
        date: keys[0] ?? '',
        query: keys[1] ?? '',
        page: keys[2] ?? '',
        clicks: Math.round(row.clicks ?? 0),
        impressions: Math.round(row.impressions ?? 0),
        ctr: row.ctr ?? 0,
        position: row.position ?? 0,
      })
    }

    if (batch.length < rowLimit) break
    startRow += batch.length
  }

  return rows
}
