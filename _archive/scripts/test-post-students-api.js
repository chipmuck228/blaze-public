#!/usr/bin/env node

/**
 * 测试 POST /api/students API
 * 
 * 使用方法:
 *   node scripts/test-post-students-api.js
 * 
 * 注意: 这个脚本需要你提供 session token
 * 获取方法: 登录系统后，在浏览器开发者工具的 Application/Storage 中查看 Cookies
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

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const sessionToken = process.argv[2]; // 从命令行参数获取 session token

if (!sessionToken) {
  console.error('❌ 请提供 session token');
  console.log('\n使用方法:');
  console.log('  node scripts/test-post-students-api.js <session_token>');
  console.log('\n获取 session token 的方法:');
  console.log('  1. 登录系统 (http://localhost:3000/login)');
  console.log('  2. 打开浏览器开发者工具 (F12)');
  console.log('  3. 进入 Application/Storage → Cookies');
  console.log('  4. 找到 next-auth.session-token，复制其值');
  console.log('\n示例:');
  console.log('  node scripts/test-post-students-api.js eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
  process.exit(1);
}

async function testPostAPI() {
  console.log('🚀 测试 POST /api/students API');
  console.log('='.repeat(60));
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Session Token: ${sessionToken.substring(0, 20)}...`);
  
  const testCases = [
    {
      name: '测试1: 创建学生（完整数据）',
      data: {
        name: 'Charlie Test',
        birth_date: '2017-05-10',
        grade: '1st',
        school: 'Test Elementary School',
        emergency_contact_name: 'Parent Test',
        emergency_contact_phone: '555-0103',
        notes: 'Test student created via POST API',
        relationship: 'parent',
        is_primary: false,
        is_payer: false,
        can_manage_enrollments: true,
        can_view_progress: true,
        sync_cart_to_parent: false
      },
      expectedStatus: 201
    },
    {
      name: '测试2: 创建学生（最小数据）',
      data: {
        name: 'David Test',
        relationship: 'parent'
      },
      expectedStatus: 201
    },
    {
      name: '测试3: 缺少必填字段（name）',
      data: {
        birth_date: '2015-01-01',
        relationship: 'parent'
      },
      expectedStatus: 400
    },
    {
      name: '测试4: 无效的relationship值',
      data: {
        name: 'Invalid Test',
        relationship: 'invalid_relationship'
      },
      expectedStatus: 400
    }
  ];
  
  const results = [];
  
  for (const testCase of testCases) {
    console.log(`\n${testCase.name}`);
    console.log('─'.repeat(60));
    
    try {
      const response = await fetchFunc(`${baseUrl}/api/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `next-auth.session-token=${sessionToken}`
        },
        body: JSON.stringify(testCase.data)
      });
      
      const data = await response.json();
      const status = response.status;
      
      console.log(`状态码: ${status}`);
      console.log(`响应:`, JSON.stringify(data, null, 2));
      
      const passed = status === testCase.expectedStatus;
      
      if (passed) {
        console.log(`✅ 通过`);
        if (status === 201 && data.student) {
          console.log(`   创建的学生ID: ${data.student.id}`);
          console.log(`   学生姓名: ${data.student.name}`);
        }
      } else {
        console.log(`❌ 失败 - 期望状态码: ${testCase.expectedStatus}, 实际: ${status}`);
      }
      
      results.push({
        name: testCase.name,
        passed,
        status,
        expectedStatus: testCase.expectedStatus,
        data
      });
      
    } catch (error) {
      console.error(`❌ 请求失败:`, error.message);
      results.push({
        name: testCase.name,
        passed: false,
        error: error.message
      });
    }
  }
  
  // 输出测试总结
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试总结');
  console.log('─'.repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`✅ 通过: ${passed}/${results.length}`);
  console.log(`❌ 失败: ${failed}/${results.length}`);
  
  if (failed > 0) {
    console.log('\n失败的测试:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}`);
      if (r.status !== undefined) {
        console.log(`    期望状态码: ${r.expectedStatus}, 实际: ${r.status}`);
      }
      if (r.error) {
        console.log(`    错误: ${r.error}`);
      }
    });
  }
  
  console.log('\n💡 提示:');
  console.log('测试完成后，可以访问 GET /api/students 查看所有学生');
  console.log(`  ${baseUrl}/api/students`);
}

// 检查是否在 Node.js 18+ 环境中（支持 fetch）
if (typeof fetch === 'undefined') {
  console.error('❌ 需要 Node.js 18+ 或安装 node-fetch');
  console.log('\n如果使用 Node.js < 18，请安装 node-fetch:');
  console.log('  npm install node-fetch');
  process.exit(1);
}

testPostAPI().catch(error => {
  console.error('❌ 测试执行失败:', error);
  process.exit(1);
});
