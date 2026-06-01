import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { auth } from "@/auth"
import { getUserEnrollments } from "@/lib/db"

// GET: 获取用户的所有注册
export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as any

    const enrollments = await getUserEnrollments(session.user.id, status)

    return NextResponse.json({
      enrollments,
      total: enrollments.length,
    })
  } catch (error: unknown) {
    console.error("Error fetching enrollments:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch enrollments" },
      { status: 500 }
    )
  }
}

