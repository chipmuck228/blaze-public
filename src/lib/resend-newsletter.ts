import { Resend } from "resend"
import { getErrorMessage } from "@/lib/typed-error"
import { prepareNewsletterHtmlForSend } from "@/lib/newsletter-template-runtime"

/** Resend placeholder for marketing broadcasts (per-contact unsubscribe URL). */
export const RESEND_UNSUBSCRIBE_PLACEHOLDER = "{{{RESEND_UNSUBSCRIBE_URL}}}"

let resendClient: Resend | null = null

export function isResendNewsletterEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY && getResendNewsletterFrom())
}

export function isResendBroadcastEnabled(): boolean {
  return isResendNewsletterEnabled() && Boolean(getResendNewsletterSegmentId())
}

export function getResendClient(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured")
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

export function getResendNewsletterFrom(): string | undefined {
  return process.env.RESEND_NEWSLETTER_FROM || process.env.RESEND_FROM
}

export function getResendNewsletterSegmentId(): string | undefined {
  return (
    process.env.RESEND_NEWSLETTER_SEGMENT_ID ||
    process.env.RESEND_NEWSLETTER_AUDIENCE_ID
  )
}

export function getResendWebhookSecret(): string | undefined {
  return process.env.RESEND_WEBHOOK_SECRET
}

/**
 * Blaze templates use {{unsubscribe_link}}; Resend broadcasts require {{{RESEND_UNSUBSCRIBE_URL}}}.
 */
export function prepareNewsletterHtmlForResendBroadcast(html: string): string {
  const withStaticVars = prepareNewsletterHtmlForSend(html)
  return withStaticVars
    .replace(/\{\{unsubscribe_link\}\}/g, RESEND_UNSUBSCRIBE_PLACEHOLDER)
    .replace(/\/newsletter\/unsubscribe\?token=[a-f0-9]+/gi, RESEND_UNSUBSCRIBE_PLACEHOLDER)
}

export type ResendTransactionalSendOptions = {
  to: string
  subject: string
  html: string
  tags?: { name: string; value: string }[]
}

export async function sendNewsletterViaResend({
  to,
  subject,
  html,
  tags,
}: ResendTransactionalSendOptions): Promise<{ id: string }> {
  const from = getResendNewsletterFrom()
  if (!from) {
    throw new Error("RESEND_NEWSLETTER_FROM or RESEND_FROM is not configured")
  }

  const resend = getResendClient()
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()

  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    subject,
    html,
    text: text || undefined,
    tags,
  })

  if (error) {
    throw new Error(getErrorMessage(error) || "Resend failed to send email")
  }

  if (!data?.id) {
    throw new Error("Resend returned no email id")
  }

  return { id: data.id }
}

export type CreateNewsletterBroadcastOptions = {
  subject: string
  html: string
  name?: string
  scheduledAt?: string
}

export async function createAndSendNewsletterBroadcast({
  subject,
  html,
  name,
  scheduledAt,
}: CreateNewsletterBroadcastOptions): Promise<{ broadcastId: string }> {
  const from = getResendNewsletterFrom()
  const segmentId = getResendNewsletterSegmentId()

  if (!from) {
    throw new Error("RESEND_NEWSLETTER_FROM is not configured")
  }
  if (!segmentId) {
    throw new Error("RESEND_NEWSLETTER_SEGMENT_ID is not configured")
  }

  const resend = getResendClient()
  const broadcastHtml = prepareNewsletterHtmlForResendBroadcast(html)

  const { data, error } = await resend.broadcasts.create({
    from,
    subject,
    html: broadcastHtml,
    segmentId,
    name: name || subject,
    send: true,
    ...(scheduledAt ? { scheduledAt } : {}),
  })

  if (error) {
    throw new Error(getErrorMessage(error) || "Resend failed to create broadcast")
  }

  if (!data?.id) {
    throw new Error("Resend returned no broadcast id")
  }

  return { broadcastId: data.id }
}
