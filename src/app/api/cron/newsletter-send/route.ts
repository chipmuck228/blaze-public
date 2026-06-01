import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { supabaseAdmin } from "@/lib/supabase"
import { sendNewsletterCampaign } from "@/lib/newsletter-campaign-send"
import { getNewsletterBaseUrl } from "@/lib/newsletter-template-runtime"

/**
 * Cron Job: 处理定时发送的 Newsletter
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date().toISOString()

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

    for (const campaign of campaigns) {
      try {
        await supabaseAdmin
          .from("newsletter_campaigns")
          .update({ status: "sending" })
          .eq("id", campaign.id)

        const { data: template, error: templateError } = await supabaseAdmin
          .from("newsletter_templates")
          .select("*")
          .eq("id", campaign.template_id)
          .single()

        if (templateError || !template) {
          throw new Error(`Template not found for campaign ${campaign.id}`)
        }

        const { data: subscribers, error: subscribersError } = await supabaseAdmin
          .from("newsletter_subscribers")
          .select("id, email, unsubscribe_token")
          .eq("is_active", true)

        if (subscribersError) {
          throw subscribersError
        }

        if (!subscribers || subscribers.length === 0) {
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
          })
          processedCount++
          continue
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

        const sendResult = await sendNewsletterCampaign(
          campaign.id,
          template,
          subscribers,
          campaign.subject,
          getNewsletterBaseUrl()
        )

        results.push({
          campaign_id: campaign.id,
          status: "completed",
          delivery_mode: sendResult.deliveryMode,
          sent_count: sendResult.sentCount,
          failed_count: sendResult.failedCount,
        })

        processedCount++
      } catch (error: unknown) {
        const message = error instanceof Error ? getErrorMessage(error) : "Unknown error"
        console.error(`Error processing campaign ${campaign.id}:`, error)

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
          error: message,
        })
      }
    }

    return NextResponse.json({
      success: true,
      processed: processedCount,
      results,
      timestamp: now,
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? getErrorMessage(error) : "Failed to process scheduled newsletters"
    console.error("Error processing scheduled newsletters:", error)
    return NextResponse.json({ error: message, timestamp: new Date().toISOString() }, { status: 500 })
  }
}

export async function POST(request: Request) {
  return GET(request)
}
