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

