import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { hasCategoryAssignments } from "@/lib/db"
import { supabaseAdmin } from "@/lib/supabase"

// 获取单个大类
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
      .from("course_categories")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching category:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch category" },
      { status: 500 }
    )
  }
}

// 更新大类
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
    const { name, display_name, description, display_order, is_active } = body

    const { data, error } = await supabaseAdmin
      .from("course_categories")
      .update({
        name,
        display_name,
        description,
        display_order,
        is_active: is_active !== undefined ? is_active : true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating category:", error)
      return NextResponse.json(
        { error: error.message || "Failed to update category" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error("Error updating category:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update category" },
      { status: 500 }
    )
  }
}

// 删除大类（如果有 Assignment 则禁止删除）
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
    const hasAssignments = await hasCategoryAssignments(id)
    if (hasAssignments) {
      return NextResponse.json(
        { error: "Cannot delete category with existing assignments. Please remove all assignments first." },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from("course_categories")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting category:", error)
      return NextResponse.json(
        { error: error.message || "Failed to delete category" },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: "Category deleted successfully" }, { status: 200 })
  } catch (error: any) {
    console.error("Error deleting category:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete category" },
      { status: 500 }
    )
  }
}

