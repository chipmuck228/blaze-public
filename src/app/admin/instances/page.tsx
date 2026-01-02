'use client'

import { useState, useEffect, Suspense } from "react"
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
import { Search, MoreVertical, Edit, Trash2, Plus, Loader2, RefreshCcw, Calendar as CalendarIcon, MapPin, Users, Clock, Copy, Table2, Network } from "lucide-react"
import { ChevronRight, ChevronDown, Calendar } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { BatchCreateInstanceDialog } from "@/components/admin/BatchCreateInstanceDialog"
import { Checkbox } from "@/components/ui/checkbox"
import { InstanceCalendar } from "@/components/admin/InstanceCalendar"

interface CourseInstance {
  id: string
  assignment_id: string
  location_id?: string
  start_date: string
  end_date: string
  start_time?: string
  end_time?: string
  days_of_week?: number[]
  icalendar_rrule?: string
  icalendar_exdates?: string[]
  icalendar_rdates?: string[]
  timezone?: string
  price_override?: number
  max_students?: number
  current_students: number
  instructor_name?: string
  instructor_id?: string
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled'
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
  assignment?: {
    id: string
    course?: { name: string }
    category?: { display_name: string }
    series?: { 
      id: string
      display_name: string
      franchise_id?: string | null
    }
  }
  location?: { name: string }
}

interface ExceptionDate {
  type: 'skip' | 'reschedule'
  originalDate: string
  newDate?: string
  newStartTime?: string
  newEndTime?: string
  reason?: string
}

interface CourseAssignment {
  id: string
  course_id: string
  category_id: string
  series_id: string
  location_id?: string
  course?: { name: string }
  category?: { display_name: string }
  series?: { 
    id: string
    display_name: string
    franchise_id?: string | null
  }
  location?: { name: string }
  franchise?: { id: string; code: string; name: string } | null
}

interface CourseLocation {
  id: string
  name: string
  franchise_id?: string | null
}

interface Coach {
  id: string
  name: string
  email: string
  image?: string
  role: string
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

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
      instances: Array<{
        id: string
        start_date: string
        end_date: string
        start_time?: string
        end_time?: string
        max_students?: number
        current_students: number
        status: string
        price_override?: number
        location?: {
          id: string
          name: string
          address?: string
          city?: string
          state?: string
        } | null
        course?: {
          id: string
          name: string
          slug: string
        } | null
      }>
    }>
  }>
}

function InstancesManagementPageContent() {
  const searchParams = useSearchParams()
  const [viewMode, setViewMode] = useState<"table" | "hierarchy">("table")
  const [instances, setInstances] = useState<CourseInstance[]>([])
  const [filteredInstances, setFilteredInstances] = useState<CourseInstance[]>([])
  const [hierarchyData, setHierarchyData] = useState<HierarchyData[]>([])
  const [assignments, setAssignments] = useState<CourseAssignment[]>([])
  const [locations, setLocations] = useState<CourseLocation[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingHierarchy, setIsLoadingHierarchy] = useState(false)
  const [editingInstance, setEditingInstance] = useState<CourseInstance | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [exceptions, setExceptions] = useState<ExceptionDate[]>([])
  const [franchiseFilter, setFranchiseFilter] = useState<string>("all")
  const [prefilledAssignmentId, setPrefilledAssignmentId] = useState<string | null>(null)
  const [isBatchCreateDialogOpen, setIsBatchCreateDialogOpen] = useState(false)
  const [selectedAssignmentForBatch, setSelectedAssignmentForBatch] = useState<CourseAssignment | null>(null)
  const [selectedAssignmentFranchiseId, setSelectedAssignmentFranchiseId] = useState<string | null>(null)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const [formData, setFormData] = useState<Omit<CourseInstance, 'id' | 'created_at' | 'updated_at'>>({
    assignment_id: "",
    location_id: "",
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: "",
    days_of_week: [],
    timezone: "America/Los_Angeles",
    price_override: undefined,
    max_students: undefined,
    current_students: 0,
    instructor_name: "",
    instructor_id: "",
    status: 'scheduled',
    notes: "",
    is_active: true,
  })

  useEffect(() => {
    fetchInstances()
    fetchAssignments()
    fetchLocations()
    fetchCoaches()
    
    // 检查 URL 参数，如果是从 Assignment 页面跳转过来的，预填充 Assignment
    const assignmentId = searchParams.get("assignmentId")
    const action = searchParams.get("action")
    if (assignmentId && action === "create") {
      setPrefilledAssignmentId(assignmentId)
      // 等待 assignments 加载完成后再打开对话框
      setTimeout(() => {
        handleAddFromAssignment(assignmentId)
      }, 500)
    }
  }, [franchiseFilter, searchParams])

  useEffect(() => {
    if (viewMode === "hierarchy") {
      fetchHierarchy()
    }
  }, [viewMode])

  useEffect(() => {
    if (searchQuery) {
      const filtered = instances.filter(
        (instance) =>
          instance.assignment?.course?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          instance.assignment?.category?.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          instance.assignment?.series?.display_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredInstances(filtered)
    } else {
      setFilteredInstances(instances)
    }
  }, [searchQuery, instances])

  const fetchInstances = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (franchiseFilter !== "all") {
        params.set("franchise", franchiseFilter)
      }
      const query = params.toString()
      const response = await fetch(`/api/admin/instances${query ? `?${query}` : ""}`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch instances")
      }

      const data = await response.json()
      setInstances(data)
      setFilteredInstances(data)
    } catch (err: any) {
      console.error("Error fetching instances:", err)
      setError(err.message || "Failed to load instances")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAssignments = async () => {
    try {
      const response = await fetch("/api/admin/assignments")
      if (response.ok) {
        const data = await response.json()
        setAssignments(data)
      }
    } catch (error) {
      console.error("Error fetching assignments:", error)
    }
  }

  const fetchLocations = async () => {
    try {
      const response = await fetch("/api/admin/locations")
      if (response.ok) {
        const data = await response.json()
        setLocations(data)
      } else {
        setLocations([])
      }
    } catch (error) {
      console.error("Error fetching locations:", error)
      setLocations([])
    }
  }

  const fetchCoaches = async () => {
    try {
      const response = await fetch("/api/admin/users/coaches")
      if (response.ok) {
        const data = await response.json()
        setCoaches(data)
      } else {
        setCoaches([])
      }
    } catch (error) {
      console.error("Error fetching coaches:", error)
      setCoaches([])
    }
  }

  const fetchHierarchy = async () => {
    try {
      setIsLoadingHierarchy(true)
      setError(null)
      const response = await fetch("/api/admin/instances/hierarchy")
      
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

  const handleDelete = async (instanceId: string) => {
    if (!confirm("Are you sure you want to delete this instance?")) {
      return
    }

    try {
      const response = await fetch(`/api/admin/instances/${instanceId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchInstances()
        // 如果当前是层级视图，也刷新层级数据
        if (viewMode === "hierarchy") {
          fetchHierarchy()
        }
      } else {
        const data = await response.json()
        alert(data.error || "Failed to delete instance")
      }
    } catch (error) {
      console.error("Error deleting instance:", error)
      alert("Failed to delete instance")
    }
  }

  const handleEdit = (instance: CourseInstance) => {
    setEditingInstance(instance)
    // 查找 assignment 以获取 franchise_id
    const assignment = assignments.find(a => a.id === instance.assignment_id) as CourseAssignment | undefined
    const franchiseId = assignment?.series?.franchise_id || null
    setSelectedAssignmentFranchiseId(franchiseId)
    
    setFormData({
      assignment_id: instance.assignment_id,
      location_id: instance.location_id || "",
      start_date: instance.start_date,
      end_date: instance.end_date,
      start_time: instance.start_time || "",
      end_time: instance.end_time || "",
      days_of_week: instance.days_of_week || [],
      icalendar_rrule: instance.icalendar_rrule,
      icalendar_exdates: instance.icalendar_exdates,
      icalendar_rdates: instance.icalendar_rdates,
      timezone: instance.timezone || "America/Los_Angeles",
      price_override: instance.price_override,
      max_students: instance.max_students,
      current_students: instance.current_students,
      instructor_name: instance.instructor_name || "",
      instructor_id: instance.instructor_id || "",
      status: instance.status,
      notes: instance.notes || "",
      is_active: instance.is_active,
    })

    // 从 icalendar_exdates 和 icalendar_rdates 重建 exceptions 数组
    const exdates = instance.icalendar_exdates || []
    const rdates = instance.icalendar_rdates || []
    const exceptionList: ExceptionDate[] = []

    // 处理排除日期（跳过）
    exdates.forEach(dateStr => {
      // 检查是否有对应的 rdate（改期）
      const hasRdate = rdates.some(rdate => rdate.startsWith(dateStr))
      if (!hasRdate) {
        exceptionList.push({
          type: 'skip',
          originalDate: parseICalDateToISO(dateStr),
        })
      }
    })

    // 处理改期（有 exdate 和对应的 rdate）
    exdates.forEach(exdate => {
      const matchingRdate = rdates.find(rdate => {
        // 检查 rdate 是否对应这个 exdate（可能是同一天或不同天）
        const rdateDate = rdate.substring(0, 8)
        return rdateDate !== exdate
      })
      if (matchingRdate) {
        const originalDate = parseICalDateToISO(exdate)
        const newDate = parseICalDateTimeToISO(matchingRdate)
        exceptionList.push({
          type: 'reschedule',
          originalDate,
          newDate: newDate.date,
          newStartTime: newDate.time,
        })
      }
    })

    setExceptions(exceptionList)
    setIsEditDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingInstance(null)
    setPrefilledAssignmentId(null)
    setSelectedAssignmentFranchiseId(null)
    setFormData({
      assignment_id: "",
      location_id: "",
      start_date: "",
      end_date: "",
      start_time: "",
      end_time: "",
      days_of_week: [],
      timezone: "America/Los_Angeles",
      price_override: undefined,
      max_students: undefined,
      current_students: 0,
      instructor_name: "",
      instructor_id: "",
      status: 'scheduled',
      notes: "",
      is_active: true,
    })
    setExceptions([])
    setIsEditDialogOpen(true)
  }

  const handleAddFromAssignment = (assignmentId: string) => {
    const assignment = assignments.find(a => a.id === assignmentId) as CourseAssignment | undefined
    if (!assignment) {
      console.error("Assignment not found:", assignmentId)
      return
    }

    const franchiseId = assignment.series?.franchise_id || null
    setSelectedAssignmentFranchiseId(franchiseId)

    setEditingInstance(null)
    setPrefilledAssignmentId(assignmentId)
    setFormData({
      assignment_id: assignmentId,
      location_id: "", // 不再从 assignment 预填充 location_id，因为 assignment 不再有 location_id
      start_date: "",
      end_date: "",
      start_time: "",
      end_time: "",
      days_of_week: [],
      timezone: "America/Los_Angeles",
      price_override: undefined,
      max_students: undefined,
      current_students: 0,
      instructor_name: "",
      instructor_id: "",
      status: 'scheduled',
      notes: "",
      is_active: true,
    })
    setExceptions([])
    setIsEditDialogOpen(true)
  }

  // 辅助函数：解析 iCalendar 日期格式 (YYYYMMDD) 为 ISO 日期 (YYYY-MM-DD)
  const parseICalDateToISO = (dateStr: string): string => {
    const year = dateStr.substring(0, 4)
    const month = dateStr.substring(4, 6)
    const day = dateStr.substring(6, 8)
    return `${year}-${month}-${day}`
  }

  // 辅助函数：解析 iCalendar 日期时间格式 (YYYYMMDDTHHMMSS) 为 ISO 日期和时间
  const parseICalDateTimeToISO = (dateTimeStr: string): { date: string; time: string } => {
    const year = dateTimeStr.substring(0, 4)
    const month = dateTimeStr.substring(4, 6)
    const day = dateTimeStr.substring(6, 8)
    const hours = dateTimeStr.length > 8 ? dateTimeStr.substring(9, 11) : "00"
    const minutes = dateTimeStr.length > 10 ? dateTimeStr.substring(11, 13) : "00"
    return {
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}`
    }
  }

  const toggleDayOfWeek = (day: number) => {
    setFormData((prev) => {
      const days = prev.days_of_week || []
      if (days.includes(day)) {
        return { ...prev, days_of_week: days.filter((d) => d !== day) }
      } else {
        return { ...prev, days_of_week: [...days, day] }
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const submitData = {
        ...formData,
        location_id: formData.location_id || undefined,
        instructor_id: formData.instructor_id || undefined,
        days_of_week: formData.days_of_week && formData.days_of_week.length > 0 ? formData.days_of_week : undefined,
        exceptions: exceptions.length > 0 ? exceptions : undefined, // 包含例外日期
      }

      const url = editingInstance
        ? `/api/admin/instances/${editingInstance.id}`
        : "/api/admin/instances"
      const method = editingInstance ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      })

      if (response.ok) {
        fetchInstances()
        // 如果当前是层级视图，也刷新层级数据
        if (viewMode === "hierarchy") {
          fetchHierarchy()
        }
        setIsEditDialogOpen(false)
        setEditingInstance(null)
        setExceptions([])
      } else {
        const error = await response.json()
        alert(error.error || "Failed to save instance")
      }
    } catch (error) {
      console.error("Error saving instance:", error)
      alert("Failed to save instance")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddException = () => {
    setExceptions([...exceptions, {
      type: 'skip',
      originalDate: "",
      reason: "",
    }])
  }

  const handleRemoveException = (index: number) => {
    setExceptions(exceptions.filter((_, i) => i !== index))
  }

  const handleUpdateException = (index: number, updates: Partial<ExceptionDate>) => {
    const updated = [...exceptions]
    updated[index] = { ...updated[index], ...updates }
    setExceptions(updated)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatTime = (timeString?: string) => {
    if (!timeString) return "N/A"
    return timeString
  }

  const getAssignmentLabel = (assignmentId: string) => {
    const assignment = assignments.find((a) => a.id === assignmentId)
    if (!assignment) return "Unknown"
    const courseName = assignment.course?.name || "Unknown Course"
    const categoryName = assignment.category?.display_name || "Unknown Category"
    const seriesName = assignment.series?.display_name || "Unknown Series"
    return `${courseName} (${categoryName} > ${seriesName})`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'default'
      case 'ongoing':
        return 'default'
      case 'completed':
        return 'secondary'
      case 'cancelled':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Instances Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage course instances (specific dates, times, and campuses for course assignments)
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Instances</CardTitle>
                <CardDescription>
                  A list of all course instances in the system
                </CardDescription>
              </div>
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "table" | "hierarchy")}>
                <TabsList>
                  <TabsTrigger value="table" title="Table View">
                    <Table2 className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="hierarchy" title="Hierarchy View">
                    <Network className="h-4 w-4" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            {viewMode === "table" && (
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                <div className="flex flex-col xs:flex-row gap-2 flex-1 min-w-0">
                  <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 w-full sm:w-48"
                    />
                  </div>
                  <Select
                    value={franchiseFilter}
                    onValueChange={(value) => setFranchiseFilter(value)}
                  >
                    <SelectTrigger className="w-full sm:w-[160px]">
                      <SelectValue placeholder="Franchise" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All franchises</SelectItem>
                      <SelectItem value="bellevue">Bellevue</SelectItem>
                      <SelectItem value="belred">Bel-Red</SelectItem>
                      <SelectItem value="issaquah">Issaquah</SelectItem>
                      <SelectItem value="cherrycrest">Cherry Crest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button onClick={handleAdd} variant="outline" size="sm" className="flex-1 sm:flex-initial">
                    <Plus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Add Instance</span>
                  </Button>
                  <Button onClick={() => setIsBatchCreateDialogOpen(true)} size="sm" className="flex-1 sm:flex-initial">
                    <Copy className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Batch Create</span>
                  </Button>
                </div>
              </div>
            )}
            {viewMode === "hierarchy" && (
              <div className="flex gap-2 justify-end">
                <Button onClick={handleAdd} variant="outline" size="sm">
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Add Instance</span>
                </Button>
                <Button onClick={() => setIsBatchCreateDialogOpen(true)} size="sm">
                  <Copy className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Batch Create</span>
                </Button>
              </div>
            )}
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
              <Button onClick={fetchInstances}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : filteredInstances.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? "No instances found matching your search." : "No instances found."}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredInstances.map((instance) => (
                <Card key={instance.id} className="hover:shadow-md transition-shadow flex flex-col">
                  <CardContent className="p-6 flex-1 flex flex-col">
                    <div className="flex flex-col gap-4 flex-1">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold mb-2 truncate">
                            {getAssignmentLabel(instance.assignment_id)}
                          </h3>
                          <div className="flex items-center gap-3 flex-wrap">
                            <Badge variant={getStatusColor(instance.status)} className="text-xs">
                              {instance.status}
                            </Badge>
                            {instance.location?.name && (
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5" />
                                <span className="truncate">{instance.location.name}</span>
                              </div>
                            )}
                            {instance.start_time && instance.end_time && (
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Clock className="h-3.5 w-3.5" />
                                <span>
                                  {formatTime(instance.start_time)} - {formatTime(instance.end_time)}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Users className="h-3.5 w-3.5" />
                              <span>
                                {instance.current_students}
                                {instance.max_students ? ` / ${instance.max_students}` : ""}
                              </span>
                            </div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(instance)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                window.open(`/api/admin/instances/${instance.id}/export`, '_blank')
                              }}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              Export to Calendar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(instance.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">Date Range</p>
                          <p className="font-medium text-xs">
                            {formatDate(instance.start_date)} - {formatDate(instance.end_date)}
                          </p>
                        </div>
                        {instance.days_of_week && instance.days_of_week.length > 0 && (
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">Days</p>
                            <p className="font-medium text-xs">
                              {instance.days_of_week
                                .map((d) => DAYS_OF_WEEK.find((day) => day.value === d)?.label.substring(0, 3))
                                .join(", ")}
                            </p>
                          </div>
                        )}
                        {instance.instructor_name && (
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">Instructor</p>
                            <p className="font-medium text-xs truncate">{instance.instructor_name}</p>
                          </div>
                        )}
                        {instance.price_override && (
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">Price</p>
                            <p className="font-medium text-xs">${instance.price_override.toFixed(2)}</p>
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      {instance.notes && (
                        <div className="pt-2 border-t">
                          <p className="text-muted-foreground text-xs mb-1">Notes</p>
                          <p className="text-sm line-clamp-2">{instance.notes}</p>
                        </div>
                      )}

                      {/* Calendar */}
                      <div className="pt-2 border-t flex-1 min-h-0">
                        <div className="border rounded-lg p-3 bg-muted/30">
                          <InstanceCalendar instance={instance} />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
                <div className="space-y-3 md:space-y-4">
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
                                        {category.series.length} Serie{category.series.length !== 1 ? 's' : ''}
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
                                                  {seriesItem.instances.length} Instance{seriesItem.instances.length !== 1 ? 's' : ''}
                                                </Badge>
                                              </button>
                                            </div>
                                            {isSeriesExpanded && (
                                              <div className="pl-4 md:pl-8 pr-2 md:pr-3 pb-2 md:pb-3 space-y-2">
                                                {seriesItem.instances.length === 0 ? (
                                                  <p className="text-xs text-muted-foreground italic pl-4">No instances available</p>
                                                ) : (
                                                  seriesItem.instances.map((instance) => (
                                                    <Card key={instance.id} className="border-l-2 border-l-accent/20">
                                                      <div className="p-2 md:p-3 space-y-2">
                                                        <div className="flex items-start justify-between gap-2">
                                                          <div className="flex-1 min-w-0">
                                                            {instance.course && (
                                                              <h6 className="font-medium text-xs md:text-sm mb-1 truncate">{instance.course.name}</h6>
                                                            )}
                                                            <div className="flex items-center gap-1.5 md:gap-2 flex-wrap text-xs">
                                                              <Badge variant={getStatusColor(instance.status as any)} className="text-xs">
                                                                {instance.status}
                                                              </Badge>
                                                              {instance.location && (
                                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                                  <MapPin className="h-3 w-3 shrink-0" />
                                                                  <span className="truncate max-w-[100px]">{instance.location.name}</span>
                                                                </div>
                                                              )}
                                                              {instance.start_time && instance.end_time && (
                                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                                  <Clock className="h-3 w-3 shrink-0" />
                                                                  <span className="truncate">{formatTime(instance.start_time)} - {formatTime(instance.end_time)}</span>
                                                                </div>
                                                              )}
                                                              <div className="flex items-center gap-1 text-muted-foreground">
                                                                <Users className="h-3 w-3 shrink-0" />
                                                                <span>{instance.current_students}{instance.max_students ? ` / ${instance.max_students}` : ''}</span>
                                                              </div>
                                                            </div>
                                                          </div>
                                                          <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                              <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 shrink-0">
                                                                <MoreVertical className="h-3 w-3 md:h-4 md:w-4" />
                                                              </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                              <DropdownMenuItem onClick={async () => {
                                                                const foundInstance = instances.find((i: CourseInstance) => i.id === instance.id)
                                                                if (foundInstance) {
                                                                  handleEdit(foundInstance)
                                                                } else {
                                                                  await fetchInstances()
                                                                  const found = instances.find((i: CourseInstance) => i.id === instance.id)
                                                                  if (found) handleEdit(found)
                                                                }
                                                              }}>
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                Edit
                                                              </DropdownMenuItem>
                                                              <DropdownMenuItem
                                                                onClick={() => {
                                                                  window.open(`/api/admin/instances/${instance.id}/export`, '_blank')
                                                                }}
                                                              >
                                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                                Export to Calendar
                                                              </DropdownMenuItem>
                                                              <DropdownMenuItem
                                                                className="text-destructive"
                                                                onClick={() => handleDelete(instance.id)}
                                                              >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Delete
                                                              </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                          </DropdownMenu>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                                          <div>
                                                            <p className="text-muted-foreground">Date Range</p>
                                                            <p className="font-medium">{formatDate(instance.start_date)} - {formatDate(instance.end_date)}</p>
                                                          </div>
                                                          {instance.price_override && (
                                                            <div>
                                                              <p className="text-muted-foreground">Price</p>
                                                              <p className="font-medium">${instance.price_override.toFixed(2)}</p>
                                                            </div>
                                                          )}
                                                        </div>
                                                      </div>
                                                    </Card>
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

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingInstance ? "Edit Instance" : "Add New Instance"}</DialogTitle>
            <DialogDescription>
              {editingInstance ? "Update instance information" : "Create a new course instance (specific dates, times, and campus)"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="assignment_id">Assignment *</Label>
              <Select
                value={formData.assignment_id}
                onValueChange={(value) => {
                  const selectedAssignment = assignments.find(a => a.id === value) as CourseAssignment | undefined
                  const franchiseId = selectedAssignment?.series?.franchise_id || null
                  
                  // 更新 franchise_id 状态
                  setSelectedAssignmentFranchiseId(franchiseId)
                  
                  // 检查当前选中的 location 是否属于该 franchise
                  const currentLocation = locations.find(l => l.id === formData.location_id)
                  const shouldClearLocation = currentLocation && currentLocation.franchise_id !== franchiseId
                  
                  setFormData({ 
                    ...formData, 
                    assignment_id: value,
                    // 如果当前 location 不属于该 franchise，清空 location_id
                    location_id: shouldClearLocation ? "" : formData.location_id
                  })
                }}
                required
                disabled={!!prefilledAssignmentId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an assignment" />
                </SelectTrigger>
                <SelectContent className="max-h-[400px]">
                  {assignments.map((assignment) => {
                    const courseName = assignment.course?.name || "Unknown Course"
                    const categoryName = assignment.category?.display_name || "Unknown Category"
                    const seriesName = assignment.series?.display_name || "Unknown Series"
                    const franchiseName = assignment.franchise?.name || "No Franchise"
                    
                    // 构建显示信息
                    const infoParts = [franchiseName, categoryName, seriesName].filter(Boolean)
                    const displayText = `${courseName} (${infoParts.join(' > ')})`
                    
                    return (
                      <SelectItem 
                        key={assignment.id} 
                        value={assignment.id}
                        textValue={displayText}
                        className="py-2.5"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-sm leading-tight">{courseName}</span>
                          <span className="text-xs text-muted-foreground leading-tight">
                            {infoParts.join(' • ')}
                          </span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              {prefilledAssignmentId && (
                <p className="text-xs text-muted-foreground">
                  Assignment is pre-filled from the previous page. You can change it if needed.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="location_id">Campus (Optional)</Label>
              <Select
                value={formData.location_id || "__none__"}
                onValueChange={(value) => setFormData({ ...formData, location_id: value === "__none__" ? "" : value })}
                disabled={!formData.assignment_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.assignment_id ? "Select a campus (optional)" : "Select an assignment first"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {(() => {
                    // 根据选中的 assignment 的 franchise_id 过滤 locations
                    const filteredLocations = selectedAssignmentFranchiseId
                      ? locations.filter(loc => loc.franchise_id === selectedAssignmentFranchiseId)
                      : locations
                    
                    if (filteredLocations.length === 0 && selectedAssignmentFranchiseId) {
                      return (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No campuses available for this franchise
                        </div>
                      )
                    }
                    
                    return filteredLocations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))
                  })()}
                </SelectContent>
              </Select>
              {formData.assignment_id && selectedAssignmentFranchiseId && (
                <p className="text-xs text-muted-foreground">
                  Only showing campuses for this assignment's franchise
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">End Date *</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_time">End Time</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Days of Week</Label>
              <div className="grid grid-cols-2 gap-2 border rounded-md p-3">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`day-${day.value}`}
                      checked={formData.days_of_week?.includes(day.value) || false}
                      onCheckedChange={() => toggleDayOfWeek(day.value)}
                    />
                    <Label htmlFor={`day-${day.value}`} className="text-sm font-normal cursor-pointer">
                      {day.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Exception Dates */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Exception Dates</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Skip or reschedule specific dates (e.g., public holidays)
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleAddException}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Exception
                </Button>
              </div>

              {exceptions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 border rounded-md">
                  No exceptions. Click 'Add Exception' to skip or reschedule dates.
                </p>
              ) : (
                <div className="space-y-3">
                  {exceptions.map((exception, index) => (
                    <Card key={index} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Select
                            value={exception.type}
                            onValueChange={(value: 'skip' | 'reschedule') =>
                              handleUpdateException(index, { type: value })
                            }
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="skip">Skip Date</SelectItem>
                              <SelectItem value="reschedule">Reschedule</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveException(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-sm">Original Date *</Label>
                            <Input
                              type="date"
                              value={exception.originalDate}
                              onChange={(e) =>
                                handleUpdateException(index, { originalDate: e.target.value })
                              }
                              required
                            />
                          </div>

                          {exception.type === 'reschedule' && (
                            <>
                              <div className="space-y-2">
                                <Label className="text-sm">New Date *</Label>
                                <Input
                                  type="date"
                                  value={exception.newDate || ""}
                                  onChange={(e) =>
                                    handleUpdateException(index, { newDate: e.target.value })
                                  }
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm">New Start Time</Label>
                                <Input
                                  type="time"
                                  value={exception.newStartTime || ""}
                                  onChange={(e) =>
                                    handleUpdateException(index, { newStartTime: e.target.value })
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm">New End Time</Label>
                                <Input
                                  type="time"
                                  value={exception.newEndTime || ""}
                                  onChange={(e) =>
                                    handleUpdateException(index, { newEndTime: e.target.value })
                                  }
                                />
                              </div>
                            </>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm">Reason (Optional)</Label>
                          <Input
                            placeholder="e.g., Public Holiday, Weather"
                            value={exception.reason || ""}
                            onChange={(e) =>
                              handleUpdateException(index, { reason: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_students">Max Students</Label>
                <Input
                  id="max_students"
                  type="number"
                  value={formData.max_students || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_students: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  placeholder="20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="current_students">Current Students</Label>
                <Input
                  id="current_students"
                  type="number"
                  value={formData.current_students}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      current_students: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price_override">Price Override</Label>
                <Input
                  id="price_override"
                  type="number"
                  step="0.01"
                  value={formData.price_override || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price_override: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  placeholder="299.99"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="instructor_id">Coach (Optional)</Label>
                <Select
                  value={formData.instructor_id || "__none__"}
                  onValueChange={(value) => {
                    if (value === "__none__") {
                      setFormData({ ...formData, instructor_id: "", instructor_name: "" })
                    } else {
                      const selectedCoach = coaches.find(c => c.id === value)
                      setFormData({ 
                        ...formData, 
                        instructor_id: value,
                        instructor_name: selectedCoach?.name || ""
                      })
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a coach (optional)" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="__none__">None</SelectItem>
                    {coaches.map((coach) => (
                      <SelectItem key={coach.id} value={coach.id}>
                        {coach.name} {coach.email ? `(${coach.email})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: 'scheduled' | 'ongoing' | 'completed' | 'cancelled') =>
                    setFormData({ ...formData, status: value })
                  }
                  required
                >
                  <SelectTrigger>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes"
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !formData.assignment_id || !formData.start_date || !formData.end_date}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingInstance ? (
                  "Update Instance"
                ) : (
                  "Create Instance"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <BatchCreateInstanceDialog
        open={isBatchCreateDialogOpen}
        onOpenChange={setIsBatchCreateDialogOpen}
        assignment={selectedAssignmentForBatch || undefined}
        assignments={assignments}
        onSuccess={() => {
          fetchInstances()
          setIsBatchCreateDialogOpen(false)
        }}
      />
    </div>
  )
}

export default function InstancesManagementPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <InstancesManagementPageContent />
    </Suspense>
  )
}

