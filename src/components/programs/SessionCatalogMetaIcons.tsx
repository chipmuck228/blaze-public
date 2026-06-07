"use client"

import {
  BookOpen,
  CalendarClock,
  CircleDashed,
  Gift,
  HeartHandshake,
  Sparkles,
  Tag,
  Tent,
  Trophy,
  Wrench,
} from "lucide-react"
import { cn } from "@/lib/utils"

const ICON_BASE = "h-[1.125rem] w-[1.125rem] shrink-0"

type MetaIconProps = {
  className?: string
  title?: string
}

/** Scheduled session — green, no filled badge background. */
export function SessionScheduledIcon({ className, title = "Scheduled" }: MetaIconProps) {
  return (
    <span className={cn("inline-flex items-center", className)} title={title} aria-label={title}>
      <CalendarClock className={cn(ICON_BASE, "text-emerald-600")} strokeWidth={1.25} aria-hidden />
    </span>
  )
}

/** Draft session — gray, thin-line icon. */
export function SessionDraftIcon({ className, title = "Draft" }: MetaIconProps) {
  return (
    <span className={cn("inline-flex items-center", className)} title={title} aria-label={title}>
      <CircleDashed className={cn(ICON_BASE, "text-slate-400")} strokeWidth={1.25} aria-hidden />
    </span>
  )
}

export function SessionStatusIcon({
  status,
  className,
}: {
  status: string
  className?: string
}) {
  const normalized = status.toLowerCase()
  if (normalized === "scheduled") {
    return <SessionScheduledIcon className={className} />
  }
  if (normalized === "draft") {
    return <SessionDraftIcon className={className} />
  }
  return null
}

export function offeringTypeLabel(code: string | undefined | null): string {
  const c = (code || "").toLowerCase()
  const labels: Record<string, string> = {
    camp: "Camp",
    course: "Course",
    workshop: "Workshop",
    competition: "Competition",
    freetrial: "Free Trial",
    giftcard: "Gift Card",
    careservice: "Care Service",
  }
  if (labels[c]) return labels[c]
  if (!c) return "Program"
  return c.charAt(0).toUpperCase() + c.slice(1)
}

export function OfferingTypeIcon({
  code,
  className,
}: {
  code: string | undefined | null
  className?: string
}) {
  const c = (code || "").toLowerCase()
  const label = offeringTypeLabel(c)
  const iconClass = cn(ICON_BASE, "text-slate-600")

  if (c === "camp") {
    return (
      <span className={cn("inline-flex items-center", className)} title={label} aria-label={label}>
        <Tent className={iconClass} strokeWidth={1.25} aria-hidden />
      </span>
    )
  }
  if (c === "course") {
    return (
      <span className={cn("inline-flex items-center", className)} title={label} aria-label={label}>
        <BookOpen className={iconClass} strokeWidth={1.25} aria-hidden />
      </span>
    )
  }
  if (c === "workshop") {
    return (
      <span className={cn("inline-flex items-center", className)} title={label} aria-label={label}>
        <Wrench className={iconClass} strokeWidth={1.25} aria-hidden />
      </span>
    )
  }
  if (c === "competition") {
    return (
      <span className={cn("inline-flex items-center", className)} title={label} aria-label={label}>
        <Trophy className={iconClass} strokeWidth={1.25} aria-hidden />
      </span>
    )
  }
  if (c === "freetrial") {
    return (
      <span className={cn("inline-flex items-center", className)} title={label} aria-label={label}>
        <Sparkles className={iconClass} strokeWidth={1.25} aria-hidden />
      </span>
    )
  }
  if (c === "giftcard") {
    return (
      <span className={cn("inline-flex items-center", className)} title={label} aria-label={label}>
        <Gift className={iconClass} strokeWidth={1.25} aria-hidden />
      </span>
    )
  }
  if (c === "careservice") {
    return (
      <span className={cn("inline-flex items-center", className)} title={label} aria-label={label}>
        <HeartHandshake className={iconClass} strokeWidth={1.25} aria-hidden />
      </span>
    )
  }
  if (!c) return null
  return (
    <span className={cn("inline-flex items-center", className)} title={label} aria-label={label}>
      <Tag className={iconClass} strokeWidth={1.25} aria-hidden />
    </span>
  )
}

export function OfferingTypeIconGroup({
  codes,
  className,
}: {
  codes: string[]
  className?: string
}) {
  const unique = [...new Set(codes.map((c) => c.toLowerCase()).filter(Boolean))]
  if (unique.length === 0) return null
  return (
    <span className={cn("inline-flex items-center gap-1", className)} aria-hidden>
      {unique.map((code) => (
        <OfferingTypeIcon key={code} code={code} />
      ))}
    </span>
  )
}
