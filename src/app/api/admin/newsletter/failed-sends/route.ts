import { NextResponse } from "next/server"
import {getErrorMessage, type StringKeyRecord} from "@/lib/typed-error"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * GET /api/admin/newsletter/failed-sends
 * 获取失败邮件列表
 */
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const campaignId = searchParams.get("campaign_id")
    const email = searchParams.get("email")
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")

    const offset = (page - 1) * limit

    // 构建查询
    let query = supabaseAdmin
      .from("newsletter_sends")
      .select(
        `
        id,
        campaign_id,
        subscriber_id,
        email,
        status,
        error_message,
        retry_count,
        last_retry_at,
        is_permanent_failure,
        resend_email_id,
        created_at,
        updated_at,
        campaign:newsletter_campaigns!campaign_id (
          id,
          subject
        )
      `,
        { count: "exact" }
      )
      .eq("status", "failed")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    // 应用筛选条件
    if (campaignId) {
      query = query.eq("campaign_id", campaignId)
    }

    if (email) {
      query = query.ilike("email", `%${email}%`)
    }

    if (startDate) {
      query = query.gte("created_at", startDate)
    }

    if (endDate) {
      query = query.lte("created_at", endDate)
    }

    const { data, error, count } = await query

    if (error) {
      throw error
    }

    // 格式化响应数据
    const failedSends = (data || []).map((send) => {
      const campaign = Array.isArray(send.campaign) ? send.campaign[0] : send.campaign
      return {
      id: send.id,
      campaign_id: send.campaign_id,
      campaign_subject: campaign?.subject || "Unknown",
      subscriber_id: send.subscriber_id,
      email: send.email,
      status: send.status,
      error_message: send.error_message || "Unknown error",
      retry_count: send.retry_count || 0,
      last_retry_at: send.last_retry_at,
      is_permanent_failure: send.is_permanent_failure || false,
      resend_email_id: send.resend_email_id || null,
      created_at: send.created_at,
      updated_at: send.updated_at,
    }
    })

    const totalPages = count ? Math.ceil(count / limit) : 0

    return NextResponse.json(
      {
        failed_sends: failedSends,
        total: count || 0,
        page,
        limit,
        totalPages,
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error("Error fetching failed sends:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch failed sends" },
      { status: 500 }
    )
  }
}
