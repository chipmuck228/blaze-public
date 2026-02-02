'use client'

import { useState, useEffect, useMemo } from "react"
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
import { Search, MoreVertical, Edit, Trash2, Plus, Loader2, RefreshCcw, Star, FolderTree, Upload, X, Image as ImageIcon } from "lucide-react"

interface BlazeCategory {
  id: string
  franchise_id: string
  name: string
  display_name: string
  description?: string
  poster_url?: string
  featured: boolean
  featured_slogan?: string
  featured_subtitle?: string
  featured_display_order: number
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  franchise?: {
    id: string
    code: string
    name: string
  }
}

interface BlazeFranchise {
  id: string
  code: string
  name: string
  is_active: boolean
}

export default function BlazeCategoriesManagementPage() {
  const [categories, setCategories] = useState<BlazeCategory[]>([])
  const [filteredCategories, setFilteredCategories] = useState<BlazeCategory[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [franchiseFilter, setFranchiseFilter] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [editingCategory, setEditingCategory] = useState<BlazeCategory | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [franchises, setFranchises] = useState<BlazeFranchise[]>([])
  const [isLoadingFranchises, setIsLoadingFranchises] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadedPosterUrl, setUploadedPosterUrl] = useState<string | null>(null) // 用于回退

  const [formData, setFormData] = useState<Omit<BlazeCategory, 'id' | 'created_at' | 'updated_at' | 'franchise'>>({
    franchise_id: "",
    name: "",
    display_name: "",
    description: "",
    poster_url: "",
    featured: false,
    featured_slogan: "",
    featured_subtitle: "",
    featured_display_order: 0,
    display_order: 0,
    is_active: true,
  })

  useEffect(() => {
    fetchCategories()
    fetchFranchises()
  }, [])

  useEffect(() => {
    let filtered = categories

    if (searchQuery) {
      filtered = filtered.filter(
        (category) =>
          category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          category.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          category.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          category.franchise?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (franchiseFilter !== "all") {
      filtered = filtered.filter((category) => category.franchise_id === franchiseFilter)
    }

    setFilteredCategories(filtered)
  }, [searchQuery, franchiseFilter, categories])

  const fetchCategories = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch("/api/blaze/categories")
      
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
      setIsLoadingFranchises(true)
      const response = await fetch("/api/blaze/franchises")
      if (!response.ok) {
        throw new Error("Failed to fetch franchises")
      }
      const data = await response.json()
      setFranchises(data || [])
    } catch (err) {
      console.error("Error fetching franchises:", err)
    } finally {
      setIsLoadingFranchises(false)
    }
  }

  const handleDelete = async (categoryId: string) => {
    if (!confirm("Are you sure you want to delete this category? This will fail if there are programs using it.")) {
      return
    }

    try {
      const response = await fetch(`/api/blaze/categories/${categoryId}`, {
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

  const handleEdit = (category: BlazeCategory) => {
    setEditingCategory(category)
    setFormData({
      franchise_id: category.franchise_id,
      name: category.name,
      display_name: category.display_name,
      description: category.description || "",
      poster_url: category.poster_url || "",
      featured: category.featured,
      featured_slogan: category.featured_slogan || "",
      featured_subtitle: category.featured_subtitle || "",
      featured_display_order: category.featured_display_order,
      display_order: category.display_order,
      is_active: category.is_active,
    })
    // 设置预览 URL（如果是已存在的图片）
    if (category.poster_url) {
      setPreviewUrl(category.poster_url)
    } else {
      setPreviewUrl(null)
    }
    setUploadedPosterUrl(null) // 编辑时不清除已上传的图片
    setIsEditDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingCategory(null)
    setFormData({
      franchise_id: "",
      name: "",
      display_name: "",
      description: "",
      poster_url: "",
      featured: false,
      featured_slogan: "",
      featured_subtitle: "",
      featured_display_order: 0,
      display_order: 0,
      is_active: true,
    })
    setPreviewUrl(null)
    setUploadedPosterUrl(null)
    setIsEditDialogOpen(true)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 验证文件类型
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      setError("Invalid file type. Only JPEG, PNG, and WebP are allowed.")
      event.target.value = ""
      return
    }

    // 验证文件大小 (最大 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      setError("File size must be less than 5MB")
      event.target.value = ""
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      // 清理之前的预览 URL
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }

      // 如果之前有上传的图片，先删除（回退）
      if (uploadedPosterUrl && !editingCategory) {
        try {
          await fetch(`/api/blaze/categories/upload?url=${encodeURIComponent(uploadedPosterUrl)}`, {
            method: "DELETE",
          })
        } catch (err) {
          console.error("Error deleting previous poster:", err)
        }
      }

      // 创建预览 URL
      const localPreviewUrl = URL.createObjectURL(file)
      setPreviewUrl(localPreviewUrl)

      // 上传到 Vercel Blob
      const uploadFormData = new FormData()
      uploadFormData.append("file", file)

      const response = await fetch("/api/blaze/categories/upload", {
        method: "POST",
        body: uploadFormData,
      })

      const data = await response.json()

      if (!response.ok) {
        if (localPreviewUrl) {
          URL.revokeObjectURL(localPreviewUrl)
        }
        setPreviewUrl(null)
        setError(data.error || "Failed to upload image")
        setIsUploading(false)
        event.target.value = ""
        return
      }

      // 设置上传后的 URL
      setFormData({ ...formData, poster_url: data.url })
      setUploadedPosterUrl(data.url) // 保存用于回退
      setIsUploading(false)
      event.target.value = ""
    } catch (error: any) {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
      setPreviewUrl(null)
      setError("Failed to upload image. Please try again.")
      setIsUploading(false)
      event.target.value = ""
    }
  }

  const handleRemovePoster = async () => {
    // 如果是新上传的图片（未保存的 category），删除 blob
    if (uploadedPosterUrl && !editingCategory) {
      try {
        await fetch(`/api/blaze/categories/upload?url=${encodeURIComponent(uploadedPosterUrl)}`, {
          method: "DELETE",
        })
      } catch (err) {
        console.error("Error deleting poster:", err)
      }
    }

    setFormData({ ...formData, poster_url: "" })
    setUploadedPosterUrl(null)
    if (previewUrl) {
      if (previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
      setPreviewUrl(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // 保存上传的图片 URL（用于回退）
    const posterUrlToRollback = uploadedPosterUrl && !editingCategory ? uploadedPosterUrl : null

    try {
      const submitData = {
        ...formData,
        description: formData.description || undefined,
        poster_url: formData.poster_url || undefined,
        featured_slogan: formData.featured_slogan || undefined,
        featured_subtitle: formData.featured_subtitle || undefined,
      }

      const url = editingCategory
        ? `/api/blaze/categories/${editingCategory.id}`
        : "/api/blaze/categories"
      const method = editingCategory ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      })

      if (response.ok) {
        // 成功：清除回退标记
        setUploadedPosterUrl(null)
        fetchCategories()
        setIsEditDialogOpen(false)
        setEditingCategory(null)
        setPreviewUrl(null)
      } else {
        // 失败：回退删除已上传的图片
        const error = await response.json()
        if (posterUrlToRollback) {
          try {
            await fetch(`/api/blaze/categories/upload?url=${encodeURIComponent(posterUrlToRollback)}`, {
              method: "DELETE",
            })
            console.log("Rolled back uploaded poster due to category creation failure")
          } catch (rollbackError) {
            console.error("Error rolling back poster:", rollbackError)
          }
        }
        alert(error.error || "Failed to save category")
      }
    } catch (error) {
      console.error("Error saving category:", error)
      // 失败：回退删除已上传的图片
      if (posterUrlToRollback) {
        try {
          await fetch(`/api/blaze/categories/upload?url=${encodeURIComponent(posterUrlToRollback)}`, {
            method: "DELETE",
          })
          console.log("Rolled back uploaded poster due to category creation error")
        } catch (rollbackError) {
          console.error("Error rolling back poster:", rollbackError)
        }
      }
      alert("Failed to save category")
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

  const getFranchiseLabel = (category: BlazeCategory) => {
    if (!category.franchise_id) return "N/A"
    const f = franchises.find(fr => fr.id === category.franchise_id)
    if (f) return f.name || f.code
    if (category.franchise) return category.franchise.name || category.franchise.code
    return "N/A"
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Blaze Categories Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage categories (belonging to franchises) using the new Blaze system
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Categories</CardTitle>
              <CardDescription>
                A list of all categories in the Blaze system
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={franchiseFilter} onValueChange={setFranchiseFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by franchise" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Franchises</SelectItem>
                  {franchises.map((franchise) => (
                    <SelectItem key={franchise.id} value={franchise.id}>
                      {franchise.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              {searchQuery || franchiseFilter !== "all" ? "No categories found matching your filters." : "No categories found."}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Franchise</TableHead>
                    <TableHead>Display Order</TableHead>
                    <TableHead>Featured</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>{category.display_name}</TableCell>
                      <TableCell>{getFranchiseLabel(category)}</TableCell>
                      <TableCell>{category.display_order}</TableCell>
                      <TableCell>
                        {category.featured && (
                          <Badge variant="default" className="gap-1">
                            <Star className="h-3 w-3" />
                            Featured
                          </Badge>
                        )}
                      </TableCell>
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

      <Dialog 
        open={isEditDialogOpen} 
        onOpenChange={(open) => {
          setIsEditDialogOpen(open)
          if (!open) {
            // 关闭对话框时清理预览（但保留已保存的图片）
            if (previewUrl && previewUrl.startsWith('blob:')) {
              URL.revokeObjectURL(previewUrl)
            }
            // 如果是新建且未保存，删除已上传的图片
            if (!editingCategory && uploadedPosterUrl) {
              fetch(`/api/blaze/categories/upload?url=${encodeURIComponent(uploadedPosterUrl)}`, {
                method: "DELETE",
              }).catch(err => console.error("Error cleaning up poster:", err))
            }
            setPreviewUrl(null)
            setUploadedPosterUrl(null)
          }
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-[700px] lg:max-w-[800px] max-h-[95vh] h-[95vh] flex flex-col p-4 sm:p-6">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{editingCategory ? "Edit Category" : "Add New Category"}</DialogTitle>
            <DialogDescription>
              {editingCategory ? "Update category information" : "Create a new category"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="franchise_id">Franchise *</Label>
              <Select
                value={formData.franchise_id}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    franchise_id: value,
                  })
                }
                required
                disabled={!!editingCategory}
              >
                <SelectTrigger id="franchise_id">
                  <SelectValue placeholder={isLoadingFranchises ? "Loading..." : "Select a franchise"} />
                </SelectTrigger>
                <SelectContent>
                  {franchises.map((franchise) => (
                    <SelectItem key={franchise.id} value={franchise.id}>
                      {franchise.name} ({franchise.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editingCategory && (
                <p className="text-xs text-muted-foreground">
                  Franchise cannot be changed after creation.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().trim() })}
                placeholder="e.g., robotics, coding"
                required
              />
              <p className="text-xs text-muted-foreground">
                Internal name (lowercase, will be auto-converted). Must be unique within the franchise.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name *</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                placeholder="e.g., Robotics, Coding"
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
              <Label htmlFor="poster">Poster Image</Label>
              {previewUrl ? (
                <div className="space-y-2">
                  <div className="relative w-full h-48 border rounded-md overflow-hidden bg-muted">
                    <img
                      src={previewUrl}
                      alt="Poster preview"
                      className="w-full h-full object-cover"
                      onError={() => {
                        setPreviewUrl(null)
                        setFormData({ ...formData, poster_url: "" })
                      }}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={handleRemovePoster}
                      disabled={isUploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {formData.poster_url && (
                    <p className="text-xs text-muted-foreground truncate">
                      {formData.poster_url}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-center w-full h-48 border-2 border-dashed rounded-md bg-muted/50 hover:bg-muted transition-colors">
                    <label
                      htmlFor="poster-upload"
                      className="flex flex-col items-center justify-center w-full h-full cursor-pointer"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                          <span className="text-sm text-muted-foreground">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                          <span className="text-sm text-muted-foreground">
                            Click to upload poster
                          </span>
                          <span className="text-xs text-muted-foreground mt-1">
                            JPEG, PNG, WebP (max 5MB)
                          </span>
                        </>
                      )}
                      <input
                        id="poster-upload"
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                      />
                    </label>
                  </div>
                </div>
              )}
              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
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
                  onChange={(e) => {
                    const isActive = e.target.value === "active"
                    setFormData({ 
                      ...formData, 
                      is_active: isActive,
                      featured: isActive ? formData.featured : false // 如果设为 inactive，自动取消 featured
                    })
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="featured"
                  checked={formData.featured}
                  onCheckedChange={(checked) => {
                    setFormData({ 
                      ...formData, 
                      featured: checked === true,
                      is_active: checked === true ? true : formData.is_active // 如果设为 featured，自动设为 active
                    })
                  }}
                  disabled={!formData.is_active}
                />
                <Label htmlFor="featured" className="cursor-pointer">
                  Featured Category
                </Label>
              </div>
              {!formData.is_active && (
                <p className="text-xs text-muted-foreground">
                  Category must be active to be featured.
                </p>
              )}

              {formData.featured && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="featured_slogan">Featured Slogan</Label>
                    <Input
                      id="featured_slogan"
                      value={formData.featured_slogan}
                      onChange={(e) => setFormData({ ...formData, featured_slogan: e.target.value })}
                      placeholder="e.g., Learn Robotics Today!"
                      maxLength={100}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="featured_subtitle">Featured Subtitle</Label>
                    <Input
                      id="featured_subtitle"
                      value={formData.featured_subtitle}
                      onChange={(e) => setFormData({ ...formData, featured_subtitle: e.target.value })}
                      placeholder="e.g., Ages 8-14"
                      maxLength={60}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="featured_display_order">Featured Display Order</Label>
                    <Input
                      id="featured_display_order"
                      type="number"
                      value={formData.featured_display_order}
                      onChange={(e) => setFormData({ ...formData, featured_display_order: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                </>
              )}
            </div>

            </div>
            <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  // 如果是新建且未保存，删除已上传的图片
                  if (!editingCategory && uploadedPosterUrl) {
                    fetch(`/api/blaze/categories/upload?url=${encodeURIComponent(uploadedPosterUrl)}`, {
                      method: "DELETE",
                    }).catch(err => console.error("Error cleaning up poster:", err))
                  }
                  setIsEditDialogOpen(false)
                }} 
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !formData.name || !formData.display_name || !formData.franchise_id} className="w-full sm:w-auto">
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
