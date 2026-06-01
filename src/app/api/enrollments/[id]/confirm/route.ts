import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
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
    } catch (error: unknown) {
      // 如果是状态错误，返回特殊错误码
      if (getErrorMessage(error).includes('not in reserved status')) {
        return NextResponse.json(
          {
            error: getErrorMessage(error),
            code: "INVALID_STATUS",
          },
          { status: 400 }
        )
      }

      // 如果是过期，返回特殊错误码
      if (getErrorMessage(error).includes('expired')) {
        return NextResponse.json(
          {
            error: getErrorMessage(error),
            code: "RESERVATION_EXPIRED",
          },
          { status: 400 }
        )
      }

      // 如果是权限错误，返回特殊错误码
      if (getErrorMessage(error).includes('Unauthorized') || getErrorMessage(error).includes('not the payer')) {
        return NextResponse.json(
          {
            error: getErrorMessage(error),
            code: "UNAUTHORIZED",
          },
          { status: 403 }
        )
      }

      throw error
    }
  } catch (error: unknown) {
    console.error("Error confirming enrollment:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to confirm enrollment" },
      { status: 500 }
    )
  }
}
