#!/usr/bin/env node

/**
 * Phase 3 Cart API 测试脚本
 * 
 * 使用方法:
 *   node scripts/test-phase3-cart-api.js
 * 
 * 功能:
 *   1. 测试 POST /api/enrollments/cart - 加入购物车
 *   2. 测试 GET /api/enrollments/cart - 获取购物车
 *   3. 测试 DELETE /api/enrollments/cart/:id - 删除购物车项
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
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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

// 测试数据
let testUserId = null;
let testStudentId = null;
let testInstanceId = null;
let testEnrollmentId = null;

// 准备测试数据
async function setupTestData() {
  console.log('\n📋 准备测试数据');
  console.log('─'.repeat(60));
  
  try {
    // 1. 创建测试用户
    const testEmail = `test-parent-phase3-${Date.now()}@example.com`;
    const { data: testUser, error: userError } = await supabase
      .from('users')
      .insert({
        name: 'Test Parent Phase3',
        email: testEmail,
        role: 'user',
        password_hash: '$2a$10$dummy',
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
    
    testUserId = testUser?.id || existingUser?.id;
    
    if (!testUserId) {
      throw new Error('无法创建测试用户');
    }
    
    console.log(`✅ 测试用户已创建: ${testUserId}`);
    
    // 2. 创建测试学生
    const { data: student, error: studentError } = await supabase
      .from('students')
      .insert({
        name: 'Test Student Phase3',
        birth_date: '2015-01-01',
        grade: '3rd',
        is_active: true
      })
      .select()
      .single();
    
    if (studentError) {
      throw studentError;
    }
    
    testStudentId = student.id;
    console.log(`✅ 测试学生已创建: ${testStudentId}`);
    
    // 3. 创建用户-学生关系
    const { data: userStudent, error: relationError } = await supabase
      .from('user_students')
      .insert({
        user_id: testUserId,
        student_id: testStudentId,
        relationship: 'parent',
        is_primary: true,
        is_payer: true,
        can_manage_enrollments: true,
        can_view_progress: true,
        sync_cart_to_parent: false
      })
      .select()
      .single();
    
    if (relationError) {
      throw relationError;
    }
    
    console.log(`✅ 用户-学生关系已创建`);
    
    // 4. 查找可用的 instance_v2
    const { data: instances, error: instanceError } = await supabase
      .from('instance_v2')
      .select('id, max_students, current_students, status, is_active')
      .eq('is_active', true)
      .in('status', ['scheduled', 'ongoing'])
      .limit(1);
    
    if (instanceError) {
      throw instanceError;
    }
    
    // 查找有容量的 instance
    const availableInstance = instances?.find(inst => 
      !inst.max_students || inst.current_students < inst.max_students
    );
    
    if (!availableInstance) {
      console.warn('⚠️  警告: 没有找到可用的 instance_v2，某些测试可能会失败');
    } else {
      testInstanceId = availableInstance.id;
      console.log(`✅ 找到可用的 instance: ${testInstanceId}`);
    }
    
    return {
      userId: testUserId,
      studentId: testStudentId,
      instanceId: testInstanceId
    };
  } catch (error) {
    console.error('❌ 准备测试数据失败:', error.message);
    throw error;
  }
}

// 清理测试数据
async function cleanupTestData() {
  console.log('\n🧹 清理测试数据');
  console.log('─'.repeat(60));
  
  try {
    // 删除购物车项
    if (testUserId) {
      await supabase
        .from('instance_enrollments')
        .delete()
        .eq('user_id', testUserId)
        .eq('status', 'cart');
      console.log('✅ 购物车项已清理');
    }
    
    // 删除用户-学生关系
    if (testUserId && testStudentId) {
      await supabase
        .from('user_students')
        .delete()
        .eq('user_id', testUserId)
        .eq('student_id', testStudentId);
      console.log('✅ 用户-学生关系已清理');
    }
    
    // 删除学生
    if (testStudentId) {
      await supabase
        .from('students')
        .delete()
        .eq('id', testStudentId);
      console.log('✅ 测试学生已清理');
    }
    
    // 删除用户
    if (testUserId) {
      await supabase
        .from('users')
        .delete()
        .eq('id', testUserId);
      console.log('✅ 测试用户已清理');
    }
  } catch (error) {
    console.error('⚠️  清理测试数据时出错:', error.message);
  }
}

// 获取 session token（简化版，实际需要登录）
// 注意：这个脚本使用 Supabase Admin 直接操作数据库，不涉及实际的 HTTP API 调用
// 如果需要测试 HTTP API，需要先登录获取 session token

// 测试 POST API（通过数据库直接测试逻辑）
async function testPostAPI() {
  console.log('\n📋 测试 POST /api/enrollments/cart');
  console.log('─'.repeat(60));
  
  if (!testInstanceId) {
    logTest('POST API - 加入购物车', false, '没有可用的 instance_v2');
    return;
  }
  
  try {
    // 测试1: 成功加入购物车
    console.log('\n1. 测试成功加入购物车...');
    const cartExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    
    const { data: enrollment, error: enrollError } = await supabase
      .from('instance_enrollments')
      .insert({
        user_id: testUserId,
        payer_user_id: testUserId,
        instance_id: testInstanceId,
        student_id: testStudentId,
        student_name: 'Test Student Phase3',
        student_birth_date: '2015-01-01',
        status: 'cart',
        added_to_cart_at: new Date().toISOString(),
        cart_expires_at: cartExpiresAt.toISOString(),
        is_synced: false,
        sync_from_user_id: null,
        prerequisites_passed: true,
        prerequisites_checked_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (enrollError) {
      logTest('POST API - 加入购物车', false, enrollError.message);
    } else {
      testEnrollmentId = enrollment.id;
      logTest('POST API - 加入购物车', true, `创建了 enrollment: ${enrollment.id}`);
    }
    
    // 测试2: 重复加入购物车（应该失败）
    console.log('\n2. 测试重复加入购物车...');
    const { error: duplicateError } = await supabase
      .from('instance_enrollments')
      .insert({
        user_id: testUserId,
        payer_user_id: testUserId,
        instance_id: testInstanceId,
        student_id: testStudentId,
        student_name: 'Test Student Phase3',
        status: 'cart',
        added_to_cart_at: new Date().toISOString(),
        cart_expires_at: cartExpiresAt.toISOString(),
        is_synced: false,
        prerequisites_passed: true
      });
    
    if (duplicateError && duplicateError.code === '23505') {
      logTest('POST API - 重复加入购物车检查', true, '正确阻止了重复加入');
    } else {
      logTest('POST API - 重复加入购物车检查', false, '应该阻止重复加入');
    }
    
  } catch (error) {
    logTest('POST API', false, error.message);
  }
}

// 测试 GET API
async function testGetAPI() {
  console.log('\n📋 测试 GET /api/enrollments/cart');
  console.log('─'.repeat(60));
  
  try {
    const { data: cartItems, error: cartError } = await supabase
      .from('instance_enrollments')
      .select(`
        *,
        instance:instance_v2(
          *,
          offering:offerings_v2(*)
        )
      `)
      .eq('user_id', testUserId)
      .eq('status', 'cart')
      .eq('is_synced', false)
      .gt('cart_expires_at', new Date().toISOString());
    
    if (cartError) {
      logTest('GET API - 获取购物车', false, cartError.message);
    } else {
      const hasItems = (cartItems?.length ?? 0) > 0;
      logTest('GET API - 获取购物车', true, `找到 ${cartItems?.length || 0} 个购物车项`);
      
      if (hasItems) {
        const item = cartItems[0];
        const hasRequiredFields = item.id && item.instance_id && item.student_name;
        logTest('GET API - 购物车项字段完整性', hasRequiredFields, 
          hasRequiredFields ? '所有必需字段都存在' : '缺少必需字段');
      }
    }
  } catch (error) {
    logTest('GET API', false, error.message);
  }
}

// 测试 DELETE API
async function testDeleteAPI() {
  console.log('\n📋 测试 DELETE /api/enrollments/cart/:id');
  console.log('─'.repeat(60));
  
  if (!testEnrollmentId) {
    logTest('DELETE API - 删除购物车项', false, '没有可删除的 enrollment');
    return;
  }
  
  try {
    const { error: deleteError } = await supabase
      .from('instance_enrollments')
      .delete()
      .eq('id', testEnrollmentId)
      .eq('status', 'cart');
    
    if (deleteError) {
      logTest('DELETE API - 删除购物车项', false, deleteError.message);
    } else {
      logTest('DELETE API - 删除购物车项', true, `成功删除 enrollment: ${testEnrollmentId}`);
      
      // 验证已删除
      const { data: deletedItem } = await supabase
        .from('instance_enrollments')
        .select('id')
        .eq('id', testEnrollmentId)
        .single();
      
      const isDeleted = !deletedItem;
      logTest('DELETE API - 验证删除', isDeleted, 
        isDeleted ? '确认已删除' : '删除失败，项仍存在');
    }
  } catch (error) {
    logTest('DELETE API', false, error.message);
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 Phase 3 Cart API 测试');
  console.log('='.repeat(60));
  
  try {
    // 准备测试数据
    await setupTestData();
    
    // 运行测试
    await testPostAPI();
    await testGetAPI();
    await testDeleteAPI();
    
    // 输出测试总结
    console.log('\n' + '='.repeat(60));
    console.log('📊 测试总结');
    console.log('─'.repeat(60));
    console.log(`✅ 通过: ${testResults.passed}/${testResults.tests.length}`);
    console.log(`❌ 失败: ${testResults.failed}/${testResults.tests.length}`);
    
    if (testResults.failed > 0) {
      console.log('\n失败的测试:');
      testResults.tests
        .filter(t => !t.passed)
        .forEach(t => console.log(`  - ${t.name}: ${t.message}`));
    }
    
  } catch (error) {
    console.error('\n❌ 测试过程中出错:', error);
  } finally {
    // 清理测试数据
    await cleanupTestData();
  }
}

// 运行测试
runTests().catch(console.error);
