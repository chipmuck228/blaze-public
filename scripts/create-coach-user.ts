/**
 * 创建 Coach 用户的脚本
 * 
 * 使用方法:
 * 1. 安装依赖: npm install
 * 2. 运行脚本: npx tsx scripts/create-coach-user.ts
 * 
 * 或者使用 ts-node:
 * npx ts-node scripts/create-coach-user.ts
 */

import { createUser } from '../src/lib/db'

async function createCoachUser() {
  // ==================== 配置 ====================
  // 请修改以下信息
  const name = 'Coach User'  // 教练姓名
  const email = 'coach@example.com'  // 教练邮箱
  const password = 'coach123456'  // 教练密码（请修改为安全密码）
  // =============================================

  try {
    console.log('正在创建 Coach 用户...')
    console.log(`姓名: ${name}`)
    console.log(`邮箱: ${email}`)
    
    // 创建用户
    const user = await createUser(name, email, password)
    
    // 更新用户角色为 coach 并设置邮箱已验证
    const { supabaseAdmin } = await import('../src/lib/supabase')
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        role: 'coach',
        email_verified: true,  // Coach 可以跳过邮箱验证
      })
      .eq('id', user.id)

    if (updateError) {
      throw new Error(`Failed to update user role: ${updateError.message}`)
    }

    console.log('✅ Coach 用户创建成功!')
    console.log(`用户 ID: ${user.id}`)
    console.log(`邮箱: ${user.email}`)
    console.log(`角色: coach`)
    console.log('\n现在可以使用以下信息登录 Coach Portal:')
    console.log(`邮箱: ${email}`)
    console.log(`密码: ${password}`)
    console.log(`登录地址: http://localhost:3000/coach/login`)
  } catch (error: any) {
    if (error.message === 'User already exists') {
      console.error('❌ 错误: 该邮箱已存在')
      console.log('\n如果这是您想要设置为 coach 的用户，请运行以下 SQL:')
      console.log(`UPDATE users SET role = 'coach', email_verified = TRUE WHERE email = '${email}';`)
    } else {
      console.error('❌ 创建失败:', error.message)
    }
    process.exit(1)
  }
}

// 运行脚本
createCoachUser()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Unexpected error:', error)
    process.exit(1)
  })

