import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getCoachStats } from "@/lib/db"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "coach") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const stats = await getCoachStats(session.user.id)

    return NextResponse.json(stats)
  } catch (error: any) {
    console.error("Error fetching coach stats:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch coach stats" },
      { status: 500 }
    )
  }
}

