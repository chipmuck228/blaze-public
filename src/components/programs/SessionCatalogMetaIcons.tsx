"use client"

import { BookOpen, CalendarClock, CircleDashed, Tent } from "lucide-react"
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

export function OfferingTypeIcon({
  code,
  className,
}: {
  code: string | undefined | null
  className?: string
}) {
  const c = (code || "").toLowerCase()
  if (c === "camp") {
    return (
      <span className={cn("inline-flex items-center", className)} title="Camp" aria-label="Camp">
        <Tent className={cn(ICON_BASE, "text-slate-600")} strokeWidth={1.25} aria-hidden />
      </span>
    )
  }
  if (c === "course") {
    return (
      <span className={cn("inline-flex items-center", className)} title="Course" aria-label="Course">
        <BookOpen className={cn(ICON_BASE, "text-slate-600")} strokeWidth={1.25} aria-hidden />
      </span>
    )
  }
  return null
}
