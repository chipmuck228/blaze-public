import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { checkUserPrerequisites } from "@/lib/db"

// 检查用户是否可以注册课程（验证先修条件）
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const result = await checkUserPrerequisites(userId, id)

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    console.error("Error checking prerequisites:", error)
    return NextResponse.json(
      { error: error.message || "Failed to check prerequisites" },
      { status: 500 }
    )
  }
}

