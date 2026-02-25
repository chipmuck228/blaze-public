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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, MoreVertical, Edit, Trash2, Plus, Loader2, RefreshCcw } from "lucide-react"

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
  offering_type?: {
    id: string
    code: string
    name: string
    description?: string | null
    icon?: string | null
    color?: string | null
    is_active: boolean
    offering_schema?: {
      fields?: Record<string, {
        type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'array' | 'date'
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
        condition?: {
          field: string
          equals: any
        }
      }>
    }
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
  offering_schema?: {
    fields?: Record<string, {
      type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'array' | 'date'
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
      condition?: {
        field: string
        equals: any
      }
    }>
  }
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

  const [formData, setFormData] = useState<Omit<V2Offering, 'id' | 'created_at' | 'updated_at' | 'offering_type'>>({
    name: "",
    slug: "",
    description: "",
    target_audience: "",
    learning_outcomes: "",
    prerequisites: "",
    base_price: undefined,
    currency: "USD",
    poster_url: "",
    offering_type_id: "",
    type_config: {},
    status: "draft",
  })

  useEffect(() => {
    fetchOfferings()
    fetchOfferingTypes()
  }, [])

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
      alert(`Cannot delete offering with status '${offering.status}'. Only draft offerings can be deleted.`)
      return
    }

    if (!confirm(`Are you sure you want to delete "${offering.name}"? This will fail if there are instances using this offering.`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/offering/v2/${offeringId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchOfferings()
      } else {
        const data = await response.json()
        alert(data.error || "Failed to delete offering")
      }
    } catch (error) {
      console.error("Error deleting offering:", error)
      alert("Failed to delete offering")
    }
  }

  const handleEdit = async (offering: V2Offering) => {
    if (offering.status === 'archived') {
      alert('Cannot edit archived offerings.')
      return
    }
    setEditingOffering(offering)
    setFormData({
      name: offering.name,
      slug: offering.slug || "",
      description: offering.description || "",
      target_audience: offering.target_audience || "",
      learning_outcomes: offering.learning_outcomes || "",
      prerequisites: offering.prerequisites || "",
      base_price: offering.base_price,
      currency: offering.currency || "USD",
      poster_url: offering.poster_url || "",
      offering_type_id: offering.offering_type_id,
      type_config: offering.type_config || {},
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
        if (fullOffering.type_config_data) {
          setTypeConfigData(fullOffering.type_config_data)
        } else if (fullOffering.type_config) {
          setTypeConfigData(fullOffering.type_config)
        } else {
          setTypeConfigData({})
        }
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
      target_audience: "",
      learning_outcomes: "",
      prerequisites: "",
      base_price: undefined,
      currency: "USD",
      poster_url: "",
      offering_type_id: "",
      type_config: {},
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
        ...formData,
        type_config_data: typeConfigData,
        slug: formData.slug || undefined,
        description: formData.description || undefined,
        target_audience: formData.target_audience || undefined,
        learning_outcomes: formData.learning_outcomes || undefined,
        prerequisites: formData.prerequisites || undefined,
        base_price: formData.base_price || undefined,
        // 如果有新上传的 poster，使用新 URL；否则使用已有的 poster_url
        poster_url: uploadedPosterUrlToCleanup || formData.poster_url || undefined,
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
        alert(error.error || "Failed to save offering")
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
      alert("Failed to save offering")
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
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className="font-medium">{offering.name}</span>
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
                                    {offering.base_price && (
                                      <span>{offering.currency} ${offering.base_price.toFixed(2)}</span>
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

                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="offering_type_id">Offering Type *</Label>
                    <Select
                      value={formData.offering_type_id}
                      onValueChange={(value) => {
                        setFormData({
                          ...formData,
                          offering_type_id: value,
                        })
                      }}
                      required
                      disabled={!!editingOffering}
                    >
                      <SelectTrigger id="offering_type_id">
                        <SelectValue placeholder={isLoadingTypes ? "Loading..." : "Select an offering type"} />
                      </SelectTrigger>
                      <SelectContent>
                        {offeringTypes
                          .filter(type => type.is_active)
                          .map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.name} ({type.code})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {editingOffering && (
                      <p className="text-xs text-muted-foreground">
                        Offering type cannot be changed after creation.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Introduction to Robotics"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug</Label>
                    <Input
                      id="slug"
                      value={formData.slug || ""}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                      placeholder="e.g., introduction-to-robotics"
                    />
                    <p className="text-xs text-muted-foreground">
                      URL-friendly identifier (lowercase letters, numbers, and hyphens only). Auto-generated from name if not provided.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description || ""}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Offering description"
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="poster_url">Poster</Label>
                    <div className="space-y-2">
                      {(posterPreviewUrl || formData.poster_url) && (
                        <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                          <Image
                            src={posterPreviewUrl || formData.poster_url || ""}
                            alt="Poster preview"
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 400px"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={handleRemovePoster}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Input
                          id="poster_file"
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={handleFileSelect}
                          disabled={isUploadingPoster || isSubmitting}
                          className="flex-1"
                        />
                        {(isUploadingPoster || isSubmitting) && (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Upload an image file (JPG, PNG, WebP). Maximum file size: 5MB. Image will be stored in Vercel Blob.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="base_price">Base Price</Label>
                      <Input
                        id="base_price"
                        type="number"
                        step="0.01"
                        value={formData.base_price ?? ""}
                        onChange={(e) => setFormData({ ...formData, base_price: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Input
                        id="currency"
                        value={formData.currency}
                        onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                        placeholder="USD"
                        maxLength={3}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="target_audience">Target Audience</Label>
                    <Textarea
                      id="target_audience"
                      value={formData.target_audience || ""}
                      onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                      placeholder="Who is this offering for?"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="learning_outcomes">Learning Outcomes</Label>
                    <Textarea
                      id="learning_outcomes"
                      value={formData.learning_outcomes || ""}
                      onChange={(e) => setFormData({ ...formData, learning_outcomes: e.target.value })}
                      placeholder="What will students learn?"
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prerequisites">Prerequisites</Label>
                    <Textarea
                      id="prerequisites"
                      value={formData.prerequisites || ""}
                      onChange={(e) => setFormData({ ...formData, prerequisites: e.target.value })}
                      placeholder="What are the prerequisites?"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: V2Offering['status']) =>
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Only 'published' offerings can be used to create instances and displayed to users.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="config" className="space-y-4 mt-4">
                  {!formData.offering_type_id ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Please select an offering type first to configure type-specific fields.
                    </div>
                  ) : !selectedOfferingType?.offering_schema?.fields || Object.keys(selectedOfferingType.offering_schema.fields).length === 0 ? (
                    <div className="space-y-2">
                      <Label>Type Config (JSON)</Label>
                      <Textarea
                        value={JSON.stringify(typeConfigData, null, 2)}
                        onChange={(e) => {
                          try {
                            setTypeConfigData(JSON.parse(e.target.value))
                          } catch {
                            // Invalid JSON, ignore
                          }
                        }}
                        placeholder='{"customField": "value"}'
                        rows={12}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        No schema defined for this offering type. Enter JSON configuration manually.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Configure type-specific fields for <strong>{selectedOfferingType.name}</strong>
                      </p>
                      {Object.entries(selectedOfferingType.offering_schema.fields).map(([fieldName, fieldConfig]) => {
                        // 检查条件显示
                        if (fieldConfig.condition) {
                          const conditionValue = typeConfigData[fieldConfig.condition.field]
                          if (conditionValue !== fieldConfig.condition.equals) {
                            return null
                          }
                        }

                        const fieldValue = typeConfigData[fieldName] ?? fieldConfig.default ?? ''

                        return (
                          <div key={fieldName} className="space-y-2">
                            <Label htmlFor={`config_${fieldName}`}>
                              {fieldConfig.label || fieldName}
                              {fieldConfig.required && <span className="text-red-500 ml-1">*</span>}
                            </Label>
                            
                            {fieldConfig.type === 'text' && (
                              fieldConfig.multiline ? (
                                <Textarea
                                  id={`config_${fieldName}`}
                                  value={fieldValue}
                                  onChange={(e) => setTypeConfigData({ ...typeConfigData, [fieldName]: e.target.value })}
                                  placeholder={fieldConfig.placeholder}
                                  rows={4}
                                  required={fieldConfig.required}
                                />
                              ) : (
                                <Input
                                  id={`config_${fieldName}`}
                                  value={fieldValue}
                                  onChange={(e) => setTypeConfigData({ ...typeConfigData, [fieldName]: e.target.value })}
                                  placeholder={fieldConfig.placeholder}
                                  required={fieldConfig.required}
                                />
                              )
                            )}

                            {fieldConfig.type === 'number' && (
                              <Input
                                id={`config_${fieldName}`}
                                type="number"
                                value={fieldValue}
                                onChange={(e) => setTypeConfigData({ ...typeConfigData, [fieldName]: e.target.value ? parseFloat(e.target.value) : undefined })}
                                placeholder={fieldConfig.placeholder}
                                min={fieldConfig.min}
                                max={fieldConfig.max}
                                step={fieldConfig.step}
                                required={fieldConfig.required}
                              />
                            )}

                            {fieldConfig.type === 'boolean' && (
                              <div className="flex items-center space-x-2">
                                <input
                                  id={`config_${fieldName}`}
                                  type="checkbox"
                                  checked={fieldValue || false}
                                  onChange={(e) => setTypeConfigData({ ...typeConfigData, [fieldName]: e.target.checked })}
                                  className="h-4 w-4"
                                />
                                <Label htmlFor={`config_${fieldName}`} className="cursor-pointer">
                                  {fieldConfig.description || 'Enable'}
                                </Label>
                              </div>
                            )}

                            {fieldConfig.type === 'select' && fieldConfig.options && (
                              <Select
                                value={fieldValue || ''}
                                onValueChange={(value) => setTypeConfigData({ ...typeConfigData, [fieldName]: value })}
                                required={fieldConfig.required}
                              >
                                <SelectTrigger id={`config_${fieldName}`}>
                                  <SelectValue placeholder={fieldConfig.placeholder || 'Select...'} />
                                </SelectTrigger>
                                <SelectContent>
                                  {fieldConfig.options.map((option) => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}

                            {fieldConfig.type === 'multiselect' && fieldConfig.options && (
                              <div className="space-y-2">
                                {fieldConfig.options.map((option) => {
                                  const selectedValues = Array.isArray(fieldValue) ? fieldValue : []
                                  const isSelected = selectedValues.includes(option)
                                  return (
                                    <div key={option} className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={(e) => {
                                          const currentValues = Array.isArray(fieldValue) ? fieldValue : []
                                          if (e.target.checked) {
                                            setTypeConfigData({ ...typeConfigData, [fieldName]: [...currentValues, option] })
                                          } else {
                                            setTypeConfigData({ ...typeConfigData, [fieldName]: currentValues.filter(v => v !== option) })
                                          }
                                        }}
                                        className="h-4 w-4"
                                      />
                                      <Label className="cursor-pointer">{option}</Label>
                                    </div>
                                  )
                                })}
                              </div>
                            )}

                            {fieldConfig.type === 'array' && fieldConfig.items?.type === 'string' && (
                              <div className="space-y-2">
                                {(Array.isArray(fieldValue) ? fieldValue : []).map((item, index) => (
                                  <div key={index} className="flex items-center gap-2">
                                    <Input
                                      value={item}
                                      onChange={(e) => {
                                        const newArray = [...(Array.isArray(fieldValue) ? fieldValue : [])]
                                        newArray[index] = e.target.value
                                        setTypeConfigData({ ...typeConfigData, [fieldName]: newArray })
                                      }}
                                      placeholder={`Item ${index + 1}`}
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        const newArray = [...(Array.isArray(fieldValue) ? fieldValue : [])]
                                        newArray.splice(index, 1)
                                        setTypeConfigData({ ...typeConfigData, [fieldName]: newArray })
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const newArray = [...(Array.isArray(fieldValue) ? fieldValue : []), '']
                                    setTypeConfigData({ ...typeConfigData, [fieldName]: newArray })
                                  }}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Item
                                </Button>
                              </div>
                            )}

                            {fieldConfig.type === 'date' && (
                              <Input
                                id={`config_${fieldName}`}
                                type="date"
                                value={fieldValue || ''}
                                onChange={(e) => setTypeConfigData({ ...typeConfigData, [fieldName]: e.target.value })}
                                required={fieldConfig.required}
                              />
                            )}

                            {fieldConfig.description && (
                              <p className="text-xs text-muted-foreground">{fieldConfig.description}</p>
                            )}
                          </div>
                        )
                      })}
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
