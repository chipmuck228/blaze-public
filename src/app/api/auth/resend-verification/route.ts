import { NextResponse } from "next/server"
import { resendVerificationEmail } from "@/lib/db"
import { sendVerificationEmail } from "@/lib/email"

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

    const { token, user } = await resendVerificationEmail(email)

    // 发送验证邮件
    try {
      await sendVerificationEmail(user.email, token, user.name)
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError)
      return NextResponse.json(
        { error: "Failed to send verification email, please try again later" },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: "Verification email has been resent. Please check your inbox." },
      { status: 200 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Operation failed" },
      { status: 400 }
    )
  }
}

