import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { createPasswordResetToken } from "@/lib/db"
import { sendPasswordResetEmail } from "@/lib/email"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: "Missing email address" },
        { status: 400 }
      )
    }

    // 创建重置令牌（如果用户不存在，也返回成功以保护隐私）
    const result = await createPasswordResetToken(email)

    if (result) {
      // 发送重置密码邮件
      try {
        await sendPasswordResetEmail(result.user.email, result.token, result.user.name)
      } catch (emailError) {
        console.error("Failed to send password reset email:", emailError)
        return NextResponse.json(
          { error: "Failed to send password reset email, please try again later" },
          { status: 500 }
        )
      }
    }

    // 无论用户是否存在，都返回成功消息（安全考虑）
    return NextResponse.json(
      { message: "If this email is registered, we've sent a password reset link to your inbox." },
      { status: 200 }
    )
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error) || "Operation failed" },
      { status: 400 }
    )
  }
}

