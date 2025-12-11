/**
 * 创建 Coach 用户的脚本 (JavaScript 版本)
 * 
 * 使用方法:
 * node scripts/create-coach-user.js
 */

const fs = require('fs')
const path = require('path')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

// 加载环境变量
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        let value = match[2].trim()
        // 移除引号
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }
        process.env[key] = value
      }
    })
  }
}

loadEnv()

// 导入 Supabase 客户端
async function getSupabaseAdmin() {
  const { createClient } = require('@supabase/supabase-js')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables. Please check .env.local file.')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

async function createCoachUser() {
  // ==================== 配置 ====================
  // 方法 1: 使用命令行参数
  // node scripts/create-coach-user.js "Coach Name" "coach@example.com" "password123"
  // 
  // 方法 2: 修改下面的默认值
  const name = process.argv[2] || 'Test Coach'  // 教练姓名
  const email = process.argv[3] || 'coach@test.com'  // 教练邮箱
  const password = process.argv[4] || 'coach123456'  // 教练密码
  // =============================================
  
  console.log('\n📝 将创建以下 Coach 用户:')
  console.log(`   姓名: ${name}`)
  console.log(`   邮箱: ${email}`)
  console.log(`   密码: ${password}`)
  console.log('\n💡 提示: 可以通过命令行参数自定义:')
  console.log('   node scripts/create-coach-user.js "姓名" "邮箱" "密码"')
  console.log('')

  try {
    console.log('正在创建 Coach 用户...')
    console.log(`姓名: ${name}`)
    console.log(`邮箱: ${email}`)

    const supabaseAdmin = await getSupabaseAdmin()

    // 检查用户是否已存在
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      console.log('用户已存在，更新为 coach 角色...')
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          role: 'coach',
          email_verified: true,
        })
        .eq('id', existingUser.id)

      if (updateError) {
        throw new Error(`Failed to update user role: ${updateError.message}`)
      }

      console.log('✅ 用户角色已更新为 coach!')
      console.log(`用户 ID: ${existingUser.id}`)
      console.log(`邮箱: ${email}`)
      console.log(`角色: coach`)
      console.log('\n现在可以使用以下信息登录 Coach Portal:')
      console.log(`邮箱: ${email}`)
      console.log(`密码: (使用现有密码)`)
      console.log(`登录地址: http://localhost:3000/coach/login`)
      return
    }

    // 加密密码
    const password_hash = await bcrypt.hash(password, 10)

    // 生成邮箱验证令牌
    const email_verification_token = crypto.randomBytes(32).toString('hex')
    const email_verification_expires = new Date(Date.now() + 24 * 60 * 60 * 1000)

    // 创建用户
    const { data: user, error: createError } = await supabaseAdmin
      .from('users')
      .insert({
        name,
        email,
        password_hash,
        email_verified: true,  // Coach 可以跳过邮箱验证
        email_verification_token,
        email_verification_expires: email_verification_expires.toISOString(),
        role: 'coach',
      })
      .select()
      .single()

    if (createError) {
      throw new Error(`Failed to create user: ${createError.message}`)
    }

    console.log('✅ Coach 用户创建成功!')
    console.log(`用户 ID: ${user.id}`)
    console.log(`邮箱: ${user.email}`)
    console.log(`角色: coach`)
    console.log('\n现在可以使用以下信息登录 Coach Portal:')
    console.log(`邮箱: ${email}`)
    console.log(`密码: ${password}`)
    console.log(`登录地址: http://localhost:3000/coach/login`)
  } catch (error) {
    console.error('❌ 创建失败:', error.message)
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

