'use client'

import { useState, useEffect, type ReactNode } from "react"
import { useParams, usePathname, useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import DOMPurify from "dompurify"
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  Users,
  Loader2,
  BookOpen,
  Target,
  FileText,
  DollarSign,
  Check,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { InstanceRecommendations } from "@/components/category/InstanceRecommendations"
import { MealCareServiceBlock } from "@/components/category/MealCareServiceBlock"
import { flattenInstanceDataExtForDisplay, formatSchemaValueForDisplay, iterateInstanceSchemaFieldsForDisplay, type SchemaFieldDisplayConfig } from "@/lib/instance-schema"

/** Renders HTML (from WYSIWYG editor) or Markdown with consistent prose styling. */
function RichTextContent({ content, className = "" }: { content: string; className?: string }) {
  const trimmed = content.trim()
  const isHtml = trimmed.startsWith("<") && trimmed.includes(">")

  if (!trimmed) return null

  if (isHtml) {
    const sanitized = DOMPurify.sanitize(trimmed, {
      ALLOWED_TAGS: ["p", "br", "strong", "em", "s", "u", "a", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "span"],
      ALLOWED_ATTR: ["href", "target", "rel", "class", "style"],
    })
    return (
      <div
        className={`text-slate-600 leading-relaxed prose prose-slate max-w-none ${className}`}
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    )
  }

  return (
    <div className={`text-slate-600 leading-relaxed prose prose-slate max-w-none ${className}`}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h1 className="text-lg font-semibold mt-2 mb-1 first:mt-0 text-slate-900">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-semibold mt-2 mb-1 first:mt-0 text-slate-900">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold mt-1.5 mb-0.5 first:mt-0 text-slate-900">{children}</h3>,
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-0.5">{children}</ol>,
          li: ({ children }) => <li className="leading-snug">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-slate-800">{children}</strong>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#2563eb] underline">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

const SECTION_LABELS_DEFAULT = {
  overview: "Overview",
  audience: "Audience",
  outcomes: "Outcomes",
  prerequisites: "Prerequisites",
} as const

type SectionLabels = { overview: string; audience: string; outcomes: string; prerequisites: string }

/** Overrides per offering type; unknown types fall back to SECTION_LABELS_DEFAULT. */
const OFFERING_TYPE_LABEL_OVERRIDES: Record<string, Partial<SectionLabels>> = {
  course: { overview: "Course Overview", audience: "Target Audience", outcomes: "What You'll Learn", prerequisites: "Prerequisites" },
  camp: { overview: "Camp Overview", audience: "Who It's For", outcomes: "Camp Highlights", prerequisites: "Requirements" },
  workshop: { overview: "Workshop Overview", audience: "Who It's For", outcomes: "What You'll Gain", prerequisites: "Prerequisites" },
  free_trial: { overview: "Trial Overview", audience: "Who It's For", outcomes: "What to Expect", prerequisites: "Requirements" },
  giftcard: { overview: "Gift Card Details", audience: "Use For", outcomes: "Value", prerequisites: "" },
  competition: { overview: "Competition Overview", audience: "Eligibility", outcomes: "What You'll Experience", prerequisites: "Requirements" },
}

export interface InstanceDetailData {
  id: string
  start_date: string | null
  end_date: string | null
  start_time: string | null
  end_time: string | null
  max_students: number | null
  current_students: number
  status: string
  price_override: number | null
  instance_data_ext: Record<string, unknown>
  location?: { id: string; name: string; address?: string; city?: string; state?: string }
  program: {
    id: string
    name: string
    display_name: string
    description?: string
    category?: { id: string; name: string; display_name: string }
    franchise?: { id: string; code: string; name: string }
  }
  offering: {
    id: string
    name: string
    slug?: string
    poster_url?: string
    type_config_data: Record<string, unknown>
    /** C-end detail: show Meal/Care blocks (INSTANCE_DETAIL_MEAL_CARE_SERVICES_DESIGN) */
    portal_config?: { show_meal_service?: boolean; show_care_service?: boolean }
    offering_type?: { id: string; code: string; name: string; instance_schema?: { fields?: Record<string, unknown> }; offering_schema?: { fields?: Record<string, unknown> } }
    base_price?: number
    currency?: string
  }
  available_spots: number
  is_full: boolean
  amilia_link?: string | null
}

function enrollCtaProps(data: InstanceDetailData, franchiseCode?: string) {
  const cartHref = `/enrollments/cart?instance_id=${data.id}${franchiseCode ? `&franchise=${franchiseCode}` : ""}`
  const amilia = data.amilia_link?.trim()
  if (!data.is_full && amilia) {
    return {
      href: amilia,
      external: true as const,
    }
  }
  return { href: cartHref, external: false as const }
}

function EnrollCta({
  data,
  franchiseCode,
  className,
  children,
}: {
  data: InstanceDetailData
  franchiseCode?: string
  className?: string
  children: ReactNode
}) {
  const { href, external } = enrollCtaProps(data, franchiseCode)
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    )
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  )
}

function getTypeLabels(code?: string): SectionLabels {
  const key = (code ?? "").toLowerCase()
  const overrides = key ? OFFERING_TYPE_LABEL_OVERRIDES[key] : undefined
  return { ...SECTION_LABELS_DEFAULT, ...overrides } as SectionLabels
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "TBD"
  return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return ""
  const [h, m] = timeStr.split(":")
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? "PM" : "AM"
  const displayHour = hour % 12 || 12
  return `${displayHour}:${m || "00"} ${ampm}`
}

/** Parse "YYYY-MM-DD" as local date (avoid UTC shift). */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number)
  if (y == null || m == null || d == null) return new Date(NaN)
  return new Date(y, m - 1, d)
}

/** Get all session dates between start and end (inclusive), in local calendar. If daysOfWeek is set (0=Sun..6=Sat), only those weekdays are included. */
function getSessionDatesInRange(
  startDateStr: string,
  endDateStr: string,
  daysOfWeek?: number[]
): string[] {
  const start = parseLocalDate(startDateStr)
  const end = parseLocalDate(endDateStr)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return []
  const out: string[] = []
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const endLocal = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  while (cursor <= endLocal) {
    const day = cursor.getDay()
    if (!daysOfWeek || daysOfWeek.length === 0 || daysOfWeek.includes(day)) {
      const y = cursor.getFullYear()
      const m = String(cursor.getMonth() + 1).padStart(2, "0")
      const d = String(cursor.getDate()).padStart(2, "0")
      out.push(`${y}-${m}-${d}`)
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return out
}

/** iCalendar-style mini calendar: show which days in the range have a session. */
function InstanceSessionCalendar({
  startDateStr,
  endDateStr,
  daysOfWeek,
}: {
  startDateStr: string | null
  endDateStr: string | null
  daysOfWeek?: number[]
}) {
  if (!startDateStr) return null
  const end = endDateStr || startDateStr
  const sessionDates = getSessionDatesInRange(startDateStr, end, daysOfWeek)
  if (sessionDates.length === 0) return null

  const sessionSet = new Set(sessionDates)
  const start = parseLocalDate(startDateStr)
  const endDate = parseLocalDate(end)
  if (Number.isNaN(start.getTime()) || Number.isNaN(endDate.getTime())) return null
  const months: { year: number; month: number; firstDay: Date; lastDay: Date }[] = []
  let y = start.getFullYear()
  let m = start.getMonth()
  const endY = endDate.getFullYear()
  const endM = endDate.getMonth()
  while (y < endY || (y === endY && m <= endM)) {
    const firstDay = new Date(y, m, 1)
    const lastDay = new Date(y, m + 1, 0)
    months.push({ year: y, month: m, firstDay, lastDay })
    if (m === 11) {
      m = 0
      y += 1
    } else {
      m += 1
    }
  }

  const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  return (
    <div className="mt-6 pt-6 border-t border-slate-200">
      <h4 className="text-sm font-semibold text-slate-700 mb-3">Session dates</h4>
      <div className="space-y-4">
        {months.map(({ year, month, firstDay, lastDay }) => {
          const startOfMonth = new Date(year, month, 1)
          const endOfMonth = new Date(year, month + 1, 0)
          const startPad = firstDay.getDay()
          const totalDays = lastDay.getDate()
          const cells: { date: number | null; isSession: boolean; isInRange: boolean }[] = []
          for (let i = 0; i < startPad; i++) cells.push({ date: null, isSession: false, isInRange: false })
          for (let d = 1; d <= totalDays; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
            const isInRange = dateStr >= startDateStr && dateStr <= end
            const isSession = sessionSet.has(dateStr)
            cells.push({ date: d, isSession, isInRange })
          }
          return (
            <div key={`${year}-${month}`}>
              <p className="text-xs font-medium text-slate-500 mb-1.5">
                {startOfMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>
              <div className="grid grid-cols-7 gap-0.5 text-center">
                {WEEKDAY_LABELS.map((label) => (
                  <div key={label} className="text-[10px] font-medium text-slate-400 py-0.5">
                    {label}
                  </div>
                ))}
                {cells.map((cell, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "h-7 flex items-center justify-center rounded text-xs",
                      !cell.date && "invisible",
                      cell.date && !cell.isInRange && "text-slate-300",
                      cell.date && cell.isInRange && !cell.isSession && "text-slate-500 bg-slate-50",
                      cell.date && cell.isSession && "bg-[#2563eb] text-white font-medium"
                    )}
                  >
                    {cell.date ?? ""}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function InstanceDetail() {
  const params = useParams()
  const pathname = usePathname()
  const router = useRouter()
  const instanceId = typeof params?.instanceId === "string" ? params.instanceId : ""
  const categorySlug = typeof params?.categorySlug === "string" ? params.categorySlug : ""

  const [data, setData] = useState<InstanceDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (data?.offering?.name && typeof document !== "undefined") {
      document.title = `${data.offering.name} | Blaze Robotics`
    }
  }, [data?.offering?.name])

  // Keep location in URL so Navbar can show it (pathname starts with /category/ and Navbar reads ?location or ?franchise)
  useEffect(() => {
    if (typeof window === "undefined" || !data?.program?.franchise?.code) return
    const params = new URLSearchParams(window.location.search)
    if (params.get("location") || params.get("franchise")) return
    router.replace(`${pathname}?location=${encodeURIComponent(data.program.franchise.code)}`)
  }, [data?.program?.franchise?.code, pathname, router])

  useEffect(() => {
    if (!instanceId) {
      setLoading(false)
      setError("Missing instance")
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/public/instance-v2/${instanceId}`)
      .then((res) => {
        if (cancelled) return
        if (res.status === 404) {
          setData(null)
          setError("Not found")
          return
        }
        if (!res.ok) throw new Error("Failed to load")
        return res.json()
      })
      .then((json) => {
        if (!cancelled && json) setData(json)
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? "Failed to load")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [instanceId])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
        <p className="text-slate-600 mb-4">{error === "Not found" ? "This session could not be found." : error}</p>
        <Button variant="outline" asChild>
          <Link href={categorySlug ? `/category/${categorySlug}` : "/"}>Back to category</Link>
        </Button>
      </div>
    )
  }

  const typeLabels = getTypeLabels(data.offering?.offering_type?.code)
  const category = data.program?.category
  const franchise = data.program?.franchise
  const config = data.offering?.type_config_data ?? {}
  const portalConfig = data.offering?.portal_config ?? (config?.portal_config as { show_meal_service?: boolean; show_care_service?: boolean } | undefined) ?? {}
  const showMealService = !!portalConfig.show_meal_service
  const showCareService = !!portalConfig.show_care_service
  if (typeof window !== "undefined") {
    console.log("[InstanceDetail] Meal/Care blocks:", {
      portal_config: data.offering?.portal_config,
      portalConfig_from_config: config?.portal_config,
      portalConfig_resolved: portalConfig,
      show_meal_service: portalConfig.show_meal_service,
      show_care_service: portalConfig.show_care_service,
      showMealService,
      showCareService,
    })
  }
  const categorySlugNorm = categorySlug || (category?.name ? String(category.name).replace(/_/g, "-") : "")
  const ext = data.instance_data_ext ?? {}
  const instanceSchemaFields = data.offering?.offering_type?.instance_schema?.fields as Record<string, { type?: string; label?: string; display_scope?: string }> | undefined
  const offeringSchemaFields = data.offering?.offering_type?.offering_schema?.fields as Record<string, { type?: string; label?: string; display_scope?: string }> | undefined
  const flatExt = instanceSchemaFields ? flattenInstanceDataExtForDisplay(instanceSchemaFields, ext) : (ext as Record<string, unknown>)
  const flatConfig = offeringSchemaFields ? flattenInstanceDataExtForDisplay(offeringSchemaFields, config) : (config as Record<string, unknown>)
  const price = data.price_override ?? data.offering?.base_price ?? (flatConfig?.base_price as number | undefined) ?? 0
  const currency = (data.offering?.currency ?? (flatConfig?.currency as string | undefined) ?? "USD") as string
  const description = ((flatConfig?.description as string | undefined) ?? data.offering?.name) as string | undefined
  const targetAudience = flatConfig?.target_audience as string | undefined
  const learningOutcomes = flatConfig?.learning_outcomes as string | undefined
  const prerequisites = flatConfig?.prerequisites as string | undefined
  const posterUrl = data.offering?.poster_url
  const dates =
    data.start_date && data.end_date
      ? `${formatDate(data.start_date)} – ${formatDate(data.end_date)}`
      : data.start_date
        ? `Starts ${formatDate(data.start_date)}`
        : "TBD"
  const timeRange =
    data.start_time && data.end_time
      ? `${formatTime(data.start_time)} – ${formatTime(data.end_time)}`
      : data.start_time
        ? formatTime(data.start_time)
        : ""
  const locationName = data.location?.name ?? franchise?.name ?? "Multiple locations"
  const ageMin = (flatExt.age_min ?? config.age_min) as number | undefined
  const ageMax = (flatExt.age_max ?? config.age_max) as number | undefined
  const ageGroup =
    ageMin != null && ageMax != null
      ? `Ages ${ageMin}–${ageMax}`
      : ageMin != null
        ? `Ages ${ageMin}+`
        : ageMax != null
          ? `Up to age ${ageMax}`
          : "All ages"

  return (
    <div className="bg-slate-50 min-h-screen pb-24">
      {/* Sticky mobile CTA */}
      <div className="bg-white border-b border-slate-200 sticky top-14 z-40 px-4 py-3 shadow-sm md:hidden flex justify-between items-center">
        <span className="font-bold text-slate-900 truncate pr-4">{data.offering?.name}</span>
        <Button
          size="sm"
          className="bg-[#2563eb] hover:bg-blue-600"
          asChild
        >
          <EnrollCta data={data} franchiseCode={franchise?.code}>
            {data.is_full ? "Join waitlist" : "Enroll"}
          </EnrollCta>
        </Button>
      </div>

      {/* Hero */}
      <div className="bg-[#0f172a] text-white relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          {posterUrl && (
            <>
              <Image
                src={posterUrl}
                alt=""
                fill
                className="object-cover opacity-20 blur-sm scale-105"
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/80 to-transparent" />
            </>
          )}
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-12 pb-24">
          <Link
            href={`/programs${franchise?.code ? `?location=${encodeURIComponent(franchise.code)}` : ""}`}
            className="inline-flex items-center gap-2 mb-8 px-4 py-2.5 rounded-xl border border-white/20 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 hover:border-white/30 transition-all duration-200 text-sm font-medium backdrop-blur-sm"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>Programs</span>
          </Link>
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-grow">
              <div className="flex flex-wrap gap-3 mb-4">
                {category && (
                  <span className="bg-[#2563eb] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    {category.display_name || category.name}
                  </span>
                )}
                {data.offering?.offering_type?.name && (
                  <span className="bg-white/10 border border-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    {data.offering.offering_type.name}
                  </span>
                )}
                <span className="bg-white/10 border border-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  {ageGroup}
                </span>
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
                {data.offering?.name}
              </h1>
              <div className="flex flex-col sm:flex-row gap-6 text-slate-300 font-medium text-lg">
                {dates !== "TBD" && (
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-[#38bdf8]" />
                    {dates}
                  </div>
                )}
                {timeRange && (
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-[#38bdf8]" />
                    {timeRange}
                  </div>
                )}
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-[#38bdf8]" />
                  {locationName}
                </div>
              </div>
            </div>
            <div className="hidden md:block bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl min-w-[280px] text-center">
              <p className="text-slate-300 text-sm uppercase tracking-widest font-bold mb-2">Registration</p>
              <div className="text-5xl font-black text-white mb-2">
                {typeof price === "number" ? `${currency} ${price.toFixed(2)}` : currency}
              </div>
              <p className="text-slate-400 text-sm mb-6">
                {data.is_full ? "Waitlist only" : `${data.available_spots} spots left`}
              </p>
              <Button
                className="w-full bg-[#2563eb] hover:bg-blue-600 text-white py-4 rounded-xl font-bold text-lg"
                asChild
              >
                <EnrollCta data={data} franchiseCode={franchise?.code}>
                  {data.is_full ? "Join waitlist" : "Enroll now"}
                </EnrollCta>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-20">
        <div className="flex flex-col lg:flex-row gap-12">
          <div className="lg:w-2/3 space-y-8">
            {/* Overview */}
            <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">{typeLabels.overview}</h2>
              {description && (
                <RichTextContent content={typeof description === "string" ? description : String(description)} className="text-lg" />
              )}
            </section>

            {targetAudience && typeLabels.audience && (
              <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Target className="w-6 h-6 text-blue-500" />
                  {typeLabels.audience}
                </h2>
                <RichTextContent content={typeof targetAudience === "string" ? targetAudience : String(targetAudience)} />
              </section>
            )}

            {learningOutcomes && typeLabels.outcomes && (
              <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-green-500" />
                  {typeLabels.outcomes}
                </h2>
                <RichTextContent content={typeof learningOutcomes === "string" ? learningOutcomes : String(learningOutcomes)} />
              </section>
            )}

            {prerequisites && typeLabels.prerequisites && (
              <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-amber-500" />
                  {typeLabels.prerequisites}
                </h2>
                <RichTextContent content={typeof prerequisites === "string" ? prerequisites : String(prerequisites)} />
              </section>
            )}

            {/* Offering (type_config_data) + Instance (instance_data_ext) details; both flattened by schema to avoid [object Object] */}
            {(() => {
              const omit = new Set([
                "description",
                "target_audience",
                "learning_outcomes",
                "prerequisites",
                "base_price",
                "currency",
                "portal_config",
                "age_min",
                "age_max",
                "price_override",
              ])
              const WEEKDAY_NAMES = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
              const isDisplayable = (v: unknown) =>
                v !== undefined && v !== null && v !== "" && (typeof v !== "object" || Array.isArray(v))

              /** Build field config for formatSchemaValueForDisplay from iterator entry or fallback. */
              const toFieldConfig = (e: { key: string; type?: string; options?: unknown[]; option_labels?: string[]; multiline?: boolean; items?: SchemaFieldDisplayConfig["items"] }): SchemaFieldDisplayConfig => ({
                type: (e.type as SchemaFieldDisplayConfig["type"]) ?? "text",
                options: e.options,
                option_labels: e.option_labels,
                multiline: e.multiline,
                items: e.items,
              })

              const renderDetailValue = (value: unknown, fieldConfig: SchemaFieldDisplayConfig | undefined): ReactNode => {
                if (typeof value === "boolean") {
                  return (
                    <Badge
                      variant="outline"
                      className={cn(
                        "inline-flex items-center gap-1.5 font-medium",
                        value
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-100 text-slate-500"
                      )}
                    >
                      {value ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    </Badge>
                  )
                }
                if (fieldConfig?.multiline && typeof value === "string" && value.trim()) {
                  return <RichTextContent content={value} className="mt-0" />
                }
                return formatSchemaValueForDisplay(value, fieldConfig ?? undefined, { weekdayNames: WEEKDAY_NAMES })
              }

              const offeringEntries = offeringSchemaFields
                ? Array.from(iterateInstanceSchemaFieldsForDisplay(offeringSchemaFields, config, { displayScope: "web", flatten: true }))
                    .filter((e) => !omit.has(e.key) && isDisplayable(e.value))
                    .map((e) => [e.label, e.value, toFieldConfig(e)] as const)
                : Object.entries(flatConfig)
                    .filter(([k, v]) => !omit.has(k) && isDisplayable(v))
                    .map(([k, v]) => [k.replace(/_/g, " "), v, undefined] as const)
              const instanceEntries = instanceSchemaFields
                ? Array.from(iterateInstanceSchemaFieldsForDisplay(instanceSchemaFields, ext, { displayScope: "web", flatten: true }))
                    .filter((e) => !omit.has(e.key) && isDisplayable(e.value))
                    .map((e) => [e.label, e.value, toFieldConfig(e)] as const)
                : Object.entries(flatExt)
                    .filter(([k]) => !omit.has(k) && isDisplayable(flatExt[k]))
                    .map(([k, v]) => [k.replace(/_/g, " "), v, undefined] as const)
              const hasOffering = offeringEntries.length > 0
              const hasInstance = instanceEntries.length > 0
              if (!hasOffering && !hasInstance) return null
              return (
                <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">Details</h2>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    {hasOffering && (
                      <>
                        <div className="sm:col-span-2">
                          <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Offering</h3>
                        </div>
                        {offeringEntries.map(([label, value, fieldConfig]) => (
                          <div key={`offering-${String(label)}`} className="border-b border-slate-100 pb-2">
                            <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</dt>
                            <dd className="text-slate-700 mt-1">{renderDetailValue(value, fieldConfig)}</dd>
                          </div>
                        ))}
                      </>
                    )}
                    {hasInstance && (
                      <>
                        <div className="sm:col-span-2">
                          <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mt-2">This session</h3>
                        </div>
                        {instanceEntries.map(([label, value, fieldConfig]) => (
                          <div key={`instance-${String(label)}`} className="border-b border-slate-100 pb-2">
                            <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</dt>
                            <dd className="text-slate-700 mt-1">{renderDetailValue(value, fieldConfig)}</dd>
                          </div>
                        ))}
                      </>
                    )}
                  </dl>
                </section>
              )
            })()}
          </div>

          {/* Sidebar */}
          <div className="lg:w-1/3 space-y-6">
            <div className="md:hidden bg-white rounded-3xl p-6 shadow-lg border border-slate-200 text-center">
              <p className="text-slate-500 text-sm uppercase tracking-widest font-bold mb-1">Registration</p>
              <div className="text-4xl font-black text-slate-900 mb-4">
                {typeof price === "number" ? `${currency} ${price.toFixed(2)}` : currency}
              </div>
              <Button className="w-full bg-[#2563eb] hover:bg-blue-600 text-white py-3 rounded-xl font-bold" asChild>
                <EnrollCta data={data} franchiseCode={franchise?.code}>
                  {data.is_full ? "Join waitlist" : "Enroll now"}
                </EnrollCta>
              </Button>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-4 text-lg">Session details</h3>
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-slate-600">
                  <Calendar className="w-5 h-5 text-slate-400" />
                  <span>{dates}</span>
                </li>
                {timeRange && (
                  <li className="flex items-center gap-3 text-slate-600">
                    <Clock className="w-5 h-5 text-slate-400" />
                    <span>{timeRange}</span>
                  </li>
                )}
                <li className="flex items-center gap-3 text-slate-600">
                  <MapPin className="w-5 h-5 text-slate-400" />
                  <span>{locationName}</span>
                  {data.location?.address && (
                    <span className="block text-sm text-slate-500 mt-1">{data.location.address}</span>
                  )}
                </li>
                {data.max_students != null && (
                  <li className="flex items-center gap-3 text-slate-600">
                    <Users className="w-5 h-5 text-slate-400" />
                    <span>
                      {data.is_full ? "Full" : `${data.available_spots} of ${data.max_students} spots available`}
                    </span>
                  </li>
                )}
                <li className="flex items-center gap-3 text-slate-600">
                  <DollarSign className="w-5 h-5 text-slate-400" />
                  <span>{typeof price === "number" ? `${currency} ${price.toFixed(2)}` : currency}</span>
                </li>
              </ul>
              {data.start_date && (() => {
                const rawDow = flatExt.days_of_week ?? (ext as { schedule?: { days_of_week?: unknown[] } }).schedule?.days_of_week
                const daysOfWeek = Array.isArray(rawDow)
                  ? rawDow.map((d) => (typeof d === "number" ? d : parseInt(String(d), 10))).filter((n) => !Number.isNaN(n) && n >= 0 && n <= 6)
                  : undefined
                return (
                  <InstanceSessionCalendar
                    startDateStr={data.start_date}
                    endDateStr={data.end_date ?? data.start_date}
                    daysOfWeek={daysOfWeek?.length ? daysOfWeek : undefined}
                  />
                )
              })()}
              <Button
                className="w-full mt-6 bg-[#2563eb] hover:bg-blue-600 text-white py-3 rounded-xl font-bold"
                asChild
              >
                <EnrollCta data={data} franchiseCode={franchise?.code}>
                  {data.is_full ? "Join waitlist" : "Enroll now"}
                </EnrollCta>
              </Button>
            </div>

            {(showMealService || showCareService) && (
              <>
                {showMealService && (
                  <MealCareServiceBlock
                    role="meal_service"
                    title="Meal Service"
                    description="Add lunch or meal service for this program."
                    locationCode={franchise?.code}
                    categoryId={category?.id}
                    categorySlug={categorySlugNorm}
                    excludeInstanceId={data.id}
                    maxItems={4}
                  />
                )}
                {showCareService && (
                  <MealCareServiceBlock
                    role="care_service"
                    title="Care Service"
                    description="Add after-care or care service for this program."
                    locationCode={franchise?.code}
                    categoryId={category?.id}
                    categorySlug={categorySlugNorm}
                    excludeInstanceId={data.id}
                    maxItems={4}
                  />
                )}
              </>
            )}

            {data.offering?.offering_type?.id && (
              <InstanceRecommendations
                excludeOfferingId={data.offering.id}
                excludeInstanceId={data.id}
                categoryId={category?.id}
                categorySlug={categorySlugNorm}
                locationCode={franchise?.code}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
