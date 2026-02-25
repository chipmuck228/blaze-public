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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, MoreVertical, Edit, Trash2, Plus, Loader2, RefreshCcw, Eye, EyeOff, ArrowUp, ArrowDown } from "lucide-react"

interface V2Category {
  id: string
  name: string
  display_name: string
  description?: string
  poster_url?: string
  config_base: Record<string, any>
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface V2Franchise {
  id: string
  code: string
  name: string
  is_active: boolean
}

interface FranchiseCategorySubscription {
  id: string
  franchise_id: string
  category_id: string
  is_visible: boolean
  display_order: number
  created_at: string
  updated_at: string
  category: V2Category
}

export default function BlazeCategoriesManagementPage() {
  const [categories, setCategories] = useState<V2Category[]>([])
  const [filteredCategories, setFilteredCategories] = useState<V2Category[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [editingCategory, setEditingCategory] = useState<V2Category | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Franchise subscription management
  const [franchises, setFranchises] = useState<V2Franchise[]>([])
  const [selectedFranchise, setSelectedFranchise] = useState<string>("")
  const [franchiseSubscriptions, setFranchiseSubscriptions] = useState<FranchiseCategorySubscription[]>([])
  const [isSubscriptionDialogOpen, setIsSubscriptionDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"categories" | "subscriptions">("categories")

  const [formData, setFormData] = useState<Omit<V2Category, 'id' | 'created_at' | 'updated_at'>>({
    name: "",
    display_name: "",
    description: "",
    poster_url: "",
    config_base: {},
    display_order: 0,
    is_active: true,
  })

  useEffect(() => {
    fetchCategories()
    fetchFranchises()
  }, [])

  useEffect(() => {
    if (selectedFranchise && activeTab === "subscriptions") {
      fetchFranchiseSubscriptions(selectedFranchise)
    }
  }, [selectedFranchise, activeTab])

  useEffect(() => {
    if (searchQuery) {
      const filtered = categories.filter(
        (category) =>
          category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          category.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          category.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredCategories(filtered)
    } else {
      setFilteredCategories(categories)
    }
  }, [searchQuery, categories])

  const fetchCategories = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch("/api/admin/categories/v2?includeInactive=true")
      
      if (!response.ok) {
        throw new Error("Failed to fetch categories")
      }

      const data = await response.json()
      setCategories(data)
      setFilteredCategories(data)
    } catch (err: any) {
      console.error("Error fetching categories:", err)
      setError(err.message || "Failed to load categories")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchFranchises = async () => {
    try {
      const response = await fetch("/api/admin/franchises/v2?includeInactive=true")
      if (!response.ok) {
        throw new Error("Failed to fetch franchises")
      }
      const data = await response.json()
      setFranchises(data || [])
      if (data && data.length > 0) {
        setSelectedFranchise(data[0].id)
      }
    } catch (err) {
      console.error("Error fetching franchises:", err)
    }
  }

  const fetchFranchiseSubscriptions = async (franchiseId: string) => {
    try {
      const response = await fetch(`/api/admin/franchises/v2/${franchiseId}/categories`)
      if (!response.ok) {
        throw new Error("Failed to fetch subscriptions")
      }
      const data = await response.json()
      setFranchiseSubscriptions(data || [])
    } catch (err) {
      console.error("Error fetching subscriptions:", err)
      setFranchiseSubscriptions([])
    }
  }

  const handleDelete = async (categoryId: string) => {
    if (!confirm("Are you sure you want to delete this category? This will fail if there are franchise subscriptions or programs using it.")) {
      return
    }

    try {
      const response = await fetch(`/api/admin/categories/v2/${categoryId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchCategories()
      } else {
        const data = await response.json()
        alert(data.error || "Failed to delete category")
      }
    } catch (error) {
      console.error("Error deleting category:", error)
      alert("Failed to delete category")
    }
  }

  const handleEdit = (category: V2Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      display_name: category.display_name,
      description: category.description || "",
      poster_url: category.poster_url || "",
      config_base: category.config_base || {},
      display_order: category.display_order,
      is_active: category.is_active,
    })
    setIsEditDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingCategory(null)
    setFormData({
      name: "",
      display_name: "",
      description: "",
      poster_url: "",
      config_base: {},
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
        description: formData.description || undefined,
        poster_url: formData.poster_url || undefined,
        config_base: formData.config_base || {},
      }

      const url = editingCategory
        ? `/api/admin/categories/v2/${editingCategory.id}`
        : "/api/admin/categories/v2"
      const method = editingCategory ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      })

      if (response.ok) {
        fetchCategories()
        setIsEditDialogOpen(false)
        setEditingCategory(null)
      } else {
        const error = await response.json()
        alert(error.error || "Failed to save category")
      }
    } catch (error) {
      console.error("Error saving category:", error)
      alert("Failed to save category")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubscribe = async (categoryId: string) => {
    if (!selectedFranchise) {
      alert("Please select a franchise first")
      return
    }

    try {
      const response = await fetch(`/api/admin/franchises/v2/${selectedFranchise}/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category_id: categoryId,
          is_visible: true,
          display_order: 0,
        }),
      })

      if (response.ok) {
        fetchFranchiseSubscriptions(selectedFranchise)
        alert("Category subscribed successfully")
      } else {
        const data = await response.json()
        alert(data.error || "Failed to subscribe category")
      }
    } catch (error) {
      console.error("Error subscribing category:", error)
      alert("Failed to subscribe category")
    }
  }

  const handleUnsubscribe = async (subscriptionId: string, categoryId: string) => {
    if (!confirm("Are you sure you want to unsubscribe from this category? This will fail if there are programs using it.")) {
      return
    }

    if (!selectedFranchise) {
      alert("Please select a franchise first")
      return
    }

    if (!categoryId) {
      alert("Invalid category ID")
      console.error("Category ID is missing:", { subscriptionId, categoryId })
      return
    }

    try {
      const url = `/api/admin/franchises/v2/${selectedFranchise}/categories/${categoryId}`
      console.log("Unsubscribing from category:", { franchiseId: selectedFranchise, categoryId, url })
      
      const response = await fetch(url, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchFranchiseSubscriptions(selectedFranchise)
        alert("Category unsubscribed successfully")
      } else {
        const data = await response.json()
        alert(data.error || "Failed to unsubscribe category")
      }
    } catch (error) {
      console.error("Error unsubscribing category:", error)
      alert("Failed to unsubscribe category")
    }
  }

  const handleToggleVisibility = async (categoryId: string, currentVisibility: boolean) => {
    if (!selectedFranchise) {
      return
    }

    try {
      const response = await fetch(`/api/admin/franchises/v2/${selectedFranchise}/categories/${categoryId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_visible: !currentVisibility,
        }),
      })

      if (response.ok) {
        fetchFranchiseSubscriptions(selectedFranchise)
      } else {
        const data = await response.json()
        alert(data.error || "Failed to update visibility")
      }
    } catch (error) {
      console.error("Error updating visibility:", error)
      alert("Failed to update visibility")
    }
  }

  const handleUpdateDisplayOrder = async (categoryId: string, newOrder: number) => {
    if (!selectedFranchise) {
      return
    }

    try {
      const response = await fetch(`/api/admin/franchises/v2/${selectedFranchise}/categories/${categoryId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          display_order: newOrder,
        }),
      })

      if (response.ok) {
        fetchFranchiseSubscriptions(selectedFranchise)
      } else {
        const data = await response.json()
        alert(data.error || "Failed to update display order")
      }
    } catch (error) {
      console.error("Error updating display order:", error)
      alert("Failed to update display order")
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // 获取未订阅的 categories
  const getUnsubscribedCategories = () => {
    const subscribedCategoryIds = new Set(franchiseSubscriptions.map(s => s.category_id))
    return categories.filter(c => !subscribedCategoryIds.has(c.id) && c.is_active)
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">V2 Categories Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage global categories and franchise subscriptions using the V2 database schema
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "categories" | "subscriptions")}>
        <TabsList className="mb-4">
          <TabsTrigger value="categories">Global Categories</TabsTrigger>
          <TabsTrigger value="subscriptions">Franchise Subscriptions</TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Global Categories</CardTitle>
                  <CardDescription>
                    Manage global categories (not bound to any franchise)
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search categories..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Button onClick={handleAdd}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
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
                  <Button onClick={fetchCategories}>
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </div>
              ) : filteredCategories.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {searchQuery ? "No categories found matching your search." : "No categories found."}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Display Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Display Order</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCategories.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell className="font-medium font-mono text-sm">{category.name}</TableCell>
                          <TableCell>{category.display_name}</TableCell>
                          <TableCell className="max-w-xs truncate">{category.description || "N/A"}</TableCell>
                          <TableCell>{category.display_order}</TableCell>
                          <TableCell>
                            <Badge variant={category.is_active ? "default" : "secondary"}>
                              {category.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(category.created_at)}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(category)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDelete(category.id)}
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
        </TabsContent>

        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Franchise Category Subscriptions</CardTitle>
                  <CardDescription>
                    Manage which categories each franchise subscribes to
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={selectedFranchise} onValueChange={setSelectedFranchise}>
                    <SelectTrigger className="w-[250px]">
                      <SelectValue placeholder="Select a franchise" />
                    </SelectTrigger>
                    <SelectContent>
                      {franchises.map((franchise) => (
                        <SelectItem key={franchise.id} value={franchise.id}>
                          {franchise.name} ({franchise.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!selectedFranchise ? (
                <div className="text-center py-12 text-muted-foreground">
                  Please select a franchise to view subscriptions
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead>Display Order</TableHead>
                          <TableHead>Visible</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {franchiseSubscriptions
                          .sort((a, b) => a.display_order - b.display_order)
                          .map((subscription) => (
                            <TableRow key={subscription.id}>
                              <TableCell className="font-medium">
                                {subscription.category.display_name}
                                <span className="text-xs text-muted-foreground ml-2 font-mono">
                                  ({subscription.category.name})
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => handleUpdateDisplayOrder(subscription.category_id, subscription.display_order - 1)}
                                  >
                                    <ArrowUp className="h-3 w-3" />
                                  </Button>
                                  <span className="w-8 text-center">{subscription.display_order}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => handleUpdateDisplayOrder(subscription.category_id, subscription.display_order + 1)}
                                  >
                                    <ArrowDown className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleVisibility(subscription.category_id, subscription.is_visible)}
                                >
                                  {subscription.is_visible ? (
                                    <>
                                      <Eye className="h-4 w-4 mr-2" />
                                      Visible
                                    </>
                                  ) : (
                                    <>
                                      <EyeOff className="h-4 w-4 mr-2" />
                                      Hidden
                                    </>
                                  )}
                                </Button>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleUnsubscribe(subscription.id, subscription.category_id)}
                                >
                                  Unsubscribe
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>

                  {franchiseSubscriptions.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No subscriptions yet. Subscribe to categories below.
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold mb-4">Available Categories to Subscribe</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {getUnsubscribedCategories().map((category) => (
                        <Card key={category.id}>
                          <CardHeader>
                            <CardTitle className="text-base">{category.display_name}</CardTitle>
                            <CardDescription className="text-xs font-mono">{category.name}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                              {category.description || "No description"}
                            </p>
                            <Button
                              size="sm"
                              onClick={() => handleSubscribe(category.id)}
                              className="w-full"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Subscribe
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    {getUnsubscribedCategories().length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        All active categories are already subscribed.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit/Add Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add New Category"}</DialogTitle>
            <DialogDescription>
              {editingCategory ? "Update global category information" : "Create a new global category"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().trim() })}
                placeholder="e.g., robotics_basics, coding_intro"
                required
                disabled={!!editingCategory}
              />
              <p className="text-xs text-muted-foreground">
                Internal name (lowercase, numbers, underscores only). Must be unique globally. Cannot be changed after creation.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name *</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                placeholder="e.g., Robotics Basics, Coding Introduction"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Category description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="poster_url">Poster URL</Label>
              <Input
                id="poster_url"
                value={formData.poster_url}
                onChange={(e) => setFormData({ ...formData, poster_url: e.target.value })}
                placeholder="https://example.com/poster.jpg"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="display_order">Display Order</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="is_active">Status</Label>
                <select
                  id="is_active"
                  value={formData.is_active ? "active" : "inactive"}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.value === "active" })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !formData.name || !formData.display_name}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingCategory ? (
                  "Update Category"
                ) : (
                  "Create Category"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
