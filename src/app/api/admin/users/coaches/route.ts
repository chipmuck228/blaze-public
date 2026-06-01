import { NextResponse } from "next/server"
import {getErrorMessage, type StringKeyRecord} from "@/lib/typed-error"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden. Admin access required." },
        { status: 403 }
      )
    }

    // 获取所有 coach 用户
    const { data: coaches, error } = await supabaseAdmin
      .from('users')
      .select('id, name, email, image, role')
      .eq('role', 'coach')
      .order('name', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch coaches: ${getErrorMessage(error)}`)
    }

    // 获取已有 Teams 记录的用户 ID
    const { data: teams } = await supabaseAdmin
      .from('teams')
      .select('user_id')
      .not('user_id', 'is', null)

    const usedUserIds = new Set((teams || []).map((t) => t.user_id))

    // 返回所有 coach，但标记哪些已有 Teams 记录（前端可以根据需要过滤）
    // 注意：编辑模式下，应该显示所有 coach（包括已有 Teams 记录的）
    const coachesWithStatus = (coaches || []).map((c) => ({
      ...c,
      has_team_profile: usedUserIds.has(c.id),
    }))

    return NextResponse.json(coachesWithStatus, { status: 200 })
  } catch (error: unknown) {
    console.error("Error fetching coaches:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch coaches" },
      { status: 500 }
    )
  }
}

