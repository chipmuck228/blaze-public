import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取单个 offering type
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
      .from("blaze_offering_type")
      .select(`
        *,
        category:blaze_category(
          id,
          name,
          display_name
        )
      `)
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Offering type not found" }, { status: 404 })
      }
      throw new Error(error.message)
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching offering type:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch offering type" },
      { status: 500 }
    )
  }
}

// 更新 offering type
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
    } = body

    if (!name) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 }
      )
    }

    // 如果提供了 code，验证格式并检查唯一性
    if (code) {
      const normalizedCode = String(code).trim().toLowerCase()
      if (!/^[a-z0-9_]+$/.test(normalizedCode)) {
        return NextResponse.json(
          { error: "Code must contain only lowercase letters, numbers, and underscores" },
          { status: 400 }
        )
      }

      // 检查 code 是否被其他 offering type 使用
      const { data: existing } = await supabaseAdmin
        .from("blaze_offering_type")
        .select("id")
        .eq("code", normalizedCode)
        .neq("id", id)
        .single()

      if (existing) {
        return NextResponse.json(
          { error: "Offering type with this code already exists" },
          { status: 400 }
        )
      }
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

    const updateData: any = {
      name,
      description: description !== undefined ? description : null,
      icon: icon !== undefined ? icon : null,
      color: color !== undefined ? color : null,
      display_order: display_order !== undefined ? display_order : 0,
      is_bound_to_category: is_bound_to_category !== undefined ? is_bound_to_category : false,
      config_schema: config_schema !== undefined ? config_schema : {},
      updated_at: new Date().toISOString(),
    }

    if (code) {
      updateData.code = String(code).trim().toLowerCase()
    }

    if (is_active !== undefined) {
      updateData.is_active = is_active
    }

    if (is_default !== undefined) {
      updateData.is_default = is_default
    }

    if (is_bound_to_category) {
      updateData.category_id = category_id
    } else {
      updateData.category_id = null
    }

    const { data, error } = await supabaseAdmin
      .from("blaze_offering_type")
      .update(updateData)
      .eq("id", id)
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
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Offering type not found" }, { status: 404 })
      }
      console.error("Error updating offering type:", error)
      return NextResponse.json(
        { error: error.message || "Failed to update offering type" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error("Error updating offering type:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update offering type" },
      { status: 500 }
    )
  }
}

// 删除 offering type
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

    // 检查是否有 offerings 使用此 offering type
    const { data: offerings, error: offeringsError } = await supabaseAdmin
      .from("blaze_offering")
      .select("id")
      .eq("offering_type_id", id)
      .limit(1)

    if (offeringsError) {
      console.error("Error checking offerings:", offeringsError)
    }

    if (offerings && offerings.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete offering type. There are offerings using this type." },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from("blaze_offering_type")
      .delete()
      .eq("id", id)

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Offering type not found" }, { status: 404 })
      }
      console.error("Error deleting offering type:", error)
      return NextResponse.json(
        { error: error.message || "Failed to delete offering type" },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: "Offering type deleted successfully" }, { status: 200 })
  } catch (error: any) {
    console.error("Error deleting offering type:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete offering type" },
      { status: 500 }
    )
  }
}
