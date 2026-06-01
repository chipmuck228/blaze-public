import { NextResponse } from "next/server"
import {getErrorMessage, type StringKeyRecord} from "@/lib/typed-error"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { unwrapRelation } from "@/lib/supabase-relation"

/**
 * GET /api/admin/newsletter/statistics
 * 获取 Newsletter 发送统计信息
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

    // 构建日期范围查询
    const dateFilter: StringKeyRecord = {}
    if (startDate) {
      dateFilter.gte = startDate
    }
    if (endDate) {
      dateFilter.lte = endDate
    }

    // 1. 获取所有 campaign 统计
    let campaignQuery = supabaseAdmin
      .from("newsletter_campaigns")
      .select("id, status, total_recipients, sent_count, failed_count, sent_at, created_at")

    if (startDate || endDate) {
      if (startDate) {
        campaignQuery = campaignQuery.gte("created_at", startDate)
      }
      if (endDate) {
        campaignQuery = campaignQuery.lte("created_at", endDate)
      }
    }

    const { data: campaigns, error: campaignsError } = await campaignQuery

    if (campaignsError) {
      throw campaignsError
    }

    // 2. 计算总体统计
    const totalCampaigns = campaigns?.length || 0
    const sentCampaigns = campaigns?.filter((c) => c.status === "sent").length || 0
    const scheduledCampaigns = campaigns?.filter((c) => c.status === "scheduled").length || 0
    const failedCampaigns = campaigns?.filter((c) => c.status === "failed").length || 0

    const totalRecipients = campaigns?.reduce((sum, c) => sum + (c.total_recipients || 0), 0) || 0
    const totalSent = campaigns?.reduce((sum, c) => sum + (c.sent_count || 0), 0) || 0
    const totalFailed = campaigns?.reduce((sum, c) => sum + (c.failed_count || 0), 0) || 0

    const successRate = totalRecipients > 0 ? (totalSent / totalRecipients) * 100 : 0

    // 3. 获取发送详情统计
    let sendsQuery = supabaseAdmin
      .from("newsletter_sends")
      .select("status, sent_at, campaign_id")

    if (startDate || endDate) {
      if (startDate) {
        sendsQuery = sendsQuery.gte("created_at", startDate)
      }
      if (endDate) {
        sendsQuery = sendsQuery.lte("created_at", endDate)
      }
    }

    const { data: sends, error: sendsError } = await sendsQuery

    if (sendsError) {
      console.error("Error fetching sends:", sendsError)
    }

    const sentCount = sends?.filter((s) => s.status === "sent").length || 0
    const failedCount = sends?.filter((s) => s.status === "failed").length || 0
    const pendingCount = sends?.filter((s) => s.status === "pending").length || 0
    const bouncedCount = sends?.filter((s) => s.status === "bounced").length || 0

    // 4. 按日期统计（用于趋势图）
    const dailyStats: Record<string, {
      date: string
      campaigns: number
      sent: number
      failed: number
      recipients: number
    }> = {}

    campaigns?.forEach((campaign) => {
      if (campaign.sent_at) {
        const date = new Date(campaign.sent_at).toISOString().split("T")[0]
        if (!dailyStats[date]) {
          dailyStats[date] = {
            date,
            campaigns: 0,
            sent: 0,
            failed: 0,
            recipients: 0,
          }
        }
        dailyStats[date].campaigns++
        dailyStats[date].sent += campaign.sent_count || 0
        dailyStats[date].failed += campaign.failed_count || 0
        dailyStats[date].recipients += campaign.total_recipients || 0
      }
    })

    const dailyStatsArray = Object.values(dailyStats).sort((a, b) =>
      a.date.localeCompare(b.date)
    )

    // 5. 按模板统计
    const { data: templateStats, error: templateStatsError } = await supabaseAdmin
      .from("newsletter_campaigns")
      .select(`
        newsletter_templates!inner (
          id,
          name
        ),
        sent_count,
        failed_count,
        total_recipients
      `)

    if (templateStatsError) {
      console.error("Error fetching template stats:", templateStatsError)
    }

    const templateStatsMap: Record<string, {
      template_id: string
      template_name: string
      campaigns: number
      sent: number
      failed: number
      recipients: number
    }> = {}

    templateStats?.forEach((stat) => {
      const template = unwrapRelation(stat.newsletter_templates)
      if (template) {
        if (!templateStatsMap[template.id]) {
          templateStatsMap[template.id] = {
            template_id: template.id,
            template_name: template.name,
            campaigns: 0,
            sent: 0,
            failed: 0,
            recipients: 0,
          }
        }
        templateStatsMap[template.id].campaigns++
        templateStatsMap[template.id].sent += stat.sent_count || 0
        templateStatsMap[template.id].failed += stat.failed_count || 0
        templateStatsMap[template.id].recipients += stat.total_recipients || 0
      }
    })

    const templateStatsArray = Object.values(templateStatsMap)

    return NextResponse.json({
      overview: {
        total_campaigns: totalCampaigns,
        sent_campaigns: sentCampaigns,
        scheduled_campaigns: scheduledCampaigns,
        failed_campaigns: failedCampaigns,
        total_recipients: totalRecipients,
        total_sent: totalSent,
        total_failed: totalFailed,
        success_rate: Math.round(successRate * 100) / 100,
      },
      sends: {
        total: sends?.length || 0,
        sent: sentCount,
        failed: failedCount,
        pending: pendingCount,
        bounced: bouncedCount,
      },
      daily_stats: dailyStatsArray,
      template_stats: templateStatsArray,
    })
  } catch (error: unknown) {
    console.error("Error fetching newsletter statistics:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch statistics" },
      { status: 500 }
    )
  }
}
