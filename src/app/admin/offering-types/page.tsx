'use client'

import { useState, useEffect, useCallback } from "react"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, MoreVertical, Edit, Trash2, Plus, Loader2, RefreshCcw, Lock, X, Link } from "lucide-react"
import { toast } from "sonner"

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
  category_id?: string
  is_bound_to_category: boolean
  is_system_managed: boolean
  category?: {
    id: string
    name: string
    display_name: string
  }
  config_schema?: Record<string, any>
  created_at: string
  updated_at: string
}

export default function OfferingTypesManagementPage() {
  const [offeringTypes, setOfferingTypes] = useState<OfferingType[]>([])
  const [filteredTypes, setFilteredTypes] = useState<OfferingType[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [editingType, setEditingType] = useState<OfferingType | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState<Omit<OfferingType, 'id' | 'created_at' | 'updated_at'>>({
    code: "",
    name: "",
    description: "",
    icon: "",
    color: "",
    display_order: 0,
    is_active: true,
    is_default: false,
    is_bound_to_category: false,
    is_system_managed: false,
    config_schema: {},
  })
  const [configSchemaText, setConfigSchemaText] = useState("")
  const [configSchemaError, setConfigSchemaError] = useState<string | null>(null)
  const [useVisualEditor, setUseVisualEditor] = useState(true)
  
  // Visible fields state (for Offering edit dialog)
  const [visibleFields, setVisibleFields] = useState<Record<string, Record<string, boolean>>>({
    general: {
      name: true,
      slug: true,
      description: true,
      poster_url: true,
      status: true,
    },
    education: {
      target_audience: false,
      age_min: false,
      age_max: false,
      target_grades: false,
      grade_level: false,
      session_count: false,
      duration_hours: false,
      learning_outcomes: false,
      prerequisites: false,
    },
    pricing: {
      base_price: true,
      currency: true,
    },
    policy: {
      cancellation_policy: false,
    },
    tags: {
      subcategory_tags: false,
    },
  })
  
  // Instance fields state (for Instance create/edit dialog)
  const [instanceFields, setInstanceFields] = useState<Record<string, { visible?: boolean; required?: boolean }>>({
    start_date: { visible: true, required: true },
    end_date: { visible: true, required: true },
    location_id: { visible: true, required: false },
    max_students: { visible: true, required: false },
    session_count: { visible: false, required: false },
    duration_hours: { visible: false, required: false },
    duration_days: { visible: false, required: false },
    start_time: { visible: false, required: false },
    end_time: { visible: false, required: false },
    days_of_week: { visible: false, required: false },
    age_min: { visible: false, required: false },
    age_max: { visible: false, required: false },
    target_grades: { visible: false, required: false },
    price_override: { visible: true, required: false },
    notes: { visible: true, required: false },
  })
  
  // Type specific fields state
  const [typeSpecificFields, setTypeSpecificFields] = useState<Array<{
    name: string
    type: string
    label: string
    placeholder?: string
    required?: boolean
    step?: number
    options?: Array<{ value: string; label: string }>
    dependsOn?: { field: string; value: any }
    description?: string
    _isExisting?: boolean // 标记是否为已存在的字段（从数据库加载的）
  }>>([])
  
  // 存储原始字段名，用于检测字段是否已存在
  const [originalFieldNames, setOriginalFieldNames] = useState<Set<string>>(new Set())

  const fetchOfferingTypes = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch("/api/admin/offering-types?includeInactive=true")
      
      if (!response.ok) {
        throw new Error("Failed to fetch offering types")
      }

      const data = await response.json()
      setOfferingTypes(data)
      setFilteredTypes(data)
    } catch (err: any) {
      console.error("Error fetching offering types:", err)
      setError(err.message || "Failed to load offering types")
      toast.error(err.message || "Failed to load offering types")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOfferingTypes()
  }, [fetchOfferingTypes])

  useEffect(() => {
    if (searchQuery) {
      const filtered = offeringTypes.filter(
        (type) =>
          type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          type.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          type.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          type.category?.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredTypes(filtered)
    } else {
      setFilteredTypes(offeringTypes)
    }
  }, [searchQuery, offeringTypes])

  const handleDelete = async (typeId: string) => {
    const type = offeringTypes.find(t => t.id === typeId)
    if (!type) return

    if (type.is_default) {
      toast.error("Cannot delete default offering type")
      return
    }

    if (type.is_bound_to_category) {
      toast.error("Cannot delete offering type bound to a category. Delete the category instead.")
      return
    }

    if (!confirm(`Are you sure you want to delete "${type.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/offering-types/${typeId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Offering type deleted successfully")
        fetchOfferingTypes()
      } else {
        const data = await response.json()
        toast.error(data.error || "Failed to delete offering type")
      }
    } catch (error) {
      console.error("Error deleting offering type:", error)
      toast.error("Failed to delete offering type")
    }
  }

  const handleEdit = (type: OfferingType) => {
    setEditingType(type)
    setFormData({
      code: type.code,
      name: type.name,
      description: type.description || "",
      icon: type.icon || "",
      color: type.color || "",
      display_order: type.display_order,
      is_active: type.is_active,
      is_default: type.is_default,
      is_bound_to_category: type.is_bound_to_category || false,
      is_system_managed: type.is_system_managed || false,
      config_schema: type.config_schema || {},
    })
    
    const schema = type.config_schema || {}
    // 加载 visible_fields
    if (schema.visible_fields) {
      setVisibleFields(schema.visible_fields as any)
    }
    // 加载 instance_fields
    if (schema.instance_fields) {
      // 合并默认字段和已配置的字段
      const defaultInstanceFields: Record<string, { visible?: boolean; required?: boolean }> = {
        start_date: { visible: true, required: true },
        end_date: { visible: true, required: true },
        location_id: { visible: true, required: false },
        max_students: { visible: true, required: false },
        session_count: { visible: false, required: false },
        duration_hours: { visible: false, required: false },
        duration_days: { visible: false, required: false },
        start_time: { visible: false, required: false },
        end_time: { visible: false, required: false },
        days_of_week: { visible: false, required: false },
        age_min: { visible: false, required: false },
        age_max: { visible: false, required: false },
        target_grades: { visible: false, required: false },
        price_override: { visible: true, required: false },
        notes: { visible: true, required: false },
      }
      setInstanceFields({ ...defaultInstanceFields, ...schema.instance_fields })
    } else {
      // 使用默认值
      setInstanceFields({
        start_date: { visible: true, required: true },
        end_date: { visible: true, required: true },
        location_id: { visible: true, required: false },
        max_students: { visible: true, required: false },
        session_count: { visible: false, required: false },
        duration_hours: { visible: false, required: false },
        duration_days: { visible: false, required: false },
        start_time: { visible: false, required: false },
        end_time: { visible: false, required: false },
        days_of_week: { visible: false, required: false },
        age_min: { visible: false, required: false },
        age_max: { visible: false, required: false },
        target_grades: { visible: false, required: false },
        price_override: { visible: true, required: false },
        notes: { visible: true, required: false },
      })
    }
    // 加载 type_specific_fields，标记为已存在的字段
    if (schema.type_specific_fields) {
      const fields = (schema.type_specific_fields as any[]).map(field => ({
        ...field,
        _isExisting: true, // 标记为已存在的字段
      }))
      setTypeSpecificFields(fields)
      // 保存原始字段名集合
      const fieldNames = new Set(fields.map(f => f.name).filter(Boolean))
      setOriginalFieldNames(fieldNames)
    } else {
      setTypeSpecificFields([])
      setOriginalFieldNames(new Set())
    }
    
    // 将 config_schema 转换为格式化的 JSON 字符串（用于 JSON 编辑器）
    setConfigSchemaText(JSON.stringify(schema, null, 2))
    setConfigSchemaError(null)
    setIsEditDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingType(null)
    setFormData({
      code: "",
      name: "",
      description: "",
      icon: "",
      color: "",
      display_order: 0,
      is_active: true,
      is_default: false,
      is_bound_to_category: false,
      is_system_managed: false,
      config_schema: {},
    })
    
    // 设置默认的 visible_fields
    setVisibleFields({
      general: {
        name: true,
        slug: true,
        description: true,
        poster_url: true,
        status: true,
      },
      education: {
        target_audience: false,
        age_min: false,
        age_max: false,
        target_grades: false,
        grade_level: false,
        session_count: false,
        duration_hours: false,
        learning_outcomes: false,
        prerequisites: false,
      },
      pricing: {
        base_price: true,
        currency: true,
      },
      policy: {
        cancellation_policy: false,
      },
      tags: {
        subcategory_tags: false,
      },
    })
    
    // 设置默认的 instance_fields
    setInstanceFields({
      start_date: { visible: true, required: true },
      end_date: { visible: true, required: true },
      location_id: { visible: true, required: false },
      max_students: { visible: true, required: false },
      session_count: { visible: false, required: false },
      duration_hours: { visible: false, required: false },
      duration_days: { visible: false, required: false },
      start_time: { visible: false, required: false },
      end_time: { visible: false, required: false },
      days_of_week: { visible: false, required: false },
      age_min: { visible: false, required: false },
      age_max: { visible: false, required: false },
      target_grades: { visible: false, required: false },
      price_override: { visible: true, required: false },
      notes: { visible: true, required: false },
    })
    
    // 设置默认的 type_specific_fields
    setTypeSpecificFields([])
    setOriginalFieldNames(new Set()) // 新创建时没有原始字段名
    
    // 设置默认的 config_schema JSON
    const defaultConfigSchema = {
      visible_fields: {
        general: {
          name: true,
          slug: true,
          description: true,
          poster_url: true,
          status: true
        },
        education: {
          target_audience: false,
          age_min: false,
          age_max: false,
          target_grades: false,
          grade_level: false,
          session_count: false,
          duration_hours: false,
          learning_outcomes: false,
          prerequisites: false
        },
        pricing: {
          base_price: true,
          currency: true
        },
        policy: {
          cancellation_policy: false
        },
        tags: {
          subcategory_tags: false
        }
      },
      instance_fields: {
        start_date: { visible: true, required: true },
        end_date: { visible: true, required: true },
        location_id: { visible: true, required: false },
        max_students: { visible: true, required: false },
        session_count: { visible: false, required: false },
        duration_hours: { visible: false, required: false },
        duration_days: { visible: false, required: false },
        start_time: { visible: false, required: false },
        end_time: { visible: false, required: false },
        days_of_week: { visible: false, required: false },
        age_min: { visible: false, required: false },
        age_max: { visible: false, required: false },
        target_grades: { visible: false, required: false },
        price_override: { visible: true, required: false },
        notes: { visible: true, required: false },
      },
      type_specific_fields: []
    }
    setConfigSchemaText(JSON.stringify(defaultConfigSchema, null, 2))
    setConfigSchemaError(null)
    setIsEditDialogOpen(true)
  }
  
  // 更新 visible_fields
  const updateVisibleField = (category: string, field: string, value: boolean) => {
    setVisibleFields(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value,
      },
    }))
  }
  
  // 更新 instance_fields
  const updateInstanceField = (fieldName: string, property: 'visible' | 'required', value: boolean) => {
    setInstanceFields(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        [property]: value,
      },
    }))
  }
  
  // 添加 type specific field
  const addTypeSpecificField = () => {
    setTypeSpecificFields(prev => [...prev, {
      name: "",
      type: "text",
      label: "",
      placeholder: "",
      required: false,
      _isExisting: false, // 新字段，可以修改 name
    }])
  }
  
  // 更新 type specific field
  const updateTypeSpecificField = (index: number, updates: Partial<typeof typeSpecificFields[0]>) => {
    setTypeSpecificFields(prev => prev.map((field, i) => i === index ? { ...field, ...updates } : field))
  }
  
  // 删除 type specific field
  const removeTypeSpecificField = (index: number) => {
    setTypeSpecificFields(prev => prev.filter((_, i) => i !== index))
  }
  
  // 从可视化编辑器构建 config_schema
  const buildConfigSchemaFromVisual = () => {
    return {
      visible_fields: visibleFields,
      instance_fields: instanceFields,
      type_specific_fields: typeSpecificFields
        .filter(f => f.name && f.label) // 只包含有效的字段
        .map(({ _isExisting, ...field }) => field), // 移除内部标记字段
    }
  }

  const handleConfigSchemaChange = (value: string) => {
    setConfigSchemaText(value)
    setConfigSchemaError(null)
    
    // 尝试解析 JSON 以验证格式
    try {
      const parsed = JSON.parse(value)
      setFormData({ ...formData, config_schema: parsed })
    } catch (error: any) {
      setConfigSchemaError(error.message || "Invalid JSON format")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 根据使用的编辑器类型构建 config_schema
    let configSchema: any = {}
    if (useVisualEditor) {
      configSchema = buildConfigSchemaFromVisual()
      console.log(`[OfferingTypes] Building config_schema from visual editor:`, {
        hasVisibleFields: !!configSchema.visible_fields,
        hasInstanceFields: !!configSchema.instance_fields,
        instanceFields: configSchema.instance_fields,
        hasTypeSpecificFields: !!configSchema.type_specific_fields
      })
    } else {
      // 验证 config_schema JSON
      if (configSchemaText.trim()) {
        try {
          configSchema = JSON.parse(configSchemaText)
          setConfigSchemaError(null)
          console.log(`[OfferingTypes] Building config_schema from JSON editor:`, {
            hasVisibleFields: !!configSchema.visible_fields,
            hasInstanceFields: !!configSchema.instance_fields,
            instanceFields: configSchema.instance_fields,
            hasTypeSpecificFields: !!configSchema.type_specific_fields
          })
        } catch (error: any) {
          setConfigSchemaError(error.message || "Invalid JSON format")
          toast.error("Please fix the JSON syntax error in Config Schema")
          return
        }
      }
    }
    
    // 确保 instance_fields 始终存在（即使为空对象）
    if (!configSchema.instance_fields) {
      console.warn(`[OfferingTypes] instance_fields missing in config_schema, adding default empty object`)
      configSchema.instance_fields = {}
    }
    
    setIsSubmitting(true)

    try {
      const submitData = {
        ...formData,
        code: formData.code.toLowerCase().trim(),
        config_schema: configSchema,
      }

      console.log(`[OfferingTypes] Submitting offering type:`, {
        code: submitData.code,
        hasConfigSchema: !!submitData.config_schema,
        hasInstanceFields: !!submitData.config_schema?.instance_fields,
        instanceFields: submitData.config_schema?.instance_fields
      })

      const url = editingType
        ? `/api/admin/offering-types/${editingType.id}`
        : "/api/admin/offering-types"
      const method = editingType ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      })

      if (response.ok) {
        const savedData = await response.json()
        console.log(`[OfferingTypes] Successfully saved offering type:`, {
          code: savedData.code,
          hasConfigSchema: !!savedData.config_schema,
          hasInstanceFields: !!savedData.config_schema?.instance_fields,
          instanceFields: savedData.config_schema?.instance_fields
        })
        toast.success(editingType ? "Offering type updated successfully" : "Offering type created successfully")
        fetchOfferingTypes()
        setIsEditDialogOpen(false)
        setEditingType(null)
      } else {
        const error = await response.json()
        console.error(`[OfferingTypes] Failed to save:`, error)
        toast.error(error.error || "Failed to save offering type")
      }
    } catch (error) {
      console.error("Error saving offering type:", error)
      toast.error("Failed to save offering type")
    } finally {
      setIsSubmitting(false)
    }
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
        <h1 className="text-3xl font-bold">Offering Types Management</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Offering Types</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search offering types..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add Type
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
              <Button onClick={fetchOfferingTypes}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : filteredTypes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? "No offering types found matching your search." : "No offering types found."}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category / Default</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {type.is_bound_to_category && type.category && (
                            <div title={`Bound to category: ${type.category.display_name}`}>
                              <Link 
                                className="h-4 w-4 text-blue-600 dark:text-blue-400" 
                              />
                            </div>
                          )}
                          {type.is_default && (
                            <div title="Default offering type">
                              <Lock 
                                className="h-4 w-4 text-yellow-600 dark:text-yellow-400" 
                              />
                            </div>
                          )}
                          {!type.is_bound_to_category && !type.is_default && (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={type.is_active ? "default" : "secondary"}>
                          {type.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(type.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(type)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(type.id)}
                              disabled={type.is_default || type.is_bound_to_category}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete {type.is_default && "(Default types cannot be deleted)"}
                              {type.is_bound_to_category && "(Bound types cannot be deleted)"}
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
        </CardContent>
      </Card>

      <Dialog 
        open={isEditDialogOpen} 
        onOpenChange={(open) => {
          setIsEditDialogOpen(open)
          if (!open) {
            // 关闭对话框时重置
            setConfigSchemaText("")
            setConfigSchemaError(null)
            setEditingType(null)
            setUseVisualEditor(true)
          }
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-[700px] lg:max-w-[900px] xl:max-w-[1000px] max-h-[95vh] h-[95vh] flex flex-col p-4 sm:p-6">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{editingType ? "Edit Offering Type" : "Add New Offering Type"}</DialogTitle>
            <DialogDescription>
              {editingType ? "Update offering type information" : "Create a new offering type"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            {/* 绑定状态提示 */}
            {editingType?.is_bound_to_category && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                <div className="flex items-start gap-2">
                  <Link className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Bound to Category
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      This offering type is automatically managed by the system. 
                      Code and category binding cannot be modified.
                    </p>
                    {editingType.category && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Category: <strong>{editingType.category.display_name}</strong>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Code 字段：只有独立类型才显示 */}
            {!editingType?.is_bound_to_category && (
              <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().trim() })}
                  placeholder="e.g., course, workshop, camp"
                  required
                  disabled={!!editingType} // 编辑时不允许修改 code
                  pattern="[a-z0-9_]+"
                />
                <p className="text-xs text-muted-foreground">
                  Lowercase letters, numbers, and underscores only. Cannot be changed after creation.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Course, Workshop, Camp"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this offering type"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="icon">Icon</Label>
                <Input
                  id="icon"
                  value={formData.icon || ""}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="e.g., book, calendar, gift"
                />
                <p className="text-xs text-muted-foreground">
                  Icon name (optional)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  type="color"
                  value={formData.color || "#000000"}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground">
                  Color for UI display (optional)
                </p>
              </div>
            </div>

            {/* Display Order 字段已移除 */}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked as boolean })
                }
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Active
              </Label>
            </div>

            {editingType?.is_default && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ This is a default offering type. Some fields cannot be modified.
                </p>
              </div>
            )}
            
            {editingType?.is_bound_to_category && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  ⚠️ This offering type is bound to a category. Code and category binding cannot be modified.
                </p>
              </div>
            )}

            {/* Config Schema Editor */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <Label>Config Schema</Label>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant={useVisualEditor ? "default" : "outline"}
                    size="sm"
                    onClick={() => setUseVisualEditor(true)}
                    className="flex-1 sm:flex-initial"
                  >
                    Visual Editor
                  </Button>
                  <Button
                    type="button"
                    variant={!useVisualEditor ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setUseVisualEditor(false)
                      // 同步可视化编辑器的数据到 JSON
                      const schema = buildConfigSchemaFromVisual()
                      setConfigSchemaText(JSON.stringify(schema, null, 2))
                    }}
                    className="flex-1 sm:flex-initial"
                  >
                    JSON Editor
                  </Button>
                </div>
              </div>

              {useVisualEditor ? (
                <Tabs defaultValue="visible-fields" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="visible-fields">Offering Fields</TabsTrigger>
                    <TabsTrigger value="instance-fields">Instance Fields</TabsTrigger>
                    <TabsTrigger value="type-specific">Type Specific Fields</TabsTrigger>
                  </TabsList>

                  <TabsContent value="visible-fields" className="space-y-4 mt-4">
                    <p className="text-sm text-muted-foreground">
                      Configure which fields should be visible in the Offering edit dialog for this offering type.
                    </p>
                    <Accordion type="multiple" className="w-full">
                      <AccordionItem value="general">
                        <AccordionTrigger>General Fields</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2">
                            {Object.entries(visibleFields.general || {}).map(([field, visible]) => (
                              <div key={field} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`general-${field}`}
                                  checked={visible}
                                  onCheckedChange={(checked) => updateVisibleField('general', field, checked as boolean)}
                                />
                                <Label htmlFor={`general-${field}`} className="cursor-pointer font-normal">
                                  {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="education">
                        <AccordionTrigger>Education Fields</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2">
                            {Object.entries(visibleFields.education || {}).map(([field, visible]) => (
                              <div key={field} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`education-${field}`}
                                  checked={visible}
                                  onCheckedChange={(checked) => updateVisibleField('education', field, checked as boolean)}
                                />
                                <Label htmlFor={`education-${field}`} className="cursor-pointer font-normal">
                                  {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="pricing">
                        <AccordionTrigger>Pricing Fields</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2">
                            {Object.entries(visibleFields.pricing || {}).map(([field, visible]) => (
                              <div key={field} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`pricing-${field}`}
                                  checked={visible}
                                  onCheckedChange={(checked) => updateVisibleField('pricing', field, checked as boolean)}
                                />
                                <Label htmlFor={`pricing-${field}`} className="cursor-pointer font-normal">
                                  {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="policy">
                        <AccordionTrigger>Policy Fields</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2">
                            {Object.entries(visibleFields.policy || {}).map(([field, visible]) => (
                              <div key={field} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`policy-${field}`}
                                  checked={visible}
                                  onCheckedChange={(checked) => updateVisibleField('policy', field, checked as boolean)}
                                />
                                <Label htmlFor={`policy-${field}`} className="cursor-pointer font-normal">
                                  {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="tags">
                        <AccordionTrigger>Tags Fields</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2">
                            {Object.entries(visibleFields.tags || {}).map(([field, visible]) => (
                              <div key={field} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`tags-${field}`}
                                  checked={visible}
                                  onCheckedChange={(checked) => updateVisibleField('tags', field, checked as boolean)}
                                />
                                <Label htmlFor={`tags-${field}`} className="cursor-pointer font-normal">
                                  {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </TabsContent>

                  <TabsContent value="instance-fields" className="space-y-4 mt-4">
                    <p className="text-sm text-muted-foreground">
                      Configure which fields should be visible and required in the Instance create/edit dialog for this offering type.
                    </p>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(instanceFields).map(([fieldName, config]) => (
                          <Card key={fieldName} className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="font-semibold text-sm">
                                  {fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </Label>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`instance-visible-${fieldName}`}
                                    checked={config.visible !== false}
                                    onCheckedChange={(checked) => updateInstanceField(fieldName, 'visible', checked as boolean)}
                                  />
                                  <Label htmlFor={`instance-visible-${fieldName}`} className="cursor-pointer font-normal text-xs">
                                    Visible
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`instance-required-${fieldName}`}
                                    checked={config.required === true}
                                    onCheckedChange={(checked) => updateInstanceField(fieldName, 'required', checked as boolean)}
                                    disabled={config.visible === false}
                                  />
                                  <Label 
                                    htmlFor={`instance-required-${fieldName}`} 
                                    className={`cursor-pointer font-normal text-xs ${config.visible === false ? 'text-muted-foreground' : ''}`}
                                  >
                                    Required
                                  </Label>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="type-specific" className="space-y-4 mt-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <p className="text-sm text-muted-foreground flex-1">
                        Define type-specific configuration fields that will appear in the offering dialog.
                      </p>
                      <Button type="button" variant="outline" size="sm" onClick={addTypeSpecificField} className="w-full sm:w-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Field
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {typeSpecificFields.map((field, index) => (
                        <Card key={index} className="p-4">
                          <div className="flex items-start justify-between mb-4">
                            <h4 className="font-semibold text-sm">Field {index + 1}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTypeSpecificField(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Field Name *</Label>
                              <Input
                                value={field.name}
                                onChange={(e) => updateTypeSpecificField(index, { name: e.target.value })}
                                placeholder="e.g., default_session_count"
                                disabled={field._isExisting === true} // 只有已存在的字段不能修改 name
                                className={field._isExisting === true ? "bg-muted cursor-not-allowed" : ""}
                              />
                              {field._isExisting === true && (
                                <p className="text-xs text-muted-foreground">
                                  ⚠️ Field name cannot be changed to maintain data consistency with existing offerings' type_config.
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label>Field Type *</Label>
                              <Select
                                value={field.type}
                                onValueChange={(value) => updateTypeSpecificField(index, { type: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="text">Text</SelectItem>
                                  <SelectItem value="number">Number</SelectItem>
                                  <SelectItem value="boolean">Boolean</SelectItem>
                                  <SelectItem value="select">Select</SelectItem>
                                  <SelectItem value="array">Array</SelectItem>
                                  <SelectItem value="time">Time</SelectItem>
                                  <SelectItem value="object">Object</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label>Label *</Label>
                              <Input
                                value={field.label}
                                onChange={(e) => updateTypeSpecificField(index, { label: e.target.value })}
                                placeholder="e.g., Default Session Count"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Placeholder</Label>
                              <Input
                                value={field.placeholder || ""}
                                onChange={(e) => updateTypeSpecificField(index, { placeholder: e.target.value })}
                                placeholder="e.g., 10"
                              />
                            </div>
                            {field.type === 'number' && (
                              <div className="space-y-2">
                                <Label>Step</Label>
                                <Input
                                  type="number"
                                  value={field.step || ""}
                                  onChange={(e) => updateTypeSpecificField(index, { step: parseFloat(e.target.value) || undefined })}
                                  placeholder="e.g., 0.5"
                                />
                              </div>
                            )}
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={field.required || false}
                                onCheckedChange={(checked) => updateTypeSpecificField(index, { required: checked as boolean })}
                              />
                              <Label>Required</Label>
                            </div>
                          </div>
                        </Card>
                      ))}
                      {typeSpecificFields.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No type-specific fields defined. Click "Add Field" to add one.
                        </p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="config_schema">Config Schema (JSON)</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // 格式化 JSON
                        try {
                          const parsed = JSON.parse(configSchemaText || "{}")
                          setConfigSchemaText(JSON.stringify(parsed, null, 2))
                          setConfigSchemaError(null)
                        } catch (error) {
                          toast.error("Cannot format invalid JSON")
                        }
                      }}
                    >
                      Format JSON
                    </Button>
                  </div>
                  <Textarea
                    id="config_schema"
                    value={configSchemaText}
                    onChange={(e) => handleConfigSchemaChange(e.target.value)}
                    placeholder='{"visible_fields": {...}, "type_specific_fields": [...]}'
                    rows={15}
                    className={`font-mono text-sm ${configSchemaError ? "border-destructive" : ""}`}
                  />
                  {configSchemaError && (
                    <p className="text-xs text-destructive">{configSchemaError}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Define which fields are visible and type-specific configuration fields. 
                    Use JSON format with <code className="bg-muted px-1 rounded">visible_fields</code>, <code className="bg-muted px-1 rounded">instance_fields</code>, and <code className="bg-muted px-1 rounded">type_specific_fields</code>.
                  </p>
                  <div className="text-xs text-muted-foreground space-y-1 mt-2 p-3 bg-muted/50 rounded-md">
                    <p className="font-semibold">JSON Structure:</p>
                    <pre className="text-xs overflow-x-auto">{`{
  "visible_fields": {
    "general": { ... },
    "education": { ... }
  },
  "instance_fields": {
    "age_min": { "visible": true, "required": false },
    "age_max": { "visible": true, "required": false },
    "target_grades": { "visible": true, "required": false },
    ...
  },
  "type_specific_fields": [ ... ]
}`}</pre>
                  </div>
                </div>
              )}
            </div>
            </div>

            <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={
                  isSubmitting || 
                  !formData.name || 
                  (!editingType?.is_bound_to_category && !formData.code)
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingType ? (
                  "Update Type"
                ) : (
                  "Create Type"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

