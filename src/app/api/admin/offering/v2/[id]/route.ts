import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

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

    const { data, error } = await supabaseAdmin
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
          offering_schema
        )
      `)
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Offering not found" }, { status: 404 })
      }
      return NextResponse.json(
        { error: error.message || "Failed to fetch offering" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching offering:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch offering" },
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
      type_config,
      type_config_data,
      status,
    } = body

    // 获取现有的 offering
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("v2_offering")
      .select("id, slug, offering_type_id")
      .eq("id", id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "Offering not found" },
        { status: 404 }
      )
    }

    // 确定要使用的 offering_type_id（如果改变）
    const targetOfferingTypeId = offering_type_id || existing.offering_type_id

    // 获取 offering type 的 schema（用于验证）
    const { data: offeringType, error: offeringTypeError } = await supabaseAdmin
      .from("v2_offering_type")
      .select("id, is_active, offering_schema")
      .eq("id", targetOfferingTypeId)
      .single()

    if (offeringTypeError || !offeringType) {
      return NextResponse.json(
        { error: "Invalid offering_type_id. Offering type must exist in v2_offering_type table." },
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

    // 处理 type_config_data（优先使用 type_config_data，兼容 type_config）
    const configData = type_config_data !== undefined ? type_config_data : (type_config !== undefined ? type_config : undefined)
    
    // 如果提供了 configData，进行基础验证
    if (configData !== undefined && offeringType.offering_schema && typeof offeringType.offering_schema === 'object') {
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

    // 如果 slug 改变，验证格式并检查唯一性
    if (slug && slug !== existing.slug) {
      const normalizedSlug = String(slug).trim().toLowerCase()
      if (!/^[a-z0-9-]+$/.test(normalizedSlug)) {
        return NextResponse.json(
          { error: "Slug must contain only lowercase letters, numbers, and hyphens" },
          { status: 400 }
        )
      }

      const { data: slugExists } = await supabaseAdmin
        .from("v2_offering")
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

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (slug !== undefined) updateData.slug = slug ? String(slug).trim().toLowerCase() : null
    if (description !== undefined) updateData.description = description || null
    if (target_audience !== undefined) updateData.target_audience = target_audience || null
    if (learning_outcomes !== undefined) updateData.learning_outcomes = learning_outcomes || null
    if (prerequisites !== undefined) updateData.prerequisites = prerequisites || null
    if (base_price !== undefined) updateData.base_price = base_price || null
    if (currency !== undefined) updateData.currency = currency
    if (poster_url !== undefined) updateData.poster_url = poster_url || null
    if (offering_type_id !== undefined) updateData.offering_type_id = offering_type_id
    if (configData !== undefined) updateData.type_config_data = configData
    if (status !== undefined) updateData.status = status

    const { data, error } = await supabaseAdmin
      .from("v2_offering")
      .update(updateData)
      .eq("id", id)
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
          offering_schema
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
        { error: error.message || "Failed to update offering" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error("Error updating offering:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update offering" },
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
    const { data: offering, error: fetchError } = await supabaseAdmin
      .from("v2_offering")
      .select("id, status")
      .eq("id", id)
      .single()

    if (fetchError || !offering) {
      return NextResponse.json(
        { error: "Offering not found" },
        { status: 404 }
      )
    }

    // 检查是否有 instances 使用此 offering
    const { data: instancesData, error: instancesError } = await supabaseAdmin
      .from("instance_v2")
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

    // 只有 draft 状态的 offering 可以删除
    if (offering.status !== 'draft') {
      return NextResponse.json(
        { error: `Cannot delete offering with status '${offering.status}'. Only draft offerings can be deleted.` },
        { status: 400 }
      )
    }

    // 删除 offering
    const { error } = await supabaseAdmin
      .from("v2_offering")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting offering:", error)
      return NextResponse.json(
        { error: error.message || "Failed to delete offering" },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: "Offering deleted successfully" }, { status: 200 })
  } catch (error: any) {
    console.error("Error deleting offering:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete offering" },
      { status: 500 }
    )
  }
}
