import { NextResponse } from "next/server"
import { Webhook } from "standardwebhooks"
import { supabaseAdmin } from "@/lib/supabase"
import {
  deactivateSubscriberFromResendWebhook,
} from "@/lib/newsletter-resend-sync"
import { getResendWebhookSecret } from "@/lib/resend-newsletter"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type ResendWebhookPayload = {
  type: string
  created_at?: string
  data?: {
    email_id?: string
    broadcast_id?: string
    to?: string | string[]
    subject?: string
    bounce?: { message?: string; type?: string }
    failed?: { reason?: string }
  }
}

function normalizeRecipientTo(data: ResendWebhookPayload["data"]): string | null {
  const to = data?.to
  if (!to) return null
  if (Array.isArray(to)) return to[0]?.toLowerCase() ?? null
  return to.toLowerCase()
}

export async function POST(request: Request) {
  const secret = getResendWebhookSecret()
  if (!secret) {
    console.error("[resend-webhook] RESEND_WEBHOOK_SECRET not configured")
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 })
  }

  const rawBody = await request.text()

  try {
    const wh = new Webhook(secret)
    wh.verify(rawBody, {
      "webhook-id": request.headers.get("svix-id") ?? "",
      "webhook-timestamp": request.headers.get("svix-timestamp") ?? "",
      "webhook-signature": request.headers.get("svix-signature") ?? "",
    })
  } catch (err) {
    console.error("[resend-webhook] signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  let event: ResendWebhookPayload
  try {
    event = JSON.parse(rawBody) as ResendWebhookPayload
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const eventType = event.type
  const data = event.data ?? {}
  const emailId = data.email_id
  const broadcastId = data.broadcast_id
  const recipient = normalizeRecipientTo(data)

  try {
    if (eventType === "contact.unsubscribed" && recipient) {
      await deactivateSubscriberFromResendWebhook(recipient)
      return NextResponse.json({ received: true })
    }

    if (broadcastId) {
      const { data: campaign } = await supabaseAdmin
        .from("newsletter_campaigns")
        .select("id")
        .eq("resend_broadcast_id", broadcastId)
        .maybeSingle()

      if (campaign?.id && recipient) {
        if (
          eventType === "email.bounced" ||
          eventType === "email.complained" ||
          eventType === "email.failed"
        ) {
          const errorMessage =
            data.bounce?.message || data.failed?.reason || eventType

          await supabaseAdmin
            .from("newsletter_sends")
            .update({
              status: eventType === "email.bounced" ? "bounced" : "failed",
              error_message: errorMessage,
              resend_email_id: emailId ?? null,
              updated_at: new Date().toISOString(),
            })
            .eq("campaign_id", campaign.id)
            .eq("email", recipient)

          if (eventType === "email.bounced" || eventType === "email.complained") {
            await deactivateSubscriberFromResendWebhook(recipient)
          }
        } else if (
          eventType === "email.delivered" ||
          eventType === "email.sent"
        ) {
          await supabaseAdmin
            .from("newsletter_sends")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              resend_email_id: emailId ?? null,
              error_message: null,
            })
            .eq("campaign_id", campaign.id)
            .eq("email", recipient)
        }
      }

      return NextResponse.json({ received: true })
    }

    if (emailId) {
      const status =
        eventType === "email.bounced"
          ? "bounced"
          : eventType === "email.failed"
            ? "failed"
            : eventType === "email.delivered" || eventType === "email.sent"
              ? "sent"
              : null

      if (status) {
        const errorMessage =
          data.bounce?.message || data.failed?.reason || (status !== "sent" ? eventType : null)

        const sendUpdate: Record<string, string | null> = {
          status,
          error_message: errorMessage,
          resend_email_id: emailId,
          updated_at: new Date().toISOString(),
        }
        if (status === "sent") {
          sendUpdate.sent_at = new Date().toISOString()
        }

        await supabaseAdmin
          .from("newsletter_sends")
          .update(sendUpdate)
          .eq("resend_email_id", emailId)

        if (recipient && (status === "bounced" || eventType === "email.complained")) {
          await deactivateSubscriberFromResendWebhook(recipient)
        }
      }
    }
  } catch (err) {
    console.error("[resend-webhook] handler error:", err)
    return NextResponse.json({ error: "Handler failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
