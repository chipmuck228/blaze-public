'use client'

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Search, MoreVertical, Edit, Trash2, Plus, Loader2, RefreshCcw, FileText } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FranchiseContentEditDialog } from "@/components/admin/FranchiseContentEditDialog"
import type { FranchiseBrandingConfig } from "@/lib/db"

interface Franchise {
  id: string
  code: string
  name: string
  primary_domain?: string | null
  timezone?: string | null
  branding_config?: FranchiseBrandingConfig | null
  is_active: boolean
}

export default function FranchisesManagementPage() {
  const [franchises, setFranchises] = useState<Franchise[]>([])
  const [filteredFranchises, setFilteredFranchises] = useState<Franchise[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [editingFranchise, setEditingFranchise] = useState<Franchise | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [contentEditingFranchise, setContentEditingFranchise] = useState<Franchise | null>(null)
  const [isContentEditDialogOpen, setIsContentEditDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState<Omit<Franchise, "id">>({
    code: "",
    name: "",
    primary_domain: "",
    timezone: "",
    is_active: true,
  })

  useEffect(() => {
    fetchFranchises()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      setFilteredFranchises(
        franchises.filter((f) =>
          f.name.toLowerCase().includes(q) ||
          f.code.toLowerCase().includes(q) ||
          (f.primary_domain || "").toLowerCase().includes(q)
        )
      )
    } else {
      setFilteredFranchises(franchises)
    }
  }, [searchQuery, franchises])

  const fetchFranchises = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch("/api/admin/franchises")
      if (!response.ok) {
        throw new Error("Failed to fetch franchises")
      }
      const data = await response.json()
      // 解析 branding_config JSONB（如果存在）
      const franchisesWithParsedConfig = (data || []).map((f: any) => {
        if (f.branding_config && typeof f.branding_config === 'string') {
          try {
            f.branding_config = JSON.parse(f.branding_config)
          } catch (e) {
            console.error('Failed to parse branding_config:', e)
            f.branding_config = null
          }
        }
        return f
      })
      setFranchises(franchisesWithParsedConfig)
      setFilteredFranchises(franchisesWithParsedConfig)
    } catch (err: any) {
      console.error("Error fetching franchises:", err)
      setError(err.message || "Failed to load franchises")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (franchiseId: string) => {
    if (!confirm("Are you sure you want to delete this franchise? This will fail if there are related locations or instances.")) {
      return
    }

    try {
      const response = await fetch(`/api/admin/franchises/${franchiseId}`, {
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

  const handleEdit = (franchise: Franchise) => {
    setEditingFranchise(franchise)
    setFormData({
      code: franchise.code,
      name: franchise.name,
      primary_domain: franchise.primary_domain || "",
      timezone: franchise.timezone || "",
      is_active: franchise.is_active,
    })
    setIsEditDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingFranchise(null)
    setFormData({
      code: "",
      name: "",
      primary_domain: "",
      timezone: "",
      is_active: true,
    })
    setIsEditDialogOpen(true)
  }

  const handleEditContent = (franchise: Franchise) => {
    setContentEditingFranchise(franchise)
    setIsContentEditDialogOpen(true)
  }

  const handleSaveBrandingConfig = async (config: FranchiseBrandingConfig) => {
    if (!contentEditingFranchise) return

    const response = await fetch(`/api/admin/franchises/${contentEditingFranchise.id}/branding-config`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ branding_config: config }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to save branding config")
    }

    // 刷新列表
    fetchFranchises()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const submitData = {
        ...formData,
        code: formData.code.trim().toLowerCase(),
        primary_domain: formData.primary_domain || undefined,
        timezone: formData.timezone || undefined,
      }

      const url = editingFranchise
        ? `/api/admin/franchises/${editingFranchise.id}`
        : "/api/admin/franchises"
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
        <h1 className="text-3xl font-bold">Franchises Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage sub-sites / franchises for different cities or regions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Franchises</CardTitle>
              <CardDescription>
                A list of all franchises in the system
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by code, name, or domain..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-72"
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
                    <TableHead>Primary Domain</TableHead>
                    <TableHead>Timezone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFranchises.map((franchise) => (
                    <TableRow key={franchise.id}>
                      <TableCell className="font-mono text-xs">{franchise.code}</TableCell>
                      <TableCell className="font-medium">{franchise.name}</TableCell>
                      <TableCell className="max-w-[220px] truncate">
                        {franchise.primary_domain || "N/A"}
                      </TableCell>
                      <TableCell>{franchise.timezone || "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant={franchise.is_active ? "default" : "secondary"}>
                          {franchise.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
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
                            <DropdownMenuItem onClick={() => handleEditContent(franchise)}>
                              <FileText className="mr-2 h-4 w-4" />
                              Edit Content
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
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingFranchise ? "Edit Franchise" : "Add New Franchise"}</DialogTitle>
            <DialogDescription>
              {editingFranchise ? "Update franchise information" : "Create a new franchise"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g., bellevue, newyork"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Bellevue, New York"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="primary_domain">Primary Domain</Label>
              <Input
                id="primary_domain"
                value={formData.primary_domain || ""}
                onChange={(e) => setFormData({ ...formData, primary_domain: e.target.value })}
                placeholder="e.g., bellevue.example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                value={formData.timezone || ""}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                placeholder="e.g., America/Los_Angeles"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.is_active ? "active" : "inactive"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    is_active: value === "active",
                  })
                }
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !formData.code || !formData.name}>
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

      {/* Content Edit Dialog */}
      {contentEditingFranchise && (
        <FranchiseContentEditDialog
          franchiseId={contentEditingFranchise.id}
          franchiseCode={contentEditingFranchise.code}
          franchiseName={contentEditingFranchise.name}
          brandingConfig={contentEditingFranchise.branding_config}
          open={isContentEditDialogOpen}
          onOpenChange={setIsContentEditDialogOpen}
          onSave={handleSaveBrandingConfig}
        />
      )}
    </div>
  )
}


