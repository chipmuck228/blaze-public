import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { checkoutCart } from "@/lib/db"

// POST: 结账（从 cart 转为 reserved，开始支付流程）
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
    const { enrollment_ids, payment_method_id } = body

    if (!enrollment_ids || !Array.isArray(enrollment_ids) || enrollment_ids.length === 0) {
      return NextResponse.json(
        { error: "enrollment_ids array is required" },
        { status: 400 }
      )
    }

    try {
      const enrollments = await checkoutCart(
        enrollment_ids,
        session.user.id,
        payment_method_id
      )

      // TODO: 计算总金额（从实例价格获取）
      // 这里暂时返回固定值，后续需要从实例或课程获取价格
      const totalAmount = 0 // 需要从实例计算

      return NextResponse.json({
        enrollments,
        total_amount: totalAmount,
        message: "Checkout successful. Please complete payment.",
      })
    } catch (error: any) {
      // 如果是容量不足，返回特殊错误码
      if (error.message.includes('full') || error.message.includes('capacity')) {
        return NextResponse.json(
          {
            error: error.message,
            code: "CAPACITY_FULL",
          },
          { status: 409 }
        )
      }

      throw error
    }
  } catch (error: any) {
    console.error("Error during checkout:", error)
    return NextResponse.json(
      { error: error.message || "Failed to checkout" },
      { status: 500 }
    )
  }
}

