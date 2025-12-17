import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAllUsers, createUserByAdmin } from "@/lib/db"
import { sendInvitationEmail, sendPasswordNotificationEmail } from "@/lib/email"

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden. Admin access required." },
        { status: 403 }
      )
    }

    const users = await getAllUsers()

    return NextResponse.json(users, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching users:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch users" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden. Admin access required." },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      name,
      email,
      role,
      password_option,
      password,
      require_password_change,
      is_test_user,
    } = body

    // 验证必填字段
    if (!name || !email || !role || !password_option) {
      return NextResponse.json(
        { error: "Missing required fields: name, email, role, password_option" },
        { status: 400 }
      )
    }

    // 验证 role
    if (!['user', 'coach', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'user', 'coach', or 'admin'" },
        { status: 400 }
      )
    }

    // 验证 password_option
    if (!['generate', 'custom', 'invite'].includes(password_option)) {
      return NextResponse.json(
        { error: "Invalid password_option. Must be 'generate', 'custom', or 'invite'" },
        { status: 400 }
      )
    }

    // 如果 password_option = 'custom'，验证密码
    if (password_option === 'custom' && !password) {
      return NextResponse.json(
        { error: "Password is required when password_option is 'custom'" },
        { status: 400 }
      )
    }

    if (password_option === 'custom' && password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      )
    }

    // 创建用户
    const result = await createUserByAdmin({
      name,
      email,
      role,
      password_option,
      password,
      require_password_change: require_password_change ?? false,
      is_test_user: is_test_user ?? false,
      created_by: session.user.id!,
    })

    // 发送邮件
    let emailSent = false
    let emailError: string | null = null

    try {
      if (password_option === 'invite' && result.invitation_token) {
        // 发送邀请邮件
        await sendInvitationEmail(
          result.user.email,
          result.invitation_token,
          result.user.name,
          result.user.role || 'user'
        )
        emailSent = true
      } else if (password_option === 'generate' && result.generated_password) {
        // 发送密码通知邮件
        await sendPasswordNotificationEmail(
          result.user.email,
          result.generated_password,
          result.user.name,
          require_password_change ?? false
        )
        emailSent = true
      } else if (password_option === 'custom' && password) {
        // 发送密码通知邮件（自定义密码）
        await sendPasswordNotificationEmail(
          result.user.email,
          password,
          result.user.name,
          require_password_change ?? false
        )
        emailSent = true
      }
    } catch (emailErrorObj: any) {
      console.error("Failed to send email:", emailErrorObj)
      emailError = emailErrorObj.message || "Failed to send email"
      
      // 如果是超时错误，提供更友好的提示
      if (emailErrorObj.message?.includes('timeout') || emailErrorObj.code === 'ETIMEDOUT') {
        emailError = "Email sending timed out. The user has been created, but the email was not sent. You can resend the invitation later from the user management page."
      }
      
      // 即使邮件发送失败，也返回成功（用户已创建）
    }

    // 准备返回数据（不返回生成的密码，除非邮件发送失败）
    const responseData: any = {
      message: "User created successfully",
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        status: password_option === 'invite' ? 'pending_invitation' : 'active',
        invitation_token: result.invitation_token,
      },
      emailSent,
    }

    // 如果邮件发送失败且是生成密码方式，返回密码（仅一次）
    if (!emailSent && password_option === 'generate' && result.generated_password) {
      responseData.generated_password = result.generated_password
      responseData.emailError = emailError
    }

    return NextResponse.json(responseData, { status: 201 })
  } catch (error: any) {
    console.error("Error creating user:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create user" },
      { status: 400 }
    )
  }
}

