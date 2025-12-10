import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAllCourseSubcategories } from "@/lib/db"
import { supabaseAdmin } from "@/lib/supabase"

// 获取所有子类标签
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const subcategories = await getAllCourseSubcategories()
    return NextResponse.json(subcategories, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching subcategories:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch subcategories" },
      { status: 500 }
    )
  }
}

// 创建新子类标签
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, display_name, description, display_order } = body

    if (!name || !display_name) {
      return NextResponse.json(
        { error: "Missing required fields: name, display_name" },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from("course_subcategories")
      .insert({
        name,
        display_name,
        description,
        display_order: display_order || 0,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating subcategory:", error)
      return NextResponse.json(
        { error: error.message || "Failed to create subcategory" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error("Error creating subcategory:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create subcategory" },
      { status: 500 }
    )
  }
}

