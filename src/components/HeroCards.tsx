'use client'
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface FeaturedProgram {
  id: string
  name: string
  display_name: string
  description?: string | null
  poster_url?: string | null
  franchise: {
    id: string
    code: string
    name: string
  } | null
}

export const HeroCards = () => {
  const [featuredPrograms, setFeaturedPrograms] = useState<FeaturedProgram[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchFeaturedPrograms = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch('/api/public/featured-programs')

        if (!response.ok) {
          throw new Error('Failed to fetch featured programs')
        }

        const data = await response.json()
        setFeaturedPrograms(data.programs || [])
      } catch (err) {
        console.error('Error fetching featured programs:', err)
        setError(err instanceof Error ? err.message : 'Failed to load featured programs')
      } finally {
        setIsLoading(false)
      }
    }

    fetchFeaturedPrograms()
  }, [])

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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12 w-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    console.error('HeroCards error:', error)
    return null
  }

  if (featuredPrograms.length === 0) {
    return null
  }

  return (
    <div className="relative z-10 w-full lg:w-1/2 flex flex-col justify-center bg-slate-900/30 backdrop-blur-sm border-l border-white/5">
      <div className="p-8 lg:p-12 w-full">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h3 className="text-white text-2xl font-bold">Featured Programs</h3>
            <p className="text-slate-400 text-sm">Explore featured programs by location</p>
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

        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory scrollbar-hide -mr-4 lg:-mr-0 pr-4 lg:pr-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {featuredPrograms.map((program, index) => {
            const exploreHref = program.franchise
              ? `/programs?location=${encodeURIComponent(program.franchise.code)}`
              : '/programs'

            return (
              <div
                key={program.id}
                className="min-w-[300px] w-[300px] md:min-w-[340px] md:w-[340px] snap-start bg-white rounded-3xl overflow-hidden shadow-xl group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 h-full flex flex-col"
              >
                <div className="h-48 relative overflow-hidden shrink-0">
                  {program.poster_url ? (
                    <>
                      <Image
                        src={program.poster_url}
                        alt={program.display_name}
                        fill
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        priority={index < 2}
                        sizes="(max-width: 768px) 300px, 340px"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1e3a5f] to-[#2d4a6f]">
                      <span className="text-white/80 text-4xl font-bold">
                        {program.display_name.charAt(0)}
                      </span>
                    </div>
                  )}

                  {program.franchise && (
                    <div className="absolute top-4 left-4">
                      <span className="bg-white/90 backdrop-blur text-slate-900 px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-white/20">
                        {program.franchise.name}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-6 flex flex-col flex-grow">
                  <h4 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {program.display_name}
                  </h4>
                  {program.description && (
                    <p className="text-slate-500 text-sm mb-4 line-clamp-2">{program.description}</p>
                  )}

                  <div className="mt-auto pt-4 border-t border-slate-100">
                    <Button
                      asChild
                      className="w-full sm:w-auto bg-[#1e3a5f] hover:bg-[#2d4a6f] text-white rounded-lg gap-1"
                    >
                      <Link href={exploreHref}>
                        Explore <ArrowRight className="w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
