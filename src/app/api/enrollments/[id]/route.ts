import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { auth } from "@/auth"
import {
  getInstanceEnrollmentById,
  confirmEnrollment,
  cancelEnrollment,
} from "@/lib/db"

// GET: 获取单个注册详情（基于 instance_enrollments）
export async function GET(
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
    const enrollment = await getInstanceEnrollmentById(id)

    if (!enrollment) {
      return NextResponse.json(
        { error: "Enrollment not found" },
        { status: 404 }
      )
    }

    // 验证用户权限（用户必须是enrollment的user_id或payer_user_id）
    if (enrollment.user_id !== session.user.id && enrollment.payer_user_id !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    return NextResponse.json({ enrollment })
  } catch (error: unknown) {
    console.error("Error fetching enrollment:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch enrollment" },
      { status: 500 }
    )
  }
}

// PATCH: 更新注册（确认注册或取消）
export async function PATCH(
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
    const { action, payment_transaction_id, amount_paid, reason } = body

    if (action === 'confirm') {
      // 确认注册（支付成功后）
      if (!payment_transaction_id || !amount_paid) {
        return NextResponse.json(
          { error: "payment_transaction_id and amount_paid are required for confirm action" },
          { status: 400 }
        )
      }

      const enrollment = await confirmEnrollment(
        id,
        session.user.id,
        payment_transaction_id,
        amount_paid
      )

      return NextResponse.json({
        enrollment,
        message: "Enrollment confirmed successfully",
      })
    } else if (action === 'cancel') {
      // 取消注册
      const success = await cancelEnrollment(id, session.user.id, reason)

      return NextResponse.json({
        success,
        message: "Enrollment cancelled successfully",
      })
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'confirm' or 'cancel'" },
        { status: 400 }
      )
    }
  } catch (error: unknown) {
    console.error("Error updating enrollment:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to update enrollment" },
      { status: 500 }
    )
  }
}

