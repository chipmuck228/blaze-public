import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search") || ""
    const isActive = searchParams.get("is_active")

    const offset = (page - 1) * limit

    // 构建查询
    let query = supabaseAdmin
      .from("newsletter_subscribers")
      .select("*", { count: "exact" })

    // 搜索过滤
    if (search) {
      query = query.ilike("email", `%${search}%`)
    }

    // 状态过滤
    if (isActive !== null && isActive !== undefined) {
      query = query.eq("is_active", isActive === "true")
    }

    // 排序和分页
    query = query
      .order("subscribed_at", { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      throw error
    }

    return NextResponse.json(
      {
        subscribers: data || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error("Error fetching subscribers:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch subscribers" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Subscriber ID is required" }, { status: 400 })
    }

    // 软删除：设置 is_active = false
    const { error } = await supabaseAdmin
      .from("newsletter_subscribers")
      .update({
        is_active: false,
        unsubscribed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (error) {
      throw error
    }

    return NextResponse.json(
      { success: true, message: "Subscriber removed successfully" },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error("Error deleting subscriber:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to delete subscriber" },
      { status: 500 }
    )
  }
}
