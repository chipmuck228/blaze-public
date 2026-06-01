'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import type { FeaturedSession } from '@/lib/featured-sessions'
import { FeaturedSessionCard } from '@/components/FeaturedSessionCard'

export function FeaturedCoursesMobile() {
  const router = useRouter()
  const [sessions, setSessions] = useState<FeaturedSession[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchFeaturedSessions = async () => {
      try {
        const response = await fetch('/api/public/featured-instances?limit=5')
        if (response.ok) {
          const data = await response.json()
          setSessions(data.instances || [])
        }
      } catch (error) {
        console.error('Error fetching featured sessions:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFeaturedSessions()
  }, [])

  if (isLoading) {
    return (
      <section className="px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Featured Sessions</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-[280px] h-[200px] bg-muted animate-pulse rounded-lg shrink-0"
            />
          ))}
        </div>
      </section>
    )
  }

  if (sessions.length === 0) {
    return null
  }

  return (
    <section className="px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Featured Sessions</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/programs')}
          className="text-primary"
        >
          View All
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
        {sessions.map((session, index) => (
          <FeaturedSessionCard
            key={session.id}
            session={session}
            index={index}
            priority={index < 2}
          />
        ))}
      </div>
    </section>
  )
}
