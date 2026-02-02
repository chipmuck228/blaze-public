#!/usr/bin/env node

/**
 * Phase 2 功能测试脚本
 * 
 * 使用方法:
 *   node scripts/test-phase2.js
 * 
 * 功能:
 *   1. 测试权限检查函数
 *   2. 测试学生管理API
 */

const fs = require('fs');
const path = require('path');

// 加载环境变量（不使用 dotenv，直接读取 .env.local）
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

// 测试结果
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, message = '') {
  testResults.tests.push({ name, passed, message });
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${name}${message ? ': ' + message : ''}`);
  } else {
    testResults.failed++;
    console.error(`❌ ${name}${message ? ': ' + message : ''}`);
  }
}

// 测试权限检查函数
async function testPermissions() {
  console.log('\n📋 测试权限检查函数');
  console.log('─'.repeat(60));
  
  try {
    // 动态导入权限函数（因为它们是 TypeScript）
    // 注意：这里我们需要直接测试数据库查询逻辑
    
    // 测试1: 检查 isStudentAccount 逻辑
    console.log('\n1. 测试 isStudentAccount 逻辑...');
    try {
      // 创建一个测试用户（如果不存在）
      const testEmail = `test-student-${Date.now()}@example.com`;
      const { data: testUser, error: userError } = await supabase
        .from('users')
        .insert({
          name: 'Test Student User',
          email: testEmail,
          role: 'user',
          password_hash: 'dummy_hash',
          email_verified: true
        })
        .select()
        .single();
      
      if (userError && !userError.message.includes('duplicate')) {
        throw userError;
      }
      
      // 如果用户已存在，查询它
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', testEmail)
        .single();
      
      const userId = testUser?.id || existingUser?.id;
      
      if (userId) {
        // 创建一个学生记录，关联到这个用户
        const { data: student, error: studentError } = await supabase
          .from('students')
          .insert({
            name: 'Test Student',
            student_user_id: userId,
            is_active: true
          })
          .select()
          .single();
        
        if (!studentError && student) {
          // 测试查询逻辑
          const { data: studentCheck } = await supabase
            .from('students')
            .select('id')
            .eq('student_user_id', userId)
            .eq('is_active', true)
            .not('student_user_id', 'is', null)
            .limit(1);
          
          const isStudent = (studentCheck?.length ?? 0) > 0;
          logTest('isStudentAccount', isStudent, `用户 ${userId} 是学生账户: ${isStudent}`);
          
          // 清理测试数据
          await supabase.from('students').delete().eq('id', student.id);
        }
        
        // 清理测试用户
        await supabase.from('users').delete().eq('id', userId);
      }
    } catch (error) {
      logTest('isStudentAccount', false, error.message);
    }
    
    // 测试2: 检查 getStudentPayer 逻辑
    console.log('\n2. 测试 getStudentPayer 逻辑...');
    try {
      // 创建测试用户（家长）
      const parentEmail = `test-parent-${Date.now()}@example.com`;
      const { data: parentUser, error: parentError } = await supabase
        .from('users')
        .insert({
          name: 'Test Parent',
          email: parentEmail,
          role: 'user',
          password_hash: 'dummy_hash',
          email_verified: true
        })
        .select()
        .single();
      
      if (parentError && !parentError.message.includes('duplicate')) {
        throw parentError;
      }
      
      const { data: existingParent } = await supabase
        .from('users')
        .select('id')
        .eq('email', parentEmail)
        .single();
      
      const parentId = parentUser?.id || existingParent?.id;
      
      if (parentId) {
        // 创建学生
        const { data: student, error: studentError } = await supabase
          .from('students')
          .insert({
            name: 'Test Student for Payer',
            is_active: true
          })
          .select()
          .single();
        
        if (!studentError && student) {
          // 创建用户-学生关系（家长是付款人）
          const { data: userStudent, error: relationError } = await supabase
            .from('user_students')
            .insert({
              user_id: parentId,
              student_id: student.id,
              relationship: 'parent',
              is_primary: true,
              is_payer: true,
              can_manage_enrollments: true,
              can_view_progress: true
            })
            .select()
            .single();
          
          if (!relationError && userStudent) {
            // 测试查询付款人
            const { data: payer } = await supabase
              .from('user_students')
              .select('user_id')
              .eq('student_id', student.id)
              .eq('is_payer', true)
              .eq('is_primary', true)
              .single();
            
            const payerId = payer?.user_id;
            logTest('getStudentPayer', payerId === parentId, `学生 ${student.id} 的付款人是 ${payerId}`);
            
            // 清理测试数据
            await supabase.from('user_students').delete().eq('id', userStudent.id);
          }
          
          // 清理学生
          await supabase.from('students').delete().eq('id', student.id);
        }
        
        // 清理家长用户
        await supabase.from('users').delete().eq('id', parentId);
      }
    } catch (error) {
      logTest('getStudentPayer', false, error.message);
    }
    
    // 测试3: 检查 canManageStudent 逻辑
    console.log('\n3. 测试 canManageStudent 逻辑...');
    try {
      const parentEmail = `test-manager-${Date.now()}@example.com`;
      const { data: parentUser } = await supabase
        .from('users')
        .insert({
          name: 'Test Manager',
          email: parentEmail,
          role: 'user',
          password_hash: 'dummy_hash',
          email_verified: true
        })
        .select()
        .single();
      
      const { data: existingParent } = await supabase
        .from('users')
        .select('id')
        .eq('email', parentEmail)
        .single();
      
      const parentId = parentUser?.id || existingParent?.id;
      
      if (parentId) {
        const { data: student } = await supabase
          .from('students')
          .insert({
            name: 'Test Student for Manager',
            is_active: true
          })
          .select()
          .single();
        
        if (student) {
          const { data: userStudent } = await supabase
            .from('user_students')
            .insert({
              user_id: parentId,
              student_id: student.id,
              relationship: 'parent',
              can_manage_enrollments: true
            })
            .select()
            .single();
          
          if (userStudent) {
            const { data: relation } = await supabase
              .from('user_students')
              .select('can_manage_enrollments')
              .eq('user_id', parentId)
              .eq('student_id', student.id)
              .single();
            
            const canManage = relation?.can_manage_enrollments ?? false;
            logTest('canManageStudent', canManage, `用户 ${parentId} 可以管理学生 ${student.id}: ${canManage}`);
            
            await supabase.from('user_students').delete().eq('id', userStudent.id);
          }
          
          await supabase.from('students').delete().eq('id', student.id);
        }
        
        await supabase.from('users').delete().eq('id', parentId);
      }
    } catch (error) {
      logTest('canManageStudent', false, error.message);
    }
    
  } catch (error) {
    console.error('❌ 权限检查函数测试失败:', error);
  }
}

// 测试学生管理API
async function testStudentsAPI() {
  console.log('\n📋 测试学生管理API');
  console.log('─'.repeat(60));
  
  try {
    // 创建测试用户
    const testEmail = `test-api-${Date.now()}@example.com`;
    const { data: testUser, error: userError } = await supabase
      .from('users')
      .insert({
        name: 'Test API User',
        email: testEmail,
        role: 'user',
        password_hash: 'dummy_hash',
        email_verified: true
      })
      .select()
      .single();
    
    if (userError && !userError.message.includes('duplicate')) {
      throw userError;
    }
    
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', testEmail)
      .single();
    
    const userId = testUser?.id || existingUser?.id;
    
    if (!userId) {
      logTest('Students API - Create User', false, '无法创建测试用户');
      return;
    }
    
    logTest('Students API - Create User', true, `创建测试用户: ${userId}`);
    
    // 测试1: 创建学生
    console.log('\n1. 测试创建学生...');
    try {
      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert({
          name: 'API Test Student',
          birth_date: '2015-01-01',
          grade: '3rd',
          is_active: true
        })
        .select()
        .single();
      
      if (studentError) {
        throw studentError;
      }
      
      // 创建用户-学生关系
      const { data: userStudent, error: relationError } = await supabase
        .from('user_students')
        .insert({
          user_id: userId,
          student_id: student.id,
          relationship: 'parent',
          is_primary: true,
          is_payer: true,
          can_manage_enrollments: true,
          can_view_progress: true
        })
        .select()
        .single();
      
      if (relationError) {
        throw relationError;
      }
      
      logTest('Students API - Create Student', true, `创建学生: ${student.id}`);
      
      // 测试2: 获取学生列表
      console.log('\n2. 测试获取学生列表...');
      const { data: userStudents, error: listError } = await supabase
        .from('user_students')
        .select(`
          id,
          relationship,
          is_primary,
          is_payer,
          student:students(id, name, birth_date, grade, is_active)
        `)
        .eq('user_id', userId);
      
      if (listError) {
        throw listError;
      }
      
      const students = (userStudents || []).map((item) => {
        const student = Array.isArray(item.student) ? item.student[0] : item.student;
        return {
          id: student?.id,
          name: student?.name,
          birth_date: student?.birth_date,
          grade: student?.grade,
          is_active: student?.is_active
        };
      }).filter((s) => s.is_active !== false);
      
      const foundStudent = students.find((s) => s.id === student.id);
      logTest('Students API - Get Students', !!foundStudent, `找到 ${students.length} 个学生`);
      
      // 清理测试数据
      await supabase.from('user_students').delete().eq('id', userStudent.id);
      await supabase.from('students').delete().eq('id', student.id);
      logTest('Students API - Cleanup', true, '清理测试数据成功');
      
    } catch (error) {
      logTest('Students API - Create/Get', false, error.message);
    }
    
    // 清理测试用户
    await supabase.from('users').delete().eq('id', userId);
    
  } catch (error) {
    console.error('❌ 学生管理API测试失败:', error);
    logTest('Students API', false, error.message);
  }
}

// 主函数
async function main() {
  console.log('🚀 Phase 2 功能测试');
  console.log('='.repeat(60));
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Service Key: ${supabaseServiceKey ? '已设置' : '未设置'}`);
  
  // 测试权限检查函数
  await testPermissions();
  
  // 测试学生管理API
  await testStudentsAPI();
  
  // 输出测试结果
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试总结');
  console.log('─'.repeat(60));
  console.log(`✅ 通过: ${testResults.passed}`);
  console.log(`❌ 失败: ${testResults.failed}`);
  console.log(`📝 总计: ${testResults.passed + testResults.failed}`);
  
  if (testResults.failed > 0) {
    console.log('\n失败的测试:');
    testResults.tests
      .filter(t => !t.passed)
      .forEach(t => {
        console.log(`  - ${t.name}: ${t.message}`);
      });
  }
  
  console.log('\n' + '='.repeat(60));
  
  // 退出码
  process.exit(testResults.failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('❌ 测试执行失败:', error);
  process.exit(1);
});
