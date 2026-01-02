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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, MoreVertical, Edit, Trash2, Plus, Loader2, RefreshCcw, Table2, Network } from "lucide-react"
import { ChevronRight, ChevronDown, BookOpen } from "lucide-react"

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
      courses: Array<{
        id: string
        name: string
        slug: string
        description?: string
        status: string
        base_price: number
      }>
    }>
  }>
}

export default function SeriesManagementPage() {
  const [viewMode, setViewMode] = useState<"table" | "hierarchy">("table")
  const [series, setSeries] = useState<CourseSeries[]>([])
  const [filteredSeries, setFilteredSeries] = useState<CourseSeries[]>([])
  const [hierarchyData, setHierarchyData] = useState<HierarchyData[]>([])
  const [categories, setCategories] = useState<CourseCategory[]>([])
  const [franchises, setFranchises] = useState<Franchise[]>([])
  const [selectedFranchiseFilter, setSelectedFranchiseFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingHierarchy, setIsLoadingHierarchy] = useState(false)
  const [editingSeries, setEditingSeries] = useState<CourseSeries | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

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
  }, [])

  useEffect(() => {
    if (viewMode === "hierarchy") {
      fetchHierarchy()
    }
  }, [viewMode])

  useEffect(() => {
    let base = [...series]

    if (selectedFranchiseFilter !== "all") {
      base = base.filter((s) => s.franchise_id === selectedFranchiseFilter)
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      base = base.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.display_name.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q)
      )
    }

    setFilteredSeries(base)
  }, [searchQuery, series, selectedFranchiseFilter])

  const fetchSeries = async () => {
    try {
      setIsLoading(true)
      setError(null)
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
      setFilteredSeries(data)
    } catch (err: any) {
      console.error("Error fetching series:", err)
      setError(err.message || "Failed to load programs")
    } finally {
      setIsLoading(false)
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

  const fetchHierarchy = async () => {
    try {
      setIsLoadingHierarchy(true)
      setError(null)
      const response = await fetch("/api/admin/series/hierarchy")
      
      if (!response.ok) {
        throw new Error("Failed to fetch hierarchy")
      }

      const data = await response.json()
      setHierarchyData(data.hierarchy || [])
      
      // 默认展开所有项
      const allIds = new Set<string>()
      data.hierarchy?.forEach((franchise: HierarchyData) => {
        allIds.add(`franchise-${franchise.id}`)
        franchise.categories.forEach((category) => {
          allIds.add(`category-${category.id}`)
          category.series.forEach((series) => {
            allIds.add(`series-${series.id}`)
          })
        })
      })
      setExpandedItems(allIds)
    } catch (err: any) {
      console.error("Error fetching hierarchy:", err)
      setError(err.message || "Failed to load hierarchy")
    } finally {
      setIsLoadingHierarchy(false)
    }
  }

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
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
        // 如果当前是层级视图，也刷新层级数据
        if (viewMode === "hierarchy") {
          fetchHierarchy()
        }
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
        // 如果当前是层级视图，也刷新层级数据
        if (viewMode === "hierarchy") {
          fetchHierarchy()
        }
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
              <div>
                <CardTitle>Programs</CardTitle>
                <CardDescription>
                  A list of all programs in the system
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "table" | "hierarchy")}>
                  <TabsList>
                    <TabsTrigger value="table">
                      <Table2 className="h-4 w-4 mr-2" />
                      Table View
                    </TabsTrigger>
                    <TabsTrigger value="hierarchy">
                      <Network className="h-4 w-4 mr-2" />
                      Hierarchy View
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                {viewMode === "table" && (
                  <>
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
                  </>
                )}
                <Button onClick={handleAdd}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Program
                </Button>
              </div>
            </div>
        </CardHeader>
        <CardContent>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "table" | "hierarchy")}>
            <TabsContent value="table" className="mt-0">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-12 space-y-4">
              <p className="text-destructive text-lg">{error}</p>
              <Button onClick={fetchSeries}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : filteredSeries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? "No programs found matching your search." : "No programs found."}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Franchise</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Date Range</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSeries.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.display_name}</TableCell>
                      <TableCell>{getFranchiseName(s.franchise_id)}</TableCell>
                      <TableCell>{getCategoryName(s.category_id)}</TableCell>
                      <TableCell>
                        {s.start_date && s.end_date
                          ? `${formatDate(s.start_date)} - ${formatDate(s.end_date)}`
                          : "N/A"}
                      </TableCell>
                      <TableCell>{s.display_order}</TableCell>
                      <TableCell>
                        <Badge variant={s.is_active ? "default" : "secondary"}>
                          {s.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(s.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(s)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(s.id)}
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
            </TabsContent>
            <TabsContent value="hierarchy" className="mt-0">
              {isLoadingHierarchy ? (
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
                  No hierarchy data found.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  {hierarchyData.map((franchise) => {
                    const franchiseId = `franchise-${franchise.id}`
                    const isFranchiseExpanded = expandedItems.has(franchiseId)
                    
                    return (
                      <Card key={franchise.id} className="overflow-hidden">
                        <button
                          onClick={() => toggleExpanded(franchiseId)}
                          className="w-full"
                        >
                          <div className="flex items-center justify-between p-3 md:p-4 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                              {isFranchiseExpanded ? (
                                <ChevronDown className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground shrink-0" />
                              ) : (
                                <ChevronRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground shrink-0" />
                              )}
                              <div className="min-w-0 flex-1">
                                <h3 className="text-base md:text-lg font-semibold truncate">{franchise.name}</h3>
                                <p className="text-xs md:text-sm text-muted-foreground truncate">Code: {franchise.code}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className="shrink-0 ml-2 text-xs">
                              {franchise.categories.length} Categor{franchise.categories.length !== 1 ? 'ies' : 'y'}
                            </Badge>
                          </div>
                        </button>
                        {isFranchiseExpanded && (
                          <div className="pl-4 md:pl-8 pr-3 md:pr-4 pb-3 md:pb-4 space-y-2 md:space-y-3">
                            {franchise.categories.map((category) => {
                              const categoryId = `category-${category.id}`
                              const isCategoryExpanded = expandedItems.has(categoryId)
                              
                              return (
                                <Card key={category.id} className="border-l-2 border-l-primary/20">
                                  <button
                                    onClick={() => toggleExpanded(categoryId)}
                                    className="w-full"
                                  >
                                    <div className="flex items-center justify-between p-2 md:p-3 hover:bg-muted/30 transition-colors">
                                      <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                                        {isCategoryExpanded ? (
                                          <ChevronDown className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground shrink-0" />
                                        ) : (
                                          <ChevronRight className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground shrink-0" />
                                        )}
                                        <div className="min-w-0 flex-1">
                                          <h4 className="font-medium text-sm md:text-base truncate">{category.display_name}</h4>
                                          <p className="text-xs text-muted-foreground truncate">{category.name}</p>
                                        </div>
                                      </div>
                                      <Badge variant="secondary" className="shrink-0 ml-2 text-xs">
                                        {category.series.length} Program{category.series.length !== 1 ? 's' : ''}
                                      </Badge>
                                    </div>
                                  </button>
                                  {isCategoryExpanded && (
                                    <div className="pl-4 md:pl-8 pr-2 md:pr-3 pb-2 md:pb-3 space-y-2">
                                      {category.series.map((seriesItem) => {
                                        const seriesId = `series-${seriesItem.id}`
                                        const isSeriesExpanded = expandedItems.has(seriesId)
                                        
                                        return (
                                          <Card key={seriesItem.id} className="border-l-2 border-l-secondary/20">
                                            <div className="flex items-center justify-between p-2 md:p-3">
                                              <button
                                                onClick={() => toggleExpanded(seriesId)}
                                                className="flex-1 flex items-center gap-2 md:gap-3 hover:bg-muted/20 transition-colors rounded-md p-2 -m-2 min-w-0"
                                              >
                                                {isSeriesExpanded ? (
                                                  <ChevronDown className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground shrink-0" />
                                                ) : (
                                                  <ChevronRight className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground shrink-0" />
                                                )}
                                                <div className="flex-1 text-left min-w-0">
                                                  <h5 className="font-medium text-xs md:text-sm truncate">{seriesItem.display_name}</h5>
                                                  <p className="text-xs text-muted-foreground truncate">{seriesItem.name}</p>
                                                </div>
                                                <Badge variant="outline" className="text-xs shrink-0 ml-2">
                                                  {seriesItem.courses.length} Instance{seriesItem.courses.length !== 1 ? 's' : ''}
                                                </Badge>
                                              </button>
                                              <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                  <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 shrink-0">
                                                    <MoreVertical className="h-3 w-3 md:h-4 md:w-4" />
                                                 </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                  <DropdownMenuItem onClick={async () => {
                                                    // 从原始的 series state 中查找
                                                    const foundSeries = series.find((s: CourseSeries) => s.id === seriesItem.id)
                                                    if (foundSeries) {
                                                      handleEdit(foundSeries)
                                                    } else {
                                                      // 如果找不到，重新获取数据
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
                                            {isSeriesExpanded && (
                                              <div className="pl-4 md:pl-8 pr-2 md:pr-3 pb-2 md:pb-3 space-y-2">
                                                {seriesItem.courses.length === 0 ? (
                                                  <p className="text-xs text-muted-foreground italic pl-4">No courses assigned</p>
                                                ) : (
                                                seriesItem.courses.map((course) => (
                                                  <div
                                                    key={course.id}
                                                    className="flex items-center gap-2 p-2 rounded-md bg-muted/30 border border-border/50"
                                                  >
                                                    <BookOpen className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                      <p className="text-xs md:text-sm font-medium truncate">{course.name}</p>
                                                      <div className="flex items-center gap-1.5 md:gap-2 mt-1 flex-wrap">
                                                        <Badge variant={course.status === 'published' ? 'default' : 'secondary'} className="text-xs">
                                                          {course.status}
                                                        </Badge>
                                                        {course.base_price && (
                                                          <span className="text-xs text-muted-foreground">
                                                            ${course.base_price.toFixed(2)}
                                                          </span>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </div>
                                                ))
                                                )}
                                              </div>
                                            )}
                                          </Card>
                                        )
                                      })}
                                    </div>
                                  )}
                                </Card>
                              )
                            })}
                          </div>
                        )}
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingSeries ? "Edit Program" : "Add New Program"}</DialogTitle>
            <DialogDescription>
              {editingSeries ? "Update program information" : "Create a new program (must belong to a category)"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleDialogOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !formData.category_id || !formData.name || !formData.display_name}>
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
    </div>
  )
}

