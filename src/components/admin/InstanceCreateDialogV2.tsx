'use client'

import { useState, useEffect, type ReactElement } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertCircle, Plus, Trash2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { adminUiLabels } from "@/lib/admin-ui-labels"

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
  type_config_data?: Record<string, any>
  offering_type?: {
    id: string
    code: string
    name: string
    instance_schema?: {
      fields?: Record<string, any>
    }
    offering_schema?: {
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
  category?: { id: string; name: string; display_name?: string }
  franchise?: { id: string; code: string; name: string }
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

// 公共字段映射：数据库字段名 -> schema 中可能的字段名
// 如果 instance_schema 中定义了这些字段，使用 schema 配置；否则使用默认硬编码显示
const COMMON_FIELD_MAPPING: Record<string, string> = {
  start_time: 'start_time',
  end_time: 'end_time',
  max_students: 'max_students',
  session_count: 'session_count',
  price_override: 'price_override',
  days_of_week: 'days_of_week',
  notes: 'notes',
  status: 'status',
  // campus_id 特殊处理，不在 schema 中（需要从 campuses 列表选择）
}

// 扩展字段显示顺序（如 camp：年龄 → 营服/餐食/课后托管 → 特殊需求）
const EXTENDED_FIELD_ORDER = ['age_min', 'age_max', 'camp_shirt_provided', 'meal_provided', 'after_care_available', 'special_needs']
// 这三个布尔字段在 Create Instance 中单行水平排列，且排在「特殊需求」前
const HORIZONTAL_BOOLEAN_ROW_FIELDS = new Set<string>(['camp_shirt_provided', 'meal_provided', 'after_care_available'])
// Object groups whose data lives in formData (start_date, end_date, ...) not in instance_data_ext; we sync to instance_data_ext on submit
const INSTANCE_OBJECT_GROUPS_FROM_FORMDATA = new Set<string>(['schedule', 'capacity_price'])

/** Inflate flat instance_data_ext into nested shape when schema uses object groups (e.g. course schedule, age_range). */
function inflateInstanceDataExt(
  schemaFields: Record<string, { type?: string; properties?: Record<string, any>; default?: any }> | undefined,
  data: Record<string, any> | null | undefined
): Record<string, any> {
  if (!data || typeof data !== 'object') return {}
  if (!schemaFields || typeof schemaFields !== 'object') return { ...data }
  const out = { ...data }
  for (const [fieldName, fieldConfig] of Object.entries(schemaFields)) {
    if (fieldConfig.type === 'object' && fieldConfig.properties) {
      const existing = out[fieldName]
      if (typeof existing !== 'object' || existing === null || Array.isArray(existing)) {
        const obj: Record<string, any> = {}
        const def = fieldConfig.default && typeof fieldConfig.default === 'object' ? fieldConfig.default : {}
        for (const propKey of Object.keys(fieldConfig.properties)) {
          if (data[propKey] !== undefined) obj[propKey] = data[propKey]
          else if (def[propKey] !== undefined) obj[propKey] = def[propKey]
        }
        out[fieldName] = obj
        for (const propKey of Object.keys(fieldConfig.properties)) delete out[propKey]
      }
    }
  }
  return out
}

/** Build nested instance_data_ext for payload: schedule/capacity_price from formData, rest from formData.instance_data_ext. */
function buildNestedInstanceDataExtForPayload(
  formData: { start_date?: string; end_date?: string; start_time?: string; end_time?: string; days_of_week?: number[]; max_students?: string; price_override?: string; instance_data_ext?: Record<string, any> },
  schemaFields: Record<string, { type?: string; properties?: Record<string, any> }> | undefined
): Record<string, any> {
  const out = { ...(formData.instance_data_ext || {}) }
  if (!schemaFields) return out
  if (schemaFields.schedule?.type === 'object' && schemaFields.schedule.properties) {
    out.schedule = {
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      start_time: formData.start_time || null,
      end_time: formData.end_time || null,
      days_of_week: Array.isArray(formData.days_of_week) && formData.days_of_week.length > 0 ? formData.days_of_week : null,
    }
  }
  if (schemaFields.capacity_price?.type === 'object' && schemaFields.capacity_price.properties) {
    out.capacity_price = {
      max_students: formData.max_students ? parseInt(formData.max_students, 10) : null,
      price_override: formData.price_override ? parseFloat(formData.price_override) : null,
    }
  }
  return out
}

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
    featured: false,
    amilia_link: "",
  })

  // Initialize form data when editingInstance changes; inflate flat instance_data_ext to nested when schema has object groups
  useEffect(() => {
    if (open && editingInstance) {
      const schema = editingInstance.offering?.offering_type?.instance_schema?.fields
      const rawExt = editingInstance.instance_data_ext || {}
      const inflatedExt = schema ? inflateInstanceDataExt(schema, rawExt) : rawExt
      const schedule = inflatedExt.schedule
      const capacityPrice = inflatedExt.capacity_price
      setFormData({
        program_id: editingInstance.program_id || programId || "",
        offering_id: editingInstance.offering_id || "",
        campus_id: editingInstance.campus_id || "",
        price_override: (capacityPrice?.price_override ?? editingInstance.price_override)?.toString() ?? "",
        start_date: schedule?.start_date ?? editingInstance.start_date ?? "",
        end_date: schedule?.end_date ?? editingInstance.end_date ?? "",
        start_time: schedule?.start_time ?? editingInstance.start_time ?? "",
        end_time: schedule?.end_time ?? editingInstance.end_time ?? "",
        session_count: editingInstance.session_count?.toString() ?? "",
        days_of_week: Array.isArray(schedule?.days_of_week) ? schedule.days_of_week : (editingInstance.days_of_week ?? []),
        max_students: (capacityPrice?.max_students ?? editingInstance.max_students)?.toString() ?? "",
        current_students: editingInstance.current_students?.toString() ?? "0",
        instance_data_ext: inflatedExt,
        status: editingInstance.status ?? "scheduled",
        notes: editingInstance.notes ?? "",
        is_active: editingInstance.is_active !== undefined ? editingInstance.is_active : true,
        featured: editingInstance.featured === true,
        amilia_link: editingInstance.amilia_link ?? "",
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

  // Fetch offerings when program changes (include programs so we re-run after programs load when dialog opened with programId)
  useEffect(() => {
    if (open && formData.program_id) {
      fetchOfferings()
      fetchCampuses()
    }
  }, [open, formData.program_id, programs])

  // Fetch offering details when offering_id changes (create mode), or when dialog opens in edit mode so we have type_config_data and offering_schema
  useEffect(() => {
    if (open && formData.offering_id && !isEditMode) {
      fetchOfferingDetails()
    }
  }, [open, formData.offering_id, isEditMode])

  useEffect(() => {
    if (open && isEditMode && editingInstance?.offering_id) {
      fetch(`/api/admin/offering/v2/${editingInstance.offering_id}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((offering: Offering | null) => {
          if (offering) setSelectedOffering(offering)
        })
        .catch(() => {})
    }
  }, [open, isEditMode, editingInstance?.offering_id])

  // Initialize default values from instance_schema when offering changes
  useEffect(() => {
    if (selectedOffering?.offering_type?.instance_schema?.fields && !isEditMode) {
      const schema = selectedOffering.offering_type.instance_schema.fields
      const commonDefaults: Partial<typeof formData> = {}
      const extendedDefaults: Record<string, any> = {}
      
      // 获取所有公共字段名
      const commonFieldNames = new Set(Object.values(COMMON_FIELD_MAPPING))
      commonFieldNames.add('start_date')
      commonFieldNames.add('end_date')
      
      Object.entries(schema).forEach(([fieldName, fieldConfig]) => {
        if (fieldConfig.default === undefined) return
        
        // 检查是否是公共字段
        if (commonFieldNames.has(fieldName)) {
          // 公共字段：更新 formData 的对应字段
          const dbFieldName = Object.keys(COMMON_FIELD_MAPPING).find(
            key => COMMON_FIELD_MAPPING[key] === fieldName
          ) || fieldName
          
          // 只在字段没有值且存在默认值时设置默认值
          const currentValue = formData[dbFieldName as keyof typeof formData]
          if ((currentValue === undefined || currentValue === null || currentValue === '') && fieldConfig.default !== undefined) {
            if (dbFieldName === 'days_of_week') {
              commonDefaults[dbFieldName] = Array.isArray(fieldConfig.default) ? fieldConfig.default : []
            } else {
              commonDefaults[dbFieldName as keyof typeof formData] = fieldConfig.default
            }
          }
        } else {
          // 扩展字段：更新 instance_data_ext
          if (formData.instance_data_ext[fieldName] === undefined && fieldConfig.default !== undefined) {
            extendedDefaults[fieldName] = fieldConfig.default
          }
        }
      })
      
      // 更新 formData
      if (Object.keys(commonDefaults).length > 0 || Object.keys(extendedDefaults).length > 0) {
        setFormData({
          ...formData,
          ...commonDefaults,
          instance_data_ext: { ...formData.instance_data_ext, ...extendedDefaults }
        })
      }
    }
  }, [selectedOffering, isEditMode])

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

    // Resolve program: from list or selected (needed when dialog opens with programId before programs have loaded)
    const program = programs.find(p => p.id === formData.program_id) || selectedProgram
    if (!program) return

    setIsLoading(true)
    try {
      // Fetch all offerings (no status filter so draft and published both show), then filter by category
      const response = await fetch(`/api/admin/offering/v2`)
      if (response.ok) {
        const allOfferings = await response.json()
        const filteredOfferings = (allOfferings || []).filter((offering: Offering) =>
          offering.category_id === program.category_id
        )
        setOfferings(filteredOfferings)
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
    
    // Validation: schema-driven; only program_id and offering_id are always required
    const schema = selectedOffering?.offering_type?.instance_schema?.fields
    const validationErrors: string[] = []
    if (!formData.program_id) validationErrors.push(`${adminUiLabels.program.singular} is required`)
    if (!formData.offering_id) validationErrors.push("Offering is required")
    const scheduleObj = schema?.schedule?.type === 'object' ? schema.schedule : null
    const startDateRequired = schema?.start_date?.required || scheduleObj?.properties?.start_date?.required
    const endDateRequired = schema?.end_date?.required || scheduleObj?.properties?.end_date?.required
    if (startDateRequired && !formData.start_date) validationErrors.push((scheduleObj?.properties?.start_date?.label || schema?.start_date?.label || "Start date") + " is required")
    if (endDateRequired && !formData.end_date) validationErrors.push((scheduleObj?.properties?.end_date?.label || schema?.end_date?.label || "End date") + " is required")
    if (formData.start_date && formData.end_date && new Date(formData.start_date) > new Date(formData.end_date)) {
      validationErrors.push("Start date must be before end date")
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsSubmitting(true)

    try {
      const payloadSchema = selectedOffering?.offering_type?.instance_schema?.fields
      // Build nested instance_data_ext when schema has object groups (schedule, capacity_price from formData; rest from formData.instance_data_ext)
      const instanceDataExtForPayload = buildNestedInstanceDataExtForPayload(formData, payloadSchema)
      // Schema-driven: send start_date/end_date etc. for API backward compat (API may flatten from instance_data_ext when present)
      const payload: any = {
        program_id: formData.program_id,
        offering_id: formData.offering_id,
        campus_id: formData.campus_id || null,
        price_override: formData.price_override ? parseFloat(formData.price_override) : null,
        start_date: payloadSchema?.start_date || instanceDataExtForPayload?.schedule?.start_date ? (formData.start_date || instanceDataExtForPayload?.schedule?.start_date || null) : null,
        end_date: payloadSchema?.end_date || instanceDataExtForPayload?.schedule?.end_date ? (formData.end_date || instanceDataExtForPayload?.schedule?.end_date || null) : null,
        start_time: formData.start_time || null,
        end_time: formData.end_time || null,
        session_count: formData.session_count ? parseInt(formData.session_count) : null,
        days_of_week: formData.days_of_week.length > 0 ? formData.days_of_week : null,
        max_students: formData.max_students ? parseInt(formData.max_students) : null,
        current_students: parseInt(formData.current_students) || 0,
        instance_data_ext: instanceDataExtForPayload,
        status: formData.status,
        notes: formData.notes || null,
        is_active: formData.is_active,
        featured: formData.featured,
        amilia_link: formData.amilia_link.trim() || null,
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
        throw new Error(errorData.error || `Failed to ${isEditMode ? 'update' : 'create'} ${adminUiLabels.instance.singular.toLowerCase()}`)
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
        featured: false,
        amilia_link: "",
      })
      setSelectedOffering(null)
    } catch (error: any) {
      setErrors([error.message || `Failed to save ${adminUiLabels.instance.singular.toLowerCase()}`])
    } finally {
      setIsSubmitting(false)
    }
  }

  // 渲染单个字段（可复用函数）；objValue 用于嵌套 object 内条件判断
  const renderField = (
    fieldName: string,
    fieldConfig: any,
    value: any,
    onChange: (value: any) => void,
    isCommonField: boolean = false,
    objValue?: Record<string, any>
  ): ReactElement | null => {
    // 检查条件显示（支持 offering.xxx 从当前选中的 offering 取值）
    if (fieldConfig.condition) {
      const conditionField = fieldConfig.condition.field
      let conditionValue: any
      if (conditionField.startsWith('offering.')) {
        const key = conditionField.slice(9)
        const tc = selectedOffering?.type_config_data as Record<string, unknown> | undefined
        conditionValue = tc?.[key] ?? (selectedOffering != null ? (selectedOffering as unknown as Record<string, unknown>)[key] : undefined)
      } else if (objValue !== undefined) {
        conditionValue = objValue[conditionField]
      } else if (isCommonField) {
        if (COMMON_FIELD_MAPPING[conditionField] || conditionField === 'start_date' || conditionField === 'end_date') {
          conditionValue = formData[conditionField as keyof typeof formData]
        } else {
          conditionValue = formData.instance_data_ext[conditionField]
        }
      } else {
        conditionValue = formData.instance_data_ext[conditionField]
      }
      if (fieldConfig.condition.equals !== undefined) {
        if (conditionValue !== fieldConfig.condition.equals) return null
      } else if (fieldConfig.condition.exists !== undefined) {
        const exists = conditionValue !== undefined && conditionValue !== null && conditionValue !== ''
        if (fieldConfig.condition.exists !== exists) return null
      }
    }

    const isRequired = fieldConfig.required

    const labelEl = (
      <Label className="text-xs">
        {fieldConfig.label || fieldName}
        {isRequired && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
    )
    const descEl = fieldConfig.description ? (
      <p className="text-xs text-muted-foreground">{fieldConfig.description}</p>
    ) : null

    switch (fieldConfig.type) {
      case 'text': {
        const maxLen = fieldConfig.maxLength != null ? Number(fieldConfig.maxLength) : undefined
        return (
          <div key={fieldName} className="space-y-1.5">
            {labelEl}
            {fieldConfig.multiline ? (
              <Textarea
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder={fieldConfig.placeholder}
                className="text-sm resize-none min-h-[52px]"
                rows={2}
                maxLength={maxLen}
              />
            ) : (
              <Input
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder={fieldConfig.placeholder}
                className="h-9 text-sm"
                maxLength={maxLen}
              />
            )}
            {descEl}
          </div>
        )
      }

      case 'time':
        return (
          <div key={fieldName} className="space-y-1.5">
            {labelEl}
            <Input type="time" value={value || ''} onChange={(e) => onChange(e.target.value)} required={isRequired} className="h-9 text-sm" />
            {descEl}
          </div>
        )

      case 'number':
        return (
          <div key={fieldName} className="space-y-1.5">
            {labelEl}
            <Input type="number" value={value || ''} onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : undefined)} min={fieldConfig.min} max={fieldConfig.max} step={fieldConfig.step || 1} placeholder={fieldConfig.placeholder} className="h-9 text-sm" />
            {descEl}
          </div>
        )

      case 'boolean':
        return (
          <div key={fieldName} className="flex items-center gap-2">
            <Checkbox checked={!!value} onCheckedChange={(checked) => onChange(checked)} />
            {labelEl}
          </div>
        )

      case 'select':
        return (
          <div key={fieldName} className="space-y-1.5">
            {labelEl}
            <Select value={value || undefined} onValueChange={(val) => onChange(val)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder={fieldConfig.placeholder || "Select..."} />
              </SelectTrigger>
              <SelectContent>
                {fieldConfig.options?.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {descEl}
          </div>
        )

      case 'multiselect': {
        const valueArr = Array.isArray(value) ? value : []
        const norm = (v: any) => String(v)
        const optionSet = new Set(valueArr.map(norm))
        return (
          <div key={fieldName} className="space-y-1.5">
            {labelEl}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {fieldConfig.options?.map((option: string) => (
                <div key={option} className="flex items-center gap-2">
                  <Checkbox
                    checked={optionSet.has(option)}
                    onCheckedChange={(checked) => {
                      const newValues = checked ? [...valueArr, option] : valueArr.filter((v: any) => norm(v) !== option)
                      onChange(newValues)
                    }}
                  />
                  <Label className="text-sm cursor-pointer">{option}</Label>
                </div>
              ))}
            </div>
            {descEl}
          </div>
        )
      }

      case 'array': {
        if (fieldConfig.items?.type === 'string') {
          return (
            <div key={fieldName} className="space-y-1.5">
              {labelEl}
              <div className="space-y-1.5">
                {(Array.isArray(value) ? value : []).map((item: string, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input value={item} onChange={(e) => { const arr = [...(Array.isArray(value) ? value : [])]; arr[index] = e.target.value; onChange(arr) }} placeholder={`Item ${index + 1}`} className="h-9 text-sm flex-1" />
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { const arr = [...(Array.isArray(value) ? value : [])]; arr.splice(index, 1); onChange(arr) }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => onChange([...(Array.isArray(value) ? value : []), ''])}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Add
                </Button>
              </div>
              {descEl}
            </div>
          )
        }
        // array of objects (e.g. recurrence.schedule_patterns: [{ frequency, weekday }])
        if (fieldConfig.items?.type === 'object' && fieldConfig.items?.properties) {
          const itemSchema = fieldConfig.items.properties as Record<string, any>
          const arr = Array.isArray(value) ? value : []
          const str = (v: any) => (v === undefined || v === null ? '' : String(v))
          return (
            <div key={fieldName} className="space-y-1.5">
              {labelEl}
              <div className="space-y-3">
                {arr.map((item: Record<string, any>, index: number) => (
                  <div key={index} className="flex flex-wrap items-end gap-2 rounded border p-2 bg-muted/30">
                    {Object.entries(itemSchema).map(([propKey, propConfig]) => {
                      const propVal = item && item[propKey]
                      const optValues = propConfig.options ?? []
                      const optionLabels = propConfig.option_labels ?? optValues.map(str)
                      if (propConfig.type === 'select') {
                        return (
                          <div key={propKey} className="space-y-1 min-w-[100px]">
                            <Label className="text-xs text-muted-foreground">{propConfig.label || propKey}</Label>
                            <Select
                              value={str(propVal)}
                              onValueChange={(val) => {
                                const next = [...arr]
                                const numVal = Number(val)
                                const isNumericOption = !isNaN(numVal) && optValues.some((o: any) => Number(o) === numVal)
                                const stored = isNumericOption ? numVal : val
                                const nextItem = { ...(next[index] ?? {}), [propKey]: stored }
                                next[index] = nextItem
                                onChange(next)
                              }}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder={propConfig.placeholder ?? 'Select...'} />
                              </SelectTrigger>
                              <SelectContent>
                                {optValues.map((opt: any, idx: number) => (
                                  <SelectItem key={str(opt)} value={str(opt)}>{optionLabels[idx] ?? str(opt)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )
                      }
                      return null
                    })}
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { const next = [...arr]; next.splice(index, 1); onChange(next) }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => {
                  const defaultItem: Record<string, any> = {}
                  Object.entries(itemSchema).forEach(([k, c]) => {
                    if (c?.type === 'select' && c.options?.length) defaultItem[k] = c.options[0]
                    else defaultItem[k] = c?.default ?? ''
                  })
                  onChange([...arr, defaultItem])
                }}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Add
                </Button>
              </div>
              {descEl}
            </div>
          )
        }
        return null
      }

      case 'date':
        return (
          <div key={fieldName} className="space-y-1.5">
            {labelEl}
            <Input type="date" value={value || ''} onChange={(e) => onChange(e.target.value)} required={isRequired} className="h-9 text-sm" />
            {descEl}
          </div>
        )

      default:
        return null
    }
  }

  // 渲染扩展字段（完全由 schema 驱动）；支持 type=object 以 Card 展示（schedule/capacity_price 数据来自 formData，其余来自 instance_data_ext）
  const renderExtendedFields = () => {
    if (!selectedOffering?.offering_type?.instance_schema?.fields) return null

    const schema = selectedOffering.offering_type.instance_schema.fields
    const commonFieldNames = new Set(Object.values(COMMON_FIELD_MAPPING))
    commonFieldNames.add('start_date')
    commonFieldNames.add('end_date')
    const objectGroupOrder = ['schedule', 'capacity_price', 'recurrence', 'age_range', 'audience', 'class_info', 'camp_services', 'event_info', 'workshop_info', 'service_info', 'card_value', 'recipient_delivery', 'greeting', 'additional']

    const extendedNames = (Object.keys(schema) as string[]).filter((name) => !commonFieldNames.has(name))
    const orderIndex = (name: string) => {
      const objIdx = objectGroupOrder.indexOf(name)
      if (objIdx >= 0) return objIdx
      const i = EXTENDED_FIELD_ORDER.indexOf(name)
      return i >= 0 ? objectGroupOrder.length + i : objectGroupOrder.length + EXTENDED_FIELD_ORDER.length
    }
    extendedNames.sort((a, b) => orderIndex(a) - orderIndex(b))

    const nodes: ReactElement[] = []
    let i = 0
    while (i < extendedNames.length) {
      const name = extendedNames[i]
      const fieldConfig = schema[name]
      if (!fieldConfig) { i++; continue }

      if (fieldConfig.type === 'object' && fieldConfig.properties) {
        const fromFormData = INSTANCE_OBJECT_GROUPS_FROM_FORMDATA.has(name)
        const objValue: Record<string, any> = fromFormData
          ? (name === 'schedule'
            ? {
                start_date: formData.start_date ?? '',
                end_date: formData.end_date ?? '',
                start_time: formData.start_time ?? '',
                end_time: formData.end_time ?? '',
                days_of_week: formData.days_of_week ?? [],
              }
            : {
                max_students: formData.max_students ?? '',
                price_override: formData.price_override ?? '',
              })
          : { ...(fieldConfig.default ?? {}), ...(formData.instance_data_ext[name] ?? {}) }
        const setObj = (next: Record<string, any>) => {
          if (fromFormData) {
            if (name === 'schedule') {
              const dow = Array.isArray(next.days_of_week)
                ? next.days_of_week.map((v: any) => (typeof v === 'string' ? parseInt(v, 10) : v)).filter((v: any) => !isNaN(v))
                : formData.days_of_week
              setFormData({
                ...formData,
                start_date: next.start_date ?? formData.start_date,
                end_date: next.end_date ?? formData.end_date,
                start_time: next.start_time ?? formData.start_time,
                end_time: next.end_time ?? formData.end_time,
                days_of_week: dow,
              })
            } else {
              setFormData({
                ...formData,
                max_students: next.max_students?.toString() ?? formData.max_students,
                price_override: next.price_override?.toString() ?? formData.price_override,
              })
            }
          } else {
            setFormData({
              ...formData,
              instance_data_ext: { ...formData.instance_data_ext, [name]: next },
            })
          }
        }
        const propNodes: ReactElement[] = []
        for (const [propKey, propConfig] of Object.entries(fieldConfig.properties as Record<string, any>)) {
          const propValue = objValue[propKey] ?? propConfig?.default ?? (propConfig?.type === 'boolean' ? false : (propConfig?.type === 'multiselect' ? [] : ''))
          const propOnChange = (v: any) => setObj({ ...objValue, [propKey]: v })
          const el = renderField(propKey, propConfig, propValue, propOnChange, false, objValue)
          if (el) propNodes.push(el)
        }
        if (propNodes.length > 0) {
          nodes.push(
            <Card key={name} className="overflow-hidden">
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">{fieldConfig.label || name}</CardTitle>
                {fieldConfig.description && <CardDescription className="text-xs">{fieldConfig.description}</CardDescription>}
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {propNodes.map((node, idx) => <div key={idx}>{node}</div>)}
                </div>
              </CardContent>
            </Card>
          )
        }
        i++
        continue
      }

      const value = formData.instance_data_ext[name] ?? fieldConfig?.default ?? ''
      const onChange = (newValue: unknown) => {
        setFormData({
          ...formData,
          instance_data_ext: { ...formData.instance_data_ext, [name]: newValue }
        })
      }
      const singleField = renderField(name, fieldConfig, value, onChange, false)

      if (HORIZONTAL_BOOLEAN_ROW_FIELDS.has(name)) {
        const rowFields: ReactElement[] = []
        while (i < extendedNames.length && HORIZONTAL_BOOLEAN_ROW_FIELDS.has(extendedNames[i])) {
          const n = extendedNames[i]
          const cfg = schema[n]
          const val = formData.instance_data_ext[n] ?? cfg?.default ?? ''
          const f = renderField(n, cfg, val, (v) => {
            setFormData({
              ...formData,
              instance_data_ext: { ...formData.instance_data_ext, [n]: v }
            })
          }, false)
          if (f) rowFields.push(f)
          i++
        }
        if (rowFields.length > 0) {
          nodes.push(
            <div key={`row-${name}`} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {rowFields}
            </div>
          )
        }
        continue
      }
      if (singleField) nodes.push(singleField)
      i += 1
    }

    return nodes.length > 0 ? (
      <div className="space-y-4">
        {nodes}
      </div>
    ) : null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[800px] lg:max-w-[900px] max-h-[95vh] h-[95vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{isEditMode ? `Edit ${adminUiLabels.instance.singular}` : `Create ${adminUiLabels.instance.singular}`}</DialogTitle>
          <DialogDescription>
            {isEditMode ? `Update ${adminUiLabels.instance.singular.toLowerCase()} details` : `Create a new ${adminUiLabels.instance.singular.toLowerCase()} for an activity`}
          </DialogDescription>
        </DialogHeader>

        {errors.length > 0 && (
          <Alert variant="destructive" className="flex-shrink-0">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside text-sm">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium">{adminUiLabels.program.singular} &amp; offering</CardTitle>
              <CardDescription className="text-xs">Select the activity and offering for this {adminUiLabels.instance.singular.toLowerCase()}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{adminUiLabels.program.singular} <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.program_id}
                    onValueChange={(value) => {
                      setFormData({ ...formData, program_id: value })
                      setSelectedProgram(programs.find(p => p.id === value) || null)
                    }}
                    disabled={!!programId || isEditMode}
                  >
                    <SelectTrigger className="h-9 min-w-0">
                      {formData.program_id ? (
                        <span className="truncate">
                          {programs.find(p => p.id === formData.program_id)?.display_name || selectedProgram?.display_name || programs.find(p => p.id === formData.program_id)?.name || ""}
                        </span>
                      ) : (
                        <SelectValue placeholder={`Select ${adminUiLabels.program.singular.toLowerCase()}`} />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {programs.map((program) => {
                        const franchiseName = program.franchise?.name || program.franchise?.code || "—"
                        const categoryName = program.category?.display_name || program.category?.name || "—"
                        const programLabel = program.display_name || program.name
                        return (
                          <SelectItem key={program.id} value={program.id}>
                            <div className="flex flex-col items-start gap-1 py-0.5">
                              <span className="font-medium">{programLabel}</span>
                              <div className="flex flex-wrap gap-1">
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">{franchiseName}</Badge>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">{categoryName}</Badge>
                              </div>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Offering <span className="text-red-500">*</span></Label>
                  {isLoading ? (
                    <div className="flex items-center justify-center h-9">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <Select value={formData.offering_id} onValueChange={(value) => setFormData({ ...formData, offering_id: value })} disabled={isEditMode}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select offering" />
                      </SelectTrigger>
                      <SelectContent>
                        {offerings.map((offering) => (
                          <SelectItem key={offering.id} value={offering.id}>{offering.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium">Enrollment</CardTitle>
              <CardDescription className="text-xs">
                Optional Amilia URL for the public session page &quot;Enroll now&quot; button.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <Label htmlFor="instance-amilia-link" className="text-sm">
                Amilia enrollment link
              </Label>
              <Input
                id="instance-amilia-link"
                type="url"
                placeholder="https://app.amilia.com/store/en/..."
                value={formData.amilia_link}
                onChange={(e) =>
                  setFormData({ ...formData, amilia_link: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use the in-app enrollment cart. When set, C-end opens this link in a new tab (unless the session is full).
              </p>
            </CardContent>
          </Card>

          {/* 日期块：仅当 instance_schema 中定义了 start_date 或 end_date 且未用 object schedule 时显示 */}
          {(() => {
            const schema = selectedOffering?.offering_type?.instance_schema?.fields
            const scheduleAsObject = schema?.schedule?.type === 'object'
            const hasStartDate = !scheduleAsObject && !!schema?.start_date
            const hasEndDate = !scheduleAsObject && !!schema?.end_date
            if (!hasStartDate && !hasEndDate) return null

            const dateFields: ReactElement[] = []
            if (hasStartDate) {
              const fieldConfig = schema!.start_date!
              const value = formData.start_date || (fieldConfig as any).default || ''
              const field = renderField('start_date', fieldConfig, value, (newValue) => setFormData({ ...formData, start_date: newValue }), true)
              if (field) dateFields.push(field)
            }
            if (hasEndDate) {
              const fieldConfig = schema!.end_date!
              const value = formData.end_date || (fieldConfig as any).default || ''
              const field = renderField('end_date', fieldConfig, value, (newValue) => setFormData({ ...formData, end_date: newValue }), true)
              if (field) dateFields.push(field)
            }
            if (dateFields.length === 0) return null
            return (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Date</CardTitle>
                  <CardDescription className="text-xs">Start and end date for this {adminUiLabels.instance.singular.toLowerCase()}.</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className={dateFields.length >= 2 ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "space-y-3"}>
                    {dateFields}
                  </div>
                </CardContent>
              </Card>
            )
          })()}

          {/* Common Fields + Campus: time, capacity, price, status, notes, campus (omit fields that live inside schema object groups) */}
          {(() => {
            const schema = selectedOffering?.offering_type?.instance_schema?.fields
            const scheduleAsObject = schema?.schedule?.type === 'object'
            const capacityPriceAsObject = schema?.capacity_price?.type === 'object'
            const commonFields: ReactElement[] = []
            if (!scheduleAsObject && schema?.start_time) {
              const c = schema.start_time
              const v = formData.start_time || c.default || ''
              const f = renderField('start_time', c, v, (x) => setFormData({ ...formData, start_time: x }), true)
              if (f) commonFields.push(f)
            }
            if (!scheduleAsObject && schema?.end_time) {
              const c = schema.end_time
              const v = formData.end_time || c.default || ''
              const f = renderField('end_time', c, v, (x) => setFormData({ ...formData, end_time: x }), true)
              if (f) commonFields.push(f)
            }
            if (!capacityPriceAsObject && schema?.max_students) {
              const c = schema.max_students
              const v = formData.max_students || c.default || ''
              const f = renderField('max_students', c, v, (x) => setFormData({ ...formData, max_students: x?.toString() || '' }), true)
              if (f) commonFields.push(f)
            }
            if (!capacityPriceAsObject && schema?.price_override) {
              const c = schema.price_override
              const v = formData.price_override || c.default || ''
              const f = renderField('price_override', c, v, (x) => setFormData({ ...formData, price_override: x?.toString() || '' }), true)
              if (f) commonFields.push(f)
            }
            if (schema?.session_count) {
              const c = schema.session_count
              const v = formData.session_count || c.default || ''
              const f = renderField('session_count', c, v, (x) => setFormData({ ...formData, session_count: x?.toString() || '' }), true)
              if (f) commonFields.push(f)
            }
            if (!scheduleAsObject && schema?.days_of_week) {
              const c = schema.days_of_week
              const cur = Array.isArray(formData.days_of_week) ? formData.days_of_week : []
              const disp = c.type === 'multiselect' ? cur.map(v => v.toString()) : cur
              const f = renderField('days_of_week', c, disp, (newVal) => {
                const num = Array.isArray(newVal) ? newVal.map(v => typeof v === 'string' ? parseInt(v, 10) : v).filter(v => !isNaN(v)) : []
                setFormData({ ...formData, days_of_week: num })
              }, true)
              if (f) commonFields.push(f)
            }
            if (schema?.notes) {
              const c = schema.notes
              const v = formData.notes || c.default || ''
              const f = renderField('notes', c, v, (x) => setFormData({ ...formData, notes: x }), true)
              if (f) commonFields.push(f)
            }
            if (schema?.status) {
              const c = schema.status
              const v = formData.status || c.default || 'scheduled'
              const f = renderField('status', c, v, (x) => setFormData({ ...formData, status: x }), true)
              if (f) commonFields.push(f)
            }

            const hasCommon = commonFields.length > 0
            const campusEl = (
              <div className="space-y-1.5">
                <Label className="text-xs">{adminUiLabels.campus.singular}</Label>
                <Select value={formData.campus_id || "__none__"} onValueChange={(val) => setFormData({ ...formData, campus_id: val === "__none__" ? "" : val })}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={`Optional ${adminUiLabels.campus.singular.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No {adminUiLabels.campus.singular}</SelectItem>
                    {campuses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.display_name || c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )

            if (!hasCommon && !selectedOffering) return null
            return (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Schedule, capacity &amp; {adminUiLabels.campus.singular.toLowerCase()}</CardTitle>
                  <CardDescription className="text-xs">Time, max students, price override, status, optional {adminUiLabels.campus.singular.toLowerCase()}, and featured flag.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {hasCommon && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {commonFields.map((field, index) => (
                        <div key={index} className={commonFields.length === 1 ? "sm:col-span-2" : ""}>{field}</div>
                      ))}
                    </div>
                  )}
                  {selectedOffering && campusEl}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1">
                    <Checkbox
                      id="instance-featured"
                      checked={formData.featured}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, featured: checked === true })
                      }
                    />
                    <Label htmlFor="instance-featured" className="text-sm cursor-pointer">
                      Featured
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      Show this {adminUiLabels.instance.singular.toLowerCase()} in featured/recommended placements
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })()}

          {renderExtendedFields()}
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
