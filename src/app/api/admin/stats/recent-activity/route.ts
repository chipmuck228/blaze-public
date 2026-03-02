import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAdminStatsRecentActivity } from "@/lib/db"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 })
    const data = await getAdminStatsRecentActivity()
    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching admin stats recent activity:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch" }, { status: 500 })
  }
}
