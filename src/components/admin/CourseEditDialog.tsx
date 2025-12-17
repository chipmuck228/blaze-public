'use client'

import { useState, useEffect } from "react"
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
import { Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

interface Course {
  id?: string
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
  status?: 'draft' | 'published' | 'suspended' | 'archived'
  tags?: Array<{ id: string; name: string; display_name: string }>
}

interface CourseSubcategory {
  id: string
  name: string
  display_name: string
}

interface CourseEditDialogProps {
  course: Course | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCourseUpdated: () => void
}

export function CourseEditDialog({
  course,
  open,
  onOpenChange,
  onCourseUpdated,
}: CourseEditDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [subcategories, setSubcategories] = useState<CourseSubcategory[]>([])
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<string[]>([])
  const [targetGradesInput, setTargetGradesInput] = useState<string>("")
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [statusChangeCheck, setStatusChangeCheck] = useState<{
    showDialog: boolean
    newStatus: 'draft' | 'published' | 'suspended' | 'archived' | null
    warnings: string[]
    activeInstances: number
    activeEnrollments: number
  }>({
    showDialog: false,
    newStatus: null,
    warnings: [],
    activeInstances: 0,
    activeEnrollments: 0,
  })
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)

  // 检查是否是 archived 状态的课程（只读模式）
  const isArchived = course?.status === 'archived'

  const [formData, setFormData] = useState<Omit<Course, 'tags'>>({
    name: "",
    slug: "",
    description: "",
    target_audience: "",
    outcomes: "",
    prerequisites: "",
    cancellation_policy: "",
    number_of_sessions: undefined,
    target_age_min: undefined,
    target_age_max: undefined,
    target_grades: [],
    base_price: undefined,
    currency: "USD",
    status: "draft",
  })

  useEffect(() => {
    if (open) {
      fetchSubcategories()
      if (course) {
        setFormData({
          id: course.id,
          name: course.name,
          slug: course.slug || "",
          description: course.description || "",
          target_audience: course.target_audience || "",
          outcomes: course.outcomes || "",
          prerequisites: course.prerequisites || "",
          cancellation_policy: course.cancellation_policy || "",
          number_of_sessions: course.number_of_sessions,
          target_age_min: course.target_age_min,
          target_age_max: course.target_age_max,
          target_grades: course.target_grades || [],
          base_price: course.base_price,
          currency: course.currency || "USD",
          status: course.status || "draft",
        })
        setSelectedSubcategoryIds(course.tags?.map(t => t.id) || [])
        setTargetGradesInput(course.target_grades?.join("; ") || "")
        setSlugManuallyEdited(!!course.slug) // If course has slug, consider it manually edited
      } else {
        resetForm()
        setSlugManuallyEdited(false) // New course, allow auto-generation
      }
    }
  }, [open, course])

  const fetchSubcategories = async () => {
    try {
      const response = await fetch("/api/admin/subcategories")
      if (response.ok) {
        const data = await response.json()
        setSubcategories(data)
      }
    } catch (error) {
      console.error("Error fetching subcategories:", error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      description: "",
      target_audience: "",
      outcomes: "",
      prerequisites: "",
      cancellation_policy: "",
      number_of_sessions: undefined,
      target_age_min: undefined,
      target_age_max: undefined,
      target_grades: [],
      base_price: undefined,
      currency: "USD",
      status: "draft",
    })
    setSelectedSubcategoryIds([])
    setTargetGradesInput("")
    setSlugManuallyEdited(false)
  }

  const toggleSubcategory = (subcategoryId: string) => {
    setSelectedSubcategoryIds((prev) =>
      prev.includes(subcategoryId)
        ? prev.filter((id) => id !== subcategoryId)
        : [...prev, subcategoryId]
    )
  }

  // Validate grade input - only allow grade-specific characters (K, numbers, -, ;, spaces, comma)
  const validateGradeInput = (value: string): boolean => {
    // Allow: K (case insensitive), numbers (0-9), hyphen (-), semicolon (;), comma (,), and spaces
    const gradePattern = /^[K0-9\s\-;,]*$/i
    return gradePattern.test(value)
  }

  // Parse semicolon-separated grades string into array
  const parseGrades = (input: string): string[] => {
    if (!input.trim()) return []
    return input
      .split(";")
      .map((g) => g.trim())
      .filter((g) => g !== "")
  }

  // Handle target grades input change
  const handleTargetGradesChange = (value: string) => {
    // Validate input
    if (!validateGradeInput(value)) {
      return // Don't update if invalid characters
    }
    
    setTargetGradesInput(value)
    const parsedGrades = parseGrades(value)
    
    // Auto-generate slug when grade changes (only if not manually edited)
    let newSlug = formData.slug || ""
    if (formData.name && !slugManuallyEdited && parsedGrades.length > 0) {
      newSlug = generateSlug(formData.name, parsedGrades)
    }
    
    // Update both target_grades and slug in a single state update
    setFormData({ ...formData, target_grades: parsedGrades, slug: newSlug })
  }

  // Function to generate slug from name and grades (returns slug string, doesn't update state)
  const generateSlug = (name: string, grades: string[]): string => {
    if (!name) return ""
    
    // Combine name and all grades
    let slugParts: string[] = [name]
    
    // Add all grades if available
    if (grades.length > 0) {
      const validGrades = grades
        .map((g) => g.trim())
        .filter((g) => g !== "")
      if (validGrades.length > 0) {
        // Join all grades with a space, they will be converted to hyphens later
        slugParts.push(validGrades.join(" "))
      }
    }
    
    // Join all parts and convert to slug format
    const combined = slugParts.join(" ")
    
    // Convert to slug: lowercase, replace spaces with hyphens, remove special characters
    const slug = combined
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")  // Replace spaces with hyphens
      .replace(/[^a-z0-9-]/g, "")  // Remove special characters except hyphens
      .replace(/-+/g, "-")  // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, "")  // Remove leading/trailing hyphens
    
    return slug
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const submitData = {
        ...formData,
        target_grades: parseGrades(targetGradesInput),
        subcategory_ids: selectedSubcategoryIds,
      }

      const url = course?.id ? `/api/admin/courses/${course.id}` : "/api/admin/courses"
      const method = course?.id ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      })

      if (response.ok) {
        onCourseUpdated()
        onOpenChange(false)
        resetForm()
      } else {
        const error = await response.json()
        alert(error.error || "Failed to save course")
      }
    } catch (error) {
      console.error("Error saving course:", error)
      alert("Failed to save course")
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusChangeConfirm = () => {
    if (statusChangeCheck.newStatus) {
      setFormData({ ...formData, status: statusChangeCheck.newStatus })
      setStatusChangeCheck({
        showDialog: false,
        newStatus: null,
        warnings: [],
        activeInstances: 0,
        activeEnrollments: 0,
      })
    }
  }

  const handleStatusChangeCancel = () => {
    setStatusChangeCheck({
      showDialog: false,
      newStatus: null,
      warnings: [],
      activeInstances: 0,
      activeEnrollments: 0,
    })
  }

  return (
    <>
      {/* Status Change Confirmation Dialog */}
      <Dialog open={statusChangeCheck.showDialog} onOpenChange={handleStatusChangeCancel}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
            <DialogDescription>
              You are about to change the course status from <strong>Published</strong> to <strong>
                {statusChangeCheck.newStatus === 'suspended' ? 'Suspended' : 'Archived'}
              </strong>. This action will have the following impacts:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            {statusChangeCheck.warnings.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Warnings:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {statusChangeCheck.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {statusChangeCheck.activeInstances > 0 && (
              <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-3">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  {statusChangeCheck.activeInstances} active instance(s) will be affected
                </p>
              </div>
            )}
            
            {statusChangeCheck.activeEnrollments > 0 && (
              <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-3">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  {statusChangeCheck.activeEnrollments} active enrollment(s) will be affected
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleStatusChangeCancel}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleStatusChangeConfirm}>
              Confirm Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Course Edit Dialog */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {course ? (isArchived ? "View Course (Archived)" : "Edit Course") : "Add New Course"}
          </DialogTitle>
          <DialogDescription>
            {course 
              ? (isArchived 
                  ? "This course is archived and cannot be edited. You can only view the details."
                  : "Update course information")
              : "Create a new course (assignments will be created separately)"}
          </DialogDescription>
          {isArchived && (
            <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ This course is archived and cannot be edited. All fields are read-only.
              </p>
            </div>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Course Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Course Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => {
                if (isArchived) return // 禁止编辑 archived 课程
                const newName = e.target.value
                // Calculate new slug if not manually edited
                let newSlug = formData.slug || ""
                if (!slugManuallyEdited) {
                  const parsedGrades = parseGrades(targetGradesInput)
                  if (newName && parsedGrades.length > 0 && parsedGrades[0].trim()) {
                    newSlug = generateSlug(newName, parsedGrades)
                  } else if (newName) {
                    newSlug = generateSlug(newName, [])
                  } else {
                    newSlug = ""
                  }
                }
                // Update both name and slug in a single state update
                setFormData({ ...formData, name: newName, slug: newSlug })
              }}
              placeholder="e.g., Introduction to Robotics with VEX GO"
              required
              disabled={isArchived}
            />
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label htmlFor="slug">Slug (Auto-generated from name and grade)</Label>
            <Input
              id="slug"
              value={formData.slug || ""}
              onChange={(e) => {
                if (isArchived) return // 禁止编辑 archived 课程
                setFormData({ ...formData, slug: e.target.value })
                setSlugManuallyEdited(true) // Mark as manually edited when user types
              }}
              placeholder="e.g., introduction-to-robotics-with-vex-go-k-2"
              disabled={isArchived}
            />
            <p className="text-xs text-muted-foreground">
              Automatically generated from course name and first target grade. You can manually edit if needed.
            </p>
          </div>

          {/* Subcategory Tags (Multi-select) */}
          <div className="space-y-2">
            <Label>Subcategory Tags (Optional)</Label>
            <div className="border rounded-md p-3 min-h-[100px] max-h-[200px] overflow-y-auto">
              {subcategories.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No subcategories available. Create subcategories first.
                </p>
              ) : (
                <div className="space-y-2">
                  {subcategories.map((subcategory) => (
                    <div key={subcategory.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`subcategory-${subcategory.id}`}
                        checked={selectedSubcategoryIds.includes(subcategory.id)}
                        onCheckedChange={() => {
                          if (isArchived) return // 禁止编辑 archived 课程
                          toggleSubcategory(subcategory.id)
                        }}
                        disabled={isArchived}
                      />
                      <Label
                        htmlFor={`subcategory-${subcategory.id}`}
                        className="text-sm font-normal cursor-pointer flex-1"
                      >
                        {subcategory.display_name}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selectedSubcategoryIds.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedSubcategoryIds.map((id) => {
                  const subcategory = subcategories.find((s) => s.id === id)
                  return subcategory ? (
                    <Badge key={id} variant="secondary">
                      {subcategory.display_name}
                    </Badge>
                  ) : null
                })}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) => {
                if (isArchived) return // 禁止编辑 archived 课程
                setFormData({ ...formData, description: e.target.value })
              }}
              placeholder="Course description"
              rows={3}
              disabled={isArchived}
            />
          </div>

          {/* Grid for Number of Sessions, Age, Price */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sessions">Number of Sessions</Label>
              <Input
                id="sessions"
                type="number"
                value={formData.number_of_sessions || ""}
                onChange={(e) => {
                  if (isArchived) return
                  setFormData({
                    ...formData,
                    number_of_sessions: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }}
                placeholder="10"
                disabled={isArchived}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ageMin">Min Age</Label>
              <Input
                id="ageMin"
                type="number"
                value={formData.target_age_min || ""}
                onChange={(e) => {
                  if (isArchived) return
                  setFormData({
                    ...formData,
                    target_age_min: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }}
                placeholder="5"
                disabled={isArchived}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ageMax">Max Age</Label>
              <Input
                id="ageMax"
                type="number"
                value={formData.target_age_max || ""}
                onChange={(e) => {
                  if (isArchived) return
                  setFormData({
                    ...formData,
                    target_age_max: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }}
                placeholder="8"
                disabled={isArchived}
              />
            </div>
          </div>

          {/* Target Grades */}
          <div className="space-y-2">
            <Label htmlFor="targetGrades">Target Grades</Label>
            <Input
              id="targetGrades"
              value={targetGradesInput}
              onChange={(e) => handleTargetGradesChange(e.target.value)}
              placeholder="e.g., K-2; 3-5; 6 (use semicolon to separate multiple grades)"
              disabled={isArchived}
            />
            <p className="text-xs text-muted-foreground">
              Enter grades separated by semicolons (;). Only grade-specific characters allowed (K, numbers, -, ;). Example: K-2; 3-5; 6
            </p>
          </div>

          {/* Price */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Base Price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.base_price || ""}
                onChange={(e) => {
                  if (isArchived) return
                  setFormData({
                    ...formData,
                    base_price: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }}
                placeholder="299.99"
                disabled={isArchived}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.currency || "USD"}
                onValueChange={(value) => {
                  if (isArchived) return
                  setFormData({ ...formData, currency: value })
                }}
                disabled={isArchived}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="CAD">CAD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Course Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Course Status *</Label>
            <Select
              value={formData.status || "draft"}
              onValueChange={async (value: 'draft' | 'published' | 'suspended' | 'archived') => {
                if (isArchived) return // 禁止编辑 archived 课程的状态
                const currentStatus = course?.status || formData.status || 'draft'
                
                // 如果是从 published 改为 suspended 或 archived，需要检查
                if (currentStatus === 'published' && (value === 'suspended' || value === 'archived')) {
                  if (course?.id) {
                    setIsCheckingStatus(true)
                    try {
                      const response = await fetch(
                        `/api/admin/courses/${course.id}/check-status-change?newStatus=${value}`
                      )
                      if (response.ok) {
                        const data = await response.json()
                        if (data.warnings && data.warnings.length > 0) {
                          // 显示确认对话框
                          setStatusChangeCheck({
                            showDialog: true,
                            newStatus: value,
                            warnings: data.warnings,
                            activeInstances: data.activeInstances || 0,
                            activeEnrollments: data.activeEnrollments || 0,
                          })
                          return // 不立即更新状态，等待用户确认
                        }
                      }
                    } catch (error) {
                      console.error("Error checking status change:", error)
                    } finally {
                      setIsCheckingStatus(false)
                    }
                  }
                }
                
                // 其他情况直接更新状态
                setFormData({ ...formData, status: value })
              }}
              disabled={isCheckingStatus || isArchived}
            >
              <SelectTrigger>
                <SelectValue />
                {isCheckingStatus && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft (草稿)</SelectItem>
                <SelectItem value="published">Published (已发布)</SelectItem>
                <SelectItem value="suspended">Suspended (暂停)</SelectItem>
                <SelectItem value="archived">Archived (已归档)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Draft: 正在设计中，不能分配。 Published: 可以分配和上架。 Suspended: 临时下架。 Archived: 已归档。
            </p>
          </div>

          {/* Target Audience */}
          <div className="space-y-2">
            <Label htmlFor="audience">Target Audience</Label>
            <Textarea
              id="audience"
              value={formData.target_audience || ""}
              onChange={(e) => {
                if (isArchived) return
                setFormData({ ...formData, target_audience: e.target.value })
              }}
              placeholder="e.g., Elementary school students interested in robotics"
              rows={2}
              disabled={isArchived}
            />
          </div>

          {/* Outcomes */}
          <div className="space-y-2">
            <Label htmlFor="outcomes">Course Outcomes</Label>
            <Textarea
              id="outcomes"
              value={formData.outcomes || ""}
              onChange={(e) => {
                if (isArchived) return
                setFormData({ ...formData, outcomes: e.target.value })
              }}
              placeholder="What students will learn"
              rows={3}
              disabled={isArchived}
            />
          </div>

          {/* Prerequisites */}
          <div className="space-y-2">
            <Label htmlFor="prerequisites">Prerequisites</Label>
            <Textarea
              id="prerequisites"
              value={formData.prerequisites || ""}
              onChange={(e) => {
                if (isArchived) return
                setFormData({ ...formData, prerequisites: e.target.value })
              }}
              placeholder="e.g., No prior experience required"
              rows={2}
              disabled={isArchived}
            />
          </div>

          {/* Cancellation Policy */}
          <div className="space-y-2">
            <Label htmlFor="policy">Cancellation Policy</Label>
            <Textarea
              id="policy"
              value={formData.cancellation_policy || ""}
              onChange={(e) => {
                if (isArchived) return
                setFormData({ ...formData, cancellation_policy: e.target.value })
              }}
              placeholder="Refund policy details"
              rows={2}
              disabled={isArchived}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.name || isArchived}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isArchived ? (
                "Cannot Edit Archived Course"
              ) : course ? (
                "Update Course"
              ) : (
                "Create Course"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  )
}
