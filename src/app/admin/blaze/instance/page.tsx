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
import { Search, Plus, Loader2, RefreshCcw, Calendar, Clock, Users, DollarSign, MapPin, Edit, Trash2 } from "lucide-react"
import { InstanceCreateDialog } from "@/components/admin/InstanceCreateDialogV2"

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
    if (!confirm("Are you sure you want to delete this instance?")) {
      return
    }

    try {
      const response = await fetch(`/api/admin/instance/v2/${instanceId}`, {
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
          <h1 className="text-3xl font-bold">Instance Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage course instances across all programs
          </p>
        </div>
        <Button onClick={() => handleCreateInstance()}>
          <Plus className="mr-2 h-4 w-4" />
          Create Instance
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
                  placeholder="Search instances..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Franchise</label>
              <Select value={selectedFranchiseFilter} onValueChange={setSelectedFranchiseFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Franchises" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Franchises</SelectItem>
                  {franchises.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Program</label>
              <Select value={selectedProgramFilter} onValueChange={setSelectedProgramFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Programs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Programs</SelectItem>
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
              <CardTitle>Instances</CardTitle>
              <CardDescription>
                {filteredInstances.length} instance{filteredInstances.length !== 1 ? "s" : ""} found
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
              No instances found
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInstances.map((instance) => {
                const price = instance.price_override ?? instance.offering?.base_price ?? 0
                const currency = instance.offering?.currency ?? "USD"

                return (
                  <Card key={instance.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">
                              {instance.offering?.name || "Unknown Offering"}
                            </h3>
                            <Badge className={getStatusColor(instance.status)}>
                              {instance.status}
                            </Badge>
                            {instance.offering?.offering_type && (
                              <Badge variant="outline">
                                {instance.offering.offering_type.name}
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {formatDate(instance.start_date)} - {formatDate(instance.end_date)}
                              </span>
                            </div>
                            {instance.start_time && instance.end_time && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>
                                  {formatTime(instance.start_time)} - {formatTime(instance.end_time)}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Users className="h-4 w-4" />
                              <span>
                                {instance.current_students} / {instance.max_students ?? "∞"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <DollarSign className="h-4 w-4" />
                              <span>
                                {currency} {price.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                            <div>
                              <strong>Program:</strong> {instance.program?.display_name}
                            </div>
                            {instance.program?.category && (
                              <div>
                                <strong>Category:</strong> {instance.program.category.display_name}
                              </div>
                            )}
                            {instance.program?.franchise && (
                              <div>
                                <strong>Franchise:</strong> {instance.program.franchise.name}
                              </div>
                            )}
                            {instance.campus && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span>{instance.campus.display_name}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditInstance(instance)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteInstance(instance.id)}
                          >
                            <Trash2 className="h-4 w-4" />
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
