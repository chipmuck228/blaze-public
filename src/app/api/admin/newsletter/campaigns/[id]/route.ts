import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getCampaignDeliveryInfo } from "@/lib/newsletter-admin-delivery"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * GET /api/admin/newsletter/campaigns/[id]
 * 获取单个发送任务详情（包括发送统计）
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // 获取 campaign 详情
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from("newsletter_campaigns")
      .select(`
        *,
        newsletter_templates (
          id,
          name,
          subject,
          content_html
        )
      `)
      .eq("id", id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      )
    }

    // 获取发送详情统计
    const { data: sends, error: sendsError } = await supabaseAdmin
      .from("newsletter_sends")
      .select("status")
      .eq("campaign_id", id)

    if (sendsError) {
      console.error("Error fetching sends:", sendsError)
    }

    // 计算统计信息
    const stats = {
      total: sends?.length || 0,
      sent: sends?.filter((s) => s.status === "sent").length || 0,
      failed: sends?.filter((s) => s.status === "failed").length || 0,
      pending: sends?.filter((s) => s.status === "pending").length || 0,
      bounced: sends?.filter((s) => s.status === "bounced").length || 0,
    }

    return NextResponse.json({
      campaign,
      stats,
      delivery: getCampaignDeliveryInfo(campaign),
    })
  } catch (error: any) {
    console.error("Error fetching campaign details:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch campaign details" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/newsletter/campaigns/[id]/cancel
 * 取消已计划的发送任务
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // 检查 campaign 状态
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from("newsletter_campaigns")
      .select("status")
      .eq("id", id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      )
    }

    // 只能取消 scheduled 状态的 campaign
    if (campaign.status !== "scheduled") {
      return NextResponse.json(
        { error: `Cannot cancel campaign with status: ${campaign.status}` },
        { status: 400 }
      )
    }

    // 更新状态为 cancelled
    const { error: updateError } = await supabaseAdmin
      .from("newsletter_campaigns")
      .update({ status: "cancelled" })
      .eq("id", id)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      message: "Campaign cancelled successfully",
    })
  } catch (error: any) {
    console.error("Error cancelling campaign:", error)
    return NextResponse.json(
      { error: error.message || "Failed to cancel campaign" },
      { status: 500 }
    )
  }
}
