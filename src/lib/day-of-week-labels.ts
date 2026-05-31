/** US convention: 0 = Sunday … 6 = Saturday (matches admin / instance days_of_week). */
const DAY_ABBREV = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

export function formatDayOfWeekAbbrev(day: number): string {
  if (day >= 0 && day <= 6) return DAY_ABBREV[day]
  return String(day)
}

export function formatDaysOfWeekAbbrev(days: number[]): string {
  return days.map(formatDayOfWeekAbbrev).join(", ")
}
