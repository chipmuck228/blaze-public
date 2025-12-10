# 课程系统架构设计文档（方案A）

## 设计原则

1. **Course（课程）完全独立**：只包含课程本身的内容，不绑定任何分类
2. **Category 和 Series 独立管理**：可以独立创建、编辑、删除
3. **Series 必须关联 Category**：每个 Series 必须属于一个 Category
4. **Course Assignment（课程分配）**：通过多对多关系表实现灵活分配
5. **Course Instance 关联 Course Assignment**：实例关联到具体的分配，而不是直接关联 Course
6. **Subcategory 作为标签系统**：Course 可以有多个 Subcategory 标签，也可以没有

## 数据模型设计

### 1. 核心表结构

#### 1.1 courses（课程表）- 完全独立
```sql
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- 课程名称
  slug TEXT UNIQUE,                      -- URL友好的标识符（唯一）
  description TEXT,                     -- 课程描述
  target_audience TEXT,                  -- 针对受众
  outcomes TEXT,                         -- 课程outcome
  prerequisites TEXT,                    -- Prerequisites
  cancellation_policy TEXT,              -- 取消政策
  number_of_sessions INTEGER,            -- 课程次数
  target_age_min INTEGER,                 -- 目标学员最小年龄
  target_age_max INTEGER,                -- 目标学员最大年龄
  target_grades TEXT[],                  -- 目标学员年级数组，如 ['K-2', '3-4']
  base_price DECIMAL(10, 2),             -- 基础价格（参考价格）
  currency TEXT DEFAULT 'USD',           -- 货币
  is_active BOOLEAN DEFAULT TRUE,        -- 是否激活
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**特点：**
- 不包含任何分类信息（category_id, series_id, subcategory_id）
- 只包含课程本身的内容和属性
- 可以在多个地方使用（通过 Assignment）

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

#### 1.7 course_locations（地点表）- 保持不变
```sql
CREATE TABLE course_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- 'Bellevue', 'Issaquah', 'Bel-Red'
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 1.8 course_instances（课程实例表）- 关联 Course Assignment
```sql
CREATE TABLE course_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES course_assignments(id) ON DELETE CASCADE,
  location_id UUID REFERENCES course_locations(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME,                       -- '09:00'
  end_time TIME,                         -- '15:00'
  days_of_week INTEGER[],                -- [1,3,5] 表示周一、周三、周五
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

## 数据关系图

```
courses (独立)
  ├── course_subcategory_tags (多对多)
  │   └── course_subcategories (标签)
  └── course_assignments (多对多)
      ├── course_categories (必须)
      ├── course_series (必须，且属于 Category)
      └── course_locations (可选)
          └── course_instances (关联 Assignment)
```

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
6. 保存 Instance

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

## 待确认的问题

1. **Location 在 Assignment 中的角色**
   - 如果 Assignment 有 Location，是否所有 Instance 都必须在该 Location？
   - 还是 Instance 可以覆盖 Assignment 的 Location？

2. **价格管理**
   - Course 有 base_price
   - Assignment 是否需要价格？
   - Instance 有 price_override
   - 价格优先级：Instance > Assignment > Course？

3. **删除策略**
   - 删除 Course 时，是否自动删除所有 Assignment 和 Instance？
   - 删除 Category/Series 时，如何处理相关的 Assignment？

4. **显示顺序**
   - Assignment 有 display_order（在 Series 中的顺序）
   - Instance 是否需要 display_order？

5. **搜索和过滤**
   - 如何搜索 Course（按名称、标签、Category、Series）？
   - 如何过滤 Assignment（按 Category、Series、Location）？

## 下一步

等待确认后，将：
1. 创建新的 SQL 迁移脚本
2. 更新 TypeScript 类型定义
3. 更新数据库操作函数
4. 更新 API 路由
5. 更新 UI 组件

