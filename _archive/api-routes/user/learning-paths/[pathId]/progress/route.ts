import { NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  calculateLearningPathProgress,
  getUserLearningPathProgress,
} from "../../../../lib/learning-paths-db"

// 获取用户的学习路径进度
export async function GET(
  request: Request,
  { params }: { params: Promise<{ pathId: string }> }
) {
  try {
    const { pathId } = await params
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 获取数据库中的进度记录
    const progressRecords = await getUserLearningPathProgress(session.user.id, pathId)
    
    // 实时计算进度（更准确）
    const calculatedProgress = await calculateLearningPathProgress(session.user.id, pathId)

    return NextResponse.json({
      progress: calculatedProgress,
      record: progressRecords[0] || null,
    }, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching learning path progress:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch learning path progress" },
      { status: 500 }
    )
  }
}

