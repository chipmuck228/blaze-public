import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { addToCart, getUserCart } from "@/lib/db"

// GET: 获取用户的注册清单
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const cart = await getUserCart(session.user.id)

    // 计算每个项目的剩余时间
    const cartWithTimeRemaining = cart.map(item => {
      const expiresAt = item.cart_expires_at ? new Date(item.cart_expires_at) : null
      const timeRemaining = expiresAt 
        ? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
        : 0

      return {
        ...item,
        time_remaining: timeRemaining,
      }
    })

    return NextResponse.json({
      items: cartWithTimeRemaining,
      total: cartWithTimeRemaining.length,
    })
  } catch (error: any) {
    console.error("Error fetching cart:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch cart" },
      { status: 500 }
    )
  }
}

// POST: 将课程实例加入注册清单
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
      const enrollment = await addToCart(session.user.id, instance_id, notes)

      return NextResponse.json({
        enrollment,
        message: "Added to cart successfully",
      })
    } catch (error: any) {
      // 如果是容量不足，返回特殊错误码
      if (error.message.includes('full') || error.message.includes('capacity')) {
        return NextResponse.json(
          {
            error: error.message,
            code: "CAPACITY_FULL",
            suggestion: "waitlist",
          },
          { status: 409 }
        )
      }

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
    console.error("Error adding to cart:", error)
    return NextResponse.json(
      { error: error.message || "Failed to add to cart" },
      { status: 500 }
    )
  }
}

