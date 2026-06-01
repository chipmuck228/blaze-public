import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { getAllTeamMembers, getAllActiveTeamMembers } from "@/lib/db"

export async function GET(request: Request) {
  try {
    // 检查查询参数，如果 all=true，返回所有激活的成员（不仅仅是 featured）
    const { searchParams } = new URL(request.url)
    const all = searchParams.get('all') === 'true'
    
    const teams = all ? await getAllActiveTeamMembers() : await getAllTeamMembers()

    return NextResponse.json(teams, { status: 200 })
  } catch (error: unknown) {
    console.error("Error fetching teams:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch teams" },
      { status: 500 }
    )
  }
}

