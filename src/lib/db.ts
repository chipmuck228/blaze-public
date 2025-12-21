import { supabaseAdmin } from './supabase'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

// 生成随机密码（12位，包含大小写字母、数字、特殊字符）
export function generateRandomPassword(length: number = 12): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'
  const special = '!@#$%^&*'
  const allChars = lowercase + uppercase + numbers + special
  
  let password = ''
  
  // 确保至少包含每种类型的字符
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += special[Math.floor(Math.random() * special.length)]
  
  // 填充剩余长度
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }
  
  // 打乱字符顺序
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

// 生成邀请令牌（UUID v4）
export function generateInvitationToken(): string {
  return crypto.randomUUID()
}

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
  // 用户创建和邀请相关字段
  is_test_user?: boolean
  created_by?: string | null
  invitation_token?: string | null
  invitation_expires_at?: string | null
  invitation_sent_at?: string | null
  password_set_at?: string | null
  must_change_password?: boolean
  last_password_change?: string | null
  // Stripe 相关字段
  stripe_customer_id?: string | null
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
  try {
    // 检查用户是否已存在
    const existingUser = await getUserByEmail(email)

    if (existingUser) {
      // 用户已存在，更新信息（如头像、名称）
      const updateData: any = {
        name,
        email_verified: true, // Google 登录的用户邮箱已验证
        updated_at: new Date().toISOString(),
      }
      
      // 如果提供了头像，也更新头像
      if (image) {
        updateData.image = image
      }

      const { data, error } = await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('id', existingUser.id)
        .select()
        .single()

      if (error) {
        console.error("Error updating Google user:", { error: error.message, email, userId: existingUser.id })
        throw new Error(`Failed to update user: ${error.message}`)
      }

      if (!data) {
        console.error("Error updating Google user: No data returned", { email, userId: existingUser.id })
        throw new Error("Failed to update user: No data returned")
      }

      console.log("Google user updated successfully", { userId: data.id, email })
      return data as User
    } else {
      // 用户不存在，创建新用户
      const insertData: any = {
        name,
        email,
        email_verified: true, // Google 登录的用户邮箱已验证
        password_hash: null, // Google 用户没有密码
        role: 'user',
      }
      
      // 如果提供了头像，也设置头像
      if (image) {
        insertData.image = image
      }

      const { data, error } = await supabaseAdmin
        .from('users')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error("Error creating Google user:", { error: error.message, email })
        throw new Error(`Failed to create user: ${error.message}`)
      }

      if (!data) {
        console.error("Error creating Google user: No data returned", { email })
        throw new Error("Failed to create user: No data returned")
      }

      console.log("Google user created successfully", { userId: data.id, email })
      return data as User
    }
  } catch (error: any) {
    // 记录详细错误信息以便调试
    console.error("createOrUpdateGoogleUser error:", {
      error: error?.message || error,
      stack: error?.stack,
      email,
      name,
      hasImage: !!image
    })
    throw error
  }
}

// 获取所有用户（管理员功能）
export async function getAllUsers() {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, name, email, email_verified, role, created_at, updated_at, is_test_user, created_by, invitation_token, invitation_expires_at, password_set_at, must_change_password')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`)
  }

  return data as Omit<User, 'password_hash' | 'email_verification_token' | 'email_verification_expires'>[]
}

// 创建用户（Admin 功能，支持三种方式）
export async function createUserByAdmin(data: {
  name: string
  email: string
  role: 'user' | 'coach' | 'admin'
  password_option: 'generate' | 'custom' | 'invite'
  password?: string  // 当 password_option = 'custom' 时必填
  require_password_change?: boolean
  is_test_user?: boolean
  created_by: string  // Admin ID
}): Promise<{
  user: User
  generated_password?: string  // 仅当 password_option = 'generate' 时返回
  invitation_token?: string  // 仅当 password_option = 'invite' 时返回
}> {
  // 检查用户是否已存在
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', data.email)
    .single()

  if (existingUser) {
    throw new Error('User already exists')
  }

  let password_hash: string | null = null
  let generated_password: string | undefined
  let invitation_token: string | undefined
  let invitation_expires_at: string | undefined
  let invitation_sent_at: string | undefined
  let email_verified = false

  // 根据密码选项处理
  if (data.password_option === 'generate') {
    // 生成随机密码
    generated_password = generateRandomPassword(12)
    password_hash = await bcrypt.hash(generated_password, 10)
    email_verified = false  // 首次登录后验证
  } else if (data.password_option === 'custom') {
    // 使用自定义密码
    if (!data.password) {
      throw new Error('Password is required when password_option is "custom"')
    }
    password_hash = await bcrypt.hash(data.password, 10)
    email_verified = false
  } else if (data.password_option === 'invite') {
    // 生成邀请令牌
    invitation_token = generateInvitationToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)  // 7天后过期
    invitation_expires_at = expiresAt.toISOString()
    invitation_sent_at = new Date().toISOString()
    password_hash = null  // 等待用户设置密码
    email_verified = false
  }

  // 创建用户
  const insertData: any = {
    name: data.name,
    email: data.email,
    role: data.role,
    password_hash,
    email_verified,
    created_by: data.created_by,
    is_test_user: data.is_test_user ?? false,
    must_change_password: data.require_password_change ?? false,
  }

  if (invitation_token) {
    insertData.invitation_token = invitation_token
    insertData.invitation_expires_at = invitation_expires_at
    insertData.invitation_sent_at = invitation_sent_at
  }

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`)
  }

  return {
    user: user as User,
    generated_password,
    invitation_token,
  }
}

// 验证邀请令牌并设置密码
export async function acceptInvitationAndSetPassword(
  token: string,
  password: string
): Promise<User> {
  // 查找用户
  const { data: user, error: findError } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('invitation_token', token)
    .single()

  if (findError || !user) {
    throw new Error('Invalid invitation token')
  }

  // 检查令牌是否过期
  if (user.invitation_expires_at && new Date(user.invitation_expires_at) < new Date()) {
    throw new Error('Invitation token has expired')
  }

  // 检查是否已有密码（已激活）
  if (user.password_hash) {
    throw new Error('User already has a password set')
  }

  // 验证密码强度
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters')
  }

  // 加密密码
  const password_hash = await bcrypt.hash(password, 10)

  // 更新用户
  const { data: updatedUser, error: updateError } = await supabaseAdmin
    .from('users')
    .update({
      password_hash,
      email_verified: true,  // 通过邀请链接验证邮箱
      invitation_token: null,
      invitation_expires_at: null,
      password_set_at: new Date().toISOString(),
    })
    .eq('id', user.id)
    .select()
    .single()

  if (updateError) {
    throw new Error(`Failed to set password: ${updateError.message}`)
  }

  return updatedUser as User
}

// 重新发送邀请
export async function resendInvitation(userId: string): Promise<{
  invitation_token: string
  invitation_expires_at: string
}> {
  // 获取用户
  const user = await getUserById(userId)
  if (!user) {
    throw new Error('User not found')
  }

  // 生成新的邀请令牌
  const invitation_token = generateInvitationToken()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)  // 7天后过期
  const invitation_expires_at = expiresAt.toISOString()
  const invitation_sent_at = new Date().toISOString()

  // 更新用户
  const { error } = await supabaseAdmin
    .from('users')
    .update({
      invitation_token,
      invitation_expires_at,
      invitation_sent_at,
    })
    .eq('id', userId)

  if (error) {
    throw new Error(`Failed to resend invitation: ${error.message}`)
  }

  return {
    invitation_token,
    invitation_expires_at,
  }
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
export async function deleteUser(userId: string): Promise<{
  success: boolean
  deletedTeamsCount: number
  deletedTeams: Array<{ id: string; name: string }>
}> {
  // 检查是否有关联的 Teams 记录（在删除前）
  const { data: teams } = await supabaseAdmin
    .from('teams')
    .select('id, name')
    .eq('user_id', userId)

  // 注意：由于设置了 ON DELETE CASCADE，删除 Users 记录会自动删除关联的 Teams 记录
  // 这里只是用于返回警告信息，不影响删除操作

  const { error } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('id', userId)

  if (error) {
    throw new Error(`Failed to delete user: ${error.message}`)
  }

  return {
    success: true,
    deletedTeamsCount: teams?.length || 0,
    deletedTeams: teams || [],
  }
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
  user_id?: string | null  // 关联 Users 表
  image_url: string
  name: string  // 保留向后兼容，但建议使用关联 Users 表的 name
  position: string
  description: string
  bio?: string  // 详细个人简介（可选）
  display_order: number
  is_featured?: boolean  // 是否在首页展示
  is_active?: boolean  // 是否激活
  created_at: string
  updated_at: string
  social_networks: TeamSocialNetwork[]
  // 关联的 Users 信息（可选，JOIN 时填充）
  user?: {
    id: string
    name: string
    email: string
    image?: string
    role: string
  }
}

export interface TeamSocialNetwork {
  id: string
  name: string
  url: string
  display_order: number
}

// 获取所有团队成员（公开 API，用于首页展示）
export async function getAllTeamMembers(): Promise<TeamMember[]> {
  // 获取所有激活的、在首页展示的团队成员，JOIN Users 表
  // 使用 * 查询所有字段，然后安全地访问 image（如果存在）
  const { data: teams, error: teamsError } = await supabaseAdmin
    .from('teams')
    .select(`
      *,
      user:users(*)
    `)
    .eq('is_active', true)
    .eq('is_featured', true)
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

  // 组合数据，优先使用 Users 表的 name 和 image
  const teamsWithSocial = teams.map(team => {
    const user = (team as any).user
    // 安全地访问 image 字段（如果 users 表有该字段）
    const userImage = user?.image || null
    return {
      id: team.id,
      user_id: team.user_id || null,
      image_url: userImage || team.image_url,  // 优先使用 Users 表的 image（如果存在）
      name: user?.name || team.name,  // 优先使用 Users 表的 name
      position: team.position,
      description: team.description,
      bio: team.bio || undefined,
      display_order: team.display_order,
      is_featured: team.is_featured ?? true,
      is_active: team.is_active ?? true,
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
      user: user ? {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
      } : undefined,
    }
  })

  return teamsWithSocial as TeamMember[]
}

// 获取所有团队成员（Admin API，包括所有状态）
export async function getAllTeamMembersForAdmin(): Promise<TeamMember[]> {
  // 获取所有团队成员（包括未激活的），JOIN Users 表
  // 使用 * 查询所有字段，然后安全地访问 image（如果存在）
  const { data: teams, error: teamsError } = await supabaseAdmin
    .from('teams')
    .select(`
      *,
      user:users(*)
    `)
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
  const teamsWithSocial = teams.map(team => {
    const user = (team as any).user
    // 安全地访问 image 字段（如果 users 表有该字段）
    const userImage = user?.image || null
    return {
      id: team.id,
      user_id: team.user_id || null,
      image_url: userImage || team.image_url,
      name: user?.name || team.name,
      position: team.position,
      description: team.description,
      bio: team.bio || undefined,
      display_order: team.display_order,
      is_featured: team.is_featured ?? false,
      is_active: team.is_active ?? true,
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
      user: user ? {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image || undefined,  // 安全地访问 image（如果存在）
        role: user.role,
      } : undefined,
    }
  })

  return teamsWithSocial as TeamMember[]
}

// 创建团队成员
export async function createTeamMember(data: {
  user_id?: string  // 关联的 Users 表 ID（可选，但推荐）
  image_url?: string  // 可选，如果 user_id 存在，可以使用 Users 表的 image
  name?: string  // 可选，如果 user_id 存在，使用 Users 表的 name
  position: string
  description: string
  bio?: string
  display_order: number
  is_featured?: boolean
  is_active?: boolean
  social_networks?: Array<{ name: string; url: string; display_order: number }>
}): Promise<TeamMember> {
  // 如果提供了 user_id，验证用户是否存在且是 coach
  if (data.user_id) {
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, name, email, image, role')
      .eq('id', data.user_id)
      .eq('role', 'coach')
      .single()

    if (userError || !user) {
      throw new Error(`Invalid user_id: user not found or not a coach`)
    }

    // 检查是否已经有 Teams 记录
    const { data: existingTeam } = await supabaseAdmin
      .from('teams')
      .select('id')
      .eq('user_id', data.user_id)
      .single()

    if (existingTeam) {
      throw new Error(`User already has a team profile`)
    }
  }

  // 准备插入数据
  const insertData: any = {
    position: data.position,
    description: data.description,
    display_order: data.display_order,
    is_featured: data.is_featured ?? false,
    is_active: data.is_active ?? true,
  }

  if (data.user_id) {
    insertData.user_id = data.user_id
  }

  // 如果提供了 name 和 image_url，保留（向后兼容）
  if (data.name) {
    insertData.name = data.name
  }
  if (data.image_url) {
    insertData.image_url = data.image_url
  }
  if (data.bio) {
    insertData.bio = data.bio
  }

  // 创建团队成员
  const { data: team, error: teamError } = await supabaseAdmin
    .from('teams')
    .insert(insertData)
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

  // 获取完整的团队成员数据（包括社交媒体链接和 Users 信息）
  const fullTeams = await getAllTeamMembersForAdmin()
  const createdTeam = fullTeams.find(t => t.id === team.id)

  if (!createdTeam) {
    throw new Error('Failed to retrieve created team member')
  }

  return createdTeam
}

// 更新团队成员
export async function updateTeamMember(
  teamId: string,
  data: {
    user_id?: string
    image_url?: string
    name?: string
    position?: string
    description?: string
    bio?: string
    display_order?: number
    is_featured?: boolean
    is_active?: boolean
    social_networks?: Array<{ id?: string; name: string; url: string; display_order: number }>
  }
): Promise<TeamMember> {
  // 如果提供了 user_id，验证用户是否存在且是 coach
  if (data.user_id !== undefined) {
    if (data.user_id) {
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, name, email, image, role')
        .eq('id', data.user_id)
        .eq('role', 'coach')
        .single()

      if (userError || !user) {
        throw new Error(`Invalid user_id: user not found or not a coach`)
      }

      // 检查是否已经有其他 Teams 记录使用这个 user_id
      const { data: existingTeam } = await supabaseAdmin
        .from('teams')
        .select('id')
        .eq('user_id', data.user_id)
        .neq('id', teamId)
        .single()

      if (existingTeam) {
        throw new Error(`User already has a team profile`)
      }
    }
  }

  // 更新团队成员基本信息
  const updates: any = {}
  if (data.user_id !== undefined) updates.user_id = data.user_id || null
  if (data.image_url !== undefined) updates.image_url = data.image_url
  if (data.name !== undefined) updates.name = data.name
  if (data.position !== undefined) updates.position = data.position
  if (data.description !== undefined) updates.description = data.description
  if (data.bio !== undefined) updates.bio = data.bio
  if (data.display_order !== undefined) updates.display_order = data.display_order
  if (data.is_featured !== undefined) updates.is_featured = data.is_featured
  if (data.is_active !== undefined) updates.is_active = data.is_active

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

  // 获取更新后的完整数据（使用 Admin API 以获取所有状态）
  const fullTeams = await getAllTeamMembersForAdmin()
  const updatedTeam = fullTeams.find(t => t.id === teamId)

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
  franchise_id?: string | null
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
  outcomes?: string  // 保留向后兼容
  learning_outcomes?: string  // 数据库实际字段名
  prerequisites?: string
  cancellation_policy?: string
  number_of_sessions?: number
  target_age_min?: number
  target_age_max?: number
  target_grades?: string[]
  base_price?: number
  currency?: string
  duration_hours?: number  // 数据库字段
  session_count?: number  // 数据库字段
  age_min?: number  // 数据库字段
  age_max?: number  // 数据库字段
  grade_level?: string  // 数据库字段
  poster_url?: string | null  // 课程招贴画 URL（存储在 Vercel Blob）
  status: 'draft' | 'published' | 'suspended' | 'archived'  // 课程状态
  is_active?: boolean  // 保留向后兼容，映射自 status
  created_at: string
  updated_at: string
}

export interface CoursePrerequisite {
  id: string
  course_id: string
  prerequisite_course_id: string
  requirement_type: 'required' | 'recommended' | 'optional'
  is_mandatory: boolean
  display_order: number
  notes?: string | null
  created_at: string
  updated_at: string
  prerequisite_course?: Course // 关联的先修课程详情
  group_id?: string | null // 所属的组ID（如果属于组）
}

export interface PrerequisiteGroup {
  id: string
  course_id: string
  group_type: 'and' | 'or' | 'custom'
  min_required: number
  display_order: number
  description?: string | null
  created_at: string
  updated_at: string
  prerequisites?: CoursePrerequisite[] // 组内的先修课程
}

export interface UserCourseCompletion {
  id: string
  user_id: string
  course_id: string
  instance_id?: string | null
  completion_date: string
  grade?: string | null
  certificate_url?: string | null
  notes?: string | null
  verified_by?: string | null
  verified_at?: string | null
  created_at: string
  updated_at: string
  course?: Course // 关联的课程详情
}

export interface UserLearningPathProgress {
  id: string
  user_id: string
  path_id: string
  current_stage: number
  completed_courses_count: number
  total_courses_count: number
  started_at: string
  last_activity_at?: string | null
  completed_at?: string | null
  is_completed: boolean
  created_at: string
  updated_at: string
  path?: LearningPath // 关联的学习路径详情
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
  franchise?: { id: string; code: string; name: string } | null
}

export interface CourseLocation {
  id: string
  name: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  description?: string | null
  phone?: string
  email?: string
  parking_info?: string | null
  check_in_info?: string | null
  amenities?: Record<string, any> | null
  franchise_id?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CourseInstance {
  id: string
  assignment_id: string
  location_id?: string
  franchise_id?: string | null  // 冗余字段，用于加速按 Franchise 过滤
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

// Franchise / multi-tenant
export interface FranchiseBrandingConfig {
  hero?: {
    title?: string
    subtitle?: string
    description?: string
  }
  contact?: {
    email?: string | null
    phone?: string | null
    address?: {
      street?: string
      city?: string
      state?: string
      zip?: string
    } | null
    businessHours?: {
      monday?: string
      tuesday?: string
      wednesday?: string
      thursday?: string
      friday?: string
      saturday?: string
      sunday?: string
    }
  }
  social?: {
    facebook?: string | null
    instagram?: string | null
    twitter?: string | null
    youtube?: string | null
  }
  highlights?: {
    programs?: string
    schedule?: string
    focus?: string
  }
  branding?: {
    logoUrl?: string | null
    primaryColor?: string | null
    secondaryColor?: string | null
    accentColor?: string | null
  }
  seo?: {
    title?: string
    description?: string
    keywords?: string
  }
}

export interface Franchise {
  id: string
  code: string
  name: string
  primary_domain?: string | null
  timezone?: string | null
  branding_config?: FranchiseBrandingConfig | null
  is_active: boolean
}

// 学习路径相关接口
export interface LearningPath {
  id: string
  name: string
  slug?: string
  description?: string
  category_id?: string | null
  target_audience?: string
  estimated_duration_weeks?: number
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced'
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
  category?: CourseCategory // 关联的课程大类
  courses?: LearningPathCourse[] // 路径中的课程
}

export interface LearningPathCourse {
  id: string
  path_id: string
  course_id: string
  stage: number
  stage_name?: string | null
  is_required: boolean
  is_parallel: boolean
  display_order: number
  estimated_weeks?: number | null
  notes?: string | null
  created_at: string
  updated_at: string
  course?: Course // 关联的课程详情
}

export interface LearningPathWithDetails extends LearningPath {
  courses: LearningPathCourse[]
}

// 完整的课程信息（包含关联数据）
export interface CourseWithDetails extends Course {
  subcategories?: CourseSubcategory[]
  assignments?: CourseAssignmentWithDetails[]
  prerequisites_list?: CoursePrerequisite[] // 结构化的先修课程列表
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

// 获取指定大类的所有系列（可选按 franchise 过滤）
export async function getCourseSeriesByCategory(categoryId: string, franchiseId?: string): Promise<CourseSeries[]> {
  let query = supabaseAdmin
    .from('course_series')
    .select('*')
    .eq('category_id', categoryId)
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (franchiseId) {
    query = query.eq('franchise_id', franchiseId)
  }

  const { data, error } = await query

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
// 注意：Admin 可以查看所有状态的课程，公开 API 应使用 getPublishedCourses
export async function getAllCourses(): Promise<Course[]> {
  const { data, error } = await supabaseAdmin
    .from('courses')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch courses: ${error.message}`)
  }

  return data as Course[]
}

// 获取所有已发布的课程（公开 API 使用）
export async function getPublishedCourses(): Promise<Course[]> {
  const { data, error } = await supabaseAdmin
    .from('courses')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch published courses: ${error.message}`)
  }

  return data as Course[]
}

// 根据 franchise code 获取 franchise（用于多租户过滤）
export async function getFranchiseByCode(code: string): Promise<Franchise | null> {
  const normalized = code.trim().toLowerCase()
  if (!normalized) return null

  const { data, error } = await supabaseAdmin
    .from('franchises')
    .select('*')
    .eq('code', normalized)
    .eq('is_active', true)
    .single()

  if (error) {
    // 如果是找不到记录，返回 null；其他错误抛出
    if (error.code === 'PGRST116' || error.message?.toLowerCase().includes('no rows')) {
      return null
    }
    throw new Error(`Failed to fetch franchise: ${error.message}`)
  }

  return data as Franchise
}

// 根据 franchise code 获取 franchise 详细信息（包含 branding_config）
export async function getFranchiseDetailsByCode(code: string): Promise<Franchise | null> {
  const franchise = await getFranchiseByCode(code)
  if (!franchise) return null

  // 解析 branding_config JSONB
  // Supabase 可能返回字符串或对象，需要处理两种情况
  if (franchise.branding_config !== null && franchise.branding_config !== undefined) {
    const originalType = typeof franchise.branding_config
    const isArray = Array.isArray(franchise.branding_config)
    
    if (originalType === 'string') {
      try {
        const parsed = JSON.parse(franchise.branding_config as string) as FranchiseBrandingConfig
        franchise.branding_config = parsed
      } catch (e) {
        console.error('Failed to parse branding_config:', e)
        franchise.branding_config = null
      }
    }
    // 如果已经是对象，直接使用（Supabase 客户端库可能已经解析了）
    // 确保类型正确，并且不是数组（JSONB 可能是数组）
    else if (originalType === 'object' && !isArray) {
      // 已经是对象，直接使用
      // 不需要做任何转换，Supabase 已经解析了 JSONB
      franchise.branding_config = franchise.branding_config as FranchiseBrandingConfig
    } else {
      // 其他情况（如数组），设为 null
      console.warn('Unexpected branding_config type:', originalType, 'isArray:', isArray)
      franchise.branding_config = null
    }
  }

  // 调试：检查解析后的 branding_config
  if (process.env.NODE_ENV === 'development') {
    console.log('[getFranchiseDetailsByCode]', {
      code: franchise.code,
      hasBrandingConfig: !!franchise.branding_config,
      brandingConfigType: typeof franchise.branding_config,
      heroTitle: franchise.branding_config?.hero?.title,
      heroDescription: franchise.branding_config?.hero?.description,
    })
  }

  return franchise
}

// 获取 franchise 的所有 active locations
export async function getFranchiseLocations(franchiseId: string): Promise<CourseLocation[]> {
  const { data, error } = await supabaseAdmin
    .from('course_locations')
    .select('*')
    .eq('franchise_id', franchiseId)
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch franchise locations: ${error.message}`)
  }

  return (data || []) as CourseLocation[]
}

// 获取 franchise 的特色课程（通过 active instances）
export async function getFranchiseFeaturedCourses(
  franchiseId: string,
  limit: number = 6
): Promise<Course[]> {
  // 获取该 franchise 的 active instances，关联到 courses
  const { data: instances, error: instancesError } = await supabaseAdmin
    .from('course_instances')
    .select(`
      assignment_id,
      assignment:course_assignments!inner(
        course_id,
        course:courses!inner(*)
      )
    `)
    .eq('franchise_id', franchiseId)
    .eq('is_active', true)
    .limit(100) // 限制实例数量，避免查询过大

  if (instancesError) {
    throw new Error(`Failed to fetch franchise instances: ${instancesError.message}`)
  }

  // 提取唯一的 courses
  const courseMap = new Map<string, Course>()
  
  for (const instance of instances || []) {
    const assignment = Array.isArray(instance.assignment) 
      ? instance.assignment[0] 
      : instance.assignment
    
    if (assignment && typeof assignment === 'object' && 'course' in assignment) {
      const course = (assignment as any).course
      if (course && typeof course === 'object' && 'id' in course) {
        // 只包含已发布的课程
        if (course.status === 'published' && !courseMap.has(course.id)) {
          courseMap.set(course.id, course as Course)
        }
      }
    }
  }

  // 转换为数组并限制数量
  const courses = Array.from(courseMap.values()).slice(0, limit)
  
  return courses
}

// 根据slug获取课程（只返回已发布的课程，公开 API 使用）
export async function getCourseBySlug(slug: string): Promise<Course | null> {
  const { data, error } = await supabaseAdmin
    .from('courses')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (error) {
    return null
  }

  return data as Course
}

// 获取课程详细信息（包含关联数据）
// 注意：Admin 可以查看所有状态的课程，公开 API 应使用 getPublishedCourseWithDetails
export async function getCourseWithDetails(courseId: string): Promise<CourseWithDetails | null> {
  const { data: course, error: courseError } = await supabaseAdmin
    .from('courses')
    .select('*')
    .eq('id', courseId)
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

  // 获取先修课程（只获取 required 和 recommended 类型，用于公开显示）
  let prerequisites_list: CoursePrerequisite[] = []
  try {
    const { data: prerequisitesData } = await supabaseAdmin
      .from('course_prerequisites')
      .select(`
        *,
        prerequisite_course:courses!course_prerequisites_prerequisite_course_id_fkey(*)
      `)
      .eq('course_id', courseId)
      .in('requirement_type', ['required', 'recommended'])
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (prerequisitesData) {
      prerequisites_list = prerequisitesData.map((item: any) => ({
        ...item,
        prerequisite_course: Array.isArray(item.prerequisite_course)
          ? item.prerequisite_course[0]
          : item.prerequisite_course,
      })) as CoursePrerequisite[]
    }
  } catch (error) {
    console.error('Error fetching prerequisites:', error)
    // 如果获取先修课程失败，不影响其他数据
  }

  return {
    ...course,
    subcategories,
    assignments: assignmentsWithDetails,
    prerequisites_list,
  } as CourseWithDetails
}

// 根据slug获取课程详细信息（包含关联数据，只返回已发布的课程，公开 API 使用）
export async function getCourseWithDetailsBySlug(slug: string): Promise<CourseWithDetails | null> {
  // 先尝试精确匹配
  let { data: course, error: courseError } = await supabaseAdmin
    .from('courses')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  // 如果精确匹配失败，尝试 URL 解码后的匹配（处理 URL 编码问题）
  if (courseError || !course) {
    try {
      const decodedSlug = decodeURIComponent(slug)
      if (decodedSlug !== slug) {
        const { data: decodedCourse, error: decodedError } = await supabaseAdmin
          .from('courses')
          .select('*')
          .eq('slug', decodedSlug)
          .eq('status', 'published')
          .single()
        
        if (!decodedError && decodedCourse) {
          course = decodedCourse
          courseError = null
        }
      }
    } catch (e) {
      // decodeURIComponent 可能失败，忽略错误
    }
  }

  // 如果还是找不到，尝试模糊匹配（处理空格等字符差异）
  if (courseError || !course) {
    // 将 slug 标准化（去除多余空格）
    const normalizedSlug = slug.trim().replace(/\s+/g, ' ')
    const { data: normalizedCourse, error: normalizedError } = await supabaseAdmin
      .from('courses')
      .select('*')
      .ilike('slug', `%${normalizedSlug}%`)
      .eq('status', 'published')
      .limit(1)
      .maybeSingle()
    
    if (!normalizedError && normalizedCourse) {
      course = normalizedCourse
      courseError = null
    }
  }

  if (courseError || !course) {
    return null
  }

  // 获取子类标签
  const { data: subcategoryTags } = await supabaseAdmin
    .from('course_subcategory_tags')
    .select('subcategory_id')
    .eq('course_id', course.id)

  let subcategories: CourseSubcategory[] = []
  if (subcategoryTags && subcategoryTags.length > 0) {
    const subcategoryIds = subcategoryTags.map((t: { subcategory_id: string }) => t.subcategory_id)
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
    .eq('course_id', course.id)
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

  // 获取先修课程（只获取 required 和 recommended 类型，用于公开显示）
  let prerequisites_list: CoursePrerequisite[] = []
  try {
    const { data: prerequisitesData } = await supabaseAdmin
      .from('course_prerequisites')
      .select(`
        *,
        prerequisite_course:courses!course_prerequisites_prerequisite_course_id_fkey(*)
      `)
      .eq('course_id', course.id)
      .in('requirement_type', ['required', 'recommended'])
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (prerequisitesData) {
      prerequisites_list = prerequisitesData.map((item: any) => ({
        ...item,
        prerequisite_course: Array.isArray(item.prerequisite_course)
          ? item.prerequisite_course[0]
          : item.prerequisite_course,
      })) as CoursePrerequisite[]
    }
  } catch (error) {
    console.error('Error fetching prerequisites:', error)
    // 如果获取先修课程失败，不影响其他数据
  }

  return {
    ...course,
    subcategories,
    assignments: assignmentsWithDetails,
    prerequisites_list,
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

  // 调试日志：记录查询结果
  if (process.env.NODE_ENV === 'development' && data) {
    console.log(`[getCourseInstances ${courseId}] Found instances:`, {
      course_id: courseId,
      assignment_ids: assignmentIds,
      instances_count: data.length,
      instances: data.map((inst: any) => ({
        id: inst.id,
        assignment_id: inst.assignment_id,
        franchise_id: inst.franchise_id,
        start_date: inst.start_date,
        is_active: inst.is_active,
      })),
    })
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
  // 验证课程状态：只有 published 状态的课程可以创建 instance
  // 首先通过 assignment 获取 course_id
  const { data: assignment, error: assignmentError } = await supabaseAdmin
    .from('course_assignments')
    .select('course_id')
    .eq('id', instance.assignment_id)
    .single()

  if (assignmentError || !assignment) {
    throw new Error('Course assignment not found')
  }

  const { data: course, error: courseError } = await supabaseAdmin
    .from('courses')
    .select('status')
    .eq('id', assignment.course_id)
    .single()

  if (courseError || !course) {
    throw new Error('Course not found')
  }

  if (course.status !== 'published') {
    throw new Error(`Cannot create instance for course with status '${course.status}'. Only 'published' courses can have instances.`)
  }

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

// 创建课程（默认状态为 draft）
export async function createCourse(course: Omit<Course, 'id' | 'created_at' | 'updated_at'>): Promise<Course> {
  // 确保新课程默认状态为 draft（如果未指定）
  const courseData = {
    ...course,
    status: course.status || 'draft',
  }

  const { data, error } = await supabaseAdmin
    .from('courses')
    .insert(courseData)
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

// ==================== Course Prerequisites 操作 ====================

// 获取课程的所有先修课程
export async function getCoursePrerequisites(courseId: string): Promise<CoursePrerequisite[]> {
  const { data, error } = await supabaseAdmin
    .from('course_prerequisites')
    .select(`
      *,
      prerequisite_course:courses!course_prerequisites_prerequisite_course_id_fkey(*)
    `)
    .eq('course_id', courseId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch course prerequisites: ${error.message}`)
  }

  return (data || []).map((item: any) => ({
    ...item,
    prerequisite_course: Array.isArray(item.prerequisite_course) 
      ? item.prerequisite_course[0] as Course | undefined
      : item.prerequisite_course as Course | undefined,
  })) as CoursePrerequisite[]
}

// 获取需要某个课程作为先修的所有课程（反向查询）
export async function getCoursesRequiringPrerequisite(prerequisiteCourseId: string): Promise<Course[]> {
  const { data, error } = await supabaseAdmin
    .from('course_prerequisites')
    .select('course:courses!course_prerequisites_course_id_fkey(*)')
    .eq('prerequisite_course_id', prerequisiteCourseId)

  if (error) {
    throw new Error(`Failed to fetch courses requiring prerequisite: ${error.message}`)
  }

  return (data || [])
    .map((item: any) => {
      const course = Array.isArray(item.course) ? item.course[0] : item.course
      return course as Course | null
    })
    .filter((course): course is Course => course !== null && course !== undefined)
}

// 创建先修课程关系
export async function createCoursePrerequisite(
  courseId: string,
  prerequisiteCourseId: string,
  options?: {
    requirement_type?: 'required' | 'recommended' | 'optional'
    is_mandatory?: boolean
    display_order?: number
    notes?: string
  }
): Promise<CoursePrerequisite> {
  // 检查是否自引用
  if (courseId === prerequisiteCourseId) {
    throw new Error('Course cannot have itself as a prerequisite')
  }

  // 检查是否已存在
  const { data: existing } = await supabaseAdmin
    .from('course_prerequisites')
    .select('id')
    .eq('course_id', courseId)
    .eq('prerequisite_course_id', prerequisiteCourseId)
    .single()

  if (existing) {
    throw new Error('Prerequisite relationship already exists')
  }

  const { data, error } = await supabaseAdmin
    .from('course_prerequisites')
    .insert({
      course_id: courseId,
      prerequisite_course_id: prerequisiteCourseId,
      requirement_type: options?.requirement_type || 'required',
      is_mandatory: options?.is_mandatory !== undefined ? options.is_mandatory : true,
      display_order: options?.display_order || 0,
      notes: options?.notes || null,
    })
    .select(`
      *,
      prerequisite_course:courses!course_prerequisites_prerequisite_course_id_fkey(*)
    `)
    .single()

  if (error) {
    // 检查是否是循环依赖错误
    if (error.message.includes('Circular dependency')) {
      throw new Error('Circular dependency detected. Cannot add this prerequisite.')
    }
    throw new Error(`Failed to create course prerequisite: ${error.message}`)
  }

  return {
    ...data,
    prerequisite_course: data.prerequisite_course as Course | undefined,
  } as CoursePrerequisite
}

// 更新先修课程关系
export async function updateCoursePrerequisite(
  prerequisiteId: string,
  updates: {
    requirement_type?: 'required' | 'recommended' | 'optional'
    is_mandatory?: boolean
    display_order?: number
    notes?: string
  }
): Promise<CoursePrerequisite> {
  const { data, error } = await supabaseAdmin
    .from('course_prerequisites')
    .update(updates)
    .eq('id', prerequisiteId)
    .select(`
      *,
      prerequisite_course:courses!course_prerequisites_prerequisite_course_id_fkey(*)
    `)
    .single()

  if (error) {
    throw new Error(`Failed to update course prerequisite: ${error.message}`)
  }

  return {
    ...data,
    prerequisite_course: data.prerequisite_course as Course | undefined,
  } as CoursePrerequisite
}

// 删除先修课程关系
export async function deleteCoursePrerequisite(prerequisiteId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('course_prerequisites')
    .delete()
    .eq('id', prerequisiteId)

  if (error) {
    throw new Error(`Failed to delete course prerequisite: ${error.message}`)
  }

  return true
}

// 批量删除课程的所有先修课程
export async function deleteAllCoursePrerequisites(courseId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('course_prerequisites')
    .delete()
    .eq('course_id', courseId)

  if (error) {
    throw new Error(`Failed to delete course prerequisites: ${error.message}`)
  }

  return true
}

// 获取用户已完成的课程ID（优先使用 user_course_completions，回退到 enrollments）
export async function getUserCompletedCourseIds(userId: string): Promise<Set<string>> {
  const completedCourseIds = new Set<string>()

  // 首先尝试从 user_course_completions 获取（更精确）
  const { data: completions } = await supabaseAdmin
    .from('user_course_completions')
    .select('course_id')
    .eq('user_id', userId)

  if (completions && completions.length > 0) {
    completions.forEach((c: any) => {
      if (c.course_id) completedCourseIds.add(c.course_id)
    })
    return completedCourseIds
  }

  // 回退到使用 enrollments（向后兼容）
  const { data: completedEnrollments } = await supabaseAdmin
    .from('course_enrollments')
    .select(`
      instance_id,
      course_instances!inner(
        assignment_id,
        course_assignments!inner(
          course_id
        )
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'completed')

  if (completedEnrollments) {
    for (const enrollment of completedEnrollments) {
      const instance = enrollment.course_instances as any
      if (instance?.course_assignments?.course_id) {
        completedCourseIds.add(instance.course_assignments.course_id)
      }
    }
  }

  return completedCourseIds
}

// 检查用户是否满足课程的先修条件（支持组逻辑）
export async function checkUserPrerequisites(
  userId: string,
  courseId: string
): Promise<{
  canEnroll: boolean
  missingPrerequisites: Course[]
  recommendations: Course[]
  groupRequirements?: Array<{
    groupId: string
    groupType: string
    satisfied: boolean
    required: number
    completed: number
    missing: Course[]
  }>
}> {
  // 获取课程的所有先修课程
  const prerequisites = await getCoursePrerequisites(courseId)

  if (prerequisites.length === 0) {
    return {
      canEnroll: true,
      missingPrerequisites: [],
      recommendations: [],
    }
  }

  // 获取用户已完成的课程
  const completedCourseIds = await getUserCompletedCourseIds(userId)

  // 检查是否有先修课程组
  const { data: groups } = await supabaseAdmin
    .from('prerequisite_groups')
    .select(`
      *,
      items:prerequisite_group_items(
        prerequisite:course_prerequisites(
          *,
          prerequisite_course:courses!course_prerequisites_prerequisite_course_id_fkey(*)
        )
      )
    `)
    .eq('course_id', courseId)
    .order('display_order', { ascending: true })

  // 如果有组，使用组逻辑验证
  if (groups && groups.length > 0) {
    const groupRequirements: Array<{
      groupId: string
      groupType: string
      satisfied: boolean
      required: number
      completed: number
      missing: Course[]
    }> = []

    let allGroupsSatisfied = true

    for (const group of groups) {
      const groupItems = group.items || []
      const groupPrerequisites = groupItems.map((item: any) => item.prerequisite).filter(Boolean)
      
      const completedInGroup = groupPrerequisites.filter((p: any) =>
        p.prerequisite_course_id && completedCourseIds.has(p.prerequisite_course_id)
      )

      let satisfied = false
      if (group.group_type === 'and') {
        satisfied = completedInGroup.length === groupPrerequisites.length
      } else if (group.group_type === 'or') {
        satisfied = completedInGroup.length >= group.min_required
      }

      if (!satisfied) {
        allGroupsSatisfied = false
      }

      const missing = groupPrerequisites
        .filter((p: any) => !completedCourseIds.has(p.prerequisite_course_id))
        .map((p: any) => p.prerequisite_course)
        .filter(Boolean)

      groupRequirements.push({
        groupId: group.id,
        groupType: group.group_type,
        satisfied,
        required: group.group_type === 'or' ? group.min_required : groupPrerequisites.length,
        completed: completedInGroup.length,
        missing,
      })
    }

    // 检查不在组中的必填先修课程
    const prerequisitesInGroups = new Set<string>()
    groups.forEach((group: any) => {
      (group.items || []).forEach((item: any) => {
        if (item.prerequisite?.id) {
          prerequisitesInGroups.add(item.prerequisite.id)
        }
      })
    })

    const standalonePrerequisites = prerequisites.filter(
      p => !prerequisitesInGroups.has(p.id) && p.requirement_type === 'required' && p.is_mandatory
    )

    const missingStandalone = standalonePrerequisites.filter(
      p => !completedCourseIds.has(p.prerequisite_course_id)
    )

    const recommendations = prerequisites
      .filter(p => p.requirement_type === 'recommended')
      .map(p => p.prerequisite_course!)
      .filter(Boolean)

    return {
      canEnroll: allGroupsSatisfied && missingStandalone.length === 0,
      missingPrerequisites: [
        ...groupRequirements.filter(gr => !gr.satisfied).flatMap(gr => gr.missing),
        ...missingStandalone.map(p => p.prerequisite_course!).filter(Boolean),
      ],
      recommendations,
      groupRequirements,
    }
  }

  // 没有组，使用简单逻辑（向后兼容）
  const requiredPrerequisites = prerequisites.filter(
    p => p.requirement_type === 'required' && p.is_mandatory
  )

  const missingRequired = requiredPrerequisites.filter(
    p => !completedCourseIds.has(p.prerequisite_course_id)
  )

  const recommendations = prerequisites
    .filter(p => p.requirement_type === 'recommended')
    .map(p => p.prerequisite_course!)
    .filter(Boolean)

  return {
    canEnroll: missingRequired.length === 0,
    missingPrerequisites: missingRequired.map(p => p.prerequisite_course!).filter(Boolean),
    recommendations,
  }
}

// ==================== Learning Paths 操作 ====================

// 获取所有学习路径
export async function getAllLearningPaths(
  filters?: {
    category_id?: string
    is_active?: boolean
    difficulty_level?: 'beginner' | 'intermediate' | 'advanced'
  }
): Promise<LearningPathWithDetails[]> {
  let query = supabaseAdmin
    .from('learning_paths')
    .select(`
      *,
      category:course_categories(*)
    `)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (filters?.category_id) {
    query = query.eq('category_id', filters.category_id)
  }
  if (filters?.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active)
  }
  if (filters?.difficulty_level) {
    query = query.eq('difficulty_level', filters.difficulty_level)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch learning paths: ${error.message}`)
  }

  // 获取每个路径的课程
  const pathsWithCourses: LearningPathWithDetails[] = []
  if (data) {
    for (const path of data) {
      const { data: coursesData } = await supabaseAdmin
        .from('learning_path_courses')
        .select(`
          *,
          course:courses(*)
        `)
        .eq('path_id', path.id)
        .order('stage', { ascending: true })
        .order('display_order', { ascending: true })

      const courses = (coursesData || []).map((item: any) => ({
        ...item,
        course: Array.isArray(item.course) ? item.course[0] : item.course,
      })) as LearningPathCourse[]

      pathsWithCourses.push({
        ...path,
        category: Array.isArray(path.category) ? path.category[0] : path.category,
        courses,
      } as LearningPathWithDetails)
    }
  }

  return pathsWithCourses
}

// 根据 ID 获取学习路径
export async function getLearningPathById(pathId: string): Promise<LearningPathWithDetails | null> {
  const { data: path, error: pathError } = await supabaseAdmin
    .from('learning_paths')
    .select(`
      *,
      category:course_categories(*)
    `)
    .eq('id', pathId)
    .single()

  if (pathError || !path) {
    return null
  }

  // 获取路径中的课程
  const { data: coursesData } = await supabaseAdmin
    .from('learning_path_courses')
    .select(`
      *,
      course:courses(*)
    `)
    .eq('path_id', pathId)
    .order('stage', { ascending: true })
    .order('display_order', { ascending: true })

  const courses = (coursesData || []).map((item: any) => ({
    ...item,
    course: Array.isArray(item.course) ? item.course[0] : item.course,
  })) as LearningPathCourse[]

  return {
    ...path,
    category: Array.isArray(path.category) ? path.category[0] : path.category,
    courses,
  } as LearningPathWithDetails
}

// 根据 slug 获取学习路径
export async function getLearningPathBySlug(slug: string): Promise<LearningPathWithDetails | null> {
  const { data: path, error: pathError } = await supabaseAdmin
    .from('learning_paths')
    .select(`
      *,
      category:course_categories(*)
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (pathError || !path) {
    return null
  }

  // 获取路径中的课程
  const { data: coursesData } = await supabaseAdmin
    .from('learning_path_courses')
    .select(`
      *,
      course:courses(*)
    `)
    .eq('path_id', path.id)
    .order('stage', { ascending: true })
    .order('display_order', { ascending: true })

  const courses = (coursesData || []).map((item: any) => ({
    ...item,
    course: Array.isArray(item.course) ? item.course[0] : item.course,
  })) as LearningPathCourse[]

  return {
    ...path,
    category: Array.isArray(path.category) ? path.category[0] : path.category,
    courses,
  } as LearningPathWithDetails
}

// 创建学习路径
export async function createLearningPath(
  path: Omit<LearningPath, 'id' | 'created_at' | 'updated_at' | 'category' | 'courses'>,
  courses?: Array<Omit<LearningPathCourse, 'id' | 'path_id' | 'created_at' | 'updated_at' | 'course'>>
): Promise<LearningPathWithDetails> {
  // 创建路径
  const { data: pathData, error: pathError } = await supabaseAdmin
    .from('learning_paths')
    .insert({
      name: path.name,
      slug: path.slug || null,
      description: path.description || null,
      category_id: path.category_id || null,
      target_audience: path.target_audience || null,
      estimated_duration_weeks: path.estimated_duration_weeks || null,
      difficulty_level: path.difficulty_level || null,
      is_active: path.is_active !== undefined ? path.is_active : true,
      display_order: path.display_order || 0,
    })
    .select()
    .single()

  if (pathError || !pathData) {
    throw new Error(`Failed to create learning path: ${pathError?.message || 'Unknown error'}`)
  }

  // 如果有课程，创建路径课程关联
  if (courses && courses.length > 0) {
    const pathCourses = courses.map(course => ({
      path_id: pathData.id,
      course_id: course.course_id,
      stage: course.stage,
      stage_name: course.stage_name || null,
      is_required: course.is_required !== undefined ? course.is_required : true,
      is_parallel: course.is_parallel !== undefined ? course.is_parallel : false,
      display_order: course.display_order || 0,
      estimated_weeks: course.estimated_weeks || null,
      notes: course.notes || null,
    }))

    const { error: coursesError } = await supabaseAdmin
      .from('learning_path_courses')
      .insert(pathCourses)

    if (coursesError) {
      // 如果创建课程失败，删除已创建的路径
      await supabaseAdmin.from('learning_paths').delete().eq('id', pathData.id)
      throw new Error(`Failed to create path courses: ${coursesError.message}`)
    }
  }

  // 返回完整路径（包含课程）
  const fullPath = await getLearningPathById(pathData.id)
  if (!fullPath) {
    throw new Error('Failed to fetch created learning path')
  }

  return fullPath
}

// 更新学习路径
export async function updateLearningPath(
  pathId: string,
  updates: Partial<Omit<LearningPath, 'id' | 'created_at' | 'updated_at' | 'category' | 'courses'>>,
  courses?: Array<Omit<LearningPathCourse, 'id' | 'path_id' | 'created_at' | 'updated_at' | 'course'>>
): Promise<LearningPathWithDetails> {
  // 更新路径基本信息
  const updateData: any = {}
  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.slug !== undefined) updateData.slug = updates.slug
  if (updates.description !== undefined) updateData.description = updates.description
  if (updates.category_id !== undefined) updateData.category_id = updates.category_id
  if (updates.target_audience !== undefined) updateData.target_audience = updates.target_audience
  if (updates.estimated_duration_weeks !== undefined) updateData.estimated_duration_weeks = updates.estimated_duration_weeks
  if (updates.difficulty_level !== undefined) updateData.difficulty_level = updates.difficulty_level
  if (updates.is_active !== undefined) updateData.is_active = updates.is_active
  if (updates.display_order !== undefined) updateData.display_order = updates.display_order

  if (Object.keys(updateData).length > 0) {
    const { error: pathError } = await supabaseAdmin
      .from('learning_paths')
      .update(updateData)
      .eq('id', pathId)

    if (pathError) {
      throw new Error(`Failed to update learning path: ${pathError.message}`)
    }
  }

  // 如果提供了课程列表，更新路径课程
  if (courses !== undefined) {
    // 删除现有课程关联
    const { error: deleteError } = await supabaseAdmin
      .from('learning_path_courses')
      .delete()
      .eq('path_id', pathId)

    if (deleteError) {
      throw new Error(`Failed to delete existing path courses: ${deleteError.message}`)
    }

    // 创建新的课程关联
    if (courses.length > 0) {
      const pathCourses = courses.map(course => ({
        path_id: pathId,
        course_id: course.course_id,
        stage: course.stage,
        stage_name: course.stage_name || null,
        is_required: course.is_required !== undefined ? course.is_required : true,
        is_parallel: course.is_parallel !== undefined ? course.is_parallel : false,
        display_order: course.display_order || 0,
        estimated_weeks: course.estimated_weeks || null,
        notes: course.notes || null,
      }))

      const { error: coursesError } = await supabaseAdmin
        .from('learning_path_courses')
        .insert(pathCourses)

      if (coursesError) {
        throw new Error(`Failed to create path courses: ${coursesError.message}`)
      }
    }
  }

  // 返回更新后的完整路径
  const fullPath = await getLearningPathById(pathId)
  if (!fullPath) {
    throw new Error('Failed to fetch updated learning path')
  }

  return fullPath
}

// 删除学习路径
export async function deleteLearningPath(pathId: string): Promise<boolean> {
  // 由于有 CASCADE 删除，只需要删除路径即可
  const { error } = await supabaseAdmin
    .from('learning_paths')
    .delete()
    .eq('id', pathId)

  if (error) {
    throw new Error(`Failed to delete learning path: ${error.message}`)
  }

  return true
}

// ==================== User Course Completions 操作 ====================

// 获取用户已完成的课程
export async function getUserCourseCompletions(userId: string): Promise<UserCourseCompletion[]> {
  const { data, error } = await supabaseAdmin
    .from('user_course_completions')
    .select(`
      *,
      course:courses(*)
    `)
    .eq('user_id', userId)
    .order('completion_date', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch user course completions: ${error.message}`)
  }

  return (data || []).map((item: any) => ({
    ...item,
    course: Array.isArray(item.course) ? item.course[0] : item.course,
  })) as UserCourseCompletion[]
}

// 创建课程完成记录
export async function createUserCourseCompletion(
  userId: string,
  courseId: string,
  options?: {
    instance_id?: string
    completion_date?: string
    grade?: string
    certificate_url?: string
    notes?: string
    verified_by?: string
  }
): Promise<UserCourseCompletion> {
  const { data, error } = await supabaseAdmin
    .from('user_course_completions')
    .insert({
      user_id: userId,
      course_id: courseId,
      instance_id: options?.instance_id || null,
      completion_date: options?.completion_date || new Date().toISOString().split('T')[0],
      grade: options?.grade || null,
      certificate_url: options?.certificate_url || null,
      notes: options?.notes || null,
      verified_by: options?.verified_by || null,
      verified_at: options?.verified_by ? new Date().toISOString() : null,
    })
    .select(`
      *,
      course:courses(*)
    `)
    .single()

  if (error) {
    throw new Error(`Failed to create course completion: ${error.message}`)
  }

  return {
    ...data,
    course: Array.isArray(data.course) ? data.course[0] : data.course,
  } as UserCourseCompletion
}

// 删除课程完成记录
export async function deleteUserCourseCompletion(completionId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('user_course_completions')
    .delete()
    .eq('id', completionId)

  if (error) {
    throw new Error(`Failed to delete course completion: ${error.message}`)
  }

  return true
}

// ==================== User Learning Path Progress 操作 ====================

// 获取用户的学习路径进度
export async function getUserLearningPathProgress(
  userId: string,
  pathId?: string
): Promise<UserLearningPathProgress[]> {
  let query = supabaseAdmin
    .from('user_learning_path_progress')
    .select(`
      *,
      path:learning_paths(*)
    `)
    .eq('user_id', userId)
    .order('last_activity_at', { ascending: false })

  if (pathId) {
    query = query.eq('path_id', pathId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch learning path progress: ${error.message}`)
  }

  return (data || []).map((item: any) => ({
    ...item,
    path: Array.isArray(item.path) ? item.path[0] : item.path,
  })) as UserLearningPathProgress[]
}

// 计算学习路径进度（实时计算，不依赖数据库）
export async function calculateLearningPathProgress(
  userId: string,
  pathId: string
): Promise<{
  progress: number
  currentStage: number
  completedStages: number
  totalStages: number
  nextCourses: Course[]
}> {
  const path = await getLearningPathById(pathId)
  if (!path || !path.courses) {
    throw new Error('Learning path not found')
  }

  const completedCourseIds = await getUserCompletedCourseIds(userId)

  // 计算总体进度
  const requiredCourses = path.courses.filter(pc => pc.is_required)
  const completedRequired = requiredCourses.filter(
    pc => pc.course_id && completedCourseIds.has(pc.course_id)
  )
  const progress = requiredCourses.length > 0
    ? Math.round((completedRequired.length / requiredCourses.length) * 100)
    : 0

  // 计算当前阶段
  const stages = [...new Set(path.courses.map(pc => pc.stage))].sort()
  let currentStage = 1
  for (const stage of stages) {
    const stageCourses = path.courses.filter(
      pc => pc.stage === stage && pc.is_required
    )
    const allCompleted = stageCourses.every(
      pc => pc.course_id && completedCourseIds.has(pc.course_id)
    )
    if (allCompleted) {
      currentStage = stage + 1
    } else {
      break
    }
  }

  // 获取下一阶段的课程（检查先修条件）
  const nextStageCourses = path.courses.filter(
    pc => pc.stage === currentStage && pc.is_required
  )

  const nextCourses: Course[] = []
  for (const pathCourse of nextStageCourses) {
    if (pathCourse.course_id && !completedCourseIds.has(pathCourse.course_id)) {
      const check = await checkUserPrerequisites(userId, pathCourse.course_id)
      if (check.canEnroll && pathCourse.course) {
        nextCourses.push(pathCourse.course)
      }
    }
  }

  return {
    progress,
    currentStage,
    completedStages: currentStage - 1,
    totalStages: stages.length,
    nextCourses: nextCourses.slice(0, 5), // 只返回前 5 个
  }
}

// ==================== Prerequisite Groups 操作 ====================

// 获取课程的先修课程组
export async function getCoursePrerequisiteGroups(courseId: string): Promise<PrerequisiteGroup[]> {
  const { data: groups, error } = await supabaseAdmin
    .from('prerequisite_groups')
    .select(`
      *,
      items:prerequisite_group_items(
        prerequisite:course_prerequisites(
          *,
          prerequisite_course:courses!course_prerequisites_prerequisite_course_id_fkey(*)
        )
      )
    `)
    .eq('course_id', courseId)
    .order('display_order', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch prerequisite groups: ${error.message}`)
  }

  return (groups || []).map((group: any) => ({
    ...group,
    prerequisites: (group.items || []).map((item: any) => ({
      ...item.prerequisite,
      prerequisite_course: Array.isArray(item.prerequisite?.prerequisite_course)
        ? item.prerequisite.prerequisite_course[0]
        : item.prerequisite?.prerequisite_course,
    })).filter(Boolean),
  })) as PrerequisiteGroup[]
}

// 创建先修课程组
export async function createPrerequisiteGroup(
  courseId: string,
  group: Omit<PrerequisiteGroup, 'id' | 'course_id' | 'created_at' | 'updated_at' | 'prerequisites'>,
  prerequisiteIds: string[]
): Promise<PrerequisiteGroup> {
  // 创建组
  const { data: groupData, error: groupError } = await supabaseAdmin
    .from('prerequisite_groups')
    .insert({
      course_id: courseId,
      group_type: group.group_type,
      min_required: group.min_required,
      display_order: group.display_order || 0,
      description: group.description || null,
    })
    .select()
    .single()

  if (groupError || !groupData) {
    throw new Error(`Failed to create prerequisite group: ${groupError?.message || 'Unknown error'}`)
  }

  // 添加组项
  if (prerequisiteIds.length > 0) {
    const items = prerequisiteIds.map((prereqId, idx) => ({
      group_id: groupData.id,
      prerequisite_id: prereqId,
      display_order: idx,
    }))

    const { error: itemsError } = await supabaseAdmin
      .from('prerequisite_group_items')
      .insert(items)

    if (itemsError) {
      // 如果创建组项失败，删除已创建的组
      await supabaseAdmin.from('prerequisite_groups').delete().eq('id', groupData.id)
      throw new Error(`Failed to create group items: ${itemsError.message}`)
    }
  }

  // 返回完整的组
  const fullGroup = await getCoursePrerequisiteGroups(courseId)
  return fullGroup.find(g => g.id === groupData.id)!
}

// 删除先修课程组
export async function deletePrerequisiteGroup(groupId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('prerequisite_groups')
    .delete()
    .eq('id', groupId)

  if (error) {
    throw new Error(`Failed to delete prerequisite group: ${error.message}`)
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

    // 获取 franchise 信息（如果 series 有 franchise_id）
    let franchise = null
    if (series.data && (series.data as CourseSeries).franchise_id) {
      const franchiseResult = await supabaseAdmin
        .from('franchises')
        .select('id, code, name')
        .eq('id', (series.data as CourseSeries).franchise_id)
        .single()
      franchise = franchiseResult.data || null
    }

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
      franchise: franchise as { id: string; code: string; name: string } | null,
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

    // 获取 franchise 信息（如果 series 有 franchise_id）
    let franchise = null
    if (series.data && (series.data as CourseSeries).franchise_id) {
      const franchiseResult = await supabaseAdmin
        .from('franchises')
        .select('id, code, name')
        .eq('id', (series.data as CourseSeries).franchise_id)
        .single()
      franchise = franchiseResult.data || null
    }

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
      franchise: franchise as { id: string; code: string; name: string } | null,
    })
  }

  return assignmentsWithDetails
}

// 创建 Course Assignment
export async function createCourseAssignment(
  assignment: Omit<CourseAssignment, 'id' | 'created_at' | 'updated_at'>
): Promise<CourseAssignment> {
  // 验证课程状态：只有 published 状态的课程可以创建 assignment
  const { data: course, error: courseError } = await supabaseAdmin
    .from('courses')
    .select('status')
    .eq('id', assignment.course_id)
    .single()

  if (courseError || !course) {
    throw new Error('Course not found')
  }

  if (course.status !== 'published') {
    throw new Error(`Cannot create assignment for course with status '${course.status}'. Only 'published' courses can be assigned.`)
  }

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
  // 如果更新了 course_id，需要验证课程状态
  if (updates.course_id) {
    const { data: course, error: courseError } = await supabaseAdmin
      .from('courses')
      .select('status')
      .eq('id', updates.course_id)
      .single()

    if (courseError || !course) {
      throw new Error('Course not found')
    }

    if (course.status !== 'published') {
      throw new Error(`Cannot update assignment to course with status '${course.status}'. Only 'published' courses can be assigned.`)
    }
  }

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
  // 注意：使用 select('*') 来避免字段名不匹配的问题
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
          outcomes,
          cancellation_policy,
          prerequisites,
          base_price,
          duration_hours,
          session_count,
          age_min,
          age_max,
          grade_level
        ),
        category:course_categories(*),
        series:course_series(*)
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
    console.error('Error fetching coach instances:', instancesError)
    throw new Error(`Failed to fetch instances: ${instancesError.message}`)
  }

  return (instances || []) as CourseInstanceWithDetails[]
}

// ==================== 课程注册相关类型定义 ====================

export interface CourseEnrollment {
  id: string
  user_id: string
  instance_id: string
  status: 'cart' | 'reserved' | 'enrolled' | 'waitlisted' | 'cancelled' | 'expired' | 'completed'
  added_to_cart_at?: string
  cart_expires_at?: string
  reserved_at?: string
  reserved_expires_at?: string
  enrolled_at?: string
  waitlisted_at?: string
  waitlist_position?: number
  waitlist_notified_at?: string
  waitlist_expires_at?: string
  cancelled_at?: string
  cancelled_reason?: string
  payment_status: 'unpaid' | 'pending' | 'paid' | 'refunded' | 'failed'
  payment_method_id?: string
  amount_paid?: number
  currency: string
  payment_transaction_id?: string
  // Stripe 相关字段
  stripe_checkout_session_id?: string
  stripe_payment_intent_id?: string
  stripe_customer_id?: string
  stripe_refund_id?: string
  refund_amount?: number
  refund_reason?: string
  refunded_at?: string
  notes?: string
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface CourseEnrollmentWithDetails extends CourseEnrollment {
  instance?: CourseInstanceWithDetails
  user?: User
}

export interface EnrollmentConfig {
  id: string
  config_key: string
  config_value: string
  description?: string
  updated_at: string
}

// ==================== 课程注册相关数据库操作函数 ====================

// 获取注册配置
export async function getEnrollmentConfig(key: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('enrollment_config')
    .select('config_value')
    .eq('config_key', key)
    .single()

  if (error || !data) {
    return null
  }

  return data.config_value
}

// 获取实例可用容量
export async function getInstanceAvailableCapacity(instanceId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .rpc('get_instance_available_capacity', { instance_id_param: instanceId })

  if (error || data === null) {
    // 如果函数不存在或出错，手动计算
    const instance = await supabaseAdmin
      .from('course_instances')
      .select('max_students, current_students')
      .eq('id', instanceId)
      .single()

    if (instance.error || !instance.data) {
      return 0
    }

    const maxStudents = instance.data.max_students ?? 0
    
    // 统计各种状态的注册数量
    const [enrolled, reserved, cart] = await Promise.all([
      supabaseAdmin
        .from('course_enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('instance_id', instanceId)
        .eq('status', 'enrolled'),
      supabaseAdmin
        .from('course_enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('instance_id', instanceId)
        .eq('status', 'reserved')
        .gt('reserved_expires_at', new Date().toISOString()),
      supabaseAdmin
        .from('course_enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('instance_id', instanceId)
        .eq('status', 'cart')
        .gt('cart_expires_at', new Date().toISOString()),
    ])

    const enrolledCount = enrolled.count || 0
    const reservedCount = reserved.count || 0
    const cartCount = cart.count || 0

    const availableCapacity = Math.max(0, maxStudents - enrolledCount - reservedCount - cartCount)
    
    // 调试日志：记录容量计算详情
    if (process.env.NODE_ENV === 'development') {
      console.log(`[getInstanceAvailableCapacity ${instanceId}]`, {
        max_students: maxStudents,
        enrolled_count: enrolledCount,
        reserved_count: reservedCount,
        cart_count: cartCount,
        available_capacity: availableCapacity,
      })
    }

    return availableCapacity
  }

  return data as number
}

// 将课程实例加入注册清单
export async function addToCart(userId: string, instanceId: string, notes?: string): Promise<CourseEnrollment> {
  // 检查是否已存在活跃的注册
  const { data: existing } = await supabaseAdmin
    .from('course_enrollments')
    .select('*')
    .eq('user_id', userId)
    .eq('instance_id', instanceId)
    .in('status', ['cart', 'reserved', 'enrolled', 'waitlisted'])
    .maybeSingle()

  if (existing) {
    throw new Error(`Already have an active enrollment with status: ${existing.status}`)
  }

  // 检查可用容量
  const availableCapacity = await getInstanceAvailableCapacity(instanceId)
  
  if (availableCapacity <= 0) {
    throw new Error('Course instance is full. Please join the waitlist.')
  }

  // 获取配置
  const cartExpiryMinutes = parseInt(await getEnrollmentConfig('cart_expiry_minutes') || '15')
  const cartExpiresAt = new Date(Date.now() + cartExpiryMinutes * 60 * 1000)

  // 创建 cart 状态记录
  const { data, error } = await supabaseAdmin
    .from('course_enrollments')
    .insert({
      user_id: userId,
      instance_id: instanceId,
      status: 'cart',
      added_to_cart_at: new Date().toISOString(),
      cart_expires_at: cartExpiresAt.toISOString(),
      notes,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to add to cart: ${error.message}`)
  }

  return data as CourseEnrollment
}

// 加入等待列表
export async function addToWaitlist(userId: string, instanceId: string, notes?: string): Promise<CourseEnrollment> {
  // 检查是否已存在活跃的注册
  const { data: existing } = await supabaseAdmin
    .from('course_enrollments')
    .select('*')
    .eq('user_id', userId)
    .eq('instance_id', instanceId)
    .in('status', ['cart', 'reserved', 'enrolled', 'waitlisted'])
    .maybeSingle()

  if (existing) {
    throw new Error(`Already have an active enrollment with status: ${existing.status}`)
  }

  // 获取当前等待列表长度
  const { count } = await supabaseAdmin
    .from('course_enrollments')
    .select('id', { count: 'exact', head: true })
    .eq('instance_id', instanceId)
    .eq('status', 'waitlisted')

  const waitlistPosition = (count || 0) + 1

  // 创建 waitlisted 状态记录
  const { data, error } = await supabaseAdmin
    .from('course_enrollments')
    .insert({
      user_id: userId,
      instance_id: instanceId,
      status: 'waitlisted',
      waitlisted_at: new Date().toISOString(),
      waitlist_position: waitlistPosition,
      notes,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to add to waitlist: ${error.message}`)
  }

  return data as CourseEnrollment
}

// 获取用户的注册清单
export async function getUserCart(userId: string): Promise<CourseEnrollmentWithDetails[]> {
  const { data, error } = await supabaseAdmin
    .from('course_enrollments')
    .select(`
      *,
      instance:course_instances(
        *,
        assignment:course_assignments(
          *,
          course:courses(*),
          category:course_categories(*),
          series:course_series(*),
          location:course_locations(*)
        ),
        location:course_locations(*)
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'cart')
    .gt('cart_expires_at', new Date().toISOString())
    .order('added_to_cart_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch cart: ${error.message}`)
  }

  return (data || []) as CourseEnrollmentWithDetails[]
}

// 获取用户的等待列表
export async function getUserWaitlist(userId: string): Promise<CourseEnrollmentWithDetails[]> {
  const { data, error } = await supabaseAdmin
    .from('course_enrollments')
    .select(`
      *,
      instance:course_instances(
        *,
        assignment:course_assignments(
          *,
          course:courses(*),
          category:course_categories(*),
          series:course_series(*),
          location:course_locations(*)
        ),
        location:course_locations(*)
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'waitlisted')
    .order('waitlist_position', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch waitlist: ${error.message}`)
  }

  return (data || []) as CourseEnrollmentWithDetails[]
}

// 获取用户的所有注册
export async function getUserEnrollments(
  userId: string,
  status?: CourseEnrollment['status']
): Promise<CourseEnrollmentWithDetails[]> {
  let query = supabaseAdmin
    .from('course_enrollments')
    .select(`
      *,
      instance:course_instances(
        *,
        assignment:course_assignments(
          *,
          course:courses(*),
          category:course_categories(*),
          series:course_series(*),
          location:course_locations(*)
        ),
        location:course_locations(*)
      )
    `)
    .eq('user_id', userId)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch enrollments: ${error.message}`)
  }

  return (data || []) as CourseEnrollmentWithDetails[]
}

// 获取所有注册（管理员功能）
export async function getAllEnrollments(
  filters?: {
    status?: CourseEnrollment['status']
    payment_status?: CourseEnrollment['payment_status']
    user_id?: string
    instance_id?: string
  }
): Promise<CourseEnrollmentWithDetails[]> {
  let query = supabaseAdmin
    .from('course_enrollments')
    .select(`
      *,
      user:users(id, name, email),
      instance:course_instances(
        *,
        assignment:course_assignments(
          *,
          course:courses(*),
          category:course_categories(*),
          series:course_series(*),
          location:course_locations(*)
        ),
        location:course_locations(*)
      )
    `)

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.payment_status) {
    query = query.eq('payment_status', filters.payment_status)
  }
  if (filters?.user_id) {
    query = query.eq('user_id', filters.user_id)
  }
  if (filters?.instance_id) {
    query = query.eq('instance_id', filters.instance_id)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch enrollments: ${error.message}`)
  }

  return (data || []) as CourseEnrollmentWithDetails[]
}

// 获取单个注册详情
export async function getEnrollmentById(enrollmentId: string): Promise<CourseEnrollmentWithDetails | null> {
  const { data, error } = await supabaseAdmin
    .from('course_enrollments')
    .select(`
      *,
      instance:course_instances(
        *,
        assignment:course_assignments(
          *,
          course:courses(*),
          category:course_categories(*),
          series:course_series(*),
          location:course_locations(*)
        ),
        location:course_locations(*)
      ),
      user:users(id, name, email)
    `)
    .eq('id', enrollmentId)
    .single()

  if (error || !data) {
    return null
  }

  return data as CourseEnrollmentWithDetails
}

// 从注册清单移除
export async function removeFromCart(enrollmentId: string, userId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('course_enrollments')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_reason: 'Removed from cart by user',
      updated_at: new Date().toISOString(),
    })
    .eq('id', enrollmentId)
    .eq('user_id', userId)
    .eq('status', 'cart')

  if (error) {
    throw new Error(`Failed to remove from cart: ${error.message}`)
  }

  return true
}

// 从等待列表移除
export async function removeFromWaitlist(enrollmentId: string, userId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('course_enrollments')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_reason: 'Removed from waitlist by user',
      updated_at: new Date().toISOString(),
    })
    .eq('id', enrollmentId)
    .eq('user_id', userId)
    .eq('status', 'waitlisted')

  if (error) {
    throw new Error(`Failed to remove from waitlist: ${error.message}`)
  }

  // 更新等待列表位置
  const enrollment = await getEnrollmentById(enrollmentId)
  if (enrollment?.instance_id) {
    await supabaseAdmin.rpc('update_waitlist_positions', {
      instance_id_param: enrollment.instance_id,
    })
  }

  return true
}

// 延长注册清单过期时间
export async function extendCartExpiry(enrollmentId: string, userId: string, additionalMinutes: number = 15): Promise<CourseEnrollment> {
  const enrollment = await getEnrollmentById(enrollmentId)
  
  if (!enrollment || enrollment.user_id !== userId || enrollment.status !== 'cart') {
    throw new Error('Invalid enrollment or not in cart status')
  }

  const newExpiry = new Date(Date.now() + additionalMinutes * 60 * 1000)

  const { data, error } = await supabaseAdmin
    .from('course_enrollments')
    .update({
      cart_expires_at: newExpiry.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', enrollmentId)
    .eq('user_id', userId)
    .eq('status', 'cart')
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to extend cart expiry: ${error.message}`)
  }

  return data as CourseEnrollment
}

// 结账（从 cart 转为 reserved）
export async function checkoutCart(enrollmentIds: string[], userId: string, paymentMethodId?: string): Promise<CourseEnrollment[]> {
  // 验证所有注册都属于该用户且状态为 cart，且未过期
  const now = new Date().toISOString()
  const { data: enrollments, error: queryError } = await supabaseAdmin
    .from('course_enrollments')
    .select('*')
    .in('id', enrollmentIds)
    .eq('user_id', userId)
    .eq('status', 'cart')
    .gt('cart_expires_at', now)  // 确保购物车项未过期

  if (queryError) {
    throw new Error(`Failed to query enrollments: ${queryError.message}`)
  }

  if (!enrollments || enrollments.length !== enrollmentIds.length) {
    // 提供更详细的错误信息
    const foundIds = enrollments?.map(e => e.id) || []
    const missingIds = enrollmentIds.filter(id => !foundIds.includes(id))
    
    // 检查缺失的注册的详细信息
    if (missingIds.length > 0) {
      const { data: missingEnrollments } = await supabaseAdmin
        .from('course_enrollments')
        .select('id, status, user_id, cart_expires_at')
        .in('id', missingIds)
      
      console.error('[checkoutCart] Missing enrollments details:', {
        requested: enrollmentIds,
        found: foundIds,
        missing: missingIds,
        missingDetails: missingEnrollments,
        userId,
        now,
      })
      
      const expired = missingEnrollments?.filter(e => 
        e.status === 'cart' && e.cart_expires_at && e.cart_expires_at <= now
      ) || []
      const wrongUser = missingEnrollments?.filter(e => e.user_id !== userId) || []
      const wrongStatus = missingEnrollments?.filter(e => e.status !== 'cart') || []
      
      if (expired.length > 0) {
        throw new Error(`Some items in your cart have expired. Please refresh the page and try again.`)
      }
      if (wrongUser.length > 0) {
        throw new Error(`Some enrollments do not belong to you.`)
      }
      if (wrongStatus.length > 0) {
        throw new Error(`Some enrollments are no longer in cart (status: ${wrongStatus.map(e => e.status).join(', ')}).`)
      }
    }
    
    throw new Error('Some enrollments are invalid or not in cart')
  }

  // 检查是否还有可用容量
  for (const enrollment of enrollments) {
    const available = await getInstanceAvailableCapacity(enrollment.instance_id)
    if (available <= 0) {
      throw new Error(`Course instance ${enrollment.instance_id} is now full`)
    }
  }

  // 获取配置
  const reservedExpiryMinutes = parseInt(await getEnrollmentConfig('reserved_expiry_minutes') || '10')
  const reservedExpiresAt = new Date(Date.now() + reservedExpiryMinutes * 60 * 1000)

  // 更新状态为 reserved（确保未过期）
  const { data, error } = await supabaseAdmin
    .from('course_enrollments')
    .update({
      status: 'reserved',
      reserved_at: new Date().toISOString(),
      reserved_expires_at: reservedExpiresAt.toISOString(),
      payment_status: 'pending',
      payment_method_id: paymentMethodId,
      updated_at: new Date().toISOString(),
    })
    .in('id', enrollmentIds)
    .eq('user_id', userId)
    .eq('status', 'cart')
    .gt('cart_expires_at', now)  // 确保未过期
    .select()

  if (error) {
    throw new Error(`Failed to checkout: ${error.message}`)
  }

  return (data || []) as CourseEnrollment[]
}

// 计算注册记录的总金额
export interface EnrollmentPriceInfo {
  enrollmentId: string
  amount: number
  currency: string
  courseName: string
  instanceName?: string
}

export async function calculateEnrollmentTotal(
  enrollmentIds: string[]
): Promise<{
  total: number
  currency: string
  items: EnrollmentPriceInfo[]
}> {
  if (enrollmentIds.length === 0) {
    return { total: 0, currency: 'USD', items: [] }
  }

  // 获取所有注册记录及其关联的实例和课程信息
  const { data: enrollments, error } = await supabaseAdmin
    .from('course_enrollments')
    .select(`
      id,
      instance_id,
      currency,
      instance:course_instances(
        id,
        start_date,
        start_time,
        end_date,
        end_time,
        price_override,
        assignment:course_assignments(
          course:courses(
            id,
            name,
            base_price,
            currency
          )
        ),
        location:course_locations(
          id,
          name
        )
      )
    `)
    .in('id', enrollmentIds)

  if (error) {
    throw new Error(`Failed to fetch enrollments: ${error.message}`)
  }

  if (!enrollments || enrollments.length === 0) {
    return { total: 0, currency: 'USD', items: [] }
  }

  const items: EnrollmentPriceInfo[] = []
  let total = 0
  let currency = 'USD'

  for (const enrollment of enrollments) {
    const instance = Array.isArray(enrollment.instance) 
      ? enrollment.instance[0] 
      : enrollment.instance
    const assignment = Array.isArray(instance?.assignment)
      ? instance?.assignment[0]
      : instance?.assignment
    const course = Array.isArray(assignment?.course)
      ? assignment?.course[0]
      : assignment?.course

    // 价格优先级：实例价格覆盖 > 课程基础价格
    const price = instance?.price_override ?? course?.base_price ?? 0
    const itemCurrency = enrollment.currency || course?.currency || 'USD'
    currency = itemCurrency // 使用第一个货币（假设所有项目使用相同货币）

    // 构建实例描述（使用日期、时间和地点）
    const location = Array.isArray(instance?.location)
      ? instance.location[0]
      : instance?.location
    
    const instanceDescription = instance 
      ? [
          instance.start_date ? new Date(instance.start_date).toLocaleDateString() : '',
          instance.start_time ? instance.start_time.substring(0, 5) : '',
          location?.name ? `at ${location.name}` : '',
        ].filter(Boolean).join(' ')
      : undefined

    items.push({
      enrollmentId: enrollment.id,
      amount: price,
      currency: itemCurrency,
      courseName: course?.name || 'Unknown Course',
      instanceName: instanceDescription,
    })

    total += price
  }

  return { total, currency, items }
}

// 确认注册（支付成功后）
export async function confirmEnrollment(
  enrollmentId: string,
  userId: string,
  paymentTransactionId: string,
  amountPaid: number,
  stripePaymentIntentId?: string
): Promise<CourseEnrollment> {
  const enrollment = await getEnrollmentById(enrollmentId)
  
  if (!enrollment || enrollment.user_id !== userId) {
    throw new Error('Invalid enrollment')
  }

  if (enrollment.status !== 'reserved') {
    throw new Error(`Enrollment is not in reserved status. Current status: ${enrollment.status}`)
  }

  // 检查是否过期
  if (enrollment.reserved_expires_at && new Date(enrollment.reserved_expires_at) < new Date()) {
    throw new Error('Reservation has expired')
  }

  // 更新为 enrolled
  const updateData: any = {
    status: 'enrolled',
    enrolled_at: new Date().toISOString(),
    payment_status: 'paid',
    payment_transaction_id: paymentTransactionId,
    amount_paid: amountPaid,
    updated_at: new Date().toISOString(),
  }

  if (stripePaymentIntentId) {
    updateData.stripe_payment_intent_id = stripePaymentIntentId
  }

  const { data, error } = await supabaseAdmin
    .from('course_enrollments')
    .update(updateData)
    .eq('id', enrollmentId)
    .eq('user_id', userId)
    .eq('status', 'reserved')
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to confirm enrollment: ${error.message}`)
  }

  return data as CourseEnrollment
}

// 根据 Stripe Checkout Session ID 获取注册记录
export async function getEnrollmentByStripeSessionId(
  sessionId: string
): Promise<CourseEnrollmentWithDetails | null> {
  const { data, error } = await supabaseAdmin
    .from('course_enrollments')
    .select(`
      *,
      instance:course_instances(
        *,
        assignment:course_assignments(
          *,
          course:courses(*),
          category:course_categories(*),
          series:course_series(*),
          location:course_locations(*)
        ),
        location:course_locations(*)
      ),
      user:users(id, name, email)
    `)
    .eq('stripe_checkout_session_id', sessionId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch enrollment: ${error.message}`)
  }

  return data as CourseEnrollmentWithDetails | null
}

// 根据 Stripe Payment Intent ID 获取注册记录
export async function getEnrollmentByStripePaymentIntentId(
  paymentIntentId: string
): Promise<CourseEnrollmentWithDetails | null> {
  const { data, error } = await supabaseAdmin
    .from('course_enrollments')
    .select(`
      *,
      instance:course_instances(
        *,
        assignment:course_assignments(
          *,
          course:courses(*),
          category:course_categories(*),
          series:course_series(*),
          location:course_locations(*)
        ),
        location:course_locations(*)
      ),
      user:users(id, name, email)
    `)
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch enrollment: ${error.message}`)
  }

  return data as CourseEnrollmentWithDetails | null
}

// 更新注册的 Stripe 信息
export async function updateEnrollmentStripeInfo(
  enrollmentId: string,
  stripeInfo: {
    checkout_session_id?: string
    payment_intent_id?: string
    customer_id?: string
  }
): Promise<CourseEnrollment> {
  const updateData: any = {
    updated_at: new Date().toISOString(),
  }

  if (stripeInfo.checkout_session_id) {
    updateData.stripe_checkout_session_id = stripeInfo.checkout_session_id
  }
  if (stripeInfo.payment_intent_id) {
    updateData.stripe_payment_intent_id = stripeInfo.payment_intent_id
  }
  if (stripeInfo.customer_id) {
    updateData.stripe_customer_id = stripeInfo.customer_id
  }

  const { data, error } = await supabaseAdmin
    .from('course_enrollments')
    .update(updateData)
    .eq('id', enrollmentId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update enrollment Stripe info: ${error.message}`)
  }

  return data as CourseEnrollment
}

// 处理支付失败
export async function markEnrollmentPaymentFailed(
  enrollmentId: string,
  reason?: string
): Promise<CourseEnrollment> {
  const enrollment = await getEnrollmentById(enrollmentId)
  
  const { data, error } = await supabaseAdmin
    .from('course_enrollments')
    .update({
      payment_status: 'failed',
      updated_at: new Date().toISOString(),
      metadata: {
        ...(enrollment?.metadata || {}),
        payment_failure_reason: reason,
        payment_failed_at: new Date().toISOString(),
      },
    })
    .eq('id', enrollmentId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to mark payment as failed: ${error.message}`)
  }

  return data as CourseEnrollment
}

// 取消注册
export async function cancelEnrollment(
  enrollmentId: string,
  userId: string,
  reason?: string
): Promise<boolean> {
  const enrollment = await getEnrollmentById(enrollmentId)
  
  if (!enrollment || enrollment.user_id !== userId) {
    throw new Error('Invalid enrollment')
  }

  if (!['cart', 'reserved', 'enrolled', 'waitlisted'].includes(enrollment.status)) {
    throw new Error(`Cannot cancel enrollment with status: ${enrollment.status}`)
  }

  const { error } = await supabaseAdmin
    .from('course_enrollments')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_reason: reason || 'Cancelled by user',
      updated_at: new Date().toISOString(),
    })
    .eq('id', enrollmentId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to cancel enrollment: ${error.message}`)
  }

  // 如果是等待列表，更新位置
  if (enrollment.status === 'waitlisted' && enrollment.instance_id) {
    await supabaseAdmin.rpc('update_waitlist_positions', {
      instance_id_param: enrollment.instance_id,
    })
  }

  return true
}

// 处理过期的注册（后台任务）
export async function processExpiredEnrollments(): Promise<{ processed: number; freedSpots: number }> {
  const { data, error } = await supabaseAdmin.rpc('process_expired_enrollments')

  if (error) {
    throw new Error(`Failed to process expired enrollments: ${error.message}`)
  }

  if (data && data.length > 0) {
    return {
      processed: data[0].processed_count || 0,
      freedSpots: data[0].freed_spots || 0,
    }
  }

  return { processed: 0, freedSpots: 0 }
}

// 检查等待列表并通知（后台任务）
export async function checkWaitlistAndNotify(): Promise<number> {
  // 查找所有有等待列表的实例
  const { data: instances } = await supabaseAdmin
    .from('course_enrollments')
    .select('instance_id')
    .eq('status', 'waitlisted')
    .is('waitlist_notified_at', null)

  if (!instances || instances.length === 0) {
    return 0
  }

  const uniqueInstanceIds = [...new Set(instances.map(i => i.instance_id))]
  let notifiedCount = 0

  for (const instanceId of uniqueInstanceIds) {
    const available = await getInstanceAvailableCapacity(instanceId)
    
    if (available > 0) {
      // 找到第一个等待列表用户
      const { data: firstWaitlist } = await supabaseAdmin
        .from('course_enrollments')
        .select('*')
        .eq('instance_id', instanceId)
        .eq('status', 'waitlisted')
        .is('waitlist_notified_at', null)
        .order('waitlist_position', { ascending: true })
        .limit(1)
        .single()

      if (firstWaitlist) {
        // 获取配置
        const notificationHours = parseInt(await getEnrollmentConfig('waitlist_notification_hours') || '24')
        const waitlistExpiresAt = new Date(Date.now() + notificationHours * 60 * 60 * 1000)

        // 更新为已通知
        await supabaseAdmin
          .from('course_enrollments')
          .update({
            waitlist_notified_at: new Date().toISOString(),
            waitlist_expires_at: waitlistExpiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', firstWaitlist.id)

        // 创建通知记录
        await supabaseAdmin
          .from('waitlist_notifications')
          .insert({
            enrollment_id: firstWaitlist.id,
            notification_type: 'spot_available',
            notification_method: 'email',
          })

        notifiedCount++
      }
    }
  }

  return notifiedCount
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
          outcomes,
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

