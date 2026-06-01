import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAllCourseCategories, hasCategoryAssignments } from "@/lib/db"
import { supabaseAdmin } from "@/lib/supabase"

// 获取所有课程大类
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const categories = await getAllCourseCategories()
    return NextResponse.json(categories, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching categories:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch categories" },
      { status: 500 }
    )
  }
}

// 创建新大类
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, display_name, description, display_order, featured, poster_url, featured_slogan, featured_subtitle, featured_display_order, is_active } = body

    if (!name || !display_name) {
      return NextResponse.json(
        { error: "Missing required fields: name, display_name" },
        { status: 400 }
      )
    }

    // 验证：如果 featured = true，必须 is_active = true
    if (featured && !is_active) {
      return NextResponse.json(
        { error: "Category must be active to be featured" },
        { status: 400 }
      )
    }

    // 验证字符长度
    if (featured_slogan && featured_slogan.length > 100) {
      return NextResponse.json(
        { error: "Featured slogan must be 100 characters or less" },
        { status: 400 }
      )
    }
    if (featured_subtitle && featured_subtitle.length > 60) {
      return NextResponse.json(
        { error: "Featured subtitle must be 60 characters or less" },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from("course_categories")
      .insert({
        name,
        display_name,
        description,
        display_order: display_order || 0,
        is_active: is_active !== undefined ? is_active : true,
        featured: featured || false,
        poster_url: poster_url || null,
        featured_slogan: featured_slogan || null,
        featured_subtitle: featured_subtitle || null,
        featured_display_order: featured_display_order || 0,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating category:", error)
      return NextResponse.json(
        { error: error.message || "Failed to create category" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error("Error creating category:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create category" },
      { status: 500 }
    )
  }
}

