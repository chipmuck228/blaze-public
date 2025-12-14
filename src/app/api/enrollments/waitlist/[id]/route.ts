import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { removeFromWaitlist } from "@/lib/db"

// DELETE: 从等待列表移除
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

    const { id } = await params

    await removeFromWaitlist(id, session.user.id)

    return NextResponse.json({
      message: "Removed from waitlist successfully",
    })
  } catch (error: any) {
    console.error("Error removing from waitlist:", error)
    return NextResponse.json(
      { error: error.message || "Failed to remove from waitlist" },
      { status: 500 }
    )
  }
}

