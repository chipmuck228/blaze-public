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
import { Search, MoreVertical, Edit, Trash2, Plus, Loader2, RefreshCcw, Shapes, Link as LinkIcon } from "lucide-react"

interface BlazeOfferingType {
  id: string
  code: string
  name: string
  description?: string
  icon?: string
  color?: string
  display_order: number
  is_active: boolean
  is_default: boolean
  is_bound_to_category: boolean
  category_id?: string
  config_schema?: Record<string, any>
  legacy_type_code?: string
  created_at: string
  updated_at: string
  category?: {
    id: string
    name: string
    display_name: string
  }
}

interface BlazeCategory {
  id: string
  name: string
  display_name: string
  franchise_id: string
}

export default function BlazeOfferingTypesManagementPage() {
  const [offeringTypes, setOfferingTypes] = useState<BlazeOfferingType[]>([])
  const [filteredTypes, setFilteredTypes] = useState<BlazeOfferingType[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [editingType, setEditingType] = useState<BlazeOfferingType | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState<BlazeCategory[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)

  const [formData, setFormData] = useState<Omit<BlazeOfferingType, 'id' | 'created_at' | 'updated_at' | 'category'>>({
    code: "",
    name: "",
    description: "",
    icon: "",
    color: "",
    display_order: 0,
    is_active: true,
    is_default: false,
    is_bound_to_category: false,
    category_id: undefined,
    config_schema: {},
    legacy_type_code: "",
  })

  const [configSchemaJson, setConfigSchemaJson] = useState("{}")

  useEffect(() => {
    fetchOfferingTypes()
    fetchCategories()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      const filtered = offeringTypes.filter(
        (type) =>
          type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          type.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          type.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          type.category?.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredTypes(filtered)
    } else {
      setFilteredTypes(offeringTypes)
    }
  }, [searchQuery, offeringTypes])

  const fetchOfferingTypes = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch("/api/blaze/offering-types?includeInactive=true")
      
      if (!response.ok) {
        throw new Error("Failed to fetch offering types")
      }

      const data = await response.json()
      setOfferingTypes(data)
      setFilteredTypes(data)
    } catch (err: any) {
      console.error("Error fetching offering types:", err)
      setError(err.message || "Failed to load offering types")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      setIsLoadingCategories(true)
      const response = await fetch("/api/blaze/categories")
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

  const handleDelete = async (typeId: string) => {
    const type = offeringTypes.find(t => t.id === typeId)
    if (!type) return

    if (!confirm(`Are you sure you want to delete "${type.name}"? This will fail if there are offerings using this type.`)) {
      return
    }

    try {
      const response = await fetch(`/api/blaze/offering-types/${typeId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchOfferingTypes()
      } else {
        const data = await response.json()
        alert(data.error || "Failed to delete offering type")
      }
    } catch (error) {
      console.error("Error deleting offering type:", error)
      alert("Failed to delete offering type")
    }
  }

  const handleEdit = (type: BlazeOfferingType) => {
    setEditingType(type)
    setFormData({
      code: type.code,
      name: type.name,
      description: type.description || "",
      icon: type.icon || "",
      color: type.color || "",
      display_order: type.display_order,
      is_active: type.is_active,
      is_default: type.is_default,
      is_bound_to_category: type.is_bound_to_category,
      category_id: type.category_id,
      config_schema: type.config_schema || {},
      legacy_type_code: type.legacy_type_code || "",
    })
    setConfigSchemaJson(JSON.stringify(type.config_schema || {}, null, 2))
    setIsEditDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingType(null)
    setFormData({
      code: "",
      name: "",
      description: "",
      icon: "",
      color: "",
      display_order: 0,
      is_active: true,
      is_default: false,
      is_bound_to_category: false,
      category_id: undefined,
      config_schema: {},
      legacy_type_code: "",
    })
    setConfigSchemaJson("{}")
    setIsEditDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // 解析 JSON 配置
      let configSchema = {}
      try {
        configSchema = configSchemaJson ? JSON.parse(configSchemaJson) : {}
      } catch (err) {
        alert("Invalid JSON in Config Schema")
        setIsSubmitting(false)
        return
      }

      const submitData = {
        ...formData,
        config_schema: configSchema,
        description: formData.description || undefined,
        icon: formData.icon || undefined,
        color: formData.color || undefined,
        legacy_type_code: formData.legacy_type_code || undefined,
        category_id: formData.is_bound_to_category ? formData.category_id : undefined,
      }

      const url = editingType
        ? `/api/blaze/offering-types/${editingType.id}`
        : "/api/blaze/offering-types"
      const method = editingType ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      })

      if (response.ok) {
        fetchOfferingTypes()
        setIsEditDialogOpen(false)
        setEditingType(null)
      } else {
        const error = await response.json()
        alert(error.error || "Failed to save offering type")
      }
    } catch (error) {
      console.error("Error saving offering type:", error)
      alert("Failed to save offering type")
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

  const getCategoryLabel = (type: BlazeOfferingType) => {
    if (!type.category_id) return "N/A"
    const c = categories.find(cat => cat.id === type.category_id)
    if (c) return c.display_name || c.name
    if (type.category) return type.category.display_name || type.category.name
    return "N/A"
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Blaze Offering Types Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage offering types (product type configurations) using the new Blaze system
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Offering Types</CardTitle>
              <CardDescription>
                A list of all offering types in the Blaze system
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search offering types..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add Offering Type
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
              <Button onClick={fetchOfferingTypes}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : filteredTypes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? "No offering types found matching your search." : "No offering types found."}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Icon</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Display Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell className="font-mono text-sm">{type.code}</TableCell>
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell>{type.icon || "N/A"}</TableCell>
                      <TableCell>
                        {type.color ? (
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded border" 
                              style={{ backgroundColor: type.color }}
                            />
                            <span className="text-xs font-mono">{type.color}</span>
                          </div>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell>
                        {type.is_bound_to_category ? (
                          <Badge variant="outline" className="gap-1">
                            <LinkIcon className="h-3 w-3" />
                            {getCategoryLabel(type)}
                          </Badge>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell>{type.display_order}</TableCell>
                      <TableCell>
                        <Badge variant={type.is_active ? "default" : "secondary"}>
                          {type.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {type.is_default && (
                          <Badge variant="default">Default</Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(type.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(type)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(type.id)}
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
        <DialogContent className="max-w-[95vw] sm:max-w-[800px] lg:max-w-[900px] max-h-[95vh] h-[95vh] flex flex-col p-4 sm:p-6">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{editingType ? "Edit Offering Type" : "Add New Offering Type"}</DialogTitle>
            <DialogDescription>
              {editingType ? "Update offering type information" : "Create a new offering type"}
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
                    <Label htmlFor="code">Code *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                      placeholder="e.g., course, camp, workshop"
                      required
                      disabled={!!editingType}
                    />
                    <p className="text-xs text-muted-foreground">
                      Lowercase letters, numbers, and underscores only. Cannot be changed after creation.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Course, Camp, Workshop"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Offering type description"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="icon">Icon</Label>
                      <Input
                        id="icon"
                        value={formData.icon}
                        onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                        placeholder="e.g., BookOpen, Calendar"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="color">Color</Label>
                      <Input
                        id="color"
                        type="color"
                        value={formData.color || "#000000"}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="h-10"
                      />
                    </div>
                  </div>

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

                  <div className="border-t pt-4 space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked === true })}
                      />
                      <Label htmlFor="is_active" className="cursor-pointer">
                        Active
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="is_default"
                        checked={formData.is_default}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked === true })}
                      />
                      <Label htmlFor="is_default" className="cursor-pointer">
                        Default Type
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="is_bound_to_category"
                        checked={formData.is_bound_to_category}
                        onCheckedChange={(checked) => {
                          setFormData({ 
                            ...formData, 
                            is_bound_to_category: checked === true,
                            category_id: checked === true ? formData.category_id : undefined
                          })
                        }}
                      />
                      <Label htmlFor="is_bound_to_category" className="cursor-pointer">
                        Bound to Category
                      </Label>
                    </div>

                    {formData.is_bound_to_category && (
                      <div className="space-y-2 pl-6">
                        <Label htmlFor="category_id">Category *</Label>
                        <Select
                          value={formData.category_id || ""}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              category_id: value,
                            })
                          }
                          required
                        >
                          <SelectTrigger id="category_id">
                            <SelectValue placeholder={isLoadingCategories ? "Loading..." : "Select a category"} />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.display_name || category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="legacy_type_code">Legacy Type Code</Label>
                    <Input
                      id="legacy_type_code"
                      value={formData.legacy_type_code}
                      onChange={(e) => setFormData({ ...formData, legacy_type_code: e.target.value })}
                      placeholder="e.g., course, camp (for backward compatibility)"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="config" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="config_schema">Config Schema (JSON)</Label>
                    <Textarea
                      id="config_schema"
                      value={configSchemaJson}
                      onChange={(e) => setConfigSchemaJson(e.target.value)}
                      placeholder='{"visible_fields": {}, "instance_fields": {}}'
                      rows={12}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      JSON object for configuration schema (field visibility, instance field configuration, etc.)
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
                  !formData.code ||
                  (formData.is_bound_to_category && !formData.category_id)
                } 
                className="w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingType ? (
                  "Update Offering Type"
                ) : (
                  "Create Offering Type"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
