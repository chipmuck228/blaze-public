# Teams 和 Users 表设计优化方案

## 一、当前设计分析

### 1.1 当前表结构

#### Teams 表
```sql
teams (
  id UUID PRIMARY KEY
  image_url TEXT
  name TEXT
  position TEXT          -- 职位（如 "Chef Coach", "Senior Coach"）
  description TEXT
  display_order INTEGER
  created_at TIMESTAMP
  updated_at TIMESTAMP
)
```

**用途**：
- 在首页展示团队成员（coach）
- 展示教练的公开信息（头像、职位、描述、社交媒体）

#### Users 表
```sql
users (
  id UUID PRIMARY KEY
  name TEXT
  email TEXT UNIQUE
  password_hash TEXT
  role ENUM('user', 'admin', 'coach')
  email_verified BOOLEAN
  image TEXT              -- 头像 URL
  created_at TIMESTAMP
  updated_at TIMESTAMP
)
```

**用途**：
- 存储所有用户（admin, user, coach）
- 用于认证和授权
- 用于 Coach Portal 登录

### 1.2 当前设计的问题

#### 问题 1：数据分离和不一致
- **Teams 表**和 **Users 表**完全独立，没有关联
- 一个 coach 可能在 Teams 表中有展示信息，但在 Users 表中不存在（无法登录）
- 一个 coach 可能在 Users 表中存在（可以登录），但在 Teams 表中不存在（首页不显示）
- 数据可能不一致：Teams 表中的 `name` 和 Users 表中的 `name` 可能不同

#### 问题 2：数据冗余
- `name` 字段在两个表中都存在
- `image_url` (Teams) 和 `image` (Users) 可能存储相同的头像
- 如果 coach 信息更新，需要在两个表中分别更新

#### 问题 3：业务逻辑不清晰
- Teams 表存储的是"展示用的 coach 信息"
- Users 表存储的是"可以登录的 coach 用户"
- 两者之间的关系不明确

#### 问题 4：可扩展性差
- 如果未来需要：
  - 让 coach 自己管理个人信息
  - 在 Coach Portal 中显示 coach 的详细信息
  - 关联 coach 和课程实例（已有 `course_instance_coaches` 表）
  - 需要同时更新两个表，容易出错

#### 问题 5：Admin 管理复杂
- Admin 需要分别管理 Teams 表和 Users 表
- 无法在一个地方看到完整的 coach 信息
- 无法确保 Teams 表中的 coach 都能登录系统

## 二、优化方案

### 方案 A：Teams 表关联 Users 表（推荐）

#### 2.1 设计理念

**核心思想**：
- **Users 表**：单一数据源（Single Source of Truth），存储所有用户的基础信息
- **Teams 表**：存储 coach 的**展示信息**（公开展示用的额外信息）
- **关联关系**：Teams 表通过 `user_id` 关联到 Users 表

#### 2.2 表结构设计

##### Users 表（保持不变，但增强）
```sql
users (
  id UUID PRIMARY KEY
  name TEXT                    -- 真实姓名
  email TEXT UNIQUE
  password_hash TEXT
  role ENUM('user', 'admin', 'coach')
  email_verified BOOLEAN
  image TEXT                    -- 头像 URL（用于认证系统）
  phone TEXT                    -- 可选：联系电话
  created_at TIMESTAMP
  updated_at TIMESTAMP
)
```

**说明**：
- Users 表存储所有用户的基础信息
- `role = 'coach'` 的用户是教练
- `image` 用于认证系统（如 Navbar 头像）

##### Teams 表（重构）
```sql
teams (
  id UUID PRIMARY KEY
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE  -- ⭐ 新增：关联 Users 表
  position TEXT                    -- 展示职位（如 "Chef Coach", "Senior Coach"）
  description TEXT                 -- 展示描述
  bio TEXT                         -- 可选：详细个人简介
  display_order INTEGER
  is_featured BOOLEAN DEFAULT FALSE -- 可选：是否在首页展示
  is_active BOOLEAN DEFAULT TRUE   -- 是否激活（可以隐藏某个 coach）
  created_at TIMESTAMP
  updated_at TIMESTAMP
)
```

**说明**：
- `user_id` 关联到 Users 表，确保每个 Teams 记录对应一个 Users 记录
- `UNIQUE` 约束确保一个 coach 只能有一条 Teams 记录
- `position` 和 `description` 是展示用的信息，与 Users 表的 `name` 分离
- `is_featured` 可以控制哪些 coach 在首页展示
- `is_active` 可以临时隐藏某个 coach

##### team_social_networks 表（保持不变）
```sql
team_social_networks (
  id UUID PRIMARY KEY
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE
  name TEXT
  url TEXT
  display_order INTEGER
  created_at TIMESTAMP
)
```

#### 2.3 数据关系

```
users (role='coach')
  ↓ (1:1)
teams (user_id)
  ↓ (1:N)
team_social_networks
```

**关系说明**：
- 一个 Users 记录（role='coach'）可以有一条 Teams 记录（可选）
- 一个 Teams 记录必须关联一个 Users 记录
- 一个 Teams 记录可以有多个 team_social_networks 记录

#### 2.4 业务逻辑

##### 场景 1：创建新 Coach
1. 在 Users 表中创建用户（role='coach'）
2. 可选：在 Teams 表中创建展示信息（user_id 关联）
3. 如果创建了 Teams 记录，coach 会在首页显示

##### 场景 2：Coach 登录
- 使用 Users 表的 email/password 登录
- 通过 `role='coach'` 判断权限
- 不需要 Teams 表记录也能登录

##### 场景 3：首页展示 Coach
- 查询：`SELECT * FROM teams WHERE is_active = TRUE AND is_featured = TRUE ORDER BY display_order`
- JOIN Users 表获取 `name` 和 `image`
- 如果 Users 表的 `image` 为空，可以使用 Teams 表的其他信息

##### 场景 4：Admin 管理 Coach
- 在 User Management 中，可以：
  - 查看所有 coach（role='coach'）
  - 查看哪些 coach 有 Teams 记录（在首页展示）
  - 一键创建 Teams 记录（如果不存在）
  - 编辑 coach 的基础信息（Users 表）和展示信息（Teams 表）

#### 2.5 优势

✅ **数据一致性**：
- 每个 Teams 记录都关联一个 Users 记录
- 确保 Teams 表中的 coach 都能登录系统
- 避免数据不一致

✅ **单一数据源**：
- Users 表是用户信息的单一数据源
- Teams 表只存储展示用的额外信息

✅ **灵活性**：
- Coach 可以登录系统，但不一定在首页展示（没有 Teams 记录）
- 可以控制哪些 coach 在首页展示（is_featured）
- 可以临时隐藏某个 coach（is_active）

✅ **可扩展性**：
- 未来可以添加更多展示字段（bio, achievements, etc.）
- 不影响 Users 表的结构

✅ **管理便利**：
- Admin 可以在一个地方管理 coach 的完整信息
- 可以清楚地看到哪些 coach 可以登录，哪些在首页展示

#### 2.6 迁移策略

1. **添加 `user_id` 字段**：
   ```sql
   ALTER TABLE teams ADD COLUMN user_id UUID REFERENCES users(id);
   ```

2. **数据迁移**：
   - 对于现有的 Teams 记录，需要：
     - 在 Users 表中创建对应的 coach 用户（如果不存在）
     - 更新 Teams 表的 `user_id` 字段

3. **添加约束**：
   ```sql
   -- 确保 user_id 唯一
   ALTER TABLE teams ADD CONSTRAINT teams_user_id_unique UNIQUE(user_id);
   
   -- 确保 user_id 对应的用户是 coach
   ALTER TABLE teams ADD CONSTRAINT teams_user_is_coach 
     CHECK (EXISTS (SELECT 1 FROM users WHERE id = user_id AND role = 'coach'));
   ```

4. **可选字段**：
   - 保留 `name` 字段（向后兼容），但建议使用 Users 表的 `name`
   - 保留 `image_url` 字段（向后兼容），但建议使用 Users 表的 `image`

---

### 方案 B：Teams 表作为 Users 表的扩展视图

#### 2.1 设计理念

**核心思想**：
- **Users 表**：存储所有用户信息
- **Teams 表**：完全移除，使用 Users 表的扩展字段
- 所有 coach 信息都在 Users 表中

#### 2.2 表结构设计

##### Users 表（扩展）
```sql
users (
  id UUID PRIMARY KEY
  name TEXT
  email TEXT UNIQUE
  password_hash TEXT
  role ENUM('user', 'admin', 'coach')
  email_verified BOOLEAN
  image TEXT
  
  -- Coach 专用字段（role='coach' 时使用）
  position TEXT                    -- 职位（如 "Chef Coach"）
  bio TEXT                         -- 个人简介
  description TEXT                 -- 简短描述（用于首页）
  display_order INTEGER            -- 首页显示顺序
  is_featured BOOLEAN DEFAULT FALSE -- 是否在首页展示
  is_active BOOLEAN DEFAULT TRUE   -- 是否激活
  
  created_at TIMESTAMP
  updated_at TIMESTAMP
)
```

##### team_social_networks 表（修改）
```sql
team_social_networks (
  id UUID PRIMARY KEY
  user_id UUID REFERENCES users(id) ON DELETE CASCADE  -- 改为关联 users
  name TEXT
  url TEXT
  display_order INTEGER
  created_at TIMESTAMP
)
```

#### 2.3 优势

✅ **简化设计**：
- 只有一个表存储用户信息
- 不需要 JOIN 查询

✅ **数据一致性**：
- 所有信息都在一个表中
- 不会出现数据不一致

#### 2.4 劣势

❌ **表结构臃肿**：
- Users 表包含很多 coach 专用字段
- 对于普通用户（role='user'），这些字段都是 NULL

❌ **违反数据库设计原则**：
- 违反了"单一职责原则"
- 不同类型的用户混在一起

❌ **查询性能**：
- 查询首页 coach 列表时，需要过滤 `role='coach' AND is_featured=TRUE`
- 如果 Users 表很大，可能影响性能

---

### 方案 C：混合方案（Teams 表可选关联）

#### 2.1 设计理念

**核心思想**：
- **Users 表**：存储所有用户信息（必需）
- **Teams 表**：存储 coach 的展示信息（可选）
- **关联关系**：Teams 表的 `user_id` 可以为 NULL（向后兼容）

#### 2.2 表结构设计

##### Teams 表
```sql
teams (
  id UUID PRIMARY KEY
  user_id UUID NULLABLE REFERENCES users(id) ON DELETE SET NULL  -- ⭐ 可选关联
  name TEXT                    -- 保留（向后兼容，如果 user_id 为 NULL）
  image_url TEXT               -- 保留（向后兼容）
  position TEXT
  description TEXT
  display_order INTEGER
  is_active BOOLEAN DEFAULT TRUE
  created_at TIMESTAMP
  updated_at TIMESTAMP
)
```

#### 2.3 业务逻辑

- 如果 `user_id` 不为 NULL：关联到 Users 表，使用 Users 表的 `name` 和 `image`
- 如果 `user_id` 为 NULL：使用 Teams 表的 `name` 和 `image_url`（向后兼容）

#### 2.4 优势

✅ **向后兼容**：
- 现有的 Teams 记录不需要立即迁移
- 可以逐步迁移

✅ **灵活性**：
- 支持关联 Users 表的 coach
- 也支持独立的展示信息（不关联 Users）

#### 2.5 劣势

❌ **数据不一致风险**：
- 仍然可能出现 Teams 表和 Users 表数据不一致
- 需要额外的业务逻辑处理 NULL 情况

---

## 三、推荐方案：方案 A（Teams 表关联 Users 表）

### 3.1 为什么选择方案 A？

1. **数据一致性**：确保每个 Teams 记录都关联一个 Users 记录
2. **单一数据源**：Users 表是用户信息的单一数据源
3. **清晰的关系**：Teams 表是 Users 表的扩展，存储展示信息
4. **灵活性**：Coach 可以登录但不一定在首页展示
5. **可扩展性**：未来可以轻松添加更多展示字段
6. **管理便利**：Admin 可以在一个地方管理完整信息

### 3.2 实施步骤

#### 阶段 1：数据库迁移
1. 添加 `user_id` 字段到 Teams 表
2. 迁移现有数据（创建 Users 记录，关联 Teams 记录）
3. 添加约束（UNIQUE, CHECK）

#### 阶段 2：代码更新
1. 更新 `db.ts` 中的接口和函数
2. 更新 API 路由
3. 更新 Admin UI（User Management 和 Team Management）

#### 阶段 3：功能增强
1. 在 User Management 中显示 coach 的 Teams 信息
2. 在 Team Management 中显示关联的 Users 信息
3. 提供一键创建 Teams 记录的功能

### 3.3 数据查询示例

#### 查询首页展示的 Coach
```sql
SELECT 
  u.id,
  u.name,
  u.image,
  t.position,
  t.description,
  t.display_order
FROM users u
INNER JOIN teams t ON u.id = t.user_id
WHERE u.role = 'coach'
  AND t.is_active = TRUE
  AND t.is_featured = TRUE
ORDER BY t.display_order;
```

#### 查询所有 Coach（Admin）
```sql
SELECT 
  u.id,
  u.name,
  u.email,
  u.role,
  u.email_verified,
  t.id as team_id,
  t.position,
  t.is_featured,
  CASE WHEN t.id IS NOT NULL THEN TRUE ELSE FALSE END as has_team_profile
FROM users u
LEFT JOIN teams t ON u.id = t.user_id
WHERE u.role = 'coach'
ORDER BY u.created_at DESC;
```

### 3.4 Admin UI 改进建议

#### User Management 页面
- 显示所有 coach（role='coach'）
- 显示是否有 Teams 记录（"Has Team Profile" 列）
- 提供"Create Team Profile"按钮（如果不存在）
- 提供"View Team Profile"链接（如果存在）

#### Team Management 页面
- 显示所有 Teams 记录
- 显示关联的 Users 信息（name, email）
- 提供"View User"链接
- 提供"Edit User"链接

#### 统一管理界面（可选）
- 创建一个"Coaches"管理页面
- 在一个页面中管理 coach 的完整信息（Users + Teams）
- 提供创建、编辑、删除功能

## 四、其他考虑

### 4.1 数据迁移策略

#### 现有 Teams 记录的处理
1. **对于每个 Teams 记录**：
   - 检查 Users 表中是否存在对应的 coach（通过 name 或 email 匹配）
   - 如果存在：更新 Teams 表的 `user_id`
   - 如果不存在：创建新的 Users 记录（role='coach'），然后关联

2. **创建临时用户**：
   - 如果无法匹配到现有用户，创建临时用户
   - 使用 Teams 表的 `name` 作为 Users 表的 `name`
   - 使用临时 email（如 `coach-{id}@temp.blaze.com`）
   - 设置 `email_verified = FALSE`
   - Admin 后续可以更新 email 和密码

### 4.2 向后兼容

#### 保留旧字段（可选）
- 保留 Teams 表的 `name` 字段（但建议使用 Users 表的 `name`）
- 保留 Teams 表的 `image_url` 字段（但建议使用 Users 表的 `image`）
- 在查询时，优先使用 Users 表的字段，如果为空则使用 Teams 表的字段

### 4.3 未来扩展

#### 可能的扩展需求
1. **Coach 详细信息**：
   - 教育背景
   - 工作经历
   - 成就/奖项
   - 专业认证

2. **Coach 评级系统**：
   - 学生评价
   - 评分
   - 评论

3. **Coach 可用性**：
   - 可授课时间
   - 可授课地点
   - 可授课类型

4. **Coach 统计**：
   - 授课次数
   - 学生数量
   - 课程完成率

**建议**：
- 这些扩展信息可以添加到 Teams 表
- 或者创建新的 `coach_profiles` 表（更详细的信息）

## 五、总结

### 推荐方案：方案 A（Teams 表关联 Users 表）

**核心设计**：
- Users 表：单一数据源，存储所有用户基础信息
- Teams 表：存储 coach 的展示信息，通过 `user_id` 关联 Users 表
- 关系：1:1（一个 coach 用户可以有一条 Teams 记录）

**优势**：
- ✅ 数据一致性
- ✅ 单一数据源
- ✅ 灵活性
- ✅ 可扩展性
- ✅ 管理便利

**实施建议**：
1. 先进行数据库迁移
2. 更新代码和 API
3. 更新 Admin UI
4. 逐步迁移现有数据

**注意事项**：
- 确保每个 Teams 记录都关联一个 Users 记录
- 提供数据迁移脚本
- 考虑向后兼容
- 更新相关文档

