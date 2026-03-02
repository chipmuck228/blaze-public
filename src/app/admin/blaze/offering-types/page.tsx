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
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, MoreVertical, Edit, Trash2, Plus, Loader2, RefreshCcw } from "lucide-react"
import { SchemaEditor } from "@/components/admin/SchemaEditor"

interface V2OfferingType {
  id: string
  code: string
  name: string
  description?: string
  icon?: string
  color?: string
  offering_schema: Record<string, any>
  instance_schema: Record<string, any>
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function BlazeOfferingTypesManagementPage() {
  const [offeringTypes, setOfferingTypes] = useState<V2OfferingType[]>([])
  const [filteredTypes, setFilteredTypes] = useState<V2OfferingType[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [editingType, setEditingType] = useState<V2OfferingType | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState<Omit<V2OfferingType, 'id' | 'created_at' | 'updated_at'>>({
    code: "",
    name: "",
    description: "",
    icon: "",
    color: "",
    offering_schema: {},
    instance_schema: {},
    display_order: 0,
    is_active: true,
  })

  const [offeringSchemaJson, setOfferingSchemaJson] = useState("{}")
  const [instanceSchemaJson, setInstanceSchemaJson] = useState("{}")

  useEffect(() => {
    fetchOfferingTypes()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      const filtered = offeringTypes.filter(
        (type) =>
          type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          type.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          type.description?.toLowerCase().includes(searchQuery.toLowerCase())
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
      const response = await fetch("/api/admin/offering-types/v2?includeInactive=true")
      
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

  const handleDelete = async (typeId: string) => {
    const type = offeringTypes.find(t => t.id === typeId)
    if (!type) return

    if (!confirm(`Are you sure you want to delete "${type.name}"? This will fail if there are offerings using this type.`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/offering-types/v2/${typeId}`, {
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

  const handleEdit = (type: V2OfferingType) => {
    setEditingType(type)
    setFormData({
      code: type.code,
      name: type.name,
      description: type.description || "",
      icon: type.icon || "",
      color: type.color || "",
      offering_schema: type.offering_schema || {},
      instance_schema: type.instance_schema || {},
      display_order: type.display_order,
      is_active: type.is_active,
    })
    setOfferingSchemaJson(JSON.stringify(type.offering_schema || {}, null, 2))
    setInstanceSchemaJson(JSON.stringify(type.instance_schema || {}, null, 2))
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
      offering_schema: {},
      instance_schema: {},
      display_order: 0,
      is_active: true,
    })
    setOfferingSchemaJson("{}")
    setInstanceSchemaJson("{}")
    setIsEditDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // 解析 JSON 配置
      let offeringSchema = {}
      let instanceSchema = {}
      try {
        offeringSchema = offeringSchemaJson ? JSON.parse(offeringSchemaJson) : {}
        instanceSchema = instanceSchemaJson ? JSON.parse(instanceSchemaJson) : {}
      } catch (err) {
        alert("Invalid JSON in Schema fields")
        setIsSubmitting(false)
        return
      }

      const submitData = {
        ...formData,
        offering_schema: offeringSchema,
        instance_schema: instanceSchema,
        description: formData.description || undefined,
        icon: formData.icon || undefined,
        color: formData.color || undefined,
      }

      const url = editingType
        ? `/api/admin/offering-types/v2/${editingType.id}`
        : "/api/admin/offering-types/v2"
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

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">V2 Offering Types Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage offering types (product type configurations) using the V2 database schema
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Offering Types</CardTitle>
              <CardDescription>
                A list of all offering types in the V2 system
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
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell className="font-mono text-sm">{type.code}</TableCell>
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell>
                        <Badge variant={type.is_active ? "default" : "secondary"}>
                          {type.is_active ? "Active" : "Inactive"}
                        </Badge>
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
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="offering-schema">Offering Schema</TabsTrigger>
                  <TabsTrigger value="instance-schema">Instance Schema</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="mt-4">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Identity</CardTitle>
                        <CardDescription>Code and display name. Code cannot be changed after creation.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="code">Code *</Label>
                            <Input
                              id="code"
                              value={formData.code}
                              onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                              placeholder="e.g. course, camp, workshop"
                              required
                              disabled={!!editingType}
                              className="font-mono"
                            />
                            <p className="text-xs text-muted-foreground">Lowercase, numbers, underscores only.</p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="name">Display name *</Label>
                            <Input
                              id="name"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              placeholder="e.g. Course, Camp, Workshop"
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
                            placeholder="Brief description of this offering type"
                            rows={3}
                            className="resize-none"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Status</CardTitle>
                        <CardDescription>Whether this offering type is active. Inactive types cannot be used for new offerings.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="is_active"
                            checked={formData.is_active}
                            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked === true })}
                          />
                          <Label htmlFor="is_active" className="cursor-pointer font-medium">
                            Active
                          </Label>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="offering-schema" className="mt-4">
                  <SchemaEditor
                    title="Offering Schema"
                    value={offeringSchemaJson}
                    onChange={setOfferingSchemaJson}
                    placeholder='{"fields": {"description": {"type": "text", "label": "Description", "required": true}, ...}}'
                    minHeight="360px"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Defines fields for this offering type (e.g. description, base_price, base_capacity). Use Visual to edit fields or JSON for raw edit.
                  </p>
                </TabsContent>

                <TabsContent value="instance-schema" className="mt-4">
                  <SchemaEditor
                    title="Instance Schema"
                    value={instanceSchemaJson}
                    onChange={setInstanceSchemaJson}
                    placeholder='{"fields": {"start_date": {"type": "date", "label": "Start Date", "required": true}, ...}}'
                    minHeight="360px"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Defines fields for each instance of this type (e.g. start_date, max_students, notes). Use Visual to edit fields or JSON for raw edit.
                  </p>
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
                  !formData.code
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
