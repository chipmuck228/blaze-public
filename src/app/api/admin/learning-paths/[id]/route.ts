import { NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  getLearningPathById,
  updateLearningPath,
  deleteLearningPath,
} from "@/lib/db"

// 获取单个学习路径
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

    const path = await getLearningPathById(id)

    if (!path) {
      return NextResponse.json({ error: "Learning path not found" }, { status: 404 })
    }

    return NextResponse.json({ path }, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching learning path:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch learning path" },
      { status: 500 }
    )
  }
}

// 更新学习路径
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

    const path = await updateLearningPath(
      id,
      {
        name,
        slug,
        description,
        category_id,
        target_audience,
        estimated_duration_weeks,
        difficulty_level,
        is_active,
        display_order,
      },
      courses
    )

    return NextResponse.json({ path }, { status: 200 })
  } catch (error: any) {
    console.error("Error updating learning path:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update learning path" },
      { status: 500 }
    )
  }
}

// 删除学习路径
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

    await deleteLearningPath(id)

    return NextResponse.json({ message: "Learning path deleted successfully" }, { status: 200 })
  } catch (error: any) {
    console.error("Error deleting learning path:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete learning path" },
      { status: 500 }
    )
  }
}

