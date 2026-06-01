import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAdminStats } from "@/lib/db"

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

    const stats = await getAdminStats()

    return NextResponse.json(stats, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching admin stats:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch stats" },
      { status: 500 }
    )
  }
}

