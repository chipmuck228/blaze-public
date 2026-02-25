import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取所有全局 categories
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get("includeInactive") === "true"

    let query = supabaseAdmin
      .from("v2_category")
      .select("*")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true })

    if (!includeInactive) {
      query = query.eq("is_active", true)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching categories:", error)
      return NextResponse.json(
        { error: error.message || "Failed to fetch categories" },
        { status: 500 }
      )
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

// 创建新的全局 category
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      display_name,
      description,
      poster_url,
      config_base,
      display_order,
      is_active,
    } = body

    if (!name || !display_name) {
      return NextResponse.json(
        { error: "Missing required fields: name, display_name" },
        { status: 400 }
      )
    }

    // 验证 name 格式（小写字母、数字、下划线）
    if (!/^[a-z0-9_]+$/.test(name)) {
      return NextResponse.json(
        { error: "Name must contain only lowercase letters, numbers, and underscores" },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from("v2_category")
      .insert({
        name: name.toLowerCase().trim(),
        display_name,
        description: description || null,
        poster_url: poster_url || null,
        config_base: config_base || {},
        display_order: display_order || 0,
        is_active: is_active !== undefined ? is_active : true,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating category:", error)
      
      // 检查是否是唯一性约束错误
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Category with this name already exists" },
          { status: 400 }
        )
      }
      
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
