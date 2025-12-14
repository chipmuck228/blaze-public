import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { addToWaitlist, getUserWaitlist } from "@/lib/db"

// GET: 获取用户的等待列表
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const waitlist = await getUserWaitlist(session.user.id)

    return NextResponse.json({
      items: waitlist,
      total: waitlist.length,
    })
  } catch (error: any) {
    console.error("Error fetching waitlist:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch waitlist" },
      { status: 500 }
    )
  }
}

// POST: 加入等待列表
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { instance_id, notes } = body

    if (!instance_id) {
      return NextResponse.json(
        { error: "instance_id is required" },
        { status: 400 }
      )
    }

    try {
      const enrollment = await addToWaitlist(session.user.id, instance_id, notes)

      return NextResponse.json({
        enrollment,
        message: "Added to waitlist successfully",
      })
    } catch (error: any) {
      // 如果已存在注册，返回特殊错误码
      if (error.message.includes('Already have')) {
        return NextResponse.json(
          {
            error: error.message,
            code: "ALREADY_ENROLLED",
          },
          { status: 409 }
        )
      }

      throw error
    }
  } catch (error: any) {
    console.error("Error adding to waitlist:", error)
    return NextResponse.json(
      { error: error.message || "Failed to add to waitlist" },
      { status: 500 }
    )
  }
}

