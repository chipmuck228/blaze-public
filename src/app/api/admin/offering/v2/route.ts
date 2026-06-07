import { NextResponse } from "next/server"
import {getErrorMessage, type StringKeyRecord} from "@/lib/typed-error"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import type { SchemaFieldConfig } from "@/lib/instance-schema"
import {
  adminOfferingTypeSchemaSelect,
  catalogFrom,
  catalogSelect,
  catalogTables,
  isCatalogV3,
} from "@/lib/catalog-db"

/** Flatten nested type_config_data (e.g. pricing.base_price, content.description) for v2_offering table columns. */
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

// 获取所有 offerings (使用 v2_offering 表)
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get("includeInactive") === "true"
    const search = searchParams.get("search")
    const status = searchParams.get("status")
    const offeringTypeId = searchParams.get("offeringTypeId")

    let query = catalogFrom("offering")
      .select(catalogSelect.offeringWithRelations())
      .order("created_at", { ascending: false })

    if (status) {
      query = query.eq("status", status)
    }

    if (offeringTypeId) {
      query = query.eq("offering_type_id", offeringTypeId)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching offerings:", error)
      return NextResponse.json(
        { error: getErrorMessage(error) || "Failed to fetch offerings" },
        { status: 500 }
      )
    }

    let offerings = data || []

    // 如果不需要包含非激活的 offering types，进行过滤
    if (!includeInactive) {
      offerings = offerings.filter((offering: Record<string, unknown>) => {
        const offeringType = Array.isArray(offering.offering_type)
          ? offering.offering_type[0]
          : offering.offering_type
        return offeringType?.is_active === true
      })
    }

    // 如果提供了搜索参数，进行过滤
    if (search) {
      const searchLower = search.toLowerCase()
      offerings = offerings.filter((offering: Record<string, unknown>) => {
        const offeringType = Array.isArray(offering.offering_type)
          ? offering.offering_type[0]
          : offering.offering_type
        return (
          String(offering.name ?? "").toLowerCase().includes(searchLower) ||
          String(offering.description ?? "").toLowerCase().includes(searchLower) ||
          String(offering.slug ?? "").toLowerCase().includes(searchLower) ||
          String(offeringType?.name ?? "").toLowerCase().includes(searchLower)
        )
      })
    }

    return NextResponse.json(offerings, { status: 200 })
  } catch (error: unknown) {
    console.error("Error fetching offerings:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch offerings" },
      { status: 500 }
    )
  }
}

// 创建新的 offering (使用 v2_offering 表)
export async function POST(request: Request) {
  try {
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

    if (!name) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 }
      )
    }

    if (!offering_type_id) {
      return NextResponse.json(
        { error: "Missing required field: offering_type_id" },
        { status: 400 }
      )
    }

    if (!isCatalogV3() && !category_id) {
      return NextResponse.json(
        { error: "Missing required field: category_id" },
        { status: 400 }
      )
    }

    let category: { id: string; config_base?: unknown; is_active?: boolean } | null = null
    if (!isCatalogV3() && category_id) {
      // 验证 category 存在并获取 config_base
      const { data: categoryRow, error: categoryError } = await catalogFrom("stage")
        .select("id, config_base, is_active")
        .eq("id", category_id)
        .single()

      if (categoryError || !categoryRow) {
        return NextResponse.json(
          { error: "Invalid category_id. Category must exist in stage table." },
          { status: 400 }
        )
      }

      if (!categoryRow.is_active) {
        return NextResponse.json(
          { error: "Cannot create offering with inactive category" },
          { status: 400 }
        )
      }
      category = categoryRow
    }

    // 验证 offering_type_id 存在，并获取 offering_schema
    const { data: offeringType, error: offeringTypeError } = await catalogFrom("offeringType")
      .select(adminOfferingTypeSchemaSelect())
      .eq("id", offering_type_id)
      .single()

    if (offeringTypeError || !offeringType) {
      return NextResponse.json(
        {
          error: `Invalid offering_type_id. Offering type must exist in ${catalogTables.offeringType} table.`,
        },
        { status: 400 }
      )
    }

    // 验证 offering type 是激活的
    if (!offeringType.is_active) {
      return NextResponse.json(
        { error: "Cannot create offering with inactive offering type" },
        { status: 400 }
      )
    }

    // 处理 type_config_data（优先使用 type_config_data，兼容 type_config）
    // 合并 category 的 config_base：category 的 config_base 作为基础，用户提供的配置优先覆盖
    const categoryConfigBase =
      category?.config_base && typeof category.config_base === "object"
        ? (category.config_base as Record<string, unknown>)
        : {}
    const userConfigData = type_config_data || type_config || {}
    
    // 合并配置：category 的 config_base 作为基础，用户配置覆盖
    const configData = {
      ...categoryConfigBase,
      ...userConfigData,
    }
    const flattened = flattenTypeConfigDataForTable(configData as Record<string, unknown>)

    // 基础验证：如果 offering_schema 存在且有 fields，验证必需字段
    if (offeringType.offering_schema && typeof offeringType.offering_schema === 'object') {
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

    // 如果提供了 slug，验证格式并检查唯一性
    if (slug) {
      const normalizedSlug = String(slug).trim().toLowerCase()
      if (!/^[a-z0-9-]+$/.test(normalizedSlug)) {
        return NextResponse.json(
          { error: "Slug must contain only lowercase letters, numbers, and hyphens" },
          { status: 400 }
        )
      }

      // 检查 slug 是否已存在
      const { data: existing } = await catalogFrom("offering")
        .select("id")
        .eq("slug", normalizedSlug)
        .single()

      if (existing) {
        return NextResponse.json(
          { error: "Offering with this slug already exists" },
          { status: 400 }
        )
      }
    }

    // 验证 status
    const validStatuses = ['draft', 'published', 'suspended', 'archived']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const insertPayload: Record<string, unknown> = {
        name,
        slug: slug ? String(slug).trim().toLowerCase() : null,
        description: description ?? flattened.description ?? null,
        target_audience: target_audience ?? flattened.target_audience ?? null,
        learning_outcomes: learning_outcomes ?? flattened.learning_outcomes ?? null,
        prerequisites: prerequisites ?? flattened.prerequisites ?? null,
        base_price: base_price ?? flattened.base_price ?? null,
        currency: currency ?? flattened.currency ?? 'USD',
        poster_url: poster_url || null,
        offering_type_id,
        type_config_data: configData,
        status: status || 'draft',
      }
    if (!isCatalogV3() && category_id) {
      insertPayload.category_id = category_id
    }

    const { data, error } = await catalogFrom("offering")
      .insert(insertPayload)
      .select(`
        *,
        offering_type:${catalogTables.offeringType}(
          id,
          code,
          name,
          description,
          icon,
          color,
          is_active
        )
      `)
      .single()

    if (error) {
      console.error("Error creating offering:", error)
      
      // 检查是否是唯一性约束错误
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Offering with this name or slug already exists" },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: getErrorMessage(error) || "Failed to create offering" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: unknown) {
    console.error("Error creating offering:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to create offering" },
      { status: 500 }
    )
  }
}
