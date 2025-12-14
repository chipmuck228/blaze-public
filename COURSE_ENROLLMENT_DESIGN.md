# 课程注册系统设计方案

## 1. 需求分析

### 1.1 核心需求
1. **地理位置差异化容量**：不同地理位置的课程实例有不同的最大容量（`max_students`）
2. **注册清单过期机制**：用户将课程加入注册清单后，需要设置过期时间，超时自动释放名额
3. **等待列表（Waiting List）**：当课程已满时，用户可以加入等待列表，有名额时自动通知

### 1.2 业务场景
- 用户浏览课程 → 选择课程实例 → 加入注册清单（Cart）
- 注册清单中的课程有保留时间（如 15 分钟）
- 用户完成支付 → 正式注册成功
- 如果课程已满 → 加入等待列表
- 等待列表按加入时间排序，有名额时按顺序通知

---

## 2. 行业最佳实践分析

### 2.1 购物车/注册清单模式
**参考**：电商购物车、活动报名系统、票务系统

**特点**：
- 临时保留机制（通常 15-30 分钟）
- 自动释放过期保留
- 实时库存更新
- 并发控制（防止超售）

### 2.2 等待列表模式
**参考**：大学选课系统、活动报名系统、医疗预约系统

**特点**：
- FIFO（先进先出）队列
- 自动通知机制
- 有限时间窗口（如 24-48 小时）
- 自动升级为正式注册

### 2.3 容量管理
**参考**：活动管理、课程管理系统

**特点**：
- 实时容量追踪
- 预留名额管理
- 并发安全（数据库锁或乐观锁）

---

## 3. 数据库设计

### 3.1 核心表结构

#### 3.1.1 course_enrollments（课程注册表）
```sql
CREATE TABLE course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES course_instances(id) ON DELETE CASCADE,
  
  -- 注册状态
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'cart',           -- 在注册清单中（未支付）
    'reserved',       -- 已保留（支付中）
    'enrolled',       -- 已正式注册
    'waitlisted',     -- 在等待列表中
    'cancelled',      -- 已取消
    'expired',        -- 已过期（自动释放）
    'completed'       -- 课程已完成
  )),
  
  -- 时间相关
  added_to_cart_at TIMESTAMP WITH TIME ZONE,        -- 加入清单时间
  cart_expires_at TIMESTAMP WITH TIME ZONE,         -- 清单过期时间
  reserved_at TIMESTAMP WITH TIME ZONE,             -- 保留时间（支付中）
  reserved_expires_at TIMESTAMP WITH TIME ZONE,     -- 保留过期时间
  enrolled_at TIMESTAMP WITH TIME ZONE,              -- 正式注册时间
  waitlisted_at TIMESTAMP WITH TIME ZONE,           -- 加入等待列表时间
  waitlist_position INTEGER,                        -- 等待列表位置
  waitlist_notified_at TIMESTAMP WITH TIME ZONE,     -- 等待列表通知时间
  waitlist_expires_at TIMESTAMP WITH TIME ZONE,     -- 等待列表过期时间（用户需要在指定时间内完成注册）
  cancelled_at TIMESTAMP WITH TIME ZONE,             -- 取消时间
  cancelled_reason TEXT,                            -- 取消原因
  
  -- 支付相关
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN (
    'unpaid',         -- 未支付
    'pending',        -- 支付中
    'paid',           -- 已支付
    'refunded',       -- 已退款
    'failed'          -- 支付失败
  )),
  payment_method_id UUID,                            -- 支付方式ID（关联 payment_methods 表）
  amount_paid DECIMAL(10, 2),                        -- 实际支付金额
  currency TEXT DEFAULT 'USD',
  payment_transaction_id TEXT,                      -- 支付交易ID
  
  -- 元数据
  notes TEXT,                                        -- 备注（用户或管理员）
  metadata JSONB,                                    -- 扩展信息（JSON格式）
  
  -- 审计字段
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 约束
  UNIQUE(user_id, instance_id, status) WHERE status IN ('cart', 'reserved', 'enrolled', 'waitlisted')
);

-- 索引
CREATE INDEX idx_enrollments_user_id ON course_enrollments(user_id);
CREATE INDEX idx_enrollments_instance_id ON course_enrollments(instance_id);
CREATE INDEX idx_enrollments_status ON course_enrollments(status);
CREATE INDEX idx_enrollments_cart_expires ON course_enrollments(cart_expires_at) WHERE status = 'cart';
CREATE INDEX idx_enrollments_reserved_expires ON course_enrollments(reserved_expires_at) WHERE status = 'reserved';
CREATE INDEX idx_enrollments_waitlist ON course_enrollments(instance_id, waitlist_position) WHERE status = 'waitlisted';
CREATE INDEX idx_enrollments_waitlist_expires ON course_enrollments(waitlist_expires_at) WHERE status = 'waitlisted';
```

**设计说明**：
- **状态流转**：`cart` → `reserved` → `enrolled` 或 `cart` → `waitlisted` → `enrolled`
- **唯一约束**：确保用户在同一实例上不能同时有多个活跃状态（cart/reserved/enrolled/waitlisted）
- **过期时间**：支持多层过期机制（cart 过期、reserved 过期、waitlist 过期）

#### 3.1.2 enrollment_status_history（注册状态历史表）
```sql
CREATE TABLE enrollment_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES users(id),              -- 谁触发的状态变更（用户ID或系统）
  change_reason TEXT,                                -- 变更原因
  metadata JSONB,                                    -- 变更时的额外信息
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_enrollment_history_enrollment_id ON enrollment_status_history(enrollment_id);
CREATE INDEX idx_enrollment_history_created_at ON enrollment_status_history(created_at);
```

**用途**：
- 审计追踪
- 状态变更历史
- 问题排查

#### 3.1.3 waitlist_notifications（等待列表通知表）
```sql
CREATE TABLE waitlist_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'spot_available',    -- 名额可用通知
    'expiring_soon',     -- 即将过期提醒
    'expired'            -- 已过期通知
  )),
  notification_method TEXT NOT NULL CHECK (notification_method IN (
    'email',
    'sms',
    'in_app'
  )),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB
);

CREATE INDEX idx_waitlist_notifications_enrollment_id ON waitlist_notifications(enrollment_id);
CREATE INDEX idx_waitlist_notifications_sent_at ON waitlist_notifications(sent_at);
```

---

## 4. 状态机设计

### 4.1 状态流转图

```
                    ┌─────────┐
                    │  cart   │ (加入注册清单)
                    └────┬────┘
                         │
            ┌────────────┼────────────┐
            │            │            │
            ▼            ▼            ▼
    ┌─────────────┐ ┌──────────┐ ┌─────────────┐
    │  reserved   │ │expired   │ │ waitlisted  │ (课程已满)
    │  (支付中)   │ │(过期)    │ │ (等待列表)  │
    └──────┬──────┘ └──────────┘ └──────┬─────┘
           │                              │
           │ (支付成功)                   │ (名额可用)
           ▼                              ▼
    ┌─────────────┐              ┌─────────────┐
    │  enrolled   │              │  enrolled   │
    │  (已注册)   │              │  (已注册)   │
    └──────┬──────┘              └──────┬──────┘
           │                           │
           │ (课程完成)                │
           ▼                           ▼
    ┌─────────────┐              ┌─────────────┐
    │  completed  │              │  completed   │
    └─────────────┘              └─────────────┘
```

### 4.2 状态说明

| 状态 | 说明 | 过期时间 | 可执行操作 |
|------|------|----------|------------|
| `cart` | 在注册清单中，未支付 | 15-30 分钟 | 支付、取消、自动过期 |
| `reserved` | 已保留（支付中） | 10-15 分钟 | 完成支付、取消、自动过期 |
| `enrolled` | 已正式注册 | 无 | 取消（根据取消政策） |
| `waitlisted` | 在等待列表中 | 24-48 小时（通知后） | 升级为 enrolled、取消 |
| `cancelled` | 已取消 | 无 | 无 |
| `expired` | 已过期 | 无 | 重新加入 cart |
| `completed` | 课程已完成 | 无 | 无 |

---

## 5. 业务流程设计

### 5.1 正常注册流程

```
1. 用户浏览课程
   ↓
2. 选择课程实例（检查容量）
   ↓
3. 加入注册清单（cart）
   - 检查实例容量
   - 如果未满：创建 cart 状态记录，设置过期时间（15分钟）
   - 如果已满：询问是否加入等待列表
   ↓
4. 用户确认支付
   ↓
5. 状态转为 reserved（支付中）
   - 设置 reserved_expires_at（10分钟）
   ↓
6. 支付处理
   ↓
7. 支付成功
   - 状态转为 enrolled
   - 更新 instance.current_students
   - 发送确认邮件
```

### 5.2 等待列表流程

```
1. 用户尝试注册已满课程
   ↓
2. 系统提示课程已满
   - 询问是否加入等待列表
   ↓
3. 用户确认加入等待列表
   - 创建 waitlisted 状态记录
   - 计算 waitlist_position（当前等待列表长度 + 1）
   ↓
4. 等待名额释放
   ↓
5. 有名额时（自动触发）
   - 按 waitlist_position 顺序通知用户
   - 设置 waitlist_expires_at（24-48小时）
   - 发送通知（邮件 + in-app）
   ↓
6. 用户在有效期内完成注册
   - 状态转为 enrolled
   - 更新 waitlist_position（后续用户前移）
   ↓
7. 用户未在有效期内注册
   - 状态转为 expired
   - 通知下一个等待列表用户
```

### 5.3 过期处理流程（后台任务）

```
定时任务（每 1-5 分钟执行）：

1. 处理过期的 cart
   - 查找 cart_expires_at < NOW() 的记录
   - 状态转为 expired
   - 释放名额（如果已占用）
   - 更新 instance.current_students

2. 处理过期的 reserved
   - 查找 reserved_expires_at < NOW() 的记录
   - 状态转为 expired
   - 释放名额
   - 发送支付超时通知

3. 处理过期的 waitlist
   - 查找 waitlist_expires_at < NOW() 的记录
   - 状态转为 expired
   - 通知下一个等待列表用户
   - 更新所有后续用户的 waitlist_position
```

---

## 6. 容量管理策略

### 6.1 容量计算

```typescript
// 伪代码
function getAvailableCapacity(instanceId: string): number {
  const instance = getInstance(instanceId)
  const maxCapacity = instance.max_students || 0
  
  // 计算已占用的名额
  const enrolledCount = countEnrollments(instanceId, 'enrolled')
  const reservedCount = countEnrollments(instanceId, 'reserved')
  const cartCount = countEnrollments(instanceId, 'cart')
  
  // 可用容量 = 最大容量 - 已注册 - 已保留 - 在购物车中
  const available = maxCapacity - enrolledCount - reservedCount - cartCount
  
  return Math.max(0, available)
}
```

### 6.2 并发控制

**方案 A：数据库锁（悲观锁）**
```sql
BEGIN;
SELECT * FROM course_instances WHERE id = $1 FOR UPDATE;
-- 检查容量
-- 创建 enrollment
COMMIT;
```

**方案 B：乐观锁（推荐）**
```typescript
// 使用 version 字段或 current_students 作为版本号
UPDATE course_instances 
SET current_students = current_students + 1,
    updated_at = NOW()
WHERE id = $1 
  AND current_students < max_students
  AND current_students = $expected_current_students  -- 乐观锁检查
```

**方案 C：唯一约束 + 重试机制**
```typescript
// 依赖数据库唯一约束防止超售
// 如果插入失败，说明容量已满，重试或加入等待列表
```

---

## 7. 时间配置

### 7.1 过期时间配置

| 阶段 | 默认时间 | 可配置 | 说明 |
|------|----------|--------|------|
| Cart 过期 | 15 分钟 | ✅ | 用户将课程加入清单后的保留时间 |
| Reserved 过期 | 10 分钟 | ✅ | 支付处理的最大时间 |
| Waitlist 通知有效期 | 24 小时 | ✅ | 收到名额可用通知后的注册时间窗口 |
| Waitlist 自动过期 | 7 天 | ✅ | 加入等待列表后，如果一直没名额，自动过期 |

### 7.2 配置表设计

```sql
CREATE TABLE enrollment_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 默认配置
INSERT INTO enrollment_config (config_key, config_value, description) VALUES
('cart_expiry_minutes', '15', '注册清单过期时间（分钟）'),
('reserved_expiry_minutes', '10', '支付保留过期时间（分钟）'),
('waitlist_notification_hours', '24', '等待列表通知有效期（小时）'),
('waitlist_auto_expire_days', '7', '等待列表自动过期时间（天）');
```

---

## 8. API 设计

### 8.1 注册清单 API

#### `POST /api/enrollments/cart`
**功能**：将课程实例加入注册清单

**请求体**：
```json
{
  "instance_id": "uuid",
  "notes": "optional notes"
}
```

**响应**：
```json
{
  "enrollment": {
    "id": "uuid",
    "status": "cart",
    "cart_expires_at": "2025-01-21T10:15:00Z",
    "instance": { ... }
  }
}
```

**业务逻辑**：
1. 检查用户是否已登录
2. 检查实例是否存在且可用
3. 检查容量（`getAvailableCapacity`）
4. 如果容量充足：
   - 创建 `cart` 状态记录
   - 设置 `cart_expires_at = NOW() + 15分钟`
   - 返回成功
5. 如果容量不足：
   - 返回错误，提示是否加入等待列表

#### `GET /api/enrollments/cart`
**功能**：获取用户的注册清单

**响应**：
```json
{
  "items": [
    {
      "id": "uuid",
      "instance": { ... },
      "status": "cart",
      "cart_expires_at": "2025-01-21T10:15:00Z",
      "time_remaining": 900  // 剩余秒数
    }
  ],
  "total": 2
}
```

#### `DELETE /api/enrollments/cart/:id`
**功能**：从注册清单移除课程

#### `POST /api/enrollments/cart/:id/extend`
**功能**：延长注册清单过期时间（如用户正在填写信息）

### 8.2 等待列表 API

#### `POST /api/enrollments/waitlist`
**功能**：加入等待列表

**请求体**：
```json
{
  "instance_id": "uuid"
}
```

**响应**：
```json
{
  "enrollment": {
    "id": "uuid",
    "status": "waitlisted",
    "waitlist_position": 3,
    "instance": { ... }
  }
}
```

#### `GET /api/enrollments/waitlist`
**功能**：获取用户的等待列表

#### `DELETE /api/enrollments/waitlist/:id`
**功能**：从等待列表移除

### 8.3 注册 API

#### `POST /api/enrollments/checkout`
**功能**：结账（从 cart 转为 reserved，开始支付流程）

**请求体**：
```json
{
  "enrollment_ids": ["uuid1", "uuid2"],
  "payment_method_id": "uuid"
}
```

**响应**：
```json
{
  "enrollments": [
    {
      "id": "uuid",
      "status": "reserved",
      "reserved_expires_at": "2025-01-21T10:25:00Z"
    }
  ],
  "total_amount": 500.00,
  "payment_intent_id": "stripe_payment_intent_id"
}
```

#### `POST /api/enrollments/:id/confirm`
**功能**：确认注册（支付成功后调用）

**请求体**：
```json
{
  "payment_transaction_id": "stripe_payment_id"
}
```

**响应**：
```json
{
  "enrollment": {
    "id": "uuid",
    "status": "enrolled",
    "enrolled_at": "2025-01-21T10:20:00Z"
  }
}
```

### 8.4 我的注册 API

#### `GET /api/enrollments`
**功能**：获取用户的所有注册记录

**查询参数**：
- `status`: 筛选状态（enrolled, waitlisted, completed 等）
- `instance_id`: 筛选特定实例

**响应**：
```json
{
  "enrollments": [
    {
      "id": "uuid",
      "status": "enrolled",
      "instance": {
        "id": "uuid",
        "course": { ... },
        "location": { ... },
        "start_date": "2025-02-01",
        "end_date": "2025-02-28"
      },
      "enrolled_at": "2025-01-21T10:20:00Z"
    }
  ]
}
```

#### `GET /api/enrollments/:id`
**功能**：获取单个注册详情

### 8.5 后台任务 API

#### `POST /api/admin/enrollments/process-expired` (管理员)
**功能**：处理过期的注册（定时任务调用）

**业务逻辑**：
1. 处理过期的 cart
2. 处理过期的 reserved
3. 处理过期的 waitlist
4. 通知等待列表用户

---

## 9. UI/UX 设计

### 9.1 注册清单页面 (`/enrollments/cart`)

**功能**：
- 显示注册清单中的所有课程
- 显示每个课程的过期倒计时
- 显示总金额
- "Checkout" 按钮
- 移除课程按钮
- 过期提醒

**设计要点**：
- 实时更新倒计时
- 过期前 2 分钟显示警告
- 支持批量操作

### 9.2 课程详情页注册按钮

**状态显示**：
- **可用**：显示 "Add to Cart" 按钮，显示剩余名额
- **即将满员**（< 5 个名额）：显示 "Only X spots left"
- **已满**：显示 "Join Waitlist" 按钮，显示等待列表长度
- **已注册**：显示 "Enrolled" 徽章
- **在清单中**：显示 "In Cart" 徽章，显示过期时间

### 9.3 等待列表页面 (`/enrollments/waitlist`)

**功能**：
- 显示等待列表中的课程
- 显示等待位置
- 显示预计等待时间（可选）
- 移除按钮

### 9.4 我的注册页面 (`/enrollments`)

**功能**：
- 标签页：All, Enrolled, Waitlisted, Completed, Cancelled
- 每个注册显示：
  - 课程信息
  - 注册状态
  - 注册时间
  - 操作按钮（取消、查看详情等）

### 9.5 通知系统

**通知类型**：
1. **Cart 即将过期**：过期前 2 分钟
2. **Reserved 即将过期**：过期前 2 分钟
3. **Waitlist 名额可用**：有名额时立即通知
4. **Waitlist 即将过期**：过期前 6 小时
5. **注册成功**：支付成功后
6. **注册取消**：取消后

**通知渠道**：
- Email（主要）
- In-app 通知（可选）
- SMS（可选，未来）

---

## 10. 数据库函数和触发器

### 10.1 自动更新 current_students

```sql
-- 触发器：当 enrollment 状态变为 enrolled 时，增加 current_students
CREATE OR REPLACE FUNCTION update_instance_student_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'enrolled' AND (OLD.status IS NULL OR OLD.status != 'enrolled') THEN
    UPDATE course_instances
    SET current_students = current_students + 1
    WHERE id = NEW.instance_id;
  ELSIF OLD.status = 'enrolled' AND NEW.status != 'enrolled' THEN
    UPDATE course_instances
    SET current_students = GREATEST(0, current_students - 1)
    WHERE id = NEW.instance_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_instance_student_count
AFTER INSERT OR UPDATE ON course_enrollments
FOR EACH ROW
EXECUTE FUNCTION update_instance_student_count();
```

### 10.2 自动计算 waitlist_position

```sql
-- 函数：计算并更新等待列表位置
CREATE OR REPLACE FUNCTION update_waitlist_positions(instance_id_param UUID)
RETURNS void AS $$
DECLARE
  pos INTEGER := 1;
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id FROM course_enrollments
    WHERE instance_id = instance_id_param
      AND status = 'waitlisted'
    ORDER BY waitlisted_at ASC
  LOOP
    UPDATE course_enrollments
    SET waitlist_position = pos
    WHERE id = rec.id;
    pos := pos + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

### 10.3 自动处理过期（定时任务）

```sql
-- 函数：处理过期的注册
CREATE OR REPLACE FUNCTION process_expired_enrollments()
RETURNS TABLE(
  processed_count INTEGER,
  freed_spots INTEGER
) AS $$
DECLARE
  cart_expired_count INTEGER;
  reserved_expired_count INTEGER;
  waitlist_expired_count INTEGER;
BEGIN
  -- 处理过期的 cart
  UPDATE course_enrollments
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'cart'
    AND cart_expires_at < NOW();
  
  GET DIAGNOSTICS cart_expired_count = ROW_COUNT;
  
  -- 处理过期的 reserved
  UPDATE course_enrollments
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'reserved'
    AND reserved_expires_at < NOW();
  
  GET DIAGNOSTICS reserved_expired_count = ROW_COUNT;
  
  -- 处理过期的 waitlist（超过自动过期时间）
  UPDATE course_enrollments
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'waitlisted'
    AND waitlisted_at < NOW() - INTERVAL '7 days'
    AND (waitlist_notified_at IS NULL OR waitlist_expires_at < NOW());
  
  GET DIAGNOSTICS waitlist_expired_count = ROW_COUNT;
  
  RETURN QUERY SELECT
    (cart_expired_count + reserved_expired_count + waitlist_expired_count) as processed_count,
    (cart_expired_count + reserved_expired_count) as freed_spots;
END;
$$ LANGUAGE plpgsql;
```

---

## 11. 后台任务设计

### 11.1 定时任务

**任务 1：处理过期注册**
- **频率**：每 1-5 分钟
- **功能**：调用 `process_expired_enrollments()` 函数
- **实现**：Next.js API Route + Vercel Cron Jobs 或 Supabase Edge Functions

**任务 2：检查等待列表名额**
- **频率**：每 5-10 分钟
- **功能**：检查每个 waitlisted 的实例是否有可用名额
- **逻辑**：
  1. 查找所有有 waitlisted 的实例
  2. 检查每个实例的可用容量
  3. 如果有名额，通知第一个等待列表用户
  4. 更新 waitlist_position

**任务 3：发送过期提醒**
- **频率**：每 1 分钟
- **功能**：发送即将过期的提醒（cart 和 reserved）

### 11.2 实时事件处理

**使用 Supabase Realtime 或 Webhooks**：
- 当 `course_enrollments` 状态变更时触发
- 自动更新等待列表位置
- 发送实时通知

---

## 12. 并发和性能考虑

### 12.1 并发控制

**问题**：多个用户同时注册最后一个名额

**解决方案**：
1. **数据库事务 + 行锁**（推荐）
   ```sql
   BEGIN;
   SELECT * FROM course_instances WHERE id = $1 FOR UPDATE;
   -- 检查容量
   -- 创建 enrollment
   COMMIT;
   ```

2. **乐观锁**
   - 使用 `current_students` 作为版本号
   - 更新时检查版本号是否变化

3. **唯一约束 + 重试**
   - 依赖数据库唯一约束
   - 应用层重试机制

### 12.2 性能优化

1. **索引优化**
   - `course_enrollments(instance_id, status)`
   - `course_enrollments(cart_expires_at)` WHERE status = 'cart'
   - `course_enrollments(waitlist_position)` WHERE status = 'waitlisted'

2. **缓存策略**
   - 缓存实例容量信息（Redis，可选）
   - 缓存用户注册清单（短期缓存）

3. **批量操作**
   - 批量处理过期注册
   - 批量更新等待列表位置

---

## 13. 错误处理

### 13.1 常见错误场景

1. **容量不足**
   - 返回错误码：`CAPACITY_FULL`
   - 提示是否加入等待列表

2. **已存在注册**
   - 返回错误码：`ALREADY_ENROLLED`
   - 显示现有注册信息

3. **过期时间冲突**
   - 返回错误码：`CART_EXPIRED`
   - 提示重新加入

4. **支付失败**
   - 状态回退到 `cart` 或 `expired`
   - 发送失败通知

### 13.2 错误响应格式

```json
{
  "error": {
    "code": "CAPACITY_FULL",
    "message": "This course instance is full",
    "details": {
      "instance_id": "uuid",
      "available_capacity": 0,
      "waitlist_available": true,
      "waitlist_length": 5
    }
  }
}
```

---

## 14. 测试场景

### 14.1 单元测试场景

1. **容量计算**
   - 正常情况
   - 边界情况（0 容量、已满）
   - 并发情况

2. **状态流转**
   - 所有合法状态转换
   - 非法状态转换（应拒绝）

3. **过期处理**
   - Cart 过期
   - Reserved 过期
   - Waitlist 过期

### 14.2 集成测试场景

1. **完整注册流程**
   - 加入 cart → 支付 → enrolled

2. **等待列表流程**
   - 加入 waitlist → 名额可用 → enrolled

3. **并发注册**
   - 多个用户同时注册最后一个名额

4. **过期处理**
   - 定时任务正确处理过期

---

## 15. 实施计划

### Phase 1: 数据库和基础 API
1. 创建数据库表
2. 创建数据库函数和触发器
3. 实现基础 CRUD API
4. 实现容量计算逻辑

### Phase 2: 注册清单功能
1. 实现 Cart API
2. 实现 Cart UI
3. 实现过期处理

### Phase 3: 等待列表功能
1. 实现 Waitlist API
2. 实现 Waitlist UI
3. 实现自动通知

### Phase 4: 支付集成
1. 集成支付网关
2. 实现支付流程
3. 实现支付回调

### Phase 5: 后台任务
1. 实现定时任务
2. 实现过期处理
3. 实现等待列表检查

### Phase 6: UI/UX 优化
1. 优化用户体验
2. 添加实时更新
3. 添加通知系统

---

## 16. 配置建议

### 16.1 默认时间配置

| 配置项 | 默认值 | 建议范围 | 说明 |
|--------|--------|----------|------|
| Cart 过期时间 | 15 分钟 | 10-30 分钟 | 平衡用户体验和资源占用 |
| Reserved 过期时间 | 10 分钟 | 5-15 分钟 | 支付处理时间 |
| Waitlist 通知有效期 | 24 小时 | 12-48 小时 | 给用户足够时间完成注册 |
| Waitlist 自动过期 | 7 天 | 3-14 天 | 避免无限等待 |

### 16.2 容量管理建议

1. **预留缓冲**：考虑预留 1-2 个名额作为缓冲（用于特殊情况）
2. **动态调整**：允许管理员动态调整 `max_students`
3. **超额注册**：可选功能，允许少量超额（如 5%），应对取消情况

---

## 17. 扩展功能（未来考虑）

1. **批量注册**：一次注册多个课程
2. **注册转移**：将注册转移到其他实例
3. **候补自动升级**：自动将候补升级为正式注册
4. **注册分享**：分享注册链接给他人
5. **注册提醒**：课程开始前提醒
6. **出勤管理**：记录学生出勤情况
7. **评价系统**：课程结束后评价

---

## 18. 安全考虑

1. **权限控制**：用户只能操作自己的注册
2. **防刷机制**：限制频繁加入/移除 cart
3. **支付安全**：使用安全的支付网关
4. **数据验证**：所有输入数据验证
5. **SQL 注入防护**：使用参数化查询

---

*本文档为设计方案，实施前需要团队评审和确认。*

