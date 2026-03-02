// 检查环境变量的脚本
// 使用方法: node scripts/check/check-env-vars.js

const fs = require('fs');
const path = require('path');

// 读取 .env.local 文件
const envPath = path.join(__dirname, '..', '..', '.env.local');

if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local 文件不存在');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const lines = envContent.split('\n');

const envVars = {};
lines.forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  }
});

console.log('📋 环境变量检查结果：\n');

const requiredVars = {
  'AUTH_SECRET': 'NextAuth.js 密钥',
  'NEXTAUTH_URL': 'NextAuth.js URL',
  'GOOGLE_CLIENT_ID': 'Google OAuth Client ID',
  'GOOGLE_CLIENT_SECRET': 'Google OAuth Client Secret',
};

let allPresent = true;

Object.keys(requiredVars).forEach(key => {
  const value = envVars[key];
  if (value) {
    // 显示前几个字符和后几个字符，中间用 *** 代替
    const displayValue = value.length > 10 
      ? `${value.substring(0, 4)}***${value.substring(value.length - 4)}`
      : '***';
    console.log(`✅ ${key}: ${displayValue} (${requiredVars[key]})`);
  } else {
    console.log(`❌ ${key}: 未设置 (${requiredVars[key]})`);
    allPresent = false;
  }
});

console.log('\n');

if (allPresent) {
  console.log('✅ 所有必需的环境变量都已设置');
  console.log('\n💡 注意：在 Next.js 应用中，这些变量会自动加载。');
  console.log('   如果运行时仍然出现问题，请确保：');
  console.log('   1. 重启开发服务器 (npm run dev)');
  console.log('   2. 检查变量值是否正确（没有多余的空格或引号）');
  console.log('   3. 检查 Google Cloud Console 中的配置');
} else {
  console.log('❌ 缺少必需的环境变量');
  console.log('\n请编辑 .env.local 文件并添加缺失的变量。');
  process.exit(1);
}

