/**
 * Display v2_instance date columns (DATE / YYYY-MM-DD) exactly as stored — no viewer timezone.
 * Do not use `new Date("YYYY-MM-DD")` for labels (UTC midnight shifts the day in US timezones).
 */

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

const MONTH_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const

/** Extract YYYY-MM-DD from a DB date or ISO datetime string. */
export function extractIsoDatePart(value: string | null | undefined): string | null {
  if (!value?.trim()) return null
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : null
}

export function parseIsoDateParts(
  value: string | null | undefined
): { y: number; m: number; d: number } | null {
  const iso = extractIsoDatePart(value)
  if (!iso) return null
  const [y, m, d] = iso.split("-").map(Number)
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return null
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  return { y, m, d }
}

/**
 * Format a stored instance date for C-end UI (en-US labels, calendar components from DB values).
 */
export function formatCalendarDate(
  dateStr: string | null | undefined,
  options?: { emptyLabel?: string }
): string {
  const empty = options?.emptyLabel ?? "TBD"
  const parts = parseIsoDateParts(dateStr)
  if (!parts) return dateStr?.trim() ? String(dateStr).trim() : empty
  return `${MONTH_SHORT[parts.m - 1]} ${parts.d}, ${parts.y}`
}

export function formatCalendarMonthYear(
  year: number,
  monthIndex0: number
): string {
  if (monthIndex0 < 0 || monthIndex0 > 11) return ""
  return `${MONTH_LONG[monthIndex0]} ${year}`
}

/** For calendar grids: compare/generate YYYY-MM-DD without timezone-dependent parsing. */
export function parseLocalDateOnly(dateStr: string): Date {
  const parts = parseIsoDateParts(dateStr)
  if (!parts) return new Date(NaN)
  return new Date(parts.y, parts.m - 1, parts.d)
}

export function formatCalendarDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
  options?: { emptyLabel?: string }
): string {
  const empty = options?.emptyLabel ?? "TBD"
  const startLabel = formatCalendarDate(start, { emptyLabel: empty })
  if (startLabel === empty) return empty
  const endIso = extractIsoDatePart(end)
  const startIso = extractIsoDatePart(start)
  if (!endIso || endIso === startIso) return startLabel
  return `${startLabel} – ${formatCalendarDate(end)}`
}
