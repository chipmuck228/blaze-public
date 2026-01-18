import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * POST /api/admin/newsletter/failed-sends/retry
 * 创建异步重发任务（异步模式）
 */
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { send_ids, campaign_id } = body

    if (!send_ids && !campaign_id) {
      return NextResponse.json(
        { error: "Either send_ids or campaign_id is required" },
        { status: 400 }
      )
    }

    let sendIds: string[] = []

    if (campaign_id) {
      // 获取该 campaign 的所有失败邮件
      const { data: failedSends, error: fetchError } = await supabaseAdmin
        .from("newsletter_sends")
        .select("id")
        .eq("campaign_id", campaign_id)
        .eq("status", "failed")

      if (fetchError) {
        throw fetchError
      }

      sendIds = (failedSends || []).map((s: any) => s.id)
    } else if (send_ids && Array.isArray(send_ids)) {
      sendIds = send_ids
    } else {
      return NextResponse.json(
        { error: "send_ids must be an array" },
        { status: 400 }
      )
    }

    if (sendIds.length === 0) {
      return NextResponse.json(
        { error: "No failed sends to retry" },
        { status: 400 }
      )
    }

    // 创建重发任务记录
    const { data: task, error: taskError } = await supabaseAdmin
      .from("newsletter_retry_tasks")
      .insert({
        user_id: session.user.id,
        task_type: "retry_failed_sends",
        send_ids: sendIds,
        campaign_id: campaign_id || null,
        status: "pending",
        total_count: sendIds.length,
        processed_count: 0,
        success_count: 0,
        failed_count: 0,
        skipped_count: 0,
      })
      .select()
      .single()

    if (taskError || !task) {
      console.error("Error creating retry task:", taskError)
      return NextResponse.json(
        { error: "Failed to create retry task" },
        { status: 500 }
      )
    }

    // 触发后台处理（不等待完成）
    // 使用 fetch 异步调用，不阻塞响应
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!baseUrl) {
      // 在 Vercel 环境中，使用 VERCEL_URL
      if (process.env.VERCEL_URL) {
        baseUrl = `https://${process.env.VERCEL_URL}`
      } else {
        baseUrl = "http://localhost:3000"
      }
    }
    
    console.log(`[Retry API] Triggering task processing for task ${task.id} via ${baseUrl}/api/admin/newsletter/failed-sends/retry-tasks/process`)
    
    fetch(`${baseUrl}/api/admin/newsletter/failed-sends/retry-tasks/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // 添加内部调用标识
        "X-Internal-Request": "true",
      },
      body: JSON.stringify({ task_id: task.id }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorText = await response.text()
          console.error(`[Retry API] Task processing failed: ${response.status} - ${errorText}`)
        } else {
          const result = await response.json()
          console.log(`[Retry API] Task processing triggered successfully:`, result)
        }
      })
      .catch((error) => {
        console.error(`[Retry API] Error triggering task processing:`, error)
        console.error(`[Retry API] Error details:`, {
          message: error.message,
          stack: error.stack,
          baseUrl,
          taskId: task.id,
        })
        // 不抛出错误，任务会在下次 cron 运行时处理
      })

    return NextResponse.json(
      {
        success: true,
        task_id: task.id,
        status: "pending",
        message: "Retry task created. You will be notified when it completes.",
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error creating retry task:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create retry task" },
      { status: 500 }
    )
  }
}
