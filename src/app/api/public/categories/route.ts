import { NextResponse } from "next/server"
import { getAllCourseCategories } from "@/lib/db"

// 获取所有活跃的课程类别（公开 API）
export async function GET() {
  try {
    // 获取所有活跃的类别（getAllCourseCategories 已经过滤了 is_active = true）
    const categories = await getAllCourseCategories()

    return NextResponse.json({ categories }, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching categories:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch categories" },
      { status: 500 }
    )
  }
}

