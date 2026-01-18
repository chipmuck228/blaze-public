import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { sendNewsletterEmail } from "@/lib/email"

/**
 * 自动在邮件末尾添加退订链接
 */
function appendUnsubscribeLink(htmlContent: string, unsubscribeLink: string): string {
  const hasUnsubscribeLink = htmlContent.includes(unsubscribeLink) || 
                             htmlContent.includes('/newsletter/unsubscribe?token=')
  
  if (hasUnsubscribeLink) {
    return htmlContent
  }

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

  if (htmlContent.includes('</body>')) {
    return htmlContent.replace('</body>', `${unsubscribeFooter}</body>`)
  } else {
    return htmlContent + unsubscribeFooter
  }
}

/**
 * Cron Job: 处理定时发送的 Newsletter
 * 这个路由应该由 Vercel Cron Jobs 定期调用
 * 建议频率：每分钟检查一次
 */
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

    const now = new Date().toISOString()

    // 查询所有状态为 'scheduled' 且 scheduled_at <= 当前时间的 campaign
    const { data: campaigns, error: campaignsError } = await supabaseAdmin
      .from("newsletter_campaigns")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_at", now)

    if (campaignsError) {
      throw campaignsError
    }

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No scheduled campaigns to process",
        processed: 0,
        timestamp: now,
      })
    }

    let processedCount = 0
    const results = []

    // 处理每个 campaign
    for (const campaign of campaigns) {
      try {
        // 更新 campaign 状态为 'sending'
        await supabaseAdmin
          .from("newsletter_campaigns")
          .update({ status: "sending" })
          .eq("id", campaign.id)

        // 获取模板
        const { data: template, error: templateError } = await supabaseAdmin
          .from("newsletter_templates")
          .select("*")
          .eq("id", campaign.template_id)
          .single()

        if (templateError || !template) {
          throw new Error(`Template not found for campaign ${campaign.id}`)
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
          // 没有订阅者，更新状态为 sent（但 sent_count = 0）
          await supabaseAdmin
            .from("newsletter_campaigns")
            .update({
              status: "sent",
              sent_at: now,
              sent_count: 0,
              failed_count: 0,
            })
            .eq("id", campaign.id)

          results.push({
            campaign_id: campaign.id,
            status: "completed",
            message: "No active subscribers",
            sent_count: 0,
            failed_count: 0,
          })
          processedCount++
          continue
        }

        // 创建发送记录
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
          console.error(`Error creating send records for campaign ${campaign.id}:`, sendsError)
        }

        // 异步发送邮件
        const sendResult = await sendEmailsAsync(
          campaign.id,
          template,
          subscribers,
          campaign.subject,
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        )

        results.push({
          campaign_id: campaign.id,
          status: "completed",
          sent_count: sendResult.sentCount,
          failed_count: sendResult.failedCount,
        })

        processedCount++
      } catch (error: any) {
        console.error(`Error processing campaign ${campaign.id}:`, error)

        // 更新 campaign 状态为 failed
        await supabaseAdmin
          .from("newsletter_campaigns")
          .update({
            status: "failed",
            failed_count: campaign.total_recipients || 0,
          })
          .eq("id", campaign.id)

        results.push({
          campaign_id: campaign.id,
          status: "failed",
          error: error.message,
        })
      }
    }

    return NextResponse.json({
      success: true,
      processed: processedCount,
      results,
      timestamp: now,
    })
  } catch (error: any) {
    console.error("Error processing scheduled newsletters:", error)
    return NextResponse.json(
      { 
        error: error.message || "Failed to process scheduled newsletters",
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

// 异步发送邮件函数
async function sendEmailsAsync(
  campaignId: string,
  template: any,
  subscribers: Array<{ id: string; email: string; unsubscribe_token: string }>,
  subject: string,
  baseUrl: string
): Promise<{ sentCount: number; failedCount: number }> {
  let sentCount = 0
  let failedCount = 0

  for (const subscriber of subscribers) {
    try {
      const unsubscribeLink = `${baseUrl}/newsletter/unsubscribe?token=${subscriber.unsubscribe_token}`
      
      // 先替换模板中的占位符（如果存在）
      let content = template.content_html.replace(
        /{{unsubscribe_link}}/g,
        unsubscribeLink
      )
      
      // 自动在邮件末尾添加退订链接（如果还没有）
      content = appendUnsubscribeLink(content, unsubscribeLink)

      await sendNewsletterEmail(subscriber.email, subject, content)

      // 更新发送记录为成功
      await supabaseAdmin
        .from("newsletter_sends")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .eq("campaign_id", campaignId)
        .eq("subscriber_id", subscriber.id)

      sentCount++
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
    }
  }

  // 更新 campaign 状态
  await supabaseAdmin
    .from("newsletter_campaigns")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      sent_count: sentCount,
      failed_count: failedCount,
    })
    .eq("id", campaignId)

  return { sentCount, failedCount }
}
