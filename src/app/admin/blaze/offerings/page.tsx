'use client'

import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
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
import { MarkdownEditField } from "@/components/ui/markdown-edit-field"
import { PosterUploadField } from "@/components/ui/poster-upload-field"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, MoreVertical, Edit, Trash2, Plus, Loader2, RefreshCcw } from "lucide-react"
import { toast } from "sonner"

type SchemaFieldConfig = {
  type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'array' | 'date' | 'time'
  label?: string
  required?: boolean
  default?: any
  min?: number
  max?: number
  step?: number
  placeholder?: string
  description?: string
  multiline?: boolean
  options?: string[]
  items?: { type: string }
  display_scope?: 'admin' | 'web' | 'both'
  condition?: {
    field: string
    equals?: any
    in?: any[]
  }
}

interface V2Offering {
  id: string
  name: string
  slug?: string | null
  description?: string | null
  target_audience?: string | null
  learning_outcomes?: string | null
  prerequisites?: string | null
  base_price?: number | null
  currency: string
  poster_url?: string | null
  offering_type_id: string
  type_config?: Record<string, any>
  type_config_data?: Record<string, any>
  status: 'draft' | 'published' | 'suspended' | 'archived'
  created_at: string
  updated_at: string
  category_id?: string | null
  category?: {
    id: string
    name: string
    display_name: string
  } | null
  offering_type?: {
    id: string
    code: string
    name: string
    description?: string | null
    icon?: string | null
    color?: string | null
    is_active: boolean
    offering_schema?: { fields?: Record<string, SchemaFieldConfig> }
  }
}

interface V2OfferingType {
  id: string
  code: string
  name: string
  description?: string | null
  icon?: string | null
  color?: string | null
  is_active: boolean
  offering_schema?: { fields?: Record<string, SchemaFieldConfig> }
}

export default function BlazeOfferingsManagementPage() {
  const [offerings, setOfferings] = useState<V2Offering[]>([])
  const [filteredOfferings, setFilteredOfferings] = useState<V2Offering[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [editingOffering, setEditingOffering] = useState<V2Offering | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [offeringTypes, setOfferingTypes] = useState<V2OfferingType[]>([])
  const [isLoadingTypes, setIsLoadingTypes] = useState(true)
  const [selectedOfferingType, setSelectedOfferingType] = useState<V2OfferingType | null>(null)
  const [typeConfigData, setTypeConfigData] = useState<Record<string, any>>({})
  const [isUploadingPoster, setIsUploadingPoster] = useState(false)
  const [posterPreviewUrl, setPosterPreviewUrl] = useState<string | null>(null)
  const [posterFile, setPosterFile] = useState<File | null>(null)
  const [uploadedPosterUrl, setUploadedPosterUrl] = useState<string | null>(null)

  const [categories, setCategories] = useState<Array<{ id: string; name: string; display_name: string; is_active?: boolean }>>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)

  const [formData, setFormData] = useState<{
    name: string
    slug: string
    description: string
    poster_url: string
    category_id: string
    offering_type_id: string
    status: V2Offering['status']
  }>({
    name: "",
    slug: "",
    description: "",
    poster_url: "",
    category_id: "",
    offering_type_id: "",
    status: "draft",
  })

  useEffect(() => {
    fetchOfferings()
    fetchOfferingTypes()
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setIsLoadingCategories(true)
      const response = await fetch("/api/admin/categories/v2?includeInactive=true")
      if (!response.ok) {
        throw new Error("Failed to fetch categories")
      }
      const data = await response.json()
      setCategories(data || [])
    } catch (err) {
      console.error("Error fetching categories:", err)
    } finally {
      setIsLoadingCategories(false)
    }
  }

  useEffect(() => {
    let filtered = offerings

    if (searchQuery) {
      filtered = filtered.filter(
        (offering) =>
          offering.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          offering.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          offering.slug?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          offering.offering_type?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((offering) => offering.status === statusFilter)
    }

    setFilteredOfferings(filtered)
  }, [searchQuery, statusFilter, offerings])

  const fetchOfferings = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch("/api/admin/offering/v2?includeInactive=true")
      
      if (!response.ok) {
        throw new Error("Failed to fetch offerings")
      }

      const data = await response.json()
      setOfferings(data)
      setFilteredOfferings(data)
    } catch (err: any) {
      console.error("Error fetching offerings:", err)
      setError(err.message || "Failed to load offerings")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchOfferingTypes = async () => {
    try {
      setIsLoadingTypes(true)
      const response = await fetch("/api/admin/offering-types/v2?includeInactive=true")
      if (!response.ok) {
        throw new Error("Failed to fetch offering types")
      }
      const data = await response.json()
      setOfferingTypes(data || [])
    } catch (err) {
      console.error("Error fetching offering types:", err)
    } finally {
      setIsLoadingTypes(false)
    }
  }

  // 当选择 offering_type_id 时，获取对应的 offering_type 和 schema
  useEffect(() => {
    if (formData.offering_type_id) {
      const type = offeringTypes.find(t => t.id === formData.offering_type_id)
      if (type) {
        setSelectedOfferingType(type)
        // 初始化 type_config_data 的默认值
        if (type.offering_schema?.fields) {
          const defaults: Record<string, any> = {}
          Object.entries(type.offering_schema.fields).forEach(([fieldName, fieldConfig]) => {
            if (fieldConfig.default !== undefined) {
              defaults[fieldName] = fieldConfig.default
            }
          })
          setTypeConfigData(prev => ({ ...defaults, ...prev }))
        } else {
          setTypeConfigData({})
        }
      } else {
        setSelectedOfferingType(null)
        setTypeConfigData({})
      }
    } else {
      setSelectedOfferingType(null)
      setTypeConfigData({})
    }
  }, [formData.offering_type_id, offeringTypes])

  // 按 Offering Type -> Offerings 分组
  const groupedOfferings = useMemo(() => {
    const groups: Record<string, V2Offering[]> = {}
    
    filteredOfferings.forEach((offering) => {
      const typeId = offering.offering_type_id
      const typeName = offering.offering_type?.name || 'Unknown Type'
      const typeKey = `${typeId}|${typeName}`
      
      if (!groups[typeKey]) {
        groups[typeKey] = []
      }
      
      groups[typeKey].push(offering)
    })
    
    return groups
  }, [filteredOfferings])

  const handleDelete = async (offeringId: string) => {
    const offering = offerings.find(o => o.id === offeringId)
    if (!offering) return

    if (offering.status !== 'draft') {
      toast.error("Cannot delete offering", {
        description: `Only draft offerings can be deleted. Current status: ${offering.status}.`,
      })
      return
    }

    if (!confirm(`Are you sure you want to delete "${offering.name}"? This will fail if there are instances using this offering.`)) {
      return
    }

    const deletePromise = fetch(`/api/admin/offering/v2/${offeringId}`, {
      method: "DELETE",
    }).then(async (response) => {
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete offering")
      }
      return response
    })

    toast.promise(deletePromise, {
      loading: "Deleting offering...",
      success: () => {
        fetchOfferings()
        return "Offering deleted successfully"
      },
      error: (err: Error) => err.message || "Failed to delete offering",
    })
  }

  const handleEdit = async (offering: V2Offering) => {
    if (offering.status === 'archived') {
      toast.error("Cannot edit archived offerings.")
      return
    }
    setEditingOffering(offering)
    
    // 获取完整的 offering 数据（包含 category_id）
    let categoryId = ""
    try {
      const response = await fetch(`/api/admin/offering/v2/${offering.id}`)
      if (response.ok) {
        const fullOffering = await response.json()
        categoryId = fullOffering.category_id || ""
      }
    } catch (err) {
      console.error("Error fetching full offering:", err)
    }
    
    setFormData({
      name: offering.name,
      slug: offering.slug || "",
      description: offering.description || "",
      poster_url: offering.poster_url || "",
      category_id: categoryId,
      offering_type_id: offering.offering_type_id,
      status: offering.status,
    })
    setPosterPreviewUrl(offering.poster_url || null)
    setPosterFile(null)
    setUploadedPosterUrl(null)
    
    // 获取完整的 offering 数据（包含 offering_type 和 offering_schema）
    try {
      const response = await fetch(`/api/admin/offering/v2/${offering.id}`)
      if (response.ok) {
        const fullOffering = await response.json()
        const fromConfig = fullOffering.type_config_data ?? fullOffering.type_config ?? {}
        const legacy = {
          ...(fullOffering.base_price != null && fromConfig.base_price === undefined ? { base_price: fullOffering.base_price } : {}),
          ...(fullOffering.currency && fromConfig.currency === undefined ? { currency: fullOffering.currency } : {}),
          ...(fullOffering.target_audience != null && fromConfig.target_audience === undefined ? { target_audience: fullOffering.target_audience } : {}),
          ...(fullOffering.learning_outcomes != null && fromConfig.learning_outcomes === undefined ? { learning_outcomes: fullOffering.learning_outcomes } : {}),
          ...(fullOffering.prerequisites != null && fromConfig.prerequisites === undefined ? { prerequisites: fullOffering.prerequisites } : {}),
        }
        setTypeConfigData({ ...legacy, ...fromConfig })
        // 设置 selectedOfferingType（包含 offering_schema）
        if (fullOffering.offering_type) {
          const type = offeringTypes.find(t => t.id === fullOffering.offering_type.id)
          if (type) {
            setSelectedOfferingType({
              ...type,
              offering_schema: fullOffering.offering_type.offering_schema
            })
          }
        }
      }
    } catch (err) {
      console.error("Error fetching full offering:", err)
      setTypeConfigData(offering.type_config_data || offering.type_config || {})
    }
    
    setIsEditDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingOffering(null)
    setFormData({
      name: "",
      slug: "",
      description: "",
      poster_url: "",
      category_id: "",
      offering_type_id: "",
      status: "draft",
    })
    setTypeConfigData({})
    setPosterPreviewUrl(null)
    setPosterFile(null)
    setUploadedPosterUrl(null)
    setIsEditDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    let uploadedPosterUrlToCleanup: string | null = null

    try {
      // 如果有新选择的文件，先上传 poster
      if (posterFile) {
        setIsUploadingPoster(true)
        const uploadFormData = new FormData()
        uploadFormData.append("file", posterFile)

        const uploadResponse = await fetch("/api/admin/offering/v2/upload", {
          method: "POST",
          body: uploadFormData,
        })

        const uploadData = await uploadResponse.json()

        if (!uploadResponse.ok) {
          setIsUploadingPoster(false)
          setError(uploadData.error || "Failed to upload poster")
          return
        }

        uploadedPosterUrlToCleanup = uploadData.url
        setUploadedPosterUrl(uploadData.url)
        setIsUploadingPoster(false)
      }

      const submitData = {
        name: formData.name,
        slug: formData.slug || undefined,
        description: formData.description || undefined,
        poster_url: uploadedPosterUrlToCleanup || formData.poster_url || undefined,
        category_id: formData.category_id || undefined,
        offering_type_id: formData.offering_type_id,
        status: formData.status,
        type_config_data: typeConfigData,
      }

      const url = editingOffering
        ? `/api/admin/offering/v2/${editingOffering.id}`
        : "/api/admin/offering/v2"
      const method = editingOffering ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      })

      if (response.ok) {
        fetchOfferings()
        setIsEditDialogOpen(false)
        setEditingOffering(null)
        // 清理预览 URL
        if (posterPreviewUrl && posterPreviewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(posterPreviewUrl)
        }
        setPosterPreviewUrl(null)
        setPosterFile(null)
        setUploadedPosterUrl(null)
      } else {
        // 如果创建失败，删除已上传的 poster
        if (uploadedPosterUrlToCleanup) {
          try {
            await fetch(`/api/admin/offering/v2/upload?url=${encodeURIComponent(uploadedPosterUrlToCleanup)}`, {
              method: "DELETE",
            })
          } catch (deleteError) {
            console.error("Failed to cleanup uploaded poster:", deleteError)
          }
          setUploadedPosterUrl(null)
        }
        const error = await response.json()
        toast.error(error.error || "Failed to save offering")
      }
    } catch (error) {
      // 如果发生错误，删除已上传的 poster
      if (uploadedPosterUrlToCleanup) {
        try {
          await fetch(`/api/admin/offering/v2/upload?url=${encodeURIComponent(uploadedPosterUrlToCleanup)}`, {
            method: "DELETE",
          })
        } catch (deleteError) {
          console.error("Failed to cleanup uploaded poster:", deleteError)
        }
        setUploadedPosterUrl(null)
      }
      console.error("Error saving offering:", error)
      toast.error("Failed to save offering")
    } finally {
      setIsSubmitting(false)
      setIsUploadingPoster(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
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

    setError(null)

    // 清理之前的预览 URL
    if (posterPreviewUrl && posterPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(posterPreviewUrl)
    }

    // 创建预览 URL（不上传，只预览）
    const localPreviewUrl = URL.createObjectURL(file)
    setPosterPreviewUrl(localPreviewUrl)
    setPosterFile(file)
    // 清除之前上传的 URL（如果有）
    setUploadedPosterUrl(null)
    event.target.value = ""
  }

  const handleRemovePoster = () => {
    setFormData({ ...formData, poster_url: "" })
    if (posterPreviewUrl) {
      if (posterPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(posterPreviewUrl)
      }
      setPosterPreviewUrl(null)
    }
    setPosterFile(null)
    setUploadedPosterUrl(null)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusBackgroundColor = (status: V2Offering['status']): string => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 dark:bg-gray-800'
      case 'published':
        return 'bg-green-50 dark:bg-green-900/20'
      case 'suspended':
        return 'bg-orange-50 dark:bg-orange-900/20'
      case 'archived':
        return 'bg-purple-50 dark:bg-purple-900/20'
      default:
        return 'bg-gray-50 dark:bg-gray-900'
    }
  }

  // 不同 category 使用不同颜色的 Badge（按 category id 稳定映射）
  const categoryBadgeColors = [
    'border-violet-500/60 bg-violet-500/10 text-violet-700 dark:text-violet-300 dark:bg-violet-500/20 dark:border-violet-400/60',
    'border-blue-500/60 bg-blue-500/10 text-blue-700 dark:text-blue-300 dark:bg-blue-500/20 dark:border-blue-400/60',
    'border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 dark:bg-emerald-500/20 dark:border-emerald-400/60',
    'border-amber-500/60 bg-amber-500/10 text-amber-700 dark:text-amber-300 dark:bg-amber-500/20 dark:border-amber-400/60',
    'border-rose-500/60 bg-rose-500/10 text-rose-700 dark:text-rose-300 dark:bg-rose-500/20 dark:border-rose-400/60',
    'border-cyan-500/60 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 dark:bg-cyan-500/20 dark:border-cyan-400/60',
    'border-fuchsia-500/60 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300 dark:bg-fuchsia-500/20 dark:border-fuchsia-400/60',
    'border-teal-500/60 bg-teal-500/10 text-teal-700 dark:text-teal-300 dark:bg-teal-500/20 dark:border-teal-400/60',
  ]
  const getCategoryBadgeClassName = (categoryId: string) => {
    let n = 0
    for (let i = 0; i < categoryId.length; i++) n = (n * 31 + categoryId.charCodeAt(i)) >>> 0
    return categoryBadgeColors[n % categoryBadgeColors.length]
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">V2 Offerings Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage offerings (global product definitions) using the V2 database schema
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search offerings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add Offering
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
              <Button onClick={fetchOfferings}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : filteredOfferings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery || statusFilter !== "all" 
                ? "No offerings found matching your filters." 
                : "No offerings found."}
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedOfferings).map(([typeKey, typeOfferings]) => {
                const [typeId, typeName] = typeKey.split('|')
                
                return (
                  <Card key={typeId} className={getStatusBackgroundColor('published')}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-semibold">
                          {typeName}
                        </CardTitle>
                        <Badge variant="secondary" className="text-sm">
                          {typeOfferings.length} Offering{typeOfferings.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {typeOfferings.map((offering) => {
                          const slugText = offering.slug ? `Slug: ${offering.slug}` : ''
                          
                          return (
                            <div
                              key={offering.id}
                              className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                                    <span className="font-medium">{offering.name}</span>
                                    {offering.category && (
                                      <Badge
                                        variant="outline"
                                        className={`text-xs ${getCategoryBadgeClassName(offering.category.id)}`}
                                      >
                                        {offering.category.display_name || offering.category.name}
                                      </Badge>
                                    )}
                                    <Badge
                                      variant={
                                        offering.status === 'published' ? 'default' :
                                        offering.status === 'draft' ? 'secondary' :
                                        offering.status === 'suspended' ? 'destructive' :
                                        'outline'
                                      }
                                      className="text-xs"
                                    >
                                      {offering.status === 'published' ? 'Published' :
                                       offering.status === 'draft' ? 'Draft' :
                                       offering.status === 'suspended' ? 'Suspended' :
                                       'Archived'}
                                    </Badge>
                                  </div>
                                  {(slugText || offering.description) && (
                                    <div className="text-xs text-muted-foreground space-y-1">
                                      {slugText && <div>{slugText}</div>}
                                      {offering.description && (
                                        <div className="line-clamp-2">{offering.description}</div>
                                      )}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                    {(offering.type_config_data?.base_price ?? offering.base_price) != null && (
                                      <span>{(offering.type_config_data?.currency ?? offering.currency) || 'USD'} ${Number(offering.type_config_data?.base_price ?? offering.base_price).toFixed(2)}</span>
                                    )}
                                    <span>Created: {formatDate(offering.created_at)}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {offering.poster_url && (
                                    <div className="relative w-16 h-16 rounded overflow-hidden border">
                                      <Image
                                        src={offering.poster_url}
                                        alt={offering.name}
                                        fill
                                        className="object-cover"
                                        sizes="64px"
                                      />
                                    </div>
                                  )}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleEdit(offering)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                      </DropdownMenuItem>
                                      {offering.status === 'draft' && (
                                        <DropdownMenuItem
                                          className="text-destructive"
                                          onClick={() => handleDelete(offering.id)}
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Delete
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog 
        open={isEditDialogOpen} 
        onOpenChange={(open) => {
          setIsEditDialogOpen(open)
          if (!open) {
            // 清理预览 URL 当对话框关闭时
            if (posterPreviewUrl && posterPreviewUrl.startsWith('blob:')) {
              URL.revokeObjectURL(posterPreviewUrl)
            }
            setPosterPreviewUrl(null)
          }
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-[800px] lg:max-w-[900px] max-h-[95vh] h-[95vh] flex flex-col p-4 sm:p-6">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{editingOffering ? "Edit Offering" : "Add New Offering"}</DialogTitle>
            <DialogDescription>
              {editingOffering ? "Update offering information" : "Create a new offering (global product definition)"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto pr-1">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="config">Configuration</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="mt-4">
                  <div className="space-y-4">
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm font-medium">Category &amp; type</CardTitle>
                        <CardDescription className="text-xs">Category and offering type cannot be changed after creation.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-0">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="category_id" className="text-xs">Category *</Label>
                            <Select value={formData.category_id || ""} onValueChange={(value) => setFormData({ ...formData, category_id: value })} required disabled={isLoadingCategories || !!editingOffering}>
                              <SelectTrigger id="category_id" className="h-9">
                                <SelectValue placeholder={isLoadingCategories ? "Loading..." : "Select category"} />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.filter((cat: { id: string; name: string; display_name: string; is_active?: boolean }) => cat.is_active !== false).map((category) => (
                                  <SelectItem key={category.id} value={category.id}>{category.display_name} ({category.name})</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="offering_type_id" className="text-xs">Offering Type *</Label>
                            <Select value={formData.offering_type_id} onValueChange={(value) => setFormData({ ...formData, offering_type_id: value })} required disabled={!!editingOffering}>
                              <SelectTrigger id="offering_type_id" className="h-9">
                                <SelectValue placeholder={isLoadingTypes ? "Loading..." : "Select type"} />
                              </SelectTrigger>
                              <SelectContent>
                                {offeringTypes.filter(type => type.is_active).map((type) => (
                                  <SelectItem key={type.id} value={type.id}>{type.name} ({type.code})</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="name" className="text-xs">Name *</Label>
                            <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Introduction to Robotics" required className="h-9 text-sm" />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="slug" className="text-xs">Slug</Label>
                            <Input id="slug" value={formData.slug || ""} onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} placeholder="introduction-to-robotics" className="h-9 text-sm font-mono" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm font-medium">Description &amp; poster</CardTitle>
                        <CardDescription className="text-xs">Admin-only note for this offering. Not shown on C-end; C-end content (e.g. description, price, audience) is configured in the Configuration tab from offering_schema.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-0">
                        <MarkdownEditField
                          id="description"
                          label="Description (admin only)"
                          value={formData.description || ""}
                          onChange={(v) => setFormData({ ...formData, description: v })}
                          placeholder="Internal note or reminder for admins about this offering."
                          rows={3}
                          disabled={isSubmitting}
                          hint="For admin use only; not displayed on the public site."
                        />
                        <div className="space-y-1.5">
                          <PosterUploadField
                            id="poster_file"
                            label="Poster"
                            hint="JPG, PNG, WebP, max 5MB."
                            previewSrc={posterPreviewUrl || formData.poster_url || null}
                            onFileChange={handleFileSelect}
                            onClear={handleRemovePoster}
                            disabled={isUploadingPoster || isSubmitting}
                            isLoading={isUploadingPoster}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm font-medium">Status</CardTitle>
                        <CardDescription className="text-xs">Only published offerings are visible to users and can have instances.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-0">
                        <div className="space-y-1.5">
                          <Label htmlFor="status" className="text-xs">Status</Label>
                          <Select value={formData.status} onValueChange={(value: V2Offering['status']) => setFormData({ ...formData, status: value })}>
                            <SelectTrigger id="status" className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="published">Published</SelectItem>
                              <SelectItem value="suspended">Suspended</SelectItem>
                              <SelectItem value="archived">Archived</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="config" className="mt-4">
                  {!formData.offering_type_id ? (
                    <div className="rounded-lg border border-dashed bg-muted/30 py-10 text-center text-sm text-muted-foreground">
                      Select an offering type in Basic Info to configure type-specific fields.
                    </div>
                  ) : !selectedOfferingType?.offering_schema?.fields || Object.keys(selectedOfferingType.offering_schema.fields).length === 0 ? (
                    <div className="rounded-lg border border-dashed bg-muted/30 py-10 px-4 text-center text-sm text-muted-foreground space-y-2">
                      <p>This offering type has no <code className="text-xs bg-muted px-1 rounded">offering_schema</code> configured.</p>
                      <p>Please configure it in <a href="/admin/blaze/offering-types" className="text-primary underline">Offering Type management</a> first, then edit this type of offering.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Type-specific fields for <strong>{selectedOfferingType.name}</strong> (from offering_schema)
                      </p>
                      <div className="rounded-md border bg-muted/20 p-3 space-y-3">
                        {Object.entries(selectedOfferingType.offering_schema.fields)
                          .filter(([, fieldConfig]) => {
                            const scope = fieldConfig.display_scope ?? 'admin'
                            return scope === 'admin' || scope === 'both'
                          })
                          .map(([fieldName, fieldConfig]) => {
                          const cond = fieldConfig.condition
                          if (cond) {
                            const conditionValue = typeConfigData[cond.field]
                            if (cond.equals !== undefined && conditionValue !== cond.equals) return null
                            if (cond.in && Array.isArray(cond.in) && !cond.in.includes(conditionValue)) return null
                          }
                          const fieldValue = typeConfigData[fieldName] ?? fieldConfig.default ?? ''

                          return (
                            <div key={fieldName} className="space-y-1.5">
                              <Label htmlFor={`config_${fieldName}`} className="text-xs">
                                {fieldConfig.label || fieldName}
                                {fieldConfig.required && <span className="text-red-500 ml-0.5">*</span>}
                              </Label>
                              {fieldConfig.type === 'text' && (
                                fieldConfig.multiline ? (
                                  <Textarea id={`config_${fieldName}`} value={fieldValue} onChange={(e) => setTypeConfigData({ ...typeConfigData, [fieldName]: e.target.value })} placeholder={fieldConfig.placeholder} rows={2} className="text-sm resize-none min-h-[52px]" required={fieldConfig.required} />
                                ) : (
                                  <Input id={`config_${fieldName}`} value={fieldValue} onChange={(e) => setTypeConfigData({ ...typeConfigData, [fieldName]: e.target.value })} placeholder={fieldConfig.placeholder} required={fieldConfig.required} className="h-9 text-sm" />
                                )
                              )}
                              {fieldConfig.type === 'number' && (
                                <Input id={`config_${fieldName}`} type="number" value={fieldValue} onChange={(e) => setTypeConfigData({ ...typeConfigData, [fieldName]: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder={fieldConfig.placeholder} min={fieldConfig.min} max={fieldConfig.max} step={fieldConfig.step} required={fieldConfig.required} className="h-9 text-sm" />
                              )}
                              {fieldConfig.type === 'boolean' && (
                                <div className="flex items-center gap-2">
                                  <input id={`config_${fieldName}`} type="checkbox" checked={!!fieldValue} onChange={(e) => setTypeConfigData({ ...typeConfigData, [fieldName]: e.target.checked })} className="h-4 w-4 rounded border-input" />
                                  <Label htmlFor={`config_${fieldName}`} className="text-sm cursor-pointer">{fieldConfig.description || 'Enable'}</Label>
                                </div>
                              )}
                              {fieldConfig.type === 'select' && fieldConfig.options && (
                                <Select value={fieldValue || ''} onValueChange={(value) => setTypeConfigData({ ...typeConfigData, [fieldName]: value })} required={fieldConfig.required}>
                                  <SelectTrigger id={`config_${fieldName}`} className="h-9">
                                    <SelectValue placeholder={fieldConfig.placeholder || 'Select...'} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {fieldConfig.options.map((option) => (
                                      <SelectItem key={option} value={option}>{option}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                              {fieldConfig.type === 'multiselect' && fieldConfig.options && (
                                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                                  {fieldConfig.options.map((option) => {
                                    const selectedValues = Array.isArray(fieldValue) ? fieldValue : []
                                    const isSelected = selectedValues.includes(option)
                                    return (
                                      <div key={option} className="flex items-center gap-2">
                                        <input type="checkbox" checked={isSelected} onChange={(e) => {
                                          const current = Array.isArray(fieldValue) ? fieldValue : []
                                          if (e.target.checked) setTypeConfigData({ ...typeConfigData, [fieldName]: [...current, option] })
                                          else setTypeConfigData({ ...typeConfigData, [fieldName]: current.filter(v => v !== option) })
                                        }} className="h-3.5 w-3.5 rounded border-input" />
                                        <Label className="text-sm cursor-pointer">{option}</Label>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                              {fieldConfig.type === 'array' && fieldConfig.items?.type === 'string' && (
                                <div className="space-y-1.5">
                                  {(Array.isArray(fieldValue) ? fieldValue : []).map((item, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                      <Input value={item} onChange={(e) => { const arr = [...(Array.isArray(fieldValue) ? fieldValue : [])]; arr[index] = e.target.value; setTypeConfigData({ ...typeConfigData, [fieldName]: arr }) }} placeholder={`Item ${index + 1}`} className="h-9 text-sm flex-1" />
                                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { const arr = [...(Array.isArray(fieldValue) ? fieldValue : [])]; arr.splice(index, 1); setTypeConfigData({ ...typeConfigData, [fieldName]: arr }) }}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  ))}
                                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setTypeConfigData({ ...typeConfigData, [fieldName]: [...(Array.isArray(fieldValue) ? fieldValue : []), ''] })}>
                                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                                    Add
                                  </Button>
                                </div>
                              )}
                              {fieldConfig.type === 'date' && (
                                <Input id={`config_${fieldName}`} type="date" value={fieldValue || ''} onChange={(e) => setTypeConfigData({ ...typeConfigData, [fieldName]: e.target.value })} required={fieldConfig.required} className="h-9 text-sm" />
                              )}
                              {fieldConfig.type === 'time' && (
                                <Input id={`config_${fieldName}`} type="time" value={fieldValue || ''} onChange={(e) => setTypeConfigData({ ...typeConfigData, [fieldName]: e.target.value })} required={fieldConfig.required} className="h-9 text-sm" />
                              )}
                              {fieldConfig.description && <p className="text-xs text-muted-foreground">{fieldConfig.description}</p>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={
                  isSubmitting ||
                  !formData.name ||
                  !formData.category_id ||
                  !formData.offering_type_id
                }
                className="w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingOffering ? (
                  "Update Offering"
                ) : (
                  "Create Offering"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
