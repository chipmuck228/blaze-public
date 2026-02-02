import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { removeFromInstanceWaitlist } from "@/lib/db"

// DELETE /api/enrollments/waitlist/:id - 从等待列表移除
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const { id } = await params

    try {
      await removeFromInstanceWaitlist(id, userId)

      return NextResponse.json({
        message: "Removed from waitlist successfully",
      })
    } catch (error: any) {
      // 如果是权限错误，返回特殊错误码
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json(
          {
            error: error.message,
            code: "UNAUTHORIZED",
          },
          { status: 403 }
        )
      }

      // 如果是状态错误，返回特殊错误码
      if (error.message.includes('not in waitlisted status')) {
        return NextResponse.json(
          {
            error: error.message,
            code: "INVALID_STATUS",
          },
          { status: 400 }
        )
      }

      throw error
    }
  } catch (error: any) {
    console.error("Error removing from waitlist:", error)
    return NextResponse.json(
      { error: error.message || "Failed to remove from waitlist" },
      { status: 500 }
    )
  }
}
