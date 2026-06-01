import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * GET /api/admin/notifications
 * 获取用户的通知列表
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
    const isRead = searchParams.get("is_read") // 'true' or 'false'
    const type = searchParams.get("type") // notification type

    const offset = (page - 1) * limit

    let query = supabaseAdmin
      .from("admin_notifications")
      .select("*", { count: "exact" })
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (isRead === "true") {
      query = query.eq("is_read", true)
    } else if (isRead === "false") {
      query = query.eq("is_read", false)
    }

    if (type) {
      query = query.eq("type", type)
    }

    const { data: notifications, error, count } = await query

    if (error) {
      throw error
    }

    // 获取未读通知数量
    const { count: unreadCount } = await supabaseAdmin
      .from("admin_notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", session.user.id)
      .eq("is_read", false)

    const totalPages = count ? Math.ceil(count / limit) : 0

    return NextResponse.json(
      {
        notifications: notifications || [],
        total: count || 0,
        unread_count: unreadCount || 0,
        page,
        limit,
        totalPages,
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch notifications" },
      { status: 500 }
    )
  }
}
