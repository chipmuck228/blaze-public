import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { canManageStudent } from "@/lib/permissions"

/**
 * GET /api/students/:id - 获取单个学生详情
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const { id } = await params

    // 检查用户是否有权限管理这个学生
    const canManage = await canManageStudent(userId, id)
    if (!canManage) {
      return NextResponse.json(
        { error: "Forbidden: You don't have permission to view this student" },
        { status: 403 }
      )
    }

    // 查询学生信息
    const { data: userStudent, error: userStudentError } = await supabaseAdmin
      .from('user_students')
      .select(`
        id,
        relationship,
        is_primary,
        is_payer,
        can_manage_enrollments,
        can_view_progress,
        sync_cart_to_parent,
        student:students(*)
      `)
      .eq('user_id', userId)
      .eq('student_id', id)
      .single()

    if (userStudentError) {
      if (userStudentError.code === 'PGRST116') {
        return NextResponse.json(
          { error: "Student not found" },
          { status: 404 }
        )
      }
      throw new Error(`Failed to fetch student: ${userStudentError.message}`)
    }

    const student = Array.isArray(userStudent.student) 
      ? userStudent.student[0] 
      : userStudent.student

    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      student: {
        ...student,
        relationship: userStudent.relationship,
        is_primary: userStudent.is_primary,
        is_payer: userStudent.is_payer,
        can_manage_enrollments: userStudent.can_manage_enrollments,
        can_view_progress: userStudent.can_view_progress,
        sync_cart_to_parent: userStudent.sync_cart_to_parent,
      }
    })
  } catch (error: any) {
    console.error("Error fetching student:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch student" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/students/:id - 更新学生信息
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const { id } = await params
    const body = await request.json()

    // 检查用户是否有权限管理这个学生
    const canManage = await canManageStudent(userId, id)
    if (!canManage) {
      return NextResponse.json(
        { error: "Forbidden: You don't have permission to edit this student" },
        { status: 403 }
      )
    }

    // 更新学生信息
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .update({
        name: body.name,
        birth_date: body.birth_date || null,
        grade: body.grade || null,
        school: body.school || null,
        emergency_contact_name: body.emergency_contact_name || null,
        emergency_contact_phone: body.emergency_contact_phone || null,
        medical_notes: body.medical_notes || null,
        notes: body.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (studentError) {
      throw new Error(`Failed to update student: ${studentError.message}`)
    }

    return NextResponse.json({
      student,
      message: "Student updated successfully"
    })
  } catch (error: any) {
    console.error("Error updating student:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update student" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/students/:id - 删除学生
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const { id } = await params

    // 检查用户是否有权限管理这个学生
    const canManage = await canManageStudent(userId, id)
    if (!canManage) {
      return NextResponse.json(
        { error: "Forbidden: You don't have permission to delete this student" },
        { status: 403 }
      )
    }

    // 检查是否有活跃的enrollment
    const { data: enrollments, error: enrollmentsError } = await supabaseAdmin
      .from('instance_enrollments')
      .select('id')
      .eq('student_id', id)
      .in('status', ['cart', 'reserved', 'enrolled', 'waitlisted'])
      .limit(1)

    if (enrollmentsError) {
      throw new Error(`Failed to check enrollments: ${enrollmentsError.message}`)
    }

    if (enrollments && enrollments.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete student with active enrollments. Please cancel or complete all enrollments first." },
        { status: 400 }
      )
    }

    // 删除用户-学生关系（这会触发级联删除学生记录，如果这是唯一的关系）
    const { error: deleteError } = await supabaseAdmin
      .from('user_students')
      .delete()
      .eq('user_id', userId)
      .eq('student_id', id)

    if (deleteError) {
      throw new Error(`Failed to delete student: ${deleteError.message}`)
    }

    // 检查是否还有其他用户关联这个学生
    const { data: otherRelations, error: checkError } = await supabaseAdmin
      .from('user_students')
      .select('id')
      .eq('student_id', id)
      .limit(1)

    if (checkError) {
      throw new Error(`Failed to check other relations: ${checkError.message}`)
    }

    // 如果没有其他关系，删除学生记录
    if (!otherRelations || otherRelations.length === 0) {
      const { error: studentDeleteError } = await supabaseAdmin
        .from('students')
        .delete()
        .eq('id', id)

      if (studentDeleteError) {
        throw new Error(`Failed to delete student record: ${studentDeleteError.message}`)
      }
    } else {
      // 如果有其他关系，只标记为非活跃
      const { error: deactivateError } = await supabaseAdmin
        .from('students')
        .update({ is_active: false })
        .eq('id', id)

      if (deactivateError) {
        throw new Error(`Failed to deactivate student: ${deactivateError.message}`)
      }
    }

    return NextResponse.json({
      message: "Student deleted successfully"
    })
  } catch (error: any) {
    console.error("Error deleting student:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete student" },
      { status: 500 }
    )
  }
}
