'use client'

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  Users,
  Loader2,
  CheckCircle2,
  BookOpen,
  Target,
  FileText,
  DollarSign,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const OFFERING_TYPE_LABELS: Record<string, { overview: string; audience: string; outcomes: string; prerequisites: string }> = {
  course: { overview: "Program Overview", audience: "Target Audience", outcomes: "What You'll Learn", prerequisites: "Prerequisites" },
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
    offering_type?: { id: string; code: string; name: string }
    base_price?: number
    currency?: string
  }
  available_spots: number
  is_full: boolean
}

function getTypeLabels(code?: string) {
  const key = (code ?? "course").toLowerCase()
  return OFFERING_TYPE_LABELS[key] ?? OFFERING_TYPE_LABELS.course
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

export function InstanceDetail() {
  const params = useParams()
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
  const ext = data.instance_data_ext ?? {}
  const price = data.price_override ?? data.offering?.base_price ?? config.base_price ?? 0
  const currency = (data.offering?.currency ?? config.currency ?? "USD") as string
  const description = (config.description ?? data.offering?.name) as string | undefined
  const targetAudience = config.target_audience as string | undefined
  const learningOutcomes = config.learning_outcomes as string | undefined
  const prerequisites = config.prerequisites as string | undefined
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
  const ageMin = (ext.age_min ?? config.age_min) as number | undefined
  const ageMax = (ext.age_max ?? config.age_max) as number | undefined
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
          <Link href={`/enrollments/cart?instance_id=${data.id}${franchise?.code ? `&franchise=${franchise.code}` : ""}`}>
            {data.is_full ? "Join waitlist" : "Enroll"}
          </Link>
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
          <Button
            variant="ghost"
            className="text-slate-400 hover:text-white mb-8 -ml-2"
            asChild
          >
            <Link href={categorySlug ? `/category/${categorySlug}` : "/"} className="inline-flex items-center">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to programs
            </Link>
          </Button>
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
                <Link href={`/enrollments/cart?instance_id=${data.id}${franchise?.code ? `&franchise=${franchise.code}` : ""}`}>
                  {data.is_full ? "Join waitlist" : "Enroll now"}
                </Link>
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
                <div className="text-slate-600 text-lg leading-relaxed prose prose-slate max-w-none">
                  {typeof description === "string" && description.includes("\n")
                    ? description.split("\n").map((p, i) => <p key={i} className="mb-4">{p}</p>)
                    : <p>{description}</p>}
                </div>
              )}
            </section>

            {targetAudience && typeLabels.audience && (
              <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Target className="w-6 h-6 text-blue-500" />
                  {typeLabels.audience}
                </h2>
                <div className="text-slate-600 leading-relaxed prose prose-slate max-w-none">
                  {typeof targetAudience === "string" && targetAudience.includes("\n")
                    ? targetAudience.split("\n").map((p, i) => <p key={i} className="mb-2">{p}</p>)
                    : <p>{targetAudience}</p>}
                </div>
              </section>
            )}

            {learningOutcomes && typeLabels.outcomes && (
              <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-green-500" />
                  {typeLabels.outcomes}
                </h2>
                <div className="text-slate-600 leading-relaxed prose prose-slate max-w-none">
                  {typeof learningOutcomes === "string" && learningOutcomes.includes("\n")
                    ? learningOutcomes.split("\n").map((line, i) => (
                        <div key={i} className="flex gap-3 mb-2">
                          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                          <span>{line.trim()}</span>
                        </div>
                      ))
                    : <p>{learningOutcomes}</p>}
                </div>
              </section>
            )}

            {prerequisites && typeLabels.prerequisites && (
              <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-amber-500" />
                  {typeLabels.prerequisites}
                </h2>
                <div className="text-slate-600 leading-relaxed">
                  {typeof prerequisites === "string" && prerequisites.includes("\n")
                    ? prerequisites.split("\n").map((p, i) => <p key={i} className="mb-2">{p}</p>)
                    : <p>{prerequisites}</p>}
                </div>
              </section>
            )}

            {/* Extra type_config_data / instance_data_ext fields */}
            {(() => {
              const omit = new Set([
                "description",
                "target_audience",
                "learning_outcomes",
                "prerequisites",
                "base_price",
                "currency",
                "age_min",
                "age_max",
              ])
              const fromConfig = Object.entries(config).filter(([k, v]) => !omit.has(k) && v != null && v !== "")
              const fromExt = Object.entries(ext).filter(([k]) => !omit.has(k))
              const extra = [...fromConfig, ...fromExt]
              if (extra.length === 0) return null
              return (
                <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">Details</h2>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    {extra.map(([key, value]) => (
                      <div key={key} className="border-b border-slate-100 pb-2">
                        <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          {key.replace(/_/g, " ")}
                        </dt>
                        <dd className="text-slate-700 mt-1">
                          {Array.isArray(value) ? value.join(", ") : String(value)}
                        </dd>
                      </div>
                    ))}
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
                <Link href={`/enrollments/cart?instance_id=${data.id}${franchise?.code ? `&franchise=${franchise.code}` : ""}`}>
                  {data.is_full ? "Join waitlist" : "Enroll now"}
                </Link>
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
              <Button
                className="w-full mt-6 bg-[#2563eb] hover:bg-blue-600 text-white py-3 rounded-xl font-bold"
                asChild
              >
                <Link href={`/enrollments/cart?instance_id=${data.id}${franchise?.code ? `&franchise=${franchise.code}` : ""}`}>
                  {data.is_full ? "Join waitlist" : "Enroll now"}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
