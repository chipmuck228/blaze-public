import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { confirmInstanceEnrollment } from "@/lib/db"

// POST /api/enrollments/:id/confirm - 确认支付（支付成功后调用）
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

    const userId = session.user.id
    const { id } = await params
    const body = await request.json()
    const { 
      payment_transaction_id, 
      amount_paid, 
      stripe_payment_intent_id 
    } = body

    if (!payment_transaction_id || !amount_paid) {
      return NextResponse.json(
        { error: "payment_transaction_id and amount_paid are required" },
        { status: 400 }
      )
    }

    try {
      const enrollment = await confirmInstanceEnrollment(
        id,
        userId,
        payment_transaction_id,
        amount_paid,
        stripe_payment_intent_id
      )

      return NextResponse.json({
        enrollment,
        message: "Enrollment confirmed successfully",
      })
    } catch (error: any) {
      // 如果是状态错误，返回特殊错误码
      if (error.message.includes('not in reserved status')) {
        return NextResponse.json(
          {
            error: error.message,
            code: "INVALID_STATUS",
          },
          { status: 400 }
        )
      }

      // 如果是过期，返回特殊错误码
      if (error.message.includes('expired')) {
        return NextResponse.json(
          {
            error: error.message,
            code: "RESERVATION_EXPIRED",
          },
          { status: 400 }
        )
      }

      // 如果是权限错误，返回特殊错误码
      if (error.message.includes('Unauthorized') || error.message.includes('not the payer')) {
        return NextResponse.json(
          {
            error: error.message,
            code: "UNAUTHORIZED",
          },
          { status: 403 }
        )
      }

      throw error
    }
  } catch (error: any) {
    console.error("Error confirming enrollment:", error)
    return NextResponse.json(
      { error: error.message || "Failed to confirm enrollment" },
      { status: 500 }
    )
  }
}
