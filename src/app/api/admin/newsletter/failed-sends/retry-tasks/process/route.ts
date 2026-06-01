import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { supabaseAdmin } from "@/lib/supabase"
import { sendNewsletterEmail } from "@/lib/email"
import { prepareNewsletterHtmlForSend } from "@/lib/newsletter-template-runtime"

/**
 * POST /api/admin/newsletter/failed-sends/retry-tasks/process
 * 后台任务处理器（处理重发任务）
 */
export async function POST(request: Request) {
  let taskId: string | null = null
  
  console.log(`[Process API] Received request to process retry task`)
  
  try {
    // 尝试从 body 获取 task_id
    try {
      const body = await request.json()
      taskId = body?.task_id || null
      console.log(`[Process API] Task ID from body: ${taskId}`)
    } catch (error) {
      console.log(`[Process API] Failed to parse body, trying URL params:`, error)
      // 如果无法解析 body，尝试从 URL 参数获取
      const url = new URL(request.url)
      taskId = url.searchParams.get("task_id")
      console.log(`[Process API] Task ID from URL: ${taskId}`)
    }

    if (!taskId) {
      console.error(`[Process API] No task_id provided`)
      return NextResponse.json(
        { error: "task_id is required" },
        { status: 400 }
      )
    }

    console.log(`[Process API] Processing task: ${taskId}`)

    // 获取任务
    console.log(`[Process API] Fetching task ${taskId} from database`)
    const { data: task, error: taskError } = await supabaseAdmin
      .from("newsletter_retry_tasks")
      .select("*")
      .eq("id", taskId)
      .eq("status", "pending")
      .single()

    if (taskError || !task) {
      console.error(`[Process API] Task fetch error:`, taskError)
      if (taskError?.code === "PGRST116") {
        console.log(`[Process API] Task not found or already processed`)
        return NextResponse.json(
          { error: "Task not found or already processed" },
          { status: 404 }
        )
      }
      throw taskError
    }

    console.log(`[Process API] Task found:`, {
      id: task.id,
      send_ids_count: task.send_ids?.length || 0,
      total_count: task.total_count,
    })

    // 更新任务状态为 processing
    await supabaseAdmin
      .from("newsletter_retry_tasks")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)

    const sendIds = task.send_ids || []
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    let successCount = 0
    let failedCount = 0
    let skippedCount = 0
    let processedCount = 0

    // 获取要重发的邮件记录
    console.log(`[Process API] Fetching ${sendIds.length} failed sends from database`)
    const { data: sendsToRetry, error: sendsError } = await supabaseAdmin
      .from("newsletter_sends")
      .select(
        `
        id,
        campaign_id,
        subscriber_id,
        email,
        retry_count,
        is_permanent_failure,
        campaign:newsletter_campaigns!campaign_id (
          id,
          template_id,
          subject,
          template:newsletter_templates!template_id (
            id,
            content_html
          )
        ),
        subscriber:newsletter_subscribers!subscriber_id (
          id,
          email,
          is_active,
          unsubscribe_token
        )
      `
      )
      .in("id", sendIds)
      .eq("status", "failed")

    if (sendsError) {
      console.error(`[Process API] Error fetching sends:`, sendsError)
      throw sendsError
    }

    console.log(`[Process API] Found ${sendsToRetry?.length || 0} sends to retry`)

    // 逐个处理邮件重发
    for (const send of sendsToRetry || []) {
      try {
        processedCount++

        // 检查是否应该跳过
        if (send.is_permanent_failure) {
          skippedCount++
          continue
        }

        if ((send.retry_count || 0) >= 3) {
          // 标记为永久失败
          await supabaseAdmin
            .from("newsletter_sends")
            .update({
              is_permanent_failure: true,
              updated_at: new Date().toISOString(),
            })
            .eq("id", send.id)
          skippedCount++
          continue
        }

        // 检查订阅者是否仍然活跃
        const subscriber = send.subscriber as any
        if (!subscriber || !subscriber.is_active) {
          // 标记为永久失败（订阅者已退订）
          await supabaseAdmin
            .from("newsletter_sends")
            .update({
              is_permanent_failure: true,
              updated_at: new Date().toISOString(),
            })
            .eq("id", send.id)
          skippedCount++
          continue
        }

        // 获取 campaign 和 template
        const campaign = send.campaign as any
        if (!campaign || !campaign.template) {
          failedCount++
          continue
        }

        const template = campaign.template as any
        const subject = campaign.subject || "Newsletter"

        // 准备邮件内容
        const content = prepareNewsletterHtmlForSend(template.content_html, {
          baseUrl,
          unsubscribeToken: subscriber.unsubscribe_token,
        })

        console.log(`[Process API] Sending email to ${subscriber.email} for send ${send.id}`)
        const sendResult = await sendNewsletterEmail(subscriber.email, subject, content, {
          tags: [
            { name: "campaign_id", value: campaign.id },
            { name: "subscriber_id", value: subscriber.id },
          ],
        })
        console.log(`[Process API] Email sent successfully to ${subscriber.email}`)

        // 更新发送记录为成功
        await supabaseAdmin
          .from("newsletter_sends")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            resend_email_id: sendResult.resendEmailId ?? null,
            error_message: null,
            retry_count: (send.retry_count || 0) + 1,
            last_retry_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", send.id)

        successCount++
      } catch (error: unknown) {
        console.error(`Failed to retry send ${send.id}:`, error)

        // 更新重试次数和错误信息
        await supabaseAdmin
          .from("newsletter_sends")
          .update({
            retry_count: (send.retry_count || 0) + 1,
            last_retry_at: new Date().toISOString(),
            error_message: getErrorMessage(error) || "Retry failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", send.id)

        failedCount++
      }

      // 更新任务进度（每处理 10 个邮件更新一次）
      if (processedCount % 10 === 0) {
        await supabaseAdmin
          .from("newsletter_retry_tasks")
          .update({
            processed_count: processedCount,
            success_count: successCount,
            failed_count: failedCount,
            skipped_count: skippedCount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", taskId)
      }
    }

    // 更新任务状态为 completed
    await supabaseAdmin
      .from("newsletter_retry_tasks")
      .update({
        status: "completed",
        processed_count: processedCount,
        success_count: successCount,
        failed_count: failedCount,
        skipped_count: skippedCount,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)

    // 创建通知
    console.log(`[Process API] Creating notification for user ${task.user_id}`)
    const notificationTitle = "Retry Task Completed"
    const notificationMessage = `Successfully retried ${successCount} out of ${processedCount} failed emails. ${failedCount} failed, ${skippedCount} skipped.`

    const { error: notificationError } = await supabaseAdmin.from("admin_notifications").insert({
      user_id: task.user_id,
      type: "retry_task_completed",
      title: notificationTitle,
      message: notificationMessage,
      data: {
        task_id: taskId,
        total_count: processedCount,
        success_count: successCount,
        failed_count: failedCount,
        skipped_count: skippedCount,
      },
      is_read: false,
    })

    if (notificationError) {
      console.error(`[Process API] Error creating notification:`, notificationError)
    } else {
      console.log(`[Process API] Notification created successfully`)
    }

    return NextResponse.json(
      {
        success: true,
        task_id: taskId,
        processed_count: processedCount,
        success_count: successCount,
        failed_count: failedCount,
        skipped_count: skippedCount,
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error("Error processing retry task:", error)

    // 如果任务存在，更新为失败状态
    if (taskId) {
      try {
        await supabaseAdmin
          .from("newsletter_retry_tasks")
          .update({
            status: "failed",
            error_message: getErrorMessage(error) || "Task processing failed",
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", taskId)

        // 创建失败通知
        const { data: task } = await supabaseAdmin
          .from("newsletter_retry_tasks")
          .select("user_id")
          .eq("id", taskId)
          .single()

        if (task) {
          const { error: notificationInsertError } = await supabaseAdmin
            .from("admin_notifications")
            .insert({
              user_id: task.user_id,
              type: "retry_task_failed",
              title: "Retry Task Failed",
              message: `Retry task failed: ${getErrorMessage(error) || "Unknown error"}`,
              data: {
                task_id: taskId,
                error_message: getErrorMessage(error),
              },
              is_read: false,
            })

          if (notificationInsertError) {
            console.error("Error creating failure notification:", notificationInsertError)
          }
        }
      } catch (updateError: unknown) {
        console.error("Error updating task status:", updateError)
      }
    }

    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to process retry task" },
      { status: 500 }
    )
  }
}
