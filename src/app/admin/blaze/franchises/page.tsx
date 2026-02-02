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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, MoreVertical, Edit, Trash2, Plus, Loader2, RefreshCcw, Network } from "lucide-react"

interface BlazeFranchise {
  id: string
  code: string
  name: string
  display_name?: string
  description?: string
  domain?: string
  logo_url?: string
  branding_config?: Record<string, any>
  contact_email?: string
  contact_phone?: string
  address?: string
  timezone: string
  locale: string
  custom_config?: Record<string, any>
  is_active: boolean
  legacy_franchise_id?: string
  created_at: string
  updated_at: string
}

export default function BlazeFranchisesManagementPage() {
  const [franchises, setFranchises] = useState<BlazeFranchise[]>([])
  const [filteredFranchises, setFilteredFranchises] = useState<BlazeFranchise[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [editingFranchise, setEditingFranchise] = useState<BlazeFranchise | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState<Omit<BlazeFranchise, 'id' | 'created_at' | 'updated_at' | 'legacy_franchise_id'>>({
    code: "",
    name: "",
    display_name: "",
    description: "",
    domain: "",
    logo_url: "",
    branding_config: {},
    contact_email: "",
    contact_phone: "",
    address: "",
    timezone: "UTC",
    locale: "en",
    custom_config: {},
    is_active: true,
  })

  const [brandingConfigJson, setBrandingConfigJson] = useState("{}")
  const [customConfigJson, setCustomConfigJson] = useState("{}")

  useEffect(() => {
    fetchFranchises()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      const filtered = franchises.filter(
        (franchise) =>
          franchise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          franchise.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          franchise.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          franchise.domain?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredFranchises(filtered)
    } else {
      setFilteredFranchises(franchises)
    }
  }, [searchQuery, franchises])

  const fetchFranchises = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch("/api/blaze/franchises")
      
      if (!response.ok) {
        throw new Error("Failed to fetch franchises")
      }

      const data = await response.json()
      setFranchises(data)
      setFilteredFranchises(data)
    } catch (err: any) {
      console.error("Error fetching franchises:", err)
      setError(err.message || "Failed to load franchises")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (franchiseId: string) => {
    if (!confirm("Are you sure you want to delete this franchise? This will fail if there are categories, campuses, or programs using it.")) {
      return
    }

    try {
      const response = await fetch(`/api/blaze/franchises/${franchiseId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchFranchises()
      } else {
        const data = await response.json()
        alert(data.error || "Failed to delete franchise")
      }
    } catch (error) {
      console.error("Error deleting franchise:", error)
      alert("Failed to delete franchise")
    }
  }

  const handleEdit = (franchise: BlazeFranchise) => {
    setEditingFranchise(franchise)
    setFormData({
      code: franchise.code,
      name: franchise.name,
      display_name: franchise.display_name || "",
      description: franchise.description || "",
      domain: franchise.domain || "",
      logo_url: franchise.logo_url || "",
      branding_config: franchise.branding_config || {},
      contact_email: franchise.contact_email || "",
      contact_phone: franchise.contact_phone || "",
      address: franchise.address || "",
      timezone: franchise.timezone || "UTC",
      locale: franchise.locale || "en",
      custom_config: franchise.custom_config || {},
      is_active: franchise.is_active,
    })
    setBrandingConfigJson(JSON.stringify(franchise.branding_config || {}, null, 2))
    setCustomConfigJson(JSON.stringify(franchise.custom_config || {}, null, 2))
    setIsEditDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingFranchise(null)
    setFormData({
      code: "",
      name: "",
      display_name: "",
      description: "",
      domain: "",
      logo_url: "",
      branding_config: {},
      contact_email: "",
      contact_phone: "",
      address: "",
      timezone: "UTC",
      locale: "en",
      custom_config: {},
      is_active: true,
    })
    setBrandingConfigJson("{}")
    setCustomConfigJson("{}")
    setIsEditDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // 解析 JSON 配置
      let brandingConfig = {}
      let customConfig = {}
      
      try {
        brandingConfig = brandingConfigJson ? JSON.parse(brandingConfigJson) : {}
      } catch (err) {
        alert("Invalid JSON in Branding Config")
        setIsSubmitting(false)
        return
      }

      try {
        customConfig = customConfigJson ? JSON.parse(customConfigJson) : {}
      } catch (err) {
        alert("Invalid JSON in Custom Config")
        setIsSubmitting(false)
        return
      }

      const submitData = {
        ...formData,
        branding_config: brandingConfig,
        custom_config: customConfig,
        display_name: formData.display_name || formData.name,
        description: formData.description || undefined,
        domain: formData.domain || undefined,
        logo_url: formData.logo_url || undefined,
        contact_email: formData.contact_email || undefined,
        contact_phone: formData.contact_phone || undefined,
        address: formData.address || undefined,
      }

      const url = editingFranchise
        ? `/api/blaze/franchises/${editingFranchise.id}`
        : "/api/blaze/franchises"
      const method = editingFranchise ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      })

      if (response.ok) {
        fetchFranchises()
        setIsEditDialogOpen(false)
        setEditingFranchise(null)
      } else {
        const error = await response.json()
        alert(error.error || "Failed to save franchise")
      }
    } catch (error) {
      console.error("Error saving franchise:", error)
      alert("Failed to save franchise")
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
        <h1 className="text-3xl font-bold">Blaze Franchises Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage franchises (multi-tenant system) using the new Blaze system
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Franchises</CardTitle>
              <CardDescription>
                A list of all franchises in the Blaze system
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search franchises..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add Franchise
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
              <Button onClick={fetchFranchises}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : filteredFranchises.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? "No franchises found matching your search." : "No franchises found."}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Timezone</TableHead>
                    <TableHead>Contact Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFranchises.map((franchise) => (
                    <TableRow key={franchise.id}>
                      <TableCell className="font-mono text-sm">{franchise.code}</TableCell>
                      <TableCell className="font-medium">{franchise.name}</TableCell>
                      <TableCell>{franchise.display_name || "N/A"}</TableCell>
                      <TableCell className="font-mono text-sm">{franchise.domain || "N/A"}</TableCell>
                      <TableCell>{franchise.timezone}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {franchise.contact_email || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={franchise.is_active ? "default" : "secondary"}>
                          {franchise.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(franchise.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(franchise)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(franchise.id)}
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
            <DialogTitle>{editingFranchise ? "Edit Franchise" : "Add New Franchise"}</DialogTitle>
            <DialogDescription>
              {editingFranchise ? "Update franchise information" : "Create a new franchise"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto pr-1">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="contact">Contact & Location</TabsTrigger>
                  <TabsTrigger value="config">Configuration</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Code *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                      placeholder="e.g., bellevue, issaquah"
                      required
                      disabled={!!editingFranchise}
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
                      placeholder="e.g., Bellevue Branch"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="display_name">Display Name</Label>
                    <Input
                      id="display_name"
                      value={formData.display_name}
                      onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                      placeholder="e.g., Bellevue Learning Center"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Franchise description"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="domain">Domain</Label>
                      <Input
                        id="domain"
                        value={formData.domain}
                        onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                        placeholder="e.g., bellevue.example.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="logo_url">Logo URL</Label>
                      <Input
                        id="logo_url"
                        value={formData.logo_url}
                        onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                        placeholder="https://example.com/logo.png"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Input
                        id="timezone"
                        value={formData.timezone}
                        onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                        placeholder="e.g., America/Los_Angeles"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="locale">Locale</Label>
                      <Input
                        id="locale"
                        value={formData.locale}
                        onChange={(e) => setFormData({ ...formData, locale: e.target.value })}
                        placeholder="e.g., en, zh"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="is_active">Status</Label>
                    <select
                      id="is_active"
                      value={formData.is_active ? "active" : "inactive"}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.value === "active" })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </TabsContent>

                <TabsContent value="contact" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Full address"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact_email">Contact Email</Label>
                      <Input
                        id="contact_email"
                        type="email"
                        value={formData.contact_email}
                        onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                        placeholder="contact@example.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contact_phone">Contact Phone</Label>
                      <Input
                        id="contact_phone"
                        value={formData.contact_phone}
                        onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="config" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="branding_config">Branding Config (JSON)</Label>
                    <Textarea
                      id="branding_config"
                      value={brandingConfigJson}
                      onChange={(e) => setBrandingConfigJson(e.target.value)}
                      placeholder='{"primaryColor": "#000000", "secondaryColor": "#ffffff"}'
                      rows={8}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      JSON object for branding configuration (colors, themes, etc.)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="custom_config">Custom Config (JSON)</Label>
                    <Textarea
                      id="custom_config"
                      value={customConfigJson}
                      onChange={(e) => setCustomConfigJson(e.target.value)}
                      placeholder='{"customField": "value"}'
                      rows={8}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      JSON object for custom franchise-specific configuration
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !formData.name || !formData.code} className="w-full sm:w-auto">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingFranchise ? (
                  "Update Franchise"
                ) : (
                  "Create Franchise"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
