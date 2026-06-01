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
    const { name, display_name, description, display_order, is_active, featured, poster_url, featured_slogan, featured_subtitle, featured_display_order } = body

    // 验证：如果 featured = true，必须 is_active = true
    const finalIsActive = is_active !== undefined ? is_active : true
    if (featured && !finalIsActive) {
      return NextResponse.json(
        { error: "Category must be active to be featured" },
        { status: 400 }
      )
    }

    // 验证字符长度
    if (featured_slogan !== undefined && featured_slogan !== null && featured_slogan.length > 100) {
      return NextResponse.json(
        { error: "Featured slogan must be 100 characters or less" },
        { status: 400 }
      )
    }
    if (featured_subtitle !== undefined && featured_subtitle !== null && featured_subtitle.length > 60) {
      return NextResponse.json(
        { error: "Featured subtitle must be 60 characters or less" },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from("course_categories")
      .update({
        name,
        display_name,
        description,
        display_order,
        is_active: finalIsActive,
        featured: featured !== undefined ? featured : false,
        poster_url: poster_url !== undefined ? poster_url : null,
        featured_slogan: featured_slogan !== undefined ? featured_slogan : null,
        featured_subtitle: featured_subtitle !== undefined ? featured_subtitle : null,
        featured_display_order: featured_display_order !== undefined ? featured_display_order : 0,
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

