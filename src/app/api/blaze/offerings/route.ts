import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取所有 offerings
// 使用新的 blaze_offering 表，关联 blaze_offering_type
// 注意：Offering 是全局独立的，不直接关联 Category，但可以通过 offering_type 的 category_id 间接关联
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const offeringId = searchParams.get("offeringId")
    const search = searchParams.get("search")
    const offeringTypeId = searchParams.get("offeringTypeId")
    const status = searchParams.get("status")

    // 如果提供了 offeringId，返回单个 offering 的详细信息
    if (offeringId) {
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
        .eq("id", offeringId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json({ error: "Offering not found" }, { status: 404 })
        }
        throw new Error(error.message)
      }

      return NextResponse.json(data, { status: 200 })
    }

    // 获取所有 offerings
    let query = supabaseAdmin
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
      .order("created_at", { ascending: false })

    // 如果提供了 offeringTypeId，进行过滤
    if (offeringTypeId) {
      query = query.eq("offering_type_id", offeringTypeId)
    }

    // 如果提供了 status，进行过滤
    if (status) {
      query = query.eq("status", status)
    }

    const { data: offerings, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    // 如果提供了搜索参数，进行过滤
    let filteredOfferings = offerings || []
    if (search) {
      const searchLower = search.toLowerCase()
      filteredOfferings = filteredOfferings.filter(
        (offering: any) =>
          offering.name?.toLowerCase().includes(searchLower) ||
          offering.description?.toLowerCase().includes(searchLower) ||
          offering.slug?.toLowerCase().includes(searchLower)
      )
    }

    return NextResponse.json(filteredOfferings, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching offerings:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch offerings" },
      { status: 500 }
    )
  }
}

// 创建新 offering
// 使用新的 blaze_offering 表
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
      type_config,
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

    // 验证 offering_type_id 存在于 blaze_offering_type 表中
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

    // 验证 offering type 是激活的
    if (!offeringType.is_active) {
      return NextResponse.json(
        { error: "Cannot create offering with inactive offering type" },
        { status: 400 }
      )
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
        .from("blaze_offering")
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
      .from("blaze_offering")
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
        offering_type_id,
        type_config: type_config || {},
        status: status || 'draft',
      })
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
      console.error("Error creating offering:", error)
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
