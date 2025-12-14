import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { processExpiredEnrollments, checkWaitlistAndNotify } from "@/lib/db"

// POST: 处理过期的注册（后台任务）
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // 检查管理员权限
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Forbidden. Admin access required." },
        { status: 403 }
      )
    }

    // 处理过期的注册
    const expiredResult = await processExpiredEnrollments()

    // 检查等待列表并通知
    const notifiedCount = await checkWaitlistAndNotify()

    return NextResponse.json({
      expired: expiredResult,
      waitlist_notified: notifiedCount,
      message: "Processed expired enrollments and checked waitlist",
    })
  } catch (error: any) {
    console.error("Error processing expired enrollments:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process expired enrollments" },
      { status: 500 }
    )
  }
}

