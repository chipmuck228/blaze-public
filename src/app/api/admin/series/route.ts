import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getCourseSeriesByCategory, hasSeriesAssignments } from "@/lib/db"
import { supabaseAdmin } from "@/lib/supabase"

// 获取所有系列（支持按 category 过滤）
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get("categoryId")
    const franchiseId = searchParams.get("franchiseId")

    if (categoryId) {
      const series = await getCourseSeriesByCategory(categoryId, franchiseId || undefined)
      return NextResponse.json(series, { status: 200 })
    }

    // 获取所有系列（可选按 franchise 过滤）
    let query = supabaseAdmin
      .from("course_series")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true })

    if (franchiseId) {
      query = query.eq("franchise_id", franchiseId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(error.message)
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

// 创建新系列（必须指定 category_id）
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { category_id, franchise_id, name, display_name, description, start_date, end_date, display_order } = body

    if (!category_id || !name || !display_name) {
      return NextResponse.json(
        { error: "Missing required fields: category_id, name, display_name" },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from("course_series")
      .insert({
        category_id,
        franchise_id: franchise_id || null,
        name,
        display_name,
        description,
        start_date,
        end_date,
        display_order: display_order || 0,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating series:", error)
      return NextResponse.json(
        { error: error.message || "Failed to create series" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error("Error creating series:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create series" },
      { status: 500 }
    )
  }
}

