import { NextResponse } from "next/server"
import { checkInstanceWaitlistAndNotify } from "@/lib/db"

// GET /api/cron/check-waitlist - 检查等待列表并通知（定时任务）
export async function GET(request: Request) {
  try {
    // 验证请求来源（可选：添加认证或IP白名单）
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const notifiedCount = await checkInstanceWaitlistAndNotify()

    return NextResponse.json({
      success: true,
      notified_count: notifiedCount,
      message: `Checked waitlist and notified ${notifiedCount} user(s)`,
    })
  } catch (error: any) {
    console.error("Error checking waitlist:", error)
    return NextResponse.json(
      { error: error.message || "Failed to check waitlist" },
      { status: 500 }
    )
  }
}

// POST /api/cron/check-waitlist - 手动触发（用于测试）
export async function POST(request: Request) {
  return GET(request)
}
