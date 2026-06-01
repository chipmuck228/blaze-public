import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * PUT /api/admin/notifications/read-all
 * 标记所有通知为已读
 */
export async function PUT(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { error } = await supabaseAdmin
      .from("admin_notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("user_id", session.user.id)
      .eq("is_read", false)

    if (error) {
      throw error
    }

    return NextResponse.json(
      {
        success: true,
        message: "All notifications marked as read",
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error("Error marking all notifications as read:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to mark all notifications as read" },
      { status: 500 }
    )
  }
}
