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
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Loader2,
  RefreshCcw,
  FileText,
  Book,
  Monitor,
  Upload,
  ExternalLink,
} from "lucide-react"

interface ResourceCategory {
  id: string
  name: string
  display_name: string
  description?: string
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface Resource {
  id: string
  resource_category_id: string
  title: string
  description?: string
  icon?: string
  icon_color?: string
  document_url?: string
  document_label?: string
  open_in_new_tab: boolean
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  resource_category?: { id: string; name: string; display_name: string }
}

const ICON_OPTIONS = [
  { value: "monitor", label: "Monitor (Software)", Icon: Monitor },
  { value: "book", label: "Book (Manual)", Icon: Book },
  { value: "file-text", label: "File (Document)", Icon: FileText },
]

export default function BlazeResourcesManagementPage() {
  const [categories, setCategories] = useState<ResourceCategory[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("")
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [isLoadingResources, setIsLoadingResources] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Category dialog
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ResourceCategory | null>(null)
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    display_name: "",
    description: "",
    display_order: 0,
    is_active: true,
  })
  const [isCategorySubmitting, setIsCategorySubmitting] = useState(false)

  // Resource dialog
  const [isResourceDialogOpen, setIsResourceDialogOpen] = useState(false)
  const [editingResource, setEditingResource] = useState<Resource | null>(null)
  const [resourceForm, setResourceForm] = useState({
    resource_category_id: "",
    title: "",
    description: "",
    icon: "file-text",
    icon_color: "",
    document_url: "",
    document_label: "Download",
    open_in_new_tab: true,
    display_order: 0,
    is_active: true,
  })
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [isUploadingDoc, setIsUploadingDoc] = useState(false)
  const [isResourceSubmitting, setIsResourceSubmitting] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    if (selectedCategoryId) {
      fetchResources(selectedCategoryId)
    } else {
      setResources([])
    }
  }, [selectedCategoryId])

  const fetchCategories = async () => {
    setIsLoadingCategories(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/resources/v2/categories?includeInactive=true")
      if (!res.ok) throw new Error("Failed to fetch categories")
      const data = await res.json()
      setCategories(data || [])
      if (data?.length && !selectedCategoryId) {
        setSelectedCategoryId(data[0].id)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load categories")
    } finally {
      setIsLoadingCategories(false)
    }
  }

  const fetchResources = async (categoryId: string) => {
    setIsLoadingResources(true)
    try {
      const res = await fetch(
        `/api/admin/resources/v2?category_id=${categoryId}&includeInactive=true`
      )
      if (!res.ok) throw new Error("Failed to fetch resources")
      const data = await res.json()
      setResources(data || [])
    } catch (e) {
      console.error(e)
      setResources([])
    } finally {
      setIsLoadingResources(false)
    }
  }

  const openCategoryDialog = (cat?: ResourceCategory) => {
    setEditingCategory(cat ?? null)
    if (cat) {
      setCategoryForm({
        name: cat.name,
        display_name: cat.display_name,
        description: cat.description || "",
        display_order: cat.display_order,
        is_active: cat.is_active,
      })
    } else {
      setCategoryForm({
        name: "",
        display_name: "",
        description: "",
        display_order: categories.length,
        is_active: true,
      })
    }
    setIsCategoryDialogOpen(true)
  }

  const saveCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCategorySubmitting(true)
    try {
      const url = editingCategory
        ? `/api/admin/resources/v2/categories/${editingCategory.id}`
        : "/api/admin/resources/v2/categories"
      const method = editingCategory ? "PUT" : "POST"
      const body = editingCategory
        ? {
            display_name: categoryForm.display_name,
            description: categoryForm.description || null,
            display_order: categoryForm.display_order,
            is_active: categoryForm.is_active,
          }
        : {
            name: categoryForm.name,
            display_name: categoryForm.display_name,
            description: categoryForm.description || null,
            display_order: categoryForm.display_order,
            is_active: categoryForm.is_active,
          }
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || "Failed to save category")
        return
      }
      await fetchCategories()
      setIsCategoryDialogOpen(false)
      setEditingCategory(null)
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setIsCategorySubmitting(false)
    }
  }

  const deleteCategory = async (id: string) => {
    if (!confirm("Delete this category? This will fail if it has resources.")) return
    try {
      const res = await fetch(`/api/admin/resources/v2/categories/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || "Failed to delete")
        return
      }
      await fetchCategories()
      if (selectedCategoryId === id) setSelectedCategoryId("")
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete")
    }
  }

  const openResourceDialog = (resource?: Resource) => {
    setEditingResource(resource ?? null)
    setDocumentFile(null)
    if (resource) {
      setResourceForm({
        resource_category_id: resource.resource_category_id,
        title: resource.title,
        description: resource.description || "",
        icon: resource.icon || "file-text",
        icon_color: resource.icon_color || "",
        document_url: resource.document_url || "",
        document_label: resource.document_label || "Download",
        open_in_new_tab: resource.open_in_new_tab,
        display_order: resource.display_order,
        is_active: resource.is_active,
      })
    } else {
      setResourceForm({
        resource_category_id: selectedCategoryId || categories[0]?.id || "",
        title: "",
        description: "",
        icon: "file-text",
        icon_color: "",
        document_url: "",
        document_label: "Download",
        open_in_new_tab: true,
        display_order: resources.length,
        is_active: true,
      })
    }
    setIsResourceDialogOpen(true)
  }

  const uploadDocument = async (): Promise<string | null> => {
    if (!documentFile) return null
    setIsUploadingDoc(true)
    try {
      const form = new FormData()
      form.append("file", documentFile)
      const res = await fetch("/api/admin/resources/v2/upload", {
        method: "POST",
        body: form,
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Upload failed")
      }
      const data = await res.json()
      return data.url ?? null
    } finally {
      setIsUploadingDoc(false)
    }
  }

  const saveResource = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsResourceSubmitting(true)
    try {
      let documentUrl = resourceForm.document_url?.trim() || null
      if (documentFile) {
        const url = await uploadDocument()
        if (url) documentUrl = url
      }
      const body = {
        ...resourceForm,
        document_url: documentUrl,
        description: resourceForm.description || null,
        icon_color: resourceForm.icon_color || null,
      }
      const url = editingResource
        ? `/api/admin/resources/v2/${editingResource.id}`
        : "/api/admin/resources/v2"
      const method = editingResource ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || "Failed to save resource")
        return
      }
      if (selectedCategoryId) await fetchResources(selectedCategoryId)
      setIsResourceDialogOpen(false)
      setEditingResource(null)
      setDocumentFile(null)
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setIsResourceSubmitting(false)
    }
  }

  const deleteResource = async (id: string) => {
    if (!confirm("Delete this resource?")) return
    try {
      const res = await fetch(`/api/admin/resources/v2/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || "Failed to delete")
        return
      }
      if (selectedCategoryId) await fetchResources(selectedCategoryId)
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete")
    }
  }

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Resources Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage resource categories and entries shown on the public /resources page.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Categories */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Categories</CardTitle>
                <CardDescription>Group resources by category</CardDescription>
              </div>
              <Button size="sm" onClick={() => openCategoryDialog()}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingCategories ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-center py-4">
                <p className="text-sm text-destructive mb-2">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchCategories}>
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            ) : categories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No categories. Add one to get started.
              </p>
            ) : (
              <div className="space-y-1">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                      selectedCategoryId === cat.id
                        ? "bg-primary/10 border-primary"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedCategoryId(cat.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{cat.display_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{cat.name}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openCategoryDialog(cat)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteCategory(cat.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resources in selected category */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {selectedCategory
                    ? `Resources: ${selectedCategory.display_name}`
                    : "Resources"}
                </CardTitle>
                <CardDescription>
                  {selectedCategoryId
                    ? "Add and edit resources in this category"
                    : "Select a category to manage resources"}
                </CardDescription>
              </div>
              {selectedCategoryId && (
                <Button size="sm" onClick={() => openResourceDialog()}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Resource
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedCategoryId ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Select a category from the list.
              </p>
            ) : isLoadingResources ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : resources.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No resources in this category. Add one to get started.
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Icon</TableHead>
                      <TableHead>Document</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resources.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <p className="font-medium">{r.title}</p>
                          {r.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {r.description}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {r.icon || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {r.document_url ? (
                            <a
                              href={r.document_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary text-xs flex items-center gap-1 hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Link
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>{r.display_order}</TableCell>
                        <TableCell>
                          <Badge variant={r.is_active ? "default" : "secondary"}>
                            {r.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openResourceDialog(r)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => deleteResource(r.id)}
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
      </div>

      {/* Category dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Update category display and order."
                : "Create a new resource category."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveCategory} className="space-y-4">
            {!editingCategory && (
              <div className="space-y-2">
                <Label htmlFor="cat-name">Name *</Label>
                <Input
                  id="cat-name"
                  value={categoryForm.name}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, name: e.target.value.toLowerCase().replace(/\s+/g, "_") })
                  }
                  placeholder="e.g. software_tools"
                  required
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">Lowercase, numbers, underscores only.</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="cat-display_name">Display Name *</Label>
              <Input
                id="cat-display_name"
                value={categoryForm.display_name}
                onChange={(e) => setCategoryForm({ ...categoryForm, display_name: e.target.value })}
                placeholder="e.g. Software & Tools"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-description">Description</Label>
              <Textarea
                id="cat-description"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Optional"
                rows={2}
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="space-y-2 flex-1">
                <Label htmlFor="cat-order">Display Order</Label>
                <Input
                  id="cat-order"
                  type="number"
                  min={0}
                  value={categoryForm.display_order}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, display_order: parseInt(e.target.value, 10) || 0 })
                  }
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Checkbox
                  id="cat-active"
                  checked={categoryForm.is_active}
                  onCheckedChange={(v) => setCategoryForm({ ...categoryForm, is_active: !!v })}
                />
                <Label htmlFor="cat-active">Active (show on site)</Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCategoryDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCategorySubmitting}>
                {isCategorySubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingCategory ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Resource dialog */}
      <Dialog open={isResourceDialogOpen} onOpenChange={setIsResourceDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingResource ? "Edit Resource" : "Add Resource"}</DialogTitle>
            <DialogDescription>
              {editingResource
                ? "Update resource and document link."
                : "Add a new resource with optional document."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveResource} className="space-y-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={resourceForm.resource_category_id}
                onValueChange={(v) =>
                  setResourceForm({ ...resourceForm, resource_category_id: v })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="res-title">Title *</Label>
              <Input
                id="res-title"
                value={resourceForm.title}
                onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })}
                placeholder="e.g. VEXcode IQ"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="res-desc">Description</Label>
              <Textarea
                id="res-desc"
                value={resourceForm.description}
                onChange={(e) => setResourceForm({ ...resourceForm, description: e.target.value })}
                placeholder="Short description"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Icon</Label>
                <Select
                  value={resourceForm.icon}
                  onValueChange={(v) => setResourceForm({ ...resourceForm, icon: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-2">
                          <opt.Icon className="h-4 w-4" />
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="res-icon-color">Icon Color (e.g. blue-500)</Label>
                <Input
                  id="res-icon-color"
                  value={resourceForm.icon_color}
                  onChange={(e) => setResourceForm({ ...resourceForm, icon_color: e.target.value })}
                  placeholder="blue-500"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Document (upload or URL)</Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    setDocumentFile(f || null)
                    if (f) setResourceForm((prev) => ({ ...prev, document_url: "" }))
                  }}
                  className="max-w-[200px]"
                />
                {documentFile && (
                  <span className="text-sm text-muted-foreground self-center truncate max-w-[120px]">
                    {documentFile.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Or paste URL below (overwritten if you upload a file).</p>
              <Input
                value={resourceForm.document_url}
                onChange={(e) => setResourceForm({ ...resourceForm, document_url: e.target.value })}
                placeholder="https://..."
                disabled={!!documentFile}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="res-doc-label">Button Label</Label>
              <Input
                id="res-doc-label"
                value={resourceForm.document_label}
                onChange={(e) => setResourceForm({ ...resourceForm, document_label: e.target.value })}
                placeholder="Download"
              />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="res-new-tab"
                  checked={resourceForm.open_in_new_tab}
                  onCheckedChange={(v) =>
                    setResourceForm({ ...resourceForm, open_in_new_tab: !!v })
                  }
                />
                <Label htmlFor="res-new-tab">Open in new tab</Label>
              </div>
              <div className="space-y-2 w-24">
                <Label htmlFor="res-order">Order</Label>
                <Input
                  id="res-order"
                  type="number"
                  min={0}
                  value={resourceForm.display_order}
                  onChange={(e) =>
                    setResourceForm({
                      ...resourceForm,
                      display_order: parseInt(e.target.value, 10) || 0,
                    })
                  }
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Checkbox
                  id="res-active"
                  checked={resourceForm.is_active}
                  onCheckedChange={(v) => setResourceForm({ ...resourceForm, is_active: !!v })}
                />
                <Label htmlFor="res-active">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsResourceDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isResourceSubmitting || isUploadingDoc}>
                {(isResourceSubmitting || isUploadingDoc) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingResource ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
