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
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { template_id, subject, test_email } = body

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
      throw campaignError
    }

    // 创建发送记录并发送邮件（异步处理）
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    
    // 批量创建发送记录
    const sendRecords = subscribers.map((subscriber) => ({
      campaign_id: campaign.id,
      subscriber_id: subscriber.id,
      email: subscriber.email,
      status: "pending",
    }))

    const { error: sendsError } = await supabaseAdmin
      .from("newsletter_sends")
      .insert(sendRecords)

    if (sendsError) {
      console.error("Error creating send records:", sendsError)
    }

    // 异步发送邮件（不阻塞响应）
    sendEmailsAsync(campaign.id, template, subscribers, finalSubject, baseUrl)

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
  baseUrl: string
) {
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
}
