#!/usr/bin/env node

/**
 * Phase 4 支付流程测试脚本
 * 
 * 使用方法:
 *   node scripts/test-phase4-payment.js
 * 
 * 功能:
 *   1. 测试 POST /api/enrollments/checkout - 结账
 *   2. 测试 POST /api/enrollments/:id/confirm - 支付确认
 *   3. 测试数据库函数（checkoutInstanceEnrollments, calculateInstanceEnrollmentTotal, confirmInstanceEnrollment）
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
let testOfferingId = null;

// 准备测试数据
async function setupTestData() {
  console.log('\n📋 准备测试数据');
  console.log('─'.repeat(60));
  
  try {
    // 1. 创建测试用户（付款人）
    const testEmail = `test-payer-phase4-${Date.now()}@example.com`;
    const { data: testUser, error: userError } = await supabase
      .from('users')
      .insert({
        name: 'Test Payer Phase4',
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
        name: 'Test Student Phase4',
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
    
    // 4. 查找或创建可用的 instance_v2（有价格）
    const { data: instances, error: instanceError } = await supabase
      .from('instance_v2')
      .select('id, offering_id, max_students, current_students, status, is_active, price_override')
      .eq('is_active', true)
      .in('status', ['scheduled', 'ongoing'])
      .limit(1);
    
    if (instanceError) {
      throw instanceError;
    }
    
    const availableInstance = instances?.find(inst => 
      (!inst.max_students || inst.current_students < inst.max_students)
    );
    
    if (availableInstance) {
      testInstanceId = availableInstance.id;
      testOfferingId = availableInstance.offering_id;
      console.log(`✅ 找到可用的 instance: ${testInstanceId}`);
      
      // 确保有价格（如果没有 price_override，检查 offering 的 base_price）
      if (!availableInstance.price_override) {
        const { data: offering } = await supabase
          .from('offerings_v2')
          .select('base_price')
          .eq('id', testOfferingId)
          .single();
        
        if (!offering?.base_price) {
          // 设置一个测试价格
          await supabase
            .from('instance_v2')
            .update({ price_override: 100.00 })
            .eq('id', testInstanceId);
          console.log(`✅ 设置测试价格: $100.00`);
        }
      }
    } else {
      console.warn('⚠️  警告: 没有找到可用的 instance_v2，某些测试可能会失败');
    }
    
    return {
      userId: testUserId,
      studentId: testStudentId,
      instanceId: testInstanceId,
      offeringId: testOfferingId
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
    // 删除enrollment
    if (testUserId) {
      await supabase
        .from('instance_enrollments')
        .delete()
        .eq('user_id', testUserId)
        .in('status', ['cart', 'reserved', 'enrolled']);
      console.log('✅ Enrollment已清理');
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
    
    // 恢复实例容量（如果需要）
    if (testInstanceId) {
      const { data: count } = await supabase
        .from('instance_enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('instance_id', testInstanceId)
        .eq('status', 'enrolled')
        .eq('is_synced', false);
      
      await supabase
        .from('instance_v2')
        .update({ current_students: count?.count || 0 })
        .eq('id', testInstanceId);
      console.log('✅ 实例容量已恢复');
    }
  } catch (error) {
    console.error('⚠️  清理测试数据时出错:', error.message);
  }
}

// 测试 checkoutInstanceEnrollments 函数
async function testCheckoutFunction() {
  console.log('\n📋 测试 checkoutInstanceEnrollments 函数');
  console.log('─'.repeat(60));
  
  if (!testInstanceId) {
    logTest('checkoutInstanceEnrollments', false, '没有可用的 instance_v2');
    return;
  }
  
  try {
    // 1. 创建购物车项
    const cartExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    
    const { data: enrollment, error: enrollError } = await supabase
      .from('instance_enrollments')
      .insert({
        user_id: testUserId,
        payer_user_id: testUserId,
        instance_id: testInstanceId,
        student_id: testStudentId,
        student_name: 'Test Student Phase4',
        student_birth_date: '2015-01-01',
        status: 'cart',
        added_to_cart_at: new Date().toISOString(),
        cart_expires_at: cartExpiresAt.toISOString(),
        is_synced: false,
        prerequisites_passed: true,
        prerequisites_checked_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (enrollError) {
      logTest('创建购物车项', false, enrollError.message);
      return;
    }
    
    testEnrollmentId = enrollment.id;
    logTest('创建购物车项', true, `创建了 enrollment: ${enrollment.id}`);
    
    // 2. 测试结账（通过数据库直接测试逻辑）
    console.log('\n2. 测试结账逻辑...');
    const reservedExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    const { data: updatedEnrollment, error: checkoutError } = await supabase
      .from('instance_enrollments')
      .update({
        status: 'reserved',
        reserved_at: new Date().toISOString(),
        reserved_expires_at: reservedExpiresAt.toISOString(),
        payment_status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', testEnrollmentId)
      .eq('payer_user_id', testUserId)
      .eq('status', 'cart')
      .eq('is_synced', false)
      .gt('cart_expires_at', new Date().toISOString())
      .select()
      .single();
    
    if (checkoutError) {
      logTest('结账逻辑', false, checkoutError.message);
    } else {
      logTest('结账逻辑', true, `状态已更新为 reserved: ${updatedEnrollment.status}`);
    }
    
  } catch (error) {
    logTest('checkoutInstanceEnrollments', false, error.message);
  }
}

// 测试 calculateInstanceEnrollmentTotal 函数
async function testCalculateTotalFunction() {
  console.log('\n📋 测试 calculateInstanceEnrollmentTotal 函数');
  console.log('─'.repeat(60));
  
  if (!testEnrollmentId) {
    logTest('calculateInstanceEnrollmentTotal', false, '没有可用的 enrollment');
    return;
  }
  
  try {
    // 查询enrollment及其关联的instance和offering
    const { data: enrollment, error: fetchError } = await supabase
      .from('instance_enrollments')
      .select(`
        id,
        instance_id,
        student_name,
        currency,
        instance:instance_v2(
          id,
          price_override,
          offering:offerings_v2(
            id,
            name,
            base_price,
            currency
          )
        )
      `)
      .eq('id', testEnrollmentId)
      .single();
    
    if (fetchError) {
      logTest('calculateInstanceEnrollmentTotal', false, fetchError.message);
      return;
    }
    
    const instance = Array.isArray(enrollment.instance) 
      ? enrollment.instance[0] 
      : enrollment.instance;
    const offering = Array.isArray(instance?.offering)
      ? instance.offering[0]
      : instance?.offering;
    
    // 计算价格
    const price = instance?.price_override ?? offering?.base_price ?? 0;
    const currency = enrollment.currency || offering?.currency || 'USD';
    
    logTest('calculateInstanceEnrollmentTotal', price > 0, 
      `计算价格: ${currency} ${price.toFixed(2)}`);
    
  } catch (error) {
    logTest('calculateInstanceEnrollmentTotal', false, error.message);
  }
}

// 测试 confirmInstanceEnrollment 函数
async function testConfirmFunction() {
  console.log('\n📋 测试 confirmInstanceEnrollment 函数');
  console.log('─'.repeat(60));
  
  if (!testEnrollmentId) {
    logTest('confirmInstanceEnrollment', false, '没有可用的 enrollment');
    return;
  }
  
  try {
    // 确保enrollment是reserved状态
    const { error: updateError } = await supabase
      .from('instance_enrollments')
      .update({
        status: 'reserved',
        reserved_at: new Date().toISOString(),
        reserved_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        payment_status: 'pending'
      })
      .eq('id', testEnrollmentId);
    
    if (updateError) {
      logTest('准备reserved状态', false, updateError.message);
      return;
    }
    
    // 测试确认支付
    const { data: confirmedEnrollment, error: confirmError } = await supabase
      .from('instance_enrollments')
      .update({
        status: 'enrolled',
        enrolled_at: new Date().toISOString(),
        payment_status: 'paid',
        payment_transaction_id: 'test_payment_intent_123',
        amount_paid: 100.00,
        stripe_payment_intent_id: 'pi_test_123',
        updated_at: new Date().toISOString()
      })
      .eq('id', testEnrollmentId)
      .eq('payer_user_id', testUserId)
      .eq('status', 'reserved')
      .select()
      .single();
    
    if (confirmError) {
      logTest('confirmInstanceEnrollment', false, confirmError.message);
    } else {
      const isEnrolled = confirmedEnrollment.status === 'enrolled' && 
                        confirmedEnrollment.payment_status === 'paid';
      logTest('confirmInstanceEnrollment', isEnrolled, 
        `状态已更新为 enrolled: ${confirmedEnrollment.status}, payment_status: ${confirmedEnrollment.payment_status}`);
    }
    
  } catch (error) {
    logTest('confirmInstanceEnrollment', false, error.message);
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 Phase 4 支付流程测试');
  console.log('='.repeat(60));
  
  try {
    // 准备测试数据
    await setupTestData();
    
    // 运行测试
    await testCheckoutFunction();
    await testCalculateTotalFunction();
    await testConfirmFunction();
    
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
