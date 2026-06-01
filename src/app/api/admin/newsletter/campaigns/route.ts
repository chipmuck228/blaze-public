import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * GET /api/admin/newsletter/campaigns
 * 获取发送任务列表（支持分页和状态筛选）
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
    const status = searchParams.get("status") // 'draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled'

    const offset = (page - 1) * limit

    // 构建查询
    let query = supabaseAdmin
      .from("newsletter_campaigns")
      .select(`
        *,
        newsletter_templates (
          id,
          name,
          subject
        )
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    // 添加状态筛选
    if (status) {
      query = query.eq("status", status)
    }

    const { data: campaigns, error, count } = await query

    if (error) {
      throw error
    }

    const totalPages = count ? Math.ceil(count / limit) : 0

    return NextResponse.json({
      campaigns: campaigns || [],
      total: count || 0,
      page,
      limit,
      totalPages,
    })
  } catch (error: unknown) {
    console.error("Error fetching campaigns:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch campaigns" },
      { status: 500 }
    )
  }
}
