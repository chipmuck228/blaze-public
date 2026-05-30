import {
  isResendBroadcastEnabled,
  isResendNewsletterEnabled,
} from "@/lib/resend-newsletter"

export type NewsletterDeliveryConfig = {
  provider: "resend" | "smtp"
  resendConfigured: boolean
  broadcastEnabled: boolean
  webhookConfigured: boolean
  segmentConfigured: boolean
  bulkSendMode: "broadcast" | "per_recipient"
  resendDashboardUrl: string
}

export type CampaignDeliveryInfo = {
  mode: "broadcast" | "per_recipient"
  label: string
  resendBroadcastId: string | null
}

export function getNewsletterDeliveryConfig(): NewsletterDeliveryConfig {
  const resendConfigured = isResendNewsletterEnabled()
  const broadcastEnabled = isResendBroadcastEnabled()

  return {
    provider: resendConfigured ? "resend" : "smtp",
    resendConfigured,
    broadcastEnabled,
    webhookConfigured: Boolean(process.env.RESEND_WEBHOOK_SECRET),
    segmentConfigured: Boolean(
      process.env.RESEND_NEWSLETTER_SEGMENT_ID ||
        process.env.RESEND_NEWSLETTER_AUDIENCE_ID
    ),
    bulkSendMode: broadcastEnabled ? "broadcast" : "per_recipient",
    resendDashboardUrl: "https://resend.com/emails",
  }
}

export function getCampaignDeliveryInfo(campaign: {
  resend_broadcast_id?: string | null
}): CampaignDeliveryInfo {
  const mode = campaign.resend_broadcast_id ? "broadcast" : "per_recipient"
  return {
    mode,
    label: mode === "broadcast" ? "Resend Broadcast" : "Per-recipient",
    resendBroadcastId: campaign.resend_broadcast_id ?? null,
  }
}
