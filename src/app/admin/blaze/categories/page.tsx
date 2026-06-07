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
import { PosterUploadField } from "@/components/ui/poster-upload-field"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, MoreVertical, Edit, Trash2, Plus, Loader2, RefreshCcw, Eye, EyeOff, ArrowUp, ArrowDown, ChevronDown, ChevronRight } from "lucide-react"
import { STAGE_JOURNEY_ADMIN_LINK_HINTS } from "@/lib/stage-journey-config"
import { adminUiLabels } from "@/lib/admin-ui-labels"
import { adminToast, adminConfirm, getErrorMessage } from "@/lib/admin-toast"

interface CategoryConfigBase {
  target_age_min?: number | string
  target_age_max?: number | string
  primary_product?: string
  skill_level?: string
  [key: string]: unknown
}

interface V2Category {
  id: string
  name: string
  display_name: string
  description?: string
  poster_url?: string
  link?: string | null
  config_base: CategoryConfigBase
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
  const [isConfigBaseOpen, setIsConfigBaseOpen] = useState(false)
  const [configBaseJson, setConfigBaseJson] = useState("")
  const [configBaseError, setConfigBaseError] = useState<string | null>(null)
  
  // Franchise subscription management
  const [franchises, setFranchises] = useState<V2Franchise[]>([])
  const [selectedFranchise, setSelectedFranchise] = useState<string>("")
  const [franchiseSubscriptions, setFranchiseSubscriptions] = useState<FranchiseCategorySubscription[]>([])
  const [isSubscriptionDialogOpen, setIsSubscriptionDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"categories" | "subscriptions">("categories")
  const [posterFile, setPosterFile] = useState<File | null>(null)
  const [posterPreviewUrl, setPosterPreviewUrl] = useState<string | null>(null)

  const [formData, setFormData] = useState<Omit<V2Category, 'id' | 'created_at' | 'updated_at'>>({
    name: "",
    display_name: "",
    description: "",
    poster_url: "",
    link: "",
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
    if (!isEditDialogOpen && posterPreviewUrl) {
      URL.revokeObjectURL(posterPreviewUrl)
      setPosterPreviewUrl(null)
    }
  }, [isEditDialogOpen, posterPreviewUrl])

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
    } catch (err: unknown) {
      console.error("Error fetching categories:", err)
      setError(getErrorMessage(err) || "Failed to load categories")
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
    if (!(await adminConfirm({
      title: `Delete this ${adminUiLabels.category.singular.toLowerCase()}?`,
      description: "This will fail if there are campus subscriptions or activities using it.",
      confirmLabel: "Delete",
    }))) {
      return
    }

    try {
      const response = await fetch(`/api/admin/categories/v2/${categoryId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchCategories()
        adminToast.success(`${adminUiLabels.category.singular} deleted`)
      } else {
        const data = await response.json()
        adminToast.error(`Failed to delete ${adminUiLabels.category.singular.toLowerCase()}`, {
          description: getErrorMessage(data.error),
        })
      }
    } catch (error) {
      console.error("Error deleting category:", error)
      adminToast.error(`Failed to delete ${adminUiLabels.category.singular.toLowerCase()}`, {
        description: getErrorMessage(error),
      })
    }
  }

  const handleEdit = (category: V2Category) => {
    setEditingCategory(category)
    if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl)
    setPosterFile(null)
    setPosterPreviewUrl(null)
    const configBase = category.config_base || {}
    setFormData({
      name: category.name,
      display_name: category.display_name,
      description: category.description || "",
      poster_url: category.poster_url || "",
      link: category.link || "",
      config_base: configBase,
      display_order: category.display_order,
      is_active: category.is_active,
    })
    setConfigBaseJson(JSON.stringify(configBase, null, 2))
    setConfigBaseError(null)
    setIsConfigBaseOpen(false)
    setIsEditDialogOpen(true)
  }

  const handlePosterFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl)
    setPosterPreviewUrl(null)
    setPosterFile(file || null)
    if (file) setPosterPreviewUrl(URL.createObjectURL(file))
    e.target.value = ""
  }

  const clearPosterFile = () => {
    if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl)
    setPosterFile(null)
    setPosterPreviewUrl(null)
    if (!editingCategory) setFormData((prev) => ({ ...prev, poster_url: "" }))
  }

  const handleAdd = () => {
    setEditingCategory(null)
    if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl)
    setPosterFile(null)
    setPosterPreviewUrl(null)
    setFormData({
      name: "",
      display_name: "",
      description: "",
      poster_url: "",
      link: "",
      config_base: {},
      display_order: 0,
      is_active: true,
    })
    setConfigBaseJson("{}")
    setConfigBaseError(null)
    setIsConfigBaseOpen(false)
    setIsEditDialogOpen(true)
  }

  const handleConfigBaseChange = (value: string) => {
    setConfigBaseJson(value)
    setConfigBaseError(null)
    
    try {
      const parsed = JSON.parse(value)
      setFormData({ ...formData, config_base: parsed })
    } catch (err) {
      // JSON 无效时不更新 formData，但允许用户继续编辑
      if (value.trim() !== "") {
        setConfigBaseError("Invalid JSON format")
      }
    }
  }

  const uploadPosterFile = async (): Promise<string | null> => {
    if (!posterFile) return null
    const uploadFormData = new FormData()
    uploadFormData.append("file", posterFile)
    const res = await fetch("/api/blaze/categories/upload", {
      method: "POST",
      body: uploadFormData,
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || "Failed to upload poster")
    }
    const data = await res.json()
    return data.url ?? null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (configBaseJson.trim() !== "") {
      try {
        JSON.parse(configBaseJson)
      } catch (err) {
        setConfigBaseError("Invalid JSON format. Please fix the JSON before submitting.")
        setIsConfigBaseOpen(true)
        return
      }
    }
    
    setIsSubmitting(true)

    try {
      let configBase = {}
      if (configBaseJson.trim() !== "") {
        configBase = JSON.parse(configBaseJson)
      }

      if (editingCategory) {
        // Edit: if new file selected, upload first then PUT with poster_url
        let posterUrl: string | undefined = formData.poster_url || undefined
        if (posterFile) {
          const url = await uploadPosterFile()
          posterUrl = url ?? undefined
        }
        const submitData = {
          ...formData,
          description: formData.description || undefined,
          link: formData.link?.trim() || null,
          poster_url: posterUrl,
          config_base: configBase,
        }
        const response = await fetch(`/api/admin/categories/v2/${editingCategory.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submitData),
        })
        if (response.ok) {
          fetchCategories()
          setIsEditDialogOpen(false)
          setEditingCategory(null)
          clearPosterFile()
          adminToast.success(`${adminUiLabels.category.singular} updated`)
        } else {
          const err = await response.json()
          adminToast.error(`Failed to update ${adminUiLabels.category.singular.toLowerCase()}`, {
            description: getErrorMessage(err.error),
          })
        }
        return
      }

      // Create: save category first without poster; upload only after create succeeds
      const submitData = {
        ...formData,
        description: formData.description || undefined,
        link: formData.link?.trim() || null,
        poster_url: undefined,
        config_base: configBase,
      }
      const createRes = await fetch("/api/admin/categories/v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      })

      if (!createRes.ok) {
        const err = await createRes.json()
        adminToast.error(`Failed to create ${adminUiLabels.category.singular.toLowerCase()}`, {
          description: getErrorMessage(err.error),
        })
        return
      }

      const created = await createRes.json()
      if (posterFile) {
        try {
          const posterUrl = await uploadPosterFile()
          if (posterUrl) {
            await fetch(`/api/admin/categories/v2/${created.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ poster_url: posterUrl }),
            })
          }
        } catch (uploadErr: unknown) {
          adminToast.warning(`${adminUiLabels.category.singular} created`, {
            description: `Poster upload failed: ${getErrorMessage(uploadErr, "Unknown error")}`,
          })
        }
      }
      fetchCategories()
      setIsEditDialogOpen(false)
      setEditingCategory(null)
      clearPosterFile()
      adminToast.success(`${adminUiLabels.category.singular} created`)
    } catch (error: unknown) {
      console.error("Error saving category:", error)
      adminToast.error(`Failed to save ${adminUiLabels.category.singular.toLowerCase()}`, {
        description: getErrorMessage(error),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubscribe = async (categoryId: string) => {
    if (!selectedFranchise) {
      adminToast.warning("Select a franchise first")
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
        adminToast.success(`${adminUiLabels.category.singular} subscribed`)
      } else {
        const data = await response.json()
        adminToast.error(`Failed to subscribe ${adminUiLabels.category.singular.toLowerCase()}`, {
          description: getErrorMessage(data.error),
        })
      }
    } catch (error) {
      console.error("Error subscribing category:", error)
      adminToast.error(`Failed to subscribe ${adminUiLabels.category.singular.toLowerCase()}`, {
        description: getErrorMessage(error),
      })
    }
  }

  const handleUnsubscribe = async (subscriptionId: string, categoryId: string) => {
    if (!(await adminConfirm({
      title: "Unsubscribe from this category?",
      description: "This will fail if there are programs using it.",
      confirmLabel: "Unsubscribe",
    }))) {
      return
    }

    if (!selectedFranchise) {
      adminToast.warning("Select a franchise first")
      return
    }

    if (!categoryId) {
      adminToast.error("Invalid category ID")
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
        adminToast.success(`${adminUiLabels.category.singular} unsubscribed`)
      } else {
        const data = await response.json()
        adminToast.error(`Failed to unsubscribe ${adminUiLabels.category.singular.toLowerCase()}`, {
          description: getErrorMessage(data.error),
        })
      }
    } catch (error) {
      console.error("Error unsubscribing category:", error)
      adminToast.error(`Failed to unsubscribe ${adminUiLabels.category.singular.toLowerCase()}`, {
        description: getErrorMessage(error),
      })
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
        adminToast.error("Failed to update visibility", {
          description: getErrorMessage(data.error),
        })
      }
    } catch (error) {
      console.error("Error updating visibility:", error)
      adminToast.error("Failed to update visibility", {
        description: getErrorMessage(error),
      })
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
        adminToast.error("Failed to update display order", {
          description: getErrorMessage(data.error),
        })
      }
    } catch (error) {
      console.error("Error updating display order:", error)
      adminToast.error("Failed to update display order", {
        description: getErrorMessage(error),
      })
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
        <h1 className="text-3xl font-bold">V2 {adminUiLabels.category.plural} Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage global programs and campus subscriptions using the V2 database schema
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "categories" | "subscriptions")}>
        <TabsList className="mb-4">
          <TabsTrigger value="categories">Global {adminUiLabels.category.plural}</TabsTrigger>
          <TabsTrigger value="subscriptions">{adminUiLabels.franchise.singular} Subscriptions</TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Global {adminUiLabels.category.plural}</CardTitle>
                  <CardDescription>
                    Manage global programs (not bound to any campus)
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={`Search ${adminUiLabels.category.plural.toLowerCase()}...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Button onClick={handleAdd}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add {adminUiLabels.category.singular}
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
                  {searchQuery ? `No ${adminUiLabels.category.plural.toLowerCase()} found matching your search.` : `No ${adminUiLabels.category.plural.toLowerCase()} found.`}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Display Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Config Base</TableHead>
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
                          <TableCell>
                            {category.config_base && Object.keys(category.config_base).length > 0 ? (
                              <div className="flex flex-col gap-1">
                                <Badge variant="outline" className="font-mono text-xs w-fit">
                                  {Object.keys(category.config_base).length} fields
                                </Badge>
                                <div className="text-xs text-muted-foreground space-y-0.5">
                                  {category.config_base.target_age_min != null &&
                                    category.config_base.target_age_max != null && (
                                    <div>
                                      Age: {category.config_base.target_age_min}-
                                      {category.config_base.target_age_max}
                                    </div>
                                  )}
                                  {category.config_base.primary_product && (
                                    <div>Product: {String(category.config_base.primary_product)}</div>
                                  )}
                                  {category.config_base.skill_level && (
                                    <div>Level: {String(category.config_base.skill_level)}</div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">Empty</span>
                            )}
                          </TableCell>
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
                  <CardTitle>{adminUiLabels.franchise.singular} {adminUiLabels.category.singular} Subscriptions</CardTitle>
                  <CardDescription>
                    Manage which programs each campus subscribes to
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={selectedFranchise} onValueChange={setSelectedFranchise}>
                    <SelectTrigger className="w-[250px]">
                      <SelectValue placeholder={`Select a ${adminUiLabels.franchise.singular.toLowerCase()}`} />
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
                  Please select a {adminUiLabels.franchise.singular.toLowerCase()} to view subscriptions
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{adminUiLabels.category.singular}</TableHead>
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
                      No subscriptions yet. Subscribe to programs below.
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold mb-4">Available {adminUiLabels.category.plural} to Subscribe</h3>
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
                        All active programs are already subscribed.
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
        <DialogContent className="max-w-[95vw] sm:max-w-[800px] lg:max-w-[900px] max-h-[95vh] h-[95vh] flex flex-col p-4 sm:p-6">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{editingCategory ? `Edit ${adminUiLabels.category.singular}` : `Add New ${adminUiLabels.category.singular}`}</DialogTitle>
            <DialogDescription>
              {editingCategory ? `Update global ${adminUiLabels.category.singular.toLowerCase()} information` : `Create a new global ${adminUiLabels.category.singular.toLowerCase()}`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto pr-1 space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Identity</CardTitle>
                  <CardDescription>Internal name and display name. Name cannot be changed after creation.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().trim() })}
                        placeholder="e.g. ignitecuriosity, buildmastery, compete, innovate"
                        required
                        disabled={!!editingCategory}
                        className="font-mono"
                      />
                      <p className="text-xs text-muted-foreground">
                        Lowercase, numbers, underscores only. Unique globally. Stage journey pages use{" "}
                        <span className="font-mono">ignitecuriosity</span>,{" "}
                        <span className="font-mono">buildmastery</span>,{" "}
                        <span className="font-mono">compete</span>,{" "}
                        <span className="font-mono">innovate</span>.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="display_name">Display Name *</Label>
                      <Input
                        id="display_name"
                        value={formData.display_name}
                        onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                        placeholder="e.g. Robotics Basics, Coding Introduction"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder={`${adminUiLabels.category.singular} description`}
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="link">Link</Label>
                    <Input
                      id="link"
                      value={formData.link || ""}
                      onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                      placeholder={
                        STAGE_JOURNEY_ADMIN_LINK_HINTS[formData.name] ??
                        "e.g. /journey/ignite"
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Navbar Program item destination. Journey stages:{" "}
                      {Object.entries(STAGE_JOURNEY_ADMIN_LINK_HINTS)
                        .map(([name, path]) => `${name} → ${path}`)
                        .join("; ")}
                      . Leave empty to hide from the website navbar.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Media &amp; display</CardTitle>
                  <CardDescription>Poster image (uploaded to blob storage) and ordering in lists.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <PosterUploadField
                    id="poster_file"
                    label="Poster image"
                    hint="JPEG, PNG, WebP. Max 5MB. Upload happens only after category is saved (create or update)."
                    previewSrc={posterPreviewUrl || (editingCategory && formData.poster_url && !posterFile ? formData.poster_url : null) || null}
                    onFileChange={handlePosterFileChange}
                    onClear={clearPosterFile}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="display_order">Display Order</Label>
                      <Input
                        id="display_order"
                        type="number"
                        min={0}
                        value={formData.display_order}
                        onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value, 10) || 0 })}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="is_active">Status</Label>
                      <Select
                        value={formData.is_active ? "active" : "inactive"}
                        onValueChange={(v) => setFormData({ ...formData, is_active: v === "active" })}
                      >
                        <SelectTrigger id="is_active">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-between p-0 h-auto hover:bg-transparent"
                    onClick={() => setIsConfigBaseOpen(!isConfigBaseOpen)}
                  >
                    <div>
                      <CardTitle className="text-base">Base Configuration (config_base)</CardTitle>
                      <CardDescription className="mt-1">
                        Category-level default settings for offerings in this category.
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary">
                        {Object.keys(formData.config_base || {}).length} fields
                      </Badge>
                      {isConfigBaseOpen ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </Button>
                </CardHeader>
                {isConfigBaseOpen && (
                  <CardContent className="pt-0 border-t">
                    <div className="pt-4 space-y-2">
                      <Label htmlFor="config_base" className="text-sm font-medium">
                        JSON Configuration
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Example: {"{"}"target_age_min": 8, "target_age_max": 12, "primary_product": "VEX IQ"{"}"}
                      </p>
                      <Textarea
                        id="config_base"
                        value={configBaseJson}
                        onChange={(e) => handleConfigBaseChange(e.target.value)}
                        placeholder='{"target_age_min": 8, "target_age_max": 12, ...}'
                        rows={8}
                        className={`font-mono text-sm resize-y ${configBaseError ? "border-destructive" : ""}`}
                      />
                      {configBaseError && (
                        <p className="text-xs text-destructive">{configBaseError}</p>
                      )}
                      {!configBaseError && configBaseJson.trim() !== "" && (
                        <p className="text-xs text-green-600">✓ Valid JSON</p>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
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
                  `Update ${adminUiLabels.category.singular}`
                ) : (
                  `Create ${adminUiLabels.category.singular}`
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
