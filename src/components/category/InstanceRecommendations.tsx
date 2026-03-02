'use client'

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { BookOpen, Loader2 } from "lucide-react"

export interface RecommendedOffering {
  id: string
  name: string
  slug?: string
  poster_url?: string
  base_price?: number
  category?: { id: string; name: string; display_name?: string; slug?: string }
}

interface InstanceRecommendationsProps {
  offeringTypeId: string
  excludeOfferingId: string
  categoryId?: string
  categorySlug: string
}

export function InstanceRecommendations({
  offeringTypeId,
  excludeOfferingId,
  categoryId,
  categorySlug,
}: InstanceRecommendationsProps) {
  const [items, setItems] = useState<RecommendedOffering[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams({
      offeringTypeId,
      excludeOfferingId,
      limit: "4",
    })
    if (categoryId) params.set("categoryId", categoryId)
    fetch(`/api/public/offerings/recommend?${params}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((list: RecommendedOffering[]) => {
        if (!cancelled) setItems(Array.isArray(list) ? list : [])
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [offeringTypeId, excludeOfferingId, categoryId])

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
        {items.map((offering) => {
          const href = offering.category?.slug
            ? `/category/${offering.category.slug}`
            : categorySlug
              ? `/category/${categorySlug}`
              : "/programs"
          return (
            <li key={offering.id}>
              <Link
                href={href}
                className="flex gap-3 rounded-xl border border-slate-100 p-3 hover:border-blue-200 hover:bg-slate-50/50 transition-colors group"
              >
                <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                  {offering.poster_url ? (
                    <Image
                      src={offering.poster_url}
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
                  <p className="font-semibold text-slate-800 group-hover:text-blue-600 truncate">
                    {offering.name}
                  </p>
                  {offering.base_price != null && (
                    <p className="text-sm text-slate-500 mt-0.5">
                      From {typeof offering.base_price === "number" ? `$${offering.base_price.toFixed(2)}` : offering.base_price}
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
