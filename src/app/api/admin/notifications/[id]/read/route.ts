import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * PUT /api/admin/notifications/[id]/read
 * 标记通知为已读
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const { error } = await supabaseAdmin
      .from("admin_notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", session.user.id)

    if (error) {
      throw error
    }

    return NextResponse.json(
      {
        success: true,
        message: "Notification marked as read",
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error marking notification as read:", error)
    return NextResponse.json(
      { error: error.message || "Failed to mark notification as read" },
      { status: 500 }
    )
  }
}
