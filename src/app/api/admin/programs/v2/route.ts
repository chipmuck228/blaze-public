import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取所有 programs（支持按 categoryId 和 franchiseId 筛选）
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get("categoryId")
    const franchiseId = searchParams.get("franchiseId")
    const activeOnly = searchParams.get("activeOnly") === "true"

    let query = supabaseAdmin
      .from("v2_program")
      .select(`
        *,
        category:v2_category(
          id,
          name,
          display_name,
          description,
          poster_url,
          is_active
        ),
        franchise:v2_franchise(
          id,
          code,
          name,
          is_active
        )
      `)
      .order("display_order", { ascending: true })
      .order("start_date", { ascending: false })

    if (activeOnly) {
      query = query.eq("is_active", true)
    }

    if (categoryId) {
      query = query.eq("category_id", categoryId)
    }

    if (franchiseId) {
      query = query.eq("franchise_id", franchiseId)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching programs:", error)
      return NextResponse.json(
        { error: error.message || "Failed to fetch programs" },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [], { status: 200 })
  } catch (error: any) {
    console.error("Error fetching programs:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch programs" },
      { status: 500 }
    )
  }
}

// 创建新 program
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      franchise_id,
      category_id,
      name,
      display_name,
      description,
      start_date,
      end_date,
      display_order,
      is_active,
      featured,
      poster_url,
    } = body

    // 验证必填字段
    if (!franchise_id || !category_id || !name || !display_name || !start_date || !end_date) {
      return NextResponse.json(
        { error: "Missing required fields: franchise_id, category_id, name, display_name, start_date, end_date" },
        { status: 400 }
      )
    }

    // 验证 name 格式
    if (!/^[a-z0-9_]+$/.test(name)) {
      return NextResponse.json(
        { error: "Name must contain only lowercase letters, numbers, and underscores" },
        { status: 400 }
      )
    }

    // 验证日期范围
    if (new Date(start_date) > new Date(end_date)) {
      return NextResponse.json(
        { error: "start_date must be less than or equal to end_date" },
        { status: 400 }
      )
    }

    // 验证 franchise 是否存在
    const { data: franchise, error: franchiseError } = await supabaseAdmin
      .from("v2_franchise")
      .select("id")
      .eq("id", franchise_id)
      .single()

    if (franchiseError || !franchise) {
      return NextResponse.json(
        { error: "Franchise not found" },
        { status: 404 }
      )
    }

    // 验证 category 是否存在
    const { data: category, error: categoryError } = await supabaseAdmin
      .from("v2_category")
      .select("id")
      .eq("id", category_id)
      .single()

    if (categoryError || !category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      )
    }

    // 验证 category 是否被 franchise 订阅
    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from("v2_franchise_category_map")
      .select("id")
      .eq("franchise_id", franchise_id)
      .eq("category_id", category_id)
      .single()

    if (subscriptionError || !subscription) {
      return NextResponse.json(
        { error: "Category is not subscribed by this franchise. Please subscribe to the category first." },
        { status: 400 }
      )
    }

    // 检查 name 在 franchise_id 和 category_id 组合下是否唯一
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("v2_program")
      .select("id")
      .eq("franchise_id", franchise_id)
      .eq("category_id", category_id)
      .eq("name", name.toLowerCase().trim())
      .single()

    if (existing && !existingError) {
      return NextResponse.json(
        { error: "Program with this name already exists for this franchise and category" },
        { status: 400 }
      )
    }

    // 创建 program
    const { data, error } = await supabaseAdmin
      .from("v2_program")
      .insert({
        franchise_id,
        category_id,
        name: name.toLowerCase().trim(),
        display_name,
        description: description || null,
        start_date,
        end_date,
        display_order: display_order || 0,
        is_active: is_active !== undefined ? is_active : true,
        featured: featured === true,
        poster_url: poster_url || null,
      })
      .select(`
        *,
        category:v2_category(
          id,
          name,
          display_name,
          description,
          poster_url,
          is_active
        ),
        franchise:v2_franchise(
          id,
          code,
          name,
          is_active
        )
      `)
      .single()

    if (error) {
      console.error("Error creating program:", error)
      
      // 检查是否是唯一性约束错误
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Program with this name already exists for this franchise and category" },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: error.message || "Failed to create program" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error("Error creating program:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create program" },
      { status: 500 }
    )
  }
}
