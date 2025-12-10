import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAllCourseLocations } from "@/lib/db"
import { supabaseAdmin } from "@/lib/supabase"

// 获取所有地点
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const locations = await getAllCourseLocations()
    return NextResponse.json(locations, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching locations:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch locations" },
      { status: 500 }
    )
  }
}

// 创建新地点
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, address, city, state, zip_code, phone, email } = body

    if (!name) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from("course_locations")
      .insert({
        name,
        address,
        city,
        state,
        zip_code,
        phone,
        email,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating location:", error)
      return NextResponse.json(
        { error: error.message || "Failed to create location" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error("Error creating location:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create location" },
      { status: 500 }
    )
  }
}

