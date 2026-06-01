import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取单个 offering
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
      .from("blaze_offering")
      .select(`
        *,
        offering_type:blaze_offering_type(
          id,
          code,
          name,
          category_id,
          is_bound_to_category,
          category:blaze_category(
            id,
            name,
            display_name,
            franchise_id,
            franchise:blaze_franchise(
              id,
              code,
              name
            )
          )
        )
      `)
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Offering not found" }, { status: 404 })
      }
      throw new Error(error.message)
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

// 更新 offering
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
      status,
    } = body

    if (!name) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 }
      )
    }

    // 如果提供了 offering_type_id，验证它存在且激活
    if (offering_type_id) {
      const { data: offeringType, error: offeringTypeError } = await supabaseAdmin
        .from("blaze_offering_type")
        .select("id, is_active")
        .eq("id", offering_type_id)
        .single()

      if (offeringTypeError || !offeringType) {
        return NextResponse.json(
          { error: "Invalid offering_type_id. Offering type must exist in blaze_offering_type table." },
          { status: 400 }
        )
      }

      if (!offeringType.is_active) {
        return NextResponse.json(
          { error: "Cannot update offering to inactive offering type" },
          { status: 400 }
        )
      }
    }

    // 如果提供了 slug，验证格式并检查唯一性
    if (slug !== undefined) {
      if (slug) {
        const normalizedSlug = String(slug).trim().toLowerCase()
        if (!/^[a-z0-9-]+$/.test(normalizedSlug)) {
          return NextResponse.json(
            { error: "Slug must contain only lowercase letters, numbers, and hyphens" },
            { status: 400 }
          )
        }

        // 检查 slug 是否被其他 offering 使用
        const { data: existing } = await supabaseAdmin
          .from("blaze_offering")
          .select("id")
          .eq("slug", normalizedSlug)
          .neq("id", id)
          .single()

        if (existing) {
          return NextResponse.json(
            { error: "Offering with this slug already exists" },
            { status: 400 }
          )
        }
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

    const updateData: any = {
      name,
      description: description !== undefined ? description : null,
      target_audience: target_audience !== undefined ? target_audience : null,
      learning_outcomes: learning_outcomes !== undefined ? learning_outcomes : null,
      prerequisites: prerequisites !== undefined ? prerequisites : null,
      base_price: base_price !== undefined ? base_price : null,
      currency: currency !== undefined ? currency : 'USD',
      poster_url: poster_url !== undefined ? poster_url : null,
      type_config: type_config !== undefined ? type_config : {},
      updated_at: new Date().toISOString(),
    }

    if (slug !== undefined) {
      updateData.slug = slug ? String(slug).trim().toLowerCase() : null
    }

    if (offering_type_id !== undefined) {
      updateData.offering_type_id = offering_type_id
    }

    if (status !== undefined) {
      updateData.status = status
    }

    const { data, error } = await supabaseAdmin
      .from("blaze_offering")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        offering_type:blaze_offering_type(
          id,
          code,
          name,
          category_id,
          is_bound_to_category,
          category:blaze_category(
            id,
            name,
            display_name,
            franchise_id,
            franchise:blaze_franchise(
              id,
              code,
              name
            )
          )
        )
      `)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Offering not found" }, { status: 404 })
      }
      console.error("Error updating offering:", error)
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

// 删除 offering
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

    // 检查是否有 instances 使用此 offering
    const { data: instances, error: instancesError } = await supabaseAdmin
      .from("blaze_instance")
      .select("id")
      .eq("offering_id", id)
      .limit(1)

    if (instancesError) {
      console.error("Error checking instances:", instancesError)
    }

    if (instances && instances.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete offering. There are instances using this offering." },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from("blaze_offering")
      .delete()
      .eq("id", id)

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Offering not found" }, { status: 404 })
      }
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
