import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { sendInvitationEmail } from "@/lib/email"
import crypto from "crypto"

/**
 * POST /api/students/invite - 邀请学生创建账户
 */
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const body = await request.json()
    const { student_id, email, student_name } = body

    if (!student_id || !email || !student_name) {
      return NextResponse.json(
        { error: "student_id, email, and student_name are required" },
        { status: 400 }
      )
    }

    // 验证学生是否属于当前用户
    const { data: userStudent, error: userStudentError } = await supabaseAdmin
      .from('user_students')
      .select('student:students(*)')
      .eq('user_id', userId)
      .eq('student_id', student_id)
      .single()

    if (userStudentError || !userStudent) {
      return NextResponse.json(
        { error: "Student not found or you don't have permission to invite this student" },
        { status: 403 }
      )
    }

    // 检查学生是否已经有账户
    const student = Array.isArray(userStudent.student) 
      ? userStudent.student[0] 
      : userStudent.student

    if (student?.student_user_id) {
      return NextResponse.json(
        { error: "This student already has an account" },
        { status: 400 }
      )
    }

    // 检查是否已有未过期的邀请
    const { data: existingInvitation } = await supabaseAdmin
      .from('student_invitations')
      .select('id, expires_at')
      .eq('student_id', student_id)
      .eq('parent_user_id', userId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .limit(1)

    if (existingInvitation && existingInvitation.length > 0) {
      return NextResponse.json(
        { error: "An active invitation already exists for this student" },
        { status: 400 }
      )
    }

    // 生成邀请token
    const invitationToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7天后过期

    // 创建邀请记录
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('student_invitations')
      .insert({
        student_id,
        inviter_user_id: userId,
        student_name,
        student_email: email,
        invitation_code: invitationToken,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select()
      .single()

    if (invitationError) {
      throw new Error(`Failed to create invitation: ${invitationError.message}`)
    }

    // 发送邀请邮件
    let emailSent = false
    let emailError: string | null = null

    try {
      const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/students/accept-invitation?token=${invitationToken}`
      await sendInvitationEmail(
        email,
        invitationToken,
        student_name,
        'user' // Student role
      )
      emailSent = true
    } catch (emailErrorObj: any) {
      console.error("Failed to send invitation email:", emailErrorObj)
      emailError = emailErrorObj.message || "Failed to send invitation email"
    }

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        expires_at: invitation.expires_at,
        status: invitation.status,
      },
      emailSent,
      emailError: emailError || undefined,
      message: emailSent 
        ? "Invitation sent successfully" 
        : "Invitation created, but email sending failed",
    }, { status: 201 })
  } catch (error: any) {
    console.error("Error creating student invitation:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create invitation" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/students/invite - 获取用户的邀请列表
 */
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('student_id')

    let query = supabaseAdmin
      .from('student_invitations')
      .select(`
        *,
        student:students(id, name, student_user_id)
      `)
      .eq('inviter_user_id', userId)
      .order('created_at', { ascending: false })

    if (studentId) {
      query = query.eq('student_id', studentId)
    }

    const { data: invitations, error } = await query

    if (error) {
      throw new Error(`Failed to fetch invitations: ${error.message}`)
    }

    return NextResponse.json({
      invitations: invitations || [],
      total: invitations?.length || 0
    })
  } catch (error: any) {
    console.error("Error fetching invitations:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch invitations" },
      { status: 500 }
    )
  }
}
