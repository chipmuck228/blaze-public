'use client'

import { useState, useEffect } from "react"
import ReactMarkdown from "react-markdown"
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
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Edit, Trash2, Plus, Loader2, RefreshCcw, Save, X } from "lucide-react"
import { SchemaEditor } from "@/components/admin/SchemaEditor"
import { cn } from "@/lib/utils"

interface V2OfferingType {
  id: string
  code: string
  name: string
  description?: string
  icon?: string
  color?: string
  offering_schema: Record<string, unknown>
  instance_schema: Record<string, unknown>
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

function jsonToMarkdownBlock(obj: Record<string, unknown>): string {
  try {
    const json = JSON.stringify(obj, null, 2)
    return "```json\n" + json + "\n```"
  } catch {
    return "```json\n{}\n```"
  }
}

const emptyFormData = {
  code: "",
  name: "",
  description: "",
  icon: "",
  color: "",
  offering_schema: {} as Record<string, unknown>,
  instance_schema: {} as Record<string, unknown>,
  display_order: 0,
  is_active: true,
}

export default function BlazeOfferingTypesManagementPage() {
  const [offeringTypes, setOfferingTypes] = useState<V2OfferingType[]>([])
  const [filteredTypes, setFilteredTypes] = useState<V2OfferingType[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Inline edit: "new" = add form, type.id = edit that type, null = no edit
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState(emptyFormData)
  const [offeringSchemaJson, setOfferingSchemaJson] = useState("{}")
  const [instanceSchemaJson, setInstanceSchemaJson] = useState("{}")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

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
      if (!response.ok) throw new Error("Failed to fetch offering types")
      const data = await response.json()
      setOfferingTypes(data)
      setFilteredTypes(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load offering types")
    } finally {
      setIsLoading(false)
    }
  }

  const startEdit = (type: V2OfferingType) => {
    setEditingId(type.id)
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
    setSubmitError(null)
  }

  const startAdd = () => {
    setEditingId("new")
    setFormData(emptyFormData)
    setOfferingSchemaJson("{}")
    setInstanceSchemaJson("{}")
    setSubmitError(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setSubmitError(null)
  }

  const handleSave = async () => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      let offeringSchema: Record<string, unknown> = {}
      let instanceSchema: Record<string, unknown> = {}
      try {
        offeringSchema = offeringSchemaJson ? JSON.parse(offeringSchemaJson) : {}
        instanceSchema = instanceSchemaJson ? JSON.parse(instanceSchemaJson) : {}
      } catch {
        setSubmitError("Invalid JSON in schema fields")
        setIsSubmitting(false)
        return
      }

      const payload = {
        code: formData.code,
        name: formData.name,
        description: formData.description || undefined,
        icon: formData.icon || undefined,
        color: formData.color || undefined,
        display_order: formData.display_order,
        is_active: formData.is_active,
        offering_schema: offeringSchema,
        instance_schema: instanceSchema,
      }

      if (editingId === "new") {
        const res = await fetch("/api/admin/offering-types/v2", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "Failed to create")
        }
      } else {
        const res = await fetch(`/api/admin/offering-types/v2/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "Failed to update")
        }
      }
      cancelEdit()
      fetchOfferingTypes()
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (typeId: string) => {
    const type = offeringTypes.find((t) => t.id === typeId)
    if (!type) return
    if (!confirm(`Delete "${type.name}"? This will fail if any offerings use this type.`)) return

    try {
      const res = await fetch(`/api/admin/offering-types/v2/${typeId}`, { method: "DELETE" })
      if (res.ok) {
        if (editingId === typeId) cancelEdit()
        fetchOfferingTypes()
      } else {
        const data = await res.json()
        alert(data.error || "Failed to delete")
      }
    } catch {
      alert("Failed to delete offering type")
    }
  }

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">V2 Offering Types Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage offering types (product type configurations). Edit, save, or delete directly on each card.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search offering types..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 rounded-lg bg-muted/50 border-muted-foreground/20 focus-visible:ring-2"
          />
        </div>
        <Button
          onClick={startAdd}
          disabled={editingId === "new"}
          size="default"
          className="h-10 rounded-lg gap-2 shadow-sm hover:shadow"
        >
          <Plus className="h-4 w-4" />
          Add Offering Type
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center py-12 space-y-4">
          <p className="text-destructive text-lg">{error}</p>
          <Button onClick={fetchOfferingTypes} variant="outline" size="lg" className="rounded-lg gap-2">
            <RefreshCcw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1">
          {/* New card (when adding) */}
          {editingId === "new" && (
            <Card className="border-dashed border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">New Offering Type</CardTitle>
                <CardDescription>Fill in the fields below and click Save.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Code *</Label>
                    <Input
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                        })
                      }
                      placeholder="e.g. course, camp"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Display name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Course, Camp"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description"
                    rows={2}
                    className="resize-none"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="new_is_active"
                      checked={formData.is_active}
                      onCheckedChange={(c) => setFormData({ ...formData, is_active: c === true })}
                    />
                    <Label htmlFor="new_is_active" className="cursor-pointer">Active</Label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Offering schema (JSON)</Label>
                  <SchemaEditor
                    value={offeringSchemaJson}
                    onChange={setOfferingSchemaJson}
                    minHeight="200px"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Instance schema (JSON)</Label>
                  <SchemaEditor
                    value={instanceSchemaJson}
                    onChange={setInstanceSchemaJson}
                    minHeight="200px"
                  />
                </div>
                {submitError && (
                  <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">{submitError}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 pt-4 border-t">
                  <Button
                    onClick={handleSave}
                    disabled={isSubmitting || !formData.code || !formData.name}
                    size="default"
                    className="rounded-lg gap-2 min-w-[100px]"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save
                  </Button>
                  <Button variant="outline" size="default" onClick={cancelEdit} disabled={isSubmitting} className="rounded-lg gap-2">
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {filteredTypes.map((type) => (
            <Card
              key={type.id}
              className={cn(
                "flex flex-col",
                editingId === type.id && "ring-2 ring-primary"
              )}
            >
              {editingId === type.id ? (
                <>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Edit: {type.name}</CardTitle>
                    <CardDescription>Code: <code className="font-mono">{type.code}</code> (cannot change)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 flex-1 overflow-hidden flex flex-col min-h-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Display name *</Label>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Order</Label>
                        <Input
                          type="number"
                          value={formData.display_order}
                          onChange={(e) =>
                            setFormData({ ...formData, display_order: parseInt(e.target.value, 10) || 0 })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={2}
                        className="resize-none"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`active-${type.id}`}
                        checked={formData.is_active}
                        onCheckedChange={(c) => setFormData({ ...formData, is_active: c === true })}
                      />
                      <Label htmlFor={`active-${type.id}`} className="cursor-pointer">Active</Label>
                    </div>
                    <div className="space-y-2 min-h-0 flex flex-col">
                      <Label>Offering schema</Label>
                      <div className="min-h-[180px]">
                        <SchemaEditor
                          value={offeringSchemaJson}
                          onChange={setOfferingSchemaJson}
                          minHeight="180px"
                        />
                      </div>
                    </div>
                    <div className="space-y-2 min-h-0 flex flex-col">
                      <Label>Instance schema</Label>
                      <div className="min-h-[180px]">
                        <SchemaEditor
                          value={instanceSchemaJson}
                          onChange={setInstanceSchemaJson}
                          minHeight="180px"
                        />
                      </div>
                    </div>
                    {submitError && (
                      <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">{submitError}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 pt-4 border-t flex-shrink-0">
                      <Button
                        onClick={handleSave}
                        disabled={isSubmitting || !formData.name}
                        size="default"
                        className="rounded-lg gap-2 min-w-[100px]"
                      >
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save
                      </Button>
                      <Button variant="outline" size="default" onClick={cancelEdit} disabled={isSubmitting} className="rounded-lg gap-2">
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                      <span className="inline-block w-px h-6 bg-border mx-1" aria-hidden />
                      <Button
                        variant="ghost"
                        size="default"
                        onClick={() => handleDelete(type.id)}
                        disabled={isSubmitting}
                        title="Delete"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </>
              ) : (
                <>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg">{type.name}</CardTitle>
                        <CardDescription className="font-mono text-xs mt-0.5">{type.code}</CardDescription>
                      </div>
                      <Badge variant={type.is_active ? "default" : "secondary"}>
                        {type.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => startEdit(type)}
                        className="rounded-lg gap-1.5 h-8 px-3 shadow-sm"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg gap-1.5 h-8 px-3"
                        onClick={() => handleDelete(type.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0">
                    {type.description && (
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Created {formatDate(type.created_at)}
                    </p>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Offering schema (type_config_data)</p>
                      <div className="rounded-md border bg-muted/30 p-2 overflow-auto max-h-48 text-xs font-mono">
                        <ReactMarkdown
                          components={{
                            pre: ({ children }) => <pre className="m-0 whitespace-pre-wrap break-words">{children}</pre>,
                            code: ({ className, children }) => (
                              <code className={cn(className, "text-[11px]")}>{children}</code>
                            ),
                          }}
                        >
                          {jsonToMarkdownBlock((type.offering_schema || {}) as Record<string, unknown>)}
                        </ReactMarkdown>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Instance schema (instance_data_ext)</p>
                      <div className="rounded-md border bg-muted/30 p-2 overflow-auto max-h-48 text-xs font-mono">
                        <ReactMarkdown
                          components={{
                            pre: ({ children }) => <pre className="m-0 whitespace-pre-wrap break-words">{children}</pre>,
                            code: ({ className, children }) => (
                              <code className={cn(className, "text-[11px]")}>{children}</code>
                            ),
                          }}
                        >
                          {jsonToMarkdownBlock((type.instance_schema || {}) as Record<string, unknown>)}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </CardContent>
                </>
              )}
            </Card>
          ))}
        </div>
      )}

      {!isLoading && !error && filteredTypes.length === 0 && !editingId && (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery ? "No offering types match your search." : "No offering types yet. Click Add Offering Type to create one."}
        </div>
      )}
    </div>
  )
}
