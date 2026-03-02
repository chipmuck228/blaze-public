// 环境变量检查脚本
const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, '..', '..', '.env.local');

if (!fs.existsSync(envFile)) {
  console.error('❌ .env.local 文件不存在');
  process.exit(1);
}

const envContent = fs.readFileSync(envFile, 'utf-8');
const lines = envContent.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));

const requiredVars = {
  'AUTH_SECRET': 'NextAuth.js 密钥',
  'NEXTAUTH_URL': 'NextAuth.js URL',
  'NEXT_PUBLIC_SUPABASE_URL': 'Supabase 项目 URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': 'Supabase Anon Key',
  'SUPABASE_SERVICE_ROLE_KEY': 'Supabase Service Role Key',
  'SMTP_HOST': 'SMTP 服务器地址',
  'SMTP_PORT': 'SMTP 端口',
  'SMTP_USER': 'SMTP 用户名',
  'SMTP_PASSWORD': 'SMTP 密码',
  'SMTP_FROM': '发件人邮箱',
};

const optionalVars = {
  'GOOGLE_CLIENT_ID': 'Google OAuth Client ID（可选）',
  'GOOGLE_CLIENT_SECRET': 'Google OAuth Client Secret（可选）',
};

const envVars = {};
lines.forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

console.log('📋 环境变量检查结果：\n');

let hasErrors = false;
let hasWarnings = false;

// 检查必需变量
console.log('✅ 必需变量：');
Object.keys(requiredVars).forEach(key => {
  if (envVars[key]) {
    const value = envVars[key];
    if (value === `your-${key.toLowerCase().replace(/_/g, '-')}` || 
        value.includes('your-') || 
        value === '' || 
        value === 'xxx') {
      console.log(`  ❌ ${key}: ${requiredVars[key]} - 未配置或使用默认值`);
      hasErrors = true;
    } else {
      const displayValue = key.includes('SECRET') || key.includes('PASSWORD') || key.includes('KEY')
        ? '***' + value.slice(-4)
        : value.length > 50 ? value.substring(0, 50) + '...' : value;
      console.log(`  ✅ ${key}: ${displayValue}`);
    }
  } else {
    console.log(`  ❌ ${key}: ${requiredVars[key]} - 缺失`);
    hasErrors = true;
  }
});

// 检查可选变量
console.log('\n📌 可选变量：');
Object.keys(optionalVars).forEach(key => {
  if (envVars[key]) {
    const value = envVars[key];
    if (value === `your-${key.toLowerCase().replace(/_/g, '-')}` || 
        value.includes('your-') || 
        value === '' || 
        value === 'xxx') {
      console.log(`  ⚠️  ${key}: ${optionalVars[key]} - 未配置（Google 登录将不可用）`);
      hasWarnings = true;
    } else {
      const displayValue = key.includes('SECRET') || key.includes('PASSWORD') || key.includes('KEY')
        ? '***' + value.slice(-4)
        : value.length > 50 ? value.substring(0, 50) + '...' : value;
      console.log(`  ✅ ${key}: ${displayValue}`);
    }
  } else {
    console.log(`  ⚠️  ${key}: ${optionalVars[key]} - 未配置（Google 登录将不可用）`);
    hasWarnings = true;
  }
});

// 验证格式
console.log('\n🔍 格式验证：');

// 验证 AUTH_SECRET 长度
if (envVars.AUTH_SECRET && envVars.AUTH_SECRET.length < 32) {
  console.log('  ⚠️  AUTH_SECRET 建议至少 32 个字符');
  hasWarnings = true;
} else if (envVars.AUTH_SECRET) {
  console.log('  ✅ AUTH_SECRET 长度符合要求');
}

// 验证 NEXTAUTH_URL 格式
if (envVars.NEXTAUTH_URL) {
  if (envVars.NEXTAUTH_URL.startsWith('http://') || envVars.NEXTAUTH_URL.startsWith('https://')) {
    console.log('  ✅ NEXTAUTH_URL 格式正确');
  } else {
    console.log('  ⚠️  NEXTAUTH_URL 应包含 http:// 或 https://');
    hasWarnings = true;
  }
}

// 验证 Supabase URL 格式
if (envVars.NEXT_PUBLIC_SUPABASE_URL) {
  if (envVars.NEXT_PUBLIC_SUPABASE_URL.includes('supabase.co')) {
    console.log('  ✅ Supabase URL 格式正确');
  } else {
    console.log('  ⚠️  Supabase URL 可能不正确');
    hasWarnings = true;
  }
}

// 验证 SMTP 端口
if (envVars.SMTP_PORT) {
  const port = parseInt(envVars.SMTP_PORT);
  if (port > 0 && port < 65536) {
    console.log('  ✅ SMTP_PORT 格式正确');
  } else {
    console.log('  ⚠️  SMTP_PORT 应为有效端口号');
    hasWarnings = true;
  }
}

// 验证邮箱格式
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (envVars.SMTP_USER && !emailRegex.test(envVars.SMTP_USER)) {
  console.log('  ⚠️  SMTP_USER 邮箱格式可能不正确');
  hasWarnings = true;
} else if (envVars.SMTP_USER) {
  console.log('  ✅ SMTP_USER 邮箱格式正确');
}

if (envVars.SMTP_FROM && !emailRegex.test(envVars.SMTP_FROM)) {
  console.log('  ⚠️  SMTP_FROM 邮箱格式可能不正确');
  hasWarnings = true;
} else if (envVars.SMTP_FROM) {
  console.log('  ✅ SMTP_FROM 邮箱格式正确');
}

console.log('\n' + '='.repeat(50));

if (hasErrors) {
  console.log('\n❌ 发现错误：请修复上述必需变量的配置');
  process.exit(1);
} else if (hasWarnings) {
  console.log('\n⚠️  发现警告：部分配置可能需要调整，但可以继续运行');
  process.exit(0);
} else {
  console.log('\n✅ 所有配置检查通过！');
  process.exit(0);
}

