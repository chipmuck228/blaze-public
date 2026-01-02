# 课程系统架构设计文档（方案A）

## 设计原则

1. **Course（课程）完全独立**：只包含课程本身的内容，不绑定任何分类
2. **Category 和 Series 独立管理**：可以独立创建、编辑、删除
3. **Series 必须关联 Category**：每个 Series 必须属于一个 Category
4. **Course Assignment（课程分配）**：通过多对多关系表实现灵活分配
5. **Course Instance 关联 Course Assignment**：实例关联到具体的分配，而不是直接关联 Course
6. **Subcategory 作为标签系统**：Course 可以有多个 Subcategory 标签，也可以没有

## 数据模型设计

### 0. 枚举类型定义

#### 0.1 course_status（课程状态枚举）
```sql
CREATE TYPE course_status AS ENUM (
  'draft',        -- 草稿：课程正在设计中，尚未完成，不能分配
  'published',   -- 已发布：课程已完成设计，可以分配和上架
  'suspended',   -- 暂停：临时下架，已有实例不受影响，但不能再创建新实例
  'archived'      -- 已归档：课程不再使用，保留历史记录，不可见
);
```

**状态说明：**
- `draft`：课程正在设计中，不能创建 Assignment 和 Instance
- `published`：课程已完成，可以正常使用，可以创建 Assignment 和 Instance
- `suspended`：课程临时下架，已有实例不受影响，但不能再创建新实例
- `archived`：课程已归档，保留历史记录，不可见，不能创建新实例

### 1. 核心表结构

#### 1.1 courses（课程表）- 完全独立
```sql
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- 课程名称
  slug TEXT UNIQUE,                      -- URL友好的标识符（唯一）
  description TEXT,                      -- 课程描述
  target_audience TEXT,                  -- 针对受众
  learning_outcomes TEXT,                 -- 课程学习成果（数据库实际字段名）
  prerequisites TEXT,                    -- Prerequisites
  cancellation_policy TEXT,              -- 取消政策
  number_of_sessions INTEGER,            -- 课程次数（向后兼容）
  session_count INTEGER,                 -- 课程次数（数据库实际字段）
  target_age_min INTEGER,                 -- 目标学员最小年龄（向后兼容）
  target_age_max INTEGER,                -- 目标学员最大年龄（向后兼容）
  age_min INTEGER,                        -- 目标学员最小年龄（数据库实际字段）
  age_max INTEGER,                        -- 目标学员最大年龄（数据库实际字段）
  target_grades TEXT[],                  -- 目标学员年级数组，如 ['K-2', '3-4']（向后兼容）
  grade_level TEXT,                       -- 目标学员年级（数据库实际字段）
  base_price DECIMAL(10, 2),             -- 基础价格（参考价格）
  currency TEXT DEFAULT 'USD',           -- 货币
  duration_hours INTEGER,                 -- 课程时长（小时）
  poster_url TEXT,                        -- 课程招贴画 URL（存储在 Vercel Blob）
  status course_status DEFAULT 'draft',   -- 课程状态：'draft', 'published', 'suspended', 'archived'
  is_active BOOLEAN,                     -- 向后兼容字段（映射自 status）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**特点：**
- 不包含任何分类信息（category_id, series_id, subcategory_id）
- 只包含课程本身的内容和属性
- 可以在多个地方使用（通过 Assignment）
- 使用 `status` 字段管理课程状态（替代简单的 `is_active` 布尔值）
- 支持课程招贴画（poster_url）

#### 1.2 course_categories（课程大类表）- 独立管理
```sql
CREATE TABLE course_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,             -- 'courses', 'camp', 'workshop'
  display_name TEXT NOT NULL,            -- 显示名称
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**特点：**
- 完全独立，可以独立创建和管理
- 不依赖其他表

#### 1.3 course_series（课程系列表）- 必须关联 Category
```sql
CREATE TABLE course_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES course_categories(id) ON DELETE CASCADE,
  franchise_id UUID REFERENCES franchises(id),  -- 所属 Franchise（可选，用于多租户）
  name TEXT NOT NULL,                    -- 'winter-2025'
  display_name TEXT NOT NULL,           -- '2025年冬季课程'
  description TEXT,
  start_date DATE,                       -- 系列开始日期
  end_date DATE,                         -- 系列结束日期
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(category_id, name)              -- 同一大类下系列名称唯一
);
```

**特点：**
- 必须关联到一个 Category（NOT NULL）
- 同一 Category 下 Series 名称唯一
- 可选关联到 Franchise（支持多租户场景）

#### 1.4 course_subcategories（课程子类标签表）- 标签系统
```sql
CREATE TABLE course_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,             -- 'roboquests', 'launchpad', 'robochamps'
  display_name TEXT NOT NULL,            -- 显示名称
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**特点：**
- 完全独立，不关联任何其他表
- 作为标签使用，可以独立管理
- Course 可以有多个 Subcategory 标签（通过多对多关系）

#### 1.5 course_subcategory_tags（课程-子类标签关联表）- 多对多
```sql
CREATE TABLE course_subcategory_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  subcategory_id UUID NOT NULL REFERENCES course_subcategories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id, subcategory_id)     -- 防止重复标签
);
```

**特点：**
- 实现 Course 和 Subcategory 的多对多关系
- 一个 Course 可以有多个 Subcategory 标签
- 一个 Subcategory 可以关联多个 Course

#### 1.6 course_assignments（课程分配表）- 核心多对多关系
```sql
CREATE TABLE course_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES course_categories(id) ON DELETE CASCADE,
  series_id UUID NOT NULL REFERENCES course_series(id) ON DELETE CASCADE,
  location_id UUID REFERENCES course_locations(id) ON DELETE SET NULL,
  display_order INTEGER DEFAULT 0,      -- 在该 Series 中的显示顺序
  is_active BOOLEAN DEFAULT TRUE,        -- 该分配是否激活
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id, category_id, series_id, location_id)  -- 防止重复分配
);
```

**特点：**
- 实现 Course 到 Category + Series + Location 的分配
- 一个 Course 可以分配到多个不同的组合
- 必须指定 Category 和 Series（NOT NULL）
- Location 可选（可以为 NULL，表示该分配不绑定特定地点）
- 通过 UNIQUE 约束防止重复分配

#### 1.7 course_locations（地点表）- 扩展支持 Campus 信息
```sql
CREATE TABLE course_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- 'Bellevue', 'Issaquah', 'Bel-Red'
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  description TEXT,                      -- Campus 描述和概述
  phone TEXT,                            -- Campus 联系电话
  email TEXT,                            -- Campus 联系邮箱
  parking_info TEXT,                     -- 停车信息和说明
  check_in_info TEXT,                    -- 签到流程和信息
  amenities JSONB,                       -- Campus 设施（JSON 格式）
  franchise_id UUID REFERENCES franchises(id),  -- 所属 Franchise（用于多租户）
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**特点：**
- 支持详细的 Campus 信息（描述、联系方式、停车、签到、设施等）
- 关联到 Franchise（支持多租户场景）

#### 1.8 course_instances（课程实例表）- 关联 Course Assignment
```sql
CREATE TABLE course_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES course_assignments(id) ON DELETE CASCADE,
  location_id UUID REFERENCES course_locations(id) ON DELETE SET NULL,
  franchise_id UUID REFERENCES franchises(id),  -- 冗余字段，用于加速按 Franchise 过滤
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME,                       -- '09:00'
  end_time TIME,                         -- '15:00'
  days_of_week INTEGER[],                -- [1,3,5] 表示周一、周三、周五
  -- iCalendar (RFC5545) 字段 - 支持重复规则和例外日期
  icalendar_rrule TEXT,                  -- RRULE 字符串，如 'FREQ=WEEKLY;BYDAY=TU'
  icalendar_exdates TEXT[],              -- 排除日期数组，格式: ['20250121', '20250218']
  icalendar_rdates TEXT[],                -- 额外日期数组，格式: ['20250122T090000', '20250219T090000']
  timezone TEXT DEFAULT 'America/Los_Angeles',  -- 时区标识符
  instructor_id UUID,                    -- 可选，关联 users 表
  instructor_name TEXT,                  -- 讲师姓名（如果不在 users 表中）
  max_students INTEGER,
  current_students INTEGER DEFAULT 0,
  price_override DECIMAL(10, 2),         -- 价格覆盖（如果与 Course 的 base_price 不同）
  status TEXT DEFAULT 'scheduled',       -- 'scheduled', 'ongoing', 'completed', 'cancelled'
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**特点：**
- 关联到 `course_assignments` 而不是直接关联 `courses`
- 每个 Instance 属于一个特定的 Assignment
- 可以有自己的 location_id（覆盖 Assignment 的 location_id）
- 可以有价格覆盖（price_override）
- 支持 iCalendar (RFC5545) 标准，用于处理重复规则和例外日期
- 包含 `franchise_id` 冗余字段，用于加速按 Franchise 过滤查询

#### 1.9 course_instance_exceptions（课程实例例外日期表）- 可选，用于详细管理
```sql
CREATE TABLE course_instance_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES course_instances(id) ON DELETE CASCADE,
  exception_type TEXT NOT NULL CHECK (exception_type IN ('skip', 'reschedule', 'time_change')),
  original_date DATE NOT NULL,          -- 原定日期
  new_date DATE,                         -- 改期后的日期（如果是 reschedule）
  new_start_time TIME,                   -- 改期后的开始时间（如果是 time_change）
  new_end_time TIME,                     -- 改期后的结束时间（如果是 time_change）
  reason TEXT,                           -- 原因（如 "法定节假日"）
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(instance_id, original_date)
);
```

**特点：**
- 用于更详细地管理课程实例的例外日期
- 支持跳过、改期、时间变更三种类型
- 与 `icalendar_exdates` 和 `icalendar_rdates` 字段配合使用

## 数据关系图

```
courses (独立)
  ├── course_subcategory_tags (多对多)
  │   └── course_subcategories (标签)
  └── course_assignments (多对多)
      ├── course_categories (必须)
      ├── course_series (必须，且属于 Category)
      │   └── franchises (可选，多租户)
      └── course_locations (可选)
          ├── franchises (可选，多租户)
          └── course_instances (关联 Assignment)
              ├── franchises (冗余字段，加速查询)
              ├── course_instance_exceptions (可选，例外日期管理)
              └── course_enrollments (用户注册)
                  ├── users (用户)
                  ├── enrollment_status_history (状态历史)
                  └── waitlist_notifications (等待列表通知)
```

## Enrollment 关联关系

### 2.1 course_enrollments（课程注册表）

```sql
CREATE TABLE course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES course_instances(id) ON DELETE CASCADE,
  
  -- 注册状态
  status TEXT NOT NULL DEFAULT 'cart' CHECK (status IN (
    'cart',           -- 在注册清单中（未支付）
    'reserved',       -- 已保留（支付中）
    'enrolled',       -- 已正式注册
    'waitlisted',     -- 在等待列表中
    'cancelled',      -- 已取消
    'expired',        -- 已过期（自动释放）
    'completed'       -- 课程已完成
  )),
  
  -- 时间相关字段
  added_to_cart_at TIMESTAMP WITH TIME ZONE,
  cart_expires_at TIMESTAMP WITH TIME ZONE,
  reserved_at TIMESTAMP WITH TIME ZONE,
  reserved_expires_at TIMESTAMP WITH TIME ZONE,
  enrolled_at TIMESTAMP WITH TIME ZONE,
  waitlisted_at TIMESTAMP WITH TIME ZONE,
  waitlist_position INTEGER,
  waitlist_notified_at TIMESTAMP WITH TIME ZONE,
  waitlist_expires_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_reason TEXT,
  
  -- 支付相关
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN (
    'unpaid', 'pending', 'paid', 'refunded', 'failed'
  )),
  amount_paid DECIMAL(10, 2),
  currency TEXT DEFAULT 'USD',
  payment_transaction_id TEXT,
  
  -- 元数据
  notes TEXT,
  metadata JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**关联关系：**
- `user_id` → `users.id` (CASCADE DELETE)
- `instance_id` → `course_instances.id` (CASCADE DELETE)

**特点：**
- 一个用户可以注册多个 Instance
- 一个 Instance 可以有多个 Enrollment
- 通过触发器自动更新 `course_instances.current_students` 计数
- 支持购物车、保留、等待列表等多种状态

### 2.2 enrollment_status_history（注册状态历史表）

```sql
CREATE TABLE enrollment_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES users(id),
  change_reason TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**用途：**
- 记录所有 Enrollment 状态变更历史
- 用于审计和追踪
- 自动通过触发器记录

### 2.3 waitlist_notifications（等待列表通知表）

```sql
CREATE TABLE waitlist_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'spot_available', 'expiring_soon', 'expired'
  )),
  notification_method TEXT NOT NULL CHECK (notification_method IN (
    'email', 'sms', 'in_app'
  )),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB
);
```

**用途：**
- 记录等待列表通知
- 支持多种通知方式

## 业务逻辑设计

### 2.1 Course 管理流程

**创建 Course：**
1. 管理员进入 "Courses" 管理页面
2. 点击 "Add Course"
3. 填写课程基本信息（名称、描述、目标受众等）
4. 可选：添加 Subcategory 标签（多选）
5. 保存 Course（此时 Course 还未分配到任何 Category/Series）

**编辑 Course：**
1. 在 Course 列表中点击编辑
2. 修改课程内容
3. 添加/删除 Subcategory 标签
4. 保存（不影响已有的 Assignment）

### 2.2 Category 和 Series 管理流程

**创建 Category：**
1. 管理员进入 "Categories" 管理页面
2. 点击 "Add Category"
3. 填写 Category 信息
4. 保存

**创建 Series：**
1. 管理员进入 "Series" 管理页面
2. 点击 "Add Series"
3. **必须选择**一个 Category
4. 填写 Series 信息（名称、日期范围等）
5. 保存

### 2.3 Course Assignment 流程

**分配 Course 到 Category/Series：**
1. 管理员进入 "Course Assignments" 管理页面
2. 选择要分配的 Course
3. 选择 Category（必须）
4. 选择 Series（必须，且必须属于选中的 Category）
5. 选择 Location（可选）
6. 设置显示顺序
7. 保存 Assignment

**一个 Course 可以：**
- 分配到多个不同的 Category/Series 组合
- 在同一 Series 中分配到不同的 Location
- 通过不同的 Assignment 有不同的显示顺序

### 2.4 Course Instance 创建流程

**创建 Course Instance：**
1. 管理员进入 "Course Instances" 管理页面
2. 选择 Course Assignment（必须）
3. 填写实例信息（日期、时间、地点等）
4. 可以覆盖 Assignment 的 Location
5. 可以设置价格覆盖
6. 设置重复规则（RRULE）：
   - 选择星期几（days_of_week）
   - 系统自动生成 `icalendar_rrule`（如 `FREQ=WEEKLY;BYDAY=TU`）
   - 或手动输入自定义 RRULE
7. 设置例外日期（可选）：
   - 跳过日期（添加到 `icalendar_exdates`）
   - 改期日期（添加到 `icalendar_rdates`）
8. 保存 Instance

**管理例外日期：**
1. 在 Instance 编辑页面可以添加例外日期
2. 支持跳过、改期、时间变更三种类型
3. 例外日期会自动同步到 `icalendar_exdates` 和 `icalendar_rdates` 字段
4. 也可以使用 `course_instance_exceptions` 表进行更详细的管理

## UI/UX 设计思路

### 3.1 管理页面结构

**Admin 侧边栏菜单：**
```
- Courses Admin
  ├── Courses (管理课程内容)
  ├── Categories (管理大类)
  ├── Series (管理系列)
  ├── Subcategories (管理子类标签)
  ├── Locations (管理地点)
  ├── Assignments (管理课程分配)
  └── Instances (管理课程实例)
```

### 3.2 Courses 页面
- **功能**：只管理课程本身的内容
- **列表显示**：课程名称、描述、标签（Subcategories）、创建时间
- **操作**：Add Course, Edit Course, Delete Course
- **不显示**：Category、Series 信息（这些在 Assignment 中管理）

### 3.3 Categories 页面
- **功能**：管理课程大类
- **列表显示**：名称、显示名称、描述、包含的 Series 数量
- **操作**：Add Category, Edit Category, Delete Category

### 3.4 Series 页面
- **功能**：管理课程系列
- **列表显示**：名称、显示名称、所属 Category、日期范围、包含的 Assignments 数量
- **操作**：Add Series, Edit Series, Delete Series
- **创建时**：必须选择 Category

### 3.5 Subcategories 页面
- **功能**：管理子类标签
- **列表显示**：名称、显示名称、使用该标签的 Course 数量
- **操作**：Add Subcategory, Edit Subcategory, Delete Subcategory

### 3.6 Assignments 页面
- **功能**：管理课程分配
- **列表显示**：Course 名称、Category、Series、Location、显示顺序、状态
- **操作**：Add Assignment, Edit Assignment, Delete Assignment
- **创建时**：
  - 选择 Course（下拉列表，显示所有 Course）
  - 选择 Category（下拉列表）
  - 选择 Series（下拉列表，根据 Category 过滤）
  - 选择 Location（可选，下拉列表）
  - 设置显示顺序

### 3.7 Instances 页面
- **功能**：管理课程实例
- **列表显示**：Course 名称、Category、Series、Location、日期、时间、状态
- **操作**：Add Instance, Edit Instance, Delete Instance
- **创建时**：
  - 选择 Course Assignment（下拉列表，显示格式：Course Name - Category - Series - Location）
  - 填写实例信息

## 数据查询示例

### 4.1 获取某个 Category 下的所有 Course
```sql
SELECT DISTINCT c.*
FROM courses c
JOIN course_assignments ca ON c.id = ca.course_id
WHERE ca.category_id = 'category-uuid'
  AND ca.is_active = TRUE
  AND c.is_active = TRUE;
```

### 4.2 获取某个 Series 下的所有 Course（带分配信息）
```sql
SELECT 
  c.*,
  ca.display_order,
  ca.location_id,
  cl.name as location_name
FROM courses c
JOIN course_assignments ca ON c.id = ca.course_id
LEFT JOIN course_locations cl ON ca.location_id = cl.id
WHERE ca.series_id = 'series-uuid'
  AND ca.is_active = TRUE
  AND c.is_active = TRUE
ORDER BY ca.display_order;
```

### 4.3 获取某个 Course 的所有分配
```sql
SELECT 
  ca.*,
  cc.name as category_name,
  cs.name as series_name,
  cl.name as location_name
FROM course_assignments ca
JOIN course_categories cc ON ca.category_id = cc.id
JOIN course_series cs ON ca.series_id = cs.id
LEFT JOIN course_locations cl ON ca.location_id = cl.id
WHERE ca.course_id = 'course-uuid'
  AND ca.is_active = TRUE;
```

### 4.4 获取某个 Course 的所有标签
```sql
SELECT sc.*
FROM course_subcategories sc
JOIN course_subcategory_tags cst ON sc.id = cst.subcategory_id
WHERE cst.course_id = 'course-uuid'
  AND sc.is_active = TRUE;
```

### 4.5 获取某个 Assignment 的所有 Instances
```sql
SELECT ci.*
FROM course_instances ci
WHERE ci.assignment_id = 'assignment-uuid'
  AND ci.is_active = TRUE
ORDER BY ci.start_date, ci.start_time;
```

## 迁移策略

### 5.1 数据迁移步骤

1. **创建新表结构**
   - 创建新的 `course_assignments` 表
   - 创建新的 `course_subcategory_tags` 表
   - 修改 `course_subcategories` 表（移除 series_id）
   - 修改 `courses` 表（移除 subcategory_id）
   - 修改 `course_instances` 表（添加 assignment_id，移除 course_id）

2. **迁移现有数据**
   - 从现有的 `courses.subcategory_id` 创建 `course_assignments` 记录
   - 迁移 `course_subcategories` 数据（移除 series_id 关联）
   - 创建 `course_subcategory_tags` 关联（基于原有的 subcategory_id）
   - 迁移 `course_instances`（创建对应的 assignment，然后关联）

3. **验证数据完整性**
   - 确保所有 Course 都有对应的 Assignment
   - 确保所有 Instance 都有对应的 Assignment
   - 确保数据一致性

## 优势分析

### 6.1 灵活性
- ✅ 一个 Course 可以出现在多个 Category/Series 中
- ✅ 可以轻松调整 Course 的展示位置
- ✅ 不需要复制 Course 数据

### 6.2 可扩展性
- ✅ 可以轻松添加新的 Category 和 Series
- ✅ Subcategory 作为标签，可以灵活使用
- ✅ 不影响现有 Course 数据

### 6.3 维护性
- ✅ Course 内容集中管理
- ✅ 分类和分配逻辑分离
- ✅ 易于理解和维护

### 6.4 业务逻辑清晰
- ✅ Course = 课程内容（不变）
- ✅ Assignment = 课程展示（可变）
- ✅ Instance = 具体开课（基于 Assignment）

## 状态变化和操作影响分析

### 3.1 Course 状态变化影响

#### 3.1.1 Course 状态：draft → published
**影响：**
- ✅ 允许创建 `course_assignments`
- ✅ 允许创建 `course_instances`
- ✅ 课程在前端可见（如果 Assignment 已创建）
- ✅ 用户可以注册该课程的 Instance

#### 3.1.2 Course 状态：published → suspended
**影响：**
- ⚠️ 不能再创建新的 `course_assignments`
- ⚠️ 不能再创建新的 `course_instances`
- ✅ 已有的 `course_instances` 不受影响（继续运行）
- ✅ 已有的 `course_enrollments` 不受影响（继续有效）
- ⚠️ 课程在前端不可见（但已有注册的用户仍可访问）

#### 3.1.3 Course 状态：published/suspended → archived
**影响：**
- ⚠️ 不能再创建新的 `course_assignments`
- ⚠️ 不能再创建新的 `course_instances`
- ✅ 已有的 `course_instances` 保留（历史记录）
- ✅ 已有的 `course_enrollments` 保留（历史记录）
- ⚠️ 课程在前端完全不可见

#### 3.1.4 Course 状态：任何状态 → draft
**影响：**
- ⚠️ 不能再创建新的 `course_assignments`
- ⚠️ 不能再创建新的 `course_instances`
- ✅ 已有的数据保留（历史记录）
- ⚠️ 课程在前端不可见

### 3.2 Course 删除操作影响

#### 3.2.1 删除 Course
**级联影响（CASCADE DELETE）：**
1. ✅ 删除所有 `course_subcategory_tags`（课程标签关联）
2. ✅ 删除所有 `course_assignments`（课程分配）
3. ✅ 删除所有 `course_instances`（课程实例）
4. ✅ 删除所有 `course_enrollments`（用户注册）⚠️ **重要：会删除所有相关注册记录**
5. ✅ 删除所有 `course_instance_exceptions`（例外日期）
6. ✅ 删除所有 `course_instance_coaches`（教练关联）

**注意事项：**
- ⚠️ **危险操作**：删除 Course 会级联删除所有相关数据
- ⚠️ 建议：删除前先检查是否有活跃的 `course_enrollments`（status = 'enrolled'）
- ⚠️ 建议：删除前先归档（archive）而不是直接删除

### 3.3 Course 编辑操作影响

#### 3.3.1 编辑 Course 基本信息
**影响：**
- ✅ 更新 `courses` 表记录
- ✅ 所有关联的 `course_assignments` 自动反映新信息（通过 JOIN 查询）
- ✅ 所有关联的 `course_instances` 自动反映新信息（通过 JOIN 查询）
- ✅ 已有的 `course_enrollments` 不受影响

#### 3.3.2 编辑 Course 价格（base_price）
**影响：**
- ✅ 新创建的 `course_instances` 使用新价格
- ✅ 已有的 `course_instances` 不受影响（如果设置了 `price_override`）
- ✅ 已有的 `course_enrollments` 不受影响（已支付金额不变）

### 3.4 Category 状态变化和操作影响

#### 3.4.1 Category is_active: true → false
**影响：**
- ⚠️ Category 在前端不可见
- ✅ 关联的 `course_series` 保留
- ✅ 关联的 `course_assignments` 保留
- ✅ 关联的 `course_instances` 保留
- ✅ 关联的 `course_enrollments` 保留

#### 3.4.2 删除 Category
**级联影响（CASCADE DELETE）：**
1. ✅ 删除所有 `course_series`（系列）
2. ✅ 删除所有 `course_assignments`（分配）
3. ✅ 删除所有 `course_instances`（实例）
4. ✅ 删除所有 `course_enrollments`（注册）⚠️ **重要**

**注意事项：**
- ⚠️ **危险操作**：删除 Category 会级联删除所有相关数据
- ⚠️ 建议：删除前先检查是否有活跃的 `course_enrollments`

### 3.5 Series 状态变化和操作影响

#### 3.5.1 Series is_active: true → false
**影响：**
- ⚠️ Series 在前端不可见
- ✅ 关联的 `course_assignments` 保留
- ✅ 关联的 `course_instances` 保留
- ✅ 关联的 `course_enrollments` 保留

#### 3.5.2 删除 Series
**级联影响（CASCADE DELETE）：**
1. ✅ 删除所有 `course_assignments`（分配）
2. ✅ 删除所有 `course_instances`（实例）
3. ✅ 删除所有 `course_enrollments`（注册）⚠️ **重要**

**注意事项：**
- ⚠️ **危险操作**：删除 Series 会级联删除所有相关数据
- ⚠️ 建议：删除前先检查是否有活跃的 `course_enrollments`

### 3.6 Assignment 状态变化和操作影响

#### 3.6.1 Assignment is_active: true → false
**影响：**
- ⚠️ Assignment 在前端不可见
- ✅ 关联的 `course_instances` 保留
- ✅ 关联的 `course_enrollments` 保留

#### 3.6.2 删除 Assignment
**级联影响（CASCADE DELETE）：**
1. ✅ 删除所有 `course_instances`（实例）
2. ✅ 删除所有 `course_enrollments`（注册）⚠️ **重要**

**注意事项：**
- ⚠️ **危险操作**：删除 Assignment 会级联删除所有相关数据
- ⚠️ 建议：删除前先检查是否有活跃的 `course_enrollments`

### 3.7 Instance 状态变化和操作影响

#### 3.7.1 Instance status: scheduled → ongoing
**影响：**
- ✅ 更新 `course_instances.status`
- ✅ 已有的 `course_enrollments` 不受影响
- ✅ 用户可以继续访问课程内容

#### 3.7.2 Instance status: ongoing → completed
**影响：**
- ✅ 更新 `course_instances.status`
- ✅ 可以批量更新 `course_enrollments.status` 为 'completed'
- ✅ 用户可以查看课程完成记录

#### 3.7.3 Instance status: scheduled/ongoing → cancelled
**影响：**
- ✅ 更新 `course_instances.status`
- ⚠️ 需要处理所有 `course_enrollments`：
  - 如果 `payment_status = 'paid'`，需要退款或转为 credit
  - 更新 `course_enrollments.status` 为 'cancelled'
  - 发送通知给所有受影响用户
- ✅ 释放 `current_students` 计数

#### 3.7.4 删除 Instance
**级联影响（CASCADE DELETE）：**
1. ✅ 删除所有 `course_enrollments`（注册）⚠️ **重要**
2. ✅ 删除所有 `course_instance_exceptions`（例外日期）
3. ✅ 删除所有 `course_instance_coaches`（教练关联）

**注意事项：**
- ⚠️ **危险操作**：删除 Instance 会级联删除所有相关注册
- ⚠️ 建议：删除前先处理退款（如果 `payment_status = 'paid'`）
- ⚠️ 建议：使用 `cancelled` 状态而不是删除

#### 3.7.5 编辑 Instance（日期、时间、地点等）
**影响：**
- ✅ 更新 `course_instances` 表记录
- ⚠️ 如果修改了日期/时间，需要通知所有 `course_enrollments` 用户
- ⚠️ 如果修改了地点，需要通知所有 `course_enrollments` 用户
- ✅ 已有的 `course_enrollments` 保留（但可能需要用户确认）

### 3.8 Enrollment 状态变化影响

#### 3.8.1 Enrollment status: cart → reserved
**影响：**
- ✅ 更新 `course_enrollments.status`
- ✅ 设置 `reserved_at` 和 `reserved_expires_at`
- ✅ 更新 `payment_status` 为 'pending'
- ✅ 占用 Instance 容量（通过触发器更新 `current_students`）

#### 3.8.2 Enrollment status: reserved → enrolled
**影响：**
- ✅ 更新 `course_enrollments.status`
- ✅ 设置 `enrolled_at`
- ✅ 更新 `payment_status` 为 'paid'
- ✅ 确认占用 Instance 容量

#### 3.8.3 Enrollment status: enrolled → cancelled
**影响：**
- ✅ 更新 `course_enrollments.status`
- ✅ 设置 `cancelled_at` 和 `cancelled_reason`
- ✅ 释放 Instance 容量（通过触发器更新 `current_students`）
- ⚠️ 如果 `payment_status = 'paid'`，需要处理退款：
  - 提前 30 天取消：扣除 3% 手续费后退款
  - 其他情况：根据取消政策处理
- ⚠️ 如果 `payment_status = 'paid'`，可以选择退款或转为 credit

#### 3.8.4 Enrollment status: cart/reserved → expired
**影响：**
- ✅ 自动更新 `course_enrollments.status`（通过定时任务）
- ✅ 释放 Instance 容量
- ✅ 如果 `payment_status = 'pending'`，更新为 'failed'

#### 3.8.5 Enrollment status: enrolled → waitlisted
**影响：**
- ⚠️ 通常不会发生（enrolled 不应该变为 waitlisted）
- ⚠️ 如果发生，需要释放 Instance 容量并加入等待列表

#### 3.8.6 Enrollment status: waitlisted → enrolled
**影响：**
- ✅ 更新 `course_enrollments.status`
- ✅ 设置 `enrolled_at`
- ✅ 占用 Instance 容量
- ✅ 更新等待列表位置（通过触发器）

### 3.9 操作影响总结表

| 操作 | 影响的表 | 级联删除 | 注意事项 |
|------|---------|---------|---------|
| **删除 Course** | course_subcategory_tags, course_assignments, course_instances, course_enrollments, course_instance_exceptions, course_instance_coaches | ✅ 是 | ⚠️ 危险：会删除所有注册记录 |
| **删除 Category** | course_series, course_assignments, course_instances, course_enrollments | ✅ 是 | ⚠️ 危险：会删除所有注册记录 |
| **删除 Series** | course_assignments, course_instances, course_enrollments | ✅ 是 | ⚠️ 危险：会删除所有注册记录 |
| **删除 Assignment** | course_instances, course_enrollments | ✅ 是 | ⚠️ 危险：会删除所有注册记录 |
| **删除 Instance** | course_enrollments, course_instance_exceptions, course_instance_coaches | ✅ 是 | ⚠️ 危险：需要先处理退款 |
| **Course: published → suspended** | 无 | ❌ 否 | ⚠️ 不能再创建新实例 |
| **Course: published → archived** | 无 | ❌ 否 | ⚠️ 前端不可见 |
| **Instance: scheduled → cancelled** | course_enrollments (状态更新) | ❌ 否 | ⚠️ 需要处理退款 |
| **Enrollment: enrolled → cancelled** | course_instances (current_students 更新) | ❌ 否 | ⚠️ 需要处理退款 |

### 3.10 最佳实践建议

1. **删除操作前检查：**
   - 检查是否有活跃的 `course_enrollments`（status = 'enrolled'）
   - 检查是否有已支付的 `course_enrollments`（payment_status = 'paid'）
   - 建议使用状态变更（suspended/archived）而不是删除

2. **状态变更前通知：**
   - Instance 取消前通知所有已注册用户
   - Course 状态变更前通知管理员

3. **数据保留策略：**
   - 使用 `archived` 状态保留历史记录
   - 定期归档旧数据而不是删除
   - 保留 `enrollment_status_history` 用于审计

4. **退款处理：**
   - Instance 取消时自动处理退款
   - 支持退款到原支付方式或转为 credit
   - 记录所有退款操作

## 已实现的功能

### 1. 课程状态管理
- ✅ 使用 `status` 枚举类型（'draft', 'published', 'suspended', 'archived'）
- ✅ 只有 'published' 状态的课程可以创建 Assignment 和 Instance
- ✅ RLS 策略：普通用户只能查看 'published' 状态的课程

### 2. iCalendar 支持
- ✅ 支持 RRULE（重复规则）：`FREQ=WEEKLY;BYDAY=TU`
- ✅ 支持 EXDATE（排除日期）：跳过特定日期
- ✅ 支持 RDATE（额外日期）：改期到其他日期
- ✅ 支持时区设置（默认 'America/Los_Angeles'）
- ✅ 自动生成实际开课日期列表

### 3. 多租户支持（Franchise）
- ✅ `course_series` 可以关联到 `franchises`
- ✅ `course_locations` 可以关联到 `franchises`
- ✅ `course_instances` 包含 `franchise_id` 冗余字段，加速查询

### 4. 课程招贴画
- ✅ `courses.poster_url` 字段存储课程招贴画 URL（Vercel Blob）

### 5. Location 扩展信息
- ✅ `course_locations` 支持详细 Campus 信息（描述、联系方式、停车、签到、设施等）

## 待确认的问题

1. **Location 在 Assignment 中的角色**
   - ✅ 已实现：Instance 可以覆盖 Assignment 的 Location
   - Instance 的 `location_id` 可以为空或与 Assignment 不同

2. **价格管理**
   - ✅ 已实现：价格优先级为 Instance > Course
   - Course 有 `base_price`
   - Instance 有 `price_override`（可选）
   - 如果 Instance 没有 `price_override`，使用 Course 的 `base_price`

3. **删除策略**
   - ✅ 已实现：CASCADE 删除策略
   - 删除 Course → 自动删除所有 Assignment 和 Instance
   - 删除 Category → 自动删除所有 Series、Assignment 和 Instance
   - 删除 Series → 自动删除所有 Assignment 和 Instance

4. **显示顺序**
   - ✅ 已实现：Assignment 有 `display_order`（在 Series 中的顺序）
   - Instance 不需要 `display_order`，按 `start_date` 和 `start_time` 排序

5. **搜索和过滤**
   - ✅ 已实现：可以通过 API 按多种条件搜索和过滤
   - 搜索 Course：按名称、标签、Category、Series
   - 过滤 Assignment：按 Category、Series、Location、Franchise
   - 过滤 Instance：按 Assignment、Location、Franchise、日期范围

## 实施状态

### ✅ 已完成
1. ✅ 数据库迁移脚本（`migrate-courses-to-assignment-model.sql`）
2. ✅ TypeScript 类型定义（`src/lib/db.ts`）
3. ✅ 数据库操作函数（`src/lib/db.ts`）
4. ✅ API 路由（`src/app/api/admin/`）
5. ✅ UI 组件（Admin Portal）
6. ✅ iCalendar 支持（`src/lib/icalendar.ts`）
7. ✅ 课程状态管理（`migrate-course-status.sql`）
8. ✅ 多租户支持（Franchise 关联）
9. ✅ Location 扩展信息

### 📝 文档更新
- ✅ 本设计文档已根据实际实现更新
- ✅ 参考 `INSTANCE_RRULE_DESIGN.md` 了解 RRULE 设计详情

### 🔄 未来改进
1. 支持更多 RRULE 模式（两周一次、连续天数等）- 见 `INSTANCE_RRULE_DESIGN.md`
2. 优化 Instance 查询性能（使用 `franchise_id` 冗余字段）
3. 增强例外日期管理 UI
4. 支持批量创建 Instance

