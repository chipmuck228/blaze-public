# 用户创建和邀请系统设计方案

## 一、需求分析

### 1.1 当前用户类型和创建方式

| 用户类型 | 当前创建方式 | 需求改进 |
|---------|------------|---------|
| **普通用户 (user)** | 通过 Sign Up 页面自行注册 | ✅ 保持现有流程 |
| **Coach** | 需要手动在数据库中创建 | ⚠️ 需要 Admin 界面创建 |
| **Admin** | 需要手动在数据库中创建 | ⚠️ 需要 Admin 界面创建 |
| **测试用户** | 需要手动创建 | ⚠️ 需要 Admin 界面创建 |

### 1.2 核心需求

1. **Admin 创建用户**：
   - Admin 可以在 User Management 中直接创建用户（Coach、Admin、普通用户）
   - 支持生成临时密码或发送邀请链接
   - 支持批量创建测试用户

2. **邀请注册流程**：
   - Admin 创建用户并发送邀请邮件
   - 用户通过邮件链接验证并设置密码
   - 完成账户激活

3. **密码管理**：
   - 支持生成随机密码
   - 支持设置初始密码
   - 首次登录强制修改密码（可选）

4. **测试用户管理**：
   - 标记测试用户
   - 批量创建测试用户
   - 测试用户清理功能

## 二、设计方案

### 方案 A：混合模式（推荐）

#### 2.1 用户创建方式

**方式 1：直接创建 + 生成密码**
- Admin 填写用户信息（name, email, role）
- 系统生成随机密码（或 Admin 手动设置）
- 密码通过安全渠道发送给用户（邮件或手动告知）
- 用户使用 email + 密码登录

**方式 2：邀请注册**
- Admin 填写用户信息（name, email, role）
- 系统生成邀请令牌（invitation token）
- 发送邀请邮件（包含设置密码的链接）
- 用户点击链接，验证邮件，设置密码
- 完成账户激活

**方式 3：批量创建测试用户**
- Admin 设置测试用户模板（prefix, count, role）
- 系统批量生成测试用户（email: test1@test.com, test2@test.com...）
- 自动生成随机密码
- 导出测试用户列表（CSV）

#### 2.2 数据库设计

##### 2.2.1 扩展 users 表

```sql
-- 添加字段到 users 表
ALTER TABLE users ADD COLUMN IF NOT EXISTS 
  is_test_user BOOLEAN DEFAULT FALSE,              -- 是否为测试用户
  created_by UUID REFERENCES users(id),            -- 创建者（Admin ID）
  invitation_token TEXT,                           -- 邀请令牌
  invitation_expires_at TIMESTAMP WITH TIME ZONE,  -- 邀请过期时间
  invitation_sent_at TIMESTAMP WITH TIME ZONE,     -- 邀请发送时间
  password_set_at TIMESTAMP WITH TIME ZONE,        -- 密码设置时间
  must_change_password BOOLEAN DEFAULT FALSE,      -- 首次登录必须修改密码
  last_password_change TIMESTAMP WITH TIME ZONE;   -- 最后修改密码时间

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_invitation_token ON users(invitation_token);
CREATE INDEX IF NOT EXISTS idx_users_is_test_user ON users(is_test_user);
CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by);
```

##### 2.2.2 用户状态枚举

```sql
-- 用户状态（通过字段组合判断）
-- 1. pending_invitation: invitation_token IS NOT NULL AND password_hash IS NULL
-- 2. active: password_hash IS NOT NULL AND email_verified = TRUE
-- 3. unverified: password_hash IS NOT NULL AND email_verified = FALSE
-- 4. test_user: is_test_user = TRUE
```

#### 2.3 用户创建流程

##### 流程 1：直接创建 + 生成密码

```
Admin 操作：
1. 在 User Management 点击 "Create User"
2. 填写表单：
   - Name: 必填
   - Email: 必填（验证唯一性）
   - Role: 选择（user, coach, admin）
   - Password Option: 
     - [ ] Generate random password
     - [ ] Set custom password
     - [ ] Send invitation link (方式 2)
   - [ ] Require password change on first login
   - [ ] Mark as test user
3. 点击 "Create User"

系统处理：
1. 验证 email 唯一性
2. 如果选择 "Generate random password":
   - 生成 12 位随机密码
   - 加密存储 password_hash
   - email_verified = FALSE（首次登录后验证）
3. 如果选择 "Set custom password":
   - 使用 Admin 设置的密码
   - 加密存储 password_hash
   - email_verified = FALSE
4. 如果选择 "Send invitation link":
   - 生成 invitation_token
   - 设置 invitation_expires_at（7 天后过期）
   - password_hash = NULL
   - 发送邀请邮件
5. 记录 created_by = 当前 Admin ID
6. 如果标记为测试用户，设置 is_test_user = TRUE

用户操作（方式 1）：
1. 收到邮件（包含 email 和密码）或手动告知
2. 使用 email + 密码登录
3. 如果设置了 must_change_password，首次登录后强制修改密码
4. 完成邮箱验证（可选）
```

##### 流程 2：邀请注册

```
Admin 操作：
1. 在 User Management 点击 "Create User"
2. 填写表单：
   - Name: 必填
   - Email: 必填
   - Role: 选择
   - Password Option: 选择 "Send invitation link"
3. 点击 "Create User"

系统处理：
1. 验证 email 唯一性
2. 生成 invitation_token（UUID 或随机字符串）
3. 设置 invitation_expires_at（7 天后过期）
4. 设置 invitation_sent_at = NOW()
5. password_hash = NULL
6. email_verified = FALSE
7. 发送邀请邮件（包含设置密码的链接）

用户操作：
1. 收到邀请邮件
2. 点击邮件中的链接：/invite/accept?token={invitation_token}
3. 进入设置密码页面
4. 输入新密码（两次确认）
5. 点击 "Set Password"
6. 系统验证：
   - invitation_token 有效
   - 未过期
   - 密码强度符合要求
7. 系统处理：
   - 加密存储 password_hash
   - email_verified = TRUE（通过邀请链接验证）
   - 清除 invitation_token
   - 设置 password_set_at = NOW()
8. 自动登录并跳转到相应页面（根据 role）
```

#### 2.4 UI/UX 设计

##### 2.4.1 User Management 页面增强

**新增功能：**
1. **"Create User" 按钮**（在页面顶部）
2. **"Bulk Create Test Users" 按钮**（在页面顶部）
3. **用户状态列**（显示：Active, Pending Invitation, Unverified, Test User）
4. **操作列增强**：
   - "Resend Invitation"（如果 pending_invitation）
   - "Reset Password"（生成新密码并发送邮件）
   - "Revoke Invitation"（取消邀请）

##### 2.4.2 Create User Dialog

```
┌─────────────────────────────────────┐
│ Create User                         │
├─────────────────────────────────────┤
│ Name *                              │
│ [________________________]          │
│                                     │
│ Email *                             │
│ [________________________]          │
│                                     │
│ Role *                              │
│ [Select: user ▼]                    │
│   - User                            │
│   - Coach                           │
│   - Admin                           │
│                                     │
│ Password Option *                   │
│ ○ Generate random password         │
│   └─ [ ] Require password change   │
│      on first login                 │
│                                     │
│ ○ Set custom password               │
│   └─ Password: [________]          │
│      Confirm:  [________]          │
│      [ ] Require password change    │
│                                     │
│ ○ Send invitation link              │
│   └─ User will set password via    │
│      email link                     │
│                                     │
│ [ ] Mark as test user               │
│                                     │
│ [Cancel]  [Create User]             │
└─────────────────────────────────────┘
```

##### 2.4.3 Bulk Create Test Users Dialog

```
┌─────────────────────────────────────┐
│ Bulk Create Test Users              │
├─────────────────────────────────────┤
│ Email Prefix *                      │
│ [test_user_________]                │
│                                     │
│ Domain *                            │
│ [@test.com ▼]                       │
│   - @test.com                       │
│   - @example.com                    │
│                                     │
│ Number of Users *                  │
│ [10]                                │
│                                     │
│ Role *                              │
│ [User ▼]                            │
│                                     │
│ Password Option                     │
│ ○ Generate random password         │
│ ○ Use same password for all        │
│   └─ Password: [________]          │
│                                     │
│ [ ] Mark all as test users         │
│                                     │
│ Preview:                            │
│ - test_user_1@test.com             │
│ - test_user_2@test.com             │
│ ...                                 │
│ - test_user_10@test.com            │
│                                     │
│ [Cancel]  [Create Users]            │
└─────────────────────────────────────┘
```

##### 2.4.4 Invite Accept Page (`/invite/accept?token=xxx`)

```
┌─────────────────────────────────────┐
│ Set Your Password                    │
├─────────────────────────────────────┤
│ Welcome, [User Name]!               │
│                                     │
│ Please set a password for your      │
│ account.                             │
│                                     │
│ New Password *                       │
│ [________________________]          │
│ Requirements:                        │
│ - At least 8 characters             │
│ - Contains uppercase and lowercase  │
│ - Contains a number                 │
│                                     │
│ Confirm Password *                   │
│ [________________________]          │
│                                     │
│ [Set Password]                      │
└─────────────────────────────────────┘
```

#### 2.5 API 设计

##### 2.5.1 创建用户 API

**POST `/api/admin/users`**

```typescript
Request Body:
{
  name: string
  email: string
  role: 'user' | 'coach' | 'admin'
  password_option: 'generate' | 'custom' | 'invite'
  password?: string  // 当 password_option = 'custom' 时必填
  require_password_change?: boolean
  is_test_user?: boolean
}

Response:
{
  user: {
    id: string
    name: string
    email: string
    role: string
    status: 'pending_invitation' | 'active' | 'unverified'
    invitation_token?: string  // 如果 password_option = 'invite'
    generated_password?: string  // 如果 password_option = 'generate'（仅返回一次）
  }
}
```

##### 2.5.2 批量创建测试用户 API

**POST `/api/admin/users/bulk-create`**

```typescript
Request Body:
{
  email_prefix: string
  domain: string
  count: number
  role: 'user' | 'coach' | 'admin'
  password_option: 'generate' | 'same'
  password?: string  // 当 password_option = 'same' 时必填
  is_test_user?: boolean
}

Response:
{
  users: Array<{
    id: string
    email: string
    password?: string  // 仅当 password_option = 'generate' 时返回
  }>
  csv_download_url?: string  // 可选：CSV 下载链接
}
```

##### 2.5.3 接受邀请 API

**POST `/api/invite/accept`**

```typescript
Request Body:
{
  token: string
  password: string
  confirm_password: string
}

Response:
{
  user: {
    id: string
    name: string
    email: string
    role: string
  }
  session_token: string  // 用于自动登录
}
```

##### 2.5.4 重新发送邀请 API

**POST `/api/admin/users/[id]/resend-invitation`**

```typescript
Response:
{
  message: "Invitation sent successfully"
  invitation_token: string
  invitation_expires_at: string
}
```

##### 2.5.5 重置密码 API

**POST `/api/admin/users/[id]/reset-password`**

```typescript
Request Body:
{
  send_email?: boolean  // 是否发送邮件
}

Response:
{
  message: "Password reset successfully"
  new_password?: string  // 如果 send_email = false
}
```

#### 2.6 邮件模板

##### 2.6.1 邀请邮件模板

```
Subject: You've been invited to join Blaze Robotics Academy

Hi [Name],

You've been invited to join Blaze Robotics Academy as a [Role].

Click the link below to set your password and activate your account:
[Set Password Link] (expires in 7 days)

If you didn't request this invitation, please ignore this email.

Best regards,
Blaze Robotics Academy Team
```

##### 2.6.2 密码通知邮件模板

```
Subject: Your Blaze Robotics Academy Account

Hi [Name],

Your account has been created:

Email: [email]
Password: [password]  // 或 "Please use the password you set"

Please log in at: [login_url]

[If must_change_password]
⚠️ You will be required to change your password on first login.

Best regards,
Blaze Robotics Academy Team
```

#### 2.7 安全性考虑

1. **密码生成**：
   - 使用加密安全的随机数生成器
   - 密码长度至少 12 位
   - 包含大小写字母、数字、特殊字符

2. **邀请令牌**：
   - 使用 UUID v4 或加密随机字符串
   - 设置过期时间（7 天）
   - 使用后立即失效

3. **密码存储**：
   - 使用 bcrypt 加密（已有）
   - 不存储明文密码

4. **权限控制**：
   - 只有 Admin 可以创建用户
   - 只有 Admin 可以查看生成的密码
   - 邀请链接只能使用一次

5. **审计日志**：
   - 记录创建者（created_by）
   - 记录创建时间
   - 记录密码设置时间

6. **测试用户**：
   - 测试用户标记清晰
   - 支持批量清理测试用户
   - 测试用户数据隔离（可选）

## 三、实施计划

### 阶段 1：基础功能（核心）
1. ✅ 数据库迁移（添加新字段）
2. ✅ 创建用户 API（支持三种方式）
3. ✅ Create User Dialog UI
4. ✅ 用户状态显示
5. ✅ 邀请接受页面

### 阶段 2：增强功能
1. ⚠️ 批量创建测试用户
2. ⚠️ 重新发送邀请
3. ⚠️ 重置密码
4. ⚠️ 邮件模板

### 阶段 3：优化功能
1. ⚠️ 首次登录强制修改密码
2. ⚠️ 测试用户批量清理
3. ⚠️ 用户创建历史记录
4. ⚠️ CSV 导出功能

## 四、推荐方案总结

### 4.1 用户创建方式优先级

1. **邀请注册**（推荐用于 Coach/Admin）：
   - ✅ 更安全（用户自己设置密码）
   - ✅ 自动验证邮箱
   - ✅ 更好的用户体验

2. **生成随机密码**（用于测试用户）：
   - ✅ 快速创建
   - ✅ 适合批量操作

3. **设置自定义密码**（用于特殊情况）：
   - ✅ Admin 完全控制
   - ⚠️ 需要安全传输密码

### 4.2 实施建议

1. **先实现邀请注册**：这是最安全和用户友好的方式
2. **再实现生成密码**：用于测试和快速创建
3. **最后实现批量创建**：提高效率

### 4.3 用户体验优化

1. **邀请邮件**：
   - 清晰的说明
   - 明显的按钮
   - 过期提醒

2. **设置密码页面**：
   - 密码强度指示器
   - 实时验证
   - 友好的错误提示

3. **Admin 界面**：
   - 清晰的状态显示
   - 便捷的操作按钮
   - 批量操作支持

## 五、数据库迁移脚本

```sql
-- ==================== 用户创建和邀请系统数据库迁移 ====================

-- 添加字段到 users 表
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS is_test_user BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS invitation_token TEXT,
  ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS password_set_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMP WITH TIME ZONE;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_invitation_token ON users(invitation_token);
CREATE INDEX IF NOT EXISTS idx_users_is_test_user ON users(is_test_user);
CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by);
CREATE INDEX IF NOT EXISTS idx_users_invitation_expires_at ON users(invitation_expires_at);

-- 添加唯一约束（邀请令牌）
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_invitation_token_unique 
  ON users(invitation_token) 
  WHERE invitation_token IS NOT NULL;

-- 添加检查约束（邀请令牌和密码不能同时为空）
ALTER TABLE users 
  ADD CONSTRAINT check_user_has_password_or_invitation 
  CHECK (
    password_hash IS NOT NULL OR 
    invitation_token IS NOT NULL OR 
    is_test_user = TRUE
  );
```

## 六、注意事项

1. **向后兼容**：
   - 现有用户不受影响
   - 新字段都有默认值

2. **邮件服务**：
   - 确保 SMTP 配置正确
   - 处理邮件发送失败的情况

3. **测试**：
   - 测试邀请链接过期
   - 测试重复使用邀请链接
   - 测试密码强度验证

4. **监控**：
   - 监控邀请邮件发送成功率
   - 监控邀请接受率
   - 监控密码重置频率

