import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { NEWSLETTER_TEMPLATE_NAMES } from "@/lib/newsletter-email-templates"
import { syncSubscriberToResend } from "@/lib/newsletter-resend-sync"
import { sendNewsletterTransactionalEmail } from "@/lib/newsletter-template-runtime"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Unsubscribe token is required" },
        { status: 400 }
      )
    }

    const tokenRegex = /^[a-f0-9]{64}$/i
    if (!tokenRegex.test(token)) {
      return NextResponse.json(
        { error: "Invalid unsubscribe token format" },
        { status: 400 }
      )
    }

    const { data: subscriber, error: queryError } = await supabaseAdmin
      .from("newsletter_subscribers")
      .select("id, email, is_active, resend_contact_id")
      .eq("unsubscribe_token", token)
      .single()

    if (queryError || !subscriber) {
      return NextResponse.json(
        { error: "Invalid or expired unsubscribe token" },
        { status: 404 }
      )
    }

    if (!subscriber.is_active) {
      return NextResponse.json(
        { error: "You have already unsubscribed from the newsletter" },
        { status: 400 }
      )
    }

    const { error: updateError } = await supabaseAdmin
      .from("newsletter_subscribers")
      .update({
        is_active: false,
        unsubscribed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscriber.id)

    if (updateError) {
      console.error("Error unsubscribing:", updateError)
      return NextResponse.json(
        { error: "Failed to unsubscribe. Please try again later." },
        { status: 500 }
      )
    }

    syncSubscriberToResend({
      email: subscriber.email,
      subscriberId: subscriber.id,
      isActive: false,
      existingResendContactId: subscriber.resend_contact_id,
    }).catch((err) => console.error("[unsubscribe] Resend sync failed:", err))

    sendNewsletterTransactionalEmail({
      templateName: NEWSLETTER_TEMPLATE_NAMES.UNSUBSCRIBE_CONFIRMATION,
      to: subscriber.email,
    })
      .then(() => console.log(`Unsubscribe confirmation sent to ${subscriber.email}`))
      .catch((error) =>
        console.error(
          `Failed to send unsubscribe confirmation to ${subscriber.email}:`,
          error
        )
      )

    return NextResponse.json(
      {
        success: true,
        message: "Successfully unsubscribed",
        email: subscriber.email,
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error("Error in newsletter unsubscribe:", error)
    const message = error instanceof Error ? error.message : "Failed to unsubscribe"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
