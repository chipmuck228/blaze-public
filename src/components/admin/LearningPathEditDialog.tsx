'use client'

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, X, GripVertical } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { LearningPathWithDetails, LearningPathCourse } from "@/lib/db"

type LearningPath = Partial<Pick<LearningPathWithDetails, 'id' | 'created_at' | 'updated_at'>> & 
  Omit<LearningPathWithDetails, 'id' | 'created_at' | 'updated_at' | 'courses'> & {
    courses?: LearningPathCourse[]
  }

interface Course {
  id: string
  name: string
  slug?: string
  status: 'draft' | 'published' | 'suspended' | 'archived'
}

interface CourseCategory {
  id: string
  name: string
  display_name: string
}

interface LearningPathEditDialogProps {
  path: LearningPath | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onPathUpdated: () => void
}

export function LearningPathEditDialog({
  path,
  open,
  onOpenChange,
  onPathUpdated,
}: LearningPathEditDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [categories, setCategories] = useState<CourseCategory[]>([])
  const [availableCourses, setAvailableCourses] = useState<Course[]>([])
  const [pathCourses, setPathCourses] = useState<Array<{
    course_id: string
    stage: number
    stage_name?: string | null
    is_required: boolean
    is_parallel: boolean
    display_order: number
    estimated_weeks?: number | null
    notes?: string | null
  }>>([])

  const [formData, setFormData] = useState<Omit<LearningPath, 'id' | 'courses' | 'created_at' | 'updated_at'>>({
    name: "",
    slug: "",
    description: "",
    category_id: null,
    target_audience: "",
    estimated_duration_weeks: undefined,
    difficulty_level: undefined,
    is_active: true,
    display_order: 0,
  })

  // 获取分类列表
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/categories")
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }, [])

  // 获取可用课程列表
  const fetchCourses = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/courses")
      if (response.ok) {
        const data = await response.json()
        // 只显示已发布的课程
        const published = data.filter((c: Course) => c.status === 'published')
        setAvailableCourses(published)
      }
    } catch (error) {
      console.error("Error fetching courses:", error)
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchCategories()
      fetchCourses()
    }
  }, [open, fetchCategories, fetchCourses])

  // 初始化表单数据
  useEffect(() => {
    if (path) {
      setFormData({
        name: path.name || "",
        slug: path.slug || "",
        description: path.description || "",
        category_id: path.category_id || null,
        target_audience: path.target_audience || "",
        estimated_duration_weeks: path.estimated_duration_weeks,
        difficulty_level: path.difficulty_level,
        is_active: path.is_active !== undefined ? path.is_active : true,
        display_order: path.display_order || 0,
      })
      setPathCourses(
        path.courses?.map(c => ({
          course_id: c.course_id,
          stage: c.stage,
          stage_name: c.stage_name || null,
          is_required: c.is_required,
          is_parallel: c.is_parallel,
          display_order: c.display_order,
          estimated_weeks: c.estimated_weeks || null,
          notes: c.notes || null,
        })) || []
      )
    } else {
      setFormData({
        name: "",
        slug: "",
        description: "",
        category_id: null,
        target_audience: "",
        estimated_duration_weeks: undefined,
        difficulty_level: undefined,
        is_active: true,
        display_order: 0,
      })
      setPathCourses([])
    }
  }, [path, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const url = path?.id
        ? `/api/admin/learning-paths/${path.id}`
        : "/api/admin/learning-paths"
      const method = path?.id ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          courses: pathCourses,
        }),
      })

      if (response.ok) {
        onPathUpdated()
      } else {
        const error = await response.json()
        alert(error.error || "Failed to save learning path")
      }
    } catch (error: any) {
      console.error("Error saving learning path:", error)
      alert(error.message || "Failed to save learning path")
    } finally {
      setIsLoading(false)
    }
  }

  const addCourseToPath = () => {
    const maxStage = pathCourses.length > 0
      ? Math.max(...pathCourses.map(c => c.stage))
      : 0

    setPathCourses([
      ...pathCourses,
      {
        course_id: "",
        stage: maxStage + 1,
        stage_name: null,
        is_required: true,
        is_parallel: false,
        display_order: pathCourses.length,
        estimated_weeks: null,
        notes: null,
      },
    ])
  }

  const removeCourseFromPath = (index: number) => {
    setPathCourses(pathCourses.filter((_, i) => i !== index))
  }

  const updatePathCourse = (index: number, updates: Partial<typeof pathCourses[0]>) => {
    const updated = [...pathCourses]
    updated[index] = { ...updated[index], ...updates }
    setPathCourses(updated)
  }

  const getCourseName = (courseId: string) => {
    const course = availableCourses.find(c => c.id === courseId)
    return course?.name || "Unknown Course"
  }

  // 按阶段分组课程
  const coursesByStage = pathCourses.reduce((acc, course, index) => {
    if (!acc[course.stage]) {
      acc[course.stage] = []
    }
    acc[course.stage].push({ ...course, index })
    return acc
  }, {} as Record<number, Array<typeof pathCourses[0] & { index: number }>>)

  const stages = Object.keys(coursesByStage).map(Number).sort((a, b) => a - b)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[700px] lg:max-w-[900px] xl:max-w-[1000px] max-h-[95vh] h-[95vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {path ? "Edit Learning Path" : "Add New Learning Path"}
          </DialogTitle>
          <DialogDescription>
            {path
              ? "Update learning path information and course sequence"
              : "Create a new learning path with a sequence of courses"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <Tabs defaultValue="basic" className="w-full flex flex-col flex-1 min-h-0">
            <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
              <TabsTrigger value="basic">Basic Information</TabsTrigger>
              <TabsTrigger value="courses">Courses</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto pr-1 mt-4">
            <TabsContent value="basic" className="space-y-4 mt-0">
              {/* Path Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Path Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., VEX GO Complete Path"
                  required
                />
              </div>

              {/* Slug */}
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug || ""}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="e.g., vex-go-complete-path"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the learning path..."
                  rows={3}
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category_id || "__none__"}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value === "__none__" ? null : value })}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.display_name || category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Difficulty Level */}
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty Level</Label>
                <Select
                  value={formData.difficulty_level || "__none__"}
                  onValueChange={(value) => setFormData({ ...formData, difficulty_level: value === "__none__" ? undefined : (value as typeof formData.difficulty_level) })}
                >
                  <SelectTrigger id="difficulty">
                    <SelectValue placeholder="Select difficulty level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Estimated Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration">Estimated Duration (weeks)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  value={formData.estimated_duration_weeks || ""}
                  onChange={(e) => setFormData({ ...formData, estimated_duration_weeks: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="e.g., 12"
                />
              </div>

              {/* Target Audience */}
              <div className="space-y-2">
                <Label htmlFor="audience">Target Audience</Label>
                <Input
                  id="audience"
                  value={formData.target_audience || ""}
                  onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                  placeholder="e.g., Students in grades K-6"
                />
              </div>

              {/* Active Status */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked === true })}
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  Active (visible to users)
                </Label>
              </div>
            </TabsContent>

            <TabsContent value="courses" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Path Courses</Label>
                  <Button type="button" onClick={addCourseToPath} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Course
                  </Button>
                </div>

                {stages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                    <p>No courses added yet.</p>
                    <p className="text-xs mt-1">Click "Add Course" to start building the learning path.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {stages.map((stage) => {
                      const stageCourses = coursesByStage[stage] || []
                      const stageName = stageCourses[0]?.stage_name || `Stage ${stage}`
                      return (
                        <div key={stage} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">Stage {stage}</h4>
                              <Input
                                placeholder="Stage name (e.g., Foundation)"
                                value={stageName}
                                onChange={(e) => {
                                  // 更新该阶段所有课程的 stage_name
                                  stageCourses.forEach(({ index }) => {
                                    updatePathCourse(index, { stage_name: e.target.value || null })
                                  })
                                }}
                                className="w-48 h-8 text-sm"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // 移除该阶段的所有课程
                                const indicesToRemove = stageCourses.map(({ index }) => index).sort((a, b) => b - a)
                                indicesToRemove.forEach(index => removeCourseFromPath(index))
                              }}
                            >
                              <X className="h-4 w-4" />
                              Remove Stage
                            </Button>
                          </div>
                          {coursesByStage[stage].map(({ index }) => {
                          const course = pathCourses[index]
                          return (
                            <div key={index} className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
                              <div className="flex-1 space-y-2">
                                <Select
                                  value={course.course_id || "__none__"}
                                  onValueChange={(value) => updatePathCourse(index, { course_id: value === "__none__" ? "" : value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a course" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">Select a course</SelectItem>
                                    {availableCourses
                                      .filter(c => !pathCourses.some((pc, i) => i !== index && pc.course_id === c.id))
                                      .map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                          {c.name}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                <div className="flex items-center gap-4 text-sm">
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={course.is_required}
                                      onCheckedChange={(checked) => updatePathCourse(index, { is_required: checked === true })}
                                    />
                                    <Label className="text-xs">Required</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={course.is_parallel}
                                      onCheckedChange={(checked) => updatePathCourse(index, { is_parallel: checked === true })}
                                    />
                                    <Label className="text-xs">Parallel</Label>
                                  </div>
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeCourseFromPath(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
            </div>
          </Tabs>
          <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.name} className="w-full sm:w-auto">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : path ? (
                "Update Path"
              ) : (
                "Create Path"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

