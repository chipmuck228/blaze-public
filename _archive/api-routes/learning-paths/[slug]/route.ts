import { NextResponse } from "next/server"
import { getLearningPathBySlug } from "../../../lib/learning-paths-db"

// 根据 slug 获取学习路径（公开 API）
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const path = await getLearningPathBySlug(slug)

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

