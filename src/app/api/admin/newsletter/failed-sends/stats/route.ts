import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * GET /api/admin/newsletter/failed-sends/stats
 * 获取失败邮件统计信息
 */
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")

    // 构建基础查询条件
    let query = supabaseAdmin
      .from("newsletter_sends")
      .select("id, error_message, campaign_id, created_at")
      .eq("status", "failed")

    if (startDate) {
      query = query.gte("created_at", startDate)
    }

    if (endDate) {
      query = query.lte("created_at", endDate)
    }

    const { data: failedSends, error } = await query

    if (error) {
      throw error
    }

    // 统计总失败数
    const totalFailed = failedSends?.length || 0

    // 按失败原因分组统计
    const failedByReason: Record<string, number> = {}
    ;(failedSends || []).forEach((send: any) => {
      const reason = send.error_message || "Unknown error"
      failedByReason[reason] = (failedByReason[reason] || 0) + 1
    })

    // 按 campaign 分组统计
    const failedByCampaignMap: Record<string, { campaign_id: string; failed_count: number }> = {}
    ;(failedSends || []).forEach((send: any) => {
      const campaignId = send.campaign_id
      if (!failedByCampaignMap[campaignId]) {
        failedByCampaignMap[campaignId] = {
          campaign_id: campaignId,
          failed_count: 0,
        }
      }
      failedByCampaignMap[campaignId].failed_count++
    })

    // 获取 campaign 信息
    const campaignIds = Object.keys(failedByCampaignMap)
    let campaignInfo: Record<string, { subject: string }> = {}

    if (campaignIds.length > 0) {
      const { data: campaigns } = await supabaseAdmin
        .from("newsletter_campaigns")
        .select("id, subject")
        .in("id", campaignIds)

      if (campaigns) {
        campaigns.forEach((campaign: any) => {
          campaignInfo[campaign.id] = { subject: campaign.subject }
        })
      }
    }

    const failedByCampaign = Object.values(failedByCampaignMap).map((item) => ({
      campaign_id: item.campaign_id,
      campaign_subject: campaignInfo[item.campaign_id]?.subject || "Unknown",
      failed_count: item.failed_count,
    }))

    // 按日期分组统计最近失败趋势
    const recentFailuresMap: Record<string, number> = {}
    ;(failedSends || []).forEach((send: any) => {
      const date = new Date(send.created_at).toISOString().split("T")[0]
      recentFailuresMap[date] = (recentFailuresMap[date] || 0) + 1
    })

    const recentFailures = Object.entries(recentFailuresMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30) // 最近 30 天

    return NextResponse.json(
      {
        total_failed: totalFailed,
        failed_by_reason: failedByReason,
        failed_by_campaign: failedByCampaign,
        recent_failures: recentFailures,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error fetching failed sends stats:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch failed sends statistics" },
      { status: 500 }
    )
  }
}
