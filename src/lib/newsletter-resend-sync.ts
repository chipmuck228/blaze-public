import { supabaseAdmin } from "@/lib/supabase"
import {
  getResendClient,
  getResendNewsletterSegmentId,
  isResendNewsletterEnabled,
} from "@/lib/resend-newsletter"

/**
 * Sync active subscriber to Resend (mirror). Blaze DB is the source of truth.
 */
export async function syncSubscriberToResend(options: {
  email: string
  subscriberId: string
  isActive: boolean
  existingResendContactId?: string | null
}): Promise<void> {
  if (!isResendNewsletterEnabled()) {
    return
  }

  const segmentId = getResendNewsletterSegmentId()
  const normalizedEmail = options.email.toLowerCase().trim()
  const resend = getResendClient()

  try {
    if (options.isActive) {
      if (options.existingResendContactId) {
        await resend.contacts.update({
          id: options.existingResendContactId,
          unsubscribed: false,
        })

        if (segmentId) {
          await resend.contacts.segments.add({
            contactId: options.existingResendContactId,
            segmentId,
          })
        }
        return
      }

      const { data, error } = await resend.contacts.create({
        email: normalizedEmail,
        unsubscribed: false,
        ...(segmentId ? { segments: [{ id: segmentId }] } : {}),
      })

      if (error) {
        const message = error.message || ""
        if (message.toLowerCase().includes("already")) {
          await resend.contacts.update({
            email: normalizedEmail,
            unsubscribed: false,
          })
          if (segmentId) {
            await resend.contacts.segments.add({
              email: normalizedEmail,
              segmentId,
            })
          }
          return
        }
        throw error
      }

      if (data?.id) {
        await supabaseAdmin
          .from("newsletter_subscribers")
          .update({
            resend_contact_id: data.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", options.subscriberId)
      }
      return
    }

    if (options.existingResendContactId) {
      await resend.contacts.update({
        id: options.existingResendContactId,
        unsubscribed: true,
      })
      return
    }

    await resend.contacts.update({
      email: normalizedEmail,
      unsubscribed: true,
    })
  } catch (err) {
    console.error("[newsletter-resend-sync] sync failed:", err)
  }
}

/**
 * Mark subscriber inactive in Blaze when Resend reports contact.unsubscribed.
 */
export async function deactivateSubscriberFromResendWebhook(email: string): Promise<void> {
  const normalized = email.toLowerCase().trim()
  await supabaseAdmin
    .from("newsletter_subscribers")
    .update({
      is_active: false,
      unsubscribed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("email", normalized)
}
