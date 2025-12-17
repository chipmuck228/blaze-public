import { NextResponse } from "next/server"
import { acceptInvitationAndSetPassword } from "@/lib/db"
import { signIn } from "@/auth"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { token, password, confirm_password } = body

    if (!token || !password || !confirm_password) {
      return NextResponse.json(
        { error: "Missing required fields: token, password, confirm_password" },
        { status: 400 }
      )
    }

    // 验证密码匹配
    if (password !== confirm_password) {
      return NextResponse.json(
        { error: "Passwords do not match" },
        { status: 400 }
      )
    }

    // 验证密码强度
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      )
    }

    // 验证密码包含大小写字母和数字
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumber = /[0-9]/.test(password)

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      return NextResponse.json(
        { error: "Password must contain at least one uppercase letter, one lowercase letter, and one number" },
        { status: 400 }
      )
    }

    // 接受邀请并设置密码
    const user = await acceptInvitationAndSetPassword(token, password)

    // 返回用户信息（前端可以自动登录）
    return NextResponse.json(
      {
        message: "Password set successfully. You can now log in.",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error accepting invitation:", error)
    return NextResponse.json(
      { error: error.message || "Failed to accept invitation" },
      { status: 400 }
    )
  }
}

