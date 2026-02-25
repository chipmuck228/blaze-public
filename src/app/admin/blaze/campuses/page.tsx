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
import { Search, MoreVertical, Edit, Trash2, Plus, Loader2, RefreshCcw, MapPin } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
  const [editingCampus, setEditingCampus] = useState<BlazeCampus | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
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
    if (!confirm("Are you sure you want to delete this campus? This will fail if there are existing instances using it.")) {
      return
    }

    try {
      const response = await fetch(`/api/blaze/campuses/${campusId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchCampuses()
      } else {
        const data = await response.json()
        alert(data.error || "Failed to delete campus")
      }
    } catch (error) {
      console.error("Error deleting campus:", error)
      alert("Failed to delete campus")
    }
  }

  const handleEdit = (campus: BlazeCampus) => {
    setEditingCampus(campus)
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
    setIsEditDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingCampus(null)
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
    setIsEditDialogOpen(true)
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

      const url = editingCampus
        ? `/api/blaze/campuses/${editingCampus.id}`
        : "/api/blaze/campuses"
      const method = editingCampus ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      })

      if (response.ok) {
        fetchCampuses()
        setIsEditDialogOpen(false)
        setEditingCampus(null)
      } else {
        const error = await response.json()
        alert(error.error || "Failed to save campus")
      }
    } catch (error) {
      console.error("Error saving campus:", error)
      alert("Failed to save campus")
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

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Blaze Campuses Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage campuses (where courses are held) using the new Blaze system
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Campuses</CardTitle>
              <CardDescription>
                A list of all campuses in the Blaze system
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search campuses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add Campus
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
          ) : filteredCampuses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? "No campuses found matching your search." : "No campuses found."}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Franchise</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampuses.map((campus) => (
                    <TableRow key={campus.id}>
                      <TableCell className="font-medium">{campus.name}</TableCell>
                      <TableCell>{campus.display_name}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {campus.address || "N/A"}
                      </TableCell>
                      <TableCell>{campus.city || "N/A"}</TableCell>
                      <TableCell>{campus.state || "N/A"}</TableCell>
                      <TableCell>{campus.country || "US"}</TableCell>
                      <TableCell>{getFranchiseLabel(campus)}</TableCell>
                      <TableCell>{campus.phone || "N/A"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {campus.email || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={campus.is_active ? "default" : "secondary"}>
                          {campus.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(campus.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(campus)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(campus.id)}
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
        <DialogContent className="max-w-[95vw] sm:max-w-[600px] lg:max-w-[700px] max-h-[95vh] h-[95vh] flex flex-col p-4 sm:p-6">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{editingCampus ? "Edit Campus" : "Add New Campus"}</DialogTitle>
            <DialogDescription>
              {editingCampus ? "Update campus information" : "Create a new campus"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="franchise_id">Franchise *</Label>
              <Select
                value={formData.franchise_id}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    franchise_id: value,
                  })
                }
                required
              >
                <SelectTrigger id="franchise_id">
                  <SelectValue placeholder={isLoadingFranchises ? "Loading..." : "Select a franchise"} />
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

            <div className="space-y-2">
              <Label htmlFor="name">Campus Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Main Campus, Downtown Center"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name *</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                placeholder="e.g., Main Campus, Downtown Center"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g., 123 Main Street"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="e.g., New York"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="e.g., NY"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zip_code">Zip Code</Label>
                <Input
                  id="zip_code"
                  value={formData.zip_code}
                  onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                  placeholder="e.g., 10001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="e.g., US"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g., (555) 123-4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g., info@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={formData.latitude ?? ""}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="e.g., 40.7128"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={formData.longitude ?? ""}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="e.g., -74.0060"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="is_active">Status</Label>
              <Select
                value={formData.is_active ? "active" : "inactive"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    is_active: value === "active",
                  })
                }
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
            <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !formData.name || !formData.display_name || !formData.franchise_id} className="w-full sm:w-auto">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingCampus ? (
                  "Update Campus"
                ) : (
                  "Create Campus"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
