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

