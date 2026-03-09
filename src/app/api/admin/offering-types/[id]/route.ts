import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取单个 offering type
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
      .from("offering_types")
      .select(`
        *,
        category:course_categories(
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

    return NextResponse.json(offeringType, { status: 200 })
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
      config_schema,
    } = body

    // 获取现有的 offering type（包含绑定状态）
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("offering_types")
      .select("code, is_default, is_bound_to_category, category_id")
      .eq("id", id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "Offering type not found" },
        { status: 404 }
      )
    }

    // 检查是否是绑定的 Offering Type
    if (existing.is_bound_to_category) {
      // 禁止修改的字段
      if (code !== undefined && code !== existing.code) {
        return NextResponse.json(
          { error: "Cannot modify code for offering type bound to a category" },
          { status: 400 }
        )
      }
      
      // category_id 不能通过 API 修改（只能通过 Category 管理）
      // 这里不检查 category_id，因为 API 不会接收这个字段
    }

    // 如果 code 改变（且不是绑定的），检查新 code 是否已存在
    if (code && code !== existing.code && !existing.is_bound_to_category) {
      // 验证 code 格式
      if (!/^[a-z0-9_]+$/.test(code)) {
        return NextResponse.json(
          { error: "Code must contain only lowercase letters, numbers, and underscores" },
          { status: 400 }
        )
      }

      const { data: codeExists } = await supabaseAdmin
        .from("offering_types")
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

    // 更新 offering type（绑定的类型不能修改 code 和 category_id）
    const updateData: any = {}
    if (!existing.is_bound_to_category && code !== undefined) {
      updateData.code = code
    }
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (icon !== undefined) updateData.icon = icon
    if (color !== undefined) updateData.color = color
    // display_order 不再通过 API 更新（UI 已移除）
    if (is_active !== undefined) updateData.is_active = is_active
    if (config_schema !== undefined) updateData.config_schema = config_schema

    const { data: offeringType, error: updateError } = await supabaseAdmin
      .from("offering_types")
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

// 删除 offering type
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

    // 检查是否是默认类型或绑定到 Category
    const { data: offeringType, error: fetchError } = await supabaseAdmin
      .from("offering_types")
      .select("is_default, is_bound_to_category, code")
      .eq("id", id)
      .single()

    if (fetchError || !offeringType) {
      return NextResponse.json(
        { error: "Offering type not found" },
        { status: 404 }
      )
    }

    if (offeringType.is_default) {
      return NextResponse.json(
        { error: "Cannot delete default offering type" },
        { status: 400 }
      )
    }

    if (offeringType.is_bound_to_category) {
      return NextResponse.json(
        { error: "Cannot delete offering type bound to a category. Delete the category instead." },
        { status: 400 }
      )
    }

    // 检查是否有 offerings 使用此类型（检查旧表和新表）
    // 注意：两个表都使用枚举类型，如果 code 不在枚举中会报错，需要捕获
    let offeringsInUse = false
    
    // 检查 offerings_v2 表（新表，也使用枚举类型）
    const { data: offeringsV2Data, error: offeringsV2Error } = await supabaseAdmin
      .from("offerings_v2")
      .select("id")
      .eq("offering_type", offeringType.code)
      .limit(1)

    // 如果错误是因为枚举值无效，说明这个 code 不在枚举中，可以忽略
    if (offeringsV2Error) {
      const isEnumError = offeringsV2Error.message?.includes("Invalid input value for enum") || 
                         offeringsV2Error.message?.includes("invalid input value")
      
      if (!isEnumError) {
        // 如果不是枚举错误，抛出异常
        throw new Error(offeringsV2Error.message)
      }
      // 如果是枚举错误，说明这个 code 不在枚举中，旧表中肯定没有使用它的记录
    } else if (offeringsV2Data && offeringsV2Data.length > 0) {
      offeringsInUse = true
    }

    // 检查 offerings 表（旧表，使用枚举类型）
    // 如果 code 不在枚举中，查询会失败，需要捕获错误
    const { data: offeringsData, error: offeringsError } = await supabaseAdmin
      .from("offerings")
      .select("id")
      .eq("offering_type", offeringType.code)
      .limit(1)

    // 如果错误是因为枚举值无效，说明这个 code 不在旧表的枚举中，可以忽略
    // 其他错误需要抛出
    if (offeringsError) {
      // 检查是否是枚举值无效的错误
      const isEnumError = offeringsError.message?.includes("Invalid input value for enum") || 
                         offeringsError.message?.includes("invalid input value")
      
      if (!isEnumError) {
        // 如果不是枚举错误，抛出异常
        throw new Error(offeringsError.message)
      }
      // 如果是枚举错误，说明这个 code 不在旧表的枚举中，继续检查新表即可
    } else if (offeringsData && offeringsData.length > 0) {
      offeringsInUse = true
    }

    if (offeringsInUse) {
      return NextResponse.json(
        { error: "Cannot delete offering type that is in use. Please deactivate it instead." },
        { status: 400 }
      )
    }

    // 删除 offering type
    const { error } = await supabaseAdmin
      .from("offering_types")
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

