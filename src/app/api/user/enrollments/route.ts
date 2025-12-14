import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getUserEnrollments } from "@/lib/db"

// 获取用户的课程注册信息
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // 获取所有注册（包括已注册、等待列表等）
    const enrollments = await getUserEnrollments(session.user.id)

    return NextResponse.json(enrollments)
  } catch (error: any) {
    console.error("Error fetching enrollments:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch enrollments" },
      { status: 500 }
    )
  }
}

