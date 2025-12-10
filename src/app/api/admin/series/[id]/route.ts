import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { hasSeriesAssignments } from "@/lib/db"
import { supabaseAdmin } from "@/lib/supabase"

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
    const { category_id, name, display_name, description, start_date, end_date, display_order, is_active } = body

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
            { error: "Cannot change category of series with existing assignments" },
            { status: 400 }
          )
        }
      }
    }

    const { data, error } = await supabaseAdmin
      .from("course_series")
      .update({
        category_id,
        name,
        display_name,
        description,
        start_date,
        end_date,
        display_order,
        is_active: is_active !== undefined ? is_active : true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating series:", error)
      return NextResponse.json(
        { error: error.message || "Failed to update series" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error("Error updating series:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update series" },
      { status: 500 }
    )
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

