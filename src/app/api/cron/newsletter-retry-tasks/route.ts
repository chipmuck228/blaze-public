import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * GET /api/cron/newsletter-retry-tasks
 * Cron Job: 处理待处理的重发任务
 * 每分钟执行一次，处理状态为 'pending' 的任务
 */
export async function GET(request: Request) {
  try {
    // 验证 Cron Secret（如果设置了）
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 查询所有待处理的任务
    const { data: pendingTasks, error: fetchError } = await supabaseAdmin
      .from("newsletter_retry_tasks")
      .select("id")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(10) // 每次最多处理 10 个任务

    if (fetchError) {
      throw fetchError
    }

    if (!pendingTasks || pendingTasks.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        message: "No pending tasks",
      })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const results = []

    // 逐个处理任务
    for (const task of pendingTasks) {
      try {
        // 调用任务处理器
        const response = await fetch(
          `${baseUrl}/api/admin/newsletter/failed-sends/retry-tasks/process`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ task_id: task.id }),
          }
        )

        if (response.ok) {
          results.push({
            task_id: task.id,
            status: "processed",
          })
        } else {
          const errorData = await response.json()
          results.push({
            task_id: task.id,
            status: "failed",
            error: errorData.error,
          })
        }
      } catch (error: unknown) {
        console.error(`Error processing task ${task.id}:`, error)
        results.push({
          task_id: task.id,
          status: "error",
          error: getErrorMessage(error),
        })
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    console.error("Error processing retry tasks:", error)
    return NextResponse.json(
      {
        error: getErrorMessage(error) || "Failed to process retry tasks",
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
