import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { hasSeriesAssignments } from "@/lib/db"
import { supabaseAdmin } from "@/lib/supabase"
import { createErrorResponse } from "@/lib/errors"

// 获取单个系列
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
      .from("course_series")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      return NextResponse.json({ error: "Series not found" }, { status: 404 })
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching series:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch series" },
      { status: 500 }
    )
  }
}

// 更新系列
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
    const { category_id, franchise_id, name, display_name, description, start_date, end_date, display_order, is_active } = body

    // 验证 franchise_id（如果提供了）
    if (franchise_id !== undefined) {
      if (franchise_id === null) {
        return NextResponse.json(
          { error: "Franchise 是必填字段，不能为空" },
          { status: 400 }
        )
      }
      
      // 验证 franchise_id 是否存在于 franchises_v2 表中
      const { data: franchiseCheck, error: franchiseCheckError } = await supabaseAdmin
        .from("franchises_v2")
        .select("id, code, name")
        .eq("id", franchise_id)
        .eq("is_active", true)
        .single()

      if (franchiseCheckError || !franchiseCheck) {
        return NextResponse.json(
          { error: `Franchise 不存在：franchise_id="${franchise_id}"。请确保该 franchise 存在于 franchises_v2 表中且处于激活状态。` },
          { status: 400 }
        )
      }
    }

    // 验证日期逻辑（如果提供了日期）
    if (start_date && end_date) {
      const start = new Date(start_date)
      const end = new Date(end_date)
      
      if (isNaN(start.getTime())) {
        return NextResponse.json(
          { error: "开始日期格式不正确，请使用 YYYY-MM-DD 格式" },
          { status: 400 }
        )
      }
      
      if (isNaN(end.getTime())) {
        return NextResponse.json(
          { error: "结束日期格式不正确，请使用 YYYY-MM-DD 格式" },
          { status: 400 }
        )
      }
      
      if (start > end) {
        return NextResponse.json(
          { error: "开始日期不能晚于结束日期" },
          { status: 400 }
        )
      }
    }

    // 如果更新了 category_id，需要验证
    if (category_id) {
      const { data: currentSeries } = await supabaseAdmin
        .from("course_series")
        .select("category_id")
        .eq("id", id)
        .single()

      // 如果 category_id 改变了，需要检查是否有 Assignment
      if (currentSeries && currentSeries.category_id !== category_id) {
        const hasAssignments = await hasSeriesAssignments(id)
        if (hasAssignments) {
          return NextResponse.json(
            { error: "无法更改已有 Assignment 的程序分类，请先删除所有 Assignment" },
            { status: 400 }
          )
        }
      }
    }

    // 构建更新对象（只包含提供的字段）
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (category_id !== undefined) updateData.category_id = category_id
    if (franchise_id !== undefined) updateData.franchise_id = franchise_id // 不再允许 NULL
    if (name !== undefined) updateData.name = name.toLowerCase().trim() // 标准化为小写
    if (display_name !== undefined) updateData.display_name = display_name
    if (description !== undefined) updateData.description = description
    if (start_date !== undefined) updateData.start_date = start_date
    if (end_date !== undefined) updateData.end_date = end_date
    if (display_order !== undefined) updateData.display_order = display_order
    if (is_active !== undefined) updateData.is_active = is_active

    const { data, error } = await supabaseAdmin
      .from("course_series")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating series:", error)
      const errorResponse = createErrorResponse(error, 400, 'zh')
      // 根据错误类型返回适当的 HTTP 状态码
      const statusCode = error.code === '23505' ? 409 : 500 // 409 Conflict for unique constraint violations
      return NextResponse.json(errorResponse, { status: statusCode })
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error("Error updating series:", error)
    const errorResponse = createErrorResponse(error, 500, 'zh')
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// 删除系列（如果有 Assignment 则禁止删除）
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

    // 检查是否有 Assignment
    const hasAssignments = await hasSeriesAssignments(id)
    if (hasAssignments) {
      return NextResponse.json(
        { error: "Cannot delete series with existing assignments. Please remove all assignments first." },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from("course_series")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting series:", error)
      return NextResponse.json(
        { error: error.message || "Failed to delete series" },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: "Series deleted successfully" }, { status: 200 })
  } catch (error: any) {
    console.error("Error deleting series:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete series" },
      { status: 500 }
    )
  }
}

