import { NextResponse } from "next/server"
import {getErrorMessage, type StringKeyRecord} from "@/lib/typed-error"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import type { SchemaFieldConfig } from "@/lib/instance-schema"
import {
  adminOfferingExistingSelect,
  adminOfferingTypeSchemaSelect,
  catalogFrom,
  catalogSelect,
  catalogTables,
  isCatalogV3,
} from "@/lib/catalog-db"

/** Flatten nested type_config_data for v2_offering table columns. */
function flattenTypeConfigDataForTable(config: Record<string, unknown> | null | undefined): {
  base_price?: number | null
  currency?: string | null
  description?: string | null
  target_audience?: string | null
  learning_outcomes?: string | null
  prerequisites?: string | null
} {
  if (!config || typeof config !== 'object') return {}
  const p = config.pricing as Record<string, unknown> | undefined
  const c = config.content as Record<string, unknown> | undefined
  return {
    base_price: (p?.base_price != null ? Number(p.base_price) : config.base_price != null ? Number(config.base_price) : null) ?? undefined,
    currency: (p?.currency != null ? String(p.currency) : config.currency != null ? String(config.currency) : null) ?? undefined,
    description: (c?.description != null ? String(c.description) : config.description != null ? String(config.description) : null) ?? undefined,
    target_audience: (c?.target_audience != null ? String(c.target_audience) : config.target_audience != null ? String(config.target_audience) : null) ?? undefined,
    learning_outcomes: (c?.learning_outcomes != null ? String(c.learning_outcomes) : config.learning_outcomes != null ? String(config.learning_outcomes) : null) ?? undefined,
    prerequisites: (c?.prerequisites != null ? String(c.prerequisites) : config.prerequisites != null ? String(config.prerequisites) : null) ?? undefined,
  }
}

// 获取单个 offering (使用 v2_offering 表)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await catalogFrom("offering")
      .select(catalogSelect.offeringWithRelations())
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Offering not found" }, { status: 404 })
      }
      return NextResponse.json(
        { error: getErrorMessage(error) || "Failed to fetch offering" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: unknown) {
    console.error("Error fetching offering:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch offering" },
      { status: 500 }
    )
  }
}

// 更新 offering (使用 v2_offering 表)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      slug,
      description,
      target_audience,
      learning_outcomes,
      prerequisites,
      base_price,
      currency,
      poster_url,
      offering_type_id,
      category_id,
      type_config,
      type_config_data,
      status,
    } = body

    // 获取现有的 offering
    const { data: existing, error: fetchError } = await catalogFrom("offering")
      .select(adminOfferingExistingSelect())
      .eq("id", id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "Offering not found" },
        { status: 404 }
      )
    }

    const existingStatus = existing.status as string
    const existingName = existing.name as string

    if (
      existingStatus !== "draft" &&
      name !== undefined &&
      name !== existingName
    ) {
      return NextResponse.json(
        {
          error:
            "Cannot rename offering after it has left draft status. Only draft offerings allow name changes.",
        },
        { status: 400 }
      )
    }

    if (existingStatus === "published" && status === "draft") {
      return NextResponse.json(
        { error: "Published offerings cannot be reverted to draft." },
        { status: 400 }
      )
    }

    // 确定要使用的 offering_type_id 和 category_id（如果改变）
    const targetOfferingTypeId = offering_type_id || existing.offering_type_id
    const targetCategoryId = isCatalogV3()
      ? null
      : category_id || (existing as { category_id?: string }).category_id

    // 获取 offering type 的 schema（v2 另含 portal_service_role，用于 instance 同步回退）
    const { data: offeringType, error: offeringTypeError } = await catalogFrom("offeringType")
      .select(adminOfferingTypeSchemaSelect())
      .eq("id", targetOfferingTypeId)
      .single()

    if (offeringTypeError || !offeringType) {
      return NextResponse.json(
        {
          error: `Invalid offering_type_id. Offering type must exist in ${catalogTables.offeringType} table.`,
        },
        { status: 400 }
      )
    }

    // 如果 offering_type_id 改变，验证新的 offering type 是激活的
    if (offering_type_id && offering_type_id !== existing.offering_type_id) {
      if (!offeringType.is_active) {
        return NextResponse.json(
          { error: "Cannot update offering to inactive offering type" },
          { status: 400 }
        )
      }
    }

    // 如果 category_id 改变，验证新的 category 存在且激活（v3 offering 无 category FK）
    if (
      !isCatalogV3() &&
      category_id &&
      category_id !== (existing as { category_id?: string }).category_id
    ) {
      const { data: category, error: categoryError } = await catalogFrom("stage")
        .select("id, config_base, is_active")
        .eq("id", category_id)
        .single()

      if (categoryError || !category) {
        return NextResponse.json(
          { error: "Invalid category_id. Category must exist in v2_category table." },
          { status: 400 }
        )
      }

      if (!category.is_active) {
        return NextResponse.json(
          { error: "Cannot update offering to inactive category" },
          { status: 400 }
        )
      }
    }

    // 获取 category 的 config_base（如果 category_id 改变或需要合并配置）
    let categoryConfigBase = {}
    if (targetCategoryId) {
      const { data: category } = await catalogFrom("stage")
        .select("config_base")
        .eq("id", targetCategoryId)
        .single()

      if (category && category.config_base && typeof category.config_base === 'object') {
        categoryConfigBase = category.config_base
      }
    }

    // 处理 type_config_data（优先使用 type_config_data，兼容 type_config）
    // 如果提供了新的配置数据，合并 category 的 config_base
    let configData = type_config_data !== undefined ? type_config_data : (type_config !== undefined ? type_config : undefined)
    
    // 如果提供了新的配置数据，合并 category 的 config_base（category 作为基础，用户配置覆盖）
    if (configData !== undefined) {
      configData = {
        ...categoryConfigBase,
        ...configData,
      }
    }
    
    const flattened = configData !== undefined ? flattenTypeConfigDataForTable(configData as Record<string, unknown>) : null

    // 如果提供了 configData，进行基础验证
    if (configData !== undefined && offeringType.offering_schema && typeof offeringType.offering_schema === 'object') {
      const schema = offeringType.offering_schema as { fields?: Record<string, SchemaFieldConfig> }
      if (schema.fields && typeof schema.fields === "object") {
        const missingRequiredFields: string[] = []
        
        for (const [fieldName, fieldConfig] of Object.entries(schema.fields)) {
          if (fieldConfig.required && (configData[fieldName] === undefined || configData[fieldName] === null || configData[fieldName] === '')) {
            missingRequiredFields.push(fieldConfig.label || fieldName)
          }
        }
        
        if (missingRequiredFields.length > 0) {
          return NextResponse.json(
            { error: `Missing required fields in type_config_data: ${missingRequiredFields.join(', ')}` },
            { status: 400 }
          )
        }
      }
    }

    // 如果 slug 改变，验证格式并检查唯一性
    if (slug && slug !== existing.slug) {
      const normalizedSlug = String(slug).trim().toLowerCase()
      if (!/^[a-z0-9-]+$/.test(normalizedSlug)) {
        return NextResponse.json(
          { error: "Slug must contain only lowercase letters, numbers, and hyphens" },
          { status: 400 }
        )
      }

      const { data: slugExists } = await catalogFrom("offering")
        .select("id")
        .eq("slug", normalizedSlug)
        .neq("id", id)
        .single()

      if (slugExists) {
        return NextResponse.json(
          { error: "Offering with this slug already exists" },
          { status: 400 }
        )
      }
    }

    // 验证 status
    if (status) {
      const validStatuses = ['draft', 'published', 'suspended', 'archived']
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        )
      }
    }

    const updateData: StringKeyRecord = {}
    if (name !== undefined) updateData.name = name
    if (slug !== undefined) updateData.slug = slug ? String(slug).trim().toLowerCase() : null
    if (description !== undefined) updateData.description = description || null
    else if (flattened?.description !== undefined) updateData.description = flattened.description ?? null
    if (target_audience !== undefined) updateData.target_audience = target_audience || null
    else if (flattened?.target_audience !== undefined) updateData.target_audience = flattened.target_audience ?? null
    if (learning_outcomes !== undefined) updateData.learning_outcomes = learning_outcomes || null
    else if (flattened?.learning_outcomes !== undefined) updateData.learning_outcomes = flattened.learning_outcomes ?? null
    if (prerequisites !== undefined) updateData.prerequisites = prerequisites || null
    else if (flattened?.prerequisites !== undefined) updateData.prerequisites = flattened.prerequisites ?? null
    if (base_price !== undefined) updateData.base_price = base_price || null
    else if (flattened?.base_price !== undefined) updateData.base_price = flattened.base_price ?? null
    if (currency !== undefined) updateData.currency = currency
    else if (flattened?.currency !== undefined) updateData.currency = flattened.currency ?? 'USD'
    if (poster_url !== undefined) updateData.poster_url = poster_url || null
    if (!isCatalogV3() && category_id !== undefined) updateData.category_id = category_id
    if (offering_type_id !== undefined) updateData.offering_type_id = offering_type_id
    if (configData !== undefined) updateData.type_config_data = configData
    if (status !== undefined) updateData.status = status

    const { data, error } = await catalogFrom("offering")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        offering_type:${catalogTables.offeringType}(
          id,
          code,
          name,
          description,
          icon,
          color,
          is_active,
          offering_schema,
          instance_schema
        )
      `)
      .single()

    if (error) {
      console.error("Error updating offering:", error)
      
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Offering with this name or slug already exists" },
          { status: 400 }
        )
      }
      
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Offering not found" }, { status: 404 })
      }
      
      return NextResponse.json(
        { error: getErrorMessage(error) || "Failed to update offering" },
        { status: 500 }
      )
    }

    // Sync is_course_type and portal_service_role to all instances of this offering (design: PORTAL_OFFERING_TYPE_DESIGN, INSTANCE_DETAIL_MEAL_CARE_SERVICES_DESIGN 4.3)
    if (configData !== undefined && typeof configData === "object" && configData !== null) {
      const portalConfig = configData.portal_config
      const isCourseType =
        portalConfig && typeof portalConfig === "object" && typeof portalConfig.is_course_type === "boolean"
          ? portalConfig.is_course_type
          : undefined
      const rawRole = configData.portal_service_role
      const typeRole = isCatalogV3()
        ? undefined
        : (offeringType as { portal_service_role?: string | null })?.portal_service_role
      // 优先用 type_config_data.portal_service_role；缺省时用 type 级 portal_service_role，确保 care/lunch 类型即使 schema 未包含该字段也能同步到 instance
      const portalServiceRole =
        rawRole === "meal_service" || rawRole === "care_service"
          ? rawRole
          : typeRole === "meal_service" || typeRole === "care_service"
            ? typeRole
            : null

      const instanceUpdate: Record<string, unknown> = {}
      if (isCourseType !== undefined) instanceUpdate.is_course_type = isCourseType
      instanceUpdate.portal_service_role = portalServiceRole

      if (Object.keys(instanceUpdate).length > 0) {
        const { error: instanceErr } = await catalogFrom("session")
          .update(instanceUpdate)
          .eq("offering_id", id)
        if (instanceErr) {
          console.error("Error syncing to v2_instance:", instanceErr)
        }
        // instance_v2 已废弃，仅同步 v2_instance
      }
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: unknown) {
    console.error("Error updating offering:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to update offering" },
      { status: 500 }
    )
  }
}

// 删除 offering (使用 v2_offering 表)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 获取 offering 信息
    const { data: offering, error: fetchError } = await catalogFrom("offering")
      .select("id, status")
      .eq("id", id)
      .single()

    if (fetchError || !offering) {
      return NextResponse.json(
        { error: "Offering not found" },
        { status: 404 }
      )
    }

    // 检查是否有 instances 使用此 offering（表名为 v2_instance）
    const { data: instancesData, error: instancesError } = await catalogFrom("session")
      .select("id")
      .eq("offering_id", id)
      .limit(1)

    if (instancesError) {
      console.error("Error checking instances:", instancesError)
      return NextResponse.json(
        { error: "Failed to check offering usage" },
        { status: 500 }
      )
    }

    if (instancesData && instancesData.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete offering with existing instances. Please remove all instances first." },
        { status: 400 }
      )
    }

    // 删除 offering
    const { error } = await catalogFrom("offering")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting offering:", error)
      return NextResponse.json(
        { error: getErrorMessage(error) || "Failed to delete offering" },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: "Offering deleted successfully" }, { status: 200 })
  } catch (error: unknown) {
    console.error("Error deleting offering:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to delete offering" },
      { status: 500 }
    )
  }
}
