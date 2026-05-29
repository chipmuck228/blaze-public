'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface Franchise {
  id: string
  code: string
  name: string | null
  location_count: number
}

export function LocationSelectionMobile() {
  const router = useRouter()
  const [franchises, setFranchises] = useState<Franchise[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchFranchises = async () => {
      try {
        const response = await fetch('/api/public/franchises')
        if (response.ok) {
          const data = await response.json()
          setFranchises(data.franchises || [])
        }
      } catch (error) {
        console.error('Error fetching franchises:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFranchises()
  }, [])

  if (isLoading) {
    return (
      <section className="px-4 py-6">
        <h2 className="text-xl font-semibold mb-4">Choose Your Campus</h2>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </section>
    )
  }

  if (franchises.length === 0) {
    return null
  }

  return (
    <section id="locations" className="px-4 py-6 scroll-mt-24">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Choose Your Campus</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Select a campus near you
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {franchises.map((franchise) => (
          <Card
            key={franchise.id}
            className="cursor-pointer hover:shadow-md transition-shadow active:scale-95"
            onClick={() => router.push(`/locations/${franchise.code}`)}
          >
            <CardContent className="p-4 flex flex-col items-center text-center space-y-2">
              <div className="p-3 rounded-full bg-primary/10">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-sm">
                {franchise.name || `${franchise.code} Campus`}
              </h3>
              <p className="text-xs text-muted-foreground">
                {franchise.location_count} location{franchise.location_count !== 1 ? 's' : ''}
              </p>
              <Button size="sm" variant="outline" className="w-full mt-2">
                View Programs
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}

