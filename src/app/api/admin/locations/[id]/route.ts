import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取单个 campus
// 使用新的 campuses 表
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
      .from("campuses")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      return NextResponse.json({ error: "Campus not found" }, { status: 404 })
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching campus:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch campus" },
      { status: 500 }
    )
  }
}

// 更新 campus
// 使用新的 campuses 表，franchise_id 必须引用 franchises_v2
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
      name, 
      address, 
      city, 
      state, 
      zip_code, 
      description,
      phone, 
      email, 
      parking_info,
      check_in_info,
      amenities,
      is_active, 
      franchise_id 
    } = body

    // 如果提供了 franchise_id，验证它存在于 franchises_v2 表中
    if (franchise_id) {
      const { data: franchise, error: franchiseError } = await supabaseAdmin
        .from("franchises_v2")
        .select("id")
        .eq("id", franchise_id)
        .single()

      if (franchiseError || !franchise) {
        return NextResponse.json(
          { error: "Invalid franchise_id. Franchise must exist in franchises_v2 table." },
          { status: 400 }
        )
      }
    }

    const { data, error } = await supabaseAdmin
      .from("campuses")
      .update({
        name,
        address: address || null,
        city: city || null,
        state: state || null,
        zip_code: zip_code || null,
        description: description || null,
        phone: phone || null,
        email: email || null,
        parking_info: parking_info || null,
        check_in_info: check_in_info || null,
        amenities: amenities || null,
        franchise_id: franchise_id || null,
        is_active: is_active !== undefined ? is_active : true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating campus:", error)
      return NextResponse.json(
        { error: error.message || "Failed to update campus" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error("Error updating campus:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update campus" },
      { status: 500 }
    )
  }
}

// 删除 campus
// 使用新的 campuses 表
// 检查是否有 instance_v2 使用此 campus
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

    // 检查是否有 legacy Assignment 或 Instance 使用此 campus
    // 也检查新的 instance_v2 表
    const [assignmentsCheck, instancesCheck, instancesV2Check] = await Promise.all([
      supabaseAdmin
        .from("course_assignments")
        .select("id")
        .eq("location_id", id)
        .limit(1),
      supabaseAdmin
        .from("course_instances")
        .select("id")
        .eq("location_id", id)
        .limit(1),
      supabaseAdmin
        .from("instance_v2")
        .select("id")
        .eq("location_id", id)
        .limit(1),
    ])

    if (assignmentsCheck.data && assignmentsCheck.data.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete campus with existing assignments. Please remove all assignments first." },
        { status: 400 }
      )
    }

    if (instancesCheck.data && instancesCheck.data.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete campus with existing instances. Please remove all instances first." },
        { status: 400 }
      )
    }

    if (instancesV2Check.data && instancesV2Check.data.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete campus with existing instances (v2). Please remove all instances first." },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from("campuses")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting campus:", error)
      return NextResponse.json(
        { error: error.message || "Failed to delete campus" },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: "Campus deleted successfully" }, { status: 200 })
  } catch (error: any) {
    console.error("Error deleting campus:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete campus" },
      { status: 500 }
    )
  }
}

