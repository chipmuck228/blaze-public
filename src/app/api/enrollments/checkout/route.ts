import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { checkoutInstanceEnrollments, calculateInstanceEnrollmentTotal } from "@/lib/db"
import { isStudentAccount } from "@/lib/permissions"

// POST /api/enrollments/checkout - 结账（从 cart 转为 reserved，开始支付流程）
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // 验证用户不是学生账户（学生账户不能支付）
    const isStudent = await isStudentAccount(userId)
    if (isStudent) {
      return NextResponse.json(
        { 
          error: "Student accounts cannot checkout. Payment must be initiated by the payer.",
          code: "STUDENT_CANNOT_PAY"
        },
        { status: 403 }
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
      // 1. 结账（更新状态为 reserved）
      const enrollments = await checkoutInstanceEnrollments(
        enrollment_ids,
        userId,
        payment_method_id
      )

      // 2. 计算总金额
      const priceInfo = await calculateInstanceEnrollmentTotal(enrollment_ids)

      return NextResponse.json({
        enrollments,
        total_amount: priceInfo.total,
        currency: priceInfo.currency,
        items: priceInfo.items,
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

      // 如果是先修条件不满足，返回特殊错误码
      if (error.message.includes('Prerequisites not met')) {
        return NextResponse.json(
          {
            error: error.message,
            code: "PREREQUISITES_NOT_MET",
          },
          { status: 403 }
        )
      }

      // 如果是购物车过期，返回特殊错误码
      if (error.message.includes('expired')) {
        return NextResponse.json(
          {
            error: error.message,
            code: "CART_EXPIRED",
          },
          { status: 400 }
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
