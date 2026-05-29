"use client"

import { Badge } from "@/components/ui/badge"
import { getSessionDaysOfWeek, isCourseOfferingSession } from "@/lib/programs-catalog-view"
import type { CatalogSession } from "@/lib/programs-catalog-view"

export function CourseDaysOfWeekBadges({ session }: { session: CatalogSession }) {
  if (!isCourseOfferingSession(session)) return null

  const days = getSessionDaysOfWeek(session)
  if (days.length === 0) return null

  return (
    <span
      className="inline-flex items-center gap-0.5 shrink-0"
      title="Class days (0=Sun, 1=Mon, 2=Tue, …)"
    >
      {days.map((day) => (
        <Badge
          key={day}
          variant="outline"
          className="h-5 min-w-[1.25rem] px-1 py-0 text-[10px] font-semibold tabular-nums justify-center rounded-sm border-indigo-300/80 text-indigo-800 bg-indigo-50/80"
        >
          {day}
        </Badge>
      ))}
    </span>
  )
}
