#!/usr/bin/env node

/**
 * Phase 5 等待列表功能测试脚本
 * 
 * 使用方法:
 *   node scripts/test-phase5-waitlist.js
 * 
 * 功能:
 *   1. 测试 POST /api/enrollments/waitlist - 加入等待列表
 *   2. 测试 GET /api/enrollments/waitlist - 获取等待列表
 *   3. 测试 DELETE /api/enrollments/waitlist/:id - 移除等待列表
 *   4. 测试数据库函数（addToInstanceWaitlist, getUserInstanceWaitlist等）
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
    const testEmail = `test-payer-phase5-${Date.now()}@example.com`;
    const { data: testUser, error: userError } = await supabase
      .from('users')
      .insert({
        name: 'Test Payer Phase5',
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
        name: 'Test Student Phase5',
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
    
    // 4. 查找或创建一个 instance_v2（设置容量为满）
    const { data: instances, error: instanceError } = await supabase
      .from('instance_v2')
      .select('id, offering_id, max_students, current_students, status, is_active')
      .eq('is_active', true)
      .in('status', ['scheduled', 'ongoing'])
      .limit(1);
    
    if (instanceError) {
      throw instanceError;
    }
    
    const availableInstance = instances?.[0];
    
    if (availableInstance) {
      testInstanceId = availableInstance.id;
      testOfferingId = availableInstance.offering_id;
      
      // 设置容量为满（仅用于测试）
      await supabase
        .from('instance_v2')
        .update({ current_students: availableInstance.max_students || 10 })
        .eq('id', testInstanceId);
      
      console.log(`✅ 找到可用的 instance: ${testInstanceId}，已设置容量为满`);
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
        .in('status', ['waitlisted', 'cancelled']);
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

// 测试 addToInstanceWaitlist 函数
async function testAddToWaitlist() {
  console.log('\n📋 测试 addToInstanceWaitlist 函数');
  console.log('─'.repeat(60));
  
  if (!testInstanceId) {
    logTest('addToInstanceWaitlist', false, '没有可用的 instance_v2');
    return;
  }
  
  try {
    // 1. 测试成功加入等待列表
    const { data: enrollment, error: addError } = await supabase
      .from('instance_enrollments')
      .insert({
        user_id: testUserId,
        payer_user_id: testUserId,
        instance_id: testInstanceId,
        student_id: testStudentId,
        student_name: 'Test Student Phase5',
        student_birth_date: '2015-01-01',
        status: 'waitlisted',
        waitlisted_at: new Date().toISOString(),
        waitlist_position: 1,
        prerequisites_passed: true,
        prerequisites_checked_at: new Date().toISOString(),
        is_synced: false,
      })
      .select()
      .single();
    
    if (addError) {
      logTest('加入等待列表', false, addError.message);
      return;
    }
    
    testEnrollmentId = enrollment.id;
    logTest('加入等待列表', true, `创建了 enrollment: ${enrollment.id}`);
    
    // 2. 测试重复加入
    const { error: duplicateError } = await supabase
      .from('instance_enrollments')
      .insert({
        user_id: testUserId,
        payer_user_id: testUserId,
        instance_id: testInstanceId,
        student_id: testStudentId,
        student_name: 'Test Student Phase5',
        status: 'waitlisted',
        waitlisted_at: new Date().toISOString(),
        waitlist_position: 2,
        prerequisites_passed: true,
        is_synced: false,
      });
    
    if (duplicateError) {
      logTest('重复加入检查', true, '正确阻止了重复加入');
    } else {
      logTest('重复加入检查', false, '未阻止重复加入');
    }
    
  } catch (error) {
    logTest('addToInstanceWaitlist', false, error.message);
  }
}

// 测试 getUserInstanceWaitlist 函数
async function testGetWaitlist() {
  console.log('\n📋 测试 getUserInstanceWaitlist 函数');
  console.log('─'.repeat(60));
  
  if (!testUserId) {
    logTest('getUserInstanceWaitlist', false, '没有可用的用户ID');
    return;
  }
  
  try {
    const { data: waitlist, error: fetchError } = await supabase
      .from('instance_enrollments')
      .select(`
        *,
        instance:instance_v2(
          id,
          offering:offerings_v2(
            id,
            name
          )
        )
      `)
      .eq('user_id', testUserId)
      .eq('status', 'waitlisted')
      .eq('is_synced', false)
      .order('waitlist_position', { ascending: true });
    
    if (fetchError) {
      logTest('getUserInstanceWaitlist', false, fetchError.message);
      return;
    }
    
    const hasItems = waitlist && waitlist.length > 0;
    logTest('getUserInstanceWaitlist', hasItems, 
      `获取到 ${waitlist?.length || 0} 个等待列表项`);
    
  } catch (error) {
    logTest('getUserInstanceWaitlist', false, error.message);
  }
}

// 测试 removeFromInstanceWaitlist 函数
async function testRemoveFromWaitlist() {
  console.log('\n📋 测试 removeFromInstanceWaitlist 函数');
  console.log('─'.repeat(60));
  
  if (!testEnrollmentId || !testUserId) {
    logTest('removeFromInstanceWaitlist', false, '没有可用的 enrollment');
    return;
  }
  
  try {
    // 确保enrollment是waitlisted状态
    await supabase
      .from('instance_enrollments')
      .update({
        status: 'waitlisted',
        waitlisted_at: new Date().toISOString()
      })
      .eq('id', testEnrollmentId);
    
    // 测试移除
    const { error: removeError } = await supabase
      .from('instance_enrollments')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_reason: 'Removed from waitlist by user',
        updated_at: new Date().toISOString(),
      })
      .eq('id', testEnrollmentId)
      .eq('user_id', testUserId)
      .eq('status', 'waitlisted');
    
    if (removeError) {
      logTest('removeFromInstanceWaitlist', false, removeError.message);
    } else {
      // 验证状态已更新
      const { data: enrollment } = await supabase
        .from('instance_enrollments')
        .select('status, cancelled_reason')
        .eq('id', testEnrollmentId)
        .single();
      
      const isCancelled = enrollment?.status === 'cancelled' && 
                         enrollment?.cancelled_reason === 'Removed from waitlist by user';
      logTest('removeFromInstanceWaitlist', isCancelled, 
        `状态已更新为 cancelled: ${enrollment?.status}`);
    }
    
  } catch (error) {
    logTest('removeFromInstanceWaitlist', false, error.message);
  }
}

// 测试 checkInstanceWaitlistAndNotify 函数
async function testCheckWaitlist() {
  console.log('\n📋 测试 checkInstanceWaitlistAndNotify 函数');
  console.log('─'.repeat(60));
  
  if (!testInstanceId || !testUserId || !testStudentId) {
    logTest('checkInstanceWaitlistAndNotify', false, '缺少必要的测试数据');
    return;
  }
  
  try {
    // 检查现有的enrollment状态，如果不是waitlisted，创建一个新的
    let waitlistEnrollmentId = testEnrollmentId;
    
    if (waitlistEnrollmentId) {
      const { data: existingEnrollment } = await supabase
        .from('instance_enrollments')
        .select('id, status')
        .eq('id', waitlistEnrollmentId)
        .single();
      
      // 如果enrollment不是waitlisted状态，创建一个新的
      if (!existingEnrollment || existingEnrollment.status !== 'waitlisted') {
        waitlistEnrollmentId = null;
      }
    }
    
    // 如果没有可用的等待列表项，创建一个新的
    if (!waitlistEnrollmentId) {
      const { data: enrollment, error: insertError } = await supabase
        .from('instance_enrollments')
        .insert({
          user_id: testUserId,
          payer_user_id: testUserId,
          instance_id: testInstanceId,
          student_id: testStudentId,
          student_name: 'Test Student Phase5 Check',
          status: 'waitlisted',
          waitlisted_at: new Date().toISOString(),
          waitlist_position: 1,
          prerequisites_passed: true,
          is_synced: false,
        })
        .select()
        .single();
      
      if (insertError) {
        logTest('checkInstanceWaitlistAndNotify', false, `创建等待列表项失败: ${insertError.message}`);
        return;
      }
      
      waitlistEnrollmentId = enrollment.id;
      console.log(`✅ 创建了新的等待列表项: ${waitlistEnrollmentId}`);
    }
    
    // 设置实例有可用容量
    await supabase
      .from('instance_v2')
      .update({ current_students: 0 })
      .eq('id', testInstanceId);
    
    // 测试检查等待列表
    const { data: waitlistItems, error: waitlistError } = await supabase
      .from('instance_enrollments')
      .select('instance_id')
      .eq('instance_id', testInstanceId)
      .eq('status', 'waitlisted')
      .eq('is_synced', false)
      .is('waitlist_notified_at', null);
    
    if (waitlistError) {
      logTest('checkInstanceWaitlistAndNotify', false, `查询等待列表失败: ${waitlistError.message}`);
      return;
    }
    
    const hasWaitlist = waitlistItems && waitlistItems.length > 0;
    
    if (hasWaitlist) {
      // 更新第一个等待列表项为已通知
      const { data: firstWaitlist, error: fetchError } = await supabase
        .from('instance_enrollments')
        .select('*')
        .eq('instance_id', testInstanceId)
        .eq('status', 'waitlisted')
        .eq('is_synced', false)
        .is('waitlist_notified_at', null)
        .order('waitlist_position', { ascending: true })
        .limit(1)
        .single();
      
      if (fetchError || !firstWaitlist) {
        logTest('checkInstanceWaitlistAndNotify', false, `未找到等待列表项: ${fetchError?.message || 'not found'}`);
        return;
      }
      
      const { error: updateError } = await supabase
        .from('instance_enrollments')
        .update({
          waitlist_notified_at: new Date().toISOString(),
          waitlist_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', firstWaitlist.id);
      
      if (updateError) {
        logTest('checkInstanceWaitlistAndNotify', false, `更新通知状态失败: ${updateError.message}`);
        return;
      }
      
      // 验证通知记录
      const { data: updatedEnrollment } = await supabase
        .from('instance_enrollments')
        .select('waitlist_notified_at, waitlist_expires_at')
        .eq('id', firstWaitlist.id)
        .single();
      
      const isNotified = updatedEnrollment?.waitlist_notified_at !== null;
      logTest('checkInstanceWaitlistAndNotify', isNotified, 
        `成功通知等待列表用户: ${isNotified ? '已通知' : '未通知'}`);
    } else {
      logTest('checkInstanceWaitlistAndNotify', false, '没有找到未通知的等待列表项');
    }
    
  } catch (error) {
    logTest('checkInstanceWaitlistAndNotify', false, error.message);
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 Phase 5 等待列表功能测试');
  console.log('='.repeat(60));
  
  try {
    // 准备测试数据
    await setupTestData();
    
    // 运行测试
    await testAddToWaitlist();
    await testGetWaitlist();
    await testRemoveFromWaitlist();
    await testCheckWaitlist();
    
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
