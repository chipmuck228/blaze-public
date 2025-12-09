import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取单个课程
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
      .from("courses")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching course:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch course" },
      { status: 500 }
    )
  }
}

// 更新课程
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
      subcategory_id,
      name,
      slug,
      description,
      target_audience,
      outcomes,
      prerequisites,
      cancellation_policy,
      number_of_sessions,
      target_age_min,
      target_age_max,
      target_grades,
      base_price,
      currency,
      display_order,
      is_active,
    } = body

    const { data, error } = await supabaseAdmin
      .from("courses")
      .update({
        subcategory_id,
        name,
        slug,
        description,
        target_audience,
        outcomes,
        prerequisites,
        cancellation_policy,
        number_of_sessions,
        target_age_min,
        target_age_max,
        target_grades,
        base_price,
        currency,
        display_order,
        is_active: is_active !== undefined ? is_active : true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating course:", error)
      return NextResponse.json(
        { error: error.message || "Failed to update course" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error("Error updating course:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update course" },
      { status: 500 }
    )
  }
}

// 删除课程
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

    const { error } = await supabaseAdmin.from("courses").delete().eq("id", id)

    if (error) {
      console.error("Error deleting course:", error)
      return NextResponse.json(
        { error: error.message || "Failed to delete course" },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: "Course deleted successfully" }, { status: 200 })
  } catch (error: any) {
    console.error("Error deleting course:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete course" },
      { status: 500 }
    )
  }
}

