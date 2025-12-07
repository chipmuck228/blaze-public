import { NextResponse } from "next/server"
import { resetPassword, verifyPasswordResetToken } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { token, password } = body

    if (!token || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    // 重置密码（密码已在 resetPassword 中使用 bcrypt 加密）
    const user = await resetPassword(token, password)

    return NextResponse.json(
      { message: "Password reset successful!", user: { id: user.id, name: user.name, email: user.email } },
      { status: 200 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to reset password" },
      { status: 400 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json(
        { error: "Missing reset token" },
        { status: 400 }
      )
    }

    // 验证令牌是否有效
    const tokenData = await verifyPasswordResetToken(token)

    return NextResponse.json(
      { valid: true, email: tokenData.user.email },
      { status: 200 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { valid: false, error: error.message || "Invalid token" },
      { status: 400 }
    )
  }
}

