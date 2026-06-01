import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { auth } from "@/auth"
import { calculateRefundPolicy, processInstanceRefund } from "@/lib/db"
import { isStudentAccount } from "@/lib/permissions"
import { supabaseAdmin } from "@/lib/supabase"

// GET /api/enrollments/:id/refund - 获取退款政策选项
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

    const userId = session.user.id
    const { id } = await params

    // 验证用户是付款人
    const { data: enrollment } = await supabaseAdmin
      .from('instance_enrollments')
      .select('payer_user_id')
      .eq('id', id)
      .single()

    if (!enrollment || enrollment.payer_user_id !== userId) {
      return NextResponse.json(
        { error: "Unauthorized: You are not the payer for this enrollment" },
        { status: 403 }
      )
    }

    // 计算退款政策
    const policy = await calculateRefundPolicy(id)

    return NextResponse.json({
      policy,
      message: "Refund policy calculated successfully",
    })
  } catch (error: unknown) {
    console.error("Error calculating refund policy:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to calculate refund policy" },
      { status: 500 }
    )
  }
}

// POST /api/enrollments/:id/refund - 申请退款
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

    // 验证用户不是学生账户（学生账户不能退款）
    const isStudent = await isStudentAccount(userId)
    if (isStudent) {
      return NextResponse.json(
        { 
          error: "Student accounts cannot request refunds. Refunds must be initiated by the payer.",
          code: "STUDENT_CANNOT_REFUND"
        },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { refund_type, reason } = body

    if (!refund_type || !['refund', 'credit'].includes(refund_type)) {
      return NextResponse.json(
        { error: "refund_type must be 'refund' or 'credit'" },
        { status: 400 }
      )
    }

    try {
      const result = await processInstanceRefund(
        id,
        userId,
        refund_type,
        reason
      )

      return NextResponse.json({
        enrollment: result.enrollment,
        credit: result.credit,
        refund_transaction_id: result.refundTransactionId,
        message: refund_type === 'refund' 
          ? "Refund processed successfully" 
          : "Credit created successfully",
      })
    } catch (error: unknown) {
      // 如果是权限错误，返回特殊错误码
      if (getErrorMessage(error).includes('Unauthorized')) {
        return NextResponse.json(
          {
            error: getErrorMessage(error),
            code: "UNAUTHORIZED",
          },
          { status: 403 }
        )
      }

      // 如果是状态错误，返回特殊错误码
      if (getErrorMessage(error).includes('not eligible') || getErrorMessage(error).includes('not paid')) {
        return NextResponse.json(
          {
            error: getErrorMessage(error),
            code: "INVALID_STATUS",
          },
          { status: 400 }
        )
      }

      // 如果是退款不可用，返回特殊错误码
      if (getErrorMessage(error).includes('not available')) {
        return NextResponse.json(
          {
            error: getErrorMessage(error),
            code: "REFUND_NOT_AVAILABLE",
          },
          { status: 400 }
        )
      }

      // 如果是Stripe错误，返回特殊错误码
      if (getErrorMessage(error).includes('Stripe')) {
        return NextResponse.json(
          {
            error: getErrorMessage(error),
            code: "STRIPE_ERROR",
          },
          { status: 500 }
        )
      }

      throw error
    }
  } catch (error: unknown) {
    console.error("Error processing refund:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to process refund" },
      { status: 500 }
    )
  }
}
