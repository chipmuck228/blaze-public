"use client"

import Link from "next/link"
import {
  ArrowRight,
  Calendar,
  ChevronRight,
  Clock,
  DollarSign,
  ExternalLink,
  MapPin,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  AMILIA_ENROLL_URL,
  type OfferingNameGroup,
  type SessionListItem,
} from "@/lib/programs-catalog-view"
import { normalizeRemoteImageUrl } from "@/lib/normalize-image-url"
import { formatCalendarDate } from "@/lib/format-calendar-date"
import { CourseDaysOfWeekBadges } from "@/components/programs/CourseDaysOfWeekBadges"
import {
  OfferingTypeIcon,
  SessionStatusIcon,
} from "@/components/programs/SessionCatalogMetaIcons"
import { LazySessionPoster } from "@/components/programs/LazySessionPoster"

const OFFERING_TYPE_BORDER: Record<string, string> = {
  camp: "border-orange-400 dark:border-orange-600",
  course: "border-indigo-400 dark:border-indigo-600",
  workshop: "border-rose-400 dark:border-rose-600",
  competition: "border-teal-400 dark:border-teal-600",
  default: "border-slate-200 dark:border-slate-700",
}

const OFFERING_TYPE_HOVER: Record<string, string> = {
  camp: "hover:border-orange-300 hover:shadow-orange-100/60 hover:ring-orange-100",
  course: "hover:border-indigo-300 hover:shadow-indigo-100/60 hover:ring-indigo-100",
  workshop: "hover:border-rose-300 hover:shadow-rose-100/60 hover:ring-rose-100",
  competition: "hover:border-teal-300 hover:shadow-teal-100/60 hover:ring-teal-100",
  default: "hover:border-blue-300 hover:shadow-blue-100/60 hover:ring-blue-100",
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

function sessionDetailHref(
  item: SessionListItem,
  locationCode: string | null,
  getCategorySlug: (name: string) => string
): string {
  const slug = getCategorySlug(item.activity.category?.name || "")
  const base = slug
    ? `/category/${slug}/instance/${item.session.id}`
    : `/category/explore/instance/${item.session.id}`
  if (!locationCode) return base
  return `${base}?location=${encodeURIComponent(locationCode)}`
}

function NestedSessionRow({
  item,
  detailHref,
  compact,
}: {
  item: SessionListItem
  detailHref: string
  compact?: boolean
}) {
  const { session } = item
  const price = session.price_override ?? session.course.base_price ?? 0
  const campusName = session.location?.name || item.location.name || "Multiple Locations"

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3 transition-colors hover:bg-blue-50/40 hover:border-blue-100",
        compact && "p-2.5"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <SessionStatusIcon status={session.status} />
          <CourseDaysOfWeekBadges session={session} />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-slate-600">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3 shrink-0" strokeWidth={1.5} />
            {formatCalendarDate(session.start_date)} – {formatCalendarDate(session.end_date)}
          </span>
          {session.start_time && session.end_time ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0" strokeWidth={1.5} />
              {formatTime(session.start_time)} – {formatTime(session.end_time)}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" strokeWidth={1.5} />
            {campusName}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3 shrink-0" strokeWidth={1.5} />
            {session.is_full ? "Full" : `${session.available_spots} spots`}
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-slate-800">
            <DollarSign className="h-3 w-3 shrink-0" strokeWidth={1.5} />
            ${price.toFixed(2)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href={detailHref}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563eb] hover:text-blue-700 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
        >
          Details
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
        </Link>
        <a
          href={AMILIA_ENROLL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-[#2563eb] hover:bg-blue-600 px-2.5 py-1.5 rounded-lg transition-colors"
        >
          Enroll
          <ExternalLink className="h-3 w-3 shrink-0" strokeWidth={1.5} />
        </a>
      </div>
    </div>
  )
}

export function OfferingGroupListCard({
  group,
  locationCode,
  getCategorySlug,
}: {
  group: OfferingNameGroup
  locationCode: string | null
  getCategorySlug: (name: string) => string
}) {
  const borderClass = OFFERING_TYPE_BORDER[group.offeringTypeCode] ?? OFFERING_TYPE_BORDER.default
  const hoverClass = OFFERING_TYPE_HOVER[group.offeringTypeCode] ?? OFFERING_TYPE_HOVER.default
  const sessionCount = group.sessions.length
  const posterUrl =
    normalizeRemoteImageUrl(group.posterUrl) ||
    `https://picsum.photos/200/150?random=${group.offeringId || group.offeringName}`

  return (
    <Card
      className={cn(
        "group border shadow-sm transition-all duration-300 ease-out",
        "hover:-translate-y-0.5 hover:shadow-lg",
        borderClass,
        hoverClass
      )}
    >
      <CardContent className="p-4">
        <div className="flex gap-4 items-start">
          <div className="relative w-20 h-16 sm:w-24 sm:h-20 shrink-0 overflow-hidden rounded-xl">
            <LazySessionPoster
              src={posterUrl}
              alt={group.offeringName}
              sizes="96px"
              containerClassName="w-full h-full rounded-xl border border-slate-200"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">{group.offeringName}</h3>
              <Badge variant="secondary" className="text-[10px] font-semibold px-2 py-0">
                {sessionCount} session{sessionCount !== 1 ? "s" : ""}
              </Badge>
              <OfferingTypeIcon code={group.offeringTypeCode} />
            </div>
            {group.description ? (
              <p className="text-slate-500 text-xs mt-1.5 line-clamp-2 leading-relaxed">
                {group.description}
              </p>
            ) : null}
            <div className="mt-3 space-y-2">
              {group.sessions.map((item) => {
                const locCode = locationCode || item.location.code
                return (
                  <NestedSessionRow
                    key={item.session.id}
                    item={item}
                    detailHref={sessionDetailHref(item, locCode, getCategorySlug)}
                    compact
                  />
                )
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function OfferingGroupDetailsCard({
  group,
  locationCode,
  getCategorySlug,
}: {
  group: OfferingNameGroup
  locationCode: string | null
  getCategorySlug: (name: string) => string
}) {
  const hoverClass = OFFERING_TYPE_HOVER[group.offeringTypeCode] ?? OFFERING_TYPE_HOVER.default
  const sessionCount = group.sessions.length
  const posterUrl =
    normalizeRemoteImageUrl(group.posterUrl) ||
    `https://picsum.photos/400/300?random=${group.offeringId || group.offeringName}`

  const ageGroupFromFirst = (() => {
    const session = group.sessions[0]?.session
    if (!session) return "All Ages"
    if (session.course.age_min && session.course.age_max) {
      return `Ages ${session.course.age_min}-${session.course.age_max}`
    }
    if (session.course.age_min) return `Ages ${session.course.age_min}+`
    if (session.course.age_max) return `Up to Age ${session.course.age_max}`
    if (session.course.grade_level) return `Grade ${session.course.grade_level}`
    return "All Ages"
  })()

  return (
    <div
      className={cn(
        "group bg-white rounded-[32px] overflow-hidden border border-slate-200 shadow-sm",
        "transition-all duration-300 ease-out flex flex-col h-full",
        "hover:-translate-y-2 hover:shadow-2xl hover:ring-2 hover:ring-offset-0",
        hoverClass
      )}
    >
      <div className="h-52 relative overflow-hidden">
        <LazySessionPoster
          src={posterUrl}
          alt={group.offeringName}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          containerClassName="absolute inset-0"
          className="transition-transform duration-700 ease-out group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-80" />
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <span className="bg-white/90 backdrop-blur-md text-slate-900 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
            {ageGroupFromFirst}
          </span>
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <Badge className="bg-white/90 text-slate-900 hover:bg-white/90 text-xs font-bold">
            {sessionCount} session{sessionCount !== 1 ? "s" : ""} available
          </Badge>
        </div>
      </div>

      <div className="p-6 flex flex-col flex-grow">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
            {group.offeringName}
          </h3>
          <OfferingTypeIcon code={group.offeringTypeCode} />
        </div>
        {group.description ? (
          <p className="text-slate-500 text-sm mb-4 line-clamp-3 leading-relaxed">{group.description}</p>
        ) : null}

        <div className="mt-auto space-y-2">
          {group.sessions.map((item) => {
            const locCode = locationCode || item.location.code
            return (
              <NestedSessionRow
                key={item.session.id}
                item={item}
                detailHref={sessionDetailHref(item, locCode, getCategorySlug)}
              />
            )
          })}
        </div>
      </div>

      {group.sessions.length === 1 ? (
        <div className="px-6 pb-6 flex justify-end border-t border-slate-100 pt-4">
          <Link
            href={sessionDetailHref(
              group.sessions[0],
              locationCode || group.sessions[0].location.code,
              getCategorySlug
            )}
            className="bg-[#0f172a] hover:bg-slate-800 text-white px-5 py-2.5 rounded-2xl font-bold text-sm transition-all inline-flex items-center gap-2"
          >
            View Details
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : null}
    </div>
  )
}
