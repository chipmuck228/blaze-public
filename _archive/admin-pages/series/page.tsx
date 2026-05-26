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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Search, MoreVertical, Edit, Trash2, Plus, Loader2, RefreshCcw, Calendar, Eye, Clock, Users, DollarSign, MapPin, X, AlertTriangle, Save } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { InstanceCreateDialog } from "@/components/admin/InstanceCreateDialog"

interface CourseSeries {
  id: string
  category_id: string
  franchise_id?: string | null
  name: string
  display_name: string
  description?: string
  start_date?: string
  end_date?: string
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface CourseCategory {
  id: string
  name: string
  display_name: string
}

interface Franchise {
  id: string
  code: string
  name: string
  is_active: boolean
}

interface HierarchyData {
  id: string
  code: string
  name: string
  categories: Array<{
    id: string
    name: string
    display_name: string
    series: Array<{
      id: string
      name: string
      display_name: string
      description?: string
      instances?: Array<{
        id: string
        offering_id: string
        start_date: string
        end_date: string
        start_time?: string
        end_time?: string
        max_students?: number
        current_students?: number
        status: string
        price_override?: number
        offering?: {
          id: string
          name: string
          slug?: string
          description?: string
          base_price?: number
          offering_type: string
        }
      }>
    }>
  }>
}

export default function SeriesManagementPage() {
  const router = useRouter()
  const [series, setSeries] = useState<CourseSeries[]>([])
  const [hierarchyData, setHierarchyData] = useState<HierarchyData[]>([])
  const [categories, setCategories] = useState<CourseCategory[]>([])
  const [franchises, setFranchises] = useState<Franchise[]>([])
  const [selectedFranchiseFilter, setSelectedFranchiseFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [editingSeries, setEditingSeries] = useState<CourseSeries | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isInstanceDialogOpen, setIsInstanceDialogOpen] = useState(false)
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [selectedInstance, setSelectedInstance] = useState<any | null>(null)
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'delete' | null>(null)
  const [editFormData, setEditFormData] = useState<any>({})
  const [isUpdating, setIsUpdating] = useState(false)
  const [locations, setLocations] = useState<any[]>([])

  const [formData, setFormData] = useState<Omit<CourseSeries, 'id' | 'created_at' | 'updated_at'>>({
    category_id: "",
    franchise_id: undefined,
    name: "",
    display_name: "",
    description: "",
    start_date: "",
    end_date: "",
    display_order: 0,
    is_active: true,
  })

  useEffect(() => {
    fetchSeries()
    fetchCategories()
    fetchFranchises()
    fetchHierarchy()
    // 初始加载时不传 franchiseId，显示所有 locations（用于其他场景）
    // fetchLocations()
  }, [])

  const fetchSeries = async () => {
    try {
      const params = new URLSearchParams()
      if (selectedFranchiseFilter !== "all") {
        params.set("franchiseId", selectedFranchiseFilter)
      }
      const query = params.toString()
      const response = await fetch(`/api/admin/series${query ? `?${query}` : ""}`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch programs")
      }

      const data = await response.json()
      setSeries(data)
    } catch (err: any) {
      console.error("Error fetching series:", err)
      // Don't set error here as hierarchy is the main view
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/admin/categories")
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const fetchFranchises = async () => {
    try {
      const response = await fetch("/api/admin/franchises")
      if (response.ok) {
        const data = await response.json()
        setFranchises(data)
      }
    } catch (error) {
      console.error("Error fetching franchises:", error)
    }
  }

  const fetchLocations = async (franchiseId?: string | null) => {
    try {
      const params = new URLSearchParams()
      if (franchiseId) {
        params.set("franchiseId", franchiseId)
      }
      const response = await fetch(`/api/admin/locations?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setLocations(data || [])
      }
    } catch (error) {
      console.error("Error fetching locations:", error)
      setLocations([])
    }
  }

  const fetchHierarchy = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch("/api/admin/series/hierarchy")
      
      if (!response.ok) {
        throw new Error("Failed to fetch hierarchy")
      }

      const data = await response.json()
      setHierarchyData(data.hierarchy || [])
    } catch (err: any) {
      console.error("Error fetching hierarchy:", err)
      setError(err.message || "Failed to load hierarchy")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (seriesId: string) => {
    if (!confirm("Are you sure you want to delete this program? This will fail if there are existing assignments.")) {
      return
    }

    try {
      const response = await fetch(`/api/admin/series/${seriesId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchSeries()
        fetchHierarchy()
      } else {
        const data = await response.json()
        alert(data.error || "Failed to delete program")
      }
    } catch (error) {
      console.error("Error deleting program:", error)
      alert("Failed to delete program")
    }
  }

  const handleEdit = (s: CourseSeries) => {
    setEditingSeries(s)
    setFormData({
      category_id: s.category_id,
      franchise_id: s.franchise_id || undefined,
      name: s.name,
      display_name: s.display_name,
      description: s.description || "",
      start_date: s.start_date || "",
      end_date: s.end_date || "",
      display_order: s.display_order,
      is_active: s.is_active,
    })
    setIsEditDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingSeries(null)
    setFormData({
      category_id: "",
      franchise_id: undefined,
      name: "",
      display_name: "",
      description: "",
      start_date: "",
      end_date: "",
      display_order: 0,
      is_active: true,
    })
    setIsEditDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const url = editingSeries
        ? `/api/admin/series/${editingSeries.id}`
        : "/api/admin/series"
      const method = editingSeries ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          franchise_id: formData.franchise_id || undefined,
        }),
      })

      if (response.ok) {
        fetchSeries()
        fetchHierarchy()
        // 延迟关闭 Dialog，确保 Select 组件清理完成
        setTimeout(() => {
          setIsEditDialogOpen(false)
          setEditingSeries(null)
        }, 100)
      } else {
        const error = await response.json()
        alert(error.error || "Failed to save program")
      }
    } catch (error) {
      console.error("Error saving program:", error)
      alert("Failed to save program")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      // 关闭所有打开的 Select 下拉菜单
      // 通过点击外部区域来关闭 Select
      const selectContent = document.querySelector('[role="listbox"]')
      if (selectContent) {
        // 如果 Select 是打开的，先关闭它
        const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
        document.body.dispatchEvent(event)
      }
      // 使用 requestAnimationFrame 确保 DOM 更新完成后再关闭 Dialog
      requestAnimationFrame(() => {
        setIsEditDialogOpen(false)
        setEditingSeries(null)
      })
    } else {
      setIsEditDialogOpen(true)
    }
  }

  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId)
    return category?.display_name || "Unknown"
  }

  const getFranchiseName = (franchiseId?: string | null) => {
    if (!franchiseId) return "Global / Unassigned"
    const f = franchises.find((fr) => fr.id === franchiseId)
    return f ? f.name || f.code : "Unknown"
  }

  // Handle instance view
  const handleInstanceView = (instance: any) => {
    setSelectedInstance(instance)
    setModalMode('view')
  }

  // Handle instance edit
  const handleInstanceEdit = (instance: any) => {
    setSelectedInstance(instance)
    setModalMode('edit')
    // Initialize edit form data with current instance values
    setEditFormData({
      start_date: instance.start_date || "",
      end_date: instance.end_date || "",
      start_time: instance.start_time || "",
      end_time: instance.end_time || "",
      max_students: instance.max_students || "",
      price_override: instance.price_override || "",
      status: instance.status || "scheduled",
      notes: instance.notes || "",
      is_active: instance.is_active !== undefined ? instance.is_active : true,
      location_id: instance.location_id || "",
      age_min: instance.age_min || "",
      age_max: instance.age_max || "",
      current_students: instance.current_students || 0,
    })
    // 根据 instance 的 franchise_id 获取对应的 campuses
    if (instance.franchise_id) {
      fetchLocations(instance.franchise_id)
    } else {
      // 如果没有 franchise_id，尝试从 series 获取
      // 查找 instance 所属的 series
      const series = hierarchyData
        .flatMap((f) => f.categories)
        .flatMap((c) => c.series)
        .find((s) => s.instances?.some((inst: any) => inst.id === instance.id))
      
      if (series) {
        // 从 hierarchyData 中找到对应的 franchise
        const franchise = hierarchyData.find((f) =>
          f.categories.some((c) => c.series.some((s: any) => s.id === series.id))
        )
        if (franchise && franchise.id !== "global") {
          fetchLocations(franchise.id)
        } else {
          // 如果没有找到 franchise，显示所有 locations
          fetchLocations()
        }
      } else {
        // 如果找不到 series，显示所有 locations
        fetchLocations()
      }
    }
  }

  // Handle instance delete
  const handleInstanceDeleteClick = (instance: any) => {
    setSelectedInstance(instance)
    setModalMode('delete')
  }

  // Close modal
  const closeModal = () => {
    setModalMode(null)
    setSelectedInstance(null)
    setEditFormData({})
  }

  // Handle delete confirmation
  const handleInstanceDelete = async () => {
    if (!selectedInstance?.id) return
    
    try {
      const response = await fetch(`/api/admin/instances/v2/${selectedInstance.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchHierarchy()
        closeModal()
      } else {
        const error = await response.json()
        alert(error.error || "Failed to delete instance")
      }
    } catch (error) {
      console.error("Error deleting instance:", error)
      alert("Failed to delete instance")
    }
  }

  // Handle update (for edit mode)
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedInstance?.id) return

    setIsUpdating(true)
    try {
      const updateData: any = {
        start_date: editFormData.start_date,
        end_date: editFormData.end_date,
        start_time: editFormData.start_time || null,
        end_time: editFormData.end_time || null,
        max_students: editFormData.max_students ? parseInt(editFormData.max_students) : null,
        price_override: editFormData.price_override ? parseFloat(editFormData.price_override) : null,
        status: editFormData.status || "scheduled",
        notes: editFormData.notes || null,
        is_active: editFormData.is_active !== undefined ? editFormData.is_active : true,
        location_id: editFormData.location_id || null,
        age_min: editFormData.age_min ? parseInt(editFormData.age_min) : null,
        age_max: editFormData.age_max ? parseInt(editFormData.age_max) : null,
        current_students: editFormData.current_students !== undefined ? parseInt(editFormData.current_students) : selectedInstance.current_students || 0,
      }

      const response = await fetch(`/api/admin/instances/v2/${selectedInstance.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      })

      if (response.ok) {
        fetchHierarchy()
        closeModal()
      } else {
        const error = await response.json()
        alert(error.error || "Failed to update instance")
      }
    } catch (error) {
      console.error("Error updating instance:", error)
      alert("Failed to update instance")
    } finally {
      setIsUpdating(false)
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
        <h1 className="text-3xl font-bold">Programs Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage programs (e.g., "2025 Winter Courses") per franchise.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search programs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select
                value={selectedFranchiseFilter}
                onValueChange={setSelectedFranchiseFilter}
              >
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="All franchises" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All franchises</SelectItem>
                  {franchises.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name} ({f.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add Program
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
              <Button onClick={fetchHierarchy}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : hierarchyData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No programs found.
            </div>
          ) : (
            <div className="space-y-4">
              {hierarchyData
                .filter((franchise) => {
                  if (selectedFranchiseFilter !== "all" && franchise.id !== selectedFranchiseFilter) {
                    return false
                  }
                  // Filter by search query
                  if (searchQuery) {
                    const q = searchQuery.toLowerCase()
                    return franchise.categories.some((category) =>
                      category.series.some((seriesItem) =>
                        seriesItem.name.toLowerCase().includes(q) ||
                        seriesItem.display_name.toLowerCase().includes(q) ||
                        seriesItem.description?.toLowerCase().includes(q)
                      )
                    )
                  }
                  return true
                })
                .map((franchise) => (
                  <Card key={franchise.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-semibold">
                          {franchise.name}
                        </CardTitle>
                        <Badge variant="secondary" className="text-sm">
                          {franchise.categories.length} Categor{franchise.categories.length !== 1 ? 'ies' : 'y'}
                        </Badge>
                      </div>
                      <CardDescription>Code: {franchise.code}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Accordion type="multiple" className="w-full">
                        {franchise.categories.map((category) => (
                          <AccordionItem key={category.id} value={category.id} className="border rounded-lg px-4 mb-2">
                            <AccordionTrigger className="hover:no-underline">
                              <div className="flex items-center justify-between w-full pr-4">
                                <div className="flex flex-col items-start text-left">
                                  <div className="flex items-center gap-3">
                                    <span className="font-medium">{category.display_name}</span>
                                  </div>
                                  <span className="text-xs text-muted-foreground mt-1">{category.name}</span>
                                </div>
                                <Badge variant="outline" className="text-sm shrink-0">
                                  {category.series.length} Program{category.series.length !== 1 ? 's' : ''}
                                </Badge>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-3 pt-2 pb-4">
                                {category.series
                                  .filter((seriesItem) => {
                                    if (searchQuery) {
                                      const q = searchQuery.toLowerCase()
                                      return (
                                        seriesItem.name.toLowerCase().includes(q) ||
                                        seriesItem.display_name.toLowerCase().includes(q) ||
                                        seriesItem.description?.toLowerCase().includes(q)
                                      )
                                    }
                                    return true
                                  })
                                  .map((seriesItem) => (
                                    <Card key={seriesItem.id} className="border-l-2 border-l-primary/20">
                                      <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                          <div className="flex-1">
                                            <CardTitle className="text-base">{seriesItem.display_name}</CardTitle>
                                            <CardDescription className="text-xs">{seriesItem.name}</CardDescription>
                                            {seriesItem.description && (
                                              <p className="text-sm text-muted-foreground mt-2">{seriesItem.description}</p>
                                            )}
                                          </div>
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                                <MoreVertical className="h-4 w-4" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                              <DropdownMenuItem onClick={async () => {
                                                const foundSeries = series.find((s: CourseSeries) => s.id === seriesItem.id)
                                                if (foundSeries) {
                                                  handleEdit(foundSeries)
                                                } else {
                                                  await fetchSeries()
                                                  const found = series.find((s: CourseSeries) => s.id === seriesItem.id)
                                                  if (found) handleEdit(found)
                                                }
                                              }}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                Edit
                                              </DropdownMenuItem>
                                              <DropdownMenuItem
                                                className="text-destructive"
                                                onClick={() => handleDelete(seriesItem.id)}
                                              >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </div>
                                      </CardHeader>
                                      <CardContent>
                                        {/* Display Instances */}
                                        {seriesItem.instances && seriesItem.instances.length > 0 ? (
                                          <div className="space-y-2">
                                            <p className="text-sm font-medium text-muted-foreground mb-2">
                                              Instances ({seriesItem.instances.length})
                                            </p>
                                            <div className="space-y-2">
                                              {seriesItem.instances.map((instance: any) => {
                                                const formatTime = (time?: string) => {
                                                  if (!time) return ''
                                                  const [hours, minutes] = time.split(':')
                                                  const hour = parseInt(hours)
                                                  const ampm = hour >= 12 ? 'PM' : 'AM'
                                                  const displayHour = hour % 12 || 12
                                                  return `${displayHour}:${minutes} ${ampm}`
                                                }

                                                return (
                                                  <div
                                                    key={instance.id}
                                                    className="flex items-center gap-2 p-2 rounded-md bg-muted/30 border"
                                                  >
                                                    <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                      <p className="text-sm font-medium truncate">
                                                        {instance.offering?.name || 'Unknown Offering'}
                                                      </p>
                                                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                        <Badge variant={instance.status === 'scheduled' ? 'default' : 'secondary'} className="text-xs">
                                                          {instance.status}
                                                        </Badge>
                                                        {instance.start_date && (
                                                          <span className="text-xs text-muted-foreground">
                                                            {new Date(instance.start_date).toLocaleDateString()}
                                                          </span>
                                                        )}
                                                        {instance.max_students && (
                                                          <span className="text-xs text-muted-foreground">
                                                            {instance.current_students || 0}/{instance.max_students} students
                                                          </span>
                                                        )}
                                                        {(instance.price_override || instance.offering?.base_price) && (
                                                          <span className="text-xs text-muted-foreground">
                                                            ${(instance.price_override || instance.offering?.base_price || 0).toFixed(2)}
                                                          </span>
                                                        )}
                                                      </div>
                                                    </div>
                                                    <DropdownMenu>
                                                      <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" size="sm" className="h-8 shrink-0">
                                                          <MoreVertical className="h-3.5 w-3.5" />
                                                        </Button>
                                                      </DropdownMenuTrigger>
                                                      <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleInstanceView(instance)}>
                                                          <Eye className="mr-2 h-4 w-4" />
                                                          View
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleInstanceEdit(instance)}>
                                                          <Edit className="mr-2 h-4 w-4" />
                                                          Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                          className="text-destructive"
                                                          onClick={() => handleInstanceDeleteClick(instance)}
                                                        >
                                                          <Trash2 className="mr-2 h-4 w-4" />
                                                          Delete
                                                        </DropdownMenuItem>
                                                      </DropdownMenuContent>
                                                    </DropdownMenu>
                                                  </div>
                                                )
                                              })}
                                            </div>
                                          </div>
                                        ) : (
                                          <p className="text-sm text-muted-foreground italic">No instances created yet</p>
                                        )}
                                        <div className="mt-4 pt-4 border-t">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              setSelectedSeriesId(seriesItem.id)
                                              // Find categoryId from hierarchyData
                                              const categoryId = hierarchyData
                                                .flatMap((f) => f.categories)
                                                .find((c) => c.series.some((s: any) => s.id === seriesItem.id))?.id
                                              setSelectedCategoryId(categoryId || null)
                                              setIsInstanceDialogOpen(true)
                                            }}
                                            className="w-full"
                                          >
                                            <Calendar className="mr-2 h-4 w-4" />
                                            Add Instance
                                          </Button>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instance Modal - View, Edit, Delete */}
      {modalMode && selectedInstance && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[40px] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  {modalMode === 'view' && 'Instance Details'}
                  {modalMode === 'edit' && 'Edit Instance'}
                  {modalMode === 'delete' && 'Delete Instance'}
                </h2>
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">
                  ID: {selectedInstance.id.substring(0, 8)}...
                </p>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto p-10 custom-scrollbar flex-grow">
              
              {/* VIEW MODE */}
              {modalMode === 'view' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-6 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                      <Badge variant={selectedInstance.status === 'scheduled' ? 'default' : 'secondary'} className="text-xs">
                        {selectedInstance.status}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Offering Type</p>
                      <Badge variant="outline" className="text-xs">
                        {selectedInstance.offering?.offering_type || 'N/A'}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Instance Information</h3>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-3 border-b border-slate-50">
                        <span className="text-sm text-slate-500">Offering Name</span>
                        <span className="font-bold text-slate-900">{selectedInstance.offering?.name || 'Unknown'}</span>
                      </div>
                      
                      {selectedInstance.offering?.description && (
                        <div className="flex justify-between items-start py-3 border-b border-slate-50">
                          <span className="text-sm text-slate-500">Description</span>
                          <span className="text-sm text-slate-900 text-right max-w-[60%]">{selectedInstance.offering.description}</span>
                        </div>
                      )}

                      {selectedInstance.start_date && (
                        <div className="flex justify-between items-center py-3 border-b border-slate-50">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            <span className="text-sm text-slate-500">Start Date</span>
                          </div>
                          <span className="font-bold text-slate-900">
                            {new Date(selectedInstance.start_date).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </span>
                        </div>
                      )}

                      {selectedInstance.end_date && (
                        <div className="flex justify-between items-center py-3 border-b border-slate-50">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            <span className="text-sm text-slate-500">End Date</span>
                          </div>
                          <span className="font-bold text-slate-900">
                            {new Date(selectedInstance.end_date).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </span>
                        </div>
                      )}

                      {selectedInstance.start_time && (
                        <div className="flex justify-between items-center py-3 border-b border-slate-50">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-slate-400" />
                            <span className="text-sm text-slate-500">Start Time</span>
                          </div>
                          <span className="font-bold text-slate-900">
                            {(() => {
                              if (!selectedInstance.start_time) return ''
                              const [hours, minutes] = selectedInstance.start_time.split(':')
                              const hour = parseInt(hours)
                              const ampm = hour >= 12 ? 'PM' : 'AM'
                              const displayHour = hour % 12 || 12
                              return `${displayHour}:${minutes} ${ampm}`
                            })()}
                          </span>
                        </div>
                      )}

                      {selectedInstance.end_time && (
                        <div className="flex justify-between items-center py-3 border-b border-slate-50">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-slate-400" />
                            <span className="text-sm text-slate-500">End Time</span>
                          </div>
                          <span className="font-bold text-slate-900">
                            {(() => {
                              if (!selectedInstance.end_time) return ''
                              const [hours, minutes] = selectedInstance.end_time.split(':')
                              const hour = parseInt(hours)
                              const ampm = hour >= 12 ? 'PM' : 'AM'
                              const displayHour = hour % 12 || 12
                              return `${displayHour}:${minutes} ${ampm}`
                            })()}
                          </span>
                        </div>
                      )}

                      {selectedInstance.max_students !== undefined && (
                        <div className="flex justify-between items-center py-3 border-b border-slate-50">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-slate-400" />
                            <span className="text-sm text-slate-500">Capacity</span>
                          </div>
                          <span className="font-bold text-slate-900">
                            {selectedInstance.current_students || 0} / {selectedInstance.max_students} students
                          </span>
                        </div>
                      )}

                      {(selectedInstance.price_override !== undefined || selectedInstance.offering?.base_price !== undefined) && (
                        <div className="flex justify-between items-center py-3 border-b border-slate-50">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-slate-400" />
                            <span className="text-sm text-slate-500">Price</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-slate-900">
                              ${(selectedInstance.price_override || selectedInstance.offering?.base_price || 0).toFixed(2)}
                            </span>
                            {selectedInstance.price_override && selectedInstance.offering?.base_price && (
                              <span className="text-xs text-slate-400 ml-2 block">
                                (override, base: ${selectedInstance.offering.base_price.toFixed(2)})
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* EDIT MODE */}
              {modalMode === 'edit' && (
                <form onSubmit={handleUpdate} className="space-y-6">
                  <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 mb-6">
                    <p className="text-xs text-blue-700 font-semibold italic">
                      Note: Only supplementary details can be edited online. To change the program itself, please contact support.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Date</label>
                        <Input
                          type="date"
                          value={editFormData.start_date || ""}
                          onChange={(e) => setEditFormData({ ...editFormData, start_date: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Date</label>
                        <Input
                          type="date"
                          value={editFormData.end_date || ""}
                          onChange={(e) => setEditFormData({ ...editFormData, end_date: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                          required
                        />
                      </div>
                    </div>

                    {/* Times */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Time</label>
                        <Input
                          type="time"
                          value={editFormData.start_time || ""}
                          onChange={(e) => setEditFormData({ ...editFormData, start_time: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Time</label>
                        <Input
                          type="time"
                          value={editFormData.end_time || ""}
                          onChange={(e) => setEditFormData({ ...editFormData, end_time: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                        />
                      </div>
                    </div>

                    {/* Campus */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Campus</label>
                      <Select
                        value={editFormData.location_id ? editFormData.location_id : "__none__"}
                        onValueChange={(value) => setEditFormData({ ...editFormData, location_id: value === "__none__" ? null : value })}
                      >
                        <SelectTrigger className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                          <SelectValue placeholder="Select a campus" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">No Campus</SelectItem>
                          {locations.map((loc) => (
                            <SelectItem key={loc.id} value={loc.id}>
                              {loc.name}
                              {loc.city && `, ${loc.city}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Capacity and Price */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Max Students</label>
                        <Input
                          type="number"
                          min="1"
                          value={editFormData.max_students || ""}
                          onChange={(e) => setEditFormData({ ...editFormData, max_students: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                          placeholder="e.g. 12"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Price Override ($)</label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editFormData.price_override || ""}
                          onChange={(e) => setEditFormData({ ...editFormData, price_override: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                          placeholder="e.g. 299.99"
                        />
                      </div>
                    </div>

                    {/* Age Range */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Min Age</label>
                        <Input
                          type="number"
                          min="0"
                          value={editFormData.age_min || ""}
                          onChange={(e) => setEditFormData({ ...editFormData, age_min: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                          placeholder="e.g. 8"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Max Age</label>
                        <Input
                          type="number"
                          min="0"
                          value={editFormData.age_max || ""}
                          onChange={(e) => setEditFormData({ ...editFormData, age_max: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                          placeholder="e.g. 12"
                        />
                      </div>
                    </div>

                    {/* Status */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                      <Select
                        value={editFormData.status || "scheduled"}
                        onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}
                      >
                        <SelectTrigger className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="ongoing">Ongoing</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notes</label>
                      <Textarea
                        rows={3}
                        value={editFormData.notes || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                        placeholder="Additional notes or instructions..."
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all resize-none"
                      />
                    </div>

                    {/* Active Status */}
                    <div className="flex items-center space-x-2 p-4 bg-slate-50 rounded-2xl">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={editFormData.is_active !== undefined ? editFormData.is_active : true}
                        onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <label htmlFor="is_active" className="text-sm font-bold text-slate-600 cursor-pointer">
                        Instance is active
                      </label>
                    </div>
                  </div>

                  <div className="pt-8 flex space-x-4">
                    <button 
                      type="button" 
                      onClick={closeModal}
                      disabled={isUpdating}
                      className="flex-1 py-4 px-6 rounded-2xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={isUpdating}
                      className="flex-1 py-4 px-6 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUpdating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Updating...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Update Instance</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* DELETE MODE */}
              {modalMode === 'delete' && (
                <div className="text-center space-y-8">
                  <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-12 h-12 text-red-600" />
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Are you absolutely sure?</h3>
                    <p className="text-slate-500 max-w-sm mx-auto">
                      Deleting instance <span className="font-black text-slate-900">{selectedInstance.id.substring(0, 8)}...</span> will permanently remove it from the system.
                      {selectedInstance.current_students > 0 && (
                        <span className="block mt-2 text-red-600 font-semibold">
                          Warning: This instance has {selectedInstance.current_students} enrolled students. It will be deactivated instead of deleted.
                        </span>
                      )}
                    </p>
                  </div>

                  {selectedInstance.current_students === 0 && (
                    <div className="bg-red-50 p-6 rounded-3xl border border-red-100">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-red-900">Action</span>
                        <span className="text-xl font-black text-red-600">Permanent Deletion</span>
                      </div>
                      <p className="text-[10px] text-red-500 font-bold text-left uppercase tracking-widest">This action cannot be undone</p>
                    </div>
                  )}

                  <div className="pt-4 flex flex-col space-y-3">
                    <button 
                      onClick={handleInstanceDelete}
                      className="w-full py-4 px-6 rounded-2xl bg-red-600 text-white font-black hover:bg-red-700 transition-all shadow-xl shadow-red-500/20"
                    >
                      {selectedInstance.current_students > 0 ? 'Deactivate Instance' : 'Confirm Deletion'}
                    </button>
                    <button 
                      onClick={closeModal}
                      className="w-full py-4 px-6 rounded-2xl bg-white border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}


      <Dialog open={isEditDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-[600px] lg:max-w-[700px] max-h-[95vh] h-[95vh] flex flex-col p-4 sm:p-6">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{editingSeries ? "Edit Program" : "Add New Program"}</DialogTitle>
            <DialogDescription>
              {editingSeries ? "Update program information" : "Create a new program (must belong to a category)"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category_id">Category *</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="franchise_id">Franchise</Label>
              <Select
                value={formData.franchise_id || ""}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    franchise_id: value || undefined,
                  })
                }
              >
                <SelectTrigger id="franchise_id">
                  <SelectValue placeholder="Select a franchise (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {franchises.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name} ({f.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., 2025-winter"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name *</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                placeholder="e.g., 2025 Winter Courses"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Program description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                type="number"
                value={formData.display_order}
                onChange={(e) =>
                  setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })
                }
                placeholder="0"
              />
            </div>

            </div>
            <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
              <Button type="button" variant="outline" onClick={() => handleDialogOpenChange(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !formData.category_id || !formData.name || !formData.display_name} className="w-full sm:w-auto">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingSeries ? (
                  "Update Program"
                ) : (
                  "Create Program"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Instance Create Dialog */}
      {selectedSeriesId && (
        <InstanceCreateDialog
          open={isInstanceDialogOpen}
          onOpenChange={(open) => {
            setIsInstanceDialogOpen(open)
            if (!open) {
              setSelectedSeriesId(null)
              setSelectedCategoryId(null)
            }
          }}
          seriesId={selectedSeriesId}
          categoryId={selectedCategoryId || undefined}
          onSuccess={() => {
            fetchHierarchy()
            setIsInstanceDialogOpen(false)
            setSelectedSeriesId(null)
            setSelectedCategoryId(null)
          }}
        />
      )}
    </div>
  )
}

