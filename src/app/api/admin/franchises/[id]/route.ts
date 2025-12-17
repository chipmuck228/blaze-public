import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取单个 franchise
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
      .from("franchises")
      .select("id, code, name, primary_domain, timezone, is_active")
      .eq("id", id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "Franchise not found" }, { status: 404 })
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching franchise:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch franchise" },
      { status: 500 }
    )
  }
}

// 更新 franchise
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
    const { code, name, primary_domain, timezone, is_active } = body

    if (!code || !name) {
      return NextResponse.json(
        { error: "Missing required fields: code, name" },
        { status: 400 }
      )
    }

    const normalizedCode = String(code).trim().toLowerCase()

    const { data, error } = await supabaseAdmin
      .from("franchises")
      .update({
        code: normalizedCode,
        name,
        primary_domain: primary_domain || null,
        timezone: timezone || null,
        is_active: is_active !== undefined ? is_active : true,
      })
      .eq("id", id)
      .select("id, code, name, primary_domain, timezone, is_active")
      .single()

    if (error) {
      console.error("Error updating franchise:", error)
      return NextResponse.json(
        { error: error.message || "Failed to update franchise" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error("Error updating franchise:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update franchise" },
      { status: 500 }
    )
  }
}

// 删除 franchise
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

    // 检查是否有 locations / instances / enrollments 关联该 franchise
    const [locationsCheck, instancesCheck, enrollmentsCheck] = await Promise.all([
      supabaseAdmin
        .from("course_locations")
        .select("id")
        .eq("franchise_id", id)
        .limit(1),
      supabaseAdmin
        .from("course_instances")
        .select("id")
        .eq("franchise_id", id)
        .limit(1),
      supabaseAdmin
        .from("course_enrollments")
        .select("id")
        .eq("franchise_id", id)
        .limit(1),
    ])

    if (locationsCheck.data && locationsCheck.data.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete franchise with existing locations. Please reassign or delete locations first." },
        { status: 400 }
      )
    }

    if (instancesCheck.data && instancesCheck.data.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete franchise with existing instances. Please reassign or delete instances first." },
        { status: 400 }
      )
    }

    if (enrollmentsCheck.data && enrollmentsCheck.data.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete franchise with existing enrollments." },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from("franchises")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting franchise:", error)
      return NextResponse.json(
        { error: error.message || "Failed to delete franchise" },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: "Franchise deleted successfully" }, { status: 200 })
  } catch (error: any) {
    console.error("Error deleting franchise:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete franchise" },
      { status: 500 }
    )
  }
}


