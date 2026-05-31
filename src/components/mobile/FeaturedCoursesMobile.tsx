'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, BookOpen, Calendar, MapPin } from 'lucide-react'
import Link from 'next/link'
import { LazyRemoteImage } from '@/components/ui/LazyRemoteImage'

interface FeaturedCourse {
  id: string
  name: string
  slug: string
  description?: string
  base_price?: number
  poster_url?: string
  category?: {
    name: string
    display_name?: string
  }
}

export function FeaturedCoursesMobile() {
  const router = useRouter()
  const [courses, setCourses] = useState<FeaturedCourse[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchFeaturedCourses = async () => {
      try {
        const response = await fetch('/api/courses/featured?limit=5')
        if (response.ok) {
          const data = await response.json()
          setCourses(data.courses || [])
        }
      } catch (error) {
        console.error('Error fetching featured courses:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFeaturedCourses()
  }, [])

  if (isLoading) {
    return (
      <section className="px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Featured Courses</h2>
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

  if (courses.length === 0) {
    return null
  }

  return (
    <section className="px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Featured Courses</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/course-catalog')}
          className="text-primary"
        >
          View All
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
        {courses.map((course) => (
          <Card
            key={course.id}
            className="w-[280px] shrink-0 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push(`/course-catalog/${course.slug}`)}
          >
            <div className="relative w-full h-32 bg-muted rounded-t-lg overflow-hidden">
              {course.poster_url ? (
                <LazyRemoteImage
                  src={course.poster_url}
                  alt={course.name}
                  containerClassName="absolute inset-0"
                  fallback={
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                      <BookOpen className="h-12 w-12 text-primary/40" aria-hidden />
                    </div>
                  }
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                  <BookOpen className="h-12 w-12 text-primary/40" aria-hidden />
                </div>
              )}
            </div>
            <CardContent className="p-4">
              <div className="space-y-2">
                {course.category && (
                  <Badge variant="secondary" className="text-xs">
                    {course.category.display_name || course.category.name}
                  </Badge>
                )}
                <h3 className="font-semibold text-sm line-clamp-2">
                  {course.name}
                </h3>
                {course.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {course.description}
                  </p>
                )}
                {course.base_price !== undefined && (
                  <p className="text-sm font-semibold text-primary">
                    ${course.base_price.toFixed(2)}
                  </p>
                )}
                <Button
                  size="sm"
                  className="w-full mt-2"
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/course-catalog/${course.slug}`)
                  }}
                >
                  Learn More
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}

