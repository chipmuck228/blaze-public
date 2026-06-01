import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { auth } from "@/auth"
import { resendInvitation } from "@/lib/db"
import { sendInvitationEmail } from "@/lib/email"
import { getUserById } from "@/lib/db"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // 重新发送邀请
    const { invitation_token, invitation_expires_at } = await resendInvitation(id)

    // 获取用户信息
    const user = await getUserById(id)
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // 发送邀请邮件
    let emailSent = false
    let emailError: string | null = null

    try {
      await sendInvitationEmail(
        user.email,
        invitation_token,
        user.name,
        user.role || 'user'
      )
      emailSent = true
    } catch (emailErrorObj: unknown) {
      console.error("Failed to send invitation email:", emailErrorObj)
      emailError = getErrorMessage(emailErrorObj, "Failed to send invitation email")
    }

    return NextResponse.json(
      {
        message: emailSent 
          ? "Invitation sent successfully" 
          : "Invitation token regenerated, but email sending failed",
        invitation_token,
        invitation_expires_at,
        emailSent,
        emailError: emailError || undefined,
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error("Error resending invitation:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to resend invitation" },
      { status: 400 }
    )
  }
}

