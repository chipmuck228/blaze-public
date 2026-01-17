import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取单个 offerings assignment
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

    const { data: assignment, error } = await supabaseAdmin
      .from("offerings_assignments")
      .select(`
        *,
        offering:offerings(
          id,
          name,
          slug,
          target_grades,
          offering_type,
          status
        ),
        category:course_categories(
          id,
          name,
          display_name
        ),
        series:course_series(
          id,
          name,
          display_name
        ),
        location:course_locations(
          id,
          name
        )
      `)
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
      }
      throw new Error(error.message)
    }

    // 转换数据格式
    const formattedAssignment = {
      ...assignment,
      offering: Array.isArray(assignment.offering) ? assignment.offering[0] : assignment.offering,
      category: Array.isArray(assignment.category) ? assignment.category[0] : assignment.category,
      series: Array.isArray(assignment.series) ? assignment.series[0] : assignment.series,
      location: Array.isArray(assignment.location) ? assignment.location[0] : assignment.location,
    }

    return NextResponse.json(formattedAssignment, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching offerings assignment:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch offerings assignment" },
      { status: 500 }
    )
  }
}

// 更新 offerings assignment
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
      offering_id,
      category_id,
      series_id,
      location_id,
      display_order,
      is_active,
      assignment_config,
    } = body

    // 如果提供了 offering_id，验证 offering 状态
    if (offering_id) {
      const { data: offering, error: offeringError } = await supabaseAdmin
        .from("offerings")
        .select("id, status")
        .eq("id", offering_id)
        .single()

      if (offeringError || !offering) {
        return NextResponse.json(
          { error: "Offering not found" },
          { status: 404 }
        )
      }

      if (offering.status !== 'published') {
        return NextResponse.json(
          { error: "Only published offerings can be assigned" },
          { status: 400 }
        )
      }
    }

    // 更新 assignment
    const updateData: any = {}
    if (offering_id !== undefined) updateData.offering_id = offering_id
    if (category_id !== undefined) updateData.category_id = category_id
    if (series_id !== undefined) updateData.series_id = series_id
    if (location_id !== undefined) updateData.location_id = location_id
    if (display_order !== undefined) updateData.display_order = display_order
    if (is_active !== undefined) updateData.is_active = is_active
    if (assignment_config !== undefined) updateData.assignment_config = assignment_config

    const { data: assignment, error: updateError } = await supabaseAdmin
      .from("offerings_assignments")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        offering:offerings(
          id,
          name,
          slug,
          target_grades,
          offering_type,
          status
        ),
        category:course_categories(
          id,
          name,
          display_name
        ),
        series:course_series(
          id,
          name,
          display_name
        ),
        location:course_locations(
          id,
          name
        )
      `)
      .single()

    if (updateError) {
      throw new Error(updateError.message)
    }

    // 转换数据格式
    const formattedAssignment = {
      ...assignment,
      offering: Array.isArray(assignment.offering) ? assignment.offering[0] : assignment.offering,
      category: Array.isArray(assignment.category) ? assignment.category[0] : assignment.category,
      series: Array.isArray(assignment.series) ? assignment.series[0] : assignment.series,
      location: Array.isArray(assignment.location) ? assignment.location[0] : assignment.location,
    }

    return NextResponse.json(formattedAssignment, { status: 200 })
  } catch (error: any) {
    console.error("Error updating offerings assignment:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update offerings assignment" },
      { status: 500 }
    )
  }
}

// 删除 offerings assignment
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

    const { error } = await supabaseAdmin
      .from("offerings_assignments")
      .delete()
      .eq("id", id)

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error("Error deleting offerings assignment:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete offerings assignment" },
      { status: 500 }
    )
  }
}

