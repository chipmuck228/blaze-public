import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * GET /api/admin/newsletter/failed-sends/retry-tasks
 * 获取用户的重发任务列表
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
    const status = searchParams.get("status") // 'pending', 'processing', 'completed', 'failed'

    const offset = (page - 1) * limit

    let query = supabaseAdmin
      .from("newsletter_retry_tasks")
      .select("*", { count: "exact" })
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq("status", status)
    }

    const { data, error, count } = await query

    if (error) {
      throw error
    }

    const totalPages = count ? Math.ceil(count / limit) : 0

    return NextResponse.json(
      {
        tasks: data || [],
        total: count || 0,
        page,
        limit,
        totalPages,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error fetching retry tasks:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch retry tasks" },
      { status: 500 }
    )
  }
}
