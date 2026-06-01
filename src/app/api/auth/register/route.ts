import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { createUser } from "@/lib/db"
import { sendVerificationEmail } from "@/lib/email"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, password } = body

    if (!name || !email || !password) {
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

    // 创建用户（密码已在 createUser 中使用 bcrypt 加密）
    const user = await createUser(name, email, password)

    // 发送验证邮件
    let emailSent = false
    let emailError: string | null = null
    
    try {
      await sendVerificationEmail(
        user.email,
        user.email_verification_token!,
        user.name
      )
      emailSent = true
    } catch (emailErrorObj: unknown) {
      console.error("Failed to send verification email:", emailErrorObj)
      emailError = getErrorMessage(emailErrorObj, "Failed to send verification email")
      // 即使邮件发送失败，也返回成功（用户已创建），但告知用户邮件发送失败
    }

    return NextResponse.json(
      { 
        message: emailSent 
          ? "Registration successful! Please check your email to verify your account."
          : "Registration successful! However, we couldn't send the verification email. Please contact support or try resending the verification email.",
        user: { id: user.id, name: user.name, email: user.email },
        emailSent,
        emailError: emailError || undefined,
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error) || "Registration failed" },
      { status: 400 }
    )
  }
}

