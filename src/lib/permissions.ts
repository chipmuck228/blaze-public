import { supabaseAdmin } from "@/lib/supabase"

/**
 * 检查用户是否是学生账户（通过students.student_user_id）
 * 如果学生的student_user_id等于userId，说明这是一个学生账户
 */
export async function isStudentAccount(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('students')
    .select('id')
    .eq('student_user_id', userId)
    .eq('is_active', true)
    .not('student_user_id', 'is', null)  // 确保student_user_id不为NULL
    .limit(1);
  
  return (data?.length ?? 0) > 0;
}

/**
 * 获取学生ID（如果用户是学生账户）
 * 返回与学生账户关联的学生记录ID
 */
export async function getStudentIdByUserId(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('students')
    .select('id')
    .eq('student_user_id', userId)
    .eq('is_active', true)
    .not('student_user_id', 'is', null)  // 确保student_user_id不为NULL
    .single();
  
  return data?.id ?? null;
}

/**
 * 检查学生是否有独立账户
 * 如果student_user_id不为NULL，说明学生有独立账户
 */
export async function studentHasAccount(studentId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('students')
    .select('student_user_id')
    .eq('id', studentId)
    .single();
  
  return data?.student_user_id !== null;
}

/**
 * 权限检查函数
 * 检查用户是否有权限对某个enrollment执行特定操作
 */
export async function checkEnrollmentPermission(
  userId: string,
  enrollmentId: string,
  action: 'view' | 'add_to_cart' | 'remove_from_cart' | 'checkout' | 'pay' | 'refund' | 'view_qr_code' | 'check_in'
): Promise<boolean> {
  // 获取enrollment信息
  const { data: enrollment } = await supabaseAdmin
    .from('instance_enrollments')
    .select('user_id, payer_user_id, student_id, student_name')
    .eq('id', enrollmentId)
    .single();
  
  if (!enrollment) return false;
  
  // 检查用户是否是学生账户（仅当student_user_id不为NULL时）
  const isStudent = await isStudentAccount(userId);
  const studentId = isStudent ? await getStudentIdByUserId(userId) : null;
  
  switch (action) {
    case 'view':
      // 如果用户是学生账户，只能查看自己的enrollment
      if (isStudent && studentId) {
        return enrollment.student_id === studentId;
      }
      // 家长账户可以查看自己管理的学生的enrollment
      return enrollment.user_id === userId || enrollment.payer_user_id === userId;
      
    case 'add_to_cart':
    case 'remove_from_cart':
      // 如果用户是学生账户，只能操作自己的enrollment
      if (isStudent && studentId) {
        return enrollment.student_id === studentId && enrollment.user_id === userId;
      }
      // 家长账户可以操作自己管理的学生的enrollment
      return enrollment.user_id === userId;
      
    case 'checkout':
    case 'pay':
    case 'refund':
      // 只有付款人可以支付和退款
      // 学生账户（如果有）不能支付
      if (isStudent) {
        return false;
      }
      return enrollment.payer_user_id === userId;
      
    case 'view_qr_code':
      // 如果用户是学生账户，可以查看自己的二维码
      if (isStudent && studentId) {
        return enrollment.student_id === studentId;
      }
      // 家长账户可以查看所有管理的学生的二维码
      return enrollment.payer_user_id === userId;
      
    case 'check_in':
      // 只有管理员和教练可以核销
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();
      
      return user?.role === 'admin' || user?.role === 'coach';
      
    default:
      return false;
  }
}

/**
 * 检查用户是否可以管理学生
 * 通过user_students表的can_manage_enrollments字段判断
 */
export async function canManageStudent(
  userId: string,
  studentId: string
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('user_students')
    .select('can_manage_enrollments')
    .eq('user_id', userId)
    .eq('student_id', studentId)
    .single();
  
  return data?.can_manage_enrollments ?? false;
}

/**
 * 获取学生的付款人
 * 返回学生的primary payer（is_payer = true 且 is_primary = true）
 */
export async function getStudentPayer(
  studentId: string
): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('user_students')
    .select('user_id')
    .eq('student_id', studentId)
    .eq('is_payer', true)
    .eq('is_primary', true)
    .single();
  
  return data?.user_id ?? null;
}

/**
 * 检查用户是否可以查看学生的进度
 * 通过user_students表的can_view_progress字段判断
 */
export async function canViewStudentProgress(
  userId: string,
  studentId: string
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('user_students')
    .select('can_view_progress')
    .eq('user_id', userId)
    .eq('student_id', studentId)
    .single();
  
  return data?.can_view_progress ?? false;
}

/**
 * 检查购物车是否应该同步到家长账户
 * 通过user_students表的sync_cart_to_parent字段判断
 * 返回同步信息和家长用户ID
 */
export async function shouldSyncCartToParent(
  studentId: string
): Promise<{ shouldSync: boolean; parentUserId: string | null }> {
  // 查找该学生的付款人（is_payer = true）且启用了购物车同步（sync_cart_to_parent = true）
  const { data } = await supabaseAdmin
    .from('user_students')
    .select('user_id, sync_cart_to_parent')
    .eq('student_id', studentId)
    .eq('is_payer', true)
    .eq('sync_cart_to_parent', true)
    .single();
  
  if (data && data.sync_cart_to_parent) {
    return {
      shouldSync: true,
      parentUserId: data.user_id
    };
  }
  
  return {
    shouldSync: false,
    parentUserId: null
  };
}

/**
 * 获取用户管理的所有学生
 * 返回用户通过user_students表关联的所有学生
 */
export async function getUserStudents(userId: string): Promise<Array<{
  student_id: string;
  student_name: string;
  relationship: string;
  is_primary: boolean;
  is_payer: boolean;
  can_manage_enrollments: boolean;
  can_view_progress: boolean;
  sync_cart_to_parent: boolean;
}>> {
  const { data, error } = await supabaseAdmin
    .from('user_students')
    .select(`
      student_id,
      relationship,
      is_primary,
      is_payer,
      can_manage_enrollments,
      can_view_progress,
      sync_cart_to_parent,
      student:students(id, name, birth_date, grade, student_user_id, is_active)
    `)
    .eq('user_id', userId);
  
  if (error) {
    throw new Error(`Failed to fetch user students: ${error.message}`);
  }
  
  return (data || []).map((item: any) => {
    const student = Array.isArray(item.student) ? item.student[0] : item.student;
    return {
      student_id: item.student_id,
      student_name: student?.name || '',
      relationship: item.relationship,
      is_primary: item.is_primary,
      is_payer: item.is_payer,
      can_manage_enrollments: item.can_manage_enrollments,
      can_view_progress: item.can_view_progress,
      sync_cart_to_parent: item.sync_cart_to_parent,
    };
  }).filter((item: any) => {
    // 只返回活跃的学生
    const student = (data || []).find((d: any) => d.student_id === item.student_id);
    const studentData = Array.isArray(student?.student) ? student.student[0] : student?.student;
    return studentData?.is_active !== false;
  });
}
