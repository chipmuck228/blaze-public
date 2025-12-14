import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { removeFromCart, extendCartExpiry } from "@/lib/db"

// DELETE: 从注册清单移除
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

    await removeFromCart(id, session.user.id)

    return NextResponse.json({
      message: "Removed from cart successfully",
    })
  } catch (error: any) {
    console.error("Error removing from cart:", error)
    return NextResponse.json(
      { error: error.message || "Failed to remove from cart" },
      { status: 500 }
    )
  }
}

// POST: 延长注册清单过期时间
export async function POST(
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
    const body = await request.json()
    const { additional_minutes } = body

    const enrollment = await extendCartExpiry(
      id,
      session.user.id,
      additional_minutes || 15
    )

    return NextResponse.json({
      enrollment,
      message: "Cart expiry extended successfully",
    })
  } catch (error: any) {
    console.error("Error extending cart expiry:", error)
    return NextResponse.json(
      { error: error.message || "Failed to extend cart expiry" },
      { status: 500 }
    )
  }
}

