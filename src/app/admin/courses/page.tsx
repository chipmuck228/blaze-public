'use client'

import { useState, useEffect } from "react"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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

  useEffect(() => {
    fetchCourses()
  }, [])

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

  const fetchCourses = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch("/api/admin/courses")
      
      if (!response.ok) {
        throw new Error("Failed to fetch courses")
      }

      const data = await response.json()
      setCourses(data)
      setFilteredCourses(data)
    } catch (err: any) {
      console.error("Error fetching courses:", err)
      setError(err.message || "Failed to load courses")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (courseId: string) => {
    // 检查课程状态：只有 draft 状态的课程可以删除
    const course = courses.find(c => c.id === courseId)
    if (course && course.status !== 'draft') {
      alert(`Cannot delete course with status '${course.status}'. Only draft courses can be deleted. Please archive the course instead.`)
      return
    }

    if (!confirm("Are you sure you want to delete this course? This action cannot be undone.")) {
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
        alert(data.error || "Failed to delete course")
      }
    } catch (error) {
      console.error("Error deleting course:", error)
      alert("Failed to delete course")
    }
  }

  const handleView = (course: Course) => {
    setViewingCourseId(course.id)
    setIsDetailDialogOpen(true)
  }

  const handleEdit = (course: Course) => {
    // 禁止编辑 archived 状态的课程
    if (course.status === 'archived') {
      alert('Cannot edit archived courses. Please view the course details instead.')
      return
    }
    setEditingCourse(course)
    setIsEditDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingCourse(null)
    setIsEditDialogOpen(true)
  }

  const handleCourseUpdated = () => {
    fetchCourses()
    setIsEditDialogOpen(false)
    setEditingCourse(null)
  }

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

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Courses Admin</h1>
        <p className="text-muted-foreground mt-2">
          Manage all courses in the system
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Courses</CardTitle>
              <CardDescription>
                A list of all courses in the system
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add Course
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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course Name</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Sessions</TableHead>
                    <TableHead>Age Range</TableHead>
                    <TableHead>Grades</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCourses.map((course) => {
                    const gradesText = course.target_grades && course.target_grades.length > 0
                      ? `Grades: ${course.target_grades.join(', ')}`
                      : ''
                    const slugText = course.slug ? `Slug: ${course.slug}` : ''
                    const statusText = course.status && course.status !== 'published'
                      ? `[${course.status}]`
                      : ''
                    
                    return (
                      <TableRow 
                        key={course.id}
                        className={getStatusBackgroundColor(course.status)}
                      >
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => handleView(course)}
                              className="text-left font-medium hover:text-primary transition-colors cursor-pointer"
                            >
                              {course.name}
                            </button>
                            {(gradesText || slugText || statusText) && (
                              <span className="text-xs text-muted-foreground">
                                {[gradesText, slugText, statusText].filter(Boolean).join(' • ')}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                          <div className="flex flex-wrap gap-1">
                            {course.tags && course.tags.length > 0 ? (
                              course.tags.map((tag) => (
                                <Badge key={tag.id} variant="outline" className="text-xs">
                                  {tag.display_name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground">No tags</span>
                            )}
                          </div>
                        </TableCell>
                      <TableCell>{course.number_of_sessions || "N/A"}</TableCell>
                      <TableCell>
                        {course.target_age_min && course.target_age_max
                          ? `${course.target_age_min}-${course.target_age_max}`
                          : course.target_age_min
                          ? `${course.target_age_min}+`
                          : "N/A"}
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell>
                        {course.base_price
                          ? `${course.currency || "USD"} $${course.base_price.toFixed(2)}`
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            course.status === 'published' ? 'default' :
                            course.status === 'draft' ? 'secondary' :
                            course.status === 'suspended' ? 'destructive' :
                            'outline'
                          }
                        >
                          {course.status === 'published' ? 'Published' :
                           course.status === 'draft' ? 'Draft' :
                           course.status === 'suspended' ? 'Suspended' :
                           'Archived'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(course.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(course)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleEdit(course)}
                              disabled={course.status === 'archived'}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit {course.status === 'archived' && '(Archived courses cannot be edited)'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(course.id)}
                              disabled={course.status !== 'draft'}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete {course.status !== 'draft' && '(Draft only)'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
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

