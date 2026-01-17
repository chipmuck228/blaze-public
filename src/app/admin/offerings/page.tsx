'use client'

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Search, MoreVertical, Edit, Trash2, Plus, Loader2, RefreshCcw, Eye } from "lucide-react"
import { toast } from "sonner"
import { OfferingEditDialog } from "@/components/admin/OfferingEditDialog"

interface Offering {
  id: string
  name: string
  slug?: string
  description?: string
  target_audience?: string
  learning_outcomes?: string
  prerequisites?: string
  cancellation_policy?: string
  session_count?: number
  number_of_sessions?: number
  age_min?: number
  age_max?: number
  target_age_min?: number
  target_age_max?: number
  target_grades?: string[]
  grade_level?: string
  base_price?: number
  currency?: string
  duration_hours?: number
  poster_url?: string | null
  offering_type: 'course' | 'camp' | 'workshop' | 'free_trial' | 'gift_card' | 'care_service' | 'lunch_service'
  type_config?: Record<string, any>
  status: 'draft' | 'published' | 'suspended' | 'archived'
  is_active?: boolean
  created_at: string
  updated_at: string
  tags?: Array<{ id: string; name: string; display_name: string }>
}

interface OfferingType {
  code: string
  name: string
}

export default function OfferingsManagementPage() {
  const [offerings, setOfferings] = useState<Offering[]>([])
  const [filteredOfferings, setFilteredOfferings] = useState<Offering[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [offeringTypeFilter, setOfferingTypeFilter] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [editingOffering, setEditingOffering] = useState<Offering | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [viewingOfferingId, setViewingOfferingId] = useState<string | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offeringTypes, setOfferingTypes] = useState<OfferingType[]>([])

  const fetchOfferings = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const url = offeringTypeFilter !== "all" 
        ? `/api/admin/offerings?offeringType=${offeringTypeFilter}`
        : "/api/admin/offerings"
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error("Failed to fetch offerings")
      }

      const data = await response.json()
      setOfferings(data)
      setFilteredOfferings(data)
    } catch (err: any) {
      console.error("Error fetching offerings:", err)
      setError(err.message || "Failed to load offerings")
      toast.error(err.message || "Failed to load offerings")
    } finally {
      setIsLoading(false)
    }
  }, [offeringTypeFilter])

  useEffect(() => {
    fetchOfferings()
    fetchOfferingTypes()
  }, [fetchOfferings])

  const fetchOfferingTypes = async () => {
    try {
      const response = await fetch("/api/admin/offering-types")
      if (response.ok) {
        const data = await response.json()
        const activeTypes = data.filter((type: OfferingType & { is_active: boolean }) => type.is_active)
        setOfferingTypes(activeTypes)
      }
    } catch (error) {
      console.error("Error fetching offering types:", error)
    }
  }

  useEffect(() => {
    if (searchQuery) {
      const filtered = offerings.filter(
        (offering) =>
          offering.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          offering.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          offering.slug?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredOfferings(filtered)
    } else {
      setFilteredOfferings(offerings)
    }
  }, [searchQuery, offerings])

  const handleDelete = async (offeringId: string) => {
    // 检查 offering 状态：只有 draft 状态的 offering 可以删除
    const offering = offerings.find(o => o.id === offeringId)
    if (offering && offering.status !== 'draft') {
      toast.error(`Cannot delete offering with status '${offering.status}'. Only draft offerings can be deleted. Please archive the offering instead.`)
      return
    }

    if (!confirm("Are you sure you want to delete this offering? This action cannot be undone.")) {
      return
    }

    try {
      const response = await fetch(`/api/admin/offerings/${offeringId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Offering deleted successfully")
        fetchOfferings()
      } else {
        const data = await response.json()
        toast.error(data.error || "Failed to delete offering")
      }
    } catch (error) {
      console.error("Error deleting offering:", error)
      toast.error("Failed to delete offering")
    }
  }

  const handleView = (offering: Offering) => {
    setViewingOfferingId(offering.id)
    setIsDetailDialogOpen(true)
  }

  const handleEdit = (offering: Offering) => {
    // 禁止编辑 archived 状态的 offering
    if (offering.status === 'archived') {
      toast.error('Cannot edit archived offerings. Please view the offering details instead.')
      return
    }
    setEditingOffering(offering)
    setIsEditDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingOffering(null)
    setIsEditDialogOpen(true)
  }

  const handleOfferingUpdated = useCallback(() => {
    fetchOfferings()
    setIsEditDialogOpen(false)
    setEditingOffering(null)
  }, [fetchOfferings])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusBackgroundColor = (status: Offering['status']): string => {
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

  const getOfferingTypeLabel = (type: Offering['offering_type']) => {
    return offeringTypes.find(t => t.code === type)?.name || type
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Offerings Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage all offerings in the system (Course, Camp, Workshop, etc.)
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Offerings</CardTitle>
              <CardDescription>
                A list of all offerings in the system
              </CardDescription>
            </div>
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
              <Select value={offeringTypeFilter} onValueChange={setOfferingTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {offeringTypes.map((type) => (
                    <SelectItem key={type.code} value={type.code}>
                      {type.name}
                    </SelectItem>
                  ))}
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
              {searchQuery || offeringTypeFilter !== "all" 
                ? "No offerings found matching your filters." 
                : "No offerings found."}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Offering Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Sessions</TableHead>
                    <TableHead>Age Range</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOfferings.map((offering) => {
                    const gradesText = offering.target_grades && offering.target_grades.length > 0
                      ? `Grades: ${offering.target_grades.join(', ')}`
                      : ''
                    const slugText = offering.slug ? `Slug: ${offering.slug}` : ''
                    const statusText = offering.status && offering.status !== 'published'
                      ? `[${offering.status}]`
                      : ''
                    
                    return (
                      <TableRow 
                        key={offering.id}
                        className={getStatusBackgroundColor(offering.status)}
                      >
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => handleView(offering)}
                              className="text-left font-medium hover:text-primary transition-colors cursor-pointer"
                            >
                              {offering.name}
                            </button>
                            {(gradesText || slugText || statusText) && (
                              <span className="text-xs text-muted-foreground">
                                {[gradesText, slugText, statusText].filter(Boolean).join(' • ')}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getOfferingTypeLabel(offering.offering_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                          <div className="flex flex-wrap gap-1">
                            {offering.tags && offering.tags.length > 0 ? (
                              offering.tags.map((tag) => (
                                <Badge key={tag.id} variant="outline" className="text-xs">
                                  {tag.display_name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground">No tags</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{offering.session_count || offering.number_of_sessions || "N/A"}</TableCell>
                        <TableCell>
                          {(offering.age_min || offering.target_age_min) && (offering.age_max || offering.target_age_max)
                            ? `${offering.age_min || offering.target_age_min}-${offering.age_max || offering.target_age_max}`
                            : (offering.age_min || offering.target_age_min)
                            ? `${offering.age_min || offering.target_age_min}+`
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          {offering.base_price
                            ? `${offering.currency || "USD"} $${offering.base_price.toFixed(2)}`
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              offering.status === 'published' ? 'default' :
                              offering.status === 'draft' ? 'secondary' :
                              offering.status === 'suspended' ? 'destructive' :
                              'outline'
                            }
                          >
                            {offering.status === 'published' ? 'Published' :
                             offering.status === 'draft' ? 'Draft' :
                             offering.status === 'suspended' ? 'Suspended' :
                             'Archived'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(offering.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleView(offering)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleEdit(offering)}
                                disabled={offering.status === 'archived'}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit {offering.status === 'archived' && '(Archived offerings cannot be edited)'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDelete(offering.id)}
                                disabled={offering.status !== 'draft'}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete {offering.status !== 'draft' && '(Draft only)'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <OfferingEditDialog
        offering={editingOffering}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onOfferingUpdated={handleOfferingUpdated}
      />

      {/* TODO: Create OfferingDetailDialog component */}
      {isDetailDialogOpen && viewingOfferingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Offering Details</h2>
            <p className="text-muted-foreground mb-4">
              Offering detail dialog will be implemented here. For now, please use the API directly or create a dialog component.
            </p>
            <Button onClick={() => setIsDetailDialogOpen(false)}>Close</Button>
          </div>
        </div>
      )}
    </div>
  )
}

