"use client"

import Link from "next/link"
import {
  Building2,
  Calendar,
  ChevronRight,
  Clock,
  DollarSign,
  ExternalLink,
  FolderTree,
  Layers,
  MapPin,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  AMILIA_ENROLL_URL,
  getOfferingDescription,
  getSessionPosterUrl,
  type SessionListItem,
} from "@/lib/programs-catalog-view"
import { normalizeRemoteImageUrl } from "@/lib/normalize-image-url"
import { CourseDaysOfWeekBadges } from "@/components/programs/CourseDaysOfWeekBadges"
import { LazySessionPoster } from "@/components/programs/LazySessionPoster"

const OFFERING_TYPE_BORDER: Record<string, string> = {
  camp: "border-orange-400 dark:border-orange-600",
  course: "border-indigo-400 dark:border-indigo-600",
  workshop: "border-rose-400 dark:border-rose-600",
  competition: "border-teal-400 dark:border-teal-600",
  default: "border-slate-200 dark:border-slate-700",
}

const OFFERING_TYPE_HOVER: Record<string, string> = {
  camp: "hover:border-orange-300 hover:shadow-orange-100/60",
  course: "hover:border-indigo-300 hover:shadow-indigo-100/60",
  workshop: "hover:border-rose-300 hover:shadow-rose-100/60",
  competition: "hover:border-teal-300 hover:shadow-teal-100/60",
  default: "hover:border-blue-300 hover:shadow-blue-100/60",
}

const HIERARCHY_BADGE_STYLES = {
  campus: "bg-sky-50 text-sky-800 border-sky-200",
  location: "bg-emerald-50 text-emerald-800 border-emerald-200",
  program: "bg-violet-50 text-violet-800 border-violet-200",
  activity: "bg-amber-50 text-amber-800 border-amber-200",
} as const

function formatDate(dateString?: string | null): string {
  if (!dateString) return "TBD"
  const d = new Date(dateString)
  if (Number.isNaN(d.getTime())) return dateString
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function formatTime(timeString?: string | null): string {
  if (!timeString) return ""
  const [hours, minutes] = timeString.split(":")
  const hour = parseInt(hours, 10)
  if (Number.isNaN(hour)) return timeString
  const ampm = hour >= 12 ? "PM" : "AM"
  const h = hour % 12 || 12
  return `${h}:${minutes || "00"} ${ampm}`
}

function getStatusColor(status: string): string {
  switch (status) {
    case "scheduled":
      return "bg-blue-100 text-blue-800"
    case "ongoing":
      return "bg-green-100 text-green-800"
    case "completed":
      return "bg-slate-100 text-slate-700"
    case "cancelled":
      return "bg-red-100 text-red-800"
    default:
      return "bg-slate-100 text-slate-700"
  }
}

function HierarchyBadge({
  icon: Icon,
  label,
  className,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  className: string
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] px-1.5 py-0 font-normal gap-1 max-w-[140px] truncate",
        className
      )}
    >
      <Icon className="h-3 w-3 shrink-0" strokeWidth={1.5} />
      <span className="truncate">{label}</span>
    </Badge>
  )
}

function SessionHierarchyBadges({ item }: { item: SessionListItem }) {
  const campusName = item.location.name || "N/A"
  const locationName = item.session.location?.name || "N/A"
  const programName = item.program.display_name || item.program.name || "N/A"
  const activityName = item.activity.display_name || item.activity.name || "N/A"

  const items = [
    { key: "campus", icon: Building2, label: campusName, style: HIERARCHY_BADGE_STYLES.campus },
    { key: "location", icon: MapPin, label: locationName, style: HIERARCHY_BADGE_STYLES.location },
    { key: "program", icon: FolderTree, label: programName, style: HIERARCHY_BADGE_STYLES.program },
    { key: "activity", icon: Layers, label: activityName, style: HIERARCHY_BADGE_STYLES.activity },
  ] as const

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1.5">
      {items.map((entry, index) => (
        <div key={entry.key} className="flex items-center gap-1 min-w-0">
          {index > 0 ? (
            <ChevronRight className="h-3 w-3 shrink-0 text-slate-400/80" strokeWidth={1.5} />
          ) : null}
          <HierarchyBadge icon={entry.icon} label={entry.label} className={entry.style} />
        </div>
      ))}
    </div>
  )
}

export function SessionListRow({
  item,
  detailHref,
}: {
  item: SessionListItem
  detailHref: string
}) {
  const { session } = item
  const offeringTypeCode = session.offering?.offering_type?.code?.toLowerCase() ?? ""
  const borderClass = OFFERING_TYPE_BORDER[offeringTypeCode] ?? OFFERING_TYPE_BORDER.default
  const hoverClass = OFFERING_TYPE_HOVER[offeringTypeCode] ?? OFFERING_TYPE_HOVER.default
  const price = session.price_override ?? session.course.base_price ?? 0
  const title = session.course.name || session.offering?.name || item.activity.display_name
  const description = getOfferingDescription(session)
  const posterUrl =
    normalizeRemoteImageUrl(getSessionPosterUrl(session)) ||
    `https://picsum.photos/200/150?random=${session.id}`

  return (
    <Card
      className={cn(
        "group border shadow-sm transition-all duration-300 ease-out",
        "hover:-translate-y-1 hover:shadow-lg hover:bg-gradient-to-br hover:from-white hover:to-slate-50/80",
        borderClass,
        hoverClass
      )}
    >
      <CardContent className="p-4">
        <div className="flex gap-4 items-start">
          <div className="relative w-24 h-20 sm:w-28 sm:h-24 shrink-0 overflow-hidden rounded-xl">
            <LazySessionPoster
              src={posterUrl}
              alt={title}
              sizes="112px"
              containerClassName="w-full h-full rounded-xl border border-slate-200 transition-colors duration-300 group-hover:border-blue-200"
              className="transition-transform duration-500 ease-out group-hover:scale-105"
            />
          </div>

          <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900 transition-colors duration-300 group-hover:text-[#2563eb]">
                  {title}
                </h3>
                <Badge className={cn("text-[10px] px-1.5 py-0 font-normal", getStatusColor(session.status))}>
                  {session.status}
                </Badge>
                {session.offering?.offering_type ? (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                    {session.offering.offering_type.name}
                  </Badge>
                ) : null}
                <CourseDaysOfWeekBadges session={session} />
              </div>

              <SessionHierarchyBadges item={item} />

              {description ? (
                <p className="text-slate-500 text-xs mt-2 line-clamp-2 leading-relaxed">{description}</p>
              ) : null}

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] leading-tight text-slate-500">
                <span className="inline-flex items-center gap-1 shrink-0">
                  <Calendar className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                  {formatDate(session.start_date)} – {formatDate(session.end_date)}
                </span>
                {session.start_time && session.end_time ? (
                  <span className="inline-flex items-center gap-1 shrink-0">
                    <Clock className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                    {formatTime(session.start_time)} – {formatTime(session.end_time)}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1 shrink-0">
                  <Users className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                  {session.current_students}/{session.max_students ?? "∞"}
                </span>
                <span className="inline-flex items-center gap-1 shrink-0">
                  <DollarSign className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                  USD {price.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={detailHref}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563eb] hover:text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-50 transition-all duration-300 group-hover:bg-blue-50/80"
              >
                Details
                <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={1.5} />
              </Link>
              <a
                href={AMILIA_ENROLL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-[#2563eb] hover:bg-blue-600 px-3 py-2 rounded-lg transition-all duration-300 group-hover:shadow-md group-hover:scale-[1.02]"
              >
                Enroll
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
              </a>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
