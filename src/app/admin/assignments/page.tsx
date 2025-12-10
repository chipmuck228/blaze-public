'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Search, MoreVertical, Edit, Trash2, Plus, Loader2, RefreshCcw } from "lucide-react"

interface CourseAssignment {
  id: string
  course_id: string
  category_id: string
  series_id: string
  location_id?: string
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  course?: { id: string; name: string }
  category?: { id: string; display_name: string }
  series?: { id: string; display_name: string }
  location?: { id: string; name: string }
}

interface Course {
  id: string
  name: string
}

interface CourseCategory {
  id: string
  display_name: string
}

interface CourseSeries {
  id: string
  display_name: string
  category_id: string
}

interface CourseLocation {
  id: string
  name: string
}

export default function AssignmentsManagementPage() {
  const [assignments, setAssignments] = useState<CourseAssignment[]>([])
  const [filteredAssignments, setFilteredAssignments] = useState<CourseAssignment[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [categories, setCategories] = useState<CourseCategory[]>([])
  const [series, setSeries] = useState<CourseSeries[]>([])
  const [locations, setLocations] = useState<CourseLocation[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [editingAssignment, setEditingAssignment] = useState<CourseAssignment | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState<Omit<CourseAssignment, 'id' | 'created_at' | 'updated_at'>>({
    course_id: "",
    category_id: "",
    series_id: "",
    location_id: "",
    display_order: 0,
    is_active: true,
  })

  useEffect(() => {
    fetchAssignments()
    fetchCourses()
    fetchCategories()
    fetchLocations()
  }, [])

  useEffect(() => {
    if (formData.category_id) {
      fetchSeriesByCategory(formData.category_id)
    } else {
      setSeries([])
    }
  }, [formData.category_id])

  useEffect(() => {
    if (searchQuery) {
      const filtered = assignments.filter(
        (assignment) =>
          assignment.course?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          assignment.category?.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          assignment.series?.display_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredAssignments(filtered)
    } else {
      setFilteredAssignments(assignments)
    }
  }, [searchQuery, assignments])

  const fetchAssignments = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch("/api/admin/assignments")
      
      if (!response.ok) {
        throw new Error("Failed to fetch assignments")
      }

      const data = await response.json()
      setAssignments(data)
      setFilteredAssignments(data)
    } catch (err: any) {
      console.error("Error fetching assignments:", err)
      setError(err.message || "Failed to load assignments")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCourses = async () => {
    try {
      const response = await fetch("/api/admin/courses")
      if (response.ok) {
        const data = await response.json()
        setCourses(data)
      }
    } catch (error) {
      console.error("Error fetching courses:", error)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/admin/categories")
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const fetchSeriesByCategory = async (categoryId: string) => {
    try {
      const response = await fetch(`/api/admin/series?categoryId=${categoryId}`)
      if (response.ok) {
        const data = await response.json()
        setSeries(data)
      }
    } catch (error) {
      console.error("Error fetching series:", error)
    }
  }

  const fetchLocations = async () => {
    try {
      const response = await fetch("/api/admin/locations")
      if (response.ok) {
        const data = await response.json()
        setLocations(data)
      } else {
        // Locations API might not exist yet, set empty array
        setLocations([])
      }
    } catch (error) {
      console.error("Error fetching locations:", error)
      setLocations([])
    }
  }

  const handleDelete = async (assignmentId: string) => {
    if (!confirm("Are you sure you want to delete this assignment? This will also delete all associated instances.")) {
      return
    }

    try {
      const response = await fetch(`/api/admin/assignments/${assignmentId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchAssignments()
      } else {
        const data = await response.json()
        alert(data.error || "Failed to delete assignment")
      }
    } catch (error) {
      console.error("Error deleting assignment:", error)
      alert("Failed to delete assignment")
    }
  }

  const handleEdit = (assignment: CourseAssignment) => {
    setEditingAssignment(assignment)
    setFormData({
      course_id: assignment.course_id,
      category_id: assignment.category_id,
      series_id: assignment.series_id,
      location_id: assignment.location_id || "",
      display_order: assignment.display_order,
      is_active: assignment.is_active,
    })
    setIsEditDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingAssignment(null)
    setFormData({
      course_id: "",
      category_id: "",
      series_id: "",
      location_id: "",
      display_order: 0,
      is_active: true,
    })
    setIsEditDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const submitData = {
        ...formData,
        location_id: formData.location_id || undefined,
      }

      const url = editingAssignment
        ? `/api/admin/assignments/${editingAssignment.id}`
        : "/api/admin/assignments"
      const method = editingAssignment ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      })

      if (response.ok) {
        fetchAssignments()
        setIsEditDialogOpen(false)
        setEditingAssignment(null)
      } else {
        const error = await response.json()
        alert(error.error || "Failed to save assignment")
      }
    } catch (error) {
      console.error("Error saving assignment:", error)
      alert("Failed to save assignment")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Assignments Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage course assignments (assign courses to categories, series, and locations)
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Assignments</CardTitle>
              <CardDescription>
                A list of all course assignments in the system
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assignments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add Assignment
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
              <Button onClick={fetchAssignments}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? "No assignments found matching your search." : "No assignments found."}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Series</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">
                        {assignment.course?.name || "Unknown"}
                      </TableCell>
                      <TableCell>{assignment.category?.display_name || "Unknown"}</TableCell>
                      <TableCell>{assignment.series?.display_name || "Unknown"}</TableCell>
                      <TableCell>{assignment.location?.name || "N/A"}</TableCell>
                      <TableCell>{assignment.display_order}</TableCell>
                      <TableCell>
                        <Badge variant={assignment.is_active ? "default" : "secondary"}>
                          {assignment.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(assignment.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(assignment)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(assignment.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingAssignment ? "Edit Assignment" : "Add New Assignment"}</DialogTitle>
            <DialogDescription>
              {editingAssignment ? "Update assignment information" : "Assign a course to a category, series, and optionally a location"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="course_id">Course *</Label>
              <Select
                value={formData.course_id}
                onValueChange={(value) => setFormData({ ...formData, course_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category_id">Category *</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => {
                  setFormData({ ...formData, category_id: value, series_id: "" })
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="series_id">Series *</Label>
              <Select
                value={formData.series_id}
                onValueChange={(value) => setFormData({ ...formData, series_id: value })}
                required
                disabled={!formData.category_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.category_id ? "Select a series" : "Select a category first"} />
                </SelectTrigger>
                <SelectContent>
                  {series.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location_id">Location (Optional)</Label>
              <Select
                value={formData.location_id || "__none__"}
                onValueChange={(value) => setFormData({ ...formData, location_id: value === "__none__" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a location (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                type="number"
                value={formData.display_order}
                onChange={(e) =>
                  setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })
                }
                placeholder="0"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !formData.course_id || !formData.category_id || !formData.series_id}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingAssignment ? (
                  "Update Assignment"
                ) : (
                  "Create Assignment"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

