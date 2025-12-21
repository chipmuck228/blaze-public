'use client'

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowRight, BookOpen, Users, Calendar } from "lucide-react"
import Link from "next/link"

interface Program {
  id: string
  name: string
  display_name: string
  description?: string
  start_date?: string
  end_date?: string
  category?: {
    id: string
    name: string
    display_name: string
  }
  courses: Array<{
    id: string
    title: string
    gradeLevel: string
    slug?: string
  }>
}

interface LocationFeaturedCoursesProps {
  franchiseCode: string
  locationName: string
}

export function LocationFeaturedCourses({ franchiseCode, locationName }: LocationFeaturedCoursesProps) {
  const [programs, setPrograms] = useState<Program[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch(`/api/programs?franchise=${encodeURIComponent(franchiseCode)}`)
        if (!response.ok) {
          throw new Error("Failed to load programs")
        }
        const data = await response.json()
        setPrograms(data || [])
      } catch (err: any) {
        console.error("Error fetching programs:", err)
        setError(err.message || "Failed to load programs")
      } finally {
        setIsLoading(false)
      }
    }

    fetchPrograms()
  }, [franchiseCode])

  return (
    <section className="mt-16">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">
            Featured Programs at {locationName}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            A snapshot of popular robotics programs currently offered at this campus.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center py-10 text-sm text-destructive">
          {error}
        </div>
      ) : programs.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground">
          No programs are currently available for this campus. Please check back later or view the full course catalog.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => {
            // 格式化日期范围
            const formatDateRange = () => {
              if (!program.start_date && !program.end_date) return null
              const start = program.start_date ? new Date(program.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null
              const end = program.end_date ? new Date(program.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null
              if (start && end) return `${start} - ${end}`
              if (start) return `Starts ${start}`
              if (end) return `Ends ${end}`
              return null
            }

            const dateRange = formatDateRange()
            const courseCount = program.courses?.length || 0

            return (
              <Card key={program.id} className="flex flex-col h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <CardTitle className="text-base line-clamp-2 flex-1">
                      {program.display_name || program.name}
                    </CardTitle>
                    {program.category && (
                      <Badge variant="outline" className="text-[11px] uppercase tracking-wide shrink-0">
                        {program.category.display_name || program.category.name}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs space-y-1">
                    {dateRange && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        <span>{dateRange}</span>
                      </div>
                    )}
                    {courseCount > 0 && (
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-3 w-3" />
                        <span>{courseCount} {courseCount === 1 ? 'course' : 'courses'}</span>
                      </div>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col flex-1 justify-between pt-0">
                  <p className="text-xs text-muted-foreground line-clamp-3 mb-4">
                    {program.description || `Explore ${program.display_name || program.name} with hands-on robotics and coding experiences.`}
                  </p>
                  <div className="flex items-center justify-between mt-auto pt-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>Available now</span>
                    </div>
                    <Button asChild variant="ghost" size="sm" className="text-xs px-2">
                      <Link href={`/course-catalog?franchise=${encodeURIComponent(franchiseCode)}`}>
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          <span>View Activities</span>
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </section>
  )
}


