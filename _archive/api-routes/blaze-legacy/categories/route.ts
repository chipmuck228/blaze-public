import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取所有 categories（支持按 franchiseId 筛选）
// 使用新的 blaze_category 表，关联 blaze_franchise
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const franchiseId = searchParams.get("franchiseId")
    const activeOnly = searchParams.get("activeOnly") === "true"

    let query = supabaseAdmin
      .from("blaze_category")
      .select(`
        *,
        franchise:blaze_franchise(
          id,
          code,
          name
        )
      `)
      .order("display_order", { ascending: true })

    if (activeOnly) {
      query = query.eq("is_active", true)
    }

    if (franchiseId) {
      query = query.eq("franchise_id", franchiseId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch categories: ${error.message}`)
    }

    return NextResponse.json(data || [], { status: 200 })
  } catch (error: any) {
    console.error("Error fetching categories:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch categories" },
      { status: 500 }
    )
  }
}

// 创建新 category
// 使用新的 blaze_category 表，franchise_id 必须引用 blaze_franchise
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { 
      franchise_id,
      name, 
      display_name,
      description,
      poster_url,
      featured,
      featured_slogan,
      featured_subtitle,
      featured_display_order,
      display_order,
      is_active
    } = body

    if (!name || !display_name) {
      return NextResponse.json(
        { error: "Missing required fields: name, display_name" },
        { status: 400 }
      )
    }

    if (!franchise_id) {
      return NextResponse.json(
        { error: "Missing required field: franchise_id" },
        { status: 400 }
      )
    }

    // 验证 franchise_id 存在于 blaze_franchise 表中
    const { data: franchise, error: franchiseError } = await supabaseAdmin
      .from("blaze_franchise")
      .select("id")
      .eq("id", franchise_id)
      .single()

    if (franchiseError || !franchise) {
      return NextResponse.json(
        { error: "Invalid franchise_id. Franchise must exist in blaze_franchise table." },
        { status: 400 }
      )
    }

    // 验证：如果 featured = true，必须 is_active = true
    if (featured && is_active === false) {
      return NextResponse.json(
        { error: "Category must be active to be featured" },
        { status: 400 }
      )
    }

    // 检查 name 在 franchise_id 下是否已存在（小写标准化）
    const normalizedName = name.toLowerCase().trim()
    const { data: existing } = await supabaseAdmin
      .from("blaze_category")
      .select("id")
      .eq("franchise_id", franchise_id)
      .ilike("name", normalizedName)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: "Category with this name already exists for this franchise" },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from("blaze_category")
      .insert({
        franchise_id,
        name: normalizedName,
        display_name,
        description: description || null,
        poster_url: poster_url || null,
        featured: featured || false,
        featured_slogan: featured_slogan || null,
        featured_subtitle: featured_subtitle || null,
        featured_display_order: featured_display_order || 0,
        display_order: display_order || 0,
        is_active: is_active !== undefined ? is_active : true,
      })
      .select(`
        *,
        franchise:blaze_franchise(
          id,
          code,
          name
        )
      `)
      .single()

    if (error) {
      console.error("Error creating category:", error)
      return NextResponse.json(
        { error: error.message || "Failed to create category" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error("Error creating category:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create category" },
      { status: 500 }
    )
  }
}
