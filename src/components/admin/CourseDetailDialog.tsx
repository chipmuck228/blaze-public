'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, BookOpen, Users, Target, Clock, DollarSign, Tag } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface CourseDetail {
  id: string
  name: string
  slug?: string
  description?: string
  target_audience?: string
  learning_outcomes?: string
  prerequisites?: string
  cancellation_policy?: string
  number_of_sessions?: number
  session_count?: number
  duration_hours?: number
  target_age_min?: number
  target_age_max?: number
  target_grades?: string[]
  base_price?: number
  currency?: string
  status: 'draft' | 'published' | 'suspended' | 'archived'
  tags?: Array<{ id: string; name: string; display_name: string }>
  assignments?: Array<{
    id: string
    category?: { display_name: string }
    series?: { display_name: string }
    location?: { name: string }
  }>
  created_at: string
  updated_at: string
}

interface CourseDetailDialogProps {
  courseId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CourseDetailDialog({
  courseId,
  open,
  onOpenChange,
}: CourseDetailDialogProps) {
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && courseId) {
      fetchCourseDetails()
    } else {
      setCourse(null)
      setError(null)
    }
  }, [open, courseId])

  const fetchCourseDetails = async () => {
    if (!courseId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/courses/${courseId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch course details")
      }
      const data = await response.json()
      setCourse(data)
    } catch (err: any) {
      console.error("Error fetching course details:", err)
      setError(err.message || "Failed to load course details")
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: CourseDetail['status']) => {
    const variants = {
      draft: 'secondary' as const,
      published: 'default' as const,
      suspended: 'destructive' as const,
      archived: 'outline' as const,
    }
    const labels = {
      draft: 'Draft',
      published: 'Published',
      suspended: 'Suspended',
      archived: 'Archived',
    }
    return (
      <Badge variant={variants[status]}>
        {labels[status]}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Course Details</DialogTitle>
          <DialogDescription>
            View detailed information about this course
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-destructive">{error}</p>
              <Button onClick={fetchCourseDetails} className="mt-4" variant="outline">
                Retry
              </Button>
            </div>
          ) : course ? (
            <div className="space-y-6 py-4">
              {/* Header Section */}
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold">{course.name}</h2>
                    {course.slug && (
                      <p className="text-sm text-muted-foreground mt-1">Slug: {course.slug}</p>
                    )}
                  </div>
                  {getStatusBadge(course.status)}
                </div>
                {course.tags && course.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {course.tags.map((tag) => (
                      <Badge key={tag.id} variant="outline">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag.display_name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Duration</span>
                  </div>
                  <p className="font-medium">
                    {course.duration_hours ? `${course.duration_hours} hours` : course.number_of_sessions ? `${course.number_of_sessions} sessions` : 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Age Range</span>
                  </div>
                  <p className="font-medium">
                    {course.target_age_min && course.target_age_max
                      ? `${course.target_age_min}-${course.target_age_max} years`
                      : course.target_age_min
                      ? `${course.target_age_min}+ years`
                      : 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Target className="h-4 w-4" />
                    <span>Target Grades</span>
                  </div>
                  <p className="font-medium">
                    {course.target_grades && course.target_grades.length > 0
                      ? course.target_grades.join(', ')
                      : 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span>Price</span>
                  </div>
                  <p className="font-medium">
                    {course.base_price
                      ? `${course.currency || 'USD'} $${course.base_price.toFixed(2)}`
                      : 'N/A'}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Description */}
              {course.description && (
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Description
                  </h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{course.description}</p>
                </div>
              )}

              {/* Target Audience */}
              {course.target_audience && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Target Audience</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{course.target_audience}</p>
                </div>
              )}

              {/* Learning Outcomes */}
              {course.learning_outcomes && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Learning Outcomes</h3>
                  <div className="text-sm text-muted-foreground">
                    {course.learning_outcomes.split('\n').filter(line => line.trim()).map((outcome, idx) => (
                      <div key={idx} className="flex items-start gap-2 py-1">
                        <span className="text-primary mt-1">•</span>
                        <span>{outcome.trim()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Prerequisites */}
              {course.prerequisites && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Prerequisites</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{course.prerequisites}</p>
                </div>
              )}

              {/* Cancellation Policy */}
              {course.cancellation_policy && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Cancellation Policy</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{course.cancellation_policy}</p>
                </div>
              )}

              {/* Assignments */}
              {course.assignments && course.assignments.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Assignments ({course.assignments.length})</h3>
                  <div className="space-y-2">
                    {course.assignments.map((assignment) => (
                      <div key={assignment.id} className="p-3 border rounded-md text-sm">
                        <div className="flex flex-wrap gap-2">
                          {assignment.category && (
                            <Badge variant="outline">{assignment.category.display_name}</Badge>
                          )}
                          {assignment.series && (
                            <Badge variant="outline">{assignment.series.display_name}</Badge>
                          )}
                          {assignment.location && (
                            <Badge variant="outline">{assignment.location.name}</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Created:</span>
                  <p className="font-medium">{formatDate(course.created_at)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Last Updated:</span>
                  <p className="font-medium">{formatDate(course.updated_at)}</p>
                </div>
              </div>
            </div>
          ) : null}
        </ScrollArea>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

