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
import { toast } from "sonner"

interface OfferingAssignment {
  id: string
  offering_id: string
  category_id: string
  series_id: string
  location_id?: string
  display_order: number
  is_active: boolean
  assignment_config?: Record<string, any>
  created_at: string
  updated_at: string
  offering?: { 
    id: string
    name: string
    slug?: string
    target_grades?: string[]
    offering_type?: string
    status?: 'draft' | 'published' | 'suspended' | 'archived'
  }
  category?: { id: string; display_name: string }
  series?: { 
    id: string
    display_name: string
    franchise?: { id: string; code: string; name: string } | null
    category?: { id: string; name: string; display_name: string } | null
  }
  location?: { id: string; name: string }
}

interface Offering {
  id: string
  name: string
  slug?: string
  target_grades?: string[]
  offering_type?: string
  status?: 'draft' | 'published' | 'suspended' | 'archived'
}

interface CourseCategory {
  id: string
  display_name: string
}

interface CourseSeries {
  id: string
  display_name: string
  category_id: string
  franchise_id?: string | null
  start_date?: string
  end_date?: string
  franchise?: {
    id: string
    code: string
    name: string
  } | null
  category?: {
    id: string
    name: string
    display_name: string
  } | null
}

interface CourseLocation {
  id: string
  name: string
}

export default function OfferingsAssignmentsManagementPage() {
  const [assignments, setAssignments] = useState<OfferingAssignment[]>([])
  const [filteredAssignments, setFilteredAssignments] = useState<OfferingAssignment[]>([])
  const [offerings, setOfferings] = useState<Offering[]>([])
  const [categories, setCategories] = useState<CourseCategory[]>([])
  const [series, setSeries] = useState<CourseSeries[]>([])
  const [locations, setLocations] = useState<CourseLocation[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [editingAssignment, setEditingAssignment] = useState<OfferingAssignment | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState<Omit<OfferingAssignment, 'id' | 'created_at' | 'updated_at'>>({
    offering_id: "",
    category_id: "",
    series_id: "",
    location_id: "",
    display_order: 0,
    is_active: true,
    assignment_config: {},
  })

  useEffect(() => {
    fetchAssignments()
    fetchOfferings()
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
          assignment.offering?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
      const response = await fetch("/api/admin/offerings-assignments")
      
      if (!response.ok) {
        throw new Error("Failed to fetch offerings assignments")
      }

      const data = await response.json()
      setAssignments(data)
      setFilteredAssignments(data)
    } catch (err: any) {
      console.error("Error fetching offerings assignments:", err)
      setError(err.message || "Failed to load offerings assignments")
      toast.error(err.message || "Failed to load offerings assignments")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchOfferings = async () => {
    try {
      const response = await fetch("/api/admin/offerings")
      if (response.ok) {
        const data = await response.json()
        // 只显示 published 状态的 offerings
        const publishedOfferings = data.filter((offering: Offering) => offering.status === 'published')
        setOfferings(publishedOfferings)
      }
    } catch (error) {
      console.error("Error fetching offerings:", error)
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
      }
    } catch (error) {
      console.error("Error fetching locations:", error)
    }
  }

  const handleDelete = async (assignmentId: string) => {
    if (!confirm("Are you sure you want to delete this assignment? This will also delete all associated instances.")) {
      return
    }

    try {
      const response = await fetch(`/api/admin/offerings-assignments/${assignmentId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Assignment deleted successfully")
        fetchAssignments()
      } else {
        const data = await response.json()
        toast.error(data.error || "Failed to delete assignment")
      }
    } catch (error) {
      console.error("Error deleting assignment:", error)
      toast.error("Failed to delete assignment")
    }
  }

  const handleEdit = (assignment: OfferingAssignment) => {
    setEditingAssignment(assignment)
    setFormData({
      offering_id: assignment.offering_id,
      category_id: assignment.category_id,
      series_id: assignment.series_id,
      location_id: assignment.location_id || "",
      display_order: assignment.display_order,
      is_active: assignment.is_active,
      assignment_config: assignment.assignment_config || {},
    })
    setIsEditDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingAssignment(null)
    setFormData({
      offering_id: "",
      category_id: "",
      series_id: "",
      location_id: "",
      display_order: 0,
      is_active: true,
      assignment_config: {},
    })
    setIsEditDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const submitData = {
        ...formData,
        location_id: formData.location_id || null,
      }

      const url = editingAssignment
        ? `/api/admin/offerings-assignments/${editingAssignment.id}`
        : "/api/admin/offerings-assignments"
      const method = editingAssignment ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      })

      if (response.ok) {
        toast.success(editingAssignment ? "Assignment updated successfully" : "Assignment created successfully")
        fetchAssignments()
        setIsEditDialogOpen(false)
        setEditingAssignment(null)
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to save assignment")
      }
    } catch (error) {
      console.error("Error saving assignment:", error)
      toast.error("Failed to save assignment")
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
        <h1 className="text-3xl font-bold">Offerings Assignments Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage offerings assignments (assign offerings to categories, programs, and campuses)
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Offerings Assignments</CardTitle>
              <CardDescription>
                A list of all offerings assignments in the system
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
                    <TableHead>Offering</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssignments.map((assignment) => {
                    const offering = assignment.offering
                    const gradesText = offering?.target_grades && offering.target_grades.length > 0
                      ? `Grades: ${offering.target_grades.join(', ')}`
                      : ''
                    const slugText = offering?.slug ? `Slug: ${offering.slug}` : ''
                    const typeText = offering?.offering_type ? `Type: ${offering.offering_type}` : ''
                    
                    return (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">{offering?.name || "Unknown"}</span>
                            {(gradesText || slugText || typeText) && (
                              <span className="text-xs text-muted-foreground">
                                {[gradesText, slugText, typeText].filter(Boolean).join(' • ')}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{assignment.category?.display_name || "Unknown"}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span>{assignment.series?.display_name || "Unknown"}</span>
                            {assignment.series?.franchise && (
                              <span className="text-xs text-muted-foreground">
                                {assignment.series.franchise.name}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{assignment.location?.name || "N/A"}</TableCell>
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
                    )
                  })}
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
              {editingAssignment ? "Update assignment information" : "Assign a published offering to a category and program. The campus will be selected when creating instances."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="offering_id">Offering *</Label>
              <Select
                value={formData.offering_id}
                onValueChange={(value) => setFormData({ ...formData, offering_id: value })}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an offering" />
                </SelectTrigger>
                <SelectContent className="max-h-[400px]">
                  {offerings
                    .filter((offering) => offering.status === 'published' && offering.id && offering.id.trim() !== "")
                    .map((offering) => {
                      const gradesText = offering.target_grades && offering.target_grades.length > 0
                        ? `Grades: ${offering.target_grades.join(', ')}`
                        : ''
                      const slugText = offering.slug ? `Slug: ${offering.slug}` : ''
                      const typeText = offering.offering_type ? `Type: ${offering.offering_type}` : ''
                      
                      const subTexts = [gradesText, slugText, typeText].filter(Boolean)
                      const valueText = subTexts.length > 0
                        ? `${offering.name} • ${subTexts.join(' • ')}`
                        : offering.name
                      
                      return (
                        <SelectItem 
                          key={offering.id} 
                          value={offering.id} 
                          textValue={valueText}
                          className="py-2.5"
                        >
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-sm leading-tight">{offering.name}</span>
                            {subTexts.length > 0 && (
                              <span className="text-xs text-muted-foreground leading-tight">
                                {subTexts.join(' • ')}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      )
                    })}
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
                  {categories
                    .filter(category => category.id && category.id.trim() !== "")
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.display_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="series_id">Program (Series) *</Label>
              <Select
                value={formData.series_id}
                onValueChange={(value) => setFormData({ ...formData, series_id: value })}
                required
                disabled={!formData.category_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.category_id ? "Select a program" : "Select a category first"} />
                </SelectTrigger>
                <SelectContent className="max-h-[400px]">
                  {series
                    .filter(s => s.id && s.id.trim() !== "")
                    .map((s) => {
                    const franchiseText = s.franchise ? s.franchise.name : "No Franchise"
                    const categoryText = s.category ? s.category.display_name : "Unknown Category"
                    const dateRange = s.start_date && s.end_date
                      ? `${new Date(s.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} - ${new Date(s.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                      : null
                    
                    return (
                      <SelectItem 
                        key={s.id} 
                        value={s.id}
                        textValue={`${s.display_name} - ${franchiseText} - ${categoryText}`}
                        className="py-2.5"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-sm leading-tight">{s.display_name}</span>
                          <span className="text-xs text-muted-foreground leading-tight">
                            {[franchiseText, categoryText, dateRange].filter(Boolean).join(" • ")}
                          </span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select a program to assign the offering to. The campus will be selected when creating instances.
              </p>
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
                  {locations
                    .filter(location => location.id && location.id.trim() !== "")
                    .map((location) => (
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
              <Button type="submit" disabled={isSubmitting || !formData.offering_id || !formData.category_id || !formData.series_id}>
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

