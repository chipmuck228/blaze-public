'use client'

import { useState, useEffect, useCallback, useRef } from "react"
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
import { Loader2, Upload, X, Image as ImageIcon } from "lucide-react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"

interface Offering {
  id?: string
  name: string
  slug?: string
  description?: string
  target_audience?: string
  learning_outcomes?: string
  prerequisites?: string
  cancellation_policy?: string
  session_count?: number
  number_of_sessions?: number
  age_min?: number
  age_max?: number
  target_age_min?: number
  target_age_max?: number
  target_grades?: string[]
  grade_level?: string
  base_price?: number
  currency?: string
  duration_hours?: number
  poster_url?: string | null
  offering_type: 'course' | 'camp' | 'workshop' | 'free_trial' | 'gift_card' | 'care_service' | 'lunch_service' | 'competition'
  type_config?: Record<string, any>
  status?: 'draft' | 'published' | 'suspended' | 'archived'
  tags?: Array<{ id: string; name: string; display_name: string }>
}

interface OfferingSubcategory {
  id: string
  name: string
  display_name: string
}

interface OfferingEditDialogProps {
  offering: Offering | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onOfferingUpdated: () => void
}

interface OfferingType {
  id: string
  code: string
  name: string
  description?: string
  icon?: string
  color?: string
  display_order: number
  is_active: boolean
  is_default: boolean
  config_schema?: Record<string, any>
}

export function OfferingEditDialog({
  offering,
  open,
  onOpenChange,
  onOfferingUpdated,
}: OfferingEditDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [subcategories, setSubcategories] = useState<OfferingSubcategory[]>([])
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<string[]>([])
  const [targetGradesInput, setTargetGradesInput] = useState<string>("")
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [posterUrl, setPosterUrl] = useState<string | null>(null)
  const [isUploadingPoster, setIsUploadingPoster] = useState(false)
  const [typeConfig, setTypeConfig] = useState<Record<string, any>>({})
  const [offeringTypes, setOfferingTypes] = useState<OfferingType[]>([])
  const [selectedOfferingType, setSelectedOfferingType] = useState<OfferingType | null>(null)

  // 检查是否是 archived 状态的 offering（只读模式）
  const isArchived = offering?.status === 'archived'

  const [formData, setFormData] = useState<Omit<Offering, 'tags'>>({
    name: "",
    slug: "",
    description: "",
    target_audience: "",
    learning_outcomes: "",
    prerequisites: "",
    // Removed Instance-specific fields: cancellation_policy, session_count, age_min, age_max, target_grades, duration_hours
    // These fields are now managed at the Instance level, not the Offering level
    base_price: undefined,
    currency: "USD",
    poster_url: null,
    offering_type: "course",
    type_config: {},
    status: "draft",
  })

  // 使用 useRef 来存储已初始化的 offering.id 和 offering 对象，避免重复初始化
  const initializedOfferingIdRef = useRef<string | null>(null)
  const offeringRef = useRef<Offering | null>(null)

  // 更新 offeringRef 当 offering 改变时
  useEffect(() => {
    offeringRef.current = offering
  }, [offering])

  const fetchSubcategories = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/subcategories")
      if (response.ok) {
        const data = await response.json()
        setSubcategories(data)
      }
    } catch (error) {
      console.error("Error fetching subcategories:", error)
    }
  }, [])

  const fetchOfferingTypes = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/offering-types")
      if (response.ok) {
        const data = await response.json()
        // 只显示激活的类型
        const activeTypes = data.filter((type: OfferingType) => type.is_active)
        setOfferingTypes(activeTypes)
      }
    } catch (error) {
      console.error("Error fetching offering types:", error)
    }
  }, [])

  const resetForm = useCallback(() => {
    setFormData({
      name: "",
      slug: "",
      description: "",
      target_audience: "",
      learning_outcomes: "",
      prerequisites: "",
      // Removed Instance-specific fields
      base_price: undefined,
      currency: "USD",
      poster_url: null,
      offering_type: "course", // 临时默认值，会在 types 加载后更新
      type_config: {},
      status: "draft",
    })
    setPosterUrl(null)
    setSelectedSubcategoryIds([])
    setTargetGradesInput("")
    setSlugManuallyEdited(false)
  }, [])

  useEffect(() => {
    if (!open) {
      // 对话框关闭时，重置初始化标志
      initializedOfferingIdRef.current = null
      offeringRef.current = null
      return
    }
    
    // 对话框打开时，总是加载 offering types
    fetchOfferingTypes()
    
    const currentOfferingId = offering?.id || null
    
    // 如果已经初始化过且 offering.id 没有改变，跳过
    if (initializedOfferingIdRef.current === currentOfferingId) {
      return
    }
    
    // 标记为已初始化
    initializedOfferingIdRef.current = currentOfferingId
    
    fetchSubcategories()
    
    // 使用 offeringRef.current 来获取最新的 offering 对象
    const currentOffering = offeringRef.current
    if (currentOffering) {
      setFormData({
        id: currentOffering.id,
        name: currentOffering.name,
        slug: currentOffering.slug || "",
        description: currentOffering.description || "",
        target_audience: currentOffering.target_audience || "",
        learning_outcomes: currentOffering.learning_outcomes || "",
        prerequisites: currentOffering.prerequisites || "",
        // Removed Instance-specific fields - these are now managed at Instance level
        base_price: currentOffering.base_price,
        currency: currentOffering.currency || "USD",
        poster_url: currentOffering.poster_url || null,
        offering_type: currentOffering.offering_type || "course",
        type_config: currentOffering.type_config || {},
        status: currentOffering.status || "draft",
      })
      setPosterUrl(currentOffering.poster_url || null)
      setSelectedSubcategoryIds(currentOffering.tags?.map(t => t.id) || [])
      setTargetGradesInput("") // Removed - no longer used
      setSlugManuallyEdited(!!currentOffering.slug)
      setTypeConfig(currentOffering.type_config || {})
    } else {
      resetForm()
      setSlugManuallyEdited(false)
      setTypeConfig({})
      // 创建新 offering 时，如果没有默认类型，等待 types 加载后设置第一个
      if (offeringTypes.length > 0 && !formData.offering_type) {
        setFormData(prev => ({ ...prev, offering_type: offeringTypes[0].code as Offering['offering_type'] }))
      }
    }
  }, [open, offering?.id, fetchSubcategories, resetForm, fetchOfferingTypes])

  // 当 offeringTypes 加载完成后，如果是新 offering，设置第一个类型
  useEffect(() => {
    if (open && !offering?.id && offeringTypes.length > 0) {
      const currentTypeExists = offeringTypes.some(type => type.code === formData.offering_type)
      if (!currentTypeExists || formData.offering_type === "course") {
        // 如果当前类型不在列表中，或者还是默认的 "course"，设置为第一个可用的类型
        setFormData(prev => ({ ...prev, offering_type: offeringTypes[0].code as Offering['offering_type'] }))
      }
    }
  }, [open, offering?.id, offeringTypes])

  // 当 offering_type 改变时，更新 selectedOfferingType
  useEffect(() => {
    if (formData.offering_type && offeringTypes.length > 0) {
      const type = offeringTypes.find(t => t.code === formData.offering_type)
      setSelectedOfferingType(type || null)
    } else {
      setSelectedOfferingType(null)
    }
  }, [formData.offering_type, offeringTypes])

  // 当 offering_type 改变时，重置 type_config
  useEffect(() => {
    if (!offering?.id) { // 只在创建新 offering 时重置
      setTypeConfig({})
    }
  }, [formData.offering_type, offering?.id])

  // 检查字段是否可见（根据 visible_fields 配置）
  const isFieldVisible = (fieldPath: string): boolean => {
    if (!selectedOfferingType?.config_schema?.visible_fields) {
      // 如果没有 visible_fields 配置，默认显示所有字段（向后兼容）
      return true
    }

    const visibleFields = selectedOfferingType.config_schema.visible_fields
    const [category, field] = fieldPath.split('.')

    if (category && field) {
      return visibleFields[category]?.[field] === true
    }

    // 如果路径格式不正确，默认显示
    return true
  }

  // 检查是否有任何教育相关字段可见
  const hasAnyEducationField = (): boolean => {
    if (!selectedOfferingType?.config_schema?.visible_fields?.education) {
      return true // 向后兼容
    }
    const educationFields = selectedOfferingType.config_schema.visible_fields.education
    return Object.values(educationFields).some((visible: any) => visible === true)
  }

  // 检查是否有任何价格相关字段可见
  const hasAnyPricingField = (): boolean => {
    if (!selectedOfferingType?.config_schema?.visible_fields?.pricing) {
      return true // 向后兼容
    }
    const pricingFields = selectedOfferingType.config_schema.visible_fields.pricing
    return Object.values(pricingFields).some((visible: any) => visible === true)
  }

  // 字段定义映射：根据字段名返回字段配置
  const getFieldConfig = (fieldName: string) => {
    const fieldConfigs: Record<string, {
      type: 'number' | 'text' | 'boolean' | 'select' | 'array' | 'time' | 'object'
      label: string
      placeholder?: string
      step?: number
      options?: Array<{ value: string; label: string }>
      dependsOn?: { field: string; value: any }
      description?: string
    }> = {
      // Course fields
      'default_session_count': {
        type: 'number',
        label: 'Default Session Count',
        placeholder: '10',
      },
      'default_weekly_frequency': {
        type: 'select',
        label: 'Default Weekly Frequency',
        options: [
          { value: '1', label: '1 (Weekly)' },
          { value: '2', label: '2 (Bi-weekly)' },
        ],
      },
      'default_duration_hours': {
        type: 'number',
        label: 'Default Duration (Hours)',
        placeholder: '1.5',
        step: 0.5,
      },
      'supports_multi_child_discount': {
        type: 'boolean',
        label: 'Supports Multi-Child Discount',
      },
      // Workshop fields
      'supports_drop_in': {
        type: 'boolean',
        label: 'Supports Drop-In',
      },
      'drop_in_price': {
        type: 'number',
        label: 'Drop-In Price',
        placeholder: '50.00',
        step: 0.01,
        dependsOn: { field: 'supports_drop_in', value: true },
      },
      'supports_multipass': {
        type: 'boolean',
        label: 'Supports Multipass',
      },
      'weekly_frequency': {
        type: 'select',
        label: 'Weekly Frequency',
        options: [
          { value: '1', label: '1 (Weekly)' },
          { value: '2', label: '2 (Bi-weekly)' },
        ],
      },
      'biweekly_interval': {
        type: 'number',
        label: 'Bi-weekly Interval',
        placeholder: '2',
        dependsOn: { field: 'weekly_frequency', value: 2 },
      },
      // Camp fields
      'default_duration_days': {
        type: 'number',
        label: 'Default Duration (Days)',
        placeholder: '5',
      },
      'default_daily_schedule': {
        type: 'object',
        label: 'Default Daily Schedule',
        description: 'Start and end times for daily schedule',
      },
      // Gift Card fields
      'denominations': {
        type: 'array',
        label: 'Denominations (comma-separated)',
        placeholder: '50, 100, 200, 500',
      },
      'expiry_months': {
        type: 'number',
        label: 'Expiry (Months)',
        placeholder: '12',
      },
      // Care Service fields
      'service_duration_hours': {
        type: 'number',
        label: 'Service Duration (Hours)',
        placeholder: '2',
        step: 0.5,
      },
      'requires_advance_booking': {
        type: 'boolean',
        label: 'Requires Advance Booking',
      },
      'advance_booking_hours': {
        type: 'number',
        label: 'Advance Booking (Hours)',
        placeholder: '24',
      },
      // Lunch Service fields
      'meal_options': {
        type: 'array',
        label: 'Meal Options (comma-separated)',
        placeholder: 'vegetarian, non-vegetarian, vegan',
      },
      'requires_camp_enrollment': {
        type: 'boolean',
        label: 'Requires Camp Enrollment',
      },
    }
    return fieldConfigs[fieldName]
  }

  // 根据 config_schema 动态渲染配置字段
  const renderConfigFields = () => {
    if (!selectedOfferingType?.config_schema) {
      return null
    }

    const schema = selectedOfferingType.config_schema
    // 支持新的 type_specific_fields 结构，也兼容旧的 fields 结构
    const typeSpecificFields = schema.type_specific_fields || schema.fields || []

    if (typeSpecificFields.length === 0) {
      return (
        <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
          <h3 className="font-semibold text-sm">{selectedOfferingType.name} Configuration</h3>
          <p className="text-sm text-muted-foreground">
            No additional configuration required for this offering type.
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
        <h3 className="font-semibold text-sm">{selectedOfferingType.name} Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {typeSpecificFields.map((field: any, index: number) => {
            // 支持新的对象结构 {name, type, label, ...} 和旧的字符串结构
            const fieldName = typeof field === 'string' ? field : field.name
            const fieldDef = typeof field === 'string' ? getFieldConfig(fieldName) : field
            
            // 如果新结构中没有 type，尝试从 getFieldConfig 获取
            const fieldConfig = typeof field === 'string' 
              ? getFieldConfig(fieldName)
              : { ...getFieldConfig(fieldName), ...fieldDef }
            
            if (!fieldConfig) {
              return null
            }

            // 检查依赖关系
            if (fieldConfig.dependsOn) {
              const dependsOnValue = typeConfig[fieldConfig.dependsOn.field]
              const expectedValue = fieldConfig.dependsOn.value
              // 支持多种比较方式
              if (dependsOnValue !== expectedValue) {
                return null
              }
            }
            
            // 使用新结构中的 label 和 placeholder（如果存在）
            const fieldLabel = typeof field === 'object' && field.label ? field.label : fieldConfig.label
            const fieldPlaceholder = typeof field === 'object' && field.placeholder ? field.placeholder : fieldConfig.placeholder

            // 处理 object 类型字段（如 default_daily_schedule）
            if (fieldConfig.type === 'object') {
              const objectFields = typeof field === 'object' && field.fields ? field.fields : []
              return (
                <div key={fieldName} className="md:col-span-2 space-y-4">
                  <Label>{fieldLabel}</Label>
                  {fieldConfig.description && (
                    <p className="text-xs text-muted-foreground">{fieldConfig.description}</p>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {objectFields.map((objField: any) => (
                      <div key={objField.name} className="space-y-2">
                        <Label htmlFor={`${fieldName}_${objField.name}`}>{objField.label}</Label>
                        <Input
                          id={`${fieldName}_${objField.name}`}
                          type={objField.type || 'text'}
                          value={typeConfig[fieldName]?.[objField.name] || objField.default || ""}
                          onChange={(e) => {
                            if (isArchived) return
                            setTypeConfig({
                              ...typeConfig,
                              [fieldName]: {
                                ...(typeConfig[fieldName] || {}),
                                [objField.name]: e.target.value,
                              },
                            })
                          }}
                          disabled={isArchived}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )
            }

            // 渲染不同类型的字段
            switch (fieldConfig.type) {
              case 'number':
                return (
                  <div key={fieldName} className="space-y-2">
                    <Label htmlFor={fieldName}>{fieldLabel}</Label>
                    <Input
                      id={fieldName}
                      type="number"
                      step={fieldConfig.step}
                      value={typeConfig[fieldName] || ""}
                      onChange={(e) => {
                        if (isArchived) return
                        setTypeConfig({
                          ...typeConfig,
                          [fieldName]: e.target.value ? (fieldConfig.step ? parseFloat(e.target.value) : parseInt(e.target.value)) : undefined,
                        })
                      }}
                      placeholder={fieldPlaceholder}
                      disabled={isArchived}
                    />
                  </div>
                )

              case 'text':
                return (
                  <div key={fieldName} className="space-y-2">
                    <Label htmlFor={fieldName}>{fieldLabel}</Label>
                    <Input
                      id={fieldName}
                      type="text"
                      value={typeConfig[fieldName] || ""}
                      onChange={(e) => {
                        if (isArchived) return
                        setTypeConfig({
                          ...typeConfig,
                          [fieldName]: e.target.value,
                        })
                      }}
                      placeholder={fieldPlaceholder}
                      disabled={isArchived}
                    />
                  </div>
                )

              case 'boolean':
                return (
                  <div key={fieldName} className="space-y-2 flex items-center">
                    <Checkbox
                      id={fieldName}
                      checked={typeConfig[fieldName] || (typeof field === 'object' && field.default === true) || false}
                      onCheckedChange={(checked) => {
                        if (isArchived) return
                        setTypeConfig({
                          ...typeConfig,
                          [fieldName]: checked,
                        })
                      }}
                      disabled={isArchived}
                    />
                    <Label htmlFor={fieldName} className="ml-2 cursor-pointer">
                      {fieldLabel}
                    </Label>
                  </div>
                )

              case 'select':
                const selectOptions = typeof field === 'object' && field.options ? field.options : fieldConfig.options || []
                return (
                  <div key={fieldName} className="space-y-2">
                    <Label htmlFor={fieldName}>{fieldLabel}</Label>
                    <Select
                      value={String(typeConfig[fieldName] || (typeof field === 'object' && field.default) || selectOptions[0]?.value || "")}
                      onValueChange={(value) => {
                        if (isArchived) return
                        const newConfig: Record<string, any> = {
                          ...typeConfig,
                          [fieldName]: fieldName === 'weekly_frequency' ? parseInt(value) : value,
                        }
                        // 特殊处理：如果 weekly_frequency 改变，可能需要更新 biweekly_interval
                        if (fieldName === 'weekly_frequency') {
                          if (parseInt(value) === 2) {
                            newConfig.biweekly_interval = typeConfig.biweekly_interval || 2
                          } else {
                            delete newConfig.biweekly_interval
                          }
                        }
                        setTypeConfig(newConfig)
                      }}
                      disabled={isArchived}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {selectOptions.map((option: any) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )

              case 'array':
                const itemType = typeof field === 'object' && field.itemType ? field.itemType : 'text'
                const separator = typeof field === 'object' && field.separator ? field.separator : ','
                return (
                  <div key={fieldName} className="space-y-2">
                    <Label htmlFor={fieldName}>{fieldLabel}</Label>
                    <Input
                      id={fieldName}
                      type="text"
                      value={Array.isArray(typeConfig[fieldName]) ? typeConfig[fieldName].join(separator + " ") : ""}
                      onChange={(e) => {
                        if (isArchived) return
                        const values = e.target.value
                          .split(separator)
                          .map(v => {
                            const trimmed = v.trim()
                            // 如果是数字数组，尝试解析为数字
                            if (itemType === 'number') {
                              const num = parseFloat(trimmed)
                              return isNaN(num) ? null : num
                            }
                            return trimmed
                          })
                          .filter(v => v !== null && v !== "")
                        setTypeConfig({
                          ...typeConfig,
                          [fieldName]: values,
                        })
                      }}
                      placeholder={fieldPlaceholder}
                      disabled={isArchived}
                    />
                  </div>
                )

              default:
                return null
            }
          })}
        </div>
      </div>
    )
  }

  const toggleSubcategory = (subcategoryId: string) => {
    setSelectedSubcategoryIds((prev) =>
      prev.includes(subcategoryId)
        ? prev.filter((id) => id !== subcategoryId)
        : [...prev, subcategoryId]
    )
  }

  // Validate grade input
  const validateGradeInput = (value: string): boolean => {
    const gradePattern = /^[K0-9\s\-;,]*$/i
    return gradePattern.test(value)
  }

  // Parse semicolon-separated grades string into array
  const parseGrades = (input: string): string[] => {
    if (!input.trim()) return []
    return input
      .split(";")
      .map((g) => g.trim())
      .filter((g) => g !== "")
  }

  // Handle target grades input change
  const handleTargetGradesChange = (value: string) => {
    if (!validateGradeInput(value)) {
      return
    }
    
    setTargetGradesInput(value)
    const parsedGrades = parseGrades(value)
    
    // Auto-generate slug when grade changes (only if not manually edited)
    let newSlug = formData.slug || ""
    if (formData.name && !slugManuallyEdited && parsedGrades.length > 0) {
      newSlug = generateSlug(formData.name, parsedGrades)
    }
    
    setFormData({ ...formData, target_grades: parsedGrades, slug: newSlug })
  }

  // Function to generate slug from name and grades
  const generateSlug = (name: string, grades: string[]): string => {
    if (!name) return ""
    
    let slugParts: string[] = [name]
    
    if (grades.length > 0) {
      const validGrades = grades
        .map((g) => g.trim())
        .filter((g) => g !== "")
      if (validGrades.length > 0) {
        slugParts.push(validGrades.join(" "))
      }
    }
    
    const combined = slugParts.join(" ")
    
    const slug = combined
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
    
    return slug
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // 根据 visible_fields 配置，只保存显示的字段
      const visibleFields = selectedOfferingType?.config_schema?.visible_fields
      
      const submitData: any = {
        name: formData.name,
        offering_type: formData.offering_type,
        status: formData.status,
        type_config: typeConfig, // 包含类型特定的配置
      }

      // 通用字段
      if (!visibleFields || visibleFields.general?.slug !== false) {
        submitData.slug = formData.slug
      }
      if (!visibleFields || visibleFields.general?.description !== false) {
        submitData.description = formData.description
      }
      if (!visibleFields || visibleFields.general?.poster_url !== false) {
        submitData.poster_url = posterUrl
      }

      // 教育相关字段（保留 target_audience, learning_outcomes, prerequisites）
      // Removed Instance-specific fields: age_min, age_max, target_grades, session_count, duration_hours
      // These are now managed at the Instance level
      if (!visibleFields || visibleFields.education?.target_audience !== false) {
        submitData.target_audience = formData.target_audience || null
      }
      if (!visibleFields || visibleFields.education?.learning_outcomes !== false) {
        submitData.learning_outcomes = formData.learning_outcomes || null
      }
      if (!visibleFields || visibleFields.education?.prerequisites !== false) {
        submitData.prerequisites = formData.prerequisites || null
      }

      // 价格相关字段
      if (!visibleFields || visibleFields.pricing?.base_price !== false) {
        submitData.base_price = formData.base_price || null
      }
      if (!visibleFields || visibleFields.pricing?.currency !== false) {
        submitData.currency = formData.currency || "USD"
      }

      // Removed cancellation_policy - now managed at Franchise level

      // 分类标签
      if (!visibleFields || visibleFields.tags?.subcategory_tags !== false) {
        submitData.subcategory_ids = selectedSubcategoryIds
      }

      const url = offering?.id ? `/api/admin/offerings/${offering.id}` : "/api/admin/offerings"
      const method = offering?.id ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      })

      if (response.ok) {
        toast.success(offering?.id ? "Offering updated successfully" : "Offering created successfully")
        onOfferingUpdated()
        onOpenChange(false)
        resetForm()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to save offering")
      }
    } catch (error) {
      console.error("Error saving offering:", error)
      toast.error("Failed to save offering")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePosterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Only JPEG, PNG, and WebP are allowed.")
      e.target.value = ""
      return
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      toast.error("File size exceeds 5MB limit.")
      e.target.value = ""
      return
    }

    setIsUploadingPoster(true)
    try {
      const uploadFormData = new FormData()
      uploadFormData.append("file", file)

      const response = await fetch("/api/admin/courses/upload", {
        method: "POST",
        body: uploadFormData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to upload poster")
      }

      const data = await response.json()
      setPosterUrl(data.url)
      setFormData((prev) => ({ ...prev, poster_url: data.url }))
      toast.success("Poster uploaded successfully")
    } catch (error: any) {
      console.error("Error uploading poster:", error)
      toast.error(error.message || "Failed to upload poster")
    } finally {
      setIsUploadingPoster(false)
      e.target.value = ""
    }
  }

  const handleRemovePoster = () => {
    setPosterUrl(null)
    setFormData({ ...formData, poster_url: null })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[700px] lg:max-w-[900px] xl:max-w-[1000px] max-h-[95vh] h-[95vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {offering ? (isArchived ? "View Offering (Archived)" : "Edit Offering") : "Add New Offering"}
          </DialogTitle>
          <DialogDescription>
            {offering 
              ? (isArchived 
                  ? "This offering is archived and cannot be edited. You can only view the details."
                  : "Update offering information")
              : "Create a new offering (assignments will be created separately)"}
          </DialogDescription>
          {isArchived && (
            <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ This offering is archived and cannot be edited. All fields are read-only.
              </p>
            </div>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* Offering Type */}
          <div className="space-y-2">
            <Label htmlFor="offering_type">Offering Type *</Label>
            <Select
              value={formData.offering_type}
              onValueChange={(value: Offering['offering_type']) => {
                if (isArchived) return
                setFormData({ ...formData, offering_type: value })
                // 重置 type_config 当类型改变时
                if (!offering?.id) {
                  setTypeConfig({})
                }
              }}
              required
              disabled={isArchived || !!offering?.id || offeringTypes.length === 0} // 编辑时不允许修改类型，或 types 未加载完成
            >
              <SelectTrigger>
                <SelectValue placeholder={offeringTypes.length === 0 ? "Loading types..." : "Select an offering type"} />
              </SelectTrigger>
              <SelectContent>
                {offeringTypes.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading types...</div>
                ) : (
                  offeringTypes.map((type) => (
                    <SelectItem key={type.code} value={type.code}>
                      {type.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {offering?.id && (
              <p className="text-xs text-muted-foreground">
                Offering type cannot be changed after creation.
              </p>
            )}
          </div>

          {/* Type-Specific Configuration - Dynamic based on config_schema */}
          {selectedOfferingType && renderConfigFields()}

          {/* Offering Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Offering Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => {
                if (isArchived) return
                const newName = e.target.value
                let newSlug = formData.slug || ""
                if (!slugManuallyEdited) {
                  const parsedGrades = parseGrades(targetGradesInput)
                  if (newName && parsedGrades.length > 0 && parsedGrades[0].trim()) {
                    newSlug = generateSlug(newName, parsedGrades)
                  } else if (newName) {
                    newSlug = generateSlug(newName, [])
                  } else {
                    newSlug = ""
                  }
                }
                setFormData({ ...formData, name: newName, slug: newSlug })
              }}
              placeholder="e.g., Introduction to Robotics with VEX GO"
              required
              disabled={isArchived}
            />
          </div>

          {/* Slug */}
          {isFieldVisible('general.slug') && (
          <div className="space-y-2">
            <Label htmlFor="slug">Slug (Auto-generated from name and grade)</Label>
            <Input
              id="slug"
              value={formData.slug || ""}
              onChange={(e) => {
                if (isArchived) return
                setFormData({ ...formData, slug: e.target.value })
                setSlugManuallyEdited(true)
              }}
              placeholder="e.g., introduction-to-robotics-with-vex-go-k-2"
              disabled={isArchived}
            />
            <p className="text-xs text-muted-foreground">
              Automatically generated from offering name and first target grade. You can manually edit if needed.
            </p>
          </div>
          )}

          {/* Poster Upload */}
          {isFieldVisible('general.poster_url') && (
          <div className="space-y-2">
            <Label htmlFor="poster">Offering Poster</Label>
            <div className="space-y-3">
              {posterUrl ? (
                <div className="relative group">
                  <div className="relative w-full h-48 rounded-lg overflow-hidden border border-border">
                    <Image
                      src={posterUrl}
                      alt="Offering poster"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={handleRemovePoster}
                    disabled={isArchived || isUploadingPoster}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">
                    No poster uploaded
                  </p>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  id="poster"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handlePosterUpload}
                  disabled={isArchived || isUploadingPoster}
                  className="hidden"
                />
                <Label
                  htmlFor="poster"
                  className={`flex items-center gap-2 px-4 py-2 border border-border rounded-md cursor-pointer hover:bg-accent transition-colors ${
                    isArchived || isUploadingPoster ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {isUploadingPoster ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      <span>{posterUrl ? "Replace Poster" : "Upload Poster"}</span>
                    </>
                  )}
                </Label>
                {posterUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemovePoster}
                    disabled={isArchived || isUploadingPoster}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Recommended: 1200x800px, max 5MB. Formats: JPEG, PNG, WebP
              </p>
            </div>
          </div>
          )}

          {/* Subcategory Tags */}
          {offering && isFieldVisible('tags.subcategory_tags') && (
          <div className="space-y-2">
            <Label>Subcategory Tags (Optional)</Label>
            <div className="border rounded-md p-3 min-h-[100px] max-h-[200px] overflow-y-auto">
              {subcategories.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No subcategories available. Create subcategories first.
                </p>
              ) : (
                <div className="space-y-2">
                  {subcategories.map((subcategory) => (
                    <div key={subcategory.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`subcategory-${subcategory.id}`}
                        checked={selectedSubcategoryIds.includes(subcategory.id)}
                        onCheckedChange={() => {
                          if (isArchived) return
                          toggleSubcategory(subcategory.id)
                        }}
                        disabled={isArchived}
                      />
                      <Label
                        htmlFor={`subcategory-${subcategory.id}`}
                        className="text-sm font-normal cursor-pointer flex-1"
                      >
                        {subcategory.display_name}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selectedSubcategoryIds.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedSubcategoryIds.map((id) => {
                  const subcategory = subcategories.find((s) => s.id === id)
                  return subcategory ? (
                    <Badge key={id} variant="secondary">
                      {subcategory.display_name}
                    </Badge>
                  ) : null
                })}
              </div>
            )}
          </div>
          )}

          {/* Description */}
          {isFieldVisible('general.description') && (
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) => {
                if (isArchived) return
                setFormData({ ...formData, description: e.target.value })
              }}
              placeholder="Offering description"
              rows={3}
              disabled={isArchived}
            />
          </div>
          )}

          {/* Education Information Section */}
          {/* Removed Instance-specific fields: session_count, age_min, age_max, target_grades, duration_hours */}
          {/* These fields are now managed at the Instance level when creating instances */}
          {(isFieldVisible('education.target_audience') || 
            isFieldVisible('education.learning_outcomes') || 
            isFieldVisible('education.prerequisites')) && (
          <>
          {/* Target Audience */}
          {isFieldVisible('education.target_audience') && (
          <div className="space-y-2">
            <Label htmlFor="audience">Target Audience</Label>
            <Textarea
              id="audience"
              value={formData.target_audience || ""}
              onChange={(e) => {
                if (isArchived) return
                setFormData({ ...formData, target_audience: e.target.value })
              }}
              placeholder="e.g., Elementary school students interested in robotics"
              rows={2}
              disabled={isArchived}
            />
          </div>
          )}

          {/* Learning Outcomes */}
          {isFieldVisible('education.learning_outcomes') && (
          <div className="space-y-2">
            <Label htmlFor="outcomes">Learning Outcomes</Label>
            <Textarea
              id="outcomes"
              value={formData.learning_outcomes || ""}
              onChange={(e) => {
                if (isArchived) return
                setFormData({ ...formData, learning_outcomes: e.target.value })
              }}
              placeholder="What students will learn"
              rows={3}
              disabled={isArchived}
            />
          </div>
          )}

          {/* Prerequisites */}
          {isFieldVisible('education.prerequisites') && (
          <div className="space-y-2">
            <Label htmlFor="prerequisites">Prerequisites</Label>
            <Textarea
              id="prerequisites"
              value={formData.prerequisites || ""}
              onChange={(e) => {
                if (isArchived) return
                setFormData({ ...formData, prerequisites: e.target.value })
              }}
              placeholder="e.g., No prior experience required"
              rows={2}
              disabled={isArchived}
            />
          </div>
          )}
          </>)}

          {/* Pricing Section */}
          {hasAnyPricingField() && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isFieldVisible('pricing.base_price') && (
            <div className="space-y-2">
              <Label htmlFor="price">Base Price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.base_price || ""}
                onChange={(e) => {
                  if (isArchived) return
                  setFormData({
                    ...formData,
                    base_price: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }}
                placeholder="299.99"
                disabled={isArchived}
              />
            </div>
            )}

            {isFieldVisible('pricing.currency') && (
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.currency || "USD"}
                onValueChange={(value) => {
                  if (isArchived) return
                  setFormData({ ...formData, currency: value })
                }}
                disabled={isArchived}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="CAD">CAD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            )}
          </div>
          )}

          {/* Removed Cancellation Policy - now managed at Franchise level */}

          {/* Offering Status */}
          {isFieldVisible('general.status') && (
          <div className="space-y-2">
            <Label htmlFor="status">Offering Status *</Label>
            <Select
              value={formData.status || "draft"}
              onValueChange={(value: 'draft' | 'published' | 'suspended' | 'archived') => {
                if (isArchived) return
                setFormData({ ...formData, status: value })
              }}
              disabled={isArchived}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft (草稿)</SelectItem>
                <SelectItem value="published">Published (已发布)</SelectItem>
                <SelectItem value="suspended">Suspended (暂停)</SelectItem>
                <SelectItem value="archived">Archived (已归档)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Draft: 正在设计中，不能分配。 Published: 可以分配和上架。 Suspended: 临时下架。 Archived: 已归档。
            </p>
          </div>
          )}
          </div>

          <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.name || isArchived} className="w-full sm:w-auto">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isArchived ? (
                "Cannot Edit Archived Offering"
              ) : offering ? (
                "Update Offering"
              ) : (
                "Create Offering"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

