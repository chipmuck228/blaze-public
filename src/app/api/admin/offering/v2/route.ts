import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

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

    let query = supabaseAdmin
      .from("v2_offering")
      .select(`
        *,
        offering_type:v2_offering_type(
          id,
          code,
          name,
          description,
          icon,
          color,
          is_active,
          offering_schema,
          instance_schema
        ),
        category:v2_category(
          id,
          name,
          display_name
        )
      `)
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
        { error: error.message || "Failed to fetch offerings" },
        { status: 500 }
      )
    }

    let offerings = data || []

    // 如果不需要包含非激活的 offering types，进行过滤
    if (!includeInactive) {
      offerings = offerings.filter(
        (offering: any) => offering.offering_type?.is_active === true
      )
    }

    // 如果提供了搜索参数，进行过滤
    if (search) {
      const searchLower = search.toLowerCase()
      offerings = offerings.filter(
        (offering: any) =>
          offering.name?.toLowerCase().includes(searchLower) ||
          offering.description?.toLowerCase().includes(searchLower) ||
          offering.slug?.toLowerCase().includes(searchLower) ||
          offering.offering_type?.name?.toLowerCase().includes(searchLower)
      )
    }

    return NextResponse.json(offerings, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching offerings:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch offerings" },
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

    if (!category_id) {
      return NextResponse.json(
        { error: "Missing required field: category_id" },
        { status: 400 }
      )
    }

    // 验证 category 存在并获取 config_base
    const { data: category, error: categoryError } = await supabaseAdmin
      .from("v2_category")
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
        { error: "Cannot create offering with inactive category" },
        { status: 400 }
      )
    }

    // 验证 offering_type_id 存在于 v2_offering_type 表中，并获取 offering_schema
    const { data: offeringType, error: offeringTypeError } = await supabaseAdmin
      .from("v2_offering_type")
      .select("id, is_active, offering_schema")
      .eq("id", offering_type_id)
      .single()

    if (offeringTypeError || !offeringType) {
      return NextResponse.json(
        { error: "Invalid offering_type_id. Offering type must exist in v2_offering_type table." },
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
    const categoryConfigBase = (category.config_base && typeof category.config_base === 'object') 
      ? category.config_base 
      : {}
    const userConfigData = type_config_data || type_config || {}
    
    // 合并配置：category 的 config_base 作为基础，用户配置覆盖
    const configData = {
      ...categoryConfigBase,
      ...userConfigData,
    }
    
    // 基础验证：如果 offering_schema 存在且有 fields，验证必需字段
    if (offeringType.offering_schema && typeof offeringType.offering_schema === 'object') {
      const schema = offeringType.offering_schema as any
      if (schema.fields && typeof schema.fields === 'object') {
        const fields = schema.fields as Record<string, any>
        const missingRequiredFields: string[] = []
        
        for (const [fieldName, fieldConfig] of Object.entries(fields)) {
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
      const { data: existing } = await supabaseAdmin
        .from("v2_offering")
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

    const { data, error } = await supabaseAdmin
      .from("v2_offering")
      .insert({
        name,
        slug: slug ? String(slug).trim().toLowerCase() : null,
        description: description || null,
        target_audience: target_audience || null,
        learning_outcomes: learning_outcomes || null,
        prerequisites: prerequisites || null,
        base_price: base_price || null,
        currency: currency || 'USD',
        poster_url: poster_url || null,
        category_id,
        offering_type_id,
        type_config_data: configData,
        status: status || 'draft',
      })
      .select(`
        *,
        offering_type:v2_offering_type(
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
        { error: error.message || "Failed to create offering" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error("Error creating offering:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create offering" },
      { status: 500 }
    )
  }
}
