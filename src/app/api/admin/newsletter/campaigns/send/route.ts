import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { sendNewsletterEmail } from "@/lib/email"
import { sendNewsletterCampaign } from "@/lib/newsletter-campaign-send"
import {
  getNewsletterBaseUrl,
  prepareNewsletterHtmlForSend,
} from "@/lib/newsletter-template-runtime"

export async function POST(request: Request) {
  console.log(`[POST /api/admin/newsletter/campaigns/send] Request received`)
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

    if (!template.is_active) {
      return NextResponse.json(
        {
          error:
            "Cannot send newsletter using an inactive template. Please activate the template first.",
        },
        { status: 400 }
      )
    }

    if (test_email) {
      try {
        const finalSubject = subject || template.subject
        const content = prepareNewsletterHtmlForSend(template.content_html, {
          baseUrl: getNewsletterBaseUrl(),
          testUnsubscribeToken: "test",
        })

        await sendNewsletterEmail(test_email, finalSubject, content)
        return NextResponse.json(
          { success: true, message: "Test email sent successfully" },
          { status: 200 }
        )
      } catch (error: unknown) {
        const message = error instanceof Error ? getErrorMessage(error) : "Send failed"
        return NextResponse.json(
          { error: `Failed to send test email: ${message}` },
          { status: 500 }
        )
      }
    }

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

    const sendRecords = subscribers.map((subscriber) => ({
      campaign_id: campaign.id,
      subscriber_id: subscriber.id,
      email: subscriber.email,
      status: "pending",
      retry_count: 0,
      is_permanent_failure: false,
    }))

    await supabaseAdmin.from("newsletter_sends").insert(sendRecords)

    const baseUrl = getNewsletterBaseUrl()

    const sendPromise = sendNewsletterCampaign(
      campaign.id,
      template,
      subscribers,
      finalSubject,
      baseUrl,
      session.user.id
    )

    sendPromise.catch((error) => {
      console.error("[campaigns/send] sendNewsletterCampaign failed:", error)
      supabaseAdmin
        .from("newsletter_campaigns")
        .update({
          status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaign.id)
    })

    return NextResponse.json(
      {
        campaign_id: campaign.id,
        status: "sending",
        total_recipients: subscribers.length,
        message: "Newsletter sending started",
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error("Error sending newsletter:", error)
    const message = error instanceof Error ? getErrorMessage(error) : "Failed to send newsletter"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
