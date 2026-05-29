'use client'

import { useState, useEffect } from "react"
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
import { Badge } from "@/components/ui/badge"
import { Search, Edit, Trash2, Plus, Loader2, RefreshCcw, MapPin } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { adminUiLabels } from "@/lib/admin-ui-labels"
import { adminToast, adminConfirm, getErrorMessage } from "@/lib/admin-toast"

interface BlazeCampus {
  id: string
  franchise_id: string
  name: string
  display_name: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  country: string
  phone?: string
  email?: string
  latitude?: number
  longitude?: number
  is_active: boolean
  created_at: string
  updated_at: string
  franchise?: {
    id: string
    code: string
    name: string
  }
}

interface BlazeFranchise {
  id: string
  code: string
  name: string
  is_active: boolean
}

export default function BlazeCampusesManagementPage() {
  const [campuses, setCampuses] = useState<BlazeCampus[]>([])
  const [filteredCampuses, setFilteredCampuses] = useState<BlazeCampus[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [editingCampusId, setEditingCampusId] = useState<string | null>(null)
  const [addingNew, setAddingNew] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [franchises, setFranchises] = useState<BlazeFranchise[]>([])
  const [isLoadingFranchises, setIsLoadingFranchises] = useState(true)

  const [formData, setFormData] = useState<Omit<BlazeCampus, 'id' | 'created_at' | 'updated_at' | 'franchise'>>({
    franchise_id: "",
    name: "",
    display_name: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    country: "US",
    phone: "",
    email: "",
    latitude: undefined,
    longitude: undefined,
    is_active: true,
  })

  useEffect(() => {
    fetchCampuses()
    fetchFranchises()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      const filtered = campuses.filter(
        (campus) =>
          campus.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          campus.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          campus.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          campus.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          campus.state?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          campus.franchise?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredCampuses(filtered)
    } else {
      setFilteredCampuses(campuses)
    }
  }, [searchQuery, campuses])

  const fetchCampuses = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch("/api/blaze/campuses")
      
      if (!response.ok) {
        throw new Error("Failed to fetch campuses")
      }

      const data = await response.json()
      setCampuses(data)
      setFilteredCampuses(data)
    } catch (err: any) {
      console.error("Error fetching campuses:", err)
      setError(err.message || "Failed to load campuses")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchFranchises = async () => {
    try {
      setIsLoadingFranchises(true)
      // 使用 v2_franchise 表
      const response = await fetch("/api/admin/franchises/v2")
      if (!response.ok) {
        throw new Error("Failed to fetch franchises")
      }
      const data = await response.json()
      setFranchises(data || [])
    } catch (err) {
      console.error("Error fetching franchises:", err)
    } finally {
      setIsLoadingFranchises(false)
    }
  }

  const handleDelete = async (campusId: string) => {
    if (!(await adminConfirm({
      title: "Delete this campus?",
      description: "This will fail if there are existing instances using it.",
      confirmLabel: "Delete",
    }))) {
      return
    }

    try {
      const response = await fetch(`/api/blaze/campuses/${campusId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchCampuses()
        adminToast.success("Campus deleted")
      } else {
        const data = await response.json()
        adminToast.error("Failed to delete campus", {
          description: getErrorMessage(data.error),
        })
      }
    } catch (error) {
      console.error("Error deleting campus:", error)
      adminToast.error("Failed to delete campus", {
        description: getErrorMessage(error),
      })
    }
  }

  const handleEdit = (campus: BlazeCampus) => {
    setAddingNew(false)
    setEditingCampusId(campus.id)
    setFormData({
      franchise_id: campus.franchise_id,
      name: campus.name,
      display_name: campus.display_name,
      address: campus.address || "",
      city: campus.city || "",
      state: campus.state || "",
      zip_code: campus.zip_code || "",
      country: campus.country || "US",
      phone: campus.phone || "",
      email: campus.email || "",
      latitude: campus.latitude,
      longitude: campus.longitude,
      is_active: campus.is_active,
    })
  }

  const handleAdd = () => {
    setEditingCampusId(null)
    setAddingNew(true)
    setFormData({
      franchise_id: "",
      name: "",
      display_name: "",
      address: "",
      city: "",
      state: "",
      zip_code: "",
      country: "US",
      phone: "",
      email: "",
      latitude: undefined,
      longitude: undefined,
      is_active: true,
    })
  }

  const handleCancelEdit = () => {
    setEditingCampusId(null)
    setAddingNew(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const submitData = {
        ...formData,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        zip_code: formData.zip_code || undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        latitude: formData.latitude || undefined,
        longitude: formData.longitude || undefined,
      }

      const url = editingCampusId
        ? `/api/blaze/campuses/${editingCampusId}`
        : "/api/blaze/campuses"
      const method = editingCampusId ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      })

      if (response.ok) {
        fetchCampuses()
        setEditingCampusId(null)
        setAddingNew(false)
        adminToast.success(editingCampusId ? "Campus updated" : "Campus created")
      } else {
        const error = await response.json()
        adminToast.error("Failed to save campus", {
          description: getErrorMessage(error.error),
        })
      }
    } catch (error) {
      console.error("Error saving campus:", error)
      adminToast.error("Failed to save campus", {
        description: getErrorMessage(error),
      })
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

  const formatAddress = (campus: BlazeCampus) => {
    const parts = []
    if (campus.address) parts.push(campus.address)
    if (campus.city) parts.push(campus.city)
    if (campus.state) parts.push(campus.state)
    if (campus.zip_code) parts.push(campus.zip_code)
    return parts.length > 0 ? parts.join(", ") : "N/A"
  }

  const getFranchiseLabel = (campus: BlazeCampus) => {
    if (!campus.franchise_id) return "N/A"
    const f = franchises.find(fr => fr.id === campus.franchise_id)
    if (f) return f.name || f.code
    if (campus.franchise) return campus.franchise.name || campus.franchise.code
    return "N/A"
  }

  const formId = editingCampusId ?? "new"
  const renderInlineForm = (_campus: BlazeCampus | null) => (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor={`${formId}-franchise_id`}>{adminUiLabels.franchise.singular} *</Label>
        <Select
          value={formData.franchise_id}
          onValueChange={(value) => setFormData({ ...formData, franchise_id: value })}
          required
        >
          <SelectTrigger id={`${formId}-franchise_id`}>
            <SelectValue placeholder={isLoadingFranchises ? "Loading..." : `Select ${adminUiLabels.franchise.singular.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {franchises.map((f) => (
              <SelectItem key={f.id} value={f.id}>{f.name} ({f.code})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${formId}-name`}>Name *</Label>
          <Input
            id={`${formId}-name`}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={`${adminUiLabels.campus.singular} name`}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${formId}-display_name`}>Display Name *</Label>
          <Input
            id={`${formId}-display_name`}
            value={formData.display_name}
            onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
            placeholder="Display name"
            required
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${formId}-address`}>Address</Label>
        <Input
          id={`${formId}-address`}
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="Street address"
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${formId}-city`}>City</Label>
          <Input
            id={`${formId}-city`}
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            placeholder="City"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${formId}-state`}>State</Label>
          <Input
            id={`${formId}-state`}
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            placeholder="State"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${formId}-zip_code`}>Zip</Label>
          <Input
            id={`${formId}-zip_code`}
            value={formData.zip_code}
            onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
            placeholder="Zip"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${formId}-phone`}>Phone</Label>
          <Input
            id={`${formId}-phone`}
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="Phone"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${formId}-email`}>Email</Label>
          <Input
            id={`${formId}-email`}
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="Email"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${formId}-is_active`}>Status</Label>
        <Select
          value={formData.is_active ? "active" : "inactive"}
          onValueChange={(v) => setFormData({ ...formData, is_active: v === "active" })}
        >
          <SelectTrigger id={`${formId}-is_active`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={handleCancelEdit} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting || !formData.name || !formData.display_name || !formData.franchise_id} className="flex-1">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : editingCampusId ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  )

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Blaze {adminUiLabels.campus.plural} Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage physical locations (where sessions are held) using the Blaze system
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{adminUiLabels.campus.plural}</CardTitle>
              <CardDescription>
                A list of all locations in the Blaze system
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`Search ${adminUiLabels.campus.plural.toLowerCase()}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add {adminUiLabels.campus.singular}
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
              <Button onClick={fetchCampuses}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : filteredCampuses.length === 0 && !addingNew ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? `No ${adminUiLabels.campus.plural.toLowerCase()} found matching your search.` : `No ${adminUiLabels.campus.plural.toLowerCase()} found.`}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {addingNew && (
                <Card className="border-dashed">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">New {adminUiLabels.campus.singular}</CardTitle>
                    <CardDescription>Fill in the form and save</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {renderInlineForm(null)}
                  </CardContent>
                </Card>
              )}
              {filteredCampuses.map((campus) => (
                <Card key={campus.id}>
                  {editingCampusId === campus.id ? (
                    <>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Edit {adminUiLabels.campus.singular}</CardTitle>
                        <CardDescription>{campus.display_name}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {renderInlineForm(campus)}
                      </CardContent>
                    </>
                  ) : (
                    <>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-lg truncate">{campus.display_name || campus.name}</CardTitle>
                            <CardDescription className="truncate">{campus.name}</CardDescription>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(campus)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(campus.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 pt-0 text-sm">
                        {getFranchiseLabel(campus) !== "N/A" && (
                          <p className="text-muted-foreground">
                            <span className="font-medium text-foreground">{adminUiLabels.franchise.singular}:</span> {getFranchiseLabel(campus)}
                          </p>
                        )}
                        {formatAddress(campus) !== "N/A" && (
                          <p className="flex items-start gap-1.5 text-muted-foreground">
                            <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                            {formatAddress(campus)}
                          </p>
                        )}
                        {(campus.phone || campus.email) && (
                          <p className="text-muted-foreground">
                            {campus.phone || ""}
                            {campus.phone && campus.email ? " · " : ""}
                            {campus.email || ""}
                          </p>
                        )}
                        <div className="flex items-center justify-between pt-2">
                          <Badge variant={campus.is_active ? "default" : "secondary"}>
                            {campus.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{formatDate(campus.created_at)}</span>
                        </div>
                      </CardContent>
                    </>
                  )}
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
