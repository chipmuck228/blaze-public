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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Search, MoreVertical, Edit, Trash2, Plus, Loader2, RefreshCcw } from "lucide-react"

interface CourseSubcategory {
  id: string
  name: string
  display_name: string
  description?: string
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function SubcategoriesManagementPage() {
  const [subcategories, setSubcategories] = useState<CourseSubcategory[]>([])
  const [filteredSubcategories, setFilteredSubcategories] = useState<CourseSubcategory[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [editingSubcategory, setEditingSubcategory] = useState<CourseSubcategory | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState<Omit<CourseSubcategory, 'id' | 'created_at' | 'updated_at'>>({
    name: "",
    display_name: "",
    description: "",
    display_order: 0,
    is_active: true,
  })

  useEffect(() => {
    fetchSubcategories()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      const filtered = subcategories.filter(
        (subcategory) =>
          subcategory.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          subcategory.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          subcategory.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredSubcategories(filtered)
    } else {
      setFilteredSubcategories(subcategories)
    }
  }, [searchQuery, subcategories])

  const fetchSubcategories = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch("/api/admin/subcategories")
      
      if (!response.ok) {
        throw new Error("Failed to fetch subcategories")
      }

      const data = await response.json()
      setSubcategories(data)
      setFilteredSubcategories(data)
    } catch (err: any) {
      console.error("Error fetching subcategories:", err)
      setError(err.message || "Failed to load subcategories")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (subcategoryId: string) => {
    if (!confirm("Are you sure you want to delete this subcategory?")) {
      return
    }

    try {
      const response = await fetch(`/api/admin/subcategories/${subcategoryId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchSubcategories()
      } else {
        const data = await response.json()
        alert(data.error || "Failed to delete subcategory")
      }
    } catch (error) {
      console.error("Error deleting subcategory:", error)
      alert("Failed to delete subcategory")
    }
  }

  const handleEdit = (subcategory: CourseSubcategory) => {
    setEditingSubcategory(subcategory)
    setFormData({
      name: subcategory.name,
      display_name: subcategory.display_name,
      description: subcategory.description || "",
      display_order: subcategory.display_order,
      is_active: subcategory.is_active,
    })
    setIsEditDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingSubcategory(null)
    setFormData({
      name: "",
      display_name: "",
      description: "",
      display_order: 0,
      is_active: true,
    })
    setIsEditDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const url = editingSubcategory
        ? `/api/admin/subcategories/${editingSubcategory.id}`
        : "/api/admin/subcategories"
      const method = editingSubcategory ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        fetchSubcategories()
        setIsEditDialogOpen(false)
        setEditingSubcategory(null)
      } else {
        const error = await response.json()
        alert(error.error || "Failed to save subcategory")
      }
    } catch (error) {
      console.error("Error saving subcategory:", error)
      alert("Failed to save subcategory")
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
        <h1 className="text-3xl font-bold">Subcategories Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage subcategory tags (e.g., RoboQuests, LaunchPad, RoboChamps)
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Subcategories</CardTitle>
              <CardDescription>
                A list of all subcategory tags in the system (used as tags for courses)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search subcategories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add Subcategory
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
              <Button onClick={fetchSubcategories}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : filteredSubcategories.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? "No subcategories found matching your search." : "No subcategories found."}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubcategories.map((subcategory) => (
                    <TableRow key={subcategory.id}>
                      <TableCell className="font-medium">{subcategory.name}</TableCell>
                      <TableCell>{subcategory.display_name}</TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {subcategory.description || "N/A"}
                      </TableCell>
                      <TableCell>{subcategory.display_order}</TableCell>
                      <TableCell>
                        <Badge variant={subcategory.is_active ? "default" : "secondary"}>
                          {subcategory.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(subcategory.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(subcategory)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(subcategory.id)}
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
        <DialogContent className="max-w-[95vw] sm:max-w-[500px] lg:max-w-[600px] max-h-[95vh] h-[95vh] flex flex-col p-4 sm:p-6">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{editingSubcategory ? "Edit Subcategory" : "Add New Subcategory"}</DialogTitle>
            <DialogDescription>
              {editingSubcategory ? "Update subcategory information" : "Create a new subcategory tag (can be used as tags for courses)"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., roboquests"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name *</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                placeholder="e.g., RoboQuests"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Subcategory description"
                rows={3}
              />
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

            </div>
            <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !formData.name || !formData.display_name} className="w-full sm:w-auto">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingSubcategory ? (
                  "Update Subcategory"
                ) : (
                  "Create Subcategory"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

