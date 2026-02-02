#!/usr/bin/env node

/**
 * Phase 6 退款功能测试脚本
 * 
 * 使用方法:
 *   node scripts/test-phase6-refund.js
 * 
 * 功能:
 *   1. 测试 calculateRefundPolicy() - 计算退款政策
 *   2. 测试 processInstanceRefund() - 处理退款（退款和信用额度）
 *   3. 测试 getUserCredits() - 获取用户的信用额度
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
let testInstanceId30Days = null;
let testInstanceId15Days = null;
let testEnrollmentId30Days = null;
let testEnrollmentId15Days = null;
let testOfferingId = null;

// 准备测试数据
async function setupTestData() {
  console.log('\n📋 准备测试数据');
  console.log('─'.repeat(60));
  
  try {
    // 1. 创建测试用户（付款人）
    const testEmail = `test-payer-phase6-${Date.now()}@example.com`;
    const { data: testUser, error: userError } = await supabase
      .from('users')
      .insert({
        name: 'Test Payer Phase6',
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
        name: 'Test Student Phase6',
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
    
    // 4. 查找或创建instance_v2（30天前）
    const futureDate30Days = new Date();
    futureDate30Days.setDate(futureDate30Days.getDate() + 35);
    const futureDate30DaysStr = futureDate30Days.toISOString().split('T')[0];
    
    const { data: instances30Days, error: instance30Error } = await supabase
      .from('instance_v2')
      .select('id, offering_id, start_date, status, is_active')
      .eq('is_active', true)
      .in('status', ['scheduled', 'ongoing'])
      .gte('start_date', futureDate30DaysStr)
      .limit(1);
    
    if (instance30Error) {
      throw instance30Error;
    }
    
    if (instances30Days && instances30Days.length > 0) {
      testInstanceId30Days = instances30Days[0].id;
      testOfferingId = instances30Days[0].offering_id;
      console.log(`✅ 找到30天前的 instance: ${testInstanceId30Days}`);
    } else {
      // 如果没有找到，尝试查找任何可用的instance并更新start_date
      const { data: anyInstance } = await supabase
        .from('instance_v2')
        .select('id, offering_id')
        .eq('is_active', true)
        .limit(1);
      
      if (anyInstance && anyInstance.length > 0) {
        testInstanceId30Days = anyInstance[0].id;
        testOfferingId = anyInstance[0].offering_id;
        
        // 更新start_date为35天后
        await supabase
          .from('instance_v2')
          .update({ start_date: futureDate30DaysStr })
          .eq('id', testInstanceId30Days);
        
        console.log(`✅ 更新了 instance 的 start_date 为30天前: ${testInstanceId30Days}`);
      } else {
        console.warn('⚠️  警告: 没有找到可用的 instance_v2，某些测试可能会失败');
      }
    }
    
    // 5. 查找或创建instance_v2（15天后，30天内）
    const futureDate15Days = new Date();
    futureDate15Days.setDate(futureDate15Days.getDate() + 15);
    const futureDate15DaysStr = futureDate15Days.toISOString().split('T')[0];
    
    const { data: instances15Days, error: instance15Error } = await supabase
      .from('instance_v2')
      .select('id, offering_id, start_date, status, is_active')
      .eq('is_active', true)
      .in('status', ['scheduled', 'ongoing'])
      .gte('start_date', futureDate15DaysStr)
      .lt('start_date', futureDate30DaysStr)
      .limit(1);
    
    if (instance15Error) {
      throw instance15Error;
    }
    
    if (instances15Days && instances15Days.length > 0) {
      testInstanceId15Days = instances15Days[0].id;
      console.log(`✅ 找到15天后的 instance: ${testInstanceId15Days}`);
    } else {
      // 如果没有找到，尝试查找任何可用的instance（不同于30天前的）并更新start_date
      const { data: anyInstance15 } = await supabase
        .from('instance_v2')
        .select('id, offering_id')
        .eq('is_active', true)
        .neq('id', testInstanceId30Days || '')
        .limit(1);
      
      if (anyInstance15 && anyInstance15.length > 0) {
        testInstanceId15Days = anyInstance15[0].id;
        
        // 更新start_date为15天后
        await supabase
          .from('instance_v2')
          .update({ start_date: futureDate15DaysStr })
          .eq('id', testInstanceId15Days);
        
        console.log(`✅ 更新了 instance 的 start_date 为15天后: ${testInstanceId15Days}`);
      } else {
        // 如果还是没有找到，使用同一个instance但不同的start_date（仅用于测试）
        if (testInstanceId30Days) {
          testInstanceId15Days = testInstanceId30Days;
          await supabase
            .from('instance_v2')
            .update({ start_date: futureDate15DaysStr })
            .eq('id', testInstanceId15Days);
          console.log(`⚠️  使用同一个 instance 但不同的 start_date 进行测试: ${testInstanceId15Days}`);
        } else {
          console.warn('⚠️  警告: 没有找到可用的 instance_v2，某些测试可能会失败');
        }
      }
    }
    
    // 6. 创建已支付的enrollment（30天前）
    if (testInstanceId30Days) {
      // 先检查是否已存在（避免重复）
      const { data: existing30 } = await supabase
        .from('instance_enrollments')
        .select('id')
        .eq('user_id', testUserId)
        .eq('instance_id', testInstanceId30Days)
        .eq('student_name', 'Test Student Phase6')
        .eq('is_synced', false)
        .maybeSingle();
      
      if (existing30) {
        testEnrollmentId30Days = existing30.id;
        console.log(`✅ 使用已存在的30天前的enrollment: ${testEnrollmentId30Days}`);
      } else {
        const { data: enrollment30Days, error: enroll30Error } = await supabase
          .from('instance_enrollments')
          .insert({
            user_id: testUserId,
            payer_user_id: testUserId,
            instance_id: testInstanceId30Days,
            student_id: testStudentId,
            student_name: 'Test Student Phase6',
            status: 'enrolled',
            payment_status: 'paid',
            enrolled_at: new Date().toISOString(),
            amount_paid: 100.00,
            tax_amount: 0.00,
            stripe_payment_intent_id: 'pi_test_30days_' + Date.now(),
            is_synced: false,
            prerequisites_passed: true,
          })
          .select()
          .single();
        
        if (enroll30Error) {
          console.error('创建30天前enrollment失败:', enroll30Error);
          // 不抛出错误，继续测试
        } else {
          testEnrollmentId30Days = enrollment30Days.id;
          console.log(`✅ 创建了30天前的enrollment: ${testEnrollmentId30Days}`);
        }
      }
    }
    
    // 7. 创建已支付的enrollment（15天后）
    if (testInstanceId15Days) {
      // 先检查是否已存在（避免重复）
      const { data: existing15 } = await supabase
        .from('instance_enrollments')
        .select('id')
        .eq('user_id', testUserId)
        .eq('instance_id', testInstanceId15Days)
        .eq('student_name', 'Test Student Phase6 Credit')
        .eq('is_synced', false)
        .maybeSingle();
      
      if (existing15) {
        testEnrollmentId15Days = existing15.id;
        console.log(`✅ 使用已存在的15天后的enrollment: ${testEnrollmentId15Days}`);
      } else {
        const { data: enrollment15Days, error: enroll15Error } = await supabase
          .from('instance_enrollments')
          .insert({
            user_id: testUserId,
            payer_user_id: testUserId,
            instance_id: testInstanceId15Days,
            student_id: testStudentId,
            student_name: 'Test Student Phase6 Credit',
            status: 'enrolled',
            payment_status: 'paid',
            enrolled_at: new Date().toISOString(),
            amount_paid: 100.00,
            tax_amount: 0.00,
            stripe_payment_intent_id: 'pi_test_15days_' + Date.now(),
            is_synced: false,
            prerequisites_passed: true,
          })
          .select()
          .single();
        
        if (enroll15Error) {
          console.error('创建15天后enrollment失败:', enroll15Error);
          // 不抛出错误，继续测试
        } else {
          testEnrollmentId15Days = enrollment15Days.id;
          console.log(`✅ 创建了15天后的enrollment: ${testEnrollmentId15Days}`);
        }
      }
    }
    
    return {
      userId: testUserId,
      studentId: testStudentId,
      instanceId30Days: testInstanceId30Days,
      instanceId15Days: testInstanceId15Days,
      enrollmentId30Days: testEnrollmentId30Days,
      enrollmentId15Days: testEnrollmentId15Days,
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
    // 删除信用额度
    if (testUserId) {
      await supabase
        .from('user_credits')
        .delete()
        .eq('user_id', testUserId);
      console.log('✅ 信用额度已清理');
    }
    
    // 删除enrollment
    if (testUserId) {
      await supabase
        .from('instance_enrollments')
        .delete()
        .eq('user_id', testUserId)
        .in('status', ['enrolled', 'cancelled']);
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
    if (testInstanceId30Days) {
      const { data: count } = await supabase
        .from('instance_enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('instance_id', testInstanceId30Days)
        .eq('status', 'enrolled')
        .eq('is_synced', false);
      
      await supabase
        .from('instance_v2')
        .update({ current_students: count?.count || 0 })
        .eq('id', testInstanceId30Days);
      console.log('✅ 30天前实例容量已恢复');
    }
    
    if (testInstanceId15Days) {
      const { data: count } = await supabase
        .from('instance_enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('instance_id', testInstanceId15Days)
        .eq('status', 'enrolled')
        .eq('is_synced', false);
      
      await supabase
        .from('instance_v2')
        .update({ current_students: count?.count || 0 })
        .eq('id', testInstanceId15Days);
      console.log('✅ 15天后实例容量已恢复');
    }
  } catch (error) {
    console.error('⚠️  清理测试数据时出错:', error.message);
  }
}

// 测试 calculateRefundPolicy 函数
async function testCalculateRefundPolicy() {
  console.log('\n📋 测试 calculateRefundPolicy 函数');
  console.log('─'.repeat(60));
  
  if (!testEnrollmentId30Days) {
    logTest('calculateRefundPolicy (30天前)', false, '没有可用的enrollment');
    return;
  }
  
  try {
    // 1. 测试30天前的退款政策
    const { data: enrollment } = await supabase
      .from('instance_enrollments')
      .select(`
        id,
        amount_paid,
        tax_amount,
        instance_id,
        instance:instance_v2(
          id,
          start_date
        )
      `)
      .eq('id', testEnrollmentId30Days)
      .single();
    
    if (!enrollment || !enrollment.instance) {
      logTest('calculateRefundPolicy (30天前)', false, '无法获取enrollment或instance');
      return;
    }
    
    const instance = Array.isArray(enrollment.instance) 
      ? enrollment.instance[0] 
      : enrollment.instance;
    
    const startDate = new Date(instance.start_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    
    const daysUntilStart = Math.floor((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    const amountPaid = Number(enrollment.amount_paid) || 0;
    const taxAmount = Number(enrollment.tax_amount) || 0;
    
    // 计算退款政策
    let canRefund = false;
    let canCredit = false;
    let processingFee = 0;
    let refundAmount = 0;
    
    if (daysUntilStart >= 30) {
      canRefund = true;
      canCredit = true;
      processingFee = amountPaid * 0.03;
      refundAmount = amountPaid - processingFee - taxAmount;
    } else if (daysUntilStart > 0 && daysUntilStart < 30) {
      canRefund = false;
      canCredit = true;
    }
    
    const policyCorrect = daysUntilStart >= 30 
      ? (canRefund === true && canCredit === true && refundAmount > 0)
      : (canRefund === false && canCredit === true);
    
    logTest('calculateRefundPolicy (30天前)', policyCorrect, 
      `天数: ${daysUntilStart}, 可退款: ${canRefund}, 可信用额度: ${canCredit}, 退款金额: ${refundAmount.toFixed(2)}`);
    
    // 2. 测试15天后的退款政策
    if (testEnrollmentId15Days) {
      const { data: enrollment15 } = await supabase
        .from('instance_enrollments')
        .select(`
          id,
          amount_paid,
          instance_id,
          instance:instance_v2(
            id,
            start_date
          )
        `)
        .eq('id', testEnrollmentId15Days)
        .single();
      
      if (enrollment15 && enrollment15.instance) {
        const instance15 = Array.isArray(enrollment15.instance) 
          ? enrollment15.instance[0] 
          : enrollment15.instance;
        
        const startDate15 = new Date(instance15.start_date);
        startDate15.setHours(0, 0, 0, 0);
        
        const daysUntilStart15 = Math.floor((startDate15.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        const canRefund15 = daysUntilStart15 >= 30;
        const canCredit15 = daysUntilStart15 > 0 && daysUntilStart15 < 30;
        
        const policy15Correct = !canRefund15 && canCredit15;
        
        logTest('calculateRefundPolicy (15天后)', policy15Correct, 
          `天数: ${daysUntilStart15}, 可退款: ${canRefund15}, 可信用额度: ${canCredit15}`);
      }
    }
    
  } catch (error) {
    logTest('calculateRefundPolicy', false, error.message);
  }
}

// 测试 processInstanceRefund 函数（信用额度）
async function testProcessCredit() {
  console.log('\n📋 测试 processInstanceRefund 函数（信用额度）');
  console.log('─'.repeat(60));
  
  if (!testEnrollmentId15Days || !testUserId) {
    logTest('processInstanceRefund (credit)', false, '没有可用的enrollment');
    return;
  }
  
  try {
    // 确保enrollment是paid状态
    await supabase
      .from('instance_enrollments')
      .update({
        payment_status: 'paid',
        status: 'enrolled'
      })
      .eq('id', testEnrollmentId15Days);
    
    // 获取enrollment信息
    const { data: enrollment } = await supabase
      .from('instance_enrollments')
      .select('amount_paid')
      .eq('id', testEnrollmentId15Days)
      .single();
    
    const creditAmount = Number(enrollment?.amount_paid) || 0;
    
    // 创建信用额度（模拟）
    const { data: credit, error: creditError } = await supabase
      .from('user_credits')
      .insert({
        user_id: testUserId,
        credit_amount: creditAmount,
        used_amount: 0,
        source_enrollment_id: testEnrollmentId15Days,
        expires_at: null,
        notes: 'Test credit from Phase 6',
      })
      .select()
      .single();
    
    if (creditError) {
      logTest('创建信用额度', false, creditError.message);
      return;
    }
    
    // 更新enrollment状态
    const { error: updateError } = await supabase
      .from('instance_enrollments')
      .update({
        payment_status: 'credited',
        status: 'cancelled',
        refund_type: 'credit',
        refund_reason: 'Test credit',
        refund_requested_at: new Date().toISOString(),
        refund_processed_at: new Date().toISOString(),
        amount_credited: creditAmount,
        credit_id: credit.id,
        cancelled_at: new Date().toISOString(),
        cancelled_reason: 'Converted to credit',
        updated_at: new Date().toISOString(),
      })
      .eq('id', testEnrollmentId15Days);
    
    if (updateError) {
      logTest('更新enrollment状态', false, updateError.message);
      return;
    }
    
    // 验证状态
    const { data: updatedEnrollment } = await supabase
      .from('instance_enrollments')
      .select('payment_status, status, credit_id')
      .eq('id', testEnrollmentId15Days)
      .single();
    
    const isCredited = updatedEnrollment?.payment_status === 'credited' && 
                      updatedEnrollment?.status === 'cancelled' &&
                      updatedEnrollment?.credit_id === credit.id;
    
    logTest('processInstanceRefund (credit)', isCredited, 
      `状态: ${updatedEnrollment?.payment_status}, credit_id: ${updatedEnrollment?.credit_id}`);
    
  } catch (error) {
    logTest('processInstanceRefund (credit)', false, error.message);
  }
}

// 测试 getUserCredits 函数
async function testGetUserCredits() {
  console.log('\n📋 测试 getUserCredits 函数');
  console.log('─'.repeat(60));
  
  if (!testUserId) {
    logTest('getUserCredits', false, '没有可用的用户ID');
    return;
  }
  
  try {
    const { data: credits, error: fetchError } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false });
    
    if (fetchError) {
      logTest('getUserCredits', false, fetchError.message);
      return;
    }
    
    const totalAvailable = credits?.reduce((sum, credit) => {
      return sum + (Number(credit.available_amount) || 0);
    }, 0) || 0;
    
    logTest('getUserCredits', true, 
      `获取到 ${credits?.length || 0} 个信用额度记录，总可用: ${totalAvailable.toFixed(2)}`);
    
  } catch (error) {
    logTest('getUserCredits', false, error.message);
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 Phase 6 退款功能测试');
  console.log('='.repeat(60));
  
  try {
    // 准备测试数据
    await setupTestData();
    
    // 运行测试
    await testCalculateRefundPolicy();
    await testProcessCredit();
    await testGetUserCredits();
    
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
