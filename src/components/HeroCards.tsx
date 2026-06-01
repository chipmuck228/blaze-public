'use client'
import { getErrorMessage } from "@/lib/typed-error"
import { useState, useEffect, useRef } from "react"
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import type { FeaturedSession } from "@/lib/featured-sessions"
import { FeaturedSessionCard } from "@/components/FeaturedSessionCard"

export const HeroCards = () => {
  const [featuredSessions, setFeaturedSessions] = useState<FeaturedSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchFeaturedSessions = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch('/api/public/featured-instances?limit=6')

        if (!response.ok) {
          throw new Error('Failed to fetch featured sessions')
        }

        const data = await response.json()
        setFeaturedSessions(data.instances || [])
      } catch (err) {
        console.error('Error fetching featured sessions:', err)
        setError(err instanceof Error ? getErrorMessage(err) : 'Failed to load featured sessions')
      } finally {
        setIsLoading(false)
      }
    }

    fetchFeaturedSessions()
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

  if (featuredSessions.length === 0) {
    return null
  }

  return (
    <div className="relative z-10 w-full lg:w-1/2 flex flex-col justify-center bg-slate-900/30 backdrop-blur-sm border-l border-white/5">
      <div className="p-8 lg:p-12 w-full">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h3 className="text-white text-2xl font-bold">Featured Sessions</h3>
            <p className="text-slate-400 text-sm">Explore featured sessions across all campuses</p>
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
          {featuredSessions.map((session, index) => (
            <FeaturedSessionCard key={session.id} session={session} index={index} />
          ))}
        </div>
      </div>
    </div>
  )
}
