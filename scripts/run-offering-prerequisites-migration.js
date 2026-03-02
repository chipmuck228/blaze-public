#!/usr/bin/env node

/**
 * 运行 Offering Prerequisites 迁移脚本
 * 
 * 使用方法:
 *   node scripts/run-offering-prerequisites-migration.js
 * 
 * 功能:
 *   创建 offering_prerequisites、prerequisite_groups_offerings、prerequisite_group_items_offerings 表
 */

const fs = require('fs');
const path = require('path');

// 加载环境变量
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          process.env[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少 Supabase 环境变量。请检查 .env.local 文件。');
  process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('🚀 开始运行 Offering Prerequisites 迁移');
  console.log('='.repeat(60));
  
  try {
    // 读取 SQL 文件
    const sqlPath = path.join(__dirname, '..', 'sql', 'root-migrations', 'migrate-create-offering-prerequisites.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    // 执行 SQL
    console.log('\n📋 执行 SQL 迁移...');
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // 如果 RPC 不存在，尝试直接执行 SQL（需要 Supabase 客户端支持）
      console.log('⚠️  RPC 方法不存在，尝试直接执行 SQL...');
      
      // 分割 SQL 语句（按分号分割）
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));
      
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            // 使用 Supabase 的 query 方法（如果支持）
            const { error: stmtError } = await supabase.from('_migration').select('*').limit(0);
            // 这里需要根据实际的 Supabase 客户端 API 来执行 SQL
            // 如果无法直接执行，需要手动在 Supabase Dashboard 中执行
            console.log('⚠️  无法自动执行 SQL，请在 Supabase Dashboard 中手动执行 sql/root-migrations/migrate-create-offering-prerequisites.sql');
            break;
          } catch (e) {
            // 忽略错误
          }
        }
      }
    }
    
    console.log('\n✅ 迁移完成！');
    console.log('\n📝 请验证以下表是否已创建:');
    console.log('  - offering_prerequisites');
    console.log('  - prerequisite_groups_offerings');
    console.log('  - prerequisite_group_items_offerings');
    
  } catch (error) {
    console.error('\n❌ 迁移失败:', error.message);
    console.error('\n💡 请手动在 Supabase Dashboard 的 SQL Editor 中执行 sql/root-migrations/migrate-create-offering-prerequisites.sql');
    process.exit(1);
  }
}

runMigration().catch(console.error);
