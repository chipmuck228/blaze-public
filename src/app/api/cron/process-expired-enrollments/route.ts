import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { processExpiredEnrollments, checkWaitlistAndNotify } from "@/lib/db"

// 后台任务：处理过期的注册
// 这个路由应该由 Vercel Cron Jobs 或 Supabase Edge Functions 定期调用
// 建议频率：每 1-5 分钟

export async function GET(request: Request) {
  try {
    // 验证请求来源（可选，增加安全性）
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // 处理过期的注册
    const expiredResult = await processExpiredEnrollments()

    // 检查等待列表并通知
    const notifiedCount = await checkWaitlistAndNotify()

    return NextResponse.json({
      success: true,
      expired: expiredResult,
      waitlist_notified: notifiedCount,
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    console.error("Error processing expired enrollments:", error)
    return NextResponse.json(
      { 
        error: getErrorMessage(error) || "Failed to process expired enrollments",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// 也支持 POST 方法（某些 cron 服务使用 POST）
export async function POST(request: Request) {
  return GET(request)
}

