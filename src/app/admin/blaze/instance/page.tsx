'use client'

import { useState, useEffect } from "react"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Plus,
  Loader2,
  RefreshCcw,
  Calendar,
  Clock,
  Users,
  DollarSign,
  Edit,
  Trash2,
  Building2,
  MapPin,
  FolderTree,
  Layers,
  ChevronRight,
} from "lucide-react"
import { InstanceCreateDialog } from "@/components/admin/InstanceCreateDialogV2"
import { adminUiLabels } from "@/lib/admin-ui-labels"
import { adminToast, adminConfirm, getErrorMessage } from "@/lib/admin-toast"
import { cn } from "@/lib/utils"

interface Instance {
  id: string
  program_id: string
  offering_id: string
  campus_id?: string
  price_override?: number
  start_date: string
  end_date: string
  start_time?: string
  end_time?: string
  session_count?: number
  days_of_week?: number[]
  max_students?: number
  current_students: number
  instance_data_ext?: Record<string, any>
  status: string
  is_active: boolean
  program?: {
    id: string
    name: string
    display_name: string
    category?: {
      id: string
      name: string
      display_name: string
    }
    franchise?: {
      id: string
      code: string
      name: string
    }
  }
  offering?: {
    id: string
    name: string
    base_price?: number
    currency?: string
    offering_type?: {
      code: string
      name: string
    }
  }
  campus?: {
    id: string
    name: string
    display_name: string
  }
}

interface Program {
  id: string
  name: string
  display_name: string
  category_id: string
  franchise_id: string
}

interface Franchise {
  id: string
  code: string
  name: string
}

const HIERARCHY_BADGE_STYLES = {
  campus: "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-800",
  location: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800",
  program: "bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-950/40 dark:text-violet-200 dark:border-violet-800",
  activity: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800",
} as const

/** Card outer border by offering type code (0=Sun … 6=Sat for course day badges). */
const OFFERING_TYPE_BORDER: Record<string, string> = {
  camp: "border-orange-400 dark:border-orange-600",
  course: "border-indigo-400 dark:border-indigo-600",
  workshop: "border-rose-400 dark:border-rose-600",
  competition: "border-teal-400 dark:border-teal-600",
  default: "border-muted-foreground/25",
}

function getOfferingTypeCode(instance: Instance): string {
  return instance.offering?.offering_type?.code?.toLowerCase() ?? ""
}

function getDaysOfWeek(instance: Instance): number[] {
  const normalize = (values: unknown[]) =>
    [...values]
      .map((d) => (typeof d === "string" ? parseInt(d, 10) : Number(d)))
      .filter((d) => !Number.isNaN(d))
      .sort((a, b) => a - b)

  if (Array.isArray(instance.days_of_week) && instance.days_of_week.length > 0) {
    return normalize(instance.days_of_week)
  }
  const schedule = instance.instance_data_ext?.schedule as { days_of_week?: unknown[] } | undefined
  if (Array.isArray(schedule?.days_of_week) && schedule.days_of_week.length > 0) {
    return normalize(schedule.days_of_week)
  }
  return []
}

function CourseDaysOfWeekBadges({ days }: { days: number[] }) {
  if (days.length === 0) return null
  return (
    <span className="inline-flex items-center gap-0.5 shrink-0" title="Days of week (0=Sun, 1=Mon, …)">
      {days.map((day) => (
        <Badge
          key={day}
          variant="outline"
          className="h-4 min-w-[1rem] px-1 py-0 text-[10px] font-semibold tabular-nums justify-center rounded-sm border-indigo-300/80 text-indigo-800 bg-indigo-50/80 dark:border-indigo-700 dark:text-indigo-200 dark:bg-indigo-950/50"
        >
          {day}
        </Badge>
      ))}
    </span>
  )
}

function HierarchyBadge({
  icon: Icon,
  label,
  className,
}: {
  icon: typeof Building2
  label: string
  className: string
}) {
  return (
    <Badge
      variant="outline"
      className={cn("gap-1 px-1.5 py-0 text-[11px] font-normal leading-tight max-w-[14rem] truncate", className)}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-80" strokeWidth={1.5} />
      <span className="truncate">{label}</span>
    </Badge>
  )
}

function SessionHierarchyBadges({ instance }: { instance: Instance }) {
  const campusName = instance.program?.franchise?.name ?? "N/A"
  const locationName = instance.campus?.display_name ?? instance.campus?.name ?? "N/A"
  const programName = instance.program?.category?.display_name ?? instance.program?.category?.name ?? "N/A"
  const activityName = instance.program?.display_name ?? instance.program?.name ?? "N/A"

  const items = [
    { key: "campus", icon: Building2, label: campusName, style: HIERARCHY_BADGE_STYLES.campus },
    { key: "location", icon: MapPin, label: locationName, style: HIERARCHY_BADGE_STYLES.location },
    { key: "program", icon: FolderTree, label: programName, style: HIERARCHY_BADGE_STYLES.program },
    { key: "activity", icon: Layers, label: activityName, style: HIERARCHY_BADGE_STYLES.activity },
  ] as const

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1.5">
      {items.map((item, index) => (
        <div key={item.key} className="flex items-center gap-1 min-w-0">
          {index > 0 ? (
            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" strokeWidth={1.5} />
          ) : null}
          <HierarchyBadge icon={item.icon} label={item.label} className={item.style} />
        </div>
      ))}
    </div>
  )
}

export default function BlazeInstanceManagementPage() {
  const [instances, setInstances] = useState<Instance[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [franchises, setFranchises] = useState<Franchise[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFranchiseFilter, setSelectedFranchiseFilter] = useState<string>("all")
  const [selectedProgramFilter, setSelectedProgramFilter] = useState<string>("all")
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all")
  const [isInstanceDialogOpen, setIsInstanceDialogOpen] = useState(false)
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null)
  const [editingInstance, setEditingInstance] = useState<Instance | null>(null)

  useEffect(() => {
    fetchPrograms()
    fetchFranchises()
  }, [])

  useEffect(() => {
    fetchInstances()
  }, [selectedFranchiseFilter, selectedProgramFilter, selectedStatusFilter])

  const fetchInstances = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (selectedFranchiseFilter !== "all") {
        params.set("franchiseId", selectedFranchiseFilter)
      }
      if (selectedProgramFilter !== "all") {
        params.set("programId", selectedProgramFilter)
      }
      if (selectedStatusFilter !== "all") {
        params.set("status", selectedStatusFilter)
      }
      // 默认显示全部（含 is_active=false），避免有数据却显示 No instances found
      params.set("activeOnly", "false")

      const response = await fetch(`/api/admin/instance/v2?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setInstances(data || [])
      } else {
        console.error("Failed to fetch instances")
      }
    } catch (error) {
      console.error("Error fetching instances:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPrograms = async () => {
    try {
      const response = await fetch("/api/admin/programs/v2?activeOnly=true")
      if (response.ok) {
        const data = await response.json()
        setPrograms(data || [])
      }
    } catch (error) {
      console.error("Error fetching programs:", error)
    }
  }

  const fetchFranchises = async () => {
    try {
      const response = await fetch("/api/admin/franchises/v2")
      if (response.ok) {
        const data = await response.json()
        setFranchises(data || [])
      }
    } catch (error) {
      console.error("Error fetching franchises:", error)
    }
  }

  const handleCreateInstance = (programId?: string) => {
    setSelectedProgramId(programId || null)
    setEditingInstance(null)
    setIsInstanceDialogOpen(true)
  }

  const handleEditInstance = (instance: Instance) => {
    setEditingInstance(instance)
    setSelectedProgramId(instance.program_id)
    setIsInstanceDialogOpen(true)
  }

  const handleDeleteInstance = async (instanceId: string) => {
    if (!(await adminConfirm({
      title: "Delete this instance?",
      description: "This action cannot be undone.",
      confirmLabel: "Delete",
    }))) {
      return
    }

    try {
      const response = await fetch(`/api/admin/instance/v2/${instanceId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchInstances()
        adminToast.success("Instance deleted")
      } else {
        const data = await response.json()
        adminToast.error("Failed to delete instance", {
          description: getErrorMessage(data.error, "Failed to delete instance"),
        })
      }
    } catch (error) {
      console.error("Error deleting instance:", error)
      adminToast.error("Failed to delete instance", {
        description: getErrorMessage(error),
      })
    }
  }

  const filteredInstances = instances.filter((instance) => {
    const matchesSearch =
      searchQuery === "" ||
      instance.offering?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      instance.program?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      instance.campus?.display_name?.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesSearch
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatTime = (timeString?: string) => {
    if (!timeString) return ""
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800"
      case "ongoing":
        return "bg-green-100 text-green-800"
      case "completed":
        return "bg-gray-100 text-gray-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{adminUiLabels.instance.singular} Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage bookable sessions across all activities
          </p>
        </div>
        <Button onClick={() => handleCreateInstance()}>
          <Plus className="mr-2 h-4 w-4" />
          Create {adminUiLabels.instance.singular}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`Search ${adminUiLabels.instance.plural.toLowerCase()}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">{adminUiLabels.franchise.singular}</label>
              <Select value={selectedFranchiseFilter} onValueChange={setSelectedFranchiseFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={`All ${adminUiLabels.franchise.plural}`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All {adminUiLabels.franchise.plural}</SelectItem>
                  {franchises.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">{adminUiLabels.program.singular}</label>
              <Select value={selectedProgramFilter} onValueChange={setSelectedProgramFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={`All ${adminUiLabels.program.plural}`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All {adminUiLabels.program.plural}</SelectItem>
                  {programs.map((program) => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instances List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{adminUiLabels.instance.plural}</CardTitle>
              <CardDescription>
                {filteredInstances.length} {adminUiLabels.instance.singular.toLowerCase()}{filteredInstances.length !== 1 ? "s" : ""} found
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchInstances}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredInstances.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No {adminUiLabels.instance.plural.toLowerCase()} found
            </div>
          ) : (
            <div className="space-y-3">
              {filteredInstances.map((instance) => {
                const price = instance.price_override ?? instance.offering?.base_price ?? 0
                const currency = instance.offering?.currency ?? "USD"
                const offeringTypeCode = getOfferingTypeCode(instance)
                const borderClass =
                  OFFERING_TYPE_BORDER[offeringTypeCode] ?? OFFERING_TYPE_BORDER.default
                const isCourse = offeringTypeCode === "course"
                const daysOfWeek = isCourse ? getDaysOfWeek(instance) : []

                return (
                  <Card
                    key={instance.id}
                    className={cn("hover:shadow-sm transition-shadow border", borderClass)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-foreground truncate">
                              {instance.offering?.name || "Unknown Offering"}
                            </h3>
                            <Badge className={cn("text-[10px] px-1.5 py-0 font-normal", getStatusColor(instance.status))}>
                              {instance.status}
                            </Badge>
                            {instance.offering?.offering_type ? (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                                {instance.offering.offering_type.name}
                              </Badge>
                            ) : null}
                          </div>

                          <SessionHierarchyBadges instance={instance} />

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] leading-tight text-muted-foreground">
                            <span className="inline-flex items-center gap-1 shrink-0">
                              <Calendar className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                              {formatDate(instance.start_date)} – {formatDate(instance.end_date)}
                            </span>
                            {instance.start_time && instance.end_time ? (
                              <span className="inline-flex items-center gap-1 shrink-0">
                                <Clock className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                                {formatTime(instance.start_time)} – {formatTime(instance.end_time)}
                              </span>
                            ) : null}
                            {isCourse ? <CourseDaysOfWeekBadges days={daysOfWeek} /> : null}
                            <span className="inline-flex items-center gap-1 shrink-0">
                              <Users className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                              {instance.current_students}/{instance.max_students ?? "∞"}
                            </span>
                            <span className="inline-flex items-center gap-1 shrink-0">
                              <DollarSign className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                              {currency} {price.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 bg-transparent hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                            onClick={() => handleEditInstance(instance)}
                            aria-label={`Edit ${adminUiLabels.instance.singular}`}
                          >
                            <Edit className="h-4 w-4" strokeWidth={1.5} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 bg-transparent hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteInstance(instance.id)}
                            aria-label={`Delete ${adminUiLabels.instance.singular}`}
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <InstanceCreateDialog
        open={isInstanceDialogOpen}
        onOpenChange={setIsInstanceDialogOpen}
        programId={selectedProgramId || undefined}
        onSuccess={() => {
          fetchInstances()
          setIsInstanceDialogOpen(false)
          setEditingInstance(null)
          setSelectedProgramId(null)
        }}
        editingInstance={editingInstance}
      />
    </div>
  )
}
