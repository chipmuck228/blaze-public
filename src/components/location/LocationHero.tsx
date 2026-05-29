'use client'

import { MapPin, ArrowRight, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { useRef } from "react"
import type { FeaturedSession } from "@/lib/featured-sessions"
import { FeaturedSessionCard } from "@/components/FeaturedSessionCard"

interface LocationHeroProps {
  heroTitle: string
  heroSubtitle?: string | null
  heroDescription: string
  heroBackgroundUrl?: string | null
  heroCtaText: string
  heroCtaLink: string
  heroCtaExternal?: boolean
  displayName: string
  primaryAddress: string
  normalizedCode: string
  sessions: FeaturedSession[]
}

export function LocationHero({
  heroTitle,
  heroSubtitle,
  heroDescription,
  heroBackgroundUrl,
  heroCtaText,
  heroCtaLink,
  heroCtaExternal = false,
  displayName,
  primaryAddress,
  normalizedCode,
  sessions,
}: LocationHeroProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    const scrollAmount = 320
    const currentScroll = scrollRef.current.scrollLeft
    scrollRef.current.scrollTo({
      left: direction === 'left' ? currentScroll - scrollAmount : currentScroll + scrollAmount,
      behavior: 'smooth',
    })
  }

  return (
    <section className="relative min-h-[100vh] lg:min-h-[60vh] flex flex-col lg:flex-row bg-[#0f172a] overflow-hidden pt-20 items-center justify-center">
      {heroBackgroundUrl ? (
        <>
          <div
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${heroBackgroundUrl})` }}
          />
          <div className="absolute inset-0 z-0 bg-[#0f172a]/80" aria-hidden />
        </>
      ) : (
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4"></div>
        </div>
      )}

      <div className="relative z-10 w-full lg:w-1/2 flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="max-w-xl">
          <h1 className="text-5xl lg:text-7xl font-extrabold text-white leading-[1.1] mb-6 tracking-tight">
            {heroTitle}
          </h1>
          {heroSubtitle && (
            <p className="text-xl text-slate-200 font-medium mb-4 leading-relaxed">
              {heroSubtitle}
            </p>
          )}
          <p className="text-lg text-slate-300 mb-8 leading-relaxed">
            {heroDescription}
          </p>

          {primaryAddress && (
            <div className="mb-6 text-sm text-slate-300">
              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 mt-0.5 text-[#38bdf8] flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-white">{displayName} Campus</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p>{primaryAddress}</p>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(primaryAddress)}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-[#38bdf8] hover:text-[#38bdf8]/80 transition-colors"
                      aria-label="Open location in Google Maps"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-4">
            {heroCtaExternal ? (
              <a
                href={heroCtaLink}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#2563eb] text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-600 transition-all flex items-center shadow-xl hover:shadow-2xl hover:-translate-y-1"
              >
                {heroCtaText}
                <ExternalLink className="ml-2 w-5 h-5" />
              </a>
            ) : (
              <Link
                href={heroCtaLink}
                className="bg-[#2563eb] text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-600 transition-all flex items-center shadow-xl hover:shadow-2xl hover:-translate-y-1"
              >
                {heroCtaText}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full lg:w-1/2 flex flex-col justify-center bg-slate-900/30 backdrop-blur-sm border-l border-white/5">
        <div className="p-8 lg:p-12 w-full">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h3 className="text-white text-2xl font-bold">Featured Sessions</h3>
              <p className="text-slate-400 text-sm">Featured sessions at {displayName}</p>
            </div>
            {sessions.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => scroll('left')}
                  className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => scroll('right')}
                  className="p-3 rounded-full bg-[#2563eb] hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <p className="text-sm">No featured sessions at {displayName}</p>
            </div>
          ) : (
            <div
              ref={scrollRef}
              className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory scrollbar-hide -mr-4 lg:-mr-0 pr-4 lg:pr-0"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {sessions.map((session, index) => (
                <FeaturedSessionCard key={session.id} session={session} index={index} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export type { FeaturedSession as LocationHeroSession }
