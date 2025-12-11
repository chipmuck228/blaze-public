/**
 * 更新用户角色的脚本
 * 
 * 使用方法:
 * node scripts/update-user-role.js "email@example.com" "coach"
 * node scripts/update-user-role.js "email@example.com" "admin"
 * node scripts/update-user-role.js "email@example.com" "user"
 */

const fs = require('fs')
const path = require('path')

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

async function getSupabaseAdmin() {
  const { createClient } = require('@supabase/supabase-js')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables. Please check .env.local file.')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

async function updateUserRole() {
  const email = process.argv[2]
  const role = process.argv[3]

  if (!email || !role) {
    console.error('❌ 使用方法: node scripts/update-user-role.js "email@example.com" "coach|admin|user"')
    console.log('\n示例:')
    console.log('  node scripts/update-user-role.js "coach@test.com" "coach"')
    console.log('  node scripts/update-user-role.js "admin@test.com" "admin"')
    process.exit(1)
  }

  const validRoles = ['user', 'admin', 'coach']
  if (!validRoles.includes(role)) {
    console.error(`❌ 无效的角色: ${role}`)
    console.log(`   有效角色: ${validRoles.join(', ')}`)
    process.exit(1)
  }

  try {
    console.log(`\n正在更新用户角色...`)
    console.log(`邮箱: ${email}`)
    console.log(`角色: ${role}`)

    const supabaseAdmin = await getSupabaseAdmin()

    // 先查找用户
    const { data: user, error: findError } = await supabaseAdmin
      .from('users')
      .select('id, name, email, role')
      .eq('email', email)
      .single()

    if (findError || !user) {
      console.error(`❌ 用户不存在: ${email}`)
      process.exit(1)
    }

    console.log(`\n当前用户信息:`)
    console.log(`  ID: ${user.id}`)
    console.log(`  姓名: ${user.name}`)
    console.log(`  邮箱: ${user.email}`)
    console.log(`  当前角色: ${user.role || 'NULL (默认 user)'}`)

    // 更新角色
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        role: role,
        email_verified: true,  // 同时设置为已验证（coach 和 admin 可以跳过验证）
      })
      .eq('id', user.id)

    if (updateError) {
      throw new Error(`Failed to update user role: ${updateError.message}`)
    }

    console.log(`\n✅ 用户角色已更新为: ${role}`)
    console.log(`\n现在可以使用以下信息登录:`)
    if (role === 'coach') {
      console.log(`  登录地址: http://localhost:3000/coach/login`)
    } else if (role === 'admin') {
      console.log(`  登录地址: http://localhost:3000/admin/login`)
    }
  } catch (error) {
    console.error('❌ 更新失败:', error.message)
    process.exit(1)
  }
}

// 运行脚本
updateUserRole()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Unexpected error:', error)
    process.exit(1)
  })

