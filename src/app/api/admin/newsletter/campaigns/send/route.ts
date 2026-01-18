import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { sendNewsletterEmail } from "@/lib/email"

/**
 * 自动在邮件末尾添加退订链接
 * 如果邮件中已经包含退订链接（通过占位符或已存在），则不再添加
 */
function appendUnsubscribeLink(htmlContent: string, unsubscribeLink: string): string {
  // 检查是否已经包含退订链接
  const hasUnsubscribeLink = htmlContent.includes(unsubscribeLink) || 
                             htmlContent.includes('/newsletter/unsubscribe?token=')
  
  if (hasUnsubscribeLink) {
    return htmlContent
  }

  // 构建退订链接 HTML
  const unsubscribeFooter = `
    <div style="margin-top: 40px; padding: 20px; border-top: 1px solid #e0e0e0; text-align: center; font-size: 12px; color: #666;">
      <p style="margin: 0 0 10px 0;">
        You are receiving this email because you subscribed to our newsletter.
      </p>
      <p style="margin: 0;">
        <a href="${unsubscribeLink}" style="color: #666; text-decoration: underline;">
          Unsubscribe from this list
        </a>
      </p>
    </div>
  `

  // 尝试在 </body> 标签前插入，如果没有 </body>，则在末尾添加
  if (htmlContent.includes('</body>')) {
    return htmlContent.replace('</body>', `${unsubscribeFooter}</body>`)
  } else {
    return htmlContent + unsubscribeFooter
  }
}

export async function POST(request: Request) {
  console.log(`[POST /api/admin/newsletter/campaigns/send] Request received`)
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      console.log(`[POST /api/admin/newsletter/campaigns/send] Unauthorized`)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log(`[POST /api/admin/newsletter/campaigns/send] User authenticated: ${session.user.id}`)
    const body = await request.json()
    const { template_id, subject, test_email } = body
    console.log(`[POST /api/admin/newsletter/campaigns/send] Request body: template_id=${template_id}, test_email=${test_email || 'none'}`)

    if (!template_id) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      )
    }

    // 获取模板
    const { data: template, error: templateError } = await supabaseAdmin
      .from("newsletter_templates")
      .select("*")
      .eq("id", template_id)
      .single()

    if (templateError || !template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      )
    }

    // 如果是测试发送
    if (test_email) {
      try {
        const finalSubject = subject || template.subject
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        const testUnsubscribeLink = `${baseUrl}/newsletter/unsubscribe?token=test`
        
        // 先替换模板中的占位符（如果存在）
        let content = template.content_html.replace(
          /{{unsubscribe_link}}/g,
          testUnsubscribeLink
        )
        
        // 自动在邮件末尾添加退订链接（如果还没有）
        content = appendUnsubscribeLink(content, testUnsubscribeLink)

        await sendNewsletterEmail(test_email, finalSubject, content)
        return NextResponse.json(
          { success: true, message: "Test email sent successfully" },
          { status: 200 }
        )
      } catch (error: any) {
        return NextResponse.json(
          { error: `Failed to send test email: ${error.message}` },
          { status: 500 }
        )
      }
    }

    // 获取活跃订阅者
    const { data: subscribers, error: subscribersError } = await supabaseAdmin
      .from("newsletter_subscribers")
      .select("id, email, unsubscribe_token")
      .eq("is_active", true)

    if (subscribersError) {
      throw subscribersError
    }

    if (!subscribers || subscribers.length === 0) {
      return NextResponse.json(
        { error: "No active subscribers found" },
        { status: 400 }
      )
    }

    // 创建 campaign
    const finalSubject = subject || template.subject
    console.log(`[POST /api/admin/newsletter/campaigns/send] Creating campaign with ${subscribers.length} subscribers`)
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from("newsletter_campaigns")
      .insert({
        template_id: template.id,
        subject: finalSubject,
        status: "sending",
        total_recipients: subscribers.length,
        created_by: session.user.id,
      })
      .select()
      .single()

    if (campaignError) {
      console.error(`[POST /api/admin/newsletter/campaigns/send] Error creating campaign:`, campaignError)
      throw campaignError
    }
    
    console.log(`[POST /api/admin/newsletter/campaigns/send] Campaign created: ${campaign.id}`)

    // 创建发送记录并发送邮件（异步处理）
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    
    // 批量创建发送记录
    const sendRecords = subscribers.map((subscriber) => ({
      campaign_id: campaign.id,
      subscriber_id: subscriber.id,
      email: subscriber.email,
      status: "pending",
      retry_count: 0,
      is_permanent_failure: false,
    }))

    const { error: sendsError } = await supabaseAdmin
      .from("newsletter_sends")
      .insert(sendRecords)

    if (sendsError) {
      console.error("Error creating send records:", sendsError)
    }

    // 异步发送邮件（不阻塞响应）
    // 使用 .catch() 确保即使函数失败也不会导致未处理的 Promise rejection
    console.log(`[POST /api/admin/newsletter/campaigns/send] Starting sendEmailsAsync for campaign ${campaign.id} with ${subscribers.length} subscribers`)
    
    // 立即调用函数，不等待结果
    const sendPromise = sendEmailsAsync(campaign.id, template, subscribers, finalSubject, baseUrl, session.user.id)
    
    sendPromise.catch((error) => {
      console.error(`[POST /api/admin/newsletter/campaigns/send] sendEmailsAsync failed:`, error)
      console.error(`[POST /api/admin/newsletter/campaigns/send] Error stack:`, error.stack)
      // 确保即使函数失败，campaign 状态也会更新
      supabaseAdmin
        .from("newsletter_campaigns")
        .update({
          status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaign.id)
        .then(({ error }) => {
          if (error) {
            console.error(`[POST /api/admin/newsletter/campaigns/send] Failed to update campaign status after error:`, error)
          } else {
            console.log(`[POST /api/admin/newsletter/campaigns/send] Campaign ${campaign.id} marked as failed due to sendEmailsAsync error`)
          }
        })
    })
    
    // 添加一个延迟检查，确保函数开始执行
    setTimeout(async () => {
      const { data: checkCampaign } = await supabaseAdmin
        .from("newsletter_campaigns")
        .select("sent_count, failed_count, status")
        .eq("id", campaign.id)
        .single()
      
      if (checkCampaign && checkCampaign.sent_count === 0 && checkCampaign.failed_count === 0 && checkCampaign.status === "sending") {
        console.warn(`[POST /api/admin/newsletter/campaigns/send] Campaign ${campaign.id} still has 0 sent/failed after 5 seconds, sendEmailsAsync may not be executing`)
      }
    }, 5000)

    return NextResponse.json(
      {
        campaign_id: campaign.id,
        status: "sending",
        total_recipients: subscribers.length,
        message: "Newsletter sending started",
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error sending newsletter:", error)
    return NextResponse.json(
      { error: error.message || "Failed to send newsletter" },
      { status: 500 }
    )
  }
}

// 异步发送邮件函数
async function sendEmailsAsync(
  campaignId: string,
  template: any,
  subscribers: Array<{ id: string; email: string; unsubscribe_token: string }>,
  subject: string,
  baseUrl: string,
  userId?: string
) {
  let sentCount = 0
  let failedCount = 0
  const totalRecipients = subscribers.length

  console.log(`[sendEmailsAsync] Starting to send ${totalRecipients} emails for campaign ${campaignId}`)
  console.log(`[sendEmailsAsync] Campaign ID: ${campaignId}`)
  console.log(`[sendEmailsAsync] Template: ${template?.name || 'unknown'}`)
  console.log(`[sendEmailsAsync] Subject: ${subject}`)
  console.log(`[sendEmailsAsync] Base URL: ${baseUrl}`)
  console.log(`[sendEmailsAsync] Subscribers count: ${subscribers.length}`)

  try {
    for (let i = 0; i < subscribers.length; i++) {
      console.log(`[sendEmailsAsync] Processing subscriber ${i + 1}/${totalRecipients}: ${subscribers[i].email}`)
      const subscriber = subscribers[i]
      try {
        const unsubscribeLink = `${baseUrl}/newsletter/unsubscribe?token=${subscriber.unsubscribe_token}`
        
        // 先替换模板中的占位符（如果存在）
        let content = template.content_html.replace(
          /{{unsubscribe_link}}/g,
          unsubscribeLink
        )
        
        // 自动在邮件末尾添加退订链接（如果还没有）
        content = appendUnsubscribeLink(content, unsubscribeLink)

        console.log(`[sendEmailsAsync] Sending email to ${subscriber.email}...`)
        await sendNewsletterEmail(subscriber.email, subject, content)
        console.log(`[sendEmailsAsync] Email sent successfully to ${subscriber.email}`)

        // 更新发送记录为成功
        const { error: updateSendError } = await supabaseAdmin
          .from("newsletter_sends")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
          })
          .eq("campaign_id", campaignId)
          .eq("subscriber_id", subscriber.id)

        if (updateSendError) {
          console.error(`[sendEmailsAsync] Error updating send record for ${subscriber.email}:`, updateSendError)
        } else {
          sentCount++
          console.log(`[sendEmailsAsync] Send record updated for ${subscriber.email}, sentCount: ${sentCount}`)
        }

        // 立即更新 campaign 进度（每封邮件都更新，确保实时显示）
        const { error: campaignUpdateError } = await supabaseAdmin
          .from("newsletter_campaigns")
          .update({
            sent_count: sentCount,
            failed_count: failedCount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", campaignId)

        if (campaignUpdateError) {
          console.error(`[sendEmailsAsync] Error updating campaign progress:`, campaignUpdateError)
        } else {
          console.log(`[sendEmailsAsync] Campaign progress updated: ${sentCount} sent, ${failedCount} failed`)
        }
      } catch (error: any) {
        console.error(`Failed to send to ${subscriber.email}:`, error)

        // 更新发送记录为失败
        await supabaseAdmin
          .from("newsletter_sends")
          .update({
            status: "failed",
            error_message: error.message,
            retry_count: 0,
            is_permanent_failure: false,
            updated_at: new Date().toISOString(),
          })
          .eq("campaign_id", campaignId)
          .eq("subscriber_id", subscriber.id)

        failedCount++

        // 立即更新 campaign 进度（每封邮件都更新，确保实时显示）
        const { error: campaignUpdateError } = await supabaseAdmin
          .from("newsletter_campaigns")
          .update({
            sent_count: sentCount,
            failed_count: failedCount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", campaignId)

        if (campaignUpdateError) {
          console.error(`[sendEmailsAsync] Error updating campaign progress after failure:`, campaignUpdateError)
        } else {
          console.log(`[sendEmailsAsync] Campaign progress updated after failure: ${sentCount} sent, ${failedCount} failed`)
        }
      }
    }

    // 确保所有邮件都已处理
    const processedCount = sentCount + failedCount
    console.log(`[sendEmailsAsync] Campaign ${campaignId} processing complete: ${sentCount} sent, ${failedCount} failed, ${processedCount}/${totalRecipients} processed`)

    // 更新 campaign 状态为完成
    const finalStatus = failedCount === totalRecipients ? "failed" : "sent"
    
    // 强制更新状态，即使有错误也要更新
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from("newsletter_campaigns")
      .update({
        status: finalStatus,
        sent_at: new Date().toISOString(),
        sent_count: sentCount,
        failed_count: failedCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId)
      .select()

    if (updateError) {
      console.error(`[sendEmailsAsync] Error updating campaign status:`, updateError)
      // 重试一次
      const { error: retryError } = await supabaseAdmin
        .from("newsletter_campaigns")
        .update({
          status: finalStatus,
          sent_count: sentCount,
          failed_count: failedCount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaignId)
      
      if (retryError) {
        console.error(`[sendEmailsAsync] Retry update also failed:`, retryError)
      } else {
        console.log(`[sendEmailsAsync] Campaign ${campaignId} status updated on retry: ${finalStatus}`)
      }
    } else {
      console.log(`[sendEmailsAsync] Campaign ${campaignId} completed successfully with status: ${finalStatus}`, updateData)
    }

    // 创建通知（如果提供了 userId）
    if (userId) {
      try {
        const notificationTitle = finalStatus === "sent" 
          ? "Newsletter Sent Successfully"
          : "Newsletter Sending Failed"
        
        const notificationMessage = finalStatus === "sent"
          ? `Newsletter "${subject}" sent successfully. ${sentCount} emails sent, ${failedCount} failed.`
          : `Newsletter "${subject}" sending failed. ${failedCount} emails failed out of ${totalRecipients}.`

        const { error: notificationError } = await supabaseAdmin.from("admin_notifications").insert({
          user_id: userId,
          type: finalStatus === "sent" ? "newsletter_sent" : "newsletter_failed",
          title: notificationTitle,
          message: notificationMessage,
          data: {
            campaign_id: campaignId,
            subject: subject,
            total_recipients: totalRecipients,
            sent_count: sentCount,
            failed_count: failedCount,
          },
          is_read: false,
        })

        if (notificationError) {
          console.error(`[sendEmailsAsync] Error creating notification:`, notificationError)
        }
      } catch (notificationErr: any) {
        console.error(`[sendEmailsAsync] Error creating notification:`, notificationErr)
      }
    }
  } catch (error: any) {
    // 如果整个函数执行失败，确保更新 campaign 状态为 failed
    console.error(`[sendEmailsAsync] Fatal error in sendEmailsAsync:`, error)
    
    try {
      await supabaseAdmin
        .from("newsletter_campaigns")
        .update({
          status: "failed",
          failed_count: totalRecipients,
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaignId)
      
      console.log(`[sendEmailsAsync] Campaign ${campaignId} marked as failed due to fatal error`)
    } catch (updateErr: any) {
      console.error(`[sendEmailsAsync] Error updating campaign status after fatal error:`, updateErr)
    }
  }
}
