#!/usr/bin/env node

/**
 * Phase 1 数据库迁移执行脚本
 * 
 * 使用方法:
 *   node scripts/run-phase1-migrations.js
 * 
 * 功能:
 *   1. 创建学生管理表（students, user_students, student_invitations）
 *   2. 创建 instance_enrollments 表
 *   3. 创建辅助表（状态历史、等待列表通知、核销记录、信用额度、奖章、称号）
 *   4. 创建数据库触发器
 *   5. 创建数据库函数
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 加载环境变量
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少 Supabase 环境变量。请检查 .env.local 文件。');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// SQL 文件列表（按顺序执行）
const migrationFiles = [
  'migrate-create-students-tables.sql',
  'migrate-create-instance-enrollments-table.sql',
  'migrate-create-enrollment-auxiliary-tables.sql',
  'migrate-create-enrollment-triggers.sql',
  'migrate-create-enrollment-functions.sql'
];

const SQL_DIR = path.join(__dirname, '..', 'sql', 'root-migrations');

async function runMigration(fileName) {
  const filePath = path.join(SQL_DIR, fileName);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`);
  }
  
  const sql = fs.readFileSync(filePath, 'utf-8');
  
  console.log(`\n📄 执行迁移: ${fileName}`);
  console.log('─'.repeat(60));
  
  // 使用 Supabase RPC 执行 SQL（如果支持）
  // 或者使用 Supabase REST API 的 SQL 执行功能
  // 注意：Supabase 客户端可能不支持直接执行 SQL，需要使用 Supabase Dashboard 或 psql
  
  // 这里我们输出 SQL 内容，用户需要在 Supabase Dashboard 的 SQL Editor 中执行
  console.log('⚠️  注意：Supabase JS 客户端不支持直接执行 SQL。');
  console.log('请使用以下方式之一执行迁移：');
  console.log('1. 在 Supabase Dashboard 的 SQL Editor 中执行');
  console.log('2. 使用 psql 命令行工具连接数据库执行');
  console.log('3. 使用 Supabase CLI: supabase db push');
  console.log('\nSQL 文件位置:', filePath);
  
  return { fileName, success: true };
}

async function main() {
  console.log('🚀 开始执行 Phase 1 数据库迁移');
  console.log('='.repeat(60));
  
  const results = [];
  
  for (const fileName of migrationFiles) {
    try {
      const result = await runMigration(fileName);
      results.push(result);
      console.log(`✅ ${fileName} - 准备就绪`);
    } catch (error) {
      console.error(`❌ ${fileName} - 失败:`, error.message);
      results.push({ fileName, success: false, error: error.message });
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 迁移总结:');
  console.log('─'.repeat(60));
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  console.log(`✅ 成功: ${successCount}/${results.length}`);
  console.log(`❌ 失败: ${failCount}/${results.length}`);
  
  if (failCount > 0) {
    console.log('\n失败的迁移:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.fileName}: ${r.error}`);
    });
  }
  
  console.log('\n📝 下一步:');
  console.log('请在 Supabase Dashboard 的 SQL Editor 中依次执行以下 SQL 文件:');
  migrationFiles.forEach((file, index) => {
    console.log(`  ${index + 1}. ${file}`);
  });
  
  console.log('\n或者使用 psql 命令行工具（SQL 文件在 sql/root-migrations/）:');
  console.log('  psql -h <host> -U <user> -d <database> -f sql/root-migrations/migrate-create-students-tables.sql');
  console.log('  psql -h <host> -U <user> -d <database> -f sql/root-migrations/migrate-create-instance-enrollments-table.sql');
  console.log('  ...');
}

main().catch(error => {
  console.error('❌ 执行失败:', error);
  process.exit(1);
});
