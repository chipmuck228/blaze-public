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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, MoreVertical, Edit, Trash2, Plus, Loader2, RefreshCcw, List, Calendar, Eye, Clock, Users, DollarSign, MapPin, X, AlertTriangle, Save, Star, ImageIcon, Info } from "lucide-react"
import { adminToast, getErrorMessage } from "@/lib/admin-toast"
import type { StringKeyRecord } from "@/lib/typed-error"
import { PosterUploadField } from "@/components/ui/poster-upload-field"
import { RichTextEditor } from "@/components/admin/RichTextEditor"
import { plainTextFromRichContent, hasRichContent, RichTextDisplay } from "@/components/RichTextDisplay"
import { InstanceCreateDialog } from "@/components/admin/InstanceCreateDialogV2"
import { iterateInstanceSchemaFieldsForDisplay, type SchemaFieldConfig } from "@/lib/instance-schema"
import { adminUiLabels } from "@/lib/admin-ui-labels"
import { marked } from "marked"

/** 将库中已有纯文本/Markdown 转为 HTML，供 TipTap 加载；已是 HTML 则原样返回。 */
function richTextValueForEditor(raw: unknown): string {
  if (raw == null) return ""
  const s = typeof raw === "string" ? raw.trim() : String(raw).trim()
  if (!s) return ""
  if (s.startsWith("<") && s.includes(">")) return s
  try {
    return marked.parse(s) as string
  } catch {
    return s
  }
}

interface BlazeProgram {
  id: string
  category_id: string
  franchise_id: string
  name: string
  display_name: string
  description?: string
  start_date: string
  end_date: string
  display_order: number
  is_active: boolean
  featured?: boolean
  poster_url?: string | null
  created_at: string
  updated_at: string
  category?: {
    id: string
    name: string
    display_name: string
    franchise_id: string
  }
  franchise?: {
    id: string
    code: string
    name: string
  }
}

interface BlazeCategory {
  id: string
  name: string
  display_name: string
  franchise_id?: string
}

interface BlazeFranchise {
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
    programs: Array<{
      id: string
      name: string
      display_name: string
      description?: string
      start_date: string
      end_date: string
      featured?: boolean
      poster_url?: string | null
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
        age_min?: number
        age_max?: number
        campus_id?: string
        offering?: {
          id: string
          name: string
          slug?: string
          description?: string
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
      }>
    }>
  }>
}

interface BlazeInstance {
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
  age_min?: number
  age_max?: number
  campus_id?: string
  program_id?: string
  notes?: string
  is_active?: boolean
  instance_data_ext?: Record<string, unknown>
  offering?: {
    id: string
    name: string
    slug?: string
    description?: string
    base_price?: number
    currency?: string
    offering_type?: {
      code: string
      name: string
      instance_schema?: { fields?: Record<string, SchemaFieldConfig> }
    }
  }
  campus?: {
    id: string
    name: string
    display_name: string
  }
}

interface FranchiseCategoryMapRow {
  category: {
    id: string
    name: string
    display_name: string
  }
}

interface BlazeCampus {
  id: string
  name: string
  display_name: string
  city?: string
}

interface BlazeOffering {
  id: string
  name: string
}

interface InstanceEditFormData {
  start_date?: string
  end_date?: string
  start_time?: string
  end_time?: string
  max_students?: string
  current_students?: string
  price_override?: string
  status?: string
  notes?: string
  is_active?: boolean
  campus_id?: string | null
  age_min?: string
  age_max?: string
}

export default function BlazeProgramsManagementPage() {
  const [hierarchyData, setHierarchyData] = useState<HierarchyData[]>([])
  const [programs, setPrograms] = useState<BlazeProgram[]>([])
  const [categories, setCategories] = useState<BlazeCategory[]>([])
  const [franchises, setFranchises] = useState<BlazeFranchise[]>([])
  const [selectedFranchiseFilter, setSelectedFranchiseFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)
  const [editingProgram, setEditingProgram] = useState<BlazeProgram | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedInstance, setSelectedInstance] = useState<BlazeInstance | null>(null)
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'delete' | null>(null)
  const [editFormData, setEditFormData] = useState<InstanceEditFormData>({})
  const [isUpdating, setIsUpdating] = useState(false)
  const [campuses, setCampuses] = useState<BlazeCampus[]>([])
  const [offerings, setOfferings] = useState<BlazeOffering[]>([])
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null)
  const [isInstanceDialogOpen, setIsInstanceDialogOpen] = useState(false)
  const [editingInstance, setEditingInstance] = useState<BlazeInstance | null>(null)
  const [programToDelete, setProgramToDelete] = useState<{
    id: string
    display_name: string
    instanceCount?: number
  } | null>(null)
  const [isDeletingProgram, setIsDeletingProgram] = useState(false)
  const [posterFile, setPosterFile] = useState<File | null>(null)
  const [posterPreviewUrl, setPosterPreviewUrl] = useState<string | null>(null)

  const [formData, setFormData] = useState<Omit<BlazeProgram, 'id' | 'created_at' | 'updated_at' | 'category' | 'franchise'>>({
    category_id: "",
    franchise_id: "",
    name: "",
    display_name: "",
    description: "",
    start_date: "",
    end_date: "",
    display_order: 0,
    is_active: true,
    featured: false,
    poster_url: "",
  })

  useEffect(() => {
    fetchHierarchy()
    fetchFranchises()
  }, [])

  useEffect(() => {
    if (formData.franchise_id) {
      fetchCategories(formData.franchise_id)
    } else {
      setCategories([])
    }
  }, [formData.franchise_id])

  const fetchHierarchy = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch("/api/admin/programs/v2/hierarchy")
      
      if (!response.ok) {
        throw new Error("Failed to fetch hierarchy")
      }

      const data = await response.json()
      setHierarchyData(data.hierarchy || [])
    } catch (err: unknown) {
      console.error("Error fetching hierarchy:", err)
      setError(getErrorMessage(err) || "Failed to load hierarchy")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPrograms = async () => {
    try {
      const response = await fetch("/api/admin/programs/v2")
      if (response.ok) {
        const data = await response.json()
        setPrograms(data)
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

  const fetchCategories = async (franchiseId: string) => {
    try {
      setIsLoadingCategories(true)
      const response = await fetch(`/api/admin/franchises/v2/${franchiseId}/categories`)
      if (response.ok) {
        const data = await response.json()
        // 从 franchise_category_map 中提取 category 信息
        const categories = (data as FranchiseCategoryMapRow[]).map((item) => ({
          id: item.category.id,
          name: item.category.name,
          display_name: item.category.display_name,
          franchise_id: franchiseId, // 添加 franchise_id 以保持兼容性
        }))
        setCategories(categories)
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
      setCategories([])
    } finally {
      setIsLoadingCategories(false)
    }
  }

  const fetchCampuses = async (franchiseId?: string) => {
    try {
      const params = new URLSearchParams()
      if (franchiseId) {
        params.set("franchise_id", franchiseId)
      }
      const response = await fetch(`/api/blaze/campuses?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setCampuses(data || [])
      }
    } catch (error) {
      console.error("Error fetching campuses:", error)
      setCampuses([])
    }
  }

  const fetchOfferings = async () => {
    try {
      const response = await fetch("/api/blaze/offerings?status=published")
      if (response.ok) {
        const data = await response.json()
        setOfferings(data || [])
      }
    } catch (error) {
      console.error("Error fetching offerings:", error)
      setOfferings([])
    }
  }

  const handleConfirmDeleteProgram = async () => {
    if (!programToDelete) return
    setIsDeletingProgram(true)
    try {
      const response = await fetch(`/api/admin/programs/v2/${programToDelete.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchHierarchy()
        fetchPrograms()
        setProgramToDelete(null)
        if (editingProgram?.id === programToDelete.id) {
          setIsEditDialogOpen(false)
          setEditingProgram(null)
        }
        adminToast.success(`${adminUiLabels.program.singular} deleted successfully`)
      } else {
        const data = await response.json()
        adminToast.error("Failed to delete program", {
          description: data.error || undefined,
        })
      }
    } catch (error) {
      console.error("Error deleting program:", error)
      adminToast.error("Failed to delete program", {
        description: getErrorMessage(error),
      })
    } finally {
      setIsDeletingProgram(false)
    }
  }

  const openDeleteProgram = (program: { id: string; display_name: string; instances?: unknown[] }) => {
    setProgramToDelete({
      id: program.id,
      display_name: program.display_name,
      instanceCount: program.instances?.length ?? 0,
    })
  }

  const handlePosterFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl)
    if (file) {
      setPosterFile(file)
      setPosterPreviewUrl(URL.createObjectURL(file))
    } else {
      setPosterFile(null)
      setPosterPreviewUrl(null)
    }
  }

  const clearPosterFile = () => {
    if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl)
    setPosterFile(null)
    setPosterPreviewUrl(null)
    if (!editingProgram) setFormData((prev) => ({ ...prev, poster_url: "" }))
  }

  const uploadPosterFile = async (): Promise<string | null> => {
    if (!posterFile) return null
    const uploadFormData = new FormData()
    uploadFormData.append("file", posterFile)
    const res = await fetch("/api/admin/programs/v2/upload", {
      method: "POST",
      body: uploadFormData,
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || "Failed to upload poster")
    }
    const data = await res.json()
    return data.url ?? null
  }

  const handleEdit = (program: BlazeProgram) => {
    if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl)
    setPosterFile(null)
    setPosterPreviewUrl(null)
    setEditingProgram(program)
    setFormData({
      category_id: program.category_id,
      franchise_id: program.franchise_id,
      name: program.name,
      display_name: program.display_name,
      description: program.description || "",
      start_date: program.start_date,
      end_date: program.end_date,
      display_order: program.display_order,
      is_active: program.is_active,
      featured: program.featured ?? false,
      poster_url: program.poster_url ?? "",
    })
    if (program.franchise_id) {
      fetchCategories(program.franchise_id)
    }
    setIsEditDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingProgram(null)
    if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl)
    setPosterFile(null)
    setPosterPreviewUrl(null)
    setFormData({
      category_id: "",
      franchise_id: "",
      name: "",
      display_name: "",
      description: "",
      start_date: "",
      end_date: "",
      display_order: 0,
      is_active: true,
      featured: false,
      poster_url: "",
    })
    setCategories([])
    setIsEditDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      let posterUrl: string | undefined = formData.poster_url || undefined
      if (posterFile) {
        posterUrl = (await uploadPosterFile()) ?? undefined
      }

      if (editingProgram) {
        const submitData = {
          ...formData,
          description: formData.description || undefined,
          name: formData.name.toLowerCase().trim(),
          poster_url: posterUrl,
        }
        const response = await fetch(`/api/admin/programs/v2/${editingProgram.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submitData),
        })
        if (response.ok) {
          fetchHierarchy()
          fetchPrograms()
          setIsEditDialogOpen(false)
          setEditingProgram(null)
          clearPosterFile()
        } else {
          const error = await response.json()
          adminToast.error("Failed to save program", {
            description: error.error || undefined,
          })
        }
        return
      }

      // Create: save program first, then patch poster if uploaded
      const submitData = {
        ...formData,
        description: formData.description || undefined,
        name: formData.name.toLowerCase().trim(),
        poster_url: posterUrl,
      }
      const response = await fetch("/api/admin/programs/v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      })

      if (response.ok) {
        fetchHierarchy()
        fetchPrograms()
        setIsEditDialogOpen(false)
        setEditingProgram(null)
        clearPosterFile()
      } else {
        const error = await response.json()
        adminToast.error("Failed to save program", {
          description: error.error || undefined,
        })
      }
    } catch (error: unknown) {
      console.error("Error saving program:", error)
      adminToast.error("Failed to save program", {
        description: getErrorMessage(error),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle instance view
  const handleInstanceView = (instance: BlazeInstance) => {
    setSelectedInstance(instance)
    setModalMode('view')
  }

  // Handle instance edit (pass programId so dialog can show correct program in dropdown when hierarchy instance lacks program_id)
  const handleInstanceEdit = (instance: BlazeInstance, programId?: string) => {
    setEditingInstance(instance)
    setSelectedProgramId(programId ?? instance.program_id ?? null)
    setIsInstanceDialogOpen(true)
  }

  // Handle instance delete
  const handleInstanceDeleteClick = (instance: BlazeInstance) => {
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
      const response = await fetch(`/api/blaze/instances/${selectedInstance.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchHierarchy()
        closeModal()
      } else {
        const error = await response.json()
        adminToast.error("Failed to delete instance", {
          description: error.error || undefined,
        })
      }
    } catch (error) {
      console.error("Error deleting instance:", error)
      adminToast.error("Failed to delete instance", {
        description: getErrorMessage(error),
      })
    }
  }

  // Handle update (for edit mode)
  const handleInstanceUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedInstance?.id) return

    setIsUpdating(true)
    try {
      const updateData: StringKeyRecord = {
        start_date: editFormData.start_date,
        end_date: editFormData.end_date,
        start_time: editFormData.start_time || null,
        end_time: editFormData.end_time || null,
        max_students: editFormData.max_students ? parseInt(editFormData.max_students) : null,
        current_students: editFormData.current_students !== undefined ? parseInt(editFormData.current_students) : selectedInstance.current_students || 0,
        price_override: editFormData.price_override ? parseFloat(editFormData.price_override) : null,
        status: editFormData.status || "scheduled",
        notes: editFormData.notes || null,
        is_active: editFormData.is_active !== undefined ? editFormData.is_active : true,
        campus_id: editFormData.campus_id || null,
        age_min: editFormData.age_min ? parseInt(editFormData.age_min) : null,
        age_max: editFormData.age_max ? parseInt(editFormData.age_max) : null,
      }

      const response = await fetch(`/api/blaze/instances/${selectedInstance.id}`, {
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
        adminToast.error("Failed to update instance", {
          description: error.error || undefined,
        })
      }
    } catch (error) {
      console.error("Error updating instance:", error)
      adminToast.error("Failed to update instance")
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

  // Format instance_data_ext value for display based on instance_schema field type
  const formatSchemaValue = (value: unknown, fieldConfig: { type?: string; options?: unknown[] }): string => {
    if (value === undefined || value === null) return "—"
    switch (fieldConfig?.type) {
      case "boolean":
        return value ? "Yes" : "No"
      case "number":
        return typeof value === "number" ? String(value) : String(value)
      case "date":
        if (typeof value === "string") {
          try {
            return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
          } catch {
            return String(value)
          }
        }
        return String(value)
      case "time":
        if (typeof value === "string") {
          const [h, m] = value.split(":")
          const hour = parseInt(h, 10)
          const ampm = hour >= 12 ? "PM" : "AM"
          const displayHour = hour % 12 || 12
          return `${displayHour}:${m || "00"} ${ampm}`
        }
        return String(value)
      case "multiselect":
        return Array.isArray(value) ? value.join(", ") : String(value)
      case "select":
      case "text":
      default:
        return String(value)
    }
  }

  // Render schema-driven instance_data_ext fields for the View modal (supports object groups; display_scope admin or both)
  const renderInstanceSchemaFields = (instance: BlazeInstance) => {
    const schema = instance?.offering?.offering_type?.instance_schema?.fields
    const ext = instance?.instance_data_ext ?? {}
    if (!schema || typeof schema !== "object") return null
    const entries = Array.from(
      iterateInstanceSchemaFieldsForDisplay(schema, ext, { displayScope: "both", flatten: true })
    ).filter((e) => e.value !== undefined && e.value !== null && e.value !== "")
    if (entries.length === 0) return null
    return (
      <div className="space-y-4 mt-6">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Additional details</h3>
        <div className="space-y-3">
          {entries.map(({ key, label, value, type: fieldType, options: fieldOptions }) => {
            const display = formatSchemaValue(value, { type: fieldType ?? (typeof value === "number" ? "number" : Array.isArray(value) ? "multiselect" : "text"), options: fieldOptions })
            return (
              <div key={key} className="flex justify-between items-center py-3 border-b border-slate-50">
                <span className="text-sm text-slate-500">{label}</span>
                <span className="font-bold text-slate-900 text-right max-w-[60%]">{display}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const getStatusBackgroundColor = (isActive: boolean): string => {
    return isActive 
      ? 'bg-green-50 dark:bg-green-900/20' 
      : 'bg-gray-100 dark:bg-gray-800'
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{adminUiLabels.program.plural} (V2)</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          {adminUiLabels.program.plural} are the operational units that combine a <strong>{adminUiLabels.franchise.singular}</strong> and a subscribed <strong>{adminUiLabels.category.singular}</strong> with a time range (e.g. &quot;Spring 2026 Session&quot;). Under each activity you create <strong>{adminUiLabels.instance.plural}</strong>—the actual bookable classes (date, time, location, offering, capacity) that parents see and enroll in.
        </p>
      </div>

      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Info className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-base">How {adminUiLabels.program.plural} fit in the V2 model</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                <strong>{adminUiLabels.category.singular}</strong> (global) — A learning theme or level (e.g. Beginner Robotics, Competition Prep). Campuses subscribe to programs in &quot;{adminUiLabels.franchise.singular} Subscriptions&quot;. &bull; <strong>{adminUiLabels.program.singular}</strong> — A season or term under one campus and one program, with start/end dates (e.g. &quot;Spring 2026 Robotics&quot;). &bull; <strong>{adminUiLabels.instance.singular}</strong> — A concrete class tied to an Offering: schedule, location, capacity, and price. Users enroll in sessions.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div>
              <CardTitle>{adminUiLabels.program.plural} by {adminUiLabels.franchise.singular} &amp; {adminUiLabels.category.singular}</CardTitle>
              <CardDescription>
                Activities are grouped by campus and their subscribed programs. Use search and campus filter to find an activity; expand a program to add or edit activities and their sessions.
              </CardDescription>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={`Search ${adminUiLabels.program.plural.toLowerCase()}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Select value={selectedFranchiseFilter} onValueChange={setSelectedFranchiseFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={`Filter by ${adminUiLabels.franchise.singular.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All {adminUiLabels.franchise.plural}</SelectItem>
                    {franchises.map((franchise) => (
                      <SelectItem key={franchise.id} value={franchise.id}>
                        {franchise.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAdd}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add {adminUiLabels.program.singular}
                </Button>
              </div>
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
            <div className="text-center py-12 space-y-4">
              <p className="text-muted-foreground max-w-md mx-auto">
                No campuses or activities to show. Make sure campuses exist and have subscribed to at least one program in <strong>{adminUiLabels.franchise.singular} Subscriptions</strong> ({adminUiLabels.category.plural} page). Then use <strong>Add {adminUiLabels.program.singular}</strong> to create an activity for a campus and program; after saving, add sessions to open classes for enrollment.
              </p>
              <Button variant="outline" onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add {adminUiLabels.program.singular}
              </Button>
            </div>
          ) : (() => {
              const filteredHierarchy = hierarchyData.filter((franchise) => {
                if (selectedFranchiseFilter !== "all" && franchise.id !== selectedFranchiseFilter) {
                  return false
                }
                if (searchQuery) {
                  const q = searchQuery.toLowerCase()
                  return franchise.categories.some((category) =>
                    category.programs.some((programItem) =>
                      programItem.name.toLowerCase().includes(q) ||
                      programItem.display_name.toLowerCase().includes(q) ||
                      plainTextFromRichContent(programItem.description).toLowerCase().includes(q)
                    )
                  )
                }
                return true
              })
              if (filteredHierarchy.length === 0) {
                return (
                  <div className="text-center py-12 space-y-4">
                    <p className="text-muted-foreground max-w-md mx-auto">
                      No {adminUiLabels.program.plural.toLowerCase()} match the current search or {adminUiLabels.franchise.singular.toLowerCase()} filter. Try changing the filter or search term, or <strong>Add {adminUiLabels.program.singular}</strong> to create one.
                    </p>
                    <Button variant="outline" onClick={handleAdd}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add {adminUiLabels.program.singular}
                    </Button>
                  </div>
                )
              }
              return (
            <div className="space-y-4">
              {filteredHierarchy.map((franchise) => (
                  <Card key={franchise.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-semibold">
                          {franchise.name}
                        </CardTitle>
                        <Badge variant="secondary" className="text-sm">
                          {franchise.categories.length} {adminUiLabels.category.singular}{franchise.categories.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <CardDescription>
                        Code: {franchise.code}. Activities under this campus&apos;s subscribed programs; expand a program to manage activities and sessions.
                      </CardDescription>
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
                                  {category.programs.length} {adminUiLabels.program.singular}{category.programs.length !== 1 ? 's' : ''}
                                </Badge>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-3 pt-2 pb-4">
                                {category.programs
                                  .filter((programItem) => {
                                    if (!searchQuery) return true
                                    const q = searchQuery.toLowerCase()
                                    return (
                                      programItem.name.toLowerCase().includes(q) ||
                                      programItem.display_name.toLowerCase().includes(q) ||
                                      plainTextFromRichContent(programItem.description).toLowerCase().includes(q)
                                    )
                                  })
                                  .map((programItem) => {
                                    const foundProgram = programs.find((p: BlazeProgram) => p.id === programItem.id)
                                    
                                    return (
                                      <Card key={programItem.id} className="border-l-2 border-l-primary/20">
                                        <CardHeader className="pb-3">
                                          <div className="flex items-start gap-4">
                                            {/* Poster thumbnail (left) */}
                                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800/50 flex-shrink-0">
                                              {programItem.poster_url ? (
                                                <img
                                                  src={programItem.poster_url}
                                                  alt=""
                                                  className="w-full h-full object-cover"
                                                />
                                              ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 p-1">
                                                  <ImageIcon className="h-8 w-8 sm:h-9 sm:w-9 mb-0.5" strokeWidth={1.5} />
                                                  <span className="text-[10px] sm:text-xs text-center leading-tight">No poster</span>
                                                </div>
                                              )}
                                            </div>
                                            {/* Program info (right) */}
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-2 flex-wrap">
                                                    <CardTitle className="text-base">{programItem.display_name}</CardTitle>
                                                    {programItem.featured && (
                                                      <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 border-amber-200 dark:border-amber-800">
                                                        <Star className="h-3 w-3 mr-0.5 fill-current" />
                                                        Featured
                                                      </Badge>
                                                    )}
                                                  </div>
                                                  <CardDescription className="text-xs">{programItem.name}</CardDescription>
                                                  {hasRichContent(programItem.description) && (
                                                    <div className="mt-2 space-y-1">
                                                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">
                                                        Description
                                                      </p>
                                                      <RichTextDisplay
                                                        content={programItem.description}
                                                        className="text-muted-foreground"
                                                        preserveFormatting
                                                      />
                                                    </div>
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
                                                  if (foundProgram) {
                                                    handleEdit(foundProgram)
                                                  } else {
                                                    await fetchPrograms()
                                                    const found = programs.find((p: BlazeProgram) => p.id === programItem.id)
                                                    if (found) handleEdit(found)
                                                  }
                                                }}>
                                                  <Edit className="mr-2 h-4 w-4" />
                                                  Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                  className="text-destructive focus:text-destructive"
                                                  onClick={() => openDeleteProgram(programItem)}
                                                >
                                                  <Trash2 className="mr-2 h-4 w-4" />
                                                  Delete
                                                </DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                              </div>
                                            </div>
                                          </div>
                                        </CardHeader>
                                        <CardContent>
                                          {/* Display Instances */}
                                          <div className="flex items-center justify-between mb-2">
                                            <p className="text-sm font-medium text-muted-foreground">
                                              {adminUiLabels.instance.plural} ({programItem.instances?.length || 0}) — bookable classes (offering, schedule, location, capacity)
                                            </p>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => {
                                                setSelectedProgramId(programItem.id)
                                                setEditingInstance(null)
                                                setIsInstanceDialogOpen(true)
                                              }}
                                            >
                                              <Plus className="mr-2 h-4 w-4" />
                                              Add {adminUiLabels.instance.singular}
                                            </Button>
                                          </div>
                                          {programItem.instances && programItem.instances.length > 0 ? (
                                            <div className="space-y-2">
                                              <div className="space-y-2">
                                                {programItem.instances.map((instance) => {
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
                                                              {instance.offering?.currency || 'USD'} ${(instance.price_override || instance.offering?.base_price || 0).toFixed(2)}
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
                                                          <DropdownMenuItem onClick={() => handleInstanceEdit(instance, programItem.id)}>
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
                                            <p className="text-sm text-muted-foreground italic">No {adminUiLabels.instance.plural.toLowerCase()} yet. Add a {adminUiLabels.instance.singular.toLowerCase()} to open a class for enrollment (choose an offering, dates, location, and capacity).</p>
                                          )}
                                          <div className="mt-4 pt-4 border-t">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => {
                                                setSelectedProgramId(programItem.id)
                                                setIsInstanceDialogOpen(true)
                                                fetchOfferings()
                                                if (franchise.id) {
                                                  fetchCampuses(franchise.id)
                                                }
                                              }}
                                              className="w-full"
                                            >
                                              <Calendar className="mr-2 h-4 w-4" />
                                              Add {adminUiLabels.instance.singular}
                                            </Button>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    )
                                  })}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </CardContent>
                  </Card>
                ))}
            </div>
              )
            })()}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[800px] lg:max-w-[900px] max-h-[95vh] h-[95vh] flex flex-col p-4 sm:p-6">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{editingProgram ? `Edit ${adminUiLabels.program.singular}` : `Add New ${adminUiLabels.program.singular}`}</DialogTitle>
            <DialogDescription>
              {editingProgram
                ? `Update activity name, dates, poster, and status. ${adminUiLabels.franchise.singular} and ${adminUiLabels.category.singular.toLowerCase()} cannot be changed after creation.`
                : `An activity defines a season or term (e.g. Spring 2026) under one campus and one subscribed program. Set the date range and display options; you can add sessions (bookable classes) after saving.`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">{adminUiLabels.franchise.singular} &amp; {adminUiLabels.category.singular}</CardTitle>
                  <CardDescription className="text-xs">Activities belong to one campus and one of its subscribed programs. This choice cannot be changed after creation. If a program is missing, subscribe to it in the {adminUiLabels.category.plural} page under &quot;{adminUiLabels.franchise.singular} Subscriptions&quot;.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="franchise_id" className="text-xs">{adminUiLabels.franchise.singular} <span className="text-red-500">*</span></Label>
                      <Select
                        value={formData.franchise_id}
                        onValueChange={(value) => {
                          setFormData({
                            ...formData,
                            franchise_id: value,
                            category_id: "",
                          })
                        }}
                        required
                        disabled={!!editingProgram}
                      >
                        <SelectTrigger id="franchise_id" className="h-9">
                          <SelectValue placeholder={`Select a ${adminUiLabels.franchise.singular.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {franchises
                            .filter(f => f.is_active)
                            .map((franchise) => (
                              <SelectItem key={franchise.id} value={franchise.id}>
                                {franchise.name} ({franchise.code})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="category_id" className="text-xs">{adminUiLabels.category.singular} <span className="text-red-500">*</span></Label>
                      <Select
                        value={formData.category_id}
                        onValueChange={(value) =>
                          setFormData({ ...formData, category_id: value })
                        }
                        required
                        disabled={!formData.franchise_id || isLoadingCategories || !!editingProgram}
                      >
                        <SelectTrigger id="category_id" className="h-9">
                          <SelectValue placeholder={isLoadingCategories ? "Loading..." : formData.franchise_id ? `Select a ${adminUiLabels.category.singular.toLowerCase()}` : `Select ${adminUiLabels.franchise.singular.toLowerCase()} first`} />
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
                  </div>
                  {!formData.franchise_id && (
                    <p className="text-xs text-muted-foreground">Select a {adminUiLabels.franchise.singular.toLowerCase()} first.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Name &amp; Description</CardTitle>
                  <CardDescription className="text-xs">Use a stable internal name (e.g. spring_2026_robotics). Display name is shown on the site. Internal name cannot be changed after creation.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-xs">Name (Internal) <span className="text-red-500">*</span></Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => {
                          const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
                          setFormData({ ...formData, name: value })
                        }}
                        placeholder="e.g., spring_2024_robotics"
                        required
                        disabled={!!editingProgram}
                        className="h-9"
                      />
                      <p className="text-[11px] text-muted-foreground">Lowercase, numbers, underscores only.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="display_name" className="text-xs">Display Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="display_name"
                        value={formData.display_name}
                        onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                        placeholder="e.g., Spring 2024 Robotics Program"
                        required
                        className="h-9"
                      />
                    </div>
                  </div>
                  <RichTextEditor
                    label="Description"
                    hint="Rich text is stored as HTML in the database. Use the toolbar for headings, lists, links, and more."
                    value={richTextValueForEditor(formData.description)}
                    onChange={(v) => setFormData({ ...formData, description: v })}
                    placeholder={`${adminUiLabels.program.singular} description`}
                    minHeight={180}
                    disabled={isSubmitting}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Poster</CardTitle>
                  <CardDescription className="text-xs">{adminUiLabels.program.singular} poster image. JPEG, PNG or WebP, max 5MB. Uploaded when you save.</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <PosterUploadField
                    id="program_poster"
                    label="Poster image"
                    hint={`Optional. Upload happens when you save the ${adminUiLabels.program.singular.toLowerCase()}.`}
                    previewSrc={posterPreviewUrl || (editingProgram && formData.poster_url && !posterFile ? (formData.poster_url as string) : null) || null}
                    onFileChange={handlePosterFileChange}
                    onClear={clearPosterFile}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Schedule &amp; Status</CardTitle>
                  <CardDescription className="text-xs">Start and end dates define the program&apos;s term. Display order controls how programs are listed. Inactive programs are hidden from the public site.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="start_date" className="text-xs">Start Date <span className="text-red-500">*</span></Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        required
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="end_date" className="text-xs">End Date <span className="text-red-500">*</span></Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        required
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="display_order" className="text-xs">Display Order</Label>
                      <Input
                        id="display_order"
                        type="number"
                        value={formData.display_order}
                        onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="is_active" className="text-xs">Active</Label>
                      <Select
                        value={formData.is_active ? "true" : "false"}
                        onValueChange={(value) =>
                          setFormData({ ...formData, is_active: value === "true" })
                        }
                      >
                        <SelectTrigger id="is_active" className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Active</SelectItem>
                          <SelectItem value="false">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 pt-2 border-t mt-3">
                    <Checkbox
                      id="featured"
                      checked={formData.featured ?? false}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, featured: checked === true })
                      }
                    />
                    <Label htmlFor="featured" className="text-xs font-normal cursor-pointer">
                      Featured program (show prominently on public pages)
                    </Label>
                  </div>
                </CardContent>
              </Card>
            </div>

            <DialogFooter className="flex-shrink-0 pt-4 border-t mt-4 flex-col-reverse sm:flex-row sm:justify-between gap-2">
              {editingProgram ? (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isSubmitting}
                  onClick={() =>
                    openDeleteProgram({
                      id: editingProgram.id,
                      display_name: editingProgram.display_name,
                      instances: hierarchyData
                        .flatMap((f) => f.categories)
                        .flatMap((c) => c.programs)
                        .find((p) => p.id === editingProgram.id)?.instances,
                    })
                  }
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              ) : (
                <span className="hidden sm:block" />
              )}
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:ml-auto w-full sm:w-auto">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={
                  isSubmitting || 
                  !formData.name || 
                  !formData.display_name ||
                  !formData.category_id ||
                  !formData.franchise_id ||
                  !formData.start_date ||
                  !formData.end_date
                }
                className="w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingProgram ? (
                  `Update ${adminUiLabels.program.singular}`
                ) : (
                  `Create ${adminUiLabels.program.singular}`
                )}
              </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Program confirmation — same style as Instance modal */}
      {programToDelete && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => !isDeletingProgram && setProgramToDelete(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-[24px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative px-8 pt-8 pb-6">
              <button
                type="button"
                onClick={() => !isDeletingProgram && setProgramToDelete(null)}
                disabled={isDeletingProgram}
                className="absolute right-4 top-6 p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Delete {adminUiLabels.program.singular}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    You are about to delete{" "}
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {programToDelete.display_name}
                    </span>
                    . This action cannot be undone.
                  </p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
                    {programToDelete.instanceCount != null && programToDelete.instanceCount > 0 ? (
                      <>
                        This activity has{" "}
                        <span className="font-medium text-destructive">
                          {programToDelete.instanceCount} {adminUiLabels.instance.singular.toLowerCase()}
                          {programToDelete.instanceCount !== 1 ? "s" : ""}
                        </span>
                        . Remove all sessions before deleting the activity.
                      </>
                    ) : (
                      <>If this activity has sessions, the delete will fail and you&apos;ll need to remove them first.</>
                    )}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-8 pb-8 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setProgramToDelete(null)}
                disabled={isDeletingProgram}
                className="min-w-[80px]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmDeleteProgram}
                disabled={isDeletingProgram || (programToDelete.instanceCount ?? 0) > 0}
                className="min-w-[100px]"
              >
                {isDeletingProgram ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Instance Modal - View, Edit, Delete */}
      {modalMode && selectedInstance && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[40px] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  {modalMode === 'view' && `${adminUiLabels.instance.singular} Details`}
                  {modalMode === 'edit' && `Edit ${adminUiLabels.instance.singular}`}
                  {modalMode === 'delete' && `Delete ${adminUiLabels.instance.singular}`}
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
                        {selectedInstance.offering?.offering_type?.name || selectedInstance.offering?.offering_type?.code || 'N/A'}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{adminUiLabels.instance.singular} Information</h3>
                    
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
                              {selectedInstance.offering?.currency || 'USD'} ${(selectedInstance.price_override || selectedInstance.offering?.base_price || 0).toFixed(2)}
                            </span>
                            {selectedInstance.price_override && selectedInstance.offering?.base_price && (
                              <span className="text-xs text-slate-400 ml-2 block">
                                (override, base: ${selectedInstance.offering.base_price.toFixed(2)})
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {selectedInstance.campus && (
                        <div className="flex justify-between items-center py-3 border-b border-slate-50">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-slate-400" />
                            <span className="text-sm text-slate-500">{adminUiLabels.campus.singular}</span>
                          </div>
                          <span className="font-bold text-slate-900">
                            {selectedInstance.campus.display_name || selectedInstance.campus.name}
                          </span>
                        </div>
                      )}

                      {renderInstanceSchemaFields(selectedInstance)}
                    </div>
                  </div>
                </div>
              )}

              {/* EDIT MODE */}
              {modalMode === 'edit' && (
                <form onSubmit={handleInstanceUpdate} className="space-y-6">
                  <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 mb-6">
                    <p className="text-xs text-blue-700 font-semibold italic">
                      Note: Only supplementary details can be edited online. To change the activity or offering, please contact support.
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
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{adminUiLabels.campus.singular}</label>
                      <Select
                        value={editFormData.campus_id ? editFormData.campus_id : "__none__"}
                        onValueChange={(value) => setEditFormData({ ...editFormData, campus_id: value === "__none__" ? null : value })}
                      >
                        <SelectTrigger className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                          <SelectValue placeholder={`Select a ${adminUiLabels.campus.singular.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">No {adminUiLabels.campus.singular}</SelectItem>
                          {campuses.map((campus) => (
                            <SelectItem key={campus.id} value={campus.id}>
                              {campus.display_name || campus.name}
                              {campus.city && `, ${campus.city}`}
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
                        {adminUiLabels.instance.singular} is active
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
                      {(selectedInstance.current_students ?? 0) > 0 && (
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
                      className="w-full py-4 px-6 rounded-2xl bg-red-600 text-white font-bold hover:bg-red-500 shadow-xl shadow-red-500/20 transition-all"
                    >
                      Delete {adminUiLabels.instance.singular}
                    </button>
                    <button 
                      onClick={closeModal}
                      className="w-full py-4 px-6 rounded-2xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-all"
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

      {/* Instance Create/Edit Dialog */}
      <InstanceCreateDialog
        open={isInstanceDialogOpen}
        onOpenChange={setIsInstanceDialogOpen}
        programId={selectedProgramId || undefined}
        onSuccess={() => {
          fetchHierarchy()
          setIsInstanceDialogOpen(false)
          setEditingInstance(null)
          setSelectedProgramId(null)
        }}
        editingInstance={editingInstance}
      />
    </div>
  )
}
