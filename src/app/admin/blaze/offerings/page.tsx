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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
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
import { Search, MoreVertical, Edit, Trash2, Plus, Loader2, RefreshCcw, Package, Eye } from "lucide-react"

interface BlazeOffering {
  id: string
  name: string
  slug?: string
  description?: string
  target_audience?: string
  learning_outcomes?: string
  prerequisites?: string
  base_price?: number
  currency: string
  poster_url?: string
  offering_type_id: string
  type_config?: Record<string, any>
  status: 'draft' | 'published' | 'suspended' | 'archived'
  created_at: string
  updated_at: string
  offering_type?: {
    id: string
    code: string
    name: string
    category_id?: string
    is_bound_to_category: boolean
    category?: {
      id: string
      name: string
      display_name: string
      franchise_id: string
      franchise?: {
        id: string
        code: string
        name: string
      }
    }
  }
}

interface BlazeOfferingType {
  id: string
  code: string
  name: string
  is_active: boolean
}

export default function BlazeOfferingsManagementPage() {
  const [offerings, setOfferings] = useState<BlazeOffering[]>([])
  const [filteredOfferings, setFilteredOfferings] = useState<BlazeOffering[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [editingOffering, setEditingOffering] = useState<BlazeOffering | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [offeringTypes, setOfferingTypes] = useState<BlazeOfferingType[]>([])
  const [isLoadingTypes, setIsLoadingTypes] = useState(true)

  const [formData, setFormData] = useState<Omit<BlazeOffering, 'id' | 'created_at' | 'updated_at' | 'offering_type'>>({
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

  const [typeConfigJson, setTypeConfigJson] = useState("{}")

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
      const response = await fetch("/api/blaze/offerings")
      
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
      const response = await fetch("/api/blaze/offering-types?includeInactive=true")
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

  // 按 Category -> Offering Type -> Offerings 分组
  const groupedOfferings = useMemo(() => {
    const groups: Record<string, Record<string, BlazeOffering[]>> = {}
    
    filteredOfferings.forEach((offering) => {
      const categoryId = offering.offering_type?.category_id || 'uncategorized'
      const categoryName = offering.offering_type?.category?.display_name || offering.offering_type?.category?.name || 'Uncategorized'
      const typeId = offering.offering_type_id
      const typeName = offering.offering_type?.name || 'Unknown Type'
      
      const groupKey = `${categoryId}|${categoryName}`
      
      if (!groups[groupKey]) {
        groups[groupKey] = {}
      }
      
      const typeKey = `${typeId}|${typeName}`
      if (!groups[groupKey][typeKey]) {
        groups[groupKey][typeKey] = []
      }
      
      groups[groupKey][typeKey].push(offering)
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
      const response = await fetch(`/api/blaze/offerings/${offeringId}`, {
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

  const handleEdit = (offering: BlazeOffering) => {
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
    setTypeConfigJson(JSON.stringify(offering.type_config || {}, null, 2))
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
    setTypeConfigJson("{}")
    setIsEditDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // 解析 JSON 配置
      let typeConfig = {}
      try {
        typeConfig = typeConfigJson ? JSON.parse(typeConfigJson) : {}
      } catch (err) {
        alert("Invalid JSON in Type Config")
        setIsSubmitting(false)
        return
      }

      const submitData = {
        ...formData,
        type_config: typeConfig,
        slug: formData.slug || undefined,
        description: formData.description || undefined,
        target_audience: formData.target_audience || undefined,
        learning_outcomes: formData.learning_outcomes || undefined,
        prerequisites: formData.prerequisites || undefined,
        base_price: formData.base_price || undefined,
        poster_url: formData.poster_url || undefined,
      }

      const url = editingOffering
        ? `/api/blaze/offerings/${editingOffering.id}`
        : "/api/blaze/offerings"
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
      } else {
        const error = await response.json()
        alert(error.error || "Failed to save offering")
      }
    } catch (error) {
      console.error("Error saving offering:", error)
      alert("Failed to save offering")
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

  const getStatusBackgroundColor = (status: BlazeOffering['status']): string => {
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
        <h1 className="text-3xl font-bold">Blaze Offerings Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage offerings (global product definitions) using the new Blaze system
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
              {Object.entries(groupedOfferings).map(([categoryKey, typeGroups]) => {
                const [categoryId, categoryName] = categoryKey.split('|')
                const categoryOfferings = Object.values(typeGroups).flat()
                
                return (
                  <Card key={categoryId} className={getStatusBackgroundColor('published')}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-semibold">
                          {categoryName}
                        </CardTitle>
                        <Badge variant="secondary" className="text-sm">
                          {categoryOfferings.length} Offering{categoryOfferings.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Accordion type="multiple" className="w-full">
                        {Object.entries(typeGroups).map(([typeKey, typeOfferings]) => {
                          const [typeId, typeName] = typeKey.split('|')
                          
                          return (
                            <AccordionItem key={typeId} value={typeId} className="border rounded-lg px-4 mb-2">
                              <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center justify-between w-full pr-4">
                                  <div className="flex flex-col items-start text-left">
                                    <div className="flex items-center gap-3">
                                      <span className="font-medium">{typeName}</span>
                                      <Badge variant="outline" className="text-xs">
                                        {typeOfferings.length} Offering{typeOfferings.length !== 1 ? 's' : ''}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-2 pt-2">
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
                              </AccordionContent>
                            </AccordionItem>
                          )
                        })}
                      </Accordion>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
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
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          offering_type_id: value,
                        })
                      }
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
                      value={formData.slug}
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
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Offering description"
                      rows={4}
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
                      value={formData.target_audience}
                      onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                      placeholder="Who is this offering for?"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="learning_outcomes">Learning Outcomes</Label>
                    <Textarea
                      id="learning_outcomes"
                      value={formData.learning_outcomes}
                      onChange={(e) => setFormData({ ...formData, learning_outcomes: e.target.value })}
                      placeholder="What will students learn?"
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prerequisites">Prerequisites</Label>
                    <Textarea
                      id="prerequisites"
                      value={formData.prerequisites}
                      onChange={(e) => setFormData({ ...formData, prerequisites: e.target.value })}
                      placeholder="What are the prerequisites?"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: BlazeOffering['status']) =>
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
                  <div className="space-y-2">
                    <Label htmlFor="type_config">Type Config (JSON)</Label>
                    <Textarea
                      id="type_config"
                      value={typeConfigJson}
                      onChange={(e) => setTypeConfigJson(e.target.value)}
                      placeholder='{"customField": "value"}'
                      rows={12}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      JSON object for type-specific configuration (defined by offering type's config_schema)
                    </p>
                  </div>
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
