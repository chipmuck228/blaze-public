'use client'

import { MapPin, ArrowRight, ExternalLink, ChevronLeft, ChevronRight, Star } from "lucide-react"
import Link from "next/link"
import { useRef } from "react"
import Image from "next/image"

export interface LocationHeroProgram {
  id: string
  name: string
  display_name: string
  description: string | null
  poster_url: string | null
  featured: boolean
  category: { id: string; name: string; display_name: string } | null
}

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
  programs: LocationHeroProgram[]
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
  programs,
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
      {/* Background: image from config (poster_url or hero.backgroundImage) or default gradient */}
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

      {/* Left: Location Information */}
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

      {/* Right: All programs – featured 特殊显示 */}
      <div className="relative z-10 w-full lg:w-1/2 flex flex-col justify-center bg-slate-900/30 backdrop-blur-sm border-l border-white/5">
        <div className="p-8 lg:p-12 w-full">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h3 className="text-white text-2xl font-bold">Programs</h3>
              <p className="text-slate-400 text-sm">All programs at this location · Featured highlighted</p>
            </div>
            {programs.length > 0 && (
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

          {programs.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <p className="text-sm">No programs available at this location</p>
            </div>
          ) : (
            <div
              ref={scrollRef}
              className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory scrollbar-hide -mr-4 lg:-mr-0 pr-4 lg:pr-0"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {programs.map((program) => {
                const posterUrl =
                  program.poster_url ||
                  `https://picsum.photos/400/300?random=${program.id}`
                const isFeatured = program.featured

                return (
                  <Link
                    key={program.id}
                    href={`/programs?location=${encodeURIComponent(normalizedCode)}`}
                    className={`snap-start rounded-3xl overflow-hidden shadow-xl cursor-pointer group hover:shadow-2xl transition-all duration-300 flex flex-col h-full flex-shrink-0 ${
                      isFeatured
                        ? 'min-w-[320px] w-[320px] md:min-w-[360px] md:w-[360px] ring-2 ring-amber-400/80 bg-gradient-to-b from-amber-50/50 to-white'
                        : 'min-w-[300px] w-[300px] md:min-w-[340px] md:w-[340px] bg-white'
                    } hover:-translate-y-2`}
                  >
                    <div className={`relative overflow-hidden shrink-0 ${isFeatured ? 'h-52' : 'h-48'}`}>
                      <Image
                        src={posterUrl}
                        alt={program.display_name || program.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 300px, 360px"
                      />
                      <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                        {isFeatured && (
                          <span className="inline-flex items-center gap-1 bg-amber-400 text-slate-900 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-md">
                            <Star className="h-3.5 w-3.5 fill-current" />
                            Featured
                          </span>
                        )}
                        {program.category && (
                          <span className="bg-[#2563eb] text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                            {program.category.display_name || program.category.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`flex flex-col flex-grow ${isFeatured ? 'p-6' : 'p-6'}`}>
                      <h4 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                        {program.display_name || program.name}
                      </h4>
                      <p className="text-slate-600 text-sm leading-relaxed flex-grow line-clamp-3 mb-4">
                        {program.description ||
                          `Explore ${program.display_name || program.name} with hands-on robotics and coding experiences.`}
                      </p>
                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                        <span className="text-xs text-slate-500">
                          {isFeatured ? 'Featured program' : 'View schedule'}
                        </span>
                        <ArrowRight className="h-5 w-5 text-[#2563eb] group-hover:translate-x-1 transition-transform flex-shrink-0" />
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
