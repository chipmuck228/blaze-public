# 多类型 Offering 系统设计方案

## 1. 需求概述

系统需要支持以下 7 种类型的 Offerings（全局配置）：

1. **Course** - 课程
2. **Camp** - 夏令营
3. **Workshop** - 工作坊
4. **Free Trial** - 免费试听
5. **Gift Card** - 礼品卡
6. **Care Service** - 照护服务
7. **Lunch Service** - 午餐服务

当这些 Offerings 被 assign 为 instance 时，每种类型有不同的配置要求：

- **Course**: 每周一次课，一共有若干次课
- **Workshop**: 每周一次或每两周一次；支持一次性 drop-in 费用和多次 drop-in 费用（multipass）

## 2. 设计原则

1. **向后兼容**: 保持现有 `courses` 表结构，通过扩展支持新类型
2. **类型驱动配置**: 不同 offering 类型在 assignment 和 instance 级别有不同的配置字段
3. **灵活扩展**: 使用 JSONB 字段存储类型特定的配置，便于未来扩展
4. **全局配置**: Offerings 是全局的，可以被多个 franchise/program 使用
5. **实例化配置**: 每种类型在创建 instance 时有不同的必填/可选字段
6. **配置覆盖机制**: 三层配置继承（Offering → Assignment → Instance），每层可以覆盖上层配置
7. **时间配置分离**: Offering 和 Assignment 级别不包含具体时间（时间只在 Instance 级别），因为不同 franchise 的时间安排不同
8. **折扣策略分离**: 折扣规则不在 Offering 配置中，而是通过独立的折扣规则系统管理，在购买/注册时动态计算

## 3. 数据模型设计

### 3.1 Offering 类型枚举

```sql
CREATE TYPE offering_type_enum AS ENUM (
  'course',        -- 课程：每周一次，若干次课
  'camp',          -- 夏令营
  'workshop',      -- 工作坊：每周一次或每两周一次，支持 drop-in
  'free_trial',    -- 免费试听
  'gift_card',     -- 礼品卡
  'care_service',  -- 照护服务
  'lunch_service'  -- 午餐服务
);
```

**说明：**
- 类型名使用 `offering_type_enum` 以避免与列名冲突
- 列名使用 `offering_type`（见下方）

### 3.2 扩展 `courses` 表（重命名为 `offerings` 或添加类型字段）

**方案 A：重命名表（推荐）**
```sql
-- 重命名 courses 表为 offerings
ALTER TABLE courses RENAME TO offerings;

-- 添加 offering_type 字段（列名），类型为 offering_type_enum（ENUM 类型）
ALTER TABLE offerings 
  ADD COLUMN offering_type offering_type_enum NOT NULL DEFAULT 'course';

-- 添加类型特定的配置字段（JSONB，灵活存储）
ALTER TABLE offerings 
  ADD COLUMN type_config JSONB DEFAULT '{}';
```

**方案 B：保持表名，添加类型字段（向后兼容）**
```sql
-- 在 courses 表中添加类型字段（列名），类型为 offering_type_enum（ENUM 类型）
ALTER TABLE courses 
  ADD COLUMN offering_type offering_type_enum NOT NULL DEFAULT 'course';

ALTER TABLE courses 
  ADD COLUMN type_config JSONB DEFAULT '{}';
```

**`type_config` JSONB 字段示例：**
```json
// Course 类型
{
  "default_session_count": 10,    // 默认总课次数（可在 Assignment/Instance 级别覆盖）
  "default_weekly_frequency": 1,   // 默认每周频率（可在 Assignment/Instance 级别覆盖）
  "default_duration_hours": 1.5,   // 默认每次课程时长（小时）
  "supports_multi_child_discount": true  // 是否支持多子女折扣（可选，默认 false）
  "supports_multi_child_discount": true  // 是否支持多子女折扣（可选，默认 false）
}

// Workshop 类型
{
  "supports_drop_in": true,      // 是否支持一次性 drop-in
  "drop_in_price": 50.00,        // 单次 drop-in 价格（一次性购买）
  "supports_multipass": true,    // 是否支持 multipass（多次购买）
  "multipass_options": [         // Multipass 套餐选项（预先购买多次）
    {
      "sessions": 5,              // 5次套餐
      "price": 200.00,            // 总价（比单次购买更优惠）
      "price_per_session": 40.00, // 每次平均价格
      "validity_days": 60         // 有效期（天）
    },
    {
      "sessions": 10,             // 10次套餐
      "price": 350.00,            // 总价
      "price_per_session": 35.00, // 每次平均价格
      "validity_days": 90         // 有效期（天）
    }
  ],
  "weekly_frequency": 1,         // 1 = 每周一次，2 = 每两周一次
  "biweekly_interval": 2         // 如果 weekly_frequency = 2，则每2周一次
}

// Camp 类型
{
  "default_duration_days": 5,    // 默认持续天数（可在 Assignment/Instance 级别覆盖）
  "default_daily_schedule": {     // 默认每日时间表（可在 Instance 级别覆盖）
    "start_time": "09:00",
    "end_time": "15:00"
  }
}

// Gift Card 类型
{
  "denominations": [50, 100, 200, 500],  // 面额选项
  "expiry_months": 12                     // 有效期（月）
}

// Care Service 类型
{
  "service_duration_hours": 2,   // 服务时长（小时）
  "requires_advance_booking": true,
  "advance_booking_hours": 24    // 提前预订时间（小时）
}

// Lunch Service 类型
{
  "meal_options": ["vegetarian", "non-vegetarian", "vegan"],
  "requires_camp_enrollment": true  // 是否仅限 Camp 参与者
}
```

### 3.3 扩展 `course_assignments` 表（添加类型特定配置）

```sql
ALTER TABLE course_assignments 
  ADD COLUMN assignment_config JSONB DEFAULT '{}';
```

**`assignment_config` JSONB 字段示例：**
```json
// Course Assignment 配置
{
  "session_count": 12,           // 覆盖 offering 的默认值（10 → 12）
  "weekly_frequency": 1,         // 保持默认值或覆盖
  "duration_hours": 2.0          // 覆盖默认时长（1.5 → 2.0）
}

// Workshop Assignment 配置
{
  "drop_in_enabled": true,       // 是否启用一次性 drop-in
  "drop_in_price": 55.00,        // 覆盖默认的单次 drop-in 价格（50 → 55）
  "multipass_enabled": true,     // 是否启用 multipass
  "multipass_options": [         // 可以覆盖或添加新的 multipass 选项
    {
      "sessions": 5,
      "price": 220.00,
      "validity_days": 60
    }
  ],
  "weekly_frequency": 2,         // 覆盖默认值（1 → 2，每两周一次）
  "biweekly_interval": 2
}
```

**重要说明：**
- Assignment 级别的配置可以覆盖 Offering 的默认配置
- Assignment 级别**不包含**具体的时间（start_date, end_date, start_time, end_time），因为这些是 Instance 级别的
- Assignment 可以针对特定的 franchise/program/location 设置不同的配置

### 3.4 扩展 `course_instances` 表（添加类型特定配置）

```sql
ALTER TABLE course_instances 
  ADD COLUMN instance_config JSONB DEFAULT '{}';
```

**`instance_config` JSONB 字段示例：**
```json
// Course Instance 配置
{
  "total_sessions": 8,            // 覆盖 Assignment 的配置（12 → 8）
  "session_number": 1,           // 当前是第几课（用于进度跟踪）
  "weekly_frequency": 1,         // 保持或覆盖
  "duration_hours": 1.5          // 保持或覆盖
}

// Workshop Instance 配置
{
  "drop_in_available": true,     // 是否接受 drop-in
  "drop_in_price": 60.00,        // 覆盖 Assignment 的配置（55 → 60）
  "multipass_available": true,    // 是否接受 multipass
  "weekly_frequency": 1,         // 覆盖 Assignment 的配置（2 → 1，改回每周一次）
  "biweekly_interval": null,     // 因为改为每周一次，不需要 biweekly
  "rrule_pattern": "FREQ=WEEKLY;BYDAY=TU"  // 自动生成的 RRULE
}

// Camp Instance 配置
{
  "camp_duration_days": 7,        // 覆盖 Assignment 的配置（5 → 7）
  "daily_schedule": {             // 覆盖默认时间表
    "start_time": "08:00",        // 覆盖默认 09:00
    "end_time": "16:00"           // 覆盖默认 15:00
  }
}
```

**重要说明：**
- Instance 级别的配置可以覆盖 Assignment 的配置
- Instance 级别包含**具体的时间**（`start_date`, `end_date`, `start_time`, `end_time`），这些字段在 `course_instances` 表中
- Instance 可以根据 franchise 的具体情况设置不同的时间安排
- 配置获取优先级：`instance_config` > `assignment_config` > `type_config`

### 3.5 新增表：Workshop 购买和出勤记录

#### 3.5.1 `workshop_drop_in_purchases`（一次性 drop-in 购买）

```sql
CREATE TABLE workshop_drop_in_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES course_instances(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES course_assignments(id) ON DELETE CASCADE,
  price DECIMAL(10, 2) NOT NULL,             -- 单次购买价格
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_transaction_id TEXT,               -- 支付交易 ID
  stripe_checkout_session_id TEXT,          -- Stripe checkout session ID
  stripe_payment_intent_id TEXT,            -- Stripe payment intent ID
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'attended', 'no_show')),
  enrolled_at TIMESTAMP WITH TIME ZONE,      -- 确认参加时间
  attended_at TIMESTAMP WITH TIME ZONE,      -- 实际出勤时间
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**说明：**
- 用户为某个特定的 Workshop Instance 购买一次性 drop-in
- 购买后立即支付，价格是单次价格
- 可以取消（根据取消政策退款）

#### 3.5.2 `workshop_multipass_purchases`（Multipass 套餐购买）

```sql
CREATE TABLE workshop_multipass_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES course_assignments(id) ON DELETE CASCADE,
  sessions_purchased INTEGER NOT NULL,        -- 购买的次数（如 5次、10次）
  sessions_used INTEGER DEFAULT 0,            -- 已使用的次数（用于记录和验证）
  sessions_remaining INTEGER NOT NULL,        -- 剩余可用次数（sessions_purchased - sessions_used）
  total_price DECIMAL(10, 2) NOT NULL,        -- 套餐总价
  price_per_session DECIMAL(10, 2),          -- 每次平均价格（用于显示）
  validity_start_date DATE NOT NULL,          -- 有效期开始日期
  validity_end_date DATE NOT NULL,            -- 有效期结束日期
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_transaction_id TEXT,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'used_up', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 约束：确保数据一致性
  CHECK (sessions_used >= 0),
  CHECK (sessions_remaining >= 0),
  CHECK (sessions_purchased = sessions_used + sessions_remaining)
);
```

**说明：**
- 用户预先购买一个 multipass 套餐（如 5次、10次）
- 购买后立即支付套餐总价
- 可以在有效期内多次使用，每次使用扣除一次
- 可以用于该 Assignment 下的任意 Workshop Instance
- `sessions_used` 记录已使用的次数，`sessions_remaining` 记录剩余次数
- 通过约束确保：`sessions_purchased = sessions_used + sessions_remaining`

#### 3.5.3 `workshop_attendances`（Workshop 出勤记录）

```sql
CREATE TABLE workshop_attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES course_instances(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES course_assignments(id) ON DELETE CASCADE,
  
  -- 参加方式
  attendance_type TEXT NOT NULL CHECK (attendance_type IN (
    'full_enrollment',  -- 完整注册（类似 Course 的 enrollment）
    'drop_in',          -- 一次性 drop-in 购买
    'multipass'         -- 使用 multipass
  )),
  
  -- 关联记录
  enrollment_id UUID REFERENCES course_enrollments(id) ON DELETE SET NULL,  -- 如果是 full_enrollment
  drop_in_purchase_id UUID REFERENCES workshop_drop_in_purchases(id) ON DELETE SET NULL,  -- 如果是 drop-in
  multipass_id UUID REFERENCES workshop_multipass_purchases(id) ON DELETE SET NULL,  -- 如果是 multipass
  
  -- 价格记录
  price_paid DECIMAL(10, 2),              -- 实际支付的价格（用于记录）
  
  -- 出勤状态
  status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'attended', 'no_show', 'cancelled')),
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  -- 注册/预订时间
  attended_at TIMESTAMP WITH TIME ZONE,   -- 实际出勤时间
  cancelled_at TIMESTAMP WITH TIME ZONE, -- 取消时间
  
  notes TEXT,                             -- 备注
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 确保每种类型只能有一条记录
  UNIQUE(user_id, instance_id, attendance_type, drop_in_purchase_id),
  UNIQUE(user_id, instance_id, attendance_type, multipass_id)
);
```

**说明：**
- 记录用户参加 Workshop Instance 的方式和状态
- 支持三种参加方式：完整注册、一次性 drop-in、使用 multipass
- 可以跟踪出勤状态（已注册、已出勤、未出勤、已取消）

## 4. 业务逻辑设计

### 4.1 Offering 创建流程

1. **选择 Offering 类型**
   - 在创建 Offering 时，首先选择类型（course, camp, workshop, etc.）
   - 根据类型显示不同的配置表单

2. **填写类型特定配置（默认值）**
   - **Course**: 
     - 默认总课次数（如 10 次）
     - 默认每周频率（默认 1）
     - 默认每次课程时长（如 1.5 小时）
     - ⚠️ **不包含**具体时间（时间在 Instance 级别设置）
   
   - **Workshop**: 
     - 是否支持 drop-in
     - 默认 drop-in 价格
     - 是否支持 multipass
     - Multipass 套餐选项
     - 默认每周频率（1 或 2）
     - ⚠️ **不包含**具体时间
   
   - **Camp**: 
     - 默认持续天数（如 5 天）
     - 默认每日时间表（如 09:00-15:00）
     - ⚠️ **不包含**具体日期（日期在 Instance 级别设置）
   
   - **其他类型**: 根据各自需求填写默认配置

3. **保存到 `type_config` JSONB 字段**

**重要原则：**
- Offering 是全局默认配置，不包含具体的时间或日期
- 所有时间相关的配置都在 Instance 级别，因为不同 franchise 的时间安排不同

### 4.2 Assignment 创建流程

1. **选择 Offering**
   - 系统显示该 Offering 的类型和默认配置
   - 显示可覆盖的配置项

2. **配置 Assignment 级别覆盖（可选）**
   - 可以覆盖 Offering 的默认配置
   - 例如：
     - Course: 覆盖默认课次数（10 → 12）
     - Workshop: 覆盖 drop-in 价格（50 → 55）
     - Camp: 覆盖默认持续天数（5 → 7）
   - 配置保存到 `assignment_config` JSONB 字段
   - ⚠️ **不包含**具体时间（时间在 Instance 级别设置）

3. **特殊处理：Workshop Assignment**
   - 如果 Workshop 支持 drop-in，可以配置：
     - `drop_in_enabled`: true/false
     - `drop_in_price`: 单次价格（覆盖 Offering 默认价格）
     - `multipass_enabled`: true/false
     - `multipass_options`: 覆盖或添加套餐选项
     - `weekly_frequency`: 1（每周）或 2（每两周）

**使用场景：**
- 同一个 Offering 在不同 franchise/program 可能需要不同的配置
- 例如：Bellevue 的 Course 是 10 次课，Issaquah 的 Course 是 12 次课

### 4.3 Instance 创建流程

#### 4.3.1 Course Instance

**必填字段（在 `course_instances` 表中）：**
- `start_date`, `end_date` - **具体日期**（根据 franchise 安排）
- `start_time`, `end_time` - **具体时间**（根据 franchise 安排）

**配置字段（在 `instance_config` JSONB 中，可覆盖）：**
- `total_sessions`: 从 `assignment_config` 或 `type_config` 获取，可以覆盖
- `weekly_frequency`: 从 `assignment_config` 或 `type_config` 获取，可以覆盖
- `duration_hours`: 从 `assignment_config` 或 `type_config` 获取，可以覆盖

**自动生成：**
- `icalendar_rrule`: `FREQ=WEEKLY;BYDAY=TU` (根据选择的星期几)
- 根据 `total_sessions` 和 `weekly_frequency` 计算实际的 `end_date`（如果未手动设置）

**配置示例：**
```json
{
  "total_sessions": 8,           // 覆盖 Assignment 的 12 次，改为 8 次
  "weekly_frequency": 1,         // 保持每周一次
  "duration_hours": 2.0,        // 覆盖默认 1.5 小时，改为 2 小时
  "session_number": 1           // 初始为1，每次上课后递增
}
```

**时间配置说明：**
- `start_date`, `end_date`, `start_time`, `end_time` 在 `course_instances` 表中，不在 JSONB 配置中
- 这些时间字段是 Instance 级别的，因为不同 franchise 的时间安排不同

#### 4.3.2 Workshop Instance

**必填字段（在 `course_instances` 表中）：**
- `start_date`, `end_date` - **具体日期**（根据 franchise 安排）
- `start_time`, `end_time` - **具体时间**（根据 franchise 安排）

**配置字段（在 `instance_config` JSONB 中，可覆盖）：**
- `weekly_frequency`: 从 `assignment_config` 或 `type_config` 获取，可以覆盖
- `drop_in_available`: true/false（是否接受 drop-in）
- `drop_in_price`: 从 `assignment_config` 或 `type_config` 获取，可以覆盖
- `multipass_available`: true/false（是否接受 multipass）

**自动生成：**
- 如果 `weekly_frequency = 1`: `FREQ=WEEKLY;BYDAY=TU`
- 如果 `weekly_frequency = 2`: `FREQ=WEEKLY;INTERVAL=2;BYDAY=TU`
- `rrule_pattern`: 根据 `weekly_frequency` 和选择的星期几自动生成

**配置示例：**
```json
{
  "drop_in_available": true,
  "drop_in_price": 60.00,        // 覆盖 Assignment 的 55，改为 60
  "multipass_available": true,
  "weekly_frequency": 1,         // 覆盖 Assignment 的 2，改回每周一次
  "biweekly_interval": null,     // 因为改为每周一次，不需要
  "rrule_pattern": "FREQ=WEEKLY;BYDAY=TU"  // 自动生成
}
```

**时间配置说明：**
- 时间字段在 `course_instances` 表中，不在 JSONB 配置中
- 每个 Instance 可以根据 franchise 的具体情况设置不同的时间

#### 4.3.3 Camp Instance

**必填字段（在 `course_instances` 表中）：**
- `start_date`, `end_date` - **具体日期**（根据 franchise 安排）
- `start_time`, `end_time` - **每日开始和结束时间**（根据 franchise 安排）

**配置字段（在 `instance_config` JSONB 中，可覆盖）：**
- `camp_duration_days`: 从 `assignment_config` 或 `type_config` 获取，可以覆盖
- `daily_schedule`: 从 `assignment_config` 或 `type_config` 获取，可以覆盖（但实际时间在 `course_instances` 表中）

**配置示例：**
```json
{
  "camp_duration_days": 7,       // 覆盖 Assignment 的 5 天，改为 7 天
  "daily_schedule": {             // 参考配置（实际时间在 course_instances 表中）
    "start_time": "08:00",        // 覆盖默认 09:00
    "end_time": "16:00"           // 覆盖默认 15:00
  }
}
```

**时间配置说明：**
- `start_date`, `end_date` 在 `course_instances` 表中
- `start_time`, `end_time` 在 `course_instances` 表中，表示每日的时间
- `instance_config.daily_schedule` 只是参考配置，实际使用 `course_instances` 表中的时间

#### 4.3.4 其他类型 Instance

- **Free Trial**: 通常是一次性的，不需要重复规则
- **Gift Card**: 不需要 instance，直接购买和激活
- **Care Service**: 按需预订，每次创建一个 instance
- **Lunch Service**: 通常与 Camp Instance 关联，检查 `requires_camp_enrollment`

### 4.4 Workshop 购买和使用流程

#### 4.4.1 一次性 Drop-in 购买流程

**用户操作：**
1. 浏览 Workshop Instance 列表
2. 选择想要参加的某个 Workshop Instance
3. 点击"购买 Drop-in"按钮
4. 系统显示单次价格（从 `instance_config` → `assignment_config` → `type_config` 获取）
5. 用户确认并支付
6. 创建 `workshop_drop_in_purchases` 记录
7. 创建 `workshop_attendances` 记录（`attendance_type = 'drop_in'`）
8. 支付成功后，用户获得参加该 Instance 的资格

**特点：**
- ✅ 即时购买即时使用
- ✅ 每次参加支付单次价格
- ✅ 只能用于购买的特定 Instance
- ✅ 可以取消（根据取消政策退款）

**数据流：**
```
用户选择 Instance → 创建 drop_in_purchase → 支付 → 创建 attendance 记录
```

#### 4.4.2 Multipass 套餐购买流程

**用户操作：**
1. 浏览 Workshop Assignment（不是 Instance）
2. 查看可用的 Multipass 套餐选项（5次、10次等）
3. 选择想要购买的套餐（如 5次套餐，总价 $200）
4. 系统显示套餐详情：
   - 总次数：5次
   - 总价：$200
   - 每次平均价格：$40（比单次 $50 更优惠）
   - 有效期：60天
5. 用户确认并支付套餐总价
6. 创建 `workshop_multipass_purchases` 记录
7. 支付成功后，用户获得该 Assignment 下的 multipass 资格

**特点：**
- ✅ 预先购买多次（套餐）
- ✅ 价格比单次购买更优惠
- ✅ 可以在有效期内用于该 Assignment 下的任意 Workshop Instance
- ✅ 每次使用时扣除一次，直到用完或过期

**数据流：**
```
用户选择 Assignment → 选择 Multipass 套餐 → 支付 → 创建 multipass_purchase 记录
```

#### 4.4.3 使用 Multipass 参加 Workshop Instance

**用户操作：**
1. 浏览 Workshop Instance 列表
2. 选择想要参加的某个 Workshop Instance
3. 如果用户有该 Assignment 的有效 Multipass：
   - 显示"使用 Multipass 参加"选项
   - 显示剩余次数（如"剩余 3 次"）
4. 用户确认使用 Multipass
5. 系统检查：
   - Multipass 是否有效（未过期、未用完）
   - Multipass 是否属于该 Assignment
6. 创建 `workshop_attendances` 记录（`attendance_type = 'multipass'`，关联 `multipass_id`）
7. 更新 `workshop_multipass_purchases`：
   - `sessions_used` 加 1
   - `sessions_remaining` 减 1
   - `updated_at` 更新为当前时间
8. 如果 `sessions_remaining = 0`，更新状态为 `'used_up'`

**数据更新示例：**
```sql
-- 初始状态（购买 5次套餐）
sessions_purchased: 5
sessions_used: 0
sessions_remaining: 5
status: 'active'

-- 使用一次后
sessions_purchased: 5
sessions_used: 1
sessions_remaining: 4
status: 'active'

-- 使用完所有次数后
sessions_purchased: 5
sessions_used: 5
sessions_remaining: 0
status: 'used_up'
```

**特点：**
- ✅ 无需再次支付
- ✅ 使用预先购买的次数
- ✅ 自动扣除剩余次数
- ✅ 可以用于该 Assignment 下的任意 Instance

**数据流：**
```
用户选择 Instance → 检查有效 Multipass → 创建 attendance 记录 → 更新 multipass 剩余次数
```

#### 4.4.4 完整注册（Full Enrollment）流程

**用户操作：**
1. 浏览 Workshop Instance 列表
2. 选择想要完整注册的 Workshop Instance
3. 点击"完整注册"按钮（类似 Course 的注册）
4. 系统创建 `course_enrollments` 记录（`status = 'enrolled'`）
5. 创建 `workshop_attendances` 记录（`attendance_type = 'full_enrollment'`）
6. 用户支付完整注册费用

**特点：**
- ✅ 类似 Course 的完整注册
- ✅ 用户承诺参加整个 Workshop 系列
- ✅ 价格可能比 drop-in 或 multipass 更优惠

**数据流：**
```
用户选择 Instance → 创建 enrollment → 支付 → 创建 attendance 记录
```

#### 4.4.5 配置覆盖机制和优先级

**配置获取优先级（从高到低）：**
1. `instance_config`（Instance 级别，最高优先级）
2. `assignment_config`（Assignment 级别）
3. `type_config`（Offering 默认配置，最低优先级）

**配置覆盖示例：**

**1. 价格配置（Drop-in 价格）：**
- Offering 默认：`type_config.drop_in_price = 50.00`
- Assignment 覆盖：`assignment_config.drop_in_price = 55.00`
- Instance 覆盖：`instance_config.drop_in_price = 60.00`
- **最终使用**：$60.00（Instance 级别）

**2. 课次数配置（Course）：**
- Offering 默认：`type_config.default_session_count = 10`
- Assignment 覆盖：`assignment_config.session_count = 12`
- Instance 覆盖：`instance_config.total_sessions = 8`
- **最终使用**：8 次（Instance 级别）

**3. 时间配置（重要）：**
- ⚠️ **时间字段不在 JSONB 配置中**
- `start_date`, `end_date`, `start_time`, `end_time` 在 `course_instances` 表中
- 每个 Instance 根据 franchise 的具体情况设置不同的时间
- Offering 和 Assignment 级别**不包含**时间配置

**Multipass 选项获取顺序：**
1. `assignment_config.multipass_options`（Assignment 级别）
2. `type_config.multipass_options`（Offering 默认选项）

**用户界面显示：**
- 对于每个 Workshop Instance，显示：
  - 单次 Drop-in 价格：根据优先级获取（Instance → Assignment → Offering）
  - 如果有有效 Multipass：显示"使用 Multipass（剩余 X 次）"
  - 完整注册价格（如果有）

**配置覆盖的使用场景：**
- **Offering 级别**：全局默认配置，适用于大多数情况
- **Assignment 级别**：针对特定 franchise/program/location 的配置调整
  - 例如：Bellevue 的 Course 是 12 次，Issaquah 的 Course 是 10 次
- **Instance 级别**：针对特定 Instance 的最终配置调整
  - 例如：某个 Instance 因为特殊情况需要调整课次数或价格
  - 时间配置：每个 Instance 根据 franchise 的具体安排设置

#### 4.4.6 出勤跟踪和 Multipass 使用记录

**三种参加方式的出勤记录：**
1. **Full Enrollment**: 通过 `course_enrollments` 和 `workshop_attendances` 跟踪
2. **Drop-in**: 通过 `workshop_drop_in_purchases` 和 `workshop_attendances` 跟踪
3. **Multipass**: 通过 `workshop_multipass_purchases` 和 `workshop_attendances` 跟踪

**出勤状态更新：**
- 上课前：`status = 'registered'`
- 上课后：`status = 'attended'`，更新 `attended_at`
- 未出勤：`status = 'no_show'`
- 取消：`status = 'cancelled'`，更新 `cancelled_at`

**Multipass 使用记录和次数更新：**

**1. 使用 Multipass 参加 Workshop（创建 attendance 时）：**
- 创建 `workshop_attendances` 记录（`attendance_type = 'multipass'`，`multipass_id` 关联）
- 更新 `workshop_multipass_purchases`：
  - `sessions_used` 加 1
  - `sessions_remaining` 减 1
  - 如果 `sessions_remaining = 0`，更新 `status = 'used_up'`

**2. 取消出勤（如果允许恢复次数）：**
- 更新 `workshop_attendances.status = 'cancelled'`
- 如果取消政策允许恢复次数：
  - `sessions_used` 减 1
  - `sessions_remaining` 加 1
  - 如果之前是 `'used_up'`，更新 `status = 'active'`

**3. 查询 Multipass 使用历史：**
```sql
-- 查询某个 Multipass 的所有使用记录
SELECT 
  wa.*,
  ci.start_date,
  ci.start_time,
  ci.end_time,
  ci.location_id,
  cl.name as location_name
FROM workshop_attendances wa
JOIN course_instances ci ON wa.instance_id = ci.id
LEFT JOIN course_locations cl ON ci.location_id = cl.id
WHERE wa.multipass_id = :multipass_id
  AND wa.attendance_type = 'multipass'
ORDER BY wa.registered_at DESC;
```

**4. 查询 Multipass 当前状态：**
```sql
-- 查询用户的所有有效 Multipass 及其使用情况
SELECT 
  mp.*,
  o.name as offering_name,
  ca.series_id,
  cs.display_name as series_name,
  -- 计算使用率
  ROUND((mp.sessions_used::DECIMAL / mp.sessions_purchased) * 100, 2) as usage_percentage,
  -- 计算剩余天数
  (mp.validity_end_date - CURRENT_DATE) as days_remaining
FROM workshop_multipass_purchases mp
JOIN course_assignments ca ON mp.assignment_id = ca.id
JOIN offerings o ON ca.course_id = o.id
JOIN course_series cs ON ca.series_id = cs.id
WHERE mp.user_id = :user_id
  AND mp.status = 'active'
  AND mp.payment_status = 'paid'
  AND mp.validity_end_date >= CURRENT_DATE
ORDER BY mp.created_at DESC;
```

**5. 数据一致性保证：**
- 使用数据库约束确保：`sessions_purchased = sessions_used + sessions_remaining`
- 使用触发器或应用层逻辑确保每次创建/取消 attendance 时正确更新次数
- 定期检查数据一致性（通过定时任务）

### 4.5 多子女数据模型设计

#### 4.5.1 方案选择：独立的 Children 表（推荐）

**问题：**
- 用户有多个孩子
- 需要为不同的孩子购买相同的课程
- 需要支持多子女折扣

**方案对比：**

**方案 A：扩展 users 表（不推荐）**
```sql
-- 在 users 表中添加字段
ALTER TABLE users ADD COLUMN parent_user_id UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN is_child BOOLEAN DEFAULT FALSE;
```

**缺点：**
- ❌ 用户和孩子混在一起，难以管理
- ❌ 孩子长大后需要成为独立用户时，数据迁移复杂
- ❌ 无法存储孩子的特定信息（年龄、年级、特殊需求等）
- ❌ 查询和统计复杂

**方案 B：独立的 children 表（推荐）**
```sql
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date_of_birth DATE,
  age INTEGER,
  grade_level TEXT,
  -- ... 其他字段
);
```

**优点：**
- ✅ 清晰的实体分离：用户（parent）和孩子是不同的实体
- ✅ 灵活扩展：孩子可能有自己的信息（年龄、年级、特殊需求等）
- ✅ 未来兼容：孩子长大后可以成为独立用户，不影响历史数据
- ✅ 易于管理：可以独立管理孩子的信息
- ✅ 支持多对多：一个用户可以有多个孩子，一个孩子可能关联多个监护人

#### 4.5.2 数据模型设计

**创建 `children` 表：**
```sql
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- 关联到父/母用户
  name TEXT NOT NULL,                    -- 孩子姓名
  date_of_birth DATE,                     -- 出生日期（用于计算年龄）
  age INTEGER,                            -- 年龄（冗余字段，可以从 date_of_birth 计算）
  grade_level TEXT,                       -- 年级（如 'K-2', '3-4', '5-6'）
  gender TEXT,                            -- 性别（可选）
  special_needs TEXT,                     -- 特殊需求（可选）
  emergency_contact_name TEXT,             -- 紧急联系人姓名
  emergency_contact_phone TEXT,           -- 紧急联系人电话
  medical_notes TEXT,                     -- 医疗注意事项（可选）
  is_active BOOLEAN DEFAULT TRUE,         -- 是否激活（可以"归档"已长大的孩子）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_children_parent_user_id ON children(parent_user_id);
CREATE INDEX idx_children_is_active ON children(is_active);
```

**扩展相关表以支持 child_id：**

```sql
-- 1. course_enrollments 表
-- ⚠️ child_id 为 NOT NULL，因为用户一般都是家长，必须指定孩子
ALTER TABLE course_enrollments 
  ADD COLUMN child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE;

CREATE INDEX idx_course_enrollments_child_id ON course_enrollments(child_id);

-- 2. workshop_drop_in_purchases 表
ALTER TABLE workshop_drop_in_purchases 
  ADD COLUMN child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE;

CREATE INDEX idx_workshop_drop_in_purchases_child_id ON workshop_drop_in_purchases(child_id);

-- 3. workshop_multipass_purchases 表
ALTER TABLE workshop_multipass_purchases 
  ADD COLUMN child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE;

CREATE INDEX idx_workshop_multipass_purchases_child_id ON workshop_multipass_purchases(child_id);

-- 4. workshop_attendances 表
ALTER TABLE workshop_attendances 
  ADD COLUMN child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE;

CREATE INDEX idx_workshop_attendances_child_id ON workshop_attendances(child_id);
```

**重要变更说明：**
- ✅ `child_id` 改为 `NOT NULL`：因为系统的用户一般都是家长，购买时必须指定孩子
- ✅ 外键约束改为 `ON DELETE CASCADE`：如果删除孩子，相关的注册和购买记录也会被删除
- ⚠️ 如果未来需要支持用户为自己购买（如成人课程），可以考虑：
  - 方案 A：创建一个"虚拟孩子"记录（`is_virtual = TRUE`）
  - 方案 B：允许 `child_id` 为 NULL，但需要额外的业务逻辑判断

#### 4.5.3 数据关系图

```
users (parent/guardian)
  ↓ (1:N)
children
  ↓ (1:N)
course_enrollments
  ├── user_id → users.id
  └── child_id → children.id

workshop_drop_in_purchases
  ├── user_id → users.id
  └── child_id → children.id

workshop_multipass_purchases
  ├── user_id → users.id
  └── child_id → children.id

workshop_attendances
  ├── user_id → users.id
  └── child_id → children.id
```

**重要说明：**
- `user_id` 始终存在（支付和账户管理）
- `child_id` **必需（NOT NULL）**：因为系统的用户一般都是家长，购买时必须指定孩子
- 系统会在创建 enrollment 时验证孩子的年龄是否符合课程的年龄要求
- 如果年龄不符合，不能创建 enrollment

#### 4.5.4 多子女折扣计算逻辑

**检查用户是否有多个孩子的相同课程注册：**
```sql
-- 检查用户是否有其他孩子的相同 Offering 注册（用于多子女折扣）
SELECT 
  COUNT(DISTINCT ce.child_id) as child_count,
  ARRAY_AGG(DISTINCT ce.child_id) as child_ids,
  ARRAY_AGG(DISTINCT c.name) as child_names
FROM course_enrollments ce
LEFT JOIN children c ON ce.child_id = c.id
WHERE ce.user_id = :user_id
  AND ce.instance_id IN (
    SELECT id FROM course_instances
    WHERE assignment_id IN (
      SELECT id FROM course_assignments
      WHERE course_id = :course_id  -- 相同的 Offering
    )
  )
  AND ce.status IN ('cart', 'reserved', 'enrolled')
  AND ce.child_id IS NOT NULL
GROUP BY ce.user_id;
```

**或者更精确的查询（检查是否为同一个 Assignment）：**
```sql
-- 检查用户是否有其他孩子的相同 Assignment 注册
SELECT 
  COUNT(DISTINCT ce.child_id) as child_count,
  -- 按 child_id 分组，获取每个孩子的注册信息
  json_agg(
    json_build_object(
      'child_id', ce.child_id,
      'child_name', c.name,
      'enrollment_id', ce.id,
      'enrollment_status', ce.status
    )
  ) as children_enrollments
FROM course_enrollments ce
LEFT JOIN children c ON ce.child_id = c.id
JOIN course_instances ci ON ce.instance_id = ci.id
WHERE ce.user_id = :user_id
  AND ci.assignment_id = :assignment_id  -- 相同的 Assignment
  AND ce.status IN ('cart', 'reserved', 'enrolled')
  AND ce.child_id IS NOT NULL
GROUP BY ce.user_id;
```

#### 4.5.5 年龄验证逻辑

**业务规则：**
1. 系统的用户一般都是家长，他们的年龄不能参加这些课程
2. 当家长购买 instance 时，**必须**将 instance 分配给某个孩子
3. 系统需要验证孩子的年龄是否符合课程的年龄要求
4. 如果不符合，不能创建 enrollment

**年龄验证流程：**

**1. 获取课程的年龄要求：**
```sql
-- 从 offering 获取年龄范围（可能有 override）
SELECT 
  COALESCE(
    ci.instance_config->>'target_age_min',  -- Instance 级别覆盖
    ca.assignment_config->>'target_age_min',  -- Assignment 级别覆盖
    o.type_config->>'target_age_min'  -- Offering 默认
  ) as target_age_min,
  COALESCE(
    ci.instance_config->>'target_age_max',
    ca.assignment_config->>'target_age_max',
    o.type_config->>'target_age_max'
  ) as target_age_max
FROM course_instances ci
JOIN course_assignments ca ON ci.assignment_id = ca.id
JOIN offerings o ON ca.course_id = o.id
WHERE ci.id = :instance_id;
```

**2. 获取孩子的年龄：**
```sql
-- 从 children 表获取孩子的年龄
SELECT 
  id,
  name,
  date_of_birth,
  age,
  -- 计算实际年龄（基于当前日期和出生日期）
  EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth)) as calculated_age
FROM children
WHERE id = :child_id
  AND parent_user_id = :user_id  -- 确保是用户的孩子
  AND is_active = TRUE;
```

**3. 年龄验证逻辑（应用层）：**
```typescript
// 伪代码
function validateChildAge(child: Child, offering: Offering): ValidationResult {
  const childAge = child.age || calculateAge(child.date_of_birth);
  const minAge = offering.target_age_min || 0;
  const maxAge = offering.target_age_max || 999;
  
  if (childAge < minAge) {
    return {
      valid: false,
      error: `孩子年龄 ${childAge} 岁小于课程要求的最小年龄 ${minAge} 岁`
    };
  }
  
  if (childAge > maxAge) {
    return {
      valid: false,
      error: `孩子年龄 ${childAge} 岁大于课程要求的最大年龄 ${maxAge} 岁`
    };
  }
  
  return { valid: true };
}
```

**4. 创建 Enrollment 时的验证：**
```sql
-- 在创建 enrollment 之前，先验证年龄
-- 如果验证失败，返回错误，不创建 enrollment

-- 验证通过后，创建 enrollment
INSERT INTO course_enrollments (user_id, instance_id, child_id, status, ...)
VALUES (:user_id, :instance_id, :child_id, 'cart', ...);
```

**5. API 端点设计：**
```typescript
// POST /api/enrollments
// 请求体：
{
  instance_id: string,
  child_id: string
}

// 验证流程：
// 1. 验证 child_id 属于当前用户
// 2. 获取 instance 的年龄要求
// 3. 获取孩子的年龄
// 4. 验证年龄是否符合要求
// 5. 获取课程的先导课程要求
// 6. 获取孩子已完成的课程
// 7. 验证孩子是否完成了所有先导课程
// 8. 如果都符合，创建 enrollment
// 9. 如果不符合，返回 400 错误

// 响应（成功）：
{
  enrollment_id: string,
  status: 'cart'
}

// 响应（失败 - 年龄不符合）：
{
  error: 'AGE_VALIDATION_FAILED',
  message: '孩子年龄不符合课程要求',
  details: {
    child_age: 5,
    required_min_age: 6,
    required_max_age: 12
  }
}

// 响应（失败 - 先导课程不符合）：
{
  error: 'PREREQUISITE_VALIDATION_FAILED',
  message: '孩子未完成必需的先导课程',
  details: {
    missing_prerequisites: [
      {
        course_id: 'xxx',
        course_name: '基础编程课程',
        requirement_type: 'required'
      }
    ]
  }
}
```

#### 4.5.6 使用场景示例

**场景 1：用户为孩子 A 购买（年龄符合）**
```sql
-- 1. 验证年龄
-- 孩子年龄：8 岁
-- 课程要求：6-12 岁
-- ✅ 验证通过

-- 2. 创建 enrollment
INSERT INTO course_enrollments (user_id, instance_id, child_id, status, ...)
VALUES (:user_id, :instance_id, :child_a_id, 'cart', ...);
```

**场景 2：用户为孩子 B 购买（年龄不符合）**
```sql
-- 1. 验证年龄
-- 孩子年龄：4 岁
-- 课程要求：6-12 岁
-- ❌ 验证失败：年龄小于最小要求

-- 2. 返回错误，不创建 enrollment
-- 错误信息：孩子年龄 4 岁小于课程要求的最小年龄 6 岁
```

**场景 3：用户为孩子 C 购买相同课程（年龄符合，触发多子女折扣）**
```sql
-- 1. 验证年龄
-- 孩子年龄：10 岁
-- 课程要求：6-12 岁
-- ✅ 验证通过

-- 2. 检查是否已有其他孩子的注册
SELECT COUNT(DISTINCT child_id) FROM course_enrollments
WHERE user_id = :user_id
  AND instance_id IN (SELECT id FROM course_instances WHERE assignment_id = :assignment_id)
  AND status IN ('cart', 'reserved', 'enrolled');
-- 结果：1（孩子 A）

-- 3. 创建孩子 C 的注册
INSERT INTO course_enrollments (user_id, instance_id, child_id, status, ...)
VALUES (:user_id, :instance_id, :child_c_id, 'cart', ...);

-- 4. 应用多子女折扣（第二个孩子 10% 折扣）
-- 折扣逻辑在折扣计算流程中处理
```

**场景 4：用户为孩子 D 购买（年龄符合，但先导课程不符合）**
```sql
-- 1. 验证年龄
-- 孩子年龄：9 岁
-- 课程要求：6-12 岁
-- ✅ 验证通过

-- 2. 验证先导课程
-- 目标课程：高级编程课程
-- 必需先导课程：
--   - 基础编程课程（course_id: 'xxx'）
--   - 数据结构入门（course_id: 'yyy'）

-- 3. 获取孩子已完成的课程
SELECT DISTINCT ca.course_id
FROM course_enrollments ce
JOIN course_instances ci ON ce.instance_id = ci.id
JOIN course_assignments ca ON ci.assignment_id = ca.id
WHERE ce.child_id = :child_d_id
  AND ce.status = 'completed';
-- 结果：只有 'xxx'（基础编程课程）

-- 4. 检查缺失的先导课程
-- 缺失：'yyy'（数据结构入门）
-- ❌ 验证失败：未完成必需的先导课程

-- 5. 返回错误，不创建 enrollment
-- 错误信息：孩子未完成必需的先导课程 - 数据结构入门
```

**场景 5：用户为孩子 E 购买（年龄和先导课程都符合）**
```sql
-- 1. 验证年龄
-- 孩子年龄：11 岁
-- 课程要求：6-12 岁
-- ✅ 验证通过

-- 2. 验证先导课程
-- 目标课程：高级编程课程
-- 必需先导课程：
--   - 基础编程课程（course_id: 'xxx'）
--   - 数据结构入门（course_id: 'yyy'）

-- 3. 获取孩子已完成的课程
SELECT DISTINCT ca.course_id
FROM course_enrollments ce
JOIN course_instances ci ON ce.instance_id = ci.id
JOIN course_assignments ca ON ci.assignment_id = ca.id
WHERE ce.child_id = :child_e_id
  AND ce.status = 'completed';
-- 结果：'xxx' 和 'yyy'（两个先导课程都已完成）

-- 4. 检查缺失的先导课程
-- 缺失：无
-- ✅ 验证通过：已完成所有必需先导课程

-- 5. 创建 enrollment
INSERT INTO course_enrollments (user_id, instance_id, child_id, status, ...)
VALUES (:user_id, :instance_id, :child_e_id, 'cart', ...);
```

#### 4.5.7 查询示例

**查询用户的所有孩子及其注册情况：**
```sql
SELECT 
  c.*,
  COUNT(ce.id) as total_enrollments,
  COUNT(CASE WHEN ce.status = 'enrolled' THEN 1 END) as active_enrollments
FROM children c
LEFT JOIN course_enrollments ce ON c.id = ce.child_id
WHERE c.parent_user_id = :user_id
  AND c.is_active = TRUE
GROUP BY c.id
ORDER BY c.created_at;
```

**查询某个孩子的所有注册：**
```sql
SELECT 
  ce.*,
  ci.start_date,
  ci.start_time,
  o.name as offering_name,
  cs.display_name as series_name
FROM course_enrollments ce
JOIN course_instances ci ON ce.instance_id = ci.id
JOIN course_assignments ca ON ci.assignment_id = ca.id
JOIN offerings o ON ca.course_id = o.id
JOIN course_series cs ON ca.series_id = cs.id
WHERE ce.child_id = :child_id
ORDER BY ci.start_date DESC;
```

## 5. UI/UX 设计思路

### 5.1 Offering 创建/编辑表单

**动态表单根据类型显示：**

1. **Course 类型**:
   - 总课次数 (session_count)
   - 每周频率 (weekly_frequency, 默认1)

2. **Workshop 类型**:
   - 是否支持 drop-in (supports_drop_in)
   - 单次 drop-in 价格 (drop_in_price)
   - 是否支持 multipass (supports_multipass)
   - Multipass 选项列表（可添加多个）
   - 每周频率选项（每周一次 / 每两周一次）

3. **Camp 类型**:
   - 持续天数 (duration_days)
   - 每日时间表 (daily_schedule)

4. **其他类型**: 根据各自需求显示相应字段

### 5.2 Assignment 创建/编辑表单

1. **选择 Offering** → 显示 Offering 类型和默认配置
2. **根据 Offering 类型显示可覆盖的配置项**
   - Course: 可以覆盖总课次数、每周频率
   - Workshop: 可以覆盖 drop-in 价格、multipass 选项、每周频率
3. **保存到 `assignment_config`**

### 5.3 Instance 创建/编辑表单

1. **选择 Assignment** → 显示 Offering 类型
2. **根据类型显示不同的表单：**

   **Course Instance:**
   - 开始日期、结束日期
   - 开始时间、结束时间
   - 星期几（用于生成 RRULE）
   - 总课次数（从 assignment 或 offering 获取，可编辑）
   - 每周频率（默认1）

   **Workshop Instance:**
   - 开始日期、结束日期
   - 开始时间、结束时间
   - 星期几
   - 每周频率（每周一次 / 每两周一次）
   - 是否接受 drop-in（checkbox）
   - 是否接受 multipass（checkbox）
   - Drop-in 价格（如果启用）

   **Camp Instance:**
   - 开始日期、结束日期
   - 每日开始时间、结束时间
   - 持续天数（自动计算或手动输入）

3. **自动生成 RRULE**（根据类型和配置）

### 5.4 Workshop 用户购买界面

#### 5.4.1 Workshop Instance 详情页

**显示内容：**
1. **基本信息**
   - Workshop 名称、描述
   - 日期、时间
   - 地点
   - 剩余名额

2. **购买选项**
   - **一次性 Drop-in**
     - 价格：$50（单次）
     - 按钮："购买 Drop-in"
     - 说明：单次参加，即时支付
   
   - **使用 Multipass**（如果用户有有效 Multipass）
     - 显示：剩余 X 次
     - 按钮："使用 Multipass 参加"
     - 说明：使用预先购买的套餐
   
   - **购买 Multipass**（如果用户没有或已用完）
     - 显示可用的套餐选项：
       - 5次套餐：$200（每次 $40，节省 $50）
       - 10次套餐：$350（每次 $35，节省 $150）
     - 按钮："购买 Multipass"
     - 说明：预先购买多次，更优惠
   
   - **完整注册**（可选）
     - 价格：$XXX
     - 按钮："完整注册"
     - 说明：注册整个 Workshop 系列

#### 5.4.2 Multipass 购买页面

**显示内容：**
1. Workshop Assignment 信息
2. 可用的 Multipass 套餐选项：
   - 套餐名称（如"5次套餐"）
   - 总次数
   - 总价
   - 每次平均价格（显示优惠幅度，如"比单次购买节省 $10/次"）
   - 有效期（如"60天内有效"）
3. 用户当前的 Multipass 状态（如果有）：
   - 剩余次数
   - 有效期
   - 使用历史
4. 购买按钮

#### 5.4.3 用户 Multipass 管理页面

**显示内容：**
1. 所有有效的 Multipass 列表
2. 每个 Multipass 显示：
   - Workshop Assignment 名称
   - 购买日期
   - 总次数 / 剩余次数（进度条）
   - 有效期（剩余天数）
   - 状态（active / expired / used_up）
3. 使用历史记录：
   - 使用的 Instance 日期
   - 使用的 Instance 名称
   - 使用时间

### 5.5 Course/Instance 注册流程（年龄验证和选择孩子）

#### 5.5.1 Instance 详情页

**显示内容：**
1. **基本信息**
   - Offering 名称、描述
   - 日期、时间
   - 地点
   - **年龄要求**：显示 "适合 6-12 岁"（从 offering 配置获取）
   - 剩余名额

2. **选择孩子（必需）**
   - 下拉选择框：显示用户的所有活跃孩子
   - 每个孩子显示：
     - 姓名
     - 年龄（从 `children.age` 或 `date_of_birth` 计算）
     - 年级（如果有）
   - **实时年龄验证**：
     - 如果孩子的年龄符合要求：显示 ✅ "年龄符合要求"
     - 如果孩子的年龄不符合要求：显示 ❌ "年龄不符合要求（要求：6-12 岁）"
     - 如果孩子年龄小于最小要求：显示 ⚠️ "孩子年龄太小，需要至少 6 岁"
     - 如果孩子年龄大于最大要求：显示 ⚠️ "孩子年龄太大，最大年龄为 12 岁"

3. **注册按钮**
   - 如果选择了孩子且年龄符合：按钮可用 "添加到购物车" / "立即注册"
   - 如果未选择孩子：按钮禁用，提示 "请选择孩子"
   - 如果年龄不符合：按钮禁用，显示错误提示

#### 5.5.2 年龄验证 UI 流程

**步骤 1：用户选择 Instance**
- 显示 Instance 详情
- 显示年龄要求（如 "适合 6-12 岁"）

**步骤 2：用户选择孩子**
- 下拉选择框显示所有活跃孩子
- 每个孩子显示姓名和年龄

**步骤 3：实时验证年龄**
```typescript
// 伪代码
function validateChildForInstance(child: Child, instance: Instance) {
  const childAge = child.age || calculateAge(child.date_of_birth);
  const minAge = getMinAge(instance); // 从 offering/assignment/instance 配置获取
  const maxAge = getMaxAge(instance);
  
  if (childAge < minAge) {
    return {
      valid: false,
      message: `孩子年龄 ${childAge} 岁小于课程要求的最小年龄 ${minAge} 岁`,
      canEnroll: false
    };
  }
  
  if (childAge > maxAge) {
    return {
      valid: false,
      message: `孩子年龄 ${childAge} 岁大于课程要求的最大年龄 ${maxAge} 岁`,
      canEnroll: false
    };
  }
  
  return {
    valid: true,
    message: "年龄符合要求",
    canEnroll: true
  };
}
```

**步骤 4：显示验证结果**
- ✅ 符合：显示绿色提示，启用注册按钮
- ❌ 不符合：显示红色错误提示，禁用注册按钮

**步骤 5：验证先导课程**
- 获取目标课程的所有先导课程
- 检查孩子是否完成了所有必需先导课程
- 如果未完成，显示缺失的先导课程列表

**步骤 6：提交注册**
- 如果年龄验证通过且先导课程验证通过，创建 enrollment
- 如果任何验证失败，显示错误消息，不创建 enrollment

#### 5.5.3 错误处理和用户提示

**错误场景 1：未选择孩子**
```
错误提示："请选择要注册的孩子"
按钮状态：禁用
```

**错误场景 2：孩子年龄太小**
```
错误提示："孩子年龄 4 岁小于课程要求的最小年龄 6 岁"
按钮状态：禁用
建议操作：显示 "查看其他适合的课程" 链接
```

**错误场景 3：孩子年龄太大**
```
错误提示："孩子年龄 15 岁大于课程要求的最大年龄 12 岁"
按钮状态：禁用
建议操作：显示 "查看其他适合的课程" 链接
```

**错误场景 4：先导课程不符合**
```
错误提示："孩子未完成必需的先导课程"
缺失的先导课程列表：
  - 基础编程课程（必需）
  - 数据结构入门（必需）
按钮状态：禁用
建议操作：显示 "查看先导课程" 链接，跳转到先导课程详情页
```

**错误场景 5：API 验证失败（后端验证）**
```
错误提示："验证失败：孩子不符合注册条件"
按钮状态：禁用
操作：刷新页面或重新选择孩子
```

#### 5.5.4 孩子管理界面

**用户需要先添加孩子信息：**
1. **添加孩子表单**
   - 姓名（必需）
   - 出生日期（必需，用于计算年龄）
   - 年级（可选）
   - 性别（可选）
   - 特殊需求（可选）
   - 紧急联系人（可选）

2. **孩子列表**
   - 显示所有活跃孩子
   - 每个孩子显示：姓名、年龄、年级
   - 操作：编辑、删除（软删除，设置为 `is_active = FALSE`）

3. **年龄自动计算**
   - 基于 `date_of_birth` 自动计算年龄
   - 在注册时实时显示当前年龄

#### 5.5.5 前端验证和后端验证

**前端验证（用户体验）：**
- 实时验证，即时反馈
- 防止用户提交无效数据
- 提供友好的错误提示

**后端验证（数据安全）：**
- 必须进行后端验证，不能仅依赖前端
- 防止恶意请求绕过前端验证
- 返回详细的错误信息

**双重验证流程：**
```
用户选择孩子 → 前端验证年龄 → 显示结果
  ↓
前端验证先导课程 → 显示缺失的先导课程
  ↓
用户点击注册 → 发送请求到后端
  ↓
后端验证年龄 → 如果通过，继续
  ↓
后端验证先导课程 → 如果通过，创建 enrollment
  ↓
如果任何验证失败，返回错误，前端显示错误消息
```

**先导课程验证 UI：**
- 如果孩子已完成所有先导课程：显示 ✅ "已完成所有先导课程"
- 如果孩子未完成某些先导课程：显示 ❌ "未完成以下先导课程" + 列表
- 推荐先导课程：显示 💡 "推荐完成以下课程" + 列表（可选）

## 6. 数据查询示例

### 6.1 获取所有 Workshop Offerings

```sql
SELECT * FROM offerings 
WHERE offering_type = 'workshop' 
  AND status = 'published';
```

### 6.2 获取 Workshop Assignment 的 drop-in 配置

```sql
SELECT 
  ca.*,
  o.offering_type,
  o.type_config->>'supports_drop_in' as default_supports_drop_in,
  o.type_config->>'drop_in_price' as default_drop_in_price,
  ca.assignment_config->>'drop_in_enabled' as drop_in_enabled,
  ca.assignment_config->>'drop_in_price' as assignment_drop_in_price
FROM course_assignments ca
JOIN offerings o ON ca.course_id = o.id
WHERE o.offering_type = 'workshop'
  AND ca.id = 'assignment-uuid';
```

### 6.3 获取 Workshop Instance 的最终配置（合并 offering + assignment + instance）

```sql
SELECT 
  ci.*,
  o.offering_type,
  -- 合并配置：instance_config 优先，然后是 assignment_config，最后是 type_config
  COALESCE(
    ci.instance_config->>'drop_in_price',
    ca.assignment_config->>'drop_in_price',
    o.type_config->>'drop_in_price'
  ) as final_drop_in_price
FROM course_instances ci
JOIN course_assignments ca ON ci.assignment_id = ca.id
JOIN offerings o ON ca.course_id = o.id
WHERE ci.id = 'instance-uuid';
```

### 6.4 查询 Multipass 使用记录和剩余次数

**查询某个 Multipass 的详细使用历史：**
```sql
SELECT 
  mp.id as multipass_id,
  mp.sessions_purchased,
  mp.sessions_used,
  mp.sessions_remaining,
  mp.status as multipass_status,
  mp.validity_start_date,
  mp.validity_end_date,
  -- 使用记录
  wa.id as attendance_id,
  wa.status as attendance_status,
  wa.registered_at,
  wa.attended_at,
  wa.cancelled_at,
  -- Instance 信息
  ci.id as instance_id,
  ci.start_date,
  ci.start_time,
  ci.end_time,
  cl.name as location_name,
  o.name as offering_name
FROM workshop_multipass_purchases mp
LEFT JOIN workshop_attendances wa ON mp.id = wa.multipass_id
  AND wa.attendance_type = 'multipass'
LEFT JOIN course_instances ci ON wa.instance_id = ci.id
LEFT JOIN course_locations cl ON ci.location_id = cl.id
LEFT JOIN course_assignments ca ON mp.assignment_id = ca.id
LEFT JOIN offerings o ON ca.course_id = o.id
WHERE mp.id = :multipass_id
ORDER BY wa.registered_at DESC;
```

**查询用户的所有有效 Multipass 及其使用情况：**
```sql
SELECT 
  mp.*,
  o.name as offering_name,
  cs.display_name as series_name,
  -- 计算使用率
  ROUND((mp.sessions_used::DECIMAL / NULLIF(mp.sessions_purchased, 0)) * 100, 2) as usage_percentage,
  -- 计算剩余天数
  (mp.validity_end_date - CURRENT_DATE) as days_remaining,
  -- 统计已使用的次数
  (SELECT COUNT(*) 
   FROM workshop_attendances 
   WHERE multipass_id = mp.id 
     AND attendance_type = 'multipass'
     AND status != 'cancelled') as actual_usage_count
FROM workshop_multipass_purchases mp
JOIN course_assignments ca ON mp.assignment_id = ca.id
JOIN offerings o ON ca.course_id = o.id
JOIN course_series cs ON ca.series_id = cs.id
WHERE mp.user_id = :user_id
  AND mp.status = 'active'
  AND mp.payment_status = 'paid'
  AND mp.validity_end_date >= CURRENT_DATE
ORDER BY mp.created_at DESC;
```

**验证 Multipass 数据一致性（用于数据修复）：**
```sql
-- 检查 sessions_used + sessions_remaining 是否等于 sessions_purchased
SELECT 
  mp.id,
  mp.sessions_purchased,
  mp.sessions_used,
  mp.sessions_remaining,
  (mp.sessions_used + mp.sessions_remaining) as calculated_total,
  (SELECT COUNT(*) 
   FROM workshop_attendances 
   WHERE multipass_id = mp.id 
     AND attendance_type = 'multipass'
     AND status != 'cancelled') as actual_attendance_count,
  CASE 
    WHEN (mp.sessions_used + mp.sessions_remaining) != mp.sessions_purchased 
    THEN 'INCONSISTENT'
    ELSE 'OK'
  END as consistency_status
FROM workshop_multipass_purchases mp
WHERE mp.status IN ('active', 'used_up')
HAVING (sessions_used + sessions_remaining) != sessions_purchased;
```

## 7. 迁移策略

### 7.1 数据迁移步骤

1. **创建枚举类型**
   ```sql
   CREATE TYPE offering_type_enum AS ENUM (...);
   ```

2. **添加新字段到 courses 表**
   ```sql
   ALTER TABLE courses ADD COLUMN offering_type offering_type_enum DEFAULT 'course';
   ALTER TABLE courses ADD COLUMN type_config JSONB DEFAULT '{}';
   ```

3. **迁移现有数据**
   - 所有现有的 courses 设置为 `offering_type = 'course'`
   - 根据现有字段（如 `session_count`）填充 `type_config`

4. **扩展 assignments 和 instances 表**
   ```sql
   ALTER TABLE course_assignments ADD COLUMN assignment_config JSONB DEFAULT '{}';
   ALTER TABLE course_instances ADD COLUMN instance_config JSONB DEFAULT '{}';
   ```

5. **创建 Workshop 相关表**（如果需要）
   ```sql
   CREATE TABLE workshop_multipass_purchases (...);
   CREATE TABLE workshop_attendances (...);
   ```

## 8. 扩展性考虑

### 8.1 未来可能的新类型

- **Private Lesson**: 一对一课程
- **Group Class**: 小班课
- **Online Course**: 在线课程

### 8.2 配置字段的灵活性

- 使用 JSONB 存储类型特定配置，便于：
  - 添加新字段而不修改表结构
  - 不同类型有不同的配置项
  - 支持嵌套结构（如 multipass_options）

### 8.3 验证规则

- 在应用层实现类型特定的验证逻辑
- 使用数据库 CHECK 约束验证枚举值
- 使用触发器或应用层逻辑确保配置一致性

## 9. 实施优先级

### Phase 1: 基础类型支持
1. 创建 `offering_type` 枚举
2. 扩展 `courses` 表（添加 `offering_type` 和 `type_config`）
3. 迁移现有数据
4. 更新 UI 支持类型选择

### Phase 2: Assignment 和 Instance 配置
1. 扩展 `course_assignments` 和 `course_instances` 表
2. 实现类型特定的配置表单
3. 实现配置合并逻辑（offering → assignment → instance）

### Phase 3: Workshop 特殊功能
1. 实现 drop-in 支持
2. 实现 multipass 购买和使用
3. 创建 `workshop_multipass_purchases` 和 `workshop_attendances` 表

### Phase 4: 其他类型支持
1. Camp 类型完整支持
2. Gift Card 类型支持
3. Care Service 和 Lunch Service 类型支持

### Phase 5: 折扣系统
1. 创建折扣规则表（`enrollment_discount_rules`）
2. 创建折扣应用记录表（`enrollment_discounts`）
3. 扩展 `course_enrollments` 表（添加 `child_id` 或使用 `metadata`）
4. 实现折扣计算逻辑
5. 实现多子女折扣 UI

## 10. 注意事项

1. **向后兼容**: 保持现有 API 和 UI 的兼容性，现有 Course 功能不受影响
2. **数据一致性**: 确保 `type_config`、`assignment_config`、`instance_config` 之间的配置合并逻辑正确
3. **性能考虑**: JSONB 字段的查询性能，必要时创建 GIN 索引
4. **验证逻辑**: 在应用层实现类型特定的验证，确保配置的合理性
5. **文档更新**: 更新 `COURSE_ARCHITECTURE_DESIGN.md` 以反映新的多类型架构
6. **折扣系统**: 折扣规则独立管理，不在 Offering 配置中硬编码，支持灵活配置和扩展
7. **多子女数据模型**: 使用独立的 `children` 表管理孩子信息，通过 `child_id` 字段关联到所有相关的 enrollment 和 purchase 表
8. **数据关联**: `user_id` 始终存在（用于支付和账户管理），`child_id` **必需（NOT NULL）**，因为用户一般都是家长，必须指定孩子
9. **年龄验证**: 创建 enrollment 时必须验证孩子的年龄是否符合课程的年龄要求，不符合则不能创建
10. **业务规则**: 系统的用户一般都是家长，他们的年龄不能参加这些课程，因此所有购买都必须分配给某个孩子
11. **先导课程验证**: 创建 enrollment 时必须验证孩子是否完成了所有必需的先导课程，未完成则不能注册
12. **完成课程判断**: 通过 `course_enrollments` 表的 `status = 'completed'` 和 `child_id` 来判断孩子是否完成了某个课程
13. **退款系统**: 支持三种退款场景：提前15天取消（扣除3%处理费和税费）、开课后取消（按比例转为credit）、Academy取消课程（全额退款）
14. **退款计算**: 提前取消扣除3%处理费和税费；开课后取消按剩余课程次数比例计算；Academy取消全额退款
15. **Credit系统**: 开课后取消只能转为credit，提前取消和Academy取消可以选择原支付方式或credit

## 13. 退款系统设计

### 13.1 退款政策

根据 Blaze Robotics Academy 的退款政策，系统需要支持以下三种退款场景：

**政策 1：提前 15 天取消（开课前）**
- 条件：在 enrollment 开始日期前至少 15 天取消
- 退款方式：100% 退款，扣除 3% 处理费（加上相关税费）
- 退款选项：可以退回到原支付方式或转为 credit

**政策 2：开课后取消**
- 条件：enrollment 已经开始后取消
- 退款方式：按剩余课程次数按比例退款（转为 credit）
- 计算方式：`(剩余课程次数 / 总课程次数) × 原始支付金额`

**政策 3：Blaze Robotics Academy 取消课程**
- 条件：Blaze Robotics Academy 主动取消整个 instance
- 退款方式：全额退款（100%）
- 退款选项：可以退回到原支付方式或转为 credit

### 13.2 数据模型设计

#### 13.2.1 退款记录表

```sql
CREATE TABLE enrollment_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE SET NULL,
  
  -- 退款类型
  refund_policy_type TEXT NOT NULL CHECK (refund_policy_type IN (
    'early_cancellation',    -- 提前15天取消
    'post_start_cancellation', -- 开课后取消
    'academy_cancellation'    -- Academy 取消课程
  )),
  
  -- 金额信息
  original_amount DECIMAL(10, 2) NOT NULL,      -- 原始支付金额
  refund_amount DECIMAL(10, 2) NOT NULL,        -- 实际退款金额（扣除费用后）
  processing_fee DECIMAL(10, 2) DEFAULT 0,       -- 处理费（3%）
  tax_amount DECIMAL(10, 2) DEFAULT 0,           -- 税费
  net_refund DECIMAL(10, 2) NOT NULL,            -- 净退款金额（实际退还给用户的金额）
  
  -- 退款方式
  refund_method TEXT NOT NULL CHECK (refund_method IN (
    'original_payment',  -- 退回到原支付方式
    'credit',            -- 转为 credit
    'split'              -- 部分退款，部分 credit
  )),
  
  -- Credit 相关（如果选择转为 credit）
  credit_amount DECIMAL(10, 2) DEFAULT 0,        -- 转为 credit 的金额
  credit_transaction_id UUID REFERENCES user_credit_transactions(id),
  
  -- 支付平台信息
  payment_provider TEXT,                          -- 'stripe', 'amilia', etc.
  payment_transaction_id TEXT,                    -- 原支付交易 ID
  refund_transaction_id TEXT,                     -- 退款交易 ID（支付平台返回）
  
  -- 状态
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',    -- 待处理
    'processing', -- 处理中
    'completed',  -- 已完成
    'failed',     -- 失败
    'cancelled'   -- 已取消
  )),
  
  -- 时间信息
  days_before_start INTEGER,                      -- 距离开始日期的天数（提前取消时）
  sessions_remaining INTEGER,                    -- 剩余课程次数（开课后取消时）
  total_sessions INTEGER,                        -- 总课程次数
  cancellation_date DATE,                         -- 取消日期
  instance_start_date DATE,                       -- Instance 开始日期
  
  -- 原因和备注
  cancellation_reason TEXT,                       -- 取消原因
  admin_notes TEXT,                               -- 管理员备注
  cancelled_by UUID REFERENCES users(id),        -- 谁取消的（用户或管理员）
  
  -- 时间戳
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  -- 申请时间
  processed_at TIMESTAMP WITH TIME ZONE,                -- 处理时间
  completed_at TIMESTAMP WITH TIME ZONE,                -- 完成时间
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_enrollment_refunds_enrollment_id ON enrollment_refunds(enrollment_id);
CREATE INDEX idx_enrollment_refunds_user_id ON enrollment_refunds(user_id);
CREATE INDEX idx_enrollment_refunds_status ON enrollment_refunds(status);
CREATE INDEX idx_enrollment_refunds_refund_policy_type ON enrollment_refunds(refund_policy_type);
```

#### 13.2.2 用户 Credit 表（如果不存在）

```sql
-- 用户账户余额表
CREATE TABLE IF NOT EXISTS user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 余额信息
  balance DECIMAL(10, 2) NOT NULL DEFAULT 0,     -- 当前余额
  currency TEXT DEFAULT 'USD',
  
  -- 有效期
  expires_at TIMESTAMP WITH TIME ZONE,            -- 过期时间（可选）
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Credit 交易记录表
CREATE TABLE IF NOT EXISTS user_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credit_id UUID REFERENCES user_credits(id) ON DELETE CASCADE,
  
  -- 交易类型
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'credit',      -- 增加 credit（退款转入）
    'debit',       -- 减少 credit（用于支付）
    'expired',     -- 过期
    'refund'       -- 退款（credit 转回支付方式）
  )),
  
  -- 金额
  amount DECIMAL(10, 2) NOT NULL,                -- 交易金额（正数表示增加，负数表示减少）
  balance_before DECIMAL(10, 2) NOT NULL,        -- 交易前余额
  balance_after DECIMAL(10, 2) NOT NULL,          -- 交易后余额
  
  -- 关联信息
  enrollment_id UUID REFERENCES course_enrollments(id),
  refund_id UUID REFERENCES enrollment_refunds(id),
  description TEXT,                               -- 交易描述
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_user_credit_transactions_user_id ON user_credit_transactions(user_id);
CREATE INDEX idx_user_credit_transactions_credit_id ON user_credit_transactions(credit_id);
```

#### 13.2.3 扩展 course_enrollments 表

```sql
-- 添加退款相关字段
ALTER TABLE course_enrollments
  ADD COLUMN IF NOT EXISTS refund_id UUID REFERENCES enrollment_refunds(id),
  ADD COLUMN IF NOT EXISTS cancellation_date DATE,  -- 取消日期
  ADD COLUMN IF NOT EXISTS days_before_start INTEGER, -- 提前取消的天数
  ADD COLUMN IF NOT EXISTS sessions_remaining INTEGER, -- 取消时剩余课程次数
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES users(id); -- 谁取消的
```

### 13.3 退款计算逻辑

#### 13.3.1 提前 15 天取消退款计算

```typescript
function calculateEarlyCancellationRefund(
  originalAmount: number,
  taxAmount: number = 0,
  processingFeePercentage: number = 0.03  // 3%
): {
  originalAmount: number
  processingFee: number
  taxAmount: number
  netRefund: number
} {
  // 计算处理费（3%）
  const processingFee = originalAmount * processingFeePercentage
  
  // 计算净退款金额
  const netRefund = originalAmount - processingFee - taxAmount
  
  return {
    originalAmount,
    processingFee,
    taxAmount,
    netRefund
  }
}
```

**示例：**
- 原始支付金额：$1000
- 税费：$80
- 处理费（3%）：$1000 × 0.03 = $30
- 净退款：$1000 - $30 - $80 = $890

#### 13.3.2 开课后取消退款计算（按比例）

```typescript
function calculatePostStartCancellationRefund(
  originalAmount: number,
  totalSessions: number,
  sessionsCompleted: number,
  sessionsRemaining: number
): {
  originalAmount: number
  sessionsCompleted: number
  sessionsRemaining: number
  totalSessions: number
  refundAmount: number  // 按比例计算的退款金额
} {
  // 计算退款比例
  const refundPercentage = sessionsRemaining / totalSessions
  
  // 计算退款金额
  const refundAmount = originalAmount * refundPercentage
  
  return {
    originalAmount,
    sessionsCompleted,
    sessionsRemaining,
    totalSessions,
    refundAmount
  }
}
```

**示例：**
- 原始支付金额：$1000
- 总课程次数：10 次
- 已完成：3 次
- 剩余：7 次
- 退款金额：$1000 × (7 / 10) = $700（转为 credit）

#### 13.3.3 Academy 取消课程退款计算

```typescript
function calculateAcademyCancellationRefund(
  originalAmount: number
): {
  originalAmount: number
  refundAmount: number  // 全额退款
} {
  return {
    originalAmount,
    refundAmount: originalAmount  // 100% 退款
  }
}
```

### 13.4 退款流程设计

#### 13.4.1 用户提前取消流程

**API**: `POST /api/enrollments/[id]/cancel`

**流程：**
1. **验证取消条件**
   - enrollment 状态必须是 `enrolled` 且 `payment_status` 为 `paid`
   - instance 开始日期必须 >= 当前日期 + 15 天
   - 用户必须是 enrollment 的所有者

2. **计算退款金额**
   - 获取原始支付金额和税费
   - 计算处理费（3%）
   - 计算净退款金额

3. **用户选择退款方式**
   - 选项 1：退回到原支付方式
   - 选项 2：转为 credit
   - 选项 3：部分退款，部分 credit

4. **创建退款记录**
   - `refund_policy_type = 'early_cancellation'`
   - 记录所有金额信息
   - 状态：`pending`

5. **执行退款**
   - 如果选择原支付方式：调用支付平台退款 API
   - 如果选择 credit：增加用户 credit 余额
   - 如果选择 split：同时执行两种方式

6. **更新 enrollment 状态**
   - 状态改为 `cancelled`
   - 记录取消时间和原因
   - 关联退款记录

7. **发送通知**
   - 邮件通知用户退款详情

#### 13.4.2 开课后取消流程

**API**: `POST /api/enrollments/[id]/cancel`

**流程：**
1. **验证取消条件**
   - enrollment 状态必须是 `enrolled`
   - instance 已经开始（`start_date <= CURRENT_DATE`）
   - 用户必须是 enrollment 的所有者

2. **计算已完成的课程次数**
   - 查询 `workshop_attendances` 或根据 `instance.start_date` 和当前日期计算
   - 计算剩余课程次数

3. **计算按比例退款金额**
   - 使用 `calculatePostStartCancellationRefund` 函数

4. **创建退款记录**
   - `refund_policy_type = 'post_start_cancellation'`
   - `refund_method = 'credit'`（开课后取消只能转为 credit）
   - 记录剩余课程次数和退款金额
   - 状态：`pending`

5. **执行退款（转为 credit）**
   - 增加用户 credit 余额
   - 创建 credit 交易记录

6. **更新 enrollment 状态**
   - 状态改为 `cancelled`
   - 记录取消时间和原因
   - 关联退款记录

7. **发送通知**
   - 邮件通知用户 credit 已到账

#### 13.4.3 Academy 取消课程流程

**API**: `POST /api/admin/instances/[id]/cancel`

**流程：**
1. **管理员取消 instance**
   - 设置 `course_instances.cancelled_at`
   - 设置取消原因

2. **查找所有相关 enrollment**
   - 查询所有 `status = 'enrolled'` 且 `payment_status = 'paid'` 的 enrollment

3. **批量创建退款记录**
   - 为每个 enrollment 创建退款记录
   - `refund_policy_type = 'academy_cancellation'`
   - `refund_amount = original_amount`（全额退款）
   - 状态：`pending`

4. **批量处理退款**
   - 异步处理每个 enrollment 的退款
   - 根据用户选择或默认策略执行退款（原支付方式或 credit）

5. **更新所有 enrollment 状态**
   - 状态改为 `cancelled`
   - 关联退款记录

6. **发送批量通知**
   - 邮件通知所有受影响用户

### 13.5 API 设计

#### 13.5.1 用户取消 Enrollment

```typescript
// POST /api/enrollments/[id]/cancel
// 请求体：
{
  cancellation_reason?: string,
  refund_method: 'original_payment' | 'credit' | 'split',
  credit_amount?: number  // 如果选择 split，指定转为 credit 的金额
}

// 响应（成功）：
{
  refund_id: string,
  refund_policy_type: 'early_cancellation' | 'post_start_cancellation',
  original_amount: number,
  refund_amount: number,
  processing_fee?: number,
  tax_amount?: number,
  net_refund: number,
  refund_method: string,
  status: 'pending' | 'processing' | 'completed',
  estimated_completion: string  // 预计完成时间
}

// 响应（失败）：
{
  error: string,
  message: string,
  details?: {
    days_before_start?: number,  // 如果不足 15 天
    instance_start_date?: string,
    current_date?: string
  }
}
```

#### 13.5.2 查询退款状态

```typescript
// GET /api/enrollments/[id]/refund
// 响应：
{
  refund_id: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  refund_amount: number,
  refund_method: string,
  processed_at?: string,
  completed_at?: string
}
```

#### 13.5.3 管理员取消 Instance

```typescript
// POST /api/admin/instances/[id]/cancel
// 请求体：
{
  cancellation_reason: string,
  refund_method: 'original_payment' | 'credit' | 'split',  // 默认退款方式
  send_notification: boolean
}

// 响应：
{
  instance_id: string,
  cancelled_at: string,
  affected_enrollments: number,
  refunds_created: number,
  status: 'processing'
}
```

### 13.6 UI/UX 设计思路

#### 13.6.1 用户取消 Enrollment 界面

**显示内容：**
1. **取消确认对话框**
   - Enrollment 信息（课程名称、开始日期、支付金额）
   - 取消政策说明：
     - 如果提前 15 天：显示 "将扣除 3% 处理费和税费"
     - 如果开课后：显示 "将按剩余课程次数按比例退款（转为 credit）"
   - 退款金额预览
   - 退款方式选择（提前 15 天取消时）

2. **退款金额计算显示**
   - 原始支付金额
   - 扣除项（处理费、税费）
   - 净退款金额
   - 预计到账时间

3. **取消原因输入**（可选）
   - 下拉选择或文本输入

#### 13.6.2 退款历史界面

**显示内容：**
1. 所有退款记录列表
2. 每个退款显示：
   - 退款类型（提前取消 / 开课后取消 / Academy 取消）
   - 退款金额
   - 退款方式（原支付方式 / credit）
   - 状态（待处理 / 处理中 / 已完成）
   - 退款日期

### 13.7 注意事项

1. **时间计算**：使用 instance 的 `start_date` 计算是否提前 15 天
2. **课程次数计算**：对于 Course 类型，需要从 `type_config` 或 `assignment_config` 获取总课程次数
3. **已完成课程判断**：需要根据 `workshop_attendances` 或 `instance.start_date` 和当前日期计算
4. **税费计算**：需要从原始支付记录中获取税费信息
5. **异步处理**：批量退款应该异步处理，避免阻塞
6. **通知系统**：所有退款操作都应该发送邮件通知用户

