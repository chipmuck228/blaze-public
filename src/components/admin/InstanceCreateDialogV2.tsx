'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface InstanceCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  programId?: string
  onSuccess?: () => void
  editingInstance?: any | null
}

interface Offering {
  id: string
  name: string
  base_price?: number
  currency?: string
  category_id: string
  offering_type?: {
    id: string
    code: string
    name: string
    instance_schema?: {
      fields?: Record<string, any>
    }
  }
}

interface Program {
  id: string
  name: string
  display_name: string
  category_id: string
  franchise_id: string
}

interface Campus {
  id: string
  name: string
  display_name: string
  franchise_id: string
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

export function InstanceCreateDialog({
  open,
  onOpenChange,
  programId,
  onSuccess,
  editingInstance,
}: InstanceCreateDialogProps) {
  const isEditMode = !!editingInstance
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null)
  const [selectedOffering, setSelectedOffering] = useState<Offering | null>(null)
  const [programs, setPrograms] = useState<Program[]>([])
  const [offerings, setOfferings] = useState<Offering[]>([])
  const [campuses, setCampuses] = useState<Campus[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const [formData, setFormData] = useState({
    program_id: programId || "",
    offering_id: "",
    campus_id: "",
    price_override: "",
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: "",
    session_count: "",
    days_of_week: [] as number[],
    max_students: "",
    current_students: "0",
    instance_data_ext: {} as Record<string, any>,
    status: "scheduled",
    notes: "",
    is_active: true,
  })

  // Initialize form data when editingInstance changes
  useEffect(() => {
    if (open && editingInstance) {
      setFormData({
        program_id: editingInstance.program_id || programId || "",
        offering_id: editingInstance.offering_id || "",
        campus_id: editingInstance.campus_id || "",
        price_override: editingInstance.price_override?.toString() || "",
        start_date: editingInstance.start_date || "",
        end_date: editingInstance.end_date || "",
        start_time: editingInstance.start_time || "",
        end_time: editingInstance.end_time || "",
        session_count: editingInstance.session_count?.toString() || "",
        days_of_week: editingInstance.days_of_week || [],
        max_students: editingInstance.max_students?.toString() || "",
        current_students: editingInstance.current_students?.toString() || "0",
        instance_data_ext: editingInstance.instance_data_ext || {},
        status: editingInstance.status || "scheduled",
        notes: editingInstance.notes || "",
        is_active: editingInstance.is_active !== undefined ? editingInstance.is_active : true,
      })
      setSelectedOffering(editingInstance.offering)
      setSelectedProgram(editingInstance.program)
    } else if (open && programId) {
      setFormData(prev => ({ ...prev, program_id: programId }))
    }
  }, [open, editingInstance, programId])

  // Fetch programs
  useEffect(() => {
    if (open) {
      fetchPrograms()
    }
  }, [open])

  // Fetch offerings when program changes
  useEffect(() => {
    if (open && formData.program_id) {
      fetchOfferings()
      fetchCampuses()
    }
  }, [open, formData.program_id])

  // Fetch offering details when offering_id changes
  useEffect(() => {
    if (open && formData.offering_id && !isEditMode) {
      fetchOfferingDetails()
    }
  }, [open, formData.offering_id, isEditMode])

  const fetchPrograms = async () => {
    try {
      const response = await fetch("/api/admin/programs/v2?activeOnly=true")
      if (response.ok) {
        const data = await response.json()
        setPrograms(data || [])
        if (programId) {
          const program = data.find((p: Program) => p.id === programId)
          if (program) setSelectedProgram(program)
        }
      }
    } catch (error) {
      console.error("Error fetching programs:", error)
    }
  }

  const fetchOfferings = async () => {
    if (!formData.program_id) return
    
    setIsLoading(true)
    try {
      // Get program to get category_id
      const program = programs.find(p => p.id === formData.program_id) || selectedProgram
      if (!program) return

      // Fetch offerings for this category (v2_offering table uses category_id directly)
      const response = await fetch(`/api/admin/offering/v2?status=published`)
      if (response.ok) {
        const allOfferings = await response.json()
        // Filter offerings by category_id
        const filteredOfferings = allOfferings.filter((offering: Offering) => 
          offering.category_id === program.category_id
        )
        setOfferings(filteredOfferings || [])
      }
    } catch (error) {
      console.error("Error fetching offerings:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchOfferingDetails = async () => {
    try {
      const response = await fetch(`/api/admin/offering/v2/${formData.offering_id}`)
      if (response.ok) {
        const offering = await response.json()
        setSelectedOffering(offering)
      }
    } catch (error) {
      console.error("Error fetching offering details:", error)
    }
  }

  const fetchCampuses = async () => {
    if (!formData.program_id) return
    
    try {
      const program = programs.find(p => p.id === formData.program_id) || selectedProgram
      if (!program) return

      const response = await fetch(`/api/blaze/campuses?franchise_id=${program.franchise_id}`)
      if (response.ok) {
        const data = await response.json()
        setCampuses(data || [])
      }
    } catch (error) {
      console.error("Error fetching campuses:", error)
    }
  }

  const handleSubmit = async () => {
    setErrors([])
    
    // Validation
    const validationErrors: string[] = []
    if (!formData.program_id) validationErrors.push("Program is required")
    if (!formData.offering_id) validationErrors.push("Offering is required")
    if (!formData.start_date) validationErrors.push("Start date is required")
    if (!formData.end_date) validationErrors.push("End date is required")
    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      validationErrors.push("Start date must be before end date")
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsSubmitting(true)

    try {
      const payload: any = {
        program_id: formData.program_id,
        offering_id: formData.offering_id,
        campus_id: formData.campus_id || null,
        price_override: formData.price_override ? parseFloat(formData.price_override) : null,
        start_date: formData.start_date,
        end_date: formData.end_date,
        start_time: formData.start_time || null,
        end_time: formData.end_time || null,
        session_count: formData.session_count ? parseInt(formData.session_count) : null,
        days_of_week: formData.days_of_week.length > 0 ? formData.days_of_week : null,
        max_students: formData.max_students ? parseInt(formData.max_students) : null,
        current_students: parseInt(formData.current_students) || 0,
        instance_data_ext: formData.instance_data_ext,
        status: formData.status,
        notes: formData.notes || null,
        is_active: formData.is_active,
      }

      const url = isEditMode && editingInstance
        ? `/api/admin/instance/v2/${editingInstance.id}`
        : "/api/admin/instance/v2"
      const method = isEditMode ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to ${isEditMode ? 'update' : 'create'} instance`)
      }

      onSuccess?.()
      onOpenChange(false)
      
      // Reset form
      setFormData({
        program_id: programId || "",
        offering_id: "",
        campus_id: "",
        price_override: "",
        start_date: "",
        end_date: "",
        start_time: "",
        end_time: "",
        session_count: "",
        days_of_week: [],
        max_students: "",
        current_students: "0",
        instance_data_ext: {},
        status: "scheduled",
        notes: "",
        is_active: true,
      })
      setSelectedOffering(null)
    } catch (error: any) {
      setErrors([error.message || "Failed to save instance"])
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderSchemaFields = () => {
    if (!selectedOffering?.offering_type?.instance_schema?.fields) return null

    const schema = selectedOffering.offering_type.instance_schema.fields
    const fields: JSX.Element[] = []

    for (const [fieldName, fieldConfig] of Object.entries(schema)) {
      const value = formData.instance_data_ext[fieldName]
      const isRequired = fieldConfig.required

      switch (fieldConfig.type) {
        case 'text':
          fields.push(
            <div key={fieldName} className="space-y-2">
              <Label>
                {fieldConfig.label || fieldName}
                {isRequired && <span className="text-red-500">*</span>}
              </Label>
              {fieldConfig.multiline ? (
                <Textarea
                  value={value || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    instance_data_ext: { ...formData.instance_data_ext, [fieldName]: e.target.value }
                  })}
                  placeholder={fieldConfig.placeholder}
                />
              ) : (
                <Input
                  value={value || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    instance_data_ext: { ...formData.instance_data_ext, [fieldName]: e.target.value }
                  })}
                  placeholder={fieldConfig.placeholder}
                />
              )}
              {fieldConfig.description && (
                <p className="text-sm text-muted-foreground">{fieldConfig.description}</p>
              )}
            </div>
          )
          break

        case 'number':
          fields.push(
            <div key={fieldName} className="space-y-2">
              <Label>
                {fieldConfig.label || fieldName}
                {isRequired && <span className="text-red-500">*</span>}
              </Label>
              <Input
                type="number"
                value={value || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  instance_data_ext: { ...formData.instance_data_ext, [fieldName]: parseFloat(e.target.value) || 0 }
                })}
                min={fieldConfig.min}
                max={fieldConfig.max}
                step={fieldConfig.step || 1}
                placeholder={fieldConfig.placeholder}
              />
              {fieldConfig.description && (
                <p className="text-sm text-muted-foreground">{fieldConfig.description}</p>
              )}
            </div>
          )
          break

        case 'boolean':
          fields.push(
            <div key={fieldName} className="flex items-center space-x-2">
              <Checkbox
                checked={value || false}
                onCheckedChange={(checked) => setFormData({
                  ...formData,
                  instance_data_ext: { ...formData.instance_data_ext, [fieldName]: checked }
                })}
              />
              <Label>
                {fieldConfig.label || fieldName}
                {isRequired && <span className="text-red-500">*</span>}
              </Label>
            </div>
          )
          break

        case 'select':
          fields.push(
            <div key={fieldName} className="space-y-2">
              <Label>
                {fieldConfig.label || fieldName}
                {isRequired && <span className="text-red-500">*</span>}
              </Label>
              <Select
                value={value || undefined}
                onValueChange={(val) => setFormData({
                  ...formData,
                  instance_data_ext: { ...formData.instance_data_ext, [fieldName]: val }
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={fieldConfig.placeholder || "Select..."} />
                </SelectTrigger>
                <SelectContent>
                  {fieldConfig.options?.map((option: string) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )
          break

        case 'multiselect':
          fields.push(
            <div key={fieldName} className="space-y-2">
              <Label>
                {fieldConfig.label || fieldName}
                {isRequired && <span className="text-red-500">*</span>}
              </Label>
              <div className="space-y-2">
                {fieldConfig.options?.map((option: string) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      checked={(value || []).includes(option)}
                      onCheckedChange={(checked) => {
                        const currentValues = value || []
                        const newValues = checked
                          ? [...currentValues, option]
                          : currentValues.filter((v: string) => v !== option)
                        setFormData({
                          ...formData,
                          instance_data_ext: { ...formData.instance_data_ext, [fieldName]: newValues }
                        })
                      }}
                    />
                    <Label>{option}</Label>
                  </div>
                ))}
              </div>
            </div>
          )
          break
      }
    }

    return fields.length > 0 ? (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Additional Configuration</h3>
        {fields}
      </div>
    ) : null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Instance" : "Create Instance"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Update instance details" : "Create a new instance for a program"}
          </DialogDescription>
        </DialogHeader>

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {/* Program Selection */}
          <div className="space-y-2">
            <Label>
              Program <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.program_id}
              onValueChange={(value) => {
                setFormData({ ...formData, program_id: value })
                const program = programs.find(p => p.id === value)
                setSelectedProgram(program || null)
              }}
              disabled={!!programId || isEditMode}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a program" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Offering Selection */}
          <div className="space-y-2">
            <Label>
              Offering <span className="text-red-500">*</span>
            </Label>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <Select
                value={formData.offering_id}
                onValueChange={(value) => setFormData({ ...formData, offering_id: value })}
                disabled={isEditMode}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an offering" />
                </SelectTrigger>
                <SelectContent>
                  {offerings.map((offering) => (
                    <SelectItem key={offering.id} value={offering.id}>
                      {offering.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Basic Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Start Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>
                End Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Max Students</Label>
              <Input
                type="number"
                min="1"
                value={formData.max_students}
                onChange={(e) => setFormData({ ...formData, max_students: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Price Override</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.price_override}
                onChange={(e) => setFormData({ ...formData, price_override: e.target.value })}
                placeholder="Leave empty to use offering base price"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Campus</Label>
            <Select
              value={formData.campus_id || "__none__"}
              onValueChange={(value) => setFormData({ ...formData, campus_id: value === "__none__" ? "" : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a campus (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No Campus</SelectItem>
                {campuses.map((campus) => (
                  <SelectItem key={campus.id} value={campus.id}>
                    {campus.display_name || campus.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Days of Week */}
          <div className="space-y-2">
            <Label>Days of Week</Label>
            <div className="grid grid-cols-4 gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <div key={day.value} className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.days_of_week.includes(day.value)}
                    onCheckedChange={(checked) => {
                      const newDays = checked
                        ? [...formData.days_of_week, day.value]
                        : formData.days_of_week.filter(d => d !== day.value)
                      setFormData({ ...formData, days_of_week: newDays })
                    }}
                  />
                  <Label className="text-sm">{day.label}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Dynamic Schema Fields */}
          {renderSchemaFields()}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
