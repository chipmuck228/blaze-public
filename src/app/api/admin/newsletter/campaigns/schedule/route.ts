import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { template_id, subject, scheduled_at } = body

    if (!template_id || !scheduled_at) {
      return NextResponse.json(
        { error: "Template ID and scheduled_at are required" },
        { status: 400 }
      )
    }

    // 验证 scheduled_at 是未来时间
    const scheduledDate = new Date(scheduled_at)
    if (scheduledDate <= new Date()) {
      return NextResponse.json(
        { error: "Scheduled time must be in the future" },
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

    // 验证模板是否为 active 状态
    if (!template.is_active) {
      return NextResponse.json(
        { error: "Cannot schedule newsletter using an inactive template. Please activate the template first." },
        { status: 400 }
      )
    }

    // 获取活跃订阅者数量
    const { count, error: countError } = await supabaseAdmin
      .from("newsletter_subscribers")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)

    if (countError) {
      throw countError
    }

    // 创建 scheduled campaign
    const finalSubject = subject || template.subject
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from("newsletter_campaigns")
      .insert({
        template_id: template.id,
        subject: finalSubject,
        scheduled_at: scheduledDate.toISOString(),
        status: "scheduled",
        total_recipients: count || 0,
        created_by: session.user.id,
      })
      .select()
      .single()

    if (campaignError) {
      throw campaignError
    }

    return NextResponse.json(
      {
        campaign_id: campaign.id,
        status: "scheduled",
        scheduled_at: scheduledDate.toISOString(),
        total_recipients: count || 0,
        message: "Newsletter scheduled successfully",
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error("Error scheduling newsletter:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to schedule newsletter" },
      { status: 500 }
    )
  }
}
