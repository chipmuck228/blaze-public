'use client'

import { Button } from "@/components/ui/button"
import { MapPin, ArrowRight, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { useRef } from "react"

interface LocationHeroProps {
  heroTitle: string
  heroDescription: string
  displayName: string
  primaryAddress: string
  normalizedCode: string
  highlights: {
    programs: string
    schedule: string
    focus: string
  }
}

export function LocationHero({
  heroTitle,
  heroDescription,
  displayName,
  primaryAddress,
  normalizedCode,
  highlights,
}: LocationHeroProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    
    const scrollAmount = 320
    const currentScroll = scrollRef.current.scrollLeft
    
    if (direction === 'left') {
      scrollRef.current.scrollTo({
        left: currentScroll - scrollAmount,
        behavior: 'smooth'
      })
    } else {
      scrollRef.current.scrollTo({
        left: currentScroll + scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  const highlightCards = [
    {
      title: 'Programs',
      description: highlights.programs,
      icon: '📚',
    },
    {
      title: 'Schedule',
      description: highlights.schedule,
      icon: '📅',
    },
    {
      title: 'Focus',
      description: highlights.focus,
      icon: '🎯',
    },
  ]

  return (
    <section className="relative min-h-[100vh] lg:min-h-[60vh] flex flex-col lg:flex-row bg-[#0f172a] overflow-hidden pt-20 lg:pt-20 items-center justify-center">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4"></div>
      </div>

      {/* Left: Location Information */}
      <div className="relative z-10 w-full lg:w-1/2 flex flex-col justify-center px-4 sm:px-6 lg:px-12 py-12 lg:py-0">
        <div className="max-w-xl">
          <h1 className="text-5xl lg:text-7xl font-extrabold text-white leading-[1.1] mb-6 tracking-tight">
            {heroTitle}
          </h1>
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
            <Link
              href="#programs"
              className="bg-[#2563eb] text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-600 transition-all flex items-center shadow-xl hover:shadow-2xl hover:-translate-y-1"
            >
              View Programs
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Right: Highlights Carousel */}
      <div className="relative z-10 w-full lg:w-1/2 flex flex-col justify-center bg-slate-900/30 backdrop-blur-sm border-l border-white/5">
        <div className="p-8 lg:p-12 w-full">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h3 className="text-white text-2xl font-bold">{displayName} Highlights</h3>
              <p className="text-slate-400 text-sm">Swipe to explore key features</p>
            </div>
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
          </div>

          {/* Scrollable Container */}
          <div 
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory scrollbar-hide -mr-4 lg:-mr-0 pr-4 lg:pr-0"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {highlightCards.map((card, index) => (
              <div 
                key={index}
                className="min-w-[300px] w-[300px] md:min-w-[340px] md:w-[340px] snap-start bg-white rounded-3xl overflow-hidden shadow-xl cursor-pointer group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 h-full flex flex-col"
              >
                <div className="h-32 bg-gradient-to-br from-[#2563eb] to-[#1e40af] flex items-center justify-center shrink-0">
                  <span className="text-5xl">{card.icon}</span>
                </div>
                <div className="p-6 flex flex-col flex-grow">
                  <h4 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">
                    {card.title}
                  </h4>
                  <p className="text-slate-600 text-sm leading-relaxed flex-grow">
                    {card.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
