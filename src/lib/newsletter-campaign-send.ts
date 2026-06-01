import { supabaseAdmin } from "@/lib/supabase"
import { getErrorMessage } from "@/lib/typed-error"
import { sendNewsletterEmail } from "@/lib/email"
import {
  createAndSendNewsletterBroadcast,
  isResendBroadcastEnabled,
} from "@/lib/resend-newsletter"
import {
  getNewsletterBaseUrl,
  prepareNewsletterHtmlForSend,
} from "@/lib/newsletter-template-runtime"

export type CampaignSendSubscriber = {
  id: string
  email: string
  unsubscribe_token: string
}

export type CampaignSendResult = {
  sentCount: number
  failedCount: number
  deliveryMode: "resend_broadcast" | "resend_transactional" | "smtp"
}

/**
 * Send a campaign: Resend Broadcast when segment is configured, otherwise per-recipient send.
 */
export async function sendNewsletterCampaign(
  campaignId: string,
  template: { content_html: string; name?: string },
  subscribers: CampaignSendSubscriber[],
  subject: string,
  baseUrl?: string,
  userId?: string,
  options?: { scheduledAt?: string }
): Promise<CampaignSendResult> {
  const resolvedBaseUrl = baseUrl ?? getNewsletterBaseUrl()
  const totalRecipients = subscribers.length

  if (isResendBroadcastEnabled()) {
    try {
      const { broadcastId } = await createAndSendNewsletterBroadcast({
        subject,
        html: template.content_html,
        name: template.name || subject,
        scheduledAt: options?.scheduledAt,
      })

      const now = new Date().toISOString()
      await supabaseAdmin
        .from("newsletter_campaigns")
        .update({
          resend_broadcast_id: broadcastId,
          status: options?.scheduledAt ? "scheduled" : "sent",
          sent_at: options?.scheduledAt ? null : now,
          sent_count: totalRecipients,
          failed_count: 0,
          updated_at: now,
        })
        .eq("id", campaignId)

      await supabaseAdmin
        .from("newsletter_sends")
        .update({
          status: "sent",
          sent_at: now,
          error_message: null,
        })
        .eq("campaign_id", campaignId)

      if (userId) {
        await insertCampaignNotification(userId, campaignId, subject, totalRecipients, 0, "sent")
      }

      return {
        sentCount: totalRecipients,
        failedCount: 0,
        deliveryMode: "resend_broadcast",
      }
    } catch (error) {
      console.error("[sendNewsletterCampaign] Resend broadcast failed, falling back:", error)
    }
  }

  return sendNewsletterCampaignPerRecipient(
    campaignId,
    template,
    subscribers,
    subject,
    resolvedBaseUrl,
    userId
  )
}

async function sendNewsletterCampaignPerRecipient(
  campaignId: string,
  template: { content_html: string },
  subscribers: CampaignSendSubscriber[],
  subject: string,
  baseUrl: string,
  userId?: string
): Promise<CampaignSendResult> {
  let sentCount = 0
  let failedCount = 0
  const totalRecipients = subscribers.length
  let usedResend = false

  for (const subscriber of subscribers) {
    try {
      const content = prepareNewsletterHtmlForSend(template.content_html, {
        baseUrl,
        unsubscribeToken: subscriber.unsubscribe_token,
      })

      const result = await sendNewsletterEmail(subscriber.email, subject, content, {
        tags: [
          { name: "campaign_id", value: campaignId },
          { name: "subscriber_id", value: subscriber.id },
        ],
      })

      if (result.provider === "resend") {
        usedResend = true
      }

      await supabaseAdmin
        .from("newsletter_sends")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          resend_email_id: result.resendEmailId ?? null,
          error_message: null,
        })
        .eq("campaign_id", campaignId)
        .eq("subscriber_id", subscriber.id)

      sentCount++

      await supabaseAdmin
        .from("newsletter_campaigns")
        .update({
          sent_count: sentCount,
          failed_count: failedCount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaignId)
    } catch (error: unknown) {
      const message = error instanceof Error ? getErrorMessage(error) : "Send failed"
      console.error(`Failed to send to ${subscriber.email}:`, error)

      await supabaseAdmin
        .from("newsletter_sends")
        .update({
          status: "failed",
          error_message: message,
          updated_at: new Date().toISOString(),
        })
        .eq("campaign_id", campaignId)
        .eq("subscriber_id", subscriber.id)

      failedCount++

      await supabaseAdmin
        .from("newsletter_campaigns")
        .update({
          sent_count: sentCount,
          failed_count: failedCount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaignId)
    }
  }

  const finalStatus = failedCount === totalRecipients ? "failed" : "sent"
  await supabaseAdmin
    .from("newsletter_campaigns")
    .update({
      status: finalStatus,
      sent_at: new Date().toISOString(),
      sent_count: sentCount,
      failed_count: failedCount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId)

  if (userId) {
    await insertCampaignNotification(
      userId,
      campaignId,
      subject,
      sentCount,
      failedCount,
      finalStatus
    )
  }

  return {
    sentCount,
    failedCount,
    deliveryMode: usedResend ? "resend_transactional" : "smtp",
  }
}

async function insertCampaignNotification(
  userId: string,
  campaignId: string,
  subject: string,
  sentCount: number,
  failedCount: number,
  finalStatus: string
) {
  try {
    const total = sentCount + failedCount
    await supabaseAdmin.from("admin_notifications").insert({
      user_id: userId,
      type: finalStatus === "sent" ? "newsletter_sent" : "newsletter_failed",
      title:
        finalStatus === "sent"
          ? "Newsletter Sent Successfully"
          : "Newsletter Sending Failed",
      message:
        finalStatus === "sent"
          ? `Newsletter "${subject}" sent successfully. ${sentCount} emails sent, ${failedCount} failed.`
          : `Newsletter "${subject}" sending failed. ${failedCount} emails failed out of ${total}.`,
      data: {
        campaign_id: campaignId,
        subject,
        sent_count: sentCount,
        failed_count: failedCount,
      },
      is_read: false,
    })
  } catch (err) {
    console.error("[sendNewsletterCampaign] notification error:", err)
  }
}
