#!/usr/bin/env node

/**
 * 创建测试学生数据脚本
 * 
 * 使用方法:
 *   node scripts/create-test-students.js <user_email>
 * 
 * 功能:
 *   为指定用户创建测试学生数据
 */

const fs = require('fs');
const path = require('path');

// 加载环境变量
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        // 移除引号
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
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

async function createTestStudents(userEmail) {
  console.log('🚀 创建测试学生数据');
  console.log('='.repeat(60));
  console.log(`用户邮箱: ${userEmail}`);
  
  // 1. 查找用户
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('email', userEmail)
    .single();
  
  if (userError || !user) {
    console.error(`❌ 用户不存在: ${userEmail}`);
    console.error('请先创建用户或使用正确的邮箱地址');
    process.exit(1);
  }
  
  console.log(`✅ 找到用户: ${user.name} (${user.id})`);
  
  // 2. 创建测试学生
  const students = [
    {
      name: 'Alice Test',
      birth_date: '2015-03-15',
      grade: '3rd',
      school: 'Test Elementary School',
      emergency_contact_name: 'Parent Test',
      emergency_contact_phone: '555-0101',
      notes: 'Test student 1'
    },
    {
      name: 'Bob Test',
      birth_date: '2016-07-20',
      grade: '2nd',
      school: 'Test Elementary School',
      emergency_contact_name: 'Parent Test',
      emergency_contact_phone: '555-0102',
      notes: 'Test student 2'
    }
  ];
  
  const createdStudents = [];
  
  for (const studentData of students) {
    try {
      // 创建学生记录
      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert({
          name: studentData.name,
          birth_date: studentData.birth_date,
          grade: studentData.grade,
          school: studentData.school,
          emergency_contact_name: studentData.emergency_contact_name,
          emergency_contact_phone: studentData.emergency_contact_phone,
          notes: studentData.notes,
          is_active: true
        })
        .select()
        .single();
      
      if (studentError) {
        console.error(`❌ 创建学生失败 (${studentData.name}):`, studentError.message);
        continue;
      }
      
      console.log(`✅ 创建学生: ${student.name} (${student.id})`);
      
      // 创建用户-学生关系
      const isPrimary = createdStudents.length === 0; // 第一个学生设为primary
      const { data: userStudent, error: relationError } = await supabase
        .from('user_students')
        .insert({
          user_id: user.id,
          student_id: student.id,
          relationship: 'parent',
          is_primary: isPrimary,
          is_payer: true,
          can_manage_enrollments: true,
          can_view_progress: true,
          sync_cart_to_parent: false
        })
        .select()
        .single();
      
      if (relationError) {
        console.error(`❌ 创建用户-学生关系失败 (${studentData.name}):`, relationError.message);
        // 删除已创建的学生
        await supabase.from('students').delete().eq('id', student.id);
        continue;
      }
      
      console.log(`✅ 创建用户-学生关系: ${userStudent.relationship} (is_primary: ${isPrimary}, is_payer: true)`);
      
      createdStudents.push({
        student,
        userStudent
      });
      
    } catch (error) {
      console.error(`❌ 处理学生 ${studentData.name} 时出错:`, error.message);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 创建结果');
  console.log('─'.repeat(60));
  console.log(`✅ 成功创建: ${createdStudents.length} 个学生`);
  
  if (createdStudents.length > 0) {
    console.log('\n创建的学生:');
    createdStudents.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.student.name} (ID: ${item.student.id})`);
      console.log(`     - 关系: ${item.userStudent.relationship}`);
      console.log(`     - 主要: ${item.userStudent.is_primary ? '是' : '否'}`);
      console.log(`     - 付款人: ${item.userStudent.is_payer ? '是' : '否'}`);
    });
  }
  
  console.log('\n💡 提示:');
  console.log('现在可以使用以下方式测试:');
  console.log(`  1. 登录系统 (使用邮箱: ${userEmail})`);
  console.log('  2. 访问 http://localhost:3000/api/students');
  console.log('  3. 应该能看到创建的学生列表');
  
  return createdStudents;
}

// 主函数
async function main() {
  const userEmail = process.argv[2];
  
  if (!userEmail) {
    console.error('❌ 请提供用户邮箱');
    console.log('\n使用方法:');
    console.log('  node scripts/create-test-students.js <user_email>');
    console.log('\n示例:');
    console.log('  node scripts/create-test-students.js test@example.com');
    process.exit(1);
  }
  
  try {
    await createTestStudents(userEmail);
  } catch (error) {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  }
}

main();
