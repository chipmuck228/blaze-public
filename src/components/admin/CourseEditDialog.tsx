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
import { Loader2, Plus, X } from "lucide-react"
import { Card } from "@/components/ui/card"
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
  const [targetGrades, setTargetGrades] = useState<string[]>([])

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
        })
        setSelectedSubcategoryIds(course.tags?.map(t => t.id) || [])
        setTargetGrades(course.target_grades || [])
      } else {
        resetForm()
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
    })
    setSelectedSubcategoryIds([])
    setTargetGrades([])
  }

  const toggleSubcategory = (subcategoryId: string) => {
    setSelectedSubcategoryIds((prev) =>
      prev.includes(subcategoryId)
        ? prev.filter((id) => id !== subcategoryId)
        : [...prev, subcategoryId]
    )
  }

  const addTargetGrade = () => {
    setTargetGrades([...targetGrades, ""])
  }

  const removeTargetGrade = (index: number) => {
    setTargetGrades(targetGrades.filter((_, i) => i !== index))
  }

  const updateTargetGrade = (index: number, value: string) => {
    const updated = [...targetGrades]
    updated[index] = value
    setTargetGrades(updated)
    setFormData({ ...formData, target_grades: updated.filter((g) => g.trim() !== "") })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const submitData = {
        ...formData,
        target_grades: targetGrades.filter((g) => g.trim() !== ""),
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{course ? "Edit Course" : "Add New Course"}</DialogTitle>
          <DialogDescription>
            {course ? "Update course information" : "Create a new course (assignments will be created separately)"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Course Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Course Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Introduction to Robotics with VEX GO"
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
              placeholder="e.g., intro-robotics-vex-go"
            />
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
                        onCheckedChange={() => toggleSubcategory(subcategory.id)}
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
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Course description"
              rows={3}
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
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    number_of_sessions: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                placeholder="10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ageMin">Min Age</Label>
              <Input
                id="ageMin"
                type="number"
                value={formData.target_age_min || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    target_age_min: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                placeholder="5"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ageMax">Max Age</Label>
              <Input
                id="ageMax"
                type="number"
                value={formData.target_age_max || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    target_age_max: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                placeholder="8"
              />
            </div>
          </div>

          {/* Target Grades */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Target Grades</Label>
              <Button type="button" variant="outline" size="sm" onClick={addTargetGrade}>
                <Plus className="h-4 w-4 mr-2" />
                Add Grade
              </Button>
            </div>
            {targetGrades.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">
                No grades added. Click 'Add Grade' to add one.
              </p>
            ) : (
              <div className="space-y-2">
                {targetGrades.map((grade, index) => (
                  <Card key={index} className="p-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={grade}
                        onChange={(e) => updateTargetGrade(index, e.target.value)}
                        placeholder="e.g., K-2, 3-4"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTargetGrade(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
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
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    base_price: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                placeholder="299.99"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.currency || "USD"}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
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

          {/* Target Audience */}
          <div className="space-y-2">
            <Label htmlFor="audience">Target Audience</Label>
            <Textarea
              id="audience"
              value={formData.target_audience || ""}
              onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
              placeholder="e.g., Elementary school students interested in robotics"
              rows={2}
            />
          </div>

          {/* Outcomes */}
          <div className="space-y-2">
            <Label htmlFor="outcomes">Course Outcomes</Label>
            <Textarea
              id="outcomes"
              value={formData.outcomes || ""}
              onChange={(e) => setFormData({ ...formData, outcomes: e.target.value })}
              placeholder="What students will learn"
              rows={3}
            />
          </div>

          {/* Prerequisites */}
          <div className="space-y-2">
            <Label htmlFor="prerequisites">Prerequisites</Label>
            <Textarea
              id="prerequisites"
              value={formData.prerequisites || ""}
              onChange={(e) => setFormData({ ...formData, prerequisites: e.target.value })}
              placeholder="e.g., No prior experience required"
              rows={2}
            />
          </div>

          {/* Cancellation Policy */}
          <div className="space-y-2">
            <Label htmlFor="policy">Cancellation Policy</Label>
            <Textarea
              id="policy"
              value={formData.cancellation_policy || ""}
              onChange={(e) =>
                setFormData({ ...formData, cancellation_policy: e.target.value })
              }
              placeholder="Refund policy details"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.name}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
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
  )
}
