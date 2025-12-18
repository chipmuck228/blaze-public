import { NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  getAllLearningPaths,
  createLearningPath,
} from "@/lib/db"

// 获取所有学习路径
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get("category_id")
    const isActive = searchParams.get("is_active")
    const difficultyLevel = searchParams.get("difficulty_level") as 'beginner' | 'intermediate' | 'advanced' | null

    const filters: {
      category_id?: string
      is_active?: boolean
      difficulty_level?: 'beginner' | 'intermediate' | 'advanced'
    } = {}

    if (categoryId) filters.category_id = categoryId
    if (isActive !== null) filters.is_active = isActive === 'true'
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

// 创建学习路径
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      slug,
      description,
      category_id,
      target_audience,
      estimated_duration_weeks,
      difficulty_level,
      is_active,
      display_order,
      courses,
    } = body

    if (!name) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 }
      )
    }

    const path = await createLearningPath(
      {
        name,
        slug: slug || null,
        description: description || null,
        category_id: category_id || null,
        target_audience: target_audience || null,
        estimated_duration_weeks: estimated_duration_weeks || null,
        difficulty_level: difficulty_level || null,
        is_active: is_active !== undefined ? is_active : true,
        display_order: display_order || 0,
      },
      courses || []
    )

    return NextResponse.json({ path }, { status: 201 })
  } catch (error: any) {
    console.error("Error creating learning path:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create learning path" },
      { status: 500 }
    )
  }
}

