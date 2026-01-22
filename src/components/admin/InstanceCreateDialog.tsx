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
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Loader2, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react"
import Image from "next/image"
import { OfferingV2, InstanceV2 } from "@/lib/db-v2"

interface InstanceCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  seriesId: string
  categoryId?: string // Optional: if provided, will be used directly instead of fetching from series
  onSuccess?: () => void
}

type Step = 'select-offering' | 'fill-details' | 'confirm'

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

interface Location {
  id: string
  name: string
  address?: string
  city?: string
  state?: string
}

interface OfferingType {
  code: string
  name: string
  config_schema?: {
    instance_fields?: Record<string, { visible?: boolean; required?: boolean }>
  }
}

export function InstanceCreateDialog({
  open,
  onOpenChange,
  seriesId,
  categoryId,
  onSuccess,
}: InstanceCreateDialogProps) {
  const [step, setStep] = useState<Step>('select-offering')
  const [selectedOffering, setSelectedOffering] = useState<OfferingV2 | null>(null)
  const [offeringTypeConfig, setOfferingTypeConfig] = useState<OfferingType | null>(null)
  const [offerings, setOfferings] = useState<OfferingV2[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [offeringTypes, setOfferingTypes] = useState<OfferingType[]>([])
  const [isLoadingOfferings, setIsLoadingOfferings] = useState(false)
  const [isLoadingLocations, setIsLoadingLocations] = useState(false)
  const [isLoadingConfig, setIsLoadingConfig] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedOfferingType, setSelectedOfferingType] = useState<string>("all")
  const [errors, setErrors] = useState<string[]>([])
  const [categoryOfferingTypeCode, setCategoryOfferingTypeCode] = useState<string | null>(null)

  // Form data
  const [formData, setFormData] = useState<Partial<InstanceV2>>({
    series_id: seriesId,
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: "",
    days_of_week: [],
    location_id: "",
    session_count: null,
    duration_hours: null,
    duration_days: null,
    age_min: null,
    age_max: null,
    target_grades: [],
    max_students: null,
    current_students: 0,
    price_override: null,
    instructor_id: "",
    instructor_name: "",
    drop_in_available: false,
    drop_in_price: null,
    multipass_available: false,
    denomination: null,
    expiry_date: "",
    caregiver_id: "",
    caregiver_name: "",
    meal_options: [],
    timezone: "America/Los_Angeles",
    status: "scheduled",
    notes: "",
    is_active: true,
  })

  // Fetch series info to get category_id when dialog opens
  useEffect(() => {
    if (open && seriesId) {
      fetchSeriesInfo()
    }
  }, [open, seriesId, categoryId])

  // Fetch offerings when dialog opens or category offering type changes
  useEffect(() => {
    if (open) {
      fetchLocations()
      fetchOfferingTypes()
      // Reset state
      setStep('select-offering')
      setSelectedOffering(null)
      setOfferingTypeConfig(null)
      setSearchQuery("")
      setSelectedOfferingType("all")
      setErrors([])
    }
  }, [open])

  // Fetch offerings when category offering type is determined
  useEffect(() => {
    if (open) {
      fetchOfferings()
    }
  }, [open, categoryOfferingTypeCode, categoryId, searchQuery, selectedOfferingType])

  // Fetch offering type config when offering is selected
  useEffect(() => {
    if (selectedOffering && offeringTypes.length > 0) {
      const type = offeringTypes.find(t => t.code === selectedOffering.offering_type)
      setOfferingTypeConfig(type || null)
    }
  }, [selectedOffering, offeringTypes])

  const fetchOfferings = async () => {
    setIsLoadingOfferings(true)
    try {
      const params = new URLSearchParams()
      
      // 优先使用 category 对应的 offering type code 来筛选
      // 如果用户选择了其他类型，则使用用户选择的类型
      const offeringTypeToFilter = selectedOfferingType !== "all" 
        ? selectedOfferingType 
        : categoryOfferingTypeCode || undefined
      
      if (offeringTypeToFilter) {
        params.set("offeringType", offeringTypeToFilter)
        console.log(`[InstanceCreateDialog] Filtering offerings by type: ${offeringTypeToFilter}`)
      }
      
      if (searchQuery) {
        params.set("search", searchQuery)
      }
      
      // Pass categoryId to API for server-side filtering
      if (categoryId) {
        params.set("categoryId", categoryId)
      }
      
      const response = await fetch(`/api/admin/offerings/v2/available?${params.toString()}`)
      if (!response.ok) {
        throw new Error("Failed to fetch offerings")
      }
      const data = await response.json()
      setOfferings(data || [])
      console.log(`[InstanceCreateDialog] Fetched ${data?.length || 0} offerings`)
    } catch (error) {
      console.error("Error fetching offerings:", error)
      setOfferings([])
    } finally {
      setIsLoadingOfferings(false)
    }
  }

  const fetchLocations = async () => {
    setIsLoadingLocations(true)
    try {
      const response = await fetch("/api/admin/locations")
      if (!response.ok) {
        throw new Error("Failed to fetch locations")
      }
      const data = await response.json()
      setLocations(data || [])
    } catch (error) {
      console.error("Error fetching locations:", error)
      setLocations([])
    } finally {
      setIsLoadingLocations(false)
    }
  }

  const fetchOfferingTypes = async () => {
    setIsLoadingConfig(true)
    try {
      const response = await fetch("/api/admin/offering-types")
      if (!response.ok) {
        throw new Error("Failed to fetch offering types")
      }
      const data = await response.json()
      setOfferingTypes(data || [])
    } catch (error) {
      console.error("Error fetching offering types:", error)
      setOfferingTypes([])
    } finally {
      setIsLoadingConfig(false)
    }
  }

  // Fetch series info to get category and corresponding offering type
  const fetchSeriesInfo = async () => {
    try {
      // If categoryId is provided directly, use it; otherwise fetch from series
      let categoryIdToUse = categoryId
      
      if (!categoryIdToUse) {
        const response = await fetch(`/api/admin/series/${seriesId}`)
        if (!response.ok) {
          throw new Error("Failed to fetch series info")
        }
        const seriesData = await response.json()
        categoryIdToUse = seriesData.category_id
      }
      
      if (categoryIdToUse) {
        // Fetch offering type that is bound to this category
        const offeringTypeResponse = await fetch(`/api/admin/offering-types?categoryId=${categoryIdToUse}`)
        if (offeringTypeResponse.ok) {
          const offeringTypesData = await offeringTypeResponse.json()
          
          // API 已经筛选了绑定到该 category 的 offering types
          if (offeringTypesData && offeringTypesData.length > 0) {
            const boundOfferingType = offeringTypesData[0]  // 应该只有一个
            setCategoryOfferingTypeCode(boundOfferingType.code)
            console.log(`[InstanceCreateDialog] Found bound offering type: ${boundOfferingType.code} for category: ${categoryIdToUse}`)
          } else {
            // 如果没有找到绑定的 offering type，尝试通过 category name 匹配
            const categoryResponse = await fetch(`/api/admin/categories/${categoryIdToUse}`)
            if (categoryResponse.ok) {
              const categoryData = await categoryResponse.json()
              // 获取所有 offering types，查找 code 匹配 category name 的
              const allOfferingTypesResponse = await fetch(`/api/admin/offering-types`)
              if (allOfferingTypesResponse.ok) {
                const allOfferingTypes = await allOfferingTypesResponse.json()
                const matchingOfferingType = allOfferingTypes.find((ot: any) => 
                  ot.code === categoryData.name
                )
                if (matchingOfferingType) {
                  setCategoryOfferingTypeCode(matchingOfferingType.code)
                  console.log(`[InstanceCreateDialog] Found matching offering type by category name: ${matchingOfferingType.code}`)
                } else {
                  console.warn(`[InstanceCreateDialog] No offering type found for category: ${categoryData.name}`)
                  setCategoryOfferingTypeCode(null)
                }
              } else {
                setCategoryOfferingTypeCode(null)
              }
            } else {
              setCategoryOfferingTypeCode(null)
            }
          }
        } else {
          setCategoryOfferingTypeCode(null)
        }
      } else {
        console.warn(`[InstanceCreateDialog] Series ${seriesId} has no category_id and categoryId prop not provided`)
        setCategoryOfferingTypeCode(null)
      }
    } catch (error) {
      console.error("Error fetching series info:", error)
      setCategoryOfferingTypeCode(null)
    }
  }

  // Filter offerings based on search and type
  useEffect(() => {
    fetchOfferings()
  }, [searchQuery, selectedOfferingType, categoryOfferingTypeCode])

  const handleSelectOffering = (offering: OfferingV2) => {
    setSelectedOffering(offering)
    setFormData(prev => ({
      ...prev,
      offering_id: offering.id,
    }))
    setStep('fill-details')
  }

  const handleNext = () => {
    if (step === 'select-offering') {
      if (!selectedOffering) {
        setErrors(['Please select an offering'])
        return
      }
      setStep('fill-details')
    } else if (step === 'fill-details') {
      // Validate form data
      const validationErrors = validateFormData()
      if (validationErrors.length > 0) {
        setErrors(validationErrors)
        return
      }
      setErrors([])
      setStep('confirm')
    }
  }

  const handleBack = () => {
    if (step === 'fill-details') {
      setStep('select-offering')
    } else if (step === 'confirm') {
      setStep('fill-details')
    }
  }

  const validateFormData = (): string[] => {
    const errors: string[] = []
    
    if (!formData.start_date) errors.push('Start date is required')
    if (!formData.end_date) errors.push('End date is required')
    
    // Get field config from offering type
    const instanceFieldsConfig = offeringTypeConfig?.config_schema?.instance_fields || {}
    
    // Validate required fields based on config
    for (const [fieldName, config] of Object.entries(instanceFieldsConfig)) {
      const fieldConfig = config as { visible?: boolean; required?: boolean }
      if (fieldConfig.required) {
        const value = formData[fieldName as keyof InstanceV2]
        if (value === null || value === undefined || value === "" || 
            (Array.isArray(value) && value.length === 0)) {
          errors.push(`${fieldName} is required`)
        }
      }
    }
    
    // Type-specific validation (fallback if config doesn't exist)
    if (!offeringTypeConfig || !offeringTypeConfig.config_schema?.instance_fields) {
      if (selectedOffering?.offering_type === 'course') {
        if (!formData.session_count) errors.push('Session count is required for courses')
        if (!formData.duration_hours) errors.push('Duration hours is required for courses')
        if (!formData.start_time) errors.push('Start time is required for courses')
        if (!formData.end_time) errors.push('End time is required for courses')
        if (!formData.days_of_week || formData.days_of_week.length === 0) {
          errors.push('Days of week is required for courses')
        }
        if (!formData.location_id) errors.push('Location is required for courses')
        if (!formData.max_students) errors.push('Max students is required for courses')
      } else if (selectedOffering?.offering_type === 'camp') {
        if (!formData.duration_days) errors.push('Duration days is required for camps')
        if (!formData.start_time) errors.push('Start time is required for camps')
        if (!formData.end_time) errors.push('End time is required for camps')
        if (!formData.location_id) errors.push('Location is required for camps')
        if (!formData.max_students) errors.push('Max students is required for camps')
      } else if (selectedOffering?.offering_type === 'gift_card') {
        if (!formData.denomination) errors.push('Denomination is required for gift cards')
        if (!formData.expiry_date) errors.push('Expiry date is required for gift cards')
      }
    }
    
    return errors
  }

  const handleSubmit = async () => {
    const validationErrors = validateFormData()
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      setStep('fill-details')
      return
    }

    setIsSubmitting(true)
    setErrors([])

    try {
      const response = await fetch("/api/admin/instances/v2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          offering_id: selectedOffering?.id,
          series_id: seriesId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create instance")
      }

      const instance = await response.json()
      
      // Success
      onSuccess?.()
      onOpenChange(false)
      
      // Reset form
      setStep('select-offering')
      setSelectedOffering(null)
      setFormData({
        series_id: seriesId,
        start_date: "",
        end_date: "",
        start_time: "",
        end_time: "",
        days_of_week: [],
        location_id: "",
        session_count: null,
        duration_hours: null,
        duration_days: null,
        age_min: null,
        age_max: null,
        target_grades: [],
        max_students: null,
        current_students: 0,
        price_override: null,
        instructor_id: "",
        instructor_name: "",
        drop_in_available: false,
        drop_in_price: null,
        multipass_available: false,
        denomination: null,
        expiry_date: "",
        caregiver_id: "",
        caregiver_name: "",
        meal_options: [],
        timezone: "America/Los_Angeles",
        status: "scheduled",
        notes: "",
        is_active: true,
      })
    } catch (error: any) {
      console.error("Error creating instance:", error)
      setErrors([error.message || "Failed to create instance"])
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFieldVisible = (fieldName: string): boolean => {
    if (!offeringTypeConfig?.config_schema?.instance_fields) {
      return true // Default to visible if no config
    }
    const fieldConfig = offeringTypeConfig.config_schema.instance_fields[fieldName]
    return fieldConfig?.visible !== false
  }

  const isFieldRequired = (fieldName: string): boolean => {
    if (!offeringTypeConfig?.config_schema?.instance_fields) {
      return false // Default to not required if no config
    }
    const fieldConfig = offeringTypeConfig.config_schema.instance_fields[fieldName]
    return fieldConfig?.required === true
  }

  // Filter offerings: 
  // - If user selected a specific type, filter by that type
  // - Otherwise, offerings are already filtered by category's offering type from API
  // - Apply search query filter
  const filteredOfferings = offerings.filter(offering => {
    // If user selected a specific offering type, filter by that
    if (selectedOfferingType !== "all" && offering.offering_type !== selectedOfferingType) {
      return false
    }
    // If user selected "all" but we have a category offering type, 
    // offerings should already be filtered by API, so we just apply search
    // (This is handled in fetchOfferings by passing categoryOfferingTypeCode)
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        offering.name?.toLowerCase().includes(query) ||
        offering.description?.toLowerCase().includes(query) ||
        offering.slug?.toLowerCase().includes(query)
      )
    }
    return true
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[800px] lg:max-w-[1000px] max-h-[95vh] h-[95vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Create New Instance</DialogTitle>
          <DialogDescription>
            {step === 'select-offering' && 'Select an offering to create an instance'}
            {step === 'fill-details' && 'Fill in the instance details'}
            {step === 'confirm' && 'Review and confirm the instance details'}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-4 flex-shrink-0">
          <div className={`flex items-center gap-2 ${step === 'select-offering' ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'select-offering' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              1
            </div>
            <span className="text-sm font-medium">Select Offering</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div className={`flex items-center gap-2 ${step === 'fill-details' ? 'text-primary' : step === 'confirm' ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'fill-details' ? 'bg-primary text-primary-foreground' : step === 'confirm' ? 'bg-muted' : 'bg-muted'}`}>
              2
            </div>
            <span className="text-sm font-medium">Fill Details</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div className={`flex items-center gap-2 ${step === 'confirm' ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'confirm' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              3
            </div>
            <span className="text-sm font-medium">Confirm</span>
          </div>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex-shrink-0">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-destructive mb-1">Please fix the following errors:</p>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, index) => (
                    <li key={index} className="text-sm text-destructive">{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {step === 'select-offering' && (
            <div className="space-y-4">
              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search offerings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedOfferingType} onValueChange={setSelectedOfferingType}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {offeringTypes.map((type) => (
                      <SelectItem key={type.code} value={type.code}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Offerings List */}
              {isLoadingOfferings ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredOfferings.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No offerings found
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredOfferings.map((offering) => (
                    <Card
                      key={offering.id}
                      className={`cursor-pointer transition-colors hover:border-primary ${
                        selectedOffering?.id === offering.id ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => handleSelectOffering(offering)}
                    >
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          {offering.poster_url && (
                            <div className="relative w-24 h-24 rounded-lg overflow-hidden shrink-0">
                              <Image
                                src={offering.poster_url}
                                alt={offering.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-lg mb-1">{offering.name}</h3>
                                {offering.description && (
                                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                    {offering.description}
                                  </p>
                                )}
                              </div>
                              {selectedOffering?.id === offering.id && (
                                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline">{offering.offering_type}</Badge>
                              {offering.base_price && (
                                <Badge variant="secondary">
                                  ${offering.base_price.toFixed(2)}
                                </Badge>
                              )}
                              <Badge variant={offering.status === 'published' ? 'default' : 'secondary'}>
                                {offering.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'fill-details' && selectedOffering && (
            <div className="space-y-6">
              {/* Selected Offering Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Selected Offering</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    {selectedOffering.poster_url && (
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0">
                        <Image
                          src={selectedOffering.poster_url}
                          alt={selectedOffering.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold">{selectedOffering.name}</h3>
                      <p className="text-sm text-muted-foreground">{selectedOffering.offering_type}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Form Fields */}
              <div className="space-y-4">
                {/* Common Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">
                      Start Date {isFieldRequired('start_date') && '*'}
                    </Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date || ""}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required={isFieldRequired('start_date')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date">
                      End Date {isFieldRequired('end_date') && '*'}
                    </Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date || ""}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      required={isFieldRequired('end_date')}
                    />
                  </div>
                </div>

                {/* Location */}
                {isFieldVisible('location_id') && (
                  <div className="space-y-2">
                    <Label htmlFor="location_id">
                      Location {isFieldRequired('location_id') && '*'}
                    </Label>
                    <Select
                      value={formData.location_id || ""}
                      onValueChange={(value) => setFormData({ ...formData, location_id: value })}
                      required={isFieldRequired('location_id')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
                            {location.city && `, ${location.city}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Max Students */}
                {isFieldVisible('max_students') && (
                  <div className="space-y-2">
                    <Label htmlFor="max_students">
                      Max Students {isFieldRequired('max_students') && '*'}
                    </Label>
                    <Input
                      id="max_students"
                      type="number"
                      min="1"
                      value={formData.max_students || ""}
                      onChange={(e) => setFormData({ ...formData, max_students: parseInt(e.target.value) || null })}
                      required={isFieldRequired('max_students')}
                    />
                  </div>
                )}

                {/* Course-specific fields */}
                {selectedOffering.offering_type === 'course' && (
                  <>
                    {isFieldVisible('session_count') && (
                      <div className="space-y-2">
                        <Label htmlFor="session_count">
                          Session Count {isFieldRequired('session_count') && '*'}
                        </Label>
                        <Input
                          id="session_count"
                          type="number"
                          min="1"
                          value={formData.session_count || ""}
                          onChange={(e) => setFormData({ ...formData, session_count: parseInt(e.target.value) || null })}
                          required={isFieldRequired('session_count')}
                        />
                      </div>
                    )}
                    {isFieldVisible('duration_hours') && (
                      <div className="space-y-2">
                        <Label htmlFor="duration_hours">
                          Duration Hours {isFieldRequired('duration_hours') && '*'}
                        </Label>
                        <Input
                          id="duration_hours"
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={formData.duration_hours || ""}
                          onChange={(e) => setFormData({ ...formData, duration_hours: parseFloat(e.target.value) || null })}
                          required={isFieldRequired('duration_hours')}
                        />
                      </div>
                    )}
                    {isFieldVisible('start_time') && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="start_time">
                            Start Time {isFieldRequired('start_time') && '*'}
                          </Label>
                          <Input
                            id="start_time"
                            type="time"
                            value={formData.start_time || ""}
                            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                            required={isFieldRequired('start_time')}
                          />
                        </div>
                        {isFieldVisible('end_time') && (
                          <div className="space-y-2">
                            <Label htmlFor="end_time">
                              End Time {isFieldRequired('end_time') && '*'}
                            </Label>
                            <Input
                              id="end_time"
                              type="time"
                              value={formData.end_time || ""}
                              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                              required={isFieldRequired('end_time')}
                            />
                          </div>
                        )}
                      </div>
                    )}
                    {isFieldVisible('days_of_week') && (
                      <div className="space-y-2">
                        <Label>
                          Days of Week {isFieldRequired('days_of_week') && '*'}
                        </Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {DAYS_OF_WEEK.map((day) => (
                            <div key={day.value} className="flex items-center space-x-2">
                              <Checkbox
                                id={`day-${day.value}`}
                                checked={(formData.days_of_week || []).includes(day.value)}
                                onCheckedChange={(checked) => {
                                  const currentDays = formData.days_of_week || []
                                  if (checked) {
                                    setFormData({ ...formData, days_of_week: [...currentDays, day.value] })
                                  } else {
                                    setFormData({ ...formData, days_of_week: currentDays.filter(d => d !== day.value) })
                                  }
                                }}
                              />
                              <Label htmlFor={`day-${day.value}`} className="font-normal cursor-pointer">
                                {day.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Camp-specific fields */}
                {selectedOffering.offering_type === 'camp' && (
                  <>
                    {isFieldVisible('duration_days') && (
                      <div className="space-y-2">
                        <Label htmlFor="duration_days">
                          Duration Days {isFieldRequired('duration_days') && '*'}
                        </Label>
                        <Input
                          id="duration_days"
                          type="number"
                          min="1"
                          value={formData.duration_days || ""}
                          onChange={(e) => setFormData({ ...formData, duration_days: parseInt(e.target.value) || null })}
                          required={isFieldRequired('duration_days')}
                        />
                      </div>
                    )}
                    {isFieldVisible('start_time') && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="start_time">
                            Start Time {isFieldRequired('start_time') && '*'}
                          </Label>
                          <Input
                            id="start_time"
                            type="time"
                            value={formData.start_time || ""}
                            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                            required={isFieldRequired('start_time')}
                          />
                        </div>
                        {isFieldVisible('end_time') && (
                          <div className="space-y-2">
                            <Label htmlFor="end_time">
                              End Time {isFieldRequired('end_time') && '*'}
                            </Label>
                            <Input
                              id="end_time"
                              type="time"
                              value={formData.end_time || ""}
                              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                              required={isFieldRequired('end_time')}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Gift Card-specific fields */}
                {selectedOffering.offering_type === 'gift_card' && (
                  <>
                    {isFieldVisible('denomination') && (
                      <div className="space-y-2">
                        <Label htmlFor="denomination">
                          Denomination {isFieldRequired('denomination') && '*'}
                        </Label>
                        <Input
                          id="denomination"
                          type="number"
                          min="1"
                          value={formData.denomination || ""}
                          onChange={(e) => setFormData({ ...formData, denomination: parseFloat(e.target.value) || null })}
                          required={isFieldRequired('denomination')}
                        />
                      </div>
                    )}
                    {isFieldVisible('expiry_date') && (
                      <div className="space-y-2">
                        <Label htmlFor="expiry_date">
                          Expiry Date {isFieldRequired('expiry_date') && '*'}
                        </Label>
                        <Input
                          id="expiry_date"
                          type="date"
                          value={formData.expiry_date || ""}
                          onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                          required={isFieldRequired('expiry_date')}
                        />
                      </div>
                    )}
                  </>
                )}

                {/* Price Override */}
                {isFieldVisible('price_override') && (
                  <div className="space-y-2">
                    <Label htmlFor="price_override">
                      Price Override {isFieldRequired('price_override') && '*'}
                    </Label>
                    <Input
                      id="price_override"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price_override || ""}
                      onChange={(e) => setFormData({ ...formData, price_override: parseFloat(e.target.value) || null })}
                      placeholder={`Default: $${selectedOffering.base_price?.toFixed(2) || '0.00'}`}
                    />
                  </div>
                )}

                {/* Notes */}
                {isFieldVisible('notes') && (
                  <div className="space-y-2">
                    <Label htmlFor="notes">
                      Notes {isFieldRequired('notes') && '*'}
                    </Label>
                    <Textarea
                      id="notes"
                      value={formData.notes || ""}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      placeholder="Additional notes about this instance..."
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'confirm' && selectedOffering && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Instance Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Offering</h3>
                    <p className="text-sm text-muted-foreground">{selectedOffering.name}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Dates</h3>
                    <p className="text-sm text-muted-foreground">
                      {formData.start_date} to {formData.end_date}
                    </p>
                  </div>
                  {formData.location_id && (
                    <div>
                      <h3 className="font-semibold mb-2">Location</h3>
                      <p className="text-sm text-muted-foreground">
                        {locations.find(l => l.id === formData.location_id)?.name}
                      </p>
                    </div>
                  )}
                  {formData.max_students && (
                    <div>
                      <h3 className="font-semibold mb-2">Max Students</h3>
                      <p className="text-sm text-muted-foreground">{formData.max_students}</p>
                    </div>
                  )}
                  {formData.price_override && (
                    <div>
                      <h3 className="font-semibold mb-2">Price Override</h3>
                      <p className="text-sm text-muted-foreground">${formData.price_override.toFixed(2)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
          <div className="flex items-center justify-between w-full">
            <Button
              type="button"
              variant="outline"
              onClick={step === 'select-offering' ? () => onOpenChange(false) : handleBack}
              disabled={isSubmitting}
            >
              {step === 'select-offering' ? 'Cancel' : (
                <>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </>
              )}
            </Button>
            <div className="flex gap-2">
              {step !== 'confirm' && (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={isSubmitting || (step === 'select-offering' && !selectedOffering)}
                >
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              )}
              {step === 'confirm' && (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Create Instance
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
