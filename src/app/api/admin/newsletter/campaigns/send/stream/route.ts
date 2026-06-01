import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * GET /api/admin/newsletter/campaigns/send/stream
 * SSE endpoint for real-time newsletter sending progress
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return new Response("Unauthorized", { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get("campaign_id")

    if (!campaignId) {
      return new Response("campaign_id is required", { status: 400 })
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: string) => {
          controller.enqueue(encoder.encode(data))
        }

        send(`data: ${JSON.stringify({ type: "connected", message: "Connected to campaign stream" })}\n\n`)

        let lastSentCount = 0
        let lastFailedCount = 0
        const checkInterval = setInterval(async () => {
          try {
            const { data: campaign, error } = await supabaseAdmin
              .from("newsletter_campaigns")
              .select("id, status, sent_count, failed_count, total_recipients, created_at")
              .eq("id", campaignId)
              .single()

            if (error) {
              console.error(`[SSE] Error fetching campaign ${campaignId}:`, error)
              return
            }

            if (campaign) {
              const sentCount = campaign.sent_count || 0
              const failedCount = campaign.failed_count || 0
              const totalRecipients = campaign.total_recipients || 0
              const status = campaign.status
              const processedCount = sentCount + failedCount

              console.log(`[SSE] Campaign ${campaignId} check: status=${status}, sent=${sentCount}, failed=${failedCount}, total=${totalRecipients}, processed=${processedCount}`)

              // 如果发送完成，立即发送完成事件并退出
              if (status === "sent" || status === "failed") {
                const progress = totalRecipients > 0 
                  ? Math.round(((sentCount + failedCount) / totalRecipients) * 100)
                  : 100

                console.log(`[SSE] Campaign ${campaignId} completed with status: ${status}`)
                
                send(`data: ${JSON.stringify({
                  type: "completed",
                  campaign_id: campaignId,
                  sent_count: sentCount,
                  failed_count: failedCount,
                  total_recipients: totalRecipients,
                  status: status,
                  progress: progress,
                })}\n\n`)
                
                // 清理定时器
                clearInterval(checkInterval)
                clearInterval(heartbeatInterval)
                
                // 延迟关闭连接，确保客户端收到 completed 事件
                setTimeout(() => {
                  try {
                    controller.close()
                  } catch (error) {
                    // 忽略已关闭的错误（Controller is already closed）
                    console.log("[SSE] Controller already closed, ignoring error")
                  }
                }, 100)
                return // 退出检查循环
              }

              // 检查是否所有邮件都已处理（sent + failed >= total）
              if (processedCount >= totalRecipients && totalRecipients > 0 && status === "sending") {
                // 所有邮件都已处理，但状态还是 sending，可能是状态更新延迟
                // 尝试自动更新状态
                console.log(`[SSE] Campaign ${campaignId} all emails processed (${processedCount}/${totalRecipients}) but status still sending, attempting to update status`)
                
                const autoFinalStatus = failedCount === totalRecipients ? "failed" : "sent"
                const { error: autoUpdateError } = await supabaseAdmin
                  .from("newsletter_campaigns")
                  .update({
                    status: autoFinalStatus,
                    sent_count: sentCount,
                    failed_count: failedCount,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", campaignId)
                
                if (autoUpdateError) {
                  console.error(`[SSE] Failed to auto-update campaign status:`, autoUpdateError)
                } else {
                  console.log(`[SSE] Campaign ${campaignId} status auto-updated to: ${autoFinalStatus}`)
                  // 发送 completed 事件
                  send(`data: ${JSON.stringify({
                    type: "completed",
                    campaign_id: campaignId,
                    sent_count: sentCount,
                    failed_count: failedCount,
                    total_recipients: totalRecipients,
                    status: autoFinalStatus,
                    progress: 100,
                  })}\n\n`)
                  
                  clearInterval(checkInterval)
                  clearInterval(heartbeatInterval)
                  setTimeout(() => {
                    try {
                      controller.close()
                    } catch (error) {
                      console.log("[SSE] Controller already closed, ignoring error")
                    }
                  }, 100)
                  return
                }
              }
              
              // 检查 campaign 是否卡住了（超过30分钟没有进度）
              if (campaign.created_at) {
                const createdAt = new Date(campaign.created_at)
                const now = new Date()
                const minutesSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60)
                
                if (minutesSinceCreation > 30 && processedCount === 0 && status === "sending") {
                  console.warn(`[SSE] Campaign ${campaignId} appears to be stuck (created ${minutesSinceCreation.toFixed(1)} minutes ago with no progress), marking as failed`)
                  
                  const { error: stuckUpdateError } = await supabaseAdmin
                    .from("newsletter_campaigns")
                    .update({
                      status: "failed",
                      failed_count: totalRecipients,
                      updated_at: new Date().toISOString(),
                    })
                    .eq("id", campaignId)
                  
                  if (!stuckUpdateError) {
                    send(`data: ${JSON.stringify({
                      type: "completed",
                      campaign_id: campaignId,
                      sent_count: 0,
                      failed_count: totalRecipients,
                      total_recipients: totalRecipients,
                      status: "failed",
                      progress: 100,
                    })}\n\n`)
                    
                    clearInterval(checkInterval)
                    clearInterval(heartbeatInterval)
                    setTimeout(() => {
                      try {
                        controller.close()
                      } catch (error) {
                        console.log("[SSE] Controller already closed, ignoring error")
                      }
                    }, 100)
                    return
                  }
                }
              }

              // 如果计数有变化或状态变化，发送进度更新
              // 注意：即使计数没有变化，如果状态不是 completed，也要发送进度更新（确保前端显示最新状态）
              if (sentCount !== lastSentCount || failedCount !== lastFailedCount || status !== "sending") {
                const progress = totalRecipients > 0 
                  ? Math.round(((sentCount + failedCount) / totalRecipients) * 100)
                  : 0

                console.log(`[SSE] Sending progress update: ${sentCount} sent, ${failedCount} failed, ${progress}%`)

                send(`data: ${JSON.stringify({
                  type: "progress",
                  campaign_id: campaignId,
                  sent_count: sentCount,
                  failed_count: failedCount,
                  total_recipients: totalRecipients,
                  progress: progress,
                  status: status,
                })}\n\n`)

                lastSentCount = sentCount
                lastFailedCount = failedCount
              }
            }
          } catch (error) {
            console.error("[SSE] Error checking campaign:", error)
          }
        }, 2000) // 每2秒检查一次

        const heartbeatInterval = setInterval(() => {
          send(`: heartbeat\n\n`)
        }, 30000) // 每30秒发送心跳

        request.signal.addEventListener("abort", () => {
          console.log("[SSE] Client disconnected, cleaning up intervals.")
          clearInterval(checkInterval)
          clearInterval(heartbeatInterval)
          controller.close()
        })
      },
      cancel() {
        console.log("[SSE] Stream cancelled by client or server.")
      }
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    })
  } catch (error: unknown) {
    console.error("Error setting up SSE stream:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}
