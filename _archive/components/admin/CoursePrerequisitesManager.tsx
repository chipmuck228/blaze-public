'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { X, Plus, Loader2 } from "lucide-react"
import { CoursePrerequisite } from "@/lib/db"

interface Course {
  id: string
  name: string
  slug?: string
  status?: 'draft' | 'published' | 'suspended' | 'archived'
}

interface CoursePrerequisitesManagerProps {
  courseId: string | null
  disabled?: boolean
}

export function CoursePrerequisitesManager({
  courseId,
  disabled = false,
}: CoursePrerequisitesManagerProps) {
  const [prerequisites, setPrerequisites] = useState<CoursePrerequisite[]>([])
  const [availableCourses, setAvailableCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>("")
  const [requirementType, setRequirementType] = useState<'required' | 'recommended' | 'optional'>('required')
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)

  // 获取先修课程列表
  const fetchPrerequisites = async () => {
    if (!courseId) {
      setPrerequisites([])
      return
    }

    setIsFetching(true)
    try {
      const response = await fetch(`/api/admin/courses/${courseId}/prerequisites`)
      if (response.ok) {
        const data = await response.json()
        setPrerequisites(data.prerequisites || [])
      } else {
        console.error('Failed to fetch prerequisites')
      }
    } catch (error) {
      console.error('Error fetching prerequisites:', error)
    } finally {
      setIsFetching(false)
    }
  }

  // 获取可用课程列表（排除当前课程和已添加的先修课程）
  const fetchAvailableCourses = async () => {
    try {
      const response = await fetch('/api/admin/courses')
      if (response.ok) {
        const data = await response.json()
        // 过滤掉当前课程和已添加的先修课程
        const prerequisiteCourseIds = new Set(prerequisites.map(p => p.prerequisite_course_id))
        const filtered = data.filter(
          (c: Course) => c.id !== courseId && !prerequisiteCourseIds.has(c.id) && c.status === 'published'
        )
        setAvailableCourses(filtered)
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
    }
  }

  useEffect(() => {
    if (courseId) {
      fetchPrerequisites()
    }
  }, [courseId])

  useEffect(() => {
    fetchAvailableCourses()
  }, [prerequisites, courseId])

  // 添加先修课程
  const handleAddPrerequisite = async () => {
    if (!courseId || !selectedCourseId) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/courses/${courseId}/prerequisites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prerequisite_course_id: selectedCourseId,
          requirement_type: requirementType,
          is_mandatory: true, // Phase 1: 所有都是 mandatory
        }),
      })

      if (response.ok) {
        await fetchPrerequisites()
        setSelectedCourseId("")
        setRequirementType('required')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to add prerequisite')
      }
    } catch (error: any) {
      console.error('Error adding prerequisite:', error)
      alert(error.message || 'Failed to add prerequisite')
    } finally {
      setIsLoading(false)
    }
  }

  // 删除先修课程
  const handleDeletePrerequisite = async (prerequisiteId: string) => {
    if (!courseId) return

    if (!confirm('Are you sure you want to remove this prerequisite?')) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/admin/courses/${courseId}/prerequisites/${prerequisiteId}`,
        {
          method: 'DELETE',
        }
      )

      if (response.ok) {
        await fetchPrerequisites()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete prerequisite')
      }
    } catch (error: any) {
      console.error('Error deleting prerequisite:', error)
      alert(error.message || 'Failed to delete prerequisite')
    } finally {
      setIsLoading(false)
    }
  }

  // 更新先修课程类型
  const handleUpdateRequirementType = async (
    prerequisiteId: string,
    newType: 'required' | 'recommended' | 'optional'
  ) => {
    if (!courseId) return

    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/admin/courses/${courseId}/prerequisites/${prerequisiteId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requirement_type: newType,
          }),
        }
      )

      if (response.ok) {
        await fetchPrerequisites()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update prerequisite')
      }
    } catch (error: any) {
      console.error('Error updating prerequisite:', error)
      alert(error.message || 'Failed to update prerequisite')
    } finally {
      setIsLoading(false)
    }
  }

  const getRequirementTypeBadge = (type: string) => {
    const variants = {
      required: 'default',
      recommended: 'secondary',
      optional: 'outline',
    } as const

    const labels = {
      required: 'Required',
      recommended: 'Recommended',
      optional: 'Optional',
    }

    return (
      <Badge variant={variants[type as keyof typeof variants] || 'outline'}>
        {labels[type as keyof typeof labels] || type}
      </Badge>
    )
  }

  if (!courseId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Please save the course first before adding prerequisites.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Prerequisites</Label>
        <p className="text-xs text-muted-foreground">
          Define courses that must be completed before students can enroll in this course.
        </p>
      </div>

      {/* Add Prerequisite Form */}
      {!disabled && (
        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="prerequisite-course">Select Course</Label>
            <Select
              value={selectedCourseId}
              onValueChange={setSelectedCourseId}
              disabled={isLoading || disabled}
            >
              <SelectTrigger id="prerequisite-course">
                <SelectValue placeholder="Select a prerequisite course" />
              </SelectTrigger>
              <SelectContent>
                {availableCourses.length === 0 ? (
                  <SelectItem value="__no_courses__" disabled>
                    No available courses
                  </SelectItem>
                ) : (
                  availableCourses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                      {course.slug && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({course.slug})
                        </span>
                      )}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="w-40 space-y-2">
            <Label htmlFor="requirement-type">Type</Label>
            <Select
              value={requirementType}
              onValueChange={(value) => setRequirementType(value as typeof requirementType)}
              disabled={isLoading || disabled}
            >
              <SelectTrigger id="requirement-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="required">Required</SelectItem>
                <SelectItem value="recommended">Recommended</SelectItem>
                <SelectItem value="optional">Optional</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            onClick={handleAddPrerequisite}
            disabled={!selectedCourseId || isLoading || disabled}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add
          </Button>
        </div>
      )}

      {/* Prerequisites List */}
      <div className="space-y-2">
        {isFetching ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : prerequisites.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
            <p>No prerequisites defined.</p>
            <p className="text-xs mt-1">Students can enroll in this course without completing other courses first.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {prerequisites.map((prerequisite) => (
              <div
                key={prerequisite.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-card"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {prerequisite.prerequisite_course?.name || 'Unknown Course'}
                    </span>
                    {getRequirementTypeBadge(prerequisite.requirement_type)}
                  </div>
                  {prerequisite.prerequisite_course?.slug && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {prerequisite.prerequisite_course.slug}
                    </p>
                  )}
                </div>
                {!disabled && (
                  <div className="flex items-center gap-2">
                    <Select
                      value={prerequisite.requirement_type}
                      onValueChange={(value) =>
                        handleUpdateRequirementType(prerequisite.id, value as typeof requirementType)
                      }
                      disabled={isLoading}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="required">Required</SelectItem>
                        <SelectItem value="recommended">Recommended</SelectItem>
                        <SelectItem value="optional">Optional</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeletePrerequisite(prerequisite.id)}
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

