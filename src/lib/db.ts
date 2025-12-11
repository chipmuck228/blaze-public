import { supabaseAdmin } from './supabase'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export interface User {
  id: string
  name: string
  email: string
  password_hash?: string
  email_verified: boolean
  email_verification_token?: string
  email_verification_expires?: string
  role?: string
  created_at: string
  updated_at: string
}

export interface PasswordResetToken {
  id: string
  user_id: string
  token: string
  expires_at: string
  used: boolean
  created_at: string
}

// 用户操作
export async function createUser(name: string, email: string, password: string) {
  // 检查用户是否已存在
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  if (existingUser) {
    throw new Error('User already exists')
  }

  // 加密密码
  const password_hash = await bcrypt.hash(password, 10)

  // 生成邮箱验证令牌
  const email_verification_token = crypto.randomBytes(32).toString('hex')
  const email_verification_expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24小时后过期

  // 创建用户
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .insert({
      name,
      email,
      password_hash,
      email_verified: false,
      email_verification_token,
      email_verification_expires: email_verification_expires.toISOString(),
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`)
  }

  return user as User
}

export async function getUserByEmail(email: string) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', email)
    .single()

  if (error) {
    return null
  }

  return data as User
}

export async function getUserById(id: string) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    return null
  }

  return data as User
}

export async function verifyPassword(password: string, password_hash: string) {
  return await bcrypt.compare(password, password_hash)
}

// 邮箱验证
export async function verifyEmail(token: string) {
  const { data: user, error: findError } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email_verification_token', token)
    .single()

  if (findError || !user) {
    throw new Error('Invalid verification token')
  }

  // 检查令牌是否过期
  if (user.email_verification_expires && new Date(user.email_verification_expires) < new Date()) {
    throw new Error('Verification token has expired')
  }

  // 检查是否已验证
  if (user.email_verified) {
    throw new Error('Email already verified')
  }

  // 更新用户为已验证
  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({
      email_verified: true,
      email_verification_token: null,
      email_verification_expires: null,
    })
    .eq('id', user.id)

  if (updateError) {
    throw new Error(`Verification failed: ${updateError.message}`)
  }

  return user as User
}

export async function resendVerificationEmail(email: string) {
  const user = await getUserByEmail(email)

  if (!user) {
    throw new Error('User does not exist')
  }

  if (user.email_verified) {
    throw new Error('Email already verified')
  }

  // 生成新的验证令牌
  const email_verification_token = crypto.randomBytes(32).toString('hex')
  const email_verification_expires = new Date(Date.now() + 24 * 60 * 60 * 1000)

  const { error } = await supabaseAdmin
    .from('users')
    .update({
      email_verification_token,
      email_verification_expires: email_verification_expires.toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    throw new Error(`Failed to update verification token: ${error.message}`)
  }

  return { token: email_verification_token, user }
}

// 密码重置
export async function createPasswordResetToken(email: string) {
  const user = await getUserByEmail(email)

  if (!user) {
    // 为了安全，即使用户不存在也返回成功
    return null
  }

  // 生成重置令牌
  const token = crypto.randomBytes(32).toString('hex')
  const expires_at = new Date(Date.now() + 60 * 60 * 1000) // 1小时后过期

  // 保存令牌
  const { error } = await supabaseAdmin
    .from('password_reset_tokens')
    .insert({
      user_id: user.id,
      token,
      expires_at: expires_at.toISOString(),
      used: false,
    })

  if (error) {
    throw new Error(`Failed to create reset token: ${error.message}`)
  }

  return { token, user }
}

export async function verifyPasswordResetToken(token: string) {
  const { data, error } = await supabaseAdmin
    .from('password_reset_tokens')
    .select(`
      *,
      users (
        id,
        name,
        email,
        email_verified,
        created_at,
        updated_at
      )
    `)
    .eq('token', token)
    .eq('used', false)
    .single()

  if (error || !data) {
    throw new Error('Invalid reset token')
  }

  // 检查是否过期
  if (new Date(data.expires_at) < new Date()) {
    throw new Error('Reset token has expired')
  }

  const user = Array.isArray(data.users) ? data.users[0] : data.users
  return { ...data, user } as PasswordResetToken & { user: User }
}

export async function resetPassword(token: string, newPassword: string) {
  // 验证令牌
  const tokenData = await verifyPasswordResetToken(token)

  // 加密新密码
  const password_hash = await bcrypt.hash(newPassword, 10)

  // 更新密码
  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({ password_hash })
    .eq('id', tokenData.user_id)

  if (updateError) {
    throw new Error(`Failed to reset password: ${updateError.message}`)
  }

  // 标记令牌为已使用
  const { error: tokenError } = await supabaseAdmin
    .from('password_reset_tokens')
    .update({ used: true })
    .eq('id', tokenData.id)

  if (tokenError) {
    console.error('Failed to mark token as used:', tokenError)
  }

  return tokenData.user
}

// 创建或更新 Google 用户
export async function createOrUpdateGoogleUser(
  email: string,
  name: string,
  image?: string | null
): Promise<User> {
  // 检查用户是否已存在
  const existingUser = await getUserByEmail(email)

  if (existingUser) {
    // 用户已存在，更新信息（如头像）
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        name,
        email_verified: true, // Google 登录的用户邮箱已验证
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingUser.id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update user: ${error.message}`)
    }

    return data as User
  } else {
    // 用户不存在，创建新用户
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        name,
        email,
        email_verified: true, // Google 登录的用户邮箱已验证
        password_hash: null, // Google 用户没有密码
        role: 'user',
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`)
    }

    return data as User
  }
}

// 获取所有用户（管理员功能）
export async function getAllUsers() {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, name, email, email_verified, role, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`)
  }

  return data as Omit<User, 'password_hash' | 'email_verification_token' | 'email_verification_expires'>[]
}

// 更新用户（管理员功能）
export async function updateUser(userId: string, updates: {
  name?: string
  email?: string
  email_verified?: boolean
  role?: string
}) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update user: ${error.message}`)
  }

  return data as User
}

// 删除用户（管理员功能）
export async function deleteUser(userId: string) {
  const { error } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('id', userId)

  if (error) {
    throw new Error(`Failed to delete user: ${error.message}`)
  }

  return true
}

// 获取统计数据（管理员功能）
export interface AdminStats {
  totalUsers: number
  verifiedUsers: number
  admins: number
  newToday: number
}

export async function getAdminStats(): Promise<AdminStats> {
  // 获取总用户数
  const { count: totalUsers, error: totalError } = await supabaseAdmin
    .from('users')
    .select('id', { count: 'exact', head: true })

  if (totalError) {
    throw new Error(`Failed to fetch total users: ${totalError.message}`)
  }

  // 获取已验证用户数
  const { count: verifiedUsers, error: verifiedError } = await supabaseAdmin
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('email_verified', true)

  if (verifiedError) {
    throw new Error(`Failed to fetch verified users: ${verifiedError.message}`)
  }

  // 获取管理员数量
  const { count: admins, error: adminsError } = await supabaseAdmin
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'admin')

  if (adminsError) {
    throw new Error(`Failed to fetch admins: ${adminsError.message}`)
  }

  // 获取今天新注册的用户数
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayISO = today.toISOString()

  const { count: newToday, error: newTodayError } = await supabaseAdmin
    .from('users')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', todayISO)

  if (newTodayError) {
    throw new Error(`Failed to fetch new today users: ${newTodayError.message}`)
  }

  return {
    totalUsers: totalUsers || 0,
    verifiedUsers: verifiedUsers || 0,
    admins: admins || 0,
    newToday: newToday || 0,
  }
}

// 团队成员相关接口和函数
export interface TeamMember {
  id: string
  image_url: string
  name: string
  position: string
  description: string
  display_order: number
  created_at: string
  updated_at: string
  social_networks: TeamSocialNetwork[]
}

export interface TeamSocialNetwork {
  id: string
  name: string
  url: string
  display_order: number
}

// 获取所有团队成员
export async function getAllTeamMembers(): Promise<TeamMember[]> {
  // 获取所有团队成员
  const { data: teams, error: teamsError } = await supabaseAdmin
    .from('teams')
    .select('*')
    .order('display_order', { ascending: true })

  if (teamsError) {
    throw new Error(`Failed to fetch teams: ${teamsError.message}`)
  }

  if (!teams || teams.length === 0) {
    return []
  }

  // 获取所有社交媒体链接
  const teamIds = teams.map(team => team.id)
  const { data: socialNetworks, error: socialError } = await supabaseAdmin
    .from('team_social_networks')
    .select('*')
    .in('team_id', teamIds)
    .order('display_order', { ascending: true })

  if (socialError) {
    throw new Error(`Failed to fetch social networks: ${socialError.message}`)
  }

  // 组合数据
  const teamsWithSocial = teams.map(team => ({
    id: team.id,
    image_url: team.image_url,
    name: team.name,
    position: team.position,
    description: team.description,
    display_order: team.display_order,
    created_at: team.created_at,
    updated_at: team.updated_at,
    social_networks: (socialNetworks || [])
      .filter(sn => sn.team_id === team.id)
      .map(sn => ({
        id: sn.id,
        name: sn.name,
        url: sn.url,
        display_order: sn.display_order,
      })),
  }))

  return teamsWithSocial as TeamMember[]
}

// 创建团队成员
export async function createTeamMember(data: {
  image_url: string
  name: string
  position: string
  description: string
  display_order: number
  social_networks?: Array<{ name: string; url: string; display_order: number }>
}): Promise<TeamMember> {
  // 创建团队成员
  const { data: team, error: teamError } = await supabaseAdmin
    .from('teams')
    .insert({
      image_url: data.image_url,
      name: data.name,
      position: data.position,
      description: data.description,
      display_order: data.display_order,
    })
    .select()
    .single()

  if (teamError) {
    throw new Error(`Failed to create team member: ${teamError.message}`)
  }

  // 如果有社交媒体链接，创建它们
  if (data.social_networks && data.social_networks.length > 0) {
    const socialData = data.social_networks.map(sn => ({
      team_id: team.id,
      name: sn.name,
      url: sn.url,
      display_order: sn.display_order,
    }))

    const { error: socialError } = await supabaseAdmin
      .from('team_social_networks')
      .insert(socialData)

    if (socialError) {
      // 如果社交媒体链接创建失败，删除已创建的团队成员
      await supabaseAdmin.from('teams').delete().eq('id', team.id)
      throw new Error(`Failed to create social networks: ${socialError.message}`)
    }
  }

  // 获取完整的团队成员数据（包括社交媒体链接）
  const fullTeam = await getAllTeamMembers()
  const createdTeam = fullTeam.find(t => t.id === team.id)

  if (!createdTeam) {
    throw new Error('Failed to retrieve created team member')
  }

  return createdTeam
}

// 更新团队成员
export async function updateTeamMember(
  teamId: string,
  data: {
    image_url?: string
    name?: string
    position?: string
    description?: string
    display_order?: number
    social_networks?: Array<{ id?: string; name: string; url: string; display_order: number }>
  }
): Promise<TeamMember> {
  // 更新团队成员基本信息
  const updates: any = {}
  if (data.image_url !== undefined) updates.image_url = data.image_url
  if (data.name !== undefined) updates.name = data.name
  if (data.position !== undefined) updates.position = data.position
  if (data.description !== undefined) updates.description = data.description
  if (data.display_order !== undefined) updates.display_order = data.display_order

  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabaseAdmin
      .from('teams')
      .update(updates)
      .eq('id', teamId)

    if (updateError) {
      throw new Error(`Failed to update team member: ${updateError.message}`)
    }
  }

  // 更新社交媒体链接
  if (data.social_networks !== undefined) {
    // 删除现有的社交媒体链接
    const { error: deleteError } = await supabaseAdmin
      .from('team_social_networks')
      .delete()
      .eq('team_id', teamId)

    if (deleteError) {
      throw new Error(`Failed to delete social networks: ${deleteError.message}`)
    }

    // 插入新的社交媒体链接
    if (data.social_networks.length > 0) {
      const socialData = data.social_networks.map(sn => ({
        team_id: teamId,
        name: sn.name,
        url: sn.url,
        display_order: sn.display_order,
      }))

      const { error: insertError } = await supabaseAdmin
        .from('team_social_networks')
        .insert(socialData)

      if (insertError) {
        throw new Error(`Failed to insert social networks: ${insertError.message}`)
      }
    }
  }

  // 获取更新后的完整数据
  const fullTeam = await getAllTeamMembers()
  const updatedTeam = fullTeam.find(t => t.id === teamId)

  if (!updatedTeam) {
    throw new Error('Failed to retrieve updated team member')
  }

  return updatedTeam
}

// 删除团队成员
export async function deleteTeamMember(teamId: string): Promise<boolean> {
  // 删除团队成员会自动删除关联的社交媒体链接（CASCADE）
  const { error } = await supabaseAdmin
    .from('teams')
    .delete()
    .eq('id', teamId)

  if (error) {
    throw new Error(`Failed to delete team member: ${error.message}`)
  }

  return true
}

// ==================== 课程相关类型定义 ====================

export interface CourseCategory {
  id: string
  name: string
  display_name: string
  description?: string
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CourseSeries {
  id: string
  category_id: string
  name: string
  display_name: string
  description?: string
  start_date?: string
  end_date?: string
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CourseSubcategory {
  id: string
  name: string
  display_name: string
  description?: string
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Course {
  id: string
  name: string
  slug?: string
  description?: string
  target_audience?: string
  outcomes?: string
  prerequisites?: string
  cancellation_policy?: string
  number_of_sessions?: number
  target_age_min?: number
  target_age_max?: number
  target_grades?: string[]
  base_price?: number
  currency?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CourseAssignment {
  id: string
  course_id: string
  category_id: string
  series_id: string
  location_id?: string
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CourseAssignmentWithDetails extends CourseAssignment {
  course?: Course
  category?: CourseCategory
  series?: CourseSeries
  location?: CourseLocation
  subcategories?: CourseSubcategory[]
}

export interface CourseLocation {
  id: string
  name: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  phone?: string
  email?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CourseInstance {
  id: string
  assignment_id: string
  location_id?: string
  start_date: string
  end_date: string
  start_time?: string
  end_time?: string
  days_of_week?: number[]
  // iCalendar (RFC5545) 字段
  icalendar_rrule?: string        // RRULE 字符串
  icalendar_exdates?: string[]   // 排除日期数组，格式: ['20250121', '20250218']
  icalendar_rdates?: string[]    // 额外日期数组，格式: ['20250122T090000', '20250219T090000']
  timezone?: string               // 时区，默认 'America/Los_Angeles'
  price_override?: number
  max_students?: number
  current_students: number
  instructor_name?: string
  instructor_id?: string
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled'
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CourseInstanceWithDetails extends CourseInstance {
  assignment?: CourseAssignmentWithDetails
  location?: CourseLocation
}

// 例外日期接口
export interface CourseInstanceException {
  id: string
  instance_id: string
  exception_type: 'skip' | 'reschedule' | 'time_change'
  original_date: string
  new_date?: string
  new_start_time?: string
  new_end_time?: string
  reason?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// 完整的课程信息（包含关联数据）
export interface CourseWithDetails extends Course {
  subcategories?: CourseSubcategory[]
  assignments?: CourseAssignmentWithDetails[]
}

// ==================== 课程相关数据库操作函数 ====================

// 获取所有课程大类
export async function getAllCourseCategories(): Promise<CourseCategory[]> {
  const { data, error } = await supabaseAdmin
    .from('course_categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch course categories: ${error.message}`)
  }

  return data as CourseCategory[]
}

// 获取指定大类的所有系列
export async function getCourseSeriesByCategory(categoryId: string): Promise<CourseSeries[]> {
  const { data, error } = await supabaseAdmin
    .from('course_series')
    .select('*')
    .eq('category_id', categoryId)
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch course series: ${error.message}`)
  }

  return data as CourseSeries[]
}

// 获取所有子类标签（独立管理）
export async function getAllCourseSubcategories(): Promise<CourseSubcategory[]> {
  const { data, error } = await supabaseAdmin
    .from('course_subcategories')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch course subcategories: ${error.message}`)
  }

  return data as CourseSubcategory[]
}

// 获取所有课程（独立管理）
export async function getAllCourses(): Promise<Course[]> {
  const { data, error } = await supabaseAdmin
    .from('courses')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch courses: ${error.message}`)
  }

  return data as Course[]
}

// 根据slug获取课程
export async function getCourseBySlug(slug: string): Promise<Course | null> {
  const { data, error } = await supabaseAdmin
    .from('courses')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error) {
    return null
  }

  return data as Course
}

// 获取课程详细信息（包含关联数据）
export async function getCourseWithDetails(courseId: string): Promise<CourseWithDetails | null> {
  const { data: course, error: courseError } = await supabaseAdmin
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .eq('is_active', true)
    .single()

  if (courseError || !course) {
    return null
  }

  // 获取子类标签
  const { data: subcategoryTags } = await supabaseAdmin
    .from('course_subcategory_tags')
    .select('subcategory_id')
    .eq('course_id', courseId)

  let subcategories: CourseSubcategory[] = []
  if (subcategoryTags && subcategoryTags.length > 0) {
    const subcategoryIds = subcategoryTags.map(t => t.subcategory_id)
    const { data: subcategoriesData } = await supabaseAdmin
      .from('course_subcategories')
      .select('*')
      .in('id', subcategoryIds)
      .eq('is_active', true)
    
    subcategories = (subcategoriesData || []) as CourseSubcategory[]
  }

  // 获取所有分配（带详细信息）
  const { data: assignmentsData } = await supabaseAdmin
    .from('course_assignments')
    .select('*')
    .eq('course_id', courseId)
    .eq('is_active', true)

  const assignmentsWithDetails: CourseAssignmentWithDetails[] = []
  if (assignmentsData && assignmentsData.length > 0) {
    for (const assignment of assignmentsData) {
      const [category, series, location] = await Promise.all([
        supabaseAdmin.from('course_categories').select('*').eq('id', assignment.category_id).single(),
        supabaseAdmin.from('course_series').select('*').eq('id', assignment.series_id).single(),
        assignment.location_id 
          ? supabaseAdmin.from('course_locations').select('*').eq('id', assignment.location_id).single()
          : Promise.resolve({ data: null })
      ])

      assignmentsWithDetails.push({
        ...assignment,
        category: category.data as CourseCategory | undefined,
        series: series.data as CourseSeries | undefined,
        location: location.data as CourseLocation | undefined,
        subcategories,
      })
    }
  }

  return {
    ...course,
    subcategories,
    assignments: assignmentsWithDetails,
  } as CourseWithDetails
}

// 获取指定 Assignment 的所有实例
export async function getCourseInstancesByAssignment(assignmentId: string): Promise<CourseInstance[]> {
  const { data, error } = await supabaseAdmin
    .from('course_instances')
    .select('*')
    .eq('assignment_id', assignmentId)
    .eq('is_active', true)
    .order('start_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch course instances: ${error.message}`)
  }

  return data as CourseInstance[]
}

// 获取指定课程的所有实例（通过所有 Assignment）
export async function getCourseInstances(courseId: string): Promise<CourseInstance[]> {
  // 先获取所有 Assignment
  const { data: assignments } = await supabaseAdmin
    .from('course_assignments')
    .select('id')
    .eq('course_id', courseId)
    .eq('is_active', true)

  if (!assignments || assignments.length === 0) {
    return []
  }

  const assignmentIds = assignments.map(a => a.id)
  const { data, error } = await supabaseAdmin
    .from('course_instances')
    .select('*')
    .in('assignment_id', assignmentIds)
    .eq('is_active', true)
    .order('start_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch course instances: ${error.message}`)
  }

  return data as CourseInstance[]
}

// 获取所有地点
export async function getAllCourseLocations(): Promise<CourseLocation[]> {
  const { data, error } = await supabaseAdmin
    .from('course_locations')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch course locations: ${error.message}`)
  }

  return data as CourseLocation[]
}

// 创建课程实例
export async function createCourseInstance(instance: Omit<CourseInstance, 'id' | 'created_at' | 'updated_at'>): Promise<CourseInstance> {
  // 自动生成 RRULE（如果提供了 days_of_week 且没有提供 icalendar_rrule）
  const { autoGenerateRRULE } = await import('./icalendar')
  const rrule = instance.icalendar_rrule || autoGenerateRRULE(instance)
  
  const instanceWithRRULE = {
    ...instance,
    icalendar_rrule: rrule,
    timezone: instance.timezone || 'America/Los_Angeles',
  }

  const { data, error } = await supabaseAdmin
    .from('course_instances')
    .insert(instanceWithRRULE)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create course instance: ${error.message}`)
  }

  return data as CourseInstance
}

// 更新课程实例
export async function updateCourseInstance(
  instanceId: string,
  updates: Partial<Omit<CourseInstance, 'id' | 'created_at' | 'updated_at'>>
): Promise<CourseInstance> {
  // 如果更新了日期或星期几，自动重新生成 RRULE
  const { autoGenerateRRULE } = await import('./icalendar')
  
  // 先获取当前实例
  const { data: currentInstance } = await supabaseAdmin
    .from('course_instances')
    .select('*')
    .eq('id', instanceId)
    .single()

  if (currentInstance) {
    const mergedInstance = { ...currentInstance, ...updates } as CourseInstance
    
    // 如果更新了 start_date, end_date, days_of_week，且没有明确提供 icalendar_rrule，则重新生成
    if (
      (updates.start_date !== undefined || 
       updates.end_date !== undefined || 
       updates.days_of_week !== undefined) &&
      updates.icalendar_rrule === undefined
    ) {
      const rrule = autoGenerateRRULE(mergedInstance)
      if (rrule) {
        updates.icalendar_rrule = rrule
      }
    }
  }

  // 确保 location_id 如果是 undefined，则设置为 null（允许清除 location）
  const updateData: any = { ...updates }
  if (updateData.location_id === undefined && 'location_id' in updates) {
    updateData.location_id = null
  }

  const { data, error } = await supabaseAdmin
    .from('course_instances')
    .update(updateData)
    .eq('id', instanceId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update course instance: ${error.message}`)
  }

  return data as CourseInstance
}

// 删除课程实例
export async function deleteCourseInstance(instanceId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('course_instances')
    .delete()
    .eq('id', instanceId)

  if (error) {
    throw new Error(`Failed to delete course instance: ${error.message}`)
  }

  return true
}

// ==================== Course CRUD 操作 ====================

// 创建课程
export async function createCourse(course: Omit<Course, 'id' | 'created_at' | 'updated_at'>): Promise<Course> {
  const { data, error } = await supabaseAdmin
    .from('courses')
    .insert(course)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create course: ${error.message}`)
  }

  return data as Course
}

// 更新课程
export async function updateCourse(
  courseId: string,
  updates: Partial<Omit<Course, 'id' | 'created_at' | 'updated_at'>>
): Promise<Course> {
  const { data, error } = await supabaseAdmin
    .from('courses')
    .update(updates)
    .eq('id', courseId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update course: ${error.message}`)
  }

  return data as Course
}

// 删除课程（会级联删除所有 Assignment 和 Instance）
export async function deleteCourse(courseId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('courses')
    .delete()
    .eq('id', courseId)

  if (error) {
    throw new Error(`Failed to delete course: ${error.message}`)
  }

  return true
}

// ==================== Course Subcategory Tags 操作 ====================

// 为课程添加子类标签
export async function addCourseSubcategoryTag(courseId: string, subcategoryId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('course_subcategory_tags')
    .insert({
      course_id: courseId,
      subcategory_id: subcategoryId,
    })

  if (error) {
    throw new Error(`Failed to add subcategory tag: ${error.message}`)
  }
}

// 移除课程的子类标签
export async function removeCourseSubcategoryTag(courseId: string, subcategoryId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('course_subcategory_tags')
    .delete()
    .eq('course_id', courseId)
    .eq('subcategory_id', subcategoryId)

  if (error) {
    throw new Error(`Failed to remove subcategory tag: ${error.message}`)
  }
}

// 更新课程的所有子类标签
export async function updateCourseSubcategoryTags(courseId: string, subcategoryIds: string[]): Promise<void> {
  // 先删除所有现有标签
  const { error: deleteError } = await supabaseAdmin
    .from('course_subcategory_tags')
    .delete()
    .eq('course_id', courseId)

  if (deleteError) {
    throw new Error(`Failed to remove existing tags: ${deleteError.message}`)
  }

  // 添加新标签
  if (subcategoryIds.length > 0) {
    const tags = subcategoryIds.map(subcategoryId => ({
      course_id: courseId,
      subcategory_id: subcategoryId,
    }))

    const { error: insertError } = await supabaseAdmin
      .from('course_subcategory_tags')
      .insert(tags)

    if (insertError) {
      throw new Error(`Failed to add new tags: ${insertError.message}`)
    }
  }
}

// ==================== Course Assignment CRUD 操作 ====================

// 获取所有 Course Assignments
export async function getAllCourseAssignments(): Promise<CourseAssignmentWithDetails[]> {
  const { data: assignments, error } = await supabaseAdmin
    .from('course_assignments')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch course assignments: ${error.message}`)
  }

  // 获取详细信息
  const assignmentsWithDetails: CourseAssignmentWithDetails[] = []
  for (const assignment of assignments || []) {
    const [course, category, series, location] = await Promise.all([
      supabaseAdmin.from('courses').select('*').eq('id', assignment.course_id).single(),
      supabaseAdmin.from('course_categories').select('*').eq('id', assignment.category_id).single(),
      supabaseAdmin.from('course_series').select('*').eq('id', assignment.series_id).single(),
      assignment.location_id
        ? supabaseAdmin.from('course_locations').select('*').eq('id', assignment.location_id).single()
        : Promise.resolve({ data: null })
    ])

    // 获取课程的标签
    const { data: tagData } = await supabaseAdmin
      .from('course_subcategory_tags')
      .select('subcategory_id')
      .eq('course_id', assignment.course_id)

    let subcategories: CourseSubcategory[] = []
    if (tagData && tagData.length > 0) {
      const subcategoryIds = tagData.map(t => t.subcategory_id)
      const { data: subcategoriesData } = await supabaseAdmin
        .from('course_subcategories')
        .select('*')
        .in('id', subcategoryIds)
        .eq('is_active', true)

      subcategories = (subcategoriesData || []) as CourseSubcategory[]
    }

    assignmentsWithDetails.push({
      ...assignment,
      course: course.data as Course | undefined,
      category: category.data as CourseCategory | undefined,
      series: series.data as CourseSeries | undefined,
      location: location.data as CourseLocation | undefined,
      subcategories,
    })
  }

  return assignmentsWithDetails
}

// 获取指定 Series 的所有 Assignments
export async function getCourseAssignmentsBySeries(seriesId: string): Promise<CourseAssignmentWithDetails[]> {
  const { data: assignments, error } = await supabaseAdmin
    .from('course_assignments')
    .select('*')
    .eq('series_id', seriesId)
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch course assignments: ${error.message}`)
  }

  // 获取详细信息（类似上面的逻辑）
  const assignmentsWithDetails: CourseAssignmentWithDetails[] = []
  for (const assignment of assignments || []) {
    const [course, category, series, location] = await Promise.all([
      supabaseAdmin.from('courses').select('*').eq('id', assignment.course_id).single(),
      supabaseAdmin.from('course_categories').select('*').eq('id', assignment.category_id).single(),
      supabaseAdmin.from('course_series').select('*').eq('id', assignment.series_id).single(),
      assignment.location_id
        ? supabaseAdmin.from('course_locations').select('*').eq('id', assignment.location_id).single()
        : Promise.resolve({ data: null })
    ])

    const { data: tagData } = await supabaseAdmin
      .from('course_subcategory_tags')
      .select('subcategory_id')
      .eq('course_id', assignment.course_id)

    let subcategories: CourseSubcategory[] = []
    if (tagData && tagData.length > 0) {
      const subcategoryIds = tagData.map(t => t.subcategory_id)
      const { data: subcategoriesData } = await supabaseAdmin
        .from('course_subcategories')
        .select('*')
        .in('id', subcategoryIds)
        .eq('is_active', true)

      subcategories = (subcategoriesData || []) as CourseSubcategory[]
    }

    assignmentsWithDetails.push({
      ...assignment,
      course: course.data as Course | undefined,
      category: category.data as CourseCategory | undefined,
      series: series.data as CourseSeries | undefined,
      location: location.data as CourseLocation | undefined,
      subcategories,
    })
  }

  return assignmentsWithDetails
}

// 创建 Course Assignment
export async function createCourseAssignment(
  assignment: Omit<CourseAssignment, 'id' | 'created_at' | 'updated_at'>
): Promise<CourseAssignment> {
  // 验证 series 属于指定的 category
  const { data: series, error: seriesError } = await supabaseAdmin
    .from('course_series')
    .select('category_id')
    .eq('id', assignment.series_id)
    .single()

  if (seriesError || !series || series.category_id !== assignment.category_id) {
    throw new Error('Series does not belong to the specified category')
  }

  const { data, error } = await supabaseAdmin
    .from('course_assignments')
    .insert(assignment)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create course assignment: ${error.message}`)
  }

  return data as CourseAssignment
}

// 更新 Course Assignment
export async function updateCourseAssignment(
  assignmentId: string,
  updates: Partial<Omit<CourseAssignment, 'id' | 'created_at' | 'updated_at'>>
): Promise<CourseAssignment> {
  // 如果更新了 category_id 或 series_id，需要验证
  if (updates.category_id || updates.series_id) {
    const { data: currentAssignment } = await supabaseAdmin
      .from('course_assignments')
      .select('category_id, series_id')
      .eq('id', assignmentId)
      .single()

    const categoryId = updates.category_id || currentAssignment?.category_id
    const seriesId = updates.series_id || currentAssignment?.series_id

    if (categoryId && seriesId) {
      const { data: series, error: seriesError } = await supabaseAdmin
        .from('course_series')
        .select('category_id')
        .eq('id', seriesId)
        .single()

      if (seriesError || !series || series.category_id !== categoryId) {
        throw new Error('Series does not belong to the specified category')
      }
    }
  }

  const { data, error } = await supabaseAdmin
    .from('course_assignments')
    .update(updates)
    .eq('id', assignmentId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update course assignment: ${error.message}`)
  }

  return data as CourseAssignment
}

// 删除 Course Assignment（会级联删除所有 Instance）
export async function deleteCourseAssignment(assignmentId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('course_assignments')
    .delete()
    .eq('id', assignmentId)

  if (error) {
    throw new Error(`Failed to delete course assignment: ${error.message}`)
  }

  return true
}

// ==================== Category 和 Series CRUD 操作 ====================

// 检查 Category 是否有 Assignment
export async function hasCategoryAssignments(categoryId: string): Promise<boolean> {
  const { count, error } = await supabaseAdmin
    .from('course_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', categoryId)
    .eq('is_active', true)

  if (error) {
    throw new Error(`Failed to check category assignments: ${error.message}`)
  }

  return (count || 0) > 0
}

// 检查 Series 是否有 Assignment
export async function hasSeriesAssignments(seriesId: string): Promise<boolean> {
  const { count, error } = await supabaseAdmin
    .from('course_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('series_id', seriesId)
    .eq('is_active', true)

  if (error) {
    throw new Error(`Failed to check series assignments: ${error.message}`)
  }

  return (count || 0) > 0
}

// ==================== Coach Portal 相关函数 ====================

// 获取教练的所有课程实例（通过 course_instance_coaches 表）
export async function getCoachInstances(coachUserId: string): Promise<CourseInstanceWithDetails[]> {
  // 1. 通过 course_instance_coaches 表获取 instance_id 列表
  const { data: coachInstances, error: coachError } = await supabaseAdmin
    .from('course_instance_coaches')
    .select('instance_id')
    .eq('coach_id', coachUserId)

  if (coachError) {
    throw new Error(`Failed to fetch coach instances: ${coachError.message}`)
  }

  const instanceIds = coachInstances?.map(ci => ci.instance_id) || []

  // 2. 同时查询旧的 instructor_id（向后兼容）
  const { data: oldInstances, error: oldError } = await supabaseAdmin
    .from('course_instances')
    .select('id')
    .eq('instructor_id', coachUserId)
    .eq('is_active', true)

  if (oldError) {
    throw new Error(`Failed to fetch old instances: ${oldError.message}`)
  }

  const oldInstanceIds = oldInstances?.map(i => i.id) || []

  // 3. 合并并去重
  const allInstanceIds = [...new Set([...instanceIds, ...oldInstanceIds])]

  if (allInstanceIds.length === 0) {
    return []
  }

  // 4. 获取完整的课程实例数据
  const { data: instances, error: instancesError } = await supabaseAdmin
    .from('course_instances')
    .select(`
      *,
      assignment:course_assignments(
        id,
        course_id,
        category_id,
        series_id,
        location_id,
        display_order,
        is_active,
        course:courses(
          id,
          name,
          description,
          target_audience,
          learning_outcomes,
          cancellation_policy,
          prerequisites,
          base_price,
          duration_hours,
          session_count,
          age_min,
          age_max,
          grade_level
        ),
        category:course_categories(
          id,
          name,
          display_order
        ),
        series:course_series(
          id,
          name,
          category_id,
          start_date,
          end_date,
          display_order
        )
      ),
      location:course_locations(
        id,
        name,
        address,
        city,
        state,
        zip_code
      )
    `)
    .in('id', allInstanceIds)
    .eq('is_active', true)
    .order('start_date', { ascending: true })

  if (instancesError) {
    throw new Error(`Failed to fetch instances: ${instancesError.message}`)
  }

  return instances as CourseInstanceWithDetails[]
}

// 获取教练的单个课程实例（验证权限）
export async function getCoachInstanceById(
  coachUserId: string,
  instanceId: string
): Promise<CourseInstanceWithDetails | null> {
  // 验证教练是否有权限访问该实例
  const { data: coachInstance, error: coachError } = await supabaseAdmin
    .from('course_instance_coaches')
    .select('instance_id')
    .eq('coach_id', coachUserId)
    .eq('instance_id', instanceId)
    .single()

  // 同时检查旧的 instructor_id（向后兼容）
  const { data: oldInstance, error: oldError } = await supabaseAdmin
    .from('course_instances')
    .select('id')
    .eq('id', instanceId)
    .eq('instructor_id', coachUserId)
    .eq('is_active', true)
    .single()

  // 如果两个查询都没有结果，说明没有权限
  if (coachError && oldError) {
    return null
  }

  // 获取完整的课程实例数据
  const { data: instance, error: instanceError } = await supabaseAdmin
    .from('course_instances')
    .select(`
      *,
      assignment:course_assignments(
        id,
        course_id,
        category_id,
        series_id,
        location_id,
        display_order,
        is_active,
        course:courses(
          id,
          name,
          description,
          target_audience,
          learning_outcomes,
          cancellation_policy,
          prerequisites,
          base_price,
          duration_hours,
          session_count,
          age_min,
          age_max,
          grade_level
        ),
        category:course_categories(
          id,
          name,
          display_order
        ),
        series:course_series(
          id,
          name,
          category_id,
          start_date,
          end_date,
          display_order
        )
      ),
      location:course_locations(
        id,
        name,
        address,
        city,
        state,
        zip_code
      )
    `)
    .eq('id', instanceId)
    .eq('is_active', true)
    .single()

  if (instanceError) {
    return null
  }

  return instance as CourseInstanceWithDetails
}

// 获取教练的统计数据
export async function getCoachStats(coachUserId: string): Promise<{
  totalClasses: number
  upcomingClasses: number
  ongoingClasses: number
  completedClasses: number
}> {
  const instances = await getCoachInstances(coachUserId)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const totalClasses = instances.length
  const upcomingClasses = instances.filter(inst => {
    const startDate = new Date(inst.start_date)
    return startDate >= today && inst.status === 'scheduled'
  }).length
  const ongoingClasses = instances.filter(inst => inst.status === 'ongoing').length
  const completedClasses = instances.filter(inst => inst.status === 'completed').length

  return {
    totalClasses,
    upcomingClasses,
    ongoingClasses,
    completedClasses,
  }
}

