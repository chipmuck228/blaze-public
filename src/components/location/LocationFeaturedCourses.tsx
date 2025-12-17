'use client'

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowRight, BookOpen, Users, Clock } from "lucide-react"
import Link from "next/link"

interface FeaturedCourse {
  id: string
  title: string
  type?: 'RoboQuest' | 'LaunchPad' | 'RoboChamps'
  gradeLevel: string
  description?: string
  slug?: string
}

interface LocationFeaturedCoursesProps {
  franchiseCode: string
  locationName: string
}

export function LocationFeaturedCourses({ franchiseCode, locationName }: LocationFeaturedCoursesProps) {
  const [courses, setCourses] = useState<FeaturedCourse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch(`/api/courses/featured?franchise=${encodeURIComponent(franchiseCode)}`)
        if (!response.ok) {
          throw new Error("Failed to load featured courses")
        }
        const data = await response.json()
        setCourses(data || [])
      } catch (err: any) {
        console.error("Error fetching featured courses:", err)
        setError(err.message || "Failed to load featured courses")
      } finally {
        setIsLoading(false)
      }
    }

    fetchCourses()
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
      ) : courses.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground">
          No featured programs are currently available for this campus. Please check back later or view the full course catalog.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Card key={course.id} className="flex flex-col h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <CardTitle className="text-base line-clamp-2">
                    {course.title}
                  </CardTitle>
                  {course.type && (
                    <Badge variant="outline" className="text-[11px] uppercase tracking-wide">
                      {course.type}
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs flex items-center gap-2">
                  <Users className="h-3 w-3" />
                  <span>Grades: {course.gradeLevel || "All"}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 justify-between pt-0">
                <p className="text-xs text-muted-foreground line-clamp-3 mb-4">
                  {course.description || "Hands-on robotics and coding experiences tailored to this campus."}
                </p>
                <div className="flex items-center justify-between mt-auto pt-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Ongoing sessions</span>
                  </div>
                  {course.slug ? (
                    <Button asChild variant="ghost" size="sm" className="text-xs px-2">
                      <Link href={`/course-catalog/${encodeURIComponent(course.slug)}`}>
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          <span>View Details</span>
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild variant="ghost" size="sm" className="text-xs px-2">
                      <Link href={`/course-catalog?id=${encodeURIComponent(course.id)}`}>
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          <span>View Details</span>
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}


