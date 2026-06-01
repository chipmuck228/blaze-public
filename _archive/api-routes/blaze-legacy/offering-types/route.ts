import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取所有 offering types
// 使用新的 blaze_offering_type 表
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get("includeInactive") === "true"
    const categoryId = searchParams.get("categoryId")

    let query = supabaseAdmin
      .from("blaze_offering_type")
      .select(`
        *,
        category:blaze_category(
          id,
          name,
          display_name
        )
      `)
      .order("is_bound_to_category", { ascending: false })
      .order("display_order", { ascending: true })
      .order("name", { ascending: true })

    if (!includeInactive) {
      query = query.eq("is_active", true)
    }

    // 如果提供了 categoryId，筛选绑定到该 category 的 offering types
    if (categoryId) {
      query = query.eq("category_id", categoryId).eq("is_bound_to_category", true)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json(data || [], { status: 200 })
  } catch (error: any) {
    console.error("Error fetching offering types:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch offering types" },
      { status: 500 }
    )
  }
}

// 创建新 offering type
// 使用新的 blaze_offering_type 表
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      code,
      name,
      description,
      icon,
      color,
      display_order,
      is_active,
      is_default,
      is_bound_to_category,
      category_id,
      config_schema,
      legacy_type_code,
    } = body

    if (!code || !name) {
      return NextResponse.json(
        { error: "Missing required fields: code, name" },
        { status: 400 }
      )
    }

    // 验证 code 格式（只能包含小写字母、数字和下划线）
    const normalizedCode = String(code).trim().toLowerCase()
    if (!/^[a-z0-9_]+$/.test(normalizedCode)) {
      return NextResponse.json(
        { error: "Code must contain only lowercase letters, numbers, and underscores" },
        { status: 400 }
      )
    }

    // 检查 code 是否已存在
    const { data: existing } = await supabaseAdmin
      .from("blaze_offering_type")
      .select("id")
      .eq("code", normalizedCode)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: "Offering type with this code already exists" },
        { status: 400 }
      )
    }

    // 如果 is_bound_to_category = true，验证 category_id 存在
    if (is_bound_to_category && category_id) {
      const { data: category, error: categoryError } = await supabaseAdmin
        .from("blaze_category")
        .select("id")
        .eq("id", category_id)
        .single()

      if (categoryError || !category) {
        return NextResponse.json(
          { error: "Invalid category_id. Category must exist in blaze_category table." },
          { status: 400 }
        )
      }
    }

    // 如果 is_bound_to_category = true 但 category_id 为空，返回错误
    if (is_bound_to_category && !category_id) {
      return NextResponse.json(
        { error: "category_id is required when is_bound_to_category is true" },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from("blaze_offering_type")
      .insert({
        code: normalizedCode,
        name,
        description: description || null,
        icon: icon || null,
        color: color || null,
        display_order: display_order || 0,
        is_active: is_active !== undefined ? is_active : true,
        is_default: is_default || false,
        is_bound_to_category: is_bound_to_category || false,
        category_id: is_bound_to_category && category_id ? category_id : null,
        config_schema: config_schema || {},
        legacy_type_code: legacy_type_code || null,
      })
      .select(`
        *,
        category:blaze_category(
          id,
          name,
          display_name
        )
      `)
      .single()

    if (error) {
      console.error("Error creating offering type:", error)
      return NextResponse.json(
        { error: error.message || "Failed to create offering type" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error("Error creating offering type:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create offering type" },
      { status: 500 }
    )
  }
}
