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
import { Search, MoreVertical, Edit, Trash2, Plus, Loader2, RefreshCcw, Calendar as CalendarIcon, MapPin, Users, Clock } from "lucide-react"
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
    series?: { display_name: string }
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
  course?: { name: string }
  category?: { display_name: string }
  series?: { display_name: string }
}

interface CourseLocation {
  id: string
  name: string
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

export default function InstancesManagementPage() {
  const [instances, setInstances] = useState<CourseInstance[]>([])
  const [filteredInstances, setFilteredInstances] = useState<CourseInstance[]>([])
  const [assignments, setAssignments] = useState<CourseAssignment[]>([])
  const [locations, setLocations] = useState<CourseLocation[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [editingInstance, setEditingInstance] = useState<CourseInstance | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [exceptions, setExceptions] = useState<ExceptionDate[]>([])

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
  }, [])

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
      const response = await fetch("/api/admin/instances")
      
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
          Manage course instances (specific dates, times, and locations for course assignments)
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Instances</CardTitle>
              <CardDescription>
                A list of all course instances in the system
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search instances..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add Instance
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
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingInstance ? "Edit Instance" : "Add New Instance"}</DialogTitle>
            <DialogDescription>
              {editingInstance ? "Update instance information" : "Create a new course instance (specific dates, times, and location)"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="assignment_id">Assignment *</Label>
              <Select
                value={formData.assignment_id}
                onValueChange={(value) => setFormData({ ...formData, assignment_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an assignment" />
                </SelectTrigger>
                <SelectContent>
                  {assignments.map((assignment) => (
                    <SelectItem key={assignment.id} value={assignment.id}>
                      {getAssignmentLabel(assignment.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location_id">Location (Optional)</Label>
              <Select
                value={formData.location_id || "__none__"}
                onValueChange={(value) => setFormData({ ...formData, location_id: value === "__none__" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a location (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <Label htmlFor="instructor_name">Instructor Name</Label>
                <Input
                  id="instructor_name"
                  value={formData.instructor_name}
                  onChange={(e) => setFormData({ ...formData, instructor_name: e.target.value })}
                  placeholder="John Doe"
                />
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
    </div>
  )
}

