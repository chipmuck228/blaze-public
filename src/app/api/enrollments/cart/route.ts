import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { 
  isStudentAccount, 
  getStudentIdByUserId, 
  getStudentPayer, 
  canManageStudent,
  shouldSyncCartToParent
} from "@/lib/permissions"
import { checkStudentPrerequisites } from "@/lib/db"

// POST /api/enrollments/cart - 加入购物车
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const userId = session.user.id
    const body = await request.json()
    const {
      instance_id,
      student_id,
      student_name,
      student_birth_date,
      student_info,
      payer_user_id
    } = body
    
    // 1. 验证学生信息
    if (!student_name) {
      return NextResponse.json(
        { error: "Student name is required" },
        { status: 400 }
      )
    }
    
    // 2. 检查用户是否是学生账户
    const isStudent = await isStudentAccount(userId)
    let finalStudentId: string | null = student_id || null
    
    if (isStudent) {
      // 学生账户只能为自己操作
      const studentId = await getStudentIdByUserId(userId)
      if (!studentId) {
        return NextResponse.json(
          { error: "Student account not found" },
          { status: 404 }
        )
      }
      
      // 验证student_id是否匹配
      if (student_id && student_id !== studentId) {
        return NextResponse.json(
          { error: "Student can only enroll for themselves" },
          { status: 403 }
        )
      }
      
      finalStudentId = studentId
      
      // 获取学生信息
      const { data: student } = await supabaseAdmin
        .from('students')
        .select('name, birth_date')
        .eq('id', studentId)
        .single()
      
      if (student) {
        // 使用学生表中的信息
        if (!student_name || student_name !== student.name) {
          return NextResponse.json(
            { error: "Student name mismatch" },
            { status: 400 }
          )
        }
        // 使用学生表中的出生日期（如果提供了）
        if (!student_birth_date && student.birth_date) {
          // student_birth_date 将在后面使用 student.birth_date
        }
      }
    } else {
      // 家长账户：验证权限
      if (student_id) {
        const canManage = await canManageStudent(userId, student_id)
        if (!canManage) {
          return NextResponse.json(
            { error: "Unauthorized to manage this student" },
            { status: 403 }
          )
        }
        finalStudentId = student_id
      }
    }
    
    // 3. 确定付款人（payer_user_id）
    let finalPayerUserId: string
    
    if (payer_user_id) {
      // 验证指定的付款人
      if (finalStudentId) {
        const { data: relation } = await supabaseAdmin
          .from('user_students')
          .select('is_payer')
          .eq('user_id', payer_user_id)
          .eq('student_id', finalStudentId)
          .single()
        
        if (!relation || !relation.is_payer) {
          return NextResponse.json(
            { error: "Invalid payer for this student" },
            { status: 400 }
          )
        }
      }
      finalPayerUserId = payer_user_id
    } else {
      // 自动确定付款人
      if (isStudent) {
        // 学生账户：查找该学生的主要付款人
        if (!finalStudentId) {
          return NextResponse.json(
            { error: "Student ID is required" },
            { status: 400 }
          )
        }
        const payerId = await getStudentPayer(finalStudentId)
        if (!payerId) {
          return NextResponse.json(
            { error: "No payer found for this student" },
            { status: 400 }
          )
        }
        finalPayerUserId = payerId
      } else {
        // 家长账户：检查当前用户是否是付款人
        if (finalStudentId) {
          const { data: relation } = await supabaseAdmin
            .from('user_students')
            .select('is_payer')
            .eq('user_id', userId)
            .eq('student_id', finalStudentId)
            .single()
          
          if (relation?.is_payer) {
            finalPayerUserId = userId
          } else {
            const payerId = await getStudentPayer(finalStudentId)
            if (!payerId) {
              return NextResponse.json(
                { error: "No payer found for this student" },
                { status: 400 }
              )
            }
            finalPayerUserId = payerId
          }
        } else {
          // 没有student_id，使用当前用户作为付款人
          finalPayerUserId = userId
        }
      }
    }
    
    // 4. 检查购物车同步设置
    let shouldSyncToParent = false
    let parentUserId: string | null = null
    
    if (isStudent && finalStudentId) {
      const syncInfo = await shouldSyncCartToParent(finalStudentId)
      shouldSyncToParent = syncInfo.shouldSync
      parentUserId = syncInfo.parentUserId
    }
    
    // 5. 检查实例状态和容量
    const { data: instance } = await supabaseAdmin
      .from('instance_v2')
      .select('id, max_students, current_students, is_active, status, start_date, age_min, age_max, offering_id')
      .eq('id', instance_id)
      .single()
    
    if (!instance || !instance.is_active || !['scheduled', 'ongoing'].includes(instance.status)) {
      return NextResponse.json(
        { error: "Instance not available" },
        { status: 400 }
      )
    }
    
    // 6. 验证年龄（如果提供了出生日期）
    let finalBirthDate = student_birth_date
    if (!finalBirthDate && finalStudentId) {
      // 尝试从students表获取出生日期
      const { data: student } = await supabaseAdmin
        .from('students')
        .select('birth_date')
        .eq('id', finalStudentId)
        .single()
      
      if (student?.birth_date) {
        finalBirthDate = student.birth_date
      }
    }
    
    if (finalBirthDate) {
      const birthDate = new Date(finalBirthDate)
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
      
      if (instance.age_min && age < instance.age_min) {
        return NextResponse.json(
          { 
            error: "Age requirement not met", 
            code: "AGE_REQUIREMENT_NOT_MET",
            required_age_min: instance.age_min,
            required_age_max: instance.age_max,
            student_age: age
          },
          { status: 403 }
        )
      }
      if (instance.age_max && age > instance.age_max) {
        return NextResponse.json(
          { 
            error: "Age requirement not met", 
            code: "AGE_REQUIREMENT_NOT_MET",
            required_age_min: instance.age_min,
            required_age_max: instance.age_max,
            student_age: age
          },
          { status: 403 }
        )
      }
    }
    
    // 7. 检查容量
    const availableCapacity = (instance.max_students || 0) - instance.current_students
    if (availableCapacity <= 0) {
      return NextResponse.json(
        { error: "Capacity full", code: "CAPACITY_FULL" },
        { status: 409 }
      )
    }
    
    // 8. 检查先修条件
    const prereqCheck = await checkStudentPrerequisites(
      userId,
      finalStudentId,
      student_name,
      instance.offering_id
    )
    
    if (!prereqCheck.canEnroll) {
      return NextResponse.json(
        { 
          error: "Prerequisites not met", 
          code: "PREREQUISITES_NOT_MET",
          missingPrerequisites: prereqCheck.missingPrerequisites,
          recommendations: prereqCheck.recommendations,
          groupRequirements: prereqCheck.groupRequirements
        },
        { status: 403 }
      )
    }
    
    // 9. 检查该学生是否已注册（enrolled状态）
    const { data: existingEnrolled } = await supabaseAdmin
      .from('instance_enrollments')
      .select('id, status')
      .eq('user_id', userId)
      .eq('instance_id', instance_id)
      .eq('student_name', student_name)
      .eq('status', 'enrolled')
      .maybeSingle()
    
    if (existingEnrolled) {
      return NextResponse.json(
        { 
          error: "Student already enrolled", 
          code: "ALREADY_ENROLLED",
          enrollment_id: existingEnrolled.id
        },
        { status: 409 }
      )
    }
    
    // 10. 检查该学生是否已在购物车中（未过期的cart状态）
    const { data: existingCart } = await supabaseAdmin
      .from('instance_enrollments')
      .select('id, status, cart_expires_at')
      .eq('user_id', userId)
      .eq('instance_id', instance_id)
      .eq('student_name', student_name)
      .eq('status', 'cart')
      .eq('is_synced', false)
      .gt('cart_expires_at', new Date().toISOString())
      .maybeSingle()
    
    if (existingCart) {
      return NextResponse.json(
        { 
          error: "Already in cart", 
          code: "ALREADY_IN_CART",
          enrollment_id: existingCart.id
        },
        { status: 409 }
      )
    }
    
    // 11. 创建购物车记录
    const cartExpiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15分钟后过期
    
    // 11.1 创建原始购物车记录（孩子账户或家长账户）
    const { data: enrollment, error: enrollError } = await supabaseAdmin
      .from('instance_enrollments')
      .insert({
        user_id: userId,
        payer_user_id: finalPayerUserId,
        instance_id: instance_id,
        student_id: finalStudentId,
        student_name: student_name,
        student_birth_date: finalBirthDate || null,
        student_info: student_info || null,
        status: 'cart',
        added_to_cart_at: new Date().toISOString(),
        cart_expires_at: cartExpiresAt.toISOString(),
        is_synced: false,
        sync_from_user_id: null,
        prerequisites_passed: prereqCheck.canEnroll,
        prerequisites_checked_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (enrollError) {
      // 检查是否是唯一约束冲突
      if (enrollError.code === '23505') {
        return NextResponse.json(
          { 
            error: "Already in cart or waitlist", 
            code: "ALREADY_IN_CART"
          },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: `Failed to add to cart: ${enrollError.message}` },
        { status: 500 }
      )
    }
    
    // 11.2 如果启用了购物车同步，创建同步记录（家长账户）
    if (shouldSyncToParent && parentUserId && isStudent) {
      const { error: syncError } = await supabaseAdmin
        .from('instance_enrollments')
        .insert({
          user_id: parentUserId,
          payer_user_id: finalPayerUserId,
          instance_id: instance_id,
          student_id: finalStudentId,
          student_name: student_name,
          student_birth_date: finalBirthDate || null,
          student_info: student_info || null,
          status: 'cart',
          added_to_cart_at: new Date().toISOString(),
          cart_expires_at: cartExpiresAt.toISOString(),
          is_synced: true,
          sync_from_user_id: userId, // 原始账户（孩子账户）
          prerequisites_passed: prereqCheck.canEnroll,
          prerequisites_checked_at: new Date().toISOString()
        })
      
      if (syncError) {
        // 如果同步失败，记录日志但不影响原始记录
        console.error('Failed to sync cart to parent:', syncError)
      }
    }
    
    return NextResponse.json({
      enrollment,
      synced: shouldSyncToParent,
      message: "Added to cart successfully"
    })
  } catch (error: any) {
    console.error("Error adding to cart:", error)
    return NextResponse.json(
      { error: error.message || "Failed to add to cart" },
      { status: 500 }
    )
  }
}

// GET /api/enrollments/cart - 获取购物车（包括同步过来的项）
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const userId = session.user.id
    
    // 1. 查询自己的购物车项（is_synced = false）
    const { data: ownCart, error: ownError } = await supabaseAdmin
      .from('instance_enrollments')
      .select(`
        *,
        instance:instance_v2(
          *,
          offering:offerings_v2(*)
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'cart')
      .eq('is_synced', false)
      .gt('cart_expires_at', new Date().toISOString())
    
    if (ownError) {
      throw ownError
    }
    
    // 2. 查询同步过来的购物车项（sync_from_user_id = 当前用户）
    const { data: syncedCart, error: syncedError } = await supabaseAdmin
      .from('instance_enrollments')
      .select(`
        *,
        instance:instance_v2(
          *,
          offering:offerings_v2(*)
        ),
        sync_from_user:users!instance_enrollments_sync_from_user_id_fkey(id, name, email)
      `)
      .eq('sync_from_user_id', userId)
      .eq('status', 'cart')
      .eq('is_synced', true)
      .gt('cart_expires_at', new Date().toISOString())
    
    if (syncedError) {
      throw syncedError
    }
    
    // 3. 合并两个结果集
    const allCartItems = [
      ...(ownCart || []).map(item => ({
        ...item,
        added_by: { user_id: userId, user_name: session.user.name }
      })),
      ...(syncedCart || []).map(item => ({
        ...item,
        added_by: {
          user_id: item.sync_from_user_id,
          user_name: (item.sync_from_user as any)?.name || 'Unknown'
        }
      }))
    ]
    
    // 4. 计算剩余时间
    const cartWithTimeRemaining = allCartItems.map(item => {
      const expiresAt = item.cart_expires_at ? new Date(item.cart_expires_at) : null
      const timeRemaining = expiresAt 
        ? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
        : 0
      
      return {
        ...item,
        time_remaining: timeRemaining
      }
    })
    
    // 5. 按学生分组（可选）
    const groupedByStudent: Record<string, any[]> = {}
    cartWithTimeRemaining.forEach(item => {
      const key = item.student_id || item.student_name
      if (!groupedByStudent[key]) {
        groupedByStudent[key] = []
      }
      groupedByStudent[key].push(item)
    })
    
    return NextResponse.json({
      items: cartWithTimeRemaining,
      total: cartWithTimeRemaining.length,
      grouped_by_student: groupedByStudent
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch cart" },
      { status: 500 }
    )
  }
}
