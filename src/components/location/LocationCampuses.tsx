"use client"

import { MapPin, ExternalLink, Mail, Phone } from "lucide-react"

export type Campus = {
  id: string
  name?: string | null
  display_name?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
  country?: string | null
  phone?: string | null
  email?: string | null
  latitude?: number | null
  longitude?: number | null
}

interface LocationCampusesProps {
  campuses: Campus[]
  displayName: string
}

function formatAddress(c: Campus): string {
  const parts = [c.address, c.city, c.state, c.zip_code].filter(Boolean)
  return parts.length > 0 ? parts.join(", ") : ""
}

function getMapEmbedSrc(campus: Campus, address: string): string | null {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) return null

  if (campus.latitude != null && campus.longitude != null) {
    return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${campus.latitude},${campus.longitude}&zoom=15`
  }
  if (address) {
    return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(address)}&zoom=15`
  }
  return null
}

function CampusMap({ campus, address }: { campus: Campus; address: string }) {
  const embedSrc = getMapEmbedSrc(campus, address)
  const mapsSearchUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null

  if (embedSrc) {
    return (
      <div className="rounded-xl overflow-hidden border border-white/10 h-[220px] sm:h-[260px] bg-slate-800/50">
        <iframe
          title={`Map for ${campus.display_name || campus.name || "campus"}`}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          src={embedSrc}
        />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-dashed border-white/20 h-[220px] sm:h-[260px] flex flex-col items-center justify-center gap-3 bg-slate-800/30 p-6 text-center">
      <MapPin className="h-10 w-10 text-[#38bdf8]" />
      <p className="text-sm text-slate-400">Map preview unavailable</p>
      {mapsSearchUrl ? (
        <a
          href={mapsSearchUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="text-sm text-[#38bdf8] hover:underline inline-flex items-center gap-1"
        >
          Open in Google Maps
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ) : null}
    </div>
  )
}

export function LocationCampuses({ campuses, displayName }: LocationCampusesProps) {
  if (!campuses.length) return null

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-[#0f172a] dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Our Campuses</h2>
        <p className="text-slate-300 text-sm md:text-base mb-10 max-w-2xl">
          {displayName} has {campuses.length} campus{campuses.length > 1 ? "es" : ""}. Visit us at the
          locations below.
        </p>

        <div className="flex flex-col gap-10">
          {campuses.map((campus) => {
            const address = formatAddress(campus)
            const name = campus.display_name || campus.name || "Campus"
            const mapsSearchUrl = address
              ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
              : null

            return (
              <article
                key={campus.id}
                className="rounded-2xl border border-white/10 bg-slate-800/40 overflow-hidden"
              >
                <div className="grid lg:grid-cols-2 gap-0">
                  <div className="p-6 sm:p-8 flex flex-col justify-center">
                    <h3 className="text-xl font-bold text-white mb-4">{name}</h3>

                    {address ? (
                      <div className="flex items-start gap-3 text-slate-300 mb-4">
                        <MapPin className="h-5 w-5 mt-0.5 shrink-0 text-[#38bdf8]" />
                        <div>
                          <p className="text-sm leading-relaxed">{address}</p>
                          {campus.country && campus.country !== "US" && campus.country !== "USA" ? (
                            <p className="text-xs text-slate-500 mt-1">{campus.country}</p>
                          ) : null}
                          {mapsSearchUrl ? (
                            <a
                              href={mapsSearchUrl}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="mt-2 inline-flex items-center gap-1 text-sm text-[#38bdf8] hover:underline"
                            >
                              Get directions
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    {campus.phone ? (
                      <div className="flex items-center gap-3 text-slate-300 mb-3">
                        <Phone className="h-4 w-4 shrink-0 text-[#38bdf8]" />
                        <a href={`tel:${campus.phone}`} className="text-sm hover:text-white transition-colors">
                          {campus.phone}
                        </a>
                      </div>
                    ) : null}

                    {campus.email ? (
                      <div className="flex items-center gap-3 text-slate-300">
                        <Mail className="h-4 w-4 shrink-0 text-[#38bdf8]" />
                        <a
                          href={`mailto:${campus.email}`}
                          className="text-sm hover:text-white transition-colors break-all"
                        >
                          {campus.email}
                        </a>
                      </div>
                    ) : null}
                  </div>

                  <div className="p-4 sm:p-6 lg:p-6 lg:pl-0">
                    <CampusMap campus={campus} address={address} />
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
