import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * GET /api/admin/newsletter/failed-sends/retry-tasks/[id]
 * 获取单个任务的详细信息
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

    const { data: task, error } = await supabaseAdmin
      .from("newsletter_retry_tasks")
      .select("*")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Task not found" },
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json(task, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching retry task:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch retry task" },
      { status: 500 }
    )
  }
}
