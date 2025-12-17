'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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

interface CourseSeries {
  id: string
  category_id: string
  franchise_id?: string | null
  name: string
  display_name: string
  description?: string
  start_date?: string
  end_date?: string
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface CourseCategory {
  id: string
  name: string
  display_name: string
}

interface Franchise {
  id: string
  code: string
  name: string
  is_active: boolean
}

export default function SeriesManagementPage() {
  const [series, setSeries] = useState<CourseSeries[]>([])
  const [filteredSeries, setFilteredSeries] = useState<CourseSeries[]>([])
  const [categories, setCategories] = useState<CourseCategory[]>([])
  const [franchises, setFranchises] = useState<Franchise[]>([])
  const [selectedFranchiseFilter, setSelectedFranchiseFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [editingSeries, setEditingSeries] = useState<CourseSeries | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState<Omit<CourseSeries, 'id' | 'created_at' | 'updated_at'>>({
    category_id: "",
    franchise_id: undefined,
    name: "",
    display_name: "",
    description: "",
    start_date: "",
    end_date: "",
    display_order: 0,
    is_active: true,
  })

  useEffect(() => {
    fetchSeries()
    fetchCategories()
    fetchFranchises()
  }, [])

  useEffect(() => {
    let base = [...series]

    if (selectedFranchiseFilter !== "all") {
      base = base.filter((s) => s.franchise_id === selectedFranchiseFilter)
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      base = base.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.display_name.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q)
      )
    }

    setFilteredSeries(base)
  }, [searchQuery, series, selectedFranchiseFilter])

  const fetchSeries = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (selectedFranchiseFilter !== "all") {
        params.set("franchiseId", selectedFranchiseFilter)
      }
      const query = params.toString()
      const response = await fetch(`/api/admin/series${query ? `?${query}` : ""}`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch series")
      }

      const data = await response.json()
      setSeries(data)
      setFilteredSeries(data)
    } catch (err: any) {
      console.error("Error fetching series:", err)
      setError(err.message || "Failed to load series")
    } finally {
      setIsLoading(false)
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

  const fetchFranchises = async () => {
    try {
      const response = await fetch("/api/admin/franchises")
      if (response.ok) {
        const data = await response.json()
        setFranchises(data)
      }
    } catch (error) {
      console.error("Error fetching franchises:", error)
    }
  }

  const handleDelete = async (seriesId: string) => {
    if (!confirm("Are you sure you want to delete this series? This will fail if there are existing assignments.")) {
      return
    }

    try {
      const response = await fetch(`/api/admin/series/${seriesId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchSeries()
      } else {
        const data = await response.json()
        alert(data.error || "Failed to delete series")
      }
    } catch (error) {
      console.error("Error deleting series:", error)
      alert("Failed to delete series")
    }
  }

  const handleEdit = (s: CourseSeries) => {
    setEditingSeries(s)
    setFormData({
      category_id: s.category_id,
      franchise_id: s.franchise_id || undefined,
      name: s.name,
      display_name: s.display_name,
      description: s.description || "",
      start_date: s.start_date || "",
      end_date: s.end_date || "",
      display_order: s.display_order,
      is_active: s.is_active,
    })
    setIsEditDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingSeries(null)
    setFormData({
      category_id: "",
      franchise_id: undefined,
      name: "",
      display_name: "",
      description: "",
      start_date: "",
      end_date: "",
      display_order: 0,
      is_active: true,
    })
    setIsEditDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const url = editingSeries
        ? `/api/admin/series/${editingSeries.id}`
        : "/api/admin/series"
      const method = editingSeries ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          franchise_id: formData.franchise_id || undefined,
        }),
      })

      if (response.ok) {
        fetchSeries()
        setIsEditDialogOpen(false)
        setEditingSeries(null)
      } else {
        const error = await response.json()
        alert(error.error || "Failed to save series")
      }
    } catch (error) {
      console.error("Error saving series:", error)
      alert("Failed to save series")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId)
    return category?.display_name || "Unknown"
  }

  const getFranchiseName = (franchiseId?: string | null) => {
    if (!franchiseId) return "Global / Unassigned"
    const f = franchises.find((fr) => fr.id === franchiseId)
    return f ? f.name || f.code : "Unknown"
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
        <h1 className="text-3xl font-bold">Series / Programs Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage course series / programs (e.g., "2025 Winter Courses") per franchise.
        </p>
      </div>

      <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Series</CardTitle>
                <CardDescription>
                  A list of all course series / programs in the system
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search series..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Select
                  value={selectedFranchiseFilter}
                  onValueChange={setSelectedFranchiseFilter}
                >
                  <SelectTrigger className="w-52">
                    <SelectValue placeholder="All franchises" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All franchises</SelectItem>
                    {franchises.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name} ({f.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAdd}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Series
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
              <Button onClick={fetchSeries}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : filteredSeries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? "No series found matching your search." : "No series found."}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Franchise</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Date Range</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSeries.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.display_name}</TableCell>
                      <TableCell>{getFranchiseName(s.franchise_id)}</TableCell>
                      <TableCell>{getCategoryName(s.category_id)}</TableCell>
                      <TableCell>
                        {s.start_date && s.end_date
                          ? `${formatDate(s.start_date)} - ${formatDate(s.end_date)}`
                          : "N/A"}
                      </TableCell>
                      <TableCell>{s.display_order}</TableCell>
                      <TableCell>
                        <Badge variant={s.is_active ? "default" : "secondary"}>
                          {s.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(s.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(s)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(s.id)}
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
            <DialogTitle>{editingSeries ? "Edit Series" : "Add New Series"}</DialogTitle>
            <DialogDescription>
              {editingSeries ? "Update series information" : "Create a new course series (must belong to a category)"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category_id">Category *</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
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
              <Label htmlFor="franchise_id">Franchise</Label>
              <Select
                value={formData.franchise_id || ""}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    franchise_id: value || undefined,
                  })
                }
              >
                <SelectTrigger id="franchise_id">
                  <SelectValue placeholder="Select a franchise (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {franchises.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name} ({f.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., 2025-winter"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name *</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                placeholder="e.g., 2025 Winter Courses"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Series description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
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
              <Button type="submit" disabled={isSubmitting || !formData.category_id || !formData.name || !formData.display_name}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingSeries ? (
                  "Update Series"
                ) : (
                  "Create Series"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

