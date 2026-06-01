/**
 * Database helper functions for v2 tables (offerings_v2, franchises_v2, instance_v2)
 * Phase 2: API 更新 - 新表操作函数
 */

import { supabaseAdmin } from "@/lib/supabase"
import {getErrorMessage, type StringKeyRecord} from "@/lib/typed-error"

// ==================== Offerings V2 ====================

export interface OfferingV2 {
  id: string
  name: string
  slug: string | null
  description: string | null
  poster_url: string | null
  offering_type: string
  status: string
  type_config: Record<string, unknown>
  target_audience: string | null
  learning_outcomes: string | null
  prerequisites: string | null
  base_price: number | null
  currency: string
  legacy_offering_id: string | null
  created_at: string
  updated_at: string
}

/**
 * 获取单个 Offering V2（从 offerings_v2 表）
 */
export async function getOfferingV2(offeringId: string): Promise<OfferingV2 | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("offerings_v2")
      .select("*")
      .eq("id", offeringId)
      .single()

    if (error) {
      // PGRST116 = No rows returned
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      // 如果是网络错误或其他错误，提供更详细的错误信息
      console.error(`Error fetching offering v2 (id: ${offeringId}):`, {
        code: error.code,
        message: getErrorMessage(error),
        details: error.details,
        hint: error.hint
      })
      throw new Error(`Failed to fetch offering v2: ${getErrorMessage(error) || error.code || 'Unknown error'}`)
    }

    return data as OfferingV2
  } catch (err: unknown) {
    // 捕获非 Supabase 错误（如网络错误）
    if (err instanceof TypeError && getErrorMessage(err).includes('fetch')) {
      console.error(`Network error fetching offering v2 (id: ${offeringId}):`, err)
      throw new Error(`Network error: Unable to connect to database. Please check your connection and try again.`)
    }
    // 重新抛出其他错误
    throw err
  }
}

/**
 * 通过 legacy_offering_id 获取 Offering V2
 */
export async function getOfferingV2ByLegacyId(legacyOfferingId: string): Promise<OfferingV2 | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("offerings_v2")
      .select("*")
      .eq("legacy_offering_id", legacyOfferingId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      console.error(`Error fetching offering v2 by legacy id (${legacyOfferingId}):`, {
        code: error.code,
        message: getErrorMessage(error),
        details: error.details,
        hint: error.hint
      })
      throw new Error(`Failed to fetch offering v2 by legacy id: ${getErrorMessage(error) || error.code || 'Unknown error'}`)
    }

    return data as OfferingV2
  } catch (err: unknown) {
    // 捕获非 Supabase 错误（如网络错误）
    if (err instanceof TypeError && getErrorMessage(err).includes('fetch')) {
      console.error(`Network error fetching offering v2 by legacy id (${legacyOfferingId}):`, err)
      throw new Error(`Network error: Unable to connect to database. Please check your connection and try again.`)
    }
    // 重新抛出其他错误
    throw err
  }
}

/**
 * 获取所有可用的 Offerings V2（status = 'published'）
 * 如果提供了 categoryId，需要先获取 category.name，然后筛选 offerings_v2.offering_type = category.name
 * 如果提供了 offeringType，直接使用 offeringType 筛选（优先级更高）
 */
export async function getAvailableOfferingsV2(
  offeringType?: string,
  search?: string,
  categoryId?: string
): Promise<OfferingV2[]> {
  let query = supabaseAdmin
    .from("offerings_v2")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false })

  // 如果提供了 offeringType，直接使用它（优先级最高）
  if (offeringType) {
    query = query.eq("offering_type", offeringType)
  } else if (categoryId) {
    // 如果没有提供 offeringType 但提供了 categoryId，需要获取 category.name 来匹配 offering_type
    // 先获取 category 信息
    const { data: categoryData, error: categoryError } = await supabaseAdmin
      .from("course_categories")
      .select("name")
      .eq("id", categoryId)
      .single()

    if (categoryError) {
      throw new Error(`Failed to fetch category: ${categoryError.message}`)
    }

    if (categoryData && categoryData.name) {
      // 使用 category.name 来筛选 offering_type
      query = query.eq("offering_type", categoryData.name)
    }
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch available offerings v2: ${getErrorMessage(error)}`)
  }

  let offerings = (data || []) as OfferingV2[]

  // 如果提供了搜索参数，进行过滤
  if (search) {
    const searchLower = search.toLowerCase()
    offerings = offerings.filter(
      (offering) =>
        offering.name?.toLowerCase().includes(searchLower) ||
        offering.description?.toLowerCase().includes(searchLower) ||
        offering.slug?.toLowerCase().includes(searchLower)
    )
  }

  return offerings
}

// ==================== Franchises V2 ====================

export interface FranchiseV2 {
  id: string
  code: string
  name: string
  primary_domain: string | null
  timezone: string
  branding_config: Record<string, unknown> | null
  is_active: boolean
  cancellation_policy: string | null
  legacy_franchise_id: string | null
  created_at: string
  updated_at: string
}

/**
 * 获取单个 Franchise V2（从 franchises_v2 表）
 */
export async function getFranchiseV2(franchiseId: string): Promise<FranchiseV2 | null> {
  const { data, error } = await supabaseAdmin
    .from("franchises_v2")
    .select("*")
    .eq("id", franchiseId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to fetch franchise v2: ${getErrorMessage(error)}`)
  }

  return data as FranchiseV2
}

/**
 * 通过 legacy_franchise_id 获取 Franchise V2
 */
export async function getFranchiseV2ByLegacyId(legacyFranchiseId: string): Promise<FranchiseV2 | null> {
  const { data, error } = await supabaseAdmin
    .from("franchises_v2")
    .select("*")
    .eq("legacy_franchise_id", legacyFranchiseId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to fetch franchise v2 by legacy id: ${getErrorMessage(error)}`)
  }

  return data as FranchiseV2
}

/**
 * 通过 code 获取 Franchise V2
 */
export async function getFranchiseV2ByCode(code: string): Promise<FranchiseV2 | null> {
  const { data, error } = await supabaseAdmin
    .from("franchises_v2")
    .select("*")
    .eq("code", code)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to fetch franchise v2 by code: ${getErrorMessage(error)}`)
  }

  return data as FranchiseV2
}

/**
 * 更新 Franchise V2
 */
export async function updateFranchiseV2(
  franchiseId: string,
  updates: Partial<Omit<FranchiseV2, 'id' | 'created_at' | 'updated_at'>>
): Promise<FranchiseV2> {
  const { data, error } = await supabaseAdmin
    .from("franchises_v2")
    .update(updates)
    .eq("id", franchiseId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update franchise v2: ${getErrorMessage(error)}`)
  }

  return data as FranchiseV2
}

// ==================== Instances V2 ====================

export interface InstanceV2 {
  id: string
  offering_id: string
  series_id: string
  category_id: string | null
  franchise_id: string | null
  session_count: number | null
  duration_hours: number | null
  duration_days: number | null
  age_min: number | null
  age_max: number | null
  target_grades: string[] | null
  location_id: string | null
  start_date: string
  end_date: string
  start_time: string | null
  end_time: string | null
  days_of_week: number[] | null
  icalendar_rrule: string | null
  icalendar_exdates: string[] | null
  icalendar_rdates: string[] | null
  timezone: string
  max_students: number | null
  current_students: number
  price_override: number | null
  instructor_id: string | null
  instructor_name: string | null
  drop_in_available: boolean
  drop_in_price: number | null
  multipass_available: boolean
  denomination: number | null
  expiry_date: string | null
  caregiver_id: string | null
  caregiver_name: string | null
  meal_options: string[] | null
  status: string
  notes: string | null
  is_active: boolean
  legacy_instance_id: string | null
  legacy_assignment_id: string | null
  created_at: string
  updated_at: string
}

/**
 * 创建 Instance V2（写入 instance_v2 表）
 */
export async function createInstanceV2(
  instance: Omit<InstanceV2, 'id' | 'created_at' | 'updated_at'>
): Promise<InstanceV2> {
  // 自动生成 RRULE（如果提供了 days_of_week 且没有提供 icalendar_rrule）
  const { autoGenerateRRULE } = await import('./icalendar')
  
  let finalRRULE = instance.icalendar_rrule
  if (!finalRRULE && instance.days_of_week && instance.days_of_week.length > 0) {
    const generatedRRULE = autoGenerateRRULE({
      start_date: instance.start_date,
      end_date: instance.end_date,
      days_of_week: instance.days_of_week,
      start_time: instance.start_time,
      timezone: instance.timezone || 'America/Los_Angeles',
    } as any)
    finalRRULE = generatedRRULE || null
  }

  const instanceWithRRULE = {
    ...instance,
    icalendar_rrule: finalRRULE || null,
    timezone: instance.timezone || 'America/Los_Angeles',
    current_students: instance.current_students || 0,
    is_active: instance.is_active !== undefined ? instance.is_active : true,
    status: instance.status || 'scheduled',
  }

  const { data, error } = await supabaseAdmin
    .from("instance_v2")
    .insert(instanceWithRRULE)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create instance v2: ${getErrorMessage(error)}`)
  }

  return data as InstanceV2
}

/**
 * 获取 Instances V2（从 instance_v2 表）
 */
export async function getInstancesV2(filters: {
  seriesId?: string
  offeringId?: string
  franchiseId?: string
  categoryId?: string
  status?: string
}): Promise<Record<string, unknown>[]> {
  let query = supabaseAdmin
    .from("instance_v2")
    .select(`
      *,
      offering:offerings_v2(*),
      series:course_series(id, name, display_name, category_id, franchise_id),
      category:course_categories(id, name, display_name),
      franchise:franchises_v2(id, code, name, cancellation_policy),
      location:course_locations(id, name, address, city, state)
    `)
    .eq("is_active", true)
    .order("start_date", { ascending: true })
    .order("start_time", { ascending: true })

  if (filters.seriesId) {
    query = query.eq("series_id", filters.seriesId)
  }

  if (filters.offeringId) {
    query = query.eq("offering_id", filters.offeringId)
  }

  if (filters.franchiseId) {
    query = query.eq("franchise_id", filters.franchiseId)
  }

  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId)
  }

  if (filters.status) {
    query = query.eq("status", filters.status)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch instances v2: ${getErrorMessage(error)}`)
  }

  // 处理返回数据，确保关联数据格式正确
  return (data || []).map((instance) => {
    // 处理关联数据（Supabase 返回的格式可能是数组或对象）
    const offering = Array.isArray(instance.offering) ? instance.offering[0] : instance.offering
    const series = Array.isArray(instance.series) ? instance.series[0] : instance.series
    const category = Array.isArray(instance.category) ? instance.category[0] : instance.category
    const franchise = Array.isArray(instance.franchise) ? instance.franchise[0] : instance.franchise
    const location = Array.isArray(instance.location) ? instance.location[0] : instance.location

    return {
      ...instance,
      offering,
      series,
      category,
      franchise,
      location,
    }
  })
}

/**
 * 获取单个 Instance V2
 */
export async function getInstanceV2(instanceId: string): Promise<InstanceV2 | null> {
  const { data, error } = await supabaseAdmin
    .from("instance_v2")
    .select(`
      *,
      offering:offerings_v2(*),
      series:course_series(id, name, display_name, category_id, franchise_id),
      category:course_categories(id, name, display_name),
      franchise:franchises_v2(id, code, name, cancellation_policy),
      location:course_locations(id, name, address, city, state)
    `)
    .eq("id", instanceId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to fetch instance v2: ${getErrorMessage(error)}`)
  }

  return data as InstanceV2
}

/**
 * 更新 Instance V2（更新 instance_v2 表）
 */
export async function updateInstanceV2(
  instanceId: string,
  updates: Partial<Omit<InstanceV2, 'id' | 'created_at' | 'updated_at'>>
): Promise<InstanceV2> {
  // 如果更新了 days_of_week 或日期，重新生成 RRULE
  const { autoGenerateRRULE } = await import('./icalendar')
  
  let finalRRULE = updates.icalendar_rrule
  if (!finalRRULE && updates.days_of_week && updates.days_of_week.length > 0) {
    // 需要获取当前的 start_date 和 end_date（如果更新中没有提供）
    const currentInstance = await getInstanceV2(instanceId)
    if (currentInstance) {
      const startDate = updates.start_date || currentInstance.start_date
      const endDate = updates.end_date || currentInstance.end_date
      const startTime = updates.start_time || currentInstance.start_time
      const timezone = updates.timezone || currentInstance.timezone || 'America/Los_Angeles'
      
      const generatedRRULE = autoGenerateRRULE({
        start_date: startDate,
        end_date: endDate,
        days_of_week: updates.days_of_week,
        start_time: startTime,
        timezone,
      } as any)
      finalRRULE = generatedRRULE || null
    }
  }

  const updateData: StringKeyRecord = {
    ...updates,
  }

  // 如果生成了新的 RRULE，添加到更新数据中
  if (finalRRULE !== undefined) {
    updateData.icalendar_rrule = finalRRULE
  }

  // 确保 timezone 有默认值
  if (updateData.timezone === undefined) {
    const currentInstance = await getInstanceV2(instanceId)
    if (currentInstance) {
      updateData.timezone = currentInstance.timezone || 'America/Los_Angeles'
    } else {
      updateData.timezone = 'America/Los_Angeles'
    }
  }

  const { data, error } = await supabaseAdmin
    .from("instance_v2")
    .update(updateData)
    .eq("id", instanceId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update instance v2: ${getErrorMessage(error)}`)
  }

  return data as InstanceV2
}

/**
 * 删除 Instance V2（软删除：设置 is_active = false）
 */
export async function deleteInstanceV2(instanceId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("instance_v2")
    .update({ is_active: false })
    .eq("id", instanceId)

  if (error) {
    throw new Error(`Failed to delete instance v2: ${getErrorMessage(error)}`)
  }
}

// ==================== 验证函数 ====================

/**
 * 验证 Offering 状态（必须是 published）
 */
export async function validateOfferingStatus(offeringId: string): Promise<void> {
  try {
    // 首先尝试直接查询新表
    let offering = await getOfferingV2(offeringId)
    
    // 如果找不到，尝试作为旧表的 ID 查询
    if (!offering) {
      offering = await getOfferingV2ByLegacyId(offeringId)
      if (offering) {
        console.warn(`Offering found by legacy_id (${offeringId}), but should use new id (${offering.id})`)
      }
    }
    
    if (!offering) {
      throw new Error(`Offering not found (id: ${offeringId}). Please ensure the offering exists in offerings_v2 table.`)
    }
    
    if (offering.status !== 'published') {
      throw new Error(
        `Cannot create instance for offering with status '${offering.status}'. Only 'published' offerings can have instances.`
      )
    }
  } catch (err: unknown) {
    // 如果错误信息已经包含详细信息，直接抛出
    if (getErrorMessage(err) && (getErrorMessage(err).includes('Offering not found') || getErrorMessage(err).includes('Network error'))) {
      throw err
    }
    // 否则包装错误
    throw new Error(`Failed to validate offering status: ${getErrorMessage(err) || err}`)
  }
}

/**
 * 验证 Instance 数据（根据 Offering Type 动态验证）
 */
export async function validateInstanceData(
  offeringId: string,
  instanceData: Partial<InstanceV2>
): Promise<string[]> {
  const errors: string[] = []
  
  // 获取 Offering 和其类型配置
  const offering = await getOfferingV2(offeringId)
  if (!offering) {
    errors.push('Offering not found')
    return errors
  }

  // 获取 offering_type 配置
  const { data: offeringType } = await supabaseAdmin
    .from("offering_types")
    .select("config_schema")
    .eq("code", offering.offering_type)
    .single()

  const instanceFieldsConfig = offeringType?.config_schema?.instance_fields || {}

  // 通用验证
  if (!instanceData.start_date) errors.push('Start date is required')
  if (!instanceData.end_date) errors.push('End date is required')
  if (!instanceData.series_id) errors.push('Series ID is required')

  // 根据配置验证字段
  for (const [fieldName, config] of Object.entries(instanceFieldsConfig)) {
    const fieldConfig = config as { visible?: boolean; required?: boolean }
    if (fieldConfig.required && !instanceData[fieldName as keyof InstanceV2]) {
      errors.push(`${fieldName} is required for ${offering.offering_type} type`)
    }
  }

  // 类型特定的验证逻辑（如果配置中没有，使用默认规则）
  if (offering.offering_type === 'course') {
    if (!instanceData.session_count && !instanceFieldsConfig.session_count) {
      errors.push('Session count is required for courses')
    }
    if (!instanceData.duration_hours && !instanceFieldsConfig.duration_hours) {
      errors.push('Duration hours is required for courses')
    }
    if (!instanceData.start_time && !instanceFieldsConfig.start_time) {
      errors.push('Start time is required for courses')
    }
    if (!instanceData.end_time && !instanceFieldsConfig.end_time) {
      errors.push('End time is required for courses')
    }
    if ((!instanceData.days_of_week || instanceData.days_of_week.length === 0) && !instanceFieldsConfig.days_of_week) {
      errors.push('Days of week is required for courses')
    }
    if (!instanceData.location_id && !instanceFieldsConfig.location_id) {
      errors.push('Location is required for courses')
    }
    if (!instanceData.max_students && !instanceFieldsConfig.max_students) {
      errors.push('Max students is required for courses')
    }
  } else if (offering.offering_type === 'camp') {
    if (!instanceData.duration_days && !instanceFieldsConfig.duration_days) {
      errors.push('Duration days is required for camps')
    }
    if (!instanceData.start_time && !instanceFieldsConfig.start_time) {
      errors.push('Start time is required for camps')
    }
    if (!instanceData.end_time && !instanceFieldsConfig.end_time) {
      errors.push('End time is required for camps')
    }
    if (!instanceData.location_id && !instanceFieldsConfig.location_id) {
      errors.push('Location is required for camps')
    }
    if (!instanceData.max_students && !instanceFieldsConfig.max_students) {
      errors.push('Max students is required for camps')
    }
  } else if (offering.offering_type === 'workshop') {
    if (!instanceData.duration_hours && !instanceFieldsConfig.duration_hours) {
      errors.push('Duration hours is required for workshops')
    }
    if (!instanceData.start_time && !instanceFieldsConfig.start_time) {
      errors.push('Start time is required for workshops')
    }
    if (!instanceData.end_time && !instanceFieldsConfig.end_time) {
      errors.push('End time is required for workshops')
    }
    if ((!instanceData.days_of_week || instanceData.days_of_week.length === 0) && !instanceFieldsConfig.days_of_week) {
      errors.push('Days of week is required for workshops')
    }
    if (!instanceData.location_id && !instanceFieldsConfig.location_id) {
      errors.push('Location is required for workshops')
    }
    if (!instanceData.max_students && !instanceFieldsConfig.max_students) {
      errors.push('Max students is required for workshops')
    }
  } else if (offering.offering_type === 'gift_card') {
    if (!instanceData.denomination && !instanceFieldsConfig.denomination) {
      errors.push('Denomination is required for gift cards')
    }
    if (!instanceData.expiry_date && !instanceFieldsConfig.expiry_date) {
      errors.push('Expiry date is required for gift cards')
    }
  } else if (offering.offering_type === 'care_service') {
    if (!instanceData.duration_hours && !instanceFieldsConfig.duration_hours) {
      errors.push('Duration hours is required for care services')
    }
    if (!instanceData.start_time && !instanceFieldsConfig.start_time) {
      errors.push('Start time is required for care services')
    }
    if (!instanceData.end_time && !instanceFieldsConfig.end_time) {
      errors.push('End time is required for care services')
    }
    if ((!instanceData.days_of_week || instanceData.days_of_week.length === 0) && !instanceFieldsConfig.days_of_week) {
      errors.push('Days of week is required for care services')
    }
    if (!instanceData.location_id && !instanceFieldsConfig.location_id) {
      errors.push('Location is required for care services')
    }
    if (!instanceData.max_students && !instanceFieldsConfig.max_students) {
      errors.push('Max students is required for care services')
    }
  } else if (offering.offering_type === 'lunch_service') {
    if (!instanceData.start_time && !instanceFieldsConfig.start_time) {
      errors.push('Start time is required for lunch services')
    }
    if (!instanceData.end_time && !instanceFieldsConfig.end_time) {
      errors.push('End time is required for lunch services')
    }
    if ((!instanceData.days_of_week || instanceData.days_of_week.length === 0) && !instanceFieldsConfig.days_of_week) {
      errors.push('Days of week is required for lunch services')
    }
    if (!instanceData.location_id && !instanceFieldsConfig.location_id) {
      errors.push('Location is required for lunch services')
    }
    if (!instanceData.max_students && !instanceFieldsConfig.max_students) {
      errors.push('Max students is required for lunch services')
    }
    if ((!instanceData.meal_options || instanceData.meal_options.length === 0) && !instanceFieldsConfig.meal_options) {
      errors.push('Meal options are required for lunch services')
    }
  }

  return errors
}
