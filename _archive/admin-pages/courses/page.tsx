'use client'

import { useState, useEffect, useCallback, useMemo } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Search, MoreVertical, Edit, Trash2, Plus, Loader2, RefreshCcw, Eye } from "lucide-react"
import { CourseEditDialog } from "@/components/admin/CourseEditDialog"
import { CourseDetailDialog } from "@/components/admin/CourseDetailDialog"

interface Course {
  id: string
  name: string
  slug?: string
  description?: string
  target_audience?: string
  outcomes?: string
  prerequisites?: string
  cancellation_policy?: string
  number_of_sessions?: number
  target_age_min?: number
  target_age_max?: number
  target_grades?: string[]
  base_price?: number
  currency?: string
  poster_url?: string | null
  status: 'draft' | 'published' | 'suspended' | 'archived'
  created_at: string
  updated_at: string
  tags?: Array<{ id: string; name: string; display_name: string }>
}

export default function CoursesManagementPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [viewingCourseId, setViewingCourseId] = useState<string | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCourses = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch("/api/admin/courses")
      
      if (!response.ok) {
        throw new Error("Failed to fetch offerings")
      }

      const data = await response.json()
      setCourses(data)
      setFilteredCourses(data)
    } catch (err: any) {
      console.error("Error fetching courses:", err)
      setError(err.message || "Failed to load offerings")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  useEffect(() => {
    if (searchQuery) {
      const filtered = courses.filter(
        (course) =>
          course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          course.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          course.slug?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredCourses(filtered)
    } else {
      setFilteredCourses(courses)
    }
  }, [searchQuery, courses])

  const handleDelete = async (courseId: string) => {
    // 检查课程状态：只有 draft 状态的课程可以删除
    const course = courses.find(c => c.id === courseId)
    if (course && course.status !== 'draft') {
      alert(`Cannot delete offering with status '${course.status}'. Only draft offerings can be deleted. Please archive the offering instead.`)
      return
    }

    if (!confirm("Are you sure you want to delete this offering? This action cannot be undone.")) {
      return
    }

    try {
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchCourses() // Refresh the list
      } else {
        const data = await response.json()
        alert(data.error || "Failed to delete offering")
      }
    } catch (error) {
      console.error("Error deleting offering:", error)
      alert("Failed to delete offering")
    }
  }

  const handleView = (course: Course) => {
    setViewingCourseId(course.id)
    setIsDetailDialogOpen(true)
  }

  const handleEdit = (course: Course) => {
    // 禁止编辑 archived 状态的课程
    if (course.status === 'archived') {
      alert('Cannot edit archived offerings. Please view the offering details instead.')
      return
    }
    setEditingCourse(course)
    setIsEditDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingCourse(null)
    setIsEditDialogOpen(true)
  }

  const handleCourseUpdated = useCallback(() => {
    fetchCourses()
    setIsEditDialogOpen(false)
    setEditingCourse(null)
  }, [fetchCourses])

  const getCourseTags = (course: Course): string => {
    if (course.tags && course.tags.length > 0) {
      return course.tags.map(t => t.display_name).join(", ")
    }
    return "No tags"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusBackgroundColor = (status: Course['status']): string => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 dark:bg-gray-800' // 灰色
      case 'published':
        return 'bg-green-50 dark:bg-green-900/20' // 浅绿色
      case 'suspended':
        return 'bg-orange-50 dark:bg-orange-900/20' // 橘色
      case 'archived':
        return 'bg-purple-50 dark:bg-purple-900/20' // 紫色
      default:
        return 'bg-gray-50 dark:bg-gray-900'
    }
  }

  const getStatusLabel = (status: Course['status']): string => {
    switch (status) {
      case 'draft':
        return 'Draft'
      case 'published':
        return 'Published'
      case 'suspended':
        return 'Suspended'
      case 'archived':
        return 'Archived'
      default:
        return status
    }
  }

  // 按 status 分组 courses
  const groupedCourses = useMemo(() => {
    const groups: Record<string, Course[]> = {}
    filteredCourses.forEach((course) => {
      const status = course.status
      if (!groups[status]) {
        groups[status] = []
      }
      groups[status].push(course)
    })
    // 按状态顺序排序：published, draft, suspended, archived
    const statusOrder = ['published', 'draft', 'suspended', 'archived']
    const sortedGroups: Record<string, Course[]> = {}
    statusOrder.forEach(status => {
      if (groups[status]) {
        sortedGroups[status] = groups[status]
      }
    })
    // 添加其他状态（如果有）
    Object.keys(groups).forEach(status => {
      if (!statusOrder.includes(status)) {
        sortedGroups[status] = groups[status]
      }
    })
    return sortedGroups
  }, [filteredCourses])

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Offerings Admin</h1>
        <p className="text-muted-foreground mt-2">
          Manage all offerings in the system
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search offerings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add Offering
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-12 space-y-4">
              <p className="text-destructive text-lg">{error}</p>
              <Button onClick={fetchCourses}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? "No courses found matching your search." : "No courses found."}
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedCourses).map(([status, statusCourses]) => {
                const statusLabel = getStatusLabel(status as Course['status'])
                return (
                  <Card key={status} className={getStatusBackgroundColor(status as Course['status'])}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-semibold">
                          {statusLabel}
                        </CardTitle>
                        <Badge variant="secondary" className="text-sm">
                          {statusCourses.length} Offering{statusCourses.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Accordion type="multiple" className="w-full">
                        {statusCourses.map((course) => {
                          const gradesText = course.target_grades && course.target_grades.length > 0
                            ? `Grades: ${course.target_grades.join(', ')}`
                            : ''
                          const slugText = course.slug ? `Slug: ${course.slug}` : ''
                          
                          return (
                            <AccordionItem key={course.id} value={course.id} className="border rounded-lg px-4 mb-2">
                              <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center justify-between w-full pr-4">
                                  <div className="flex flex-col items-start text-left">
                                    <div className="flex items-center gap-3">
                                      <span className="font-medium">{course.name}</span>
                                      <Badge
                                        variant={
                                          course.status === 'published' ? 'default' :
                                          course.status === 'draft' ? 'secondary' :
                                          course.status === 'suspended' ? 'destructive' :
                                          'outline'
                                        }
                                        className="text-xs"
                                      >
                                        {statusLabel}
                                      </Badge>
                                    </div>
                                    {(gradesText || slugText) && (
                                      <span className="text-xs text-muted-foreground mt-1">
                                        {[gradesText, slugText].filter(Boolean).join(' • ')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-4 pt-2 pb-4">
                                  {/* Basic Information */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
                                      <p className="text-sm">{course.description || "No description"}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground mb-2">Poster</p>
                                      {course.poster_url ? (
                                        <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                                          <Image
                                            src={course.poster_url}
                                            alt={course.name || 'Course poster'}
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 768px) 100vw, 50vw"
                                          />
                                        </div>
                                      ) : (
                                        <p className="text-sm text-muted-foreground">No poster available</p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Tags */}
                                  {course.tags && course.tags.length > 0 && (
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground mb-2">Tags</p>
                                      <div className="flex flex-wrap gap-2">
                                        {course.tags.map((tag) => (
                                          <Badge key={tag.id} variant="outline" className="text-xs">
                                            {tag.display_name}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Course Details */}
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground mb-1">Sessions</p>
                                      <p className="text-sm">{course.number_of_sessions || "N/A"}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground mb-1">Age Range</p>
                                      <p className="text-sm">
                                        {course.target_age_min && course.target_age_max
                                          ? `${course.target_age_min}-${course.target_age_max}`
                                          : course.target_age_min
                                          ? `${course.target_age_min}+`
                                          : "N/A"}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground mb-1">Grades</p>
                                      <p className="text-sm">
                                        {course.target_grades && course.target_grades.length > 0 ? (
                                          <div className="flex flex-wrap gap-1">
                                            {course.target_grades.map((grade, idx) => (
                                              <Badge key={idx} variant="outline" className="text-xs">
                                                {grade}
                                              </Badge>
                                            ))}
                                          </div>
                                        ) : (
                                          "N/A"
                                        )}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground mb-1">Price</p>
                                      <p className="text-sm">
                                        {course.base_price
                                          ? `${course.currency || "USD"} $${course.base_price.toFixed(2)}`
                                          : "N/A"}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Additional Information */}
                                  {(course.target_audience || course.outcomes || course.prerequisites) && (
                                    <div className="space-y-2">
                                      {course.target_audience && (
                                        <div>
                                          <p className="text-sm font-medium text-muted-foreground mb-1">Target Audience</p>
                                          <p className="text-sm">{course.target_audience}</p>
                                        </div>
                                      )}
                                      {course.outcomes && (
                                        <div>
                                          <p className="text-sm font-medium text-muted-foreground mb-1">Learning Outcomes</p>
                                          <p className="text-sm whitespace-pre-wrap">{course.outcomes}</p>
                                        </div>
                                      )}
                                      {course.prerequisites && (
                                        <div>
                                          <p className="text-sm font-medium text-muted-foreground mb-1">Prerequisites</p>
                                          <p className="text-sm whitespace-pre-wrap">{course.prerequisites}</p>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Created Date */}
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-1">Created</p>
                                    <p className="text-sm">{formatDate(course.created_at)}</p>
                                  </div>

                                  {/* Actions */}
                                  <div className="flex items-center gap-2 pt-2 border-t">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleView(course)}
                                    >
                                      <Eye className="mr-2 h-4 w-4" />
                                      View Details
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEdit(course)}
                                      disabled={course.status === 'archived'}
                                    >
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-destructive hover:text-destructive"
                                      onClick={() => handleDelete(course.id)}
                                      disabled={course.status !== 'draft'}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </Button>
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          )
                        })}
                      </Accordion>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <CourseEditDialog
        course={editingCourse}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onCourseUpdated={handleCourseUpdated}
      />

      <CourseDetailDialog
        courseId={viewingCourseId}
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
      />
    </div>
  )
}

