"use client"

import { MapPin, ExternalLink } from "lucide-react"

export type Campus = {
  id: string
  name?: string | null
  display_name?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
}

interface LocationCampusesProps {
  campuses: Campus[]
  displayName: string
}

function formatAddress(c: Campus): string {
  const parts = [c.address, c.city, c.state, c.zip_code].filter(Boolean)
  return parts.length > 0 ? parts.join(", ") : ""
}

export function LocationCampuses({ campuses, displayName }: LocationCampusesProps) {
  if (!campuses.length) return null

  return (
    <section className="py-12 sm:py-16 bg-slate-50 dark:bg-slate-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Our Campuses
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
          {displayName} has {campuses.length} location{campuses.length > 1 ? "s" : ""}.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {campuses.map((campus) => {
            const address = formatAddress(campus)
            const name = campus.display_name || campus.name || "Campus"
            return (
              <div
                key={campus.id}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4"
              >
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {name}
                </h3>
                {address ? (
                  <div className="mt-2 flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-[#2563eb]" />
                    <span>{address}</span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="shrink-0 text-[#2563eb] hover:underline"
                      aria-label={`Open ${name} in Google Maps`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
