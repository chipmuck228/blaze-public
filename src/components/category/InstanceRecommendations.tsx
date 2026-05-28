'use client'

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { BookOpen, Loader2 } from "lucide-react"
import { normalizeRemoteImageUrl } from "@/lib/normalize-image-url"

interface RecommendedSession {
  id: string
  start_date: string | null
  end_date: string | null
  categorySlug: string
  course?: {
    name?: string
    poster_url?: string | null
    base_price?: number
  }
  offering?: {
    id: string
    name?: string
    poster_url?: string | null
    base_price?: number
  }
  price_override?: number | null
  available_spots?: number
  is_full?: boolean
}

interface InstanceRecommendationsProps {
  excludeOfferingId: string
  excludeInstanceId: string
  categoryId?: string
  categorySlug: string
  locationCode?: string | null
  maxItems?: number
}

function categoryNameToSlug(name: string): string {
  return (name || "").replace(/_/g, "-")
}

function flattenSessionsFromResponse(
  data: {
    franchises?: Array<{
      programs?: Array<{
        category?: { name?: string }
        instances?: RecommendedSession[]
      }>
    }>
  },
  fallbackCategorySlug: string
): RecommendedSession[] {
  const list: RecommendedSession[] = []
  for (const franchise of data?.franchises ?? []) {
    for (const program of franchise?.programs ?? []) {
      const catSlug =
        categoryNameToSlug(program.category?.name || "") || fallbackCategorySlug || "explore"
      for (const inst of program.instances ?? []) {
        list.push({ ...inst, categorySlug: catSlug })
      }
    }
  }
  return list
}

function sessionDetailHref(session: RecommendedSession, locationCode?: string | null): string {
  const slug = session.categorySlug || "explore"
  const base = `/category/${encodeURIComponent(slug)}/instance/${encodeURIComponent(session.id)}`
  if (!locationCode) return base
  return `${base}?location=${encodeURIComponent(locationCode)}`
}

export function InstanceRecommendations({
  excludeOfferingId,
  excludeInstanceId,
  categoryId,
  categorySlug,
  locationCode,
  maxItems = 4,
}: InstanceRecommendationsProps) {
  const [items, setItems] = useState<RecommendedSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams()
    if (locationCode) params.set("location", locationCode)
    if (categoryId) params.set("category", categoryId)

    fetch(`/api/public/instances-v2?${params}`)
      .then((res) => (res.ok ? res.json() : { franchises: [] }))
      .then((data) => {
        if (cancelled) return
        let list = flattenSessionsFromResponse(data, categorySlug)
        list = list.filter(
          (s) => s.id !== excludeInstanceId && s.offering?.id !== excludeOfferingId
        )
        setItems(list.slice(0, maxItems))
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [locationCode, categoryId, categorySlug, excludeInstanceId, excludeOfferingId, maxItems])

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
        <h3 className="font-bold text-slate-900 mb-4 text-lg">You might also like</h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
        </div>
      </div>
    )
  }

  if (items.length === 0) return null

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
      <h3 className="font-bold text-slate-900 mb-4 text-lg">You might also like</h3>
      <ul className="space-y-4">
        {items.map((session) => {
          const name = session.course?.name ?? session.offering?.name ?? "Session"
          const poster =
            normalizeRemoteImageUrl(session.offering?.poster_url) ||
            normalizeRemoteImageUrl(session.course?.poster_url)
          const price =
            session.price_override ??
            session.offering?.base_price ??
            session.course?.base_price
          const href = sessionDetailHref(session, locationCode)
          const dates =
            session.start_date && session.end_date
              ? `${new Date(session.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(session.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
              : null

          return (
            <li key={session.id}>
              <Link
                href={href}
                className="flex gap-3 rounded-xl border border-slate-100 p-3 hover:border-blue-200 hover:bg-slate-50/50 transition-colors group"
              >
                <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden shrink-0 relative">
                  {poster ? (
                    <Image
                      src={poster}
                      alt=""
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <BookOpen className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 group-hover:text-blue-600 line-clamp-2">
                    {name}
                  </p>
                  {dates && <p className="text-xs text-slate-500 mt-0.5">{dates}</p>}
                  {price != null && (
                    <p className="text-sm text-slate-500 mt-0.5">
                      ${Number(price).toFixed(2)}
                      {session.is_full
                        ? " · Full"
                        : session.available_spots != null
                          ? ` · ${session.available_spots} spots`
                          : ""}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
