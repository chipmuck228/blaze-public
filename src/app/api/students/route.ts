import { NextResponse } from "next/server"
import {getErrorMessage, type StringKeyRecord} from "@/lib/typed-error"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { canManageStudent } from "@/lib/permissions"

/**
 * GET /api/students - 获取用户管理的所有学生
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
    
    // 查询用户管理的所有学生
    const { data: userStudents, error: userStudentsError } = await supabaseAdmin
      .from('user_students')
      .select(`
        id,
        relationship,
        is_primary,
        is_payer,
        can_manage_enrollments,
        can_view_progress,
        sync_cart_to_parent,
        student:students(
          id,
          name,
          birth_date,
          grade,
          school,
          student_user_id,
          emergency_contact_name,
          emergency_contact_phone,
          medical_notes,
          notes,
          is_active,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true })
    
    if (userStudentsError) {
      throw new Error(`Failed to fetch students: ${userStudentsError.message}`)
    }
    
    // 调试日志（开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.log(`[GET /api/students] Found ${userStudents?.length || 0} user_students records`)
    }
    
    // 格式化返回数据
    const students = (userStudents || []).map((item) => {
      const student = Array.isArray(item.student) ? item.student[0] : item.student
      // 如果student为null或undefined，跳过这条记录
      if (!student) {
        return null
      }
      return {
        id: student.id,
        name: student.name,
        birth_date: student.birth_date,
        grade: student.grade,
        school: student.school,
        student_user_id: student.student_user_id,
        emergency_contact_name: student.emergency_contact_name,
        emergency_contact_phone: student.emergency_contact_phone,
        medical_notes: student.medical_notes,
        notes: student.notes,
        is_active: student.is_active,
        relationship: item.relationship,
        is_primary: item.is_primary,
        is_payer: item.is_payer,
        can_manage_enrollments: item.can_manage_enrollments,
        can_view_progress: item.can_view_progress,
        sync_cart_to_parent: item.sync_cart_to_parent,
        created_at: student.created_at,
        updated_at: student.updated_at,
      }
    }).filter((student) => student !== null && student.is_active !== false)  // 只返回活跃的学生
    
    // 调试日志（开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.log(`[GET /api/students] Returning ${students.length} active students`)
    }
    
    return NextResponse.json({
      students,
      total: students.length
    })
  } catch (error: unknown) {
    console.error("Error fetching students:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch students" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/students - 创建新学生
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
    const {
      name,
      birth_date,
      grade,
      school,
      emergency_contact_name,
      emergency_contact_phone,
      medical_notes,
      notes,
      relationship = 'parent',
      is_primary = false,
      is_payer = false,
      can_manage_enrollments = true,
      can_view_progress = true,
      sync_cart_to_parent = false
    } = body
    
    // 验证必填字段
    if (!name) {
      return NextResponse.json(
        { error: "Student name is required" },
        { status: 400 }
      )
    }
    
    // 验证relationship
    if (!['parent', 'guardian', 'other', 'self'].includes(relationship)) {
      return NextResponse.json(
        { error: "Invalid relationship. Must be 'parent', 'guardian', 'other', or 'self'" },
        { status: 400 }
      )
    }
    
    // 如果is_primary为true，检查是否已有primary关系
    if (is_primary) {
      const { data: existingPrimary } = await supabaseAdmin
        .from('user_students')
        .select('id')
        .eq('user_id', userId)
        .eq('is_primary', true)
        .limit(1)
      
      if (existingPrimary && existingPrimary.length > 0) {
        // 可以选择更新现有关系，或者返回错误
        // 这里我们允许有多个primary，但建议只有一个
        console.warn(`User ${userId} already has a primary relationship`)
      }
    }
    
    // 创建学生记录
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .insert({
        name,
        birth_date: birth_date || null,
        grade: grade || null,
        school: school || null,
        emergency_contact_name: emergency_contact_name || null,
        emergency_contact_phone: emergency_contact_phone || null,
        medical_notes: medical_notes || null,
        notes: notes || null,
        is_active: true
      })
      .select()
      .single()
    
    if (studentError) {
      throw new Error(`Failed to create student: ${studentError.message}`)
    }
    
    // 创建用户-学生关系
    const { data: userStudent, error: userStudentError } = await supabaseAdmin
      .from('user_students')
      .insert({
        user_id: userId,
        student_id: student.id,
        relationship,
        is_primary,
        is_payer,
        can_manage_enrollments,
        can_view_progress,
        sync_cart_to_parent
      })
      .select()
      .single()
    
    if (userStudentError) {
      // 如果创建关系失败，删除已创建的学生记录
      await supabaseAdmin
        .from('students')
        .delete()
        .eq('id', student.id)
      
      throw new Error(`Failed to create user-student relationship: ${userStudentError.message}`)
    }
    
    return NextResponse.json({
      student: {
        id: student.id,
        name: student.name,
        birth_date: student.birth_date,
        grade: student.grade,
        school: student.school,
        student_user_id: student.student_user_id,
        emergency_contact_name: student.emergency_contact_name,
        emergency_contact_phone: student.emergency_contact_phone,
        medical_notes: student.medical_notes,
        notes: student.notes,
        is_active: student.is_active,
        created_at: student.created_at,
        updated_at: student.updated_at,
      },
      relationship: {
        id: userStudent.id,
        relationship: userStudent.relationship,
        is_primary: userStudent.is_primary,
        is_payer: userStudent.is_payer,
        can_manage_enrollments: userStudent.can_manage_enrollments,
        can_view_progress: userStudent.can_view_progress,
        sync_cart_to_parent: userStudent.sync_cart_to_parent,
      },
      message: "Student created successfully"
    }, { status: 201 })
  } catch (error: unknown) {
    console.error("Error creating student:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to create student" },
      { status: 500 }
    )
  }
}
