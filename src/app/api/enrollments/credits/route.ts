import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getUserCredits } from "@/lib/db"

// GET /api/enrollments/credits - 获取用户的信用额度
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const credits = await getUserCredits(session.user.id)

    // 计算总可用信用额度
    const totalAvailable = credits.reduce((sum, credit) => {
      return sum + (Number(credit.available_amount) || 0)
    }, 0)

    return NextResponse.json({
      credits,
      total_available: totalAvailable,
      total_count: credits.length,
    })
  } catch (error: any) {
    console.error("Error fetching credits:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch credits" },
      { status: 500 }
    )
  }
}
