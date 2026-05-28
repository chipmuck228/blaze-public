'use client'

import { useState, useEffect } from "react"
import Link from "next/link"
import { UtensilsCrossed, Heart, Loader2 } from "lucide-react"

/** Flattened instance item from GET /api/public/instances-v2 (franchises[].programs[].instances[]) */
interface FlatInstance {
  id: string
  start_date: string | null
  end_date: string | null
  start_time: string | null
  end_time: string | null
  course?: { name?: string; slug?: string; base_price?: number }
  offering?: { id: string; name?: string; base_price?: number }
  available_spots?: number
  is_full?: boolean
}

interface MealCareServiceBlockProps {
  role: "meal_service" | "care_service"
  title: string
  description?: string
  locationCode?: string | null
  categoryId?: string | null
  categorySlug?: string
  excludeInstanceId?: string
  maxItems?: number
}

function flattenInstancesFromResponse(data: { franchises?: Array<{ programs?: Array<{ instances?: FlatInstance[] }> }> }): FlatInstance[] {
  const list: FlatInstance[] = []
  const franchises = data?.franchises ?? []
  for (const f of franchises) {
    const programs = f?.programs ?? []
    for (const p of programs) {
      const instances = p?.instances ?? []
      for (const inst of instances) list.push(inst)
    }
  }
  return list
}

export function MealCareServiceBlock({
  role,
  title,
  description,
  locationCode,
  categoryId,
  categorySlug = "",
  excludeInstanceId,
  maxItems = 4,
}: MealCareServiceBlockProps) {
  const [items, setItems] = useState<FlatInstance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams({ portal_service_role: role })
    if (locationCode) params.set("location", locationCode)
    if (categoryId) params.set("category", categoryId)
    fetch(`/api/public/instances-v2?${params}`)
      .then((res) => (res.ok ? res.json() : { franchises: [] }))
      .then((data) => {
        if (cancelled) return
        let list = flattenInstancesFromResponse(data)
        if (excludeInstanceId) list = list.filter((i) => i.id !== excludeInstanceId)
        setItems(list.slice(0, maxItems))
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [role, locationCode, categoryId, excludeInstanceId, maxItems])

  const Icon = role === "meal_service" ? UtensilsCrossed : Heart

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
        <h3 className="font-bold text-slate-900 mb-2 text-lg flex items-center gap-2">
          <Icon className="w-5 h-5 text-amber-500" />
          {title}
        </h3>
        {description && <p className="text-slate-600 text-sm mb-4">{description}</p>}
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
        </div>
      </div>
    )
  }

  if (items.length === 0) return null

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
      <h3 className="font-bold text-slate-900 mb-2 text-lg flex items-center gap-2">
        <Icon className="w-5 h-5 text-amber-500" />
        {title}
      </h3>
      {description && <p className="text-slate-600 text-sm mb-4">{description}</p>}
      <ul className="space-y-3">
        {items.map((inst) => {
          const name = inst.course?.name ?? inst.offering?.name ?? "Session"
          const price = inst.offering?.base_price ?? inst.course?.base_price
          const href = categorySlug
            ? `/category/${encodeURIComponent(categorySlug)}/instance/${encodeURIComponent(inst.id)}${
                locationCode ? `?location=${encodeURIComponent(locationCode)}` : ""
              }`
            : `/programs${locationCode ? `?location=${encodeURIComponent(locationCode)}` : ""}`
          return (
            <li key={inst.id}>
              <Link
                href={href}
                className="block rounded-xl border border-slate-200 p-3 hover:border-[#2563eb] hover:bg-slate-50 transition-colors"
              >
                <span className="font-medium text-slate-900">{name}</span>
                {price != null && (
                  <span className="block text-sm text-slate-500 mt-0.5">
                    ${Number(price).toFixed(2)}
                    {inst.is_full ? " · Waitlist" : inst.available_spots != null ? ` · ${inst.available_spots} spots` : ""}
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
