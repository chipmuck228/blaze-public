import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * GET /api/admin/notifications/stream
 * Server-Sent Events (SSE) 端点，用于实时推送通知更新
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return new Response("Unauthorized", { status: 401 })
    }

    const userId = session.user.id

    // 设置 SSE 响应头
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: string) => {
          try {
            controller.enqueue(encoder.encode(data))
          } catch (error) {
            console.error("[SSE] Error sending data:", error)
          }
        }

        // 发送初始连接消息
        send(`data: ${JSON.stringify({ type: "connected", message: "Connected to notification stream" })}\n\n`)

        // 定期检查新通知
        let lastCheckTime = new Date()
        let checkInterval: NodeJS.Timeout | null = null
        let heartbeatInterval: NodeJS.Timeout | null = null

        const cleanup = () => {
          if (checkInterval) {
            clearInterval(checkInterval)
            checkInterval = null
          }
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval)
            heartbeatInterval = null
          }
        }

        checkInterval = setInterval(async () => {
          try {
            const { data: newNotifications, error } = await supabaseAdmin
              .from("admin_notifications")
              .select("id, created_at")
              .eq("user_id", userId)
              .eq("is_read", false)
              .gt("created_at", lastCheckTime.toISOString())
              .order("created_at", { ascending: false })
              .limit(10)

            if (!error && newNotifications && newNotifications.length > 0) {
              // 有新通知，发送更新事件
              console.log(`[SSE] New notifications detected for user ${userId}: ${newNotifications.length}`)
              send(`data: ${JSON.stringify({ type: "new_notifications", count: newNotifications.length })}\n\n`)
              lastCheckTime = new Date()
            }
          } catch (error) {
            console.error("[SSE] Error checking notifications:", error)
          }
        }, 3000) // 每3秒检查一次

        // 保持连接活跃（发送心跳）
        heartbeatInterval = setInterval(() => {
          send(`: heartbeat\n\n`)
        }, 30000) // 每30秒发送一次心跳

        // 监听客户端断开连接
        request.signal.addEventListener("abort", () => {
          console.log("[SSE] Client disconnected")
          cleanup()
          try {
            controller.close()
          } catch (error) {
            // 忽略关闭错误
          }
        })
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no", // 禁用 Nginx 缓冲
      },
    })
  } catch (error: any) {
    console.error("Error setting up SSE stream:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}
