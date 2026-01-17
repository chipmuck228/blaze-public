import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取所有 offering types
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get("includeInactive") === "true"

    let query = supabaseAdmin
      .from("offering_types")
      .select("*")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true })

    if (!includeInactive) {
      query = query.eq("is_active", true)
    }

    const { data: offeringTypes, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json(offeringTypes || [], { status: 200 })
  } catch (error: any) {
    console.error("Error fetching offering types:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch offering types" },
      { status: 500 }
    )
  }
}

// 创建新 offering type
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
      config_schema,
    } = body

    if (!code || !name) {
      return NextResponse.json(
        { error: "Missing required fields: code, name" },
        { status: 400 }
      )
    }

    // 验证 code 格式（只能包含小写字母、数字和下划线）
    if (!/^[a-z0-9_]+$/.test(code)) {
      return NextResponse.json(
        { error: "Code must contain only lowercase letters, numbers, and underscores" },
        { status: 400 }
      )
    }

    // 检查 code 是否已存在
    const { data: existing } = await supabaseAdmin
      .from("offering_types")
      .select("id")
      .eq("code", code)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: "Offering type with this code already exists" },
        { status: 400 }
      )
    }

    // 创建 offering type
    const { data: offeringType, error: createError } = await supabaseAdmin
      .from("offering_types")
      .insert({
        code,
        name,
        description: description || null,
        icon: icon || null,
        color: color || null,
        display_order: display_order || 0,
        is_active: is_active !== undefined ? is_active : true,
        is_default: false, // 新创建的类型不能是默认类型
        config_schema: config_schema || {},
      })
      .select()
      .single()

    if (createError) {
      throw new Error(createError.message)
    }

    return NextResponse.json(offeringType, { status: 201 })
  } catch (error: any) {
    console.error("Error creating offering type:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create offering type" },
      { status: 500 }
    )
  }
}

