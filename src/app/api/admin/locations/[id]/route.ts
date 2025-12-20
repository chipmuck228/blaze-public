import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取单个地点
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
      .from("course_locations")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 })
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching location:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch location" },
      { status: 500 }
    )
  }
}

// 更新地点
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

    const { data, error } = await supabaseAdmin
      .from("course_locations")
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
      console.error("Error updating location:", error)
      return NextResponse.json(
        { error: error.message || "Failed to update location" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error("Error updating location:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update location" },
      { status: 500 }
    )
  }
}

// 删除地点
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

    // 检查是否有 Assignment 或 Instance 使用此 location
    const [assignmentsCheck, instancesCheck] = await Promise.all([
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
    ])

    if (assignmentsCheck.data && assignmentsCheck.data.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete location with existing assignments. Please remove all assignments first." },
        { status: 400 }
      )
    }

    if (instancesCheck.data && instancesCheck.data.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete location with existing instances. Please remove all instances first." },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from("course_locations")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting location:", error)
      return NextResponse.json(
        { error: error.message || "Failed to delete location" },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: "Location deleted successfully" }, { status: 200 })
  } catch (error: any) {
    console.error("Error deleting location:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete location" },
      { status: 500 }
    )
  }
}

