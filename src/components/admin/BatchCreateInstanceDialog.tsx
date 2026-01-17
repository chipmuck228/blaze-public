'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertCircle } from "lucide-react"
import { generateRRULE } from "@/lib/icalendar"

interface CourseAssignment {
  id: string
  course_id: string
  category_id: string
  series_id: string
  location_id?: string
  course?: { name: string }
  category?: { display_name: string }
  series?: { display_name: string }
  location?: { name: string }
}

interface CourseLocation {
  id: string
  name: string
}

interface BatchCreateInstanceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assignment?: CourseAssignment
  assignments: CourseAssignment[]
  onSuccess: () => void
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

export function BatchCreateInstanceDialog({
  open,
  onOpenChange,
  assignment: prefilledAssignment,
  assignments,
  onSuccess,
}: BatchCreateInstanceDialogProps) {
  const [assignmentId, setAssignmentId] = useState<string>(prefilledAssignment?.id || "")
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([])
  const [locations, setLocations] = useState<CourseLocation[]>([])
  const [isLoadingLocations, setIsLoadingLocations] = useState(false)
  const [startDate, setStartDate] = useState("")

  // Fetch locations when dialog opens
  useEffect(() => {
    if (open) {
      fetchLocations()
    }
  }, [open])

  const [endDate, setEndDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [timezone, setTimezone] = useState("America/Los_Angeles")
  const [maxStudents, setMaxStudents] = useState<number | undefined>(undefined)
  const [priceOverride, setPriceOverride] = useState<number | undefined>(undefined)
  const [instructorName, setInstructorName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewCount, setPreviewCount] = useState(0)

  const fetchLocations = async () => {
    try {
      setIsLoadingLocations(true)
      const response = await fetch("/api/admin/locations")
      if (response.ok) {
        const data = await response.json()
        setLocations(data || [])
      } else {
        setLocations([])
      }
    } catch (error) {
      console.error("Error fetching locations:", error)
      setLocations([])
    } finally {
      setIsLoadingLocations(false)
    }
  }

  // 当 prefilledAssignment 改变时，更新 assignmentId
  useEffect(() => {
    if (prefilledAssignment) {
      setAssignmentId(prefilledAssignment.id)
      // 不再从 assignment 中获取 location_id，因为 assignment 不再有 location_id
    }
  }, [prefilledAssignment])

  // 计算预览数量
  useEffect(() => {
    if (startDate && endDate && selectedDays.length > 0 && selectedLocationIds.length > 0) {
      try {
        const start = new Date(startDate)
        const end = new Date(endDate)
        const weeks = Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000))
        
        // 计算在日期范围内，选中的星期几会出现多少次
        let count = 0
        const currentDate = new Date(start)
        while (currentDate <= end) {
          const dayOfWeek = currentDate.getDay()
          if (selectedDays.includes(dayOfWeek)) {
            count++
          }
          currentDate.setDate(currentDate.getDate() + 1)
        }
        
        setPreviewCount(count * selectedLocationIds.length)
      } catch (error) {
        setPreviewCount(0)
      }
    } else {
      setPreviewCount(0)
    }
  }, [startDate, endDate, selectedDays, selectedLocationIds])

  const handleToggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day))
    } else {
      setSelectedDays([...selectedDays, day].sort((a, b) => a - b))
    }
  }

  const handleToggleLocation = (locationId: string) => {
    if (selectedLocationIds.includes(locationId)) {
      setSelectedLocationIds(selectedLocationIds.filter(id => id !== locationId))
    } else {
      setSelectedLocationIds([...selectedLocationIds, locationId])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // 验证
    if (!assignmentId) {
      setError("Please select an assignment")
      return
    }
    if (selectedLocationIds.length === 0) {
      setError("Please select at least one campus")
      return
    }
    if (!startDate || !endDate) {
      setError("Please select start and end dates")
      return
    }
    if (selectedDays.length === 0) {
      setError("Please select at least one day of week")
      return
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError("Start date must be before end date")
      return
    }

    setIsSubmitting(true)

    try {
      // 生成 RRULE
      const rrule = generateRRULE(startDate, endDate, selectedDays, startTime, timezone)

      // 为每个 location 创建 instance
      const promises = selectedLocationIds.map(locationId => {
        const instanceData = {
          assignment_id: assignmentId,
          location_id: locationId || undefined,
          start_date: startDate,
          end_date: endDate,
          start_time: startTime || undefined,
          end_time: endTime || undefined,
          days_of_week: selectedDays,
          icalendar_rrule: rrule,
          timezone: timezone,
          max_students: maxStudents || undefined,
          price_override: priceOverride || undefined,
          current_students: 0,
          instructor_name: instructorName || undefined,
          instructor_id: undefined,
          status: 'scheduled' as const,
          notes: undefined,
          is_active: true,
        }

        return fetch("/api/admin/instances", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(instanceData),
        })
      })

      const results = await Promise.allSettled(promises)
      
      // 检查结果
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok))
      if (failed.length > 0) {
        const errorMessages = await Promise.all(
          failed.map(async (r) => {
            if (r.status === 'rejected') {
              return r.reason?.message || 'Unknown error'
            }
            const data = await r.value.json()
            return data.error || 'Unknown error'
          })
        )
        throw new Error(`Failed to create ${failed.length} instance(s): ${errorMessages.join(', ')}`)
      }

      // 成功
      onSuccess()
      onOpenChange(false)
      
      // 重置表单
      setSelectedLocationIds(prefilledAssignment?.location_id ? [prefilledAssignment.location_id] : [])
      setStartDate("")
      setEndDate("")
      setStartTime("")
      setEndTime("")
      setSelectedDays([])
      setMaxStudents(undefined)
      setPriceOverride(undefined)
      setInstructorName("")
      setError(null)
    } catch (err: any) {
      console.error("Error creating instances:", err)
      setError(err.message || "Failed to create instances")
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedAssignment = assignments.find(a => a.id === assignmentId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[700px] lg:max-w-[900px] max-h-[95vh] h-[95vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Batch Create Instances</DialogTitle>
          <DialogDescription>
            Create multiple instances at once for the selected assignment. All instances will share the same schedule but can be at different campuses.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="assignment_id">Assignment *</Label>
            <Select
              value={assignmentId}
              onValueChange={setAssignmentId}
              required
              disabled={!!prefilledAssignment}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an assignment" />
              </SelectTrigger>
              <SelectContent className="max-h-[400px]">
                {assignments.map((assignment) => {
                  const courseName = assignment.course?.name || "Unknown Course"
                  const categoryName = assignment.category?.display_name || "Unknown Category"
                  const seriesName = assignment.series?.display_name || "Unknown Series"
                  
                  return (
                    <SelectItem 
                      key={assignment.id} 
                      value={assignment.id}
                    >
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-sm leading-tight">{courseName}</span>
                        <span className="text-xs text-muted-foreground leading-tight">
                          {categoryName} {'>'} {seriesName}
                        </span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Campuses * (Select multiple)</Label>
            <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
              {locations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No campuses available</p>
              ) : (
                locations.map((location) => (
                  <div key={location.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`location-${location.id}`}
                      checked={selectedLocationIds.includes(location.id)}
                      onCheckedChange={() => handleToggleLocation(location.id)}
                    />
                    <label
                      htmlFor={`location-${location.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {location.name}
                    </label>
                  </div>
                ))
              )}
            </div>
            {selectedLocationIds.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedLocationIds.map(locationId => {
                  const location = locations.find(l => l.id === locationId)
                  return location ? (
                    <Badge key={locationId} variant="secondary">
                      {location.name}
                    </Badge>
                  ) : null
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date *</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date *</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
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
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">End Time</Label>
              <Input
                id="end_time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Days of Week * (Select multiple)</Label>
            <div className="grid grid-cols-4 gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <div key={day.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`day-${day.value}`}
                    checked={selectedDays.includes(day.value)}
                    onCheckedChange={() => handleToggleDay(day.value)}
                  />
                  <label
                    htmlFor={`day-${day.value}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {day.label.slice(0, 3)}
                  </label>
                </div>
              ))}
            </div>
            {selectedDays.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedDays.map(day => {
                  const dayLabel = DAYS_OF_WEEK.find(d => d.value === day)?.label
                  return dayLabel ? (
                    <Badge key={day} variant="secondary">
                      {dayLabel}
                    </Badge>
                  ) : null
                })}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</SelectItem>
                <SelectItem value="America/New_York">America/New_York (EST/EDT)</SelectItem>
                <SelectItem value="America/Chicago">America/Chicago (CST/CDT)</SelectItem>
                <SelectItem value="America/Denver">America/Denver (MST/MDT)</SelectItem>
                <SelectItem value="UTC">UTC</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_students">Max Students</Label>
              <Input
                id="max_students"
                type="number"
                min="1"
                value={maxStudents || ""}
                onChange={(e) => setMaxStudents(e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price_override">Price Override ($)</Label>
              <Input
                id="price_override"
                type="number"
                step="0.01"
                min="0"
                value={priceOverride || ""}
                onChange={(e) => setPriceOverride(e.target.value ? parseFloat(e.target.value) : undefined)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructor_name">Instructor Name</Label>
            <Input
              id="instructor_name"
              value={instructorName}
              onChange={(e) => setInstructorName(e.target.value)}
              placeholder="Optional"
            />
          </div>

          {previewCount > 0 && (
            <div className="bg-muted p-4 rounded-md">
              <p className="text-sm font-medium">
                Preview: This will create <span className="text-primary font-bold">{previewCount}</span> instance(s)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedLocationIds.length} campus(es) × {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (7 * 24 * 60 * 60 * 1000))} week(s) × {selectedDays.length} day(s) per week
              </p>
            </div>
          )}
          </div>
          <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || previewCount === 0} className="w-full sm:w-auto">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                `Create ${previewCount > 0 ? previewCount : ''} Instance(s)`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

