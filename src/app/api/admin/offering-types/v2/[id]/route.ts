import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取单个 offering type (使用 v2 表)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const { data: offeringType, error } = await supabaseAdmin
      .from("v2_offering_type")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Offering type not found" }, { status: 404 })
      }
      throw new Error(error.message)
    }

    return NextResponse.json(offeringType, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching offering type:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch offering type" },
      { status: 500 }
    )
  }
}

// 更新 offering type (使用 v2 表)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const {
      code,
      name,
      description,
      icon,
      color,
      display_order,
      is_active,
      offering_schema,
      instance_schema,
      portal_service_role,
    } = body

    // 获取现有的 offering type
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("v2_offering_type")
      .select("code")
      .eq("id", id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "Offering type not found" },
        { status: 404 }
      )
    }

    // 如果 code 改变，检查新 code 是否已存在
    if (code && code !== existing.code) {
      // 验证 code 格式
      if (!/^[a-z0-9_]+$/.test(code)) {
        return NextResponse.json(
          { error: "Code must contain only lowercase letters, numbers, and underscores" },
          { status: 400 }
        )
      }

      const { data: codeExists } = await supabaseAdmin
        .from("v2_offering_type")
        .select("id")
        .eq("code", code)
        .neq("id", id)
        .single()

      if (codeExists) {
        return NextResponse.json(
          { error: "Offering type with this code already exists" },
          { status: 400 }
        )
      }
    }

    const validRole =
      portal_service_role === 'meal_service' || portal_service_role === 'care_service'
        ? portal_service_role
        : null

    // 更新 offering type
    const updateData: any = {}
    if (code !== undefined) updateData.code = code
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (icon !== undefined) updateData.icon = icon
    if (color !== undefined) updateData.color = color
    if (display_order !== undefined) updateData.display_order = display_order
    if (is_active !== undefined) updateData.is_active = is_active
    if (offering_schema !== undefined) updateData.offering_schema = offering_schema
    if (instance_schema !== undefined) updateData.instance_schema = instance_schema
    if (portal_service_role !== undefined) updateData.portal_service_role = validRole

    const { data: offeringType, error: updateError } = await supabaseAdmin
      .from("v2_offering_type")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      throw new Error(updateError.message)
    }

    return NextResponse.json(offeringType, { status: 200 })
  } catch (error: any) {
    console.error("Error updating offering type:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update offering type" },
      { status: 500 }
    )
  }
}

// 删除 offering type (使用 v2 表)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // 获取 offering type 信息
    const { data: offeringType, error: fetchError } = await supabaseAdmin
      .from("v2_offering_type")
      .select("id, code")
      .eq("id", id)
      .single()

    if (fetchError || !offeringType) {
      return NextResponse.json(
        { error: "Offering type not found" },
        { status: 404 }
      )
    }

    // 检查是否有 offerings 使用此类型
    const { data: offeringsData, error: offeringsError } = await supabaseAdmin
      .from("v2_offering")
      .select("id")
      .eq("offering_type_id", id)
      .limit(1)

    if (offeringsError) {
      throw new Error(offeringsError.message)
    }

    if (offeringsData && offeringsData.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete offering type that is in use. Please deactivate it instead." },
        { status: 400 }
      )
    }

    // 删除 offering type
    const { error } = await supabaseAdmin
      .from("v2_offering_type")
      .delete()
      .eq("id", id)

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error("Error deleting offering type:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete offering type" },
      { status: 500 }
    )
  }
}
