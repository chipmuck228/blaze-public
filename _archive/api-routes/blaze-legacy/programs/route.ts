import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取所有 programs（支持按 categoryId 和 franchiseId 筛选）
// 使用新的 blaze_program 表，关联 blaze_category 和 blaze_franchise
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
      .from("blaze_program")
      .select(`
        *,
        category:blaze_category(
          id,
          name,
          display_name,
          franchise_id
        ),
        franchise:blaze_franchise(
          id,
          code,
          name
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
      throw new Error(`Failed to fetch programs: ${error.message}`)
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
// 使用新的 blaze_program 表，category_id 和 franchise_id 必须引用 blaze_category 和 blaze_franchise
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { 
      category_id,
      franchise_id,
      name, 
      display_name,
      description,
      start_date,
      end_date,
      display_order,
      is_active
    } = body

    if (!name || !display_name) {
      return NextResponse.json(
        { error: "Missing required fields: name, display_name" },
        { status: 400 }
      )
    }

    if (!category_id || !franchise_id) {
      return NextResponse.json(
        { error: "Missing required fields: category_id, franchise_id" },
        { status: 400 }
      )
    }

    if (!start_date || !end_date) {
      return NextResponse.json(
        { error: "Missing required fields: start_date, end_date" },
        { status: 400 }
      )
    }

    // 验证日期
    if (new Date(start_date) > new Date(end_date)) {
      return NextResponse.json(
        { error: "start_date must be less than or equal to end_date" },
        { status: 400 }
      )
    }

    // 验证 category_id 存在于 blaze_category 表中
    const { data: category, error: categoryError } = await supabaseAdmin
      .from("blaze_category")
      .select("id, franchise_id")
      .eq("id", category_id)
      .single()

    if (categoryError || !category) {
      return NextResponse.json(
        { error: "Invalid category_id. Category must exist in blaze_category table." },
        { status: 400 }
      )
    }

    // 验证 category 的 franchise_id 与提供的 franchise_id 匹配
    if (category.franchise_id !== franchise_id) {
      return NextResponse.json(
        { error: "category_id and franchise_id do not match. Category must belong to the specified franchise." },
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

    // 验证 name 格式（小写字母、数字、下划线）
    const normalizedName = name.toLowerCase().trim()
    if (!/^[a-z0-9_]+$/.test(normalizedName)) {
      return NextResponse.json(
        { error: "Name must contain only lowercase letters, numbers, and underscores" },
        { status: 400 }
      )
    }

    // 检查 name 在 category_id 和 franchise_id 组合下是否已存在
    const { data: existing } = await supabaseAdmin
      .from("blaze_program")
      .select("id")
      .eq("category_id", category_id)
      .eq("franchise_id", franchise_id)
      .ilike("name", normalizedName)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: "Program with this name already exists for this category and franchise" },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from("blaze_program")
      .insert({
        category_id,
        franchise_id,
        name: normalizedName,
        display_name,
        description: description || null,
        start_date,
        end_date,
        display_order: display_order || 0,
        is_active: is_active !== undefined ? is_active : true,
      })
      .select(`
        *,
        category:blaze_category(
          id,
          name,
          display_name,
          franchise_id
        ),
        franchise:blaze_franchise(
          id,
          code,
          name
        )
      `)
      .single()

    if (error) {
      console.error("Error creating program:", error)
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
