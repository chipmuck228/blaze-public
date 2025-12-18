import { NextResponse } from "next/server"
import { getAllLearningPaths } from "@/lib/db"

// 获取所有活跃的学习路径（公开 API）
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get("category_id")
    const difficultyLevel = searchParams.get("difficulty_level") as 'beginner' | 'intermediate' | 'advanced' | null

    const filters: {
      category_id?: string
      is_active?: boolean
      difficulty_level?: 'beginner' | 'intermediate' | 'advanced'
    } = {
      is_active: true, // 只返回活跃的路径
    }

    if (categoryId) filters.category_id = categoryId
    if (difficultyLevel) filters.difficulty_level = difficultyLevel

    const paths = await getAllLearningPaths(filters)

    return NextResponse.json({ paths }, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching learning paths:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch learning paths" },
      { status: 500 }
    )
  }
}

