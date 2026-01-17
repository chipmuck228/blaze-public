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
import { Search, MoreVertical, Edit, Trash2, Plus, Loader2, RefreshCcw, Upload, X } from "lucide-react"

interface CourseCategory {
  id: string
  name: string
  display_name: string
  description?: string
  display_order: number
  is_active: boolean
  featured: boolean
  poster_url?: string | null
  featured_slogan?: string | null
  featured_subtitle?: string | null
  featured_display_order: number
  created_at: string
  updated_at: string
}

export default function CategoriesManagementPage() {
  const [categories, setCategories] = useState<CourseCategory[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [editingCategory, setEditingCategory] = useState<CourseCategory | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())

  const [formData, setFormData] = useState<Omit<CourseCategory, 'id' | 'created_at' | 'updated_at'>>({
    name: "",
    display_name: "",
    description: "",
    display_order: 0,
    is_active: true,
    featured: false,
    poster_url: null,
    featured_slogan: "",
    featured_subtitle: "",
    featured_display_order: 0,
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const filteredCategories = useMemo(() => {
    if (searchQuery) {
      return categories.filter(
        (category) =>
          category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          category.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          category.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    return categories
  }, [searchQuery, categories])

  const fetchCategories = async () => {
    try {
      setIsLoading(true)
      setError(null)
      // 重置图片错误状态，允许重新尝试加载图片
      setImageErrors(new Set())
      const response = await fetch("/api/admin/categories")
      
      if (!response.ok) {
        throw new Error("Failed to fetch categories")
      }

      const data = await response.json()
      setCategories(data)
    } catch (err: any) {
      console.error("Error fetching categories:", err)
      setError(err.message || "Failed to load categories")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (categoryId: string) => {
    if (!confirm("Are you sure you want to delete this category? This will fail if there are existing assignments.")) {
      return
    }

    try {
      const response = await fetch(`/api/admin/categories/${categoryId}`, {
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

  const handleEdit = (category: CourseCategory) => {
    setEditingCategory(category)
    setFormData({
      name: category.name || "",
      display_name: category.display_name || "",
      description: category.description ?? "",
      display_order: category.display_order ?? 0,
      is_active: category.is_active ?? true,
      featured: category.featured ?? false,
      poster_url: category.poster_url ?? null,
      featured_slogan: category.featured_slogan ?? "",
      featured_subtitle: category.featured_subtitle ?? "",
      featured_display_order: category.featured_display_order ?? 0,
    })
    setPreviewUrl(category.poster_url || null)
    setIsEditDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingCategory(null)
    setFormData({
      name: "",
      display_name: "",
      description: "",
      display_order: 0,
      is_active: true,
      featured: false,
      poster_url: null,
      featured_slogan: "",
      featured_subtitle: "",
      featured_display_order: 0,
    })
    setPreviewUrl(null)
    setIsEditDialogOpen(true)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 验证文件类型
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      setError("Invalid file type. Only JPEG, PNG, and WebP are allowed.")
      // 重置文件输入
      event.target.value = ""
      return
    }

    // 验证文件大小 (最大 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      setError("File size must be less than 5MB")
      // 重置文件输入
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

      // 创建预览 URL
      const localPreviewUrl = URL.createObjectURL(file)
      setPreviewUrl(localPreviewUrl)

      // 上传到 Vercel Blob
      const uploadFormData = new FormData()
      uploadFormData.append("file", file)

      const response = await fetch("/api/admin/categories/upload", {
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
        // 重置文件输入
        event.target.value = ""
        return
      }

      // 设置上传后的 URL
      setFormData({ ...formData, poster_url: data.url })
      setIsUploading(false)
      // 重置文件输入，允许再次选择同一文件
      event.target.value = ""
    } catch (error: any) {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
      setPreviewUrl(null)
      setError("Failed to upload image. Please try again.")
      setIsUploading(false)
      // 重置文件输入
      event.target.value = ""
    }
  }

  const handleRemovePoster = () => {
    setFormData({ ...formData, poster_url: null })
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 验证：如果 featured = true，必须 is_active = true
    if (formData.featured && !formData.is_active) {
      alert("Category must be active to be featured")
      return
    }

    // 验证字符长度
    if (formData.featured_slogan && formData.featured_slogan.length > 100) {
      alert("Featured slogan must be 100 characters or less")
      return
    }
    if (formData.featured_subtitle && formData.featured_subtitle.length > 60) {
      alert("Featured subtitle must be 60 characters or less")
      return
    }

    setIsSubmitting(true)

    try {
      const url = editingCategory
        ? `/api/admin/categories/${editingCategory.id}`
        : "/api/admin/categories"
      const method = editingCategory ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        fetchCategories()
        setIsEditDialogOpen(false)
        setEditingCategory(null)
        // 清理预览 URL
        if (previewUrl && previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(previewUrl)
        }
        setPreviewUrl(null)
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
        <h1 className="text-3xl font-bold">Categories Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage course categories (e.g., Courses, Camp, Workshop)
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Categories</CardTitle>
              <CardDescription>
                A list of all course categories in the system
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
                    <TableHead>Status</TableHead>
                    <TableHead>Featured</TableHead>
                    <TableHead>Poster</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>{category.display_name}</TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {category.description || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={category.is_active ? "default" : "secondary"}>
                          {category.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {category.featured ? (
                          <Badge variant="default" className="bg-primary">
                            Featured
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {category.poster_url && !imageErrors.has(category.id) ? (
                          <div className="relative group">
                            <img
                              src={category.poster_url}
                              alt={`${category.display_name} poster`}
                              className="w-16 h-16 object-cover rounded border cursor-pointer hover:scale-110 transition-transform duration-200"
                              onClick={() => window.open(category.poster_url || "", "_blank")}
                              onError={() => {
                                setImageErrors(prev => new Set(prev).add(category.id))
                              }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded border transition-colors duration-200 pointer-events-none" />
                          </div>
                        ) : category.poster_url && imageErrors.has(category.id) ? (
                          <span className="text-xs text-muted-foreground">Failed to load</span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No poster</span>
                        )}
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
            // 清理预览 URL
            if (previewUrl && previewUrl.startsWith('blob:')) {
              URL.revokeObjectURL(previewUrl)
            }
            setPreviewUrl(null)
            setError(null)
          }
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-[500px] lg:max-w-[600px] max-h-[95vh] h-[95vh] flex flex-col p-4 sm:p-6">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{editingCategory ? "Edit Category" : "Add New Category"}</DialogTitle>
            <DialogDescription>
              {editingCategory ? "Update category information" : "Create a new course category"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., courses"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name *</Label>
              <Input
                id="display_name"
                value={formData.display_name || ""}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                placeholder="e.g., Courses"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Category description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.is_active ? "active" : "inactive"}
                onValueChange={(value) => {
                  const isActive = value === "active"
                  setFormData({ 
                    ...formData, 
                    is_active: isActive,
                    // 如果设置为 inactive，自动取消 featured
                    featured: isActive ? formData.featured : false
                  })
                }}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4 space-y-4">
              <h3 className="font-semibold text-sm">Hero Section Settings</h3>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="featured"
                    checked={formData.featured}
                    onChange={(e) => {
                      const featured = e.target.checked
                      setFormData({ 
                        ...formData, 
                        featured,
                        // 如果设置为 featured，必须 is_active = true
                        is_active: featured ? true : formData.is_active
                      })
                    }}
                    disabled={!formData.is_active}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="featured" className="font-normal">
                    Featured in Hero Section
                  </Label>
                </div>
                {!formData.is_active && (
                  <p className="text-xs text-muted-foreground">
                    Category must be active to be featured
                  </p>
                )}
              </div>

              {formData.featured && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="poster_upload">Poster Image</Label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor="poster_upload"
                          className="flex items-center gap-2 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Upload className="h-4 w-4" />
                          <span>{isUploading ? "Uploading..." : "Choose File"}</span>
                        </label>
                        <Input
                          id="poster_upload"
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={handleFileUpload}
                          disabled={isUploading}
                          className="hidden"
                        />
                        {isUploading && (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Recommended: 16:9 or 4:3 ratio, min 800px width. Max 5MB. JPEG, PNG, or WebP.
                      </p>
                      {(previewUrl || formData.poster_url) && (
                        <div className="mt-2 relative group">
                          <img
                            src={previewUrl || formData.poster_url || ""}
                            alt="Poster preview"
                            className="w-full h-32 object-cover rounded border"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={handleRemovePoster}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="featured_slogan">Featured Slogan</Label>
                    <Input
                      id="featured_slogan"
                      type="text"
                      value={formData.featured_slogan || ""}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value.length <= 100) {
                          setFormData({ ...formData, featured_slogan: value })
                        }
                      }}
                      placeholder="e.g., Ignite Your Future with Robotics"
                      maxLength={100}
                    />
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-muted-foreground">
                        Short, catchy slogan displayed on poster image or below title (recommended: 50-100 characters)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(formData.featured_slogan || "").length}/100
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="featured_subtitle">Featured Subtitle</Label>
                    <Input
                      id="featured_subtitle"
                      type="text"
                      value={formData.featured_subtitle || ""}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value.length <= 60) {
                          setFormData({ ...formData, featured_subtitle: value })
                        }
                      }}
                      placeholder="e.g., Learn, Build, Compete"
                      maxLength={60}
                    />
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-muted-foreground">
                        Subtitle displayed below category name (recommended: 30-60 characters)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(formData.featured_subtitle || "").length}/60
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="featured_display_order">Display Order</Label>
                    <Input
                      id="featured_display_order"
                      type="number"
                      value={formData.featured_display_order ?? 0}
                      onChange={(e) => setFormData({ ...formData, featured_display_order: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                      min="0"
                    />
                    <p className="text-xs text-muted-foreground">
                      Lower number = higher priority (displayed first)
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_order">General Display Order</Label>
              <Input
                id="display_order"
                type="number"
                value={formData.display_order ?? 0}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                placeholder="0"
                min="0"
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

