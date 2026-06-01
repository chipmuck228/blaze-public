import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { supabaseAdmin } from "@/lib/supabase"
import { randomBytes } from "crypto"
import { NEWSLETTER_TEMPLATE_NAMES } from "@/lib/newsletter-email-templates"
import { syncSubscriberToResend } from "@/lib/newsletter-resend-sync"
import { sendNewsletterTransactionalEmail } from "@/lib/newsletter-template-runtime"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    const { data: existing } = await supabaseAdmin
      .from("newsletter_subscribers")
      .select("id, is_active, resend_contact_id")
      .eq("email", normalizedEmail)
      .single()

    if (existing) {
      if (existing.is_active) {
        return NextResponse.json(
          { error: "Email already subscribed" },
          { status: 400 }
        )
      }

      const unsubscribeToken = randomBytes(32).toString("hex")
      const { error: updateError } = await supabaseAdmin
        .from("newsletter_subscribers")
        .update({
          is_active: true,
          subscribed_at: new Date().toISOString(),
          unsubscribed_at: null,
          unsubscribe_token: unsubscribeToken,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)

      if (updateError) {
        throw updateError
      }

      syncSubscriberToResend({
        email: normalizedEmail,
        subscriberId: existing.id,
        isActive: true,
        existingResendContactId: existing.resend_contact_id,
      }).catch((err) => console.error("[subscribe] Resend sync failed:", err))

      sendNewsletterTransactionalEmail({
        templateName: NEWSLETTER_TEMPLATE_NAMES.WELCOME_RESUBSCRIBE,
        to: normalizedEmail,
        unsubscribeToken,
      })
        .then(() => console.log(`Resubscribe email sent to ${normalizedEmail}`))
        .catch((error) =>
          console.error(`Failed to send resubscribe email to ${normalizedEmail}:`, error)
        )

      return NextResponse.json(
        { success: true, message: "Successfully resubscribed to newsletter" },
        { status: 200 }
      )
    }

    const unsubscribeToken = randomBytes(32).toString("hex")
    const { data: created, error: insertError } = await supabaseAdmin
      .from("newsletter_subscribers")
      .insert({
        email: normalizedEmail,
        is_active: true,
        unsubscribe_token: unsubscribeToken,
      })
      .select("id")
      .single()

    if (insertError || !created) {
      console.error("Error creating subscription:", insertError)
      return NextResponse.json(
        { error: "Failed to subscribe. Please try again later." },
        { status: 500 }
      )
    }

    syncSubscriberToResend({
      email: normalizedEmail,
      subscriberId: created.id,
      isActive: true,
    }).catch((err) => console.error("[subscribe] Resend sync failed:", err))

    sendNewsletterTransactionalEmail({
      templateName: NEWSLETTER_TEMPLATE_NAMES.WELCOME_FIRST,
      to: normalizedEmail,
      unsubscribeToken,
    })
      .then(() => console.log(`Welcome email sent to ${normalizedEmail}`))
      .catch((error) =>
        console.error(`Failed to send welcome email to ${normalizedEmail}:`, error)
      )

    return NextResponse.json(
      { success: true, message: "Successfully subscribed to newsletter" },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error("Error in newsletter subscribe:", error)
    const message = error instanceof Error ? getErrorMessage(error) : "Failed to subscribe"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
