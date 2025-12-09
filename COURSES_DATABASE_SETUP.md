# 课程数据库设置指南

## 概述

课程数据现在存储在数据库中，支持多层级分类和灵活的课程管理。

## 数据库表结构

### 1. course_categories - 课程大类表
- `id` - UUID 主键
- `name` - 大类名称（唯一），如 'courses', 'camp', 'workshop'
- `display_name` - 显示名称
- `description` - 描述
- `display_order` - 显示顺序
- `is_active` - 是否激活
- `created_at` - 创建时间
- `updated_at` - 更新时间

### 2. course_series - 课程系列表
- `id` - UUID 主键
- `category_id` - 关联的大类ID
- `name` - 系列名称，如 'winter-2025'
- `display_name` - 显示名称，如 '2025年冬季课程'
- `description` - 描述
- `start_date` - 开始日期
- `end_date` - 结束日期
- `display_order` - 显示顺序
- `is_active` - 是否激活
- `created_at` - 创建时间
- `updated_at` - 更新时间

### 3. course_subcategories - 课程子类表
- `id` - UUID 主键
- `series_id` - 关联的系列ID
- `name` - 子类名称，如 'roboquests', 'launchpad', 'robochamps'
- `display_name` - 显示名称
- `description` - 描述
- `display_order` - 显示顺序
- `is_active` - 是否激活
- `created_at` - 创建时间
- `updated_at` - 更新时间

### 4. courses - 课程表
- `id` - UUID 主键
- `subcategory_id` - 关联的子类ID
- `name` - 课程名称，如 'Introduction to Robotics with VEX GO'
- `slug` - URL友好的标识符（唯一）
- `description` - 课程描述
- `target_audience` - 针对受众
- `outcomes` - 课程outcome
- `prerequisites` - Prerequisites
- `cancellation_policy` - 取消政策
- `number_of_sessions` - 课程次数
- `target_age_min` - 目标学员最小年龄
- `target_age_max` - 目标学员最大年龄
- `target_grades` - 目标学员年级数组，如 ['K-2', '3-4']
- `base_price` - 基础价格
- `currency` - 货币（默认 'USD'）
- `display_order` - 显示顺序
- `is_active` - 是否激活
- `created_at` - 创建时间
- `updated_at` - 更新时间

### 5. course_locations - 地点表
- `id` - UUID 主键
- `name` - 地点名称，如 'Bellevue', 'Issaquah', 'Bel-Red'
- `address` - 地址
- `city` - 城市
- `state` - 州
- `zip_code` - 邮编
- `phone` - 电话
- `email` - 邮箱
- `is_active` - 是否激活
- `created_at` - 创建时间
- `updated_at` - 更新时间

### 6. course_instances - 课程实例表
- `id` - UUID 主键
- `course_id` - 关联的课程ID
- `location_id` - 关联的地点ID（可选）
- `location_name` - 地点名称（如果location_id为NULL）
- `start_date` - 开课日期
- `end_date` - 结课日期
- `start_time` - 开始时间（如 '09:00:00'）
- `end_time` - 结束时间（如 '12:00:00'）
- `day_of_week` - 星期几开课数组，如 [1,3,5] 表示周一、三、五
- `price` - 实例特定价格（如果与基础价格不同）
- `max_students` - 最大学生数
- `current_students` - 当前学生数（默认 0）
- `instructor_name` - 讲师姓名
- `instructor_id` - 讲师ID（如果将来有讲师表）
- `status` - 状态：'scheduled', 'ongoing', 'completed', 'cancelled'
- `notes` - 备注
- `is_active` - 是否激活
- `created_at` - 创建时间
- `updated_at` - 更新时间

## 设置步骤

### 1. 在 Supabase 中创建表

在 Supabase SQL Editor 中运行 `create-courses-tables.sql` 文件：

```sql
-- 这个文件会：
-- 1. 创建所有课程相关表
-- 2. 设置索引和 RLS 策略
-- 3. 插入示例数据
```

### 2. 验证数据

运行以下查询验证数据是否正确插入：

```sql
-- 查看所有课程大类
SELECT * FROM course_categories ORDER BY display_order;

-- 查看课程层级结构
SELECT 
  cc.name as category,
  cs.name as series,
  csc.name as subcategory,
  c.name as course
FROM courses c
JOIN course_subcategories csc ON c.subcategory_id = csc.id
JOIN course_series cs ON csc.series_id = cs.id
JOIN course_categories cc ON cs.category_id = cc.id
ORDER BY cc.display_order, cs.display_order, csc.display_order, c.display_order;

-- 查看课程实例
SELECT 
  c.name as course_name,
  cl.name as location,
  ci.start_date,
  ci.end_date,
  ci.start_time,
  ci.end_time,
  ci.status
FROM course_instances ci
JOIN courses c ON ci.course_id = c.id
LEFT JOIN course_locations cl ON ci.location_id = cl.id
ORDER BY ci.start_date;
```

## 数据层级结构

```
Course Category (Courses, Camp, Workshop)
  └── Course Series (2025年冬季课程)
      └── Course Subcategory (RoboQuests, LaunchPad, RoboChamps)
          └── Course (Introduction to Robotics with VEX GO)
              └── Course Instance (不同地点、日期、时间段的开课)
```

## 功能特性

### 灵活的层级结构
- 支持多层级分类：大类 -> 系列 -> 子类 -> 课程
- 每个层级都可以独立管理
- 支持动态添加新的类别和子类

### 课程实例管理
- 同一课程可以在不同地点、日期、时间段开课
- 每个实例可以有不同的价格、讲师、学生数限制
- 支持课程状态管理（scheduled, ongoing, completed, cancelled）

### 数据库操作函数

在 `src/lib/db.ts` 中提供了以下函数：

- `getAllCourseCategories()` - 获取所有课程大类
- `getCourseSeriesByCategory(categoryId)` - 获取指定大类的所有系列
- `getCourseSubcategoriesBySeries(seriesId)` - 获取指定系列的所有子类
- `getCoursesBySubcategory(subcategoryId)` - 获取指定子类的所有课程
- `getCourseBySlug(slug)` - 根据slug获取课程
- `getCourseWithDetails(courseId)` - 获取课程详细信息（包含关联数据）
- `getCourseInstances(courseId)` - 获取指定课程的所有实例
- `getAllCourseLocations()` - 获取所有地点
- `createCourseInstance(instance)` - 创建课程实例
- `updateCourseInstance(instanceId, updates)` - 更新课程实例
- `deleteCourseInstance(instanceId)` - 删除课程实例

## 使用示例

### 获取课程信息

```typescript
import { getCourseWithDetails } from '@/lib/db'

// 获取课程详细信息
const course = await getCourseWithDetails(courseId)
if (course) {
  console.log(course.name) // 课程名称
  console.log(course.subcategory?.display_name) // 子类名称
  console.log(course.series?.display_name) // 系列名称
  console.log(course.category?.display_name) // 大类名称
  console.log(course.instances) // 所有课程实例
}
```

### 获取课程实例

```typescript
import { getCourseInstances } from '@/lib/db'

// 获取指定课程的所有实例
const instances = await getCourseInstances(courseId)
instances.forEach(instance => {
  console.log(`${instance.start_date} - ${instance.end_date}`)
  console.log(`Location: ${instance.location_name}`)
  console.log(`Time: ${instance.start_time} - ${instance.end_time}`)
})
```

## 安全特性

- **Row Level Security (RLS)**：所有表都启用了 RLS
- **公开读取**：所有人都可以查看激活的课程信息
- **管理员管理**：只有管理员可以创建、更新、删除课程数据

## 扩展性

### 添加新的大类

```sql
INSERT INTO course_categories (name, display_name, description, display_order)
VALUES ('new_category', 'New Category', 'Description', 4);
```

### 添加新的子类

```sql
INSERT INTO course_subcategories (series_id, name, display_name, description, display_order)
SELECT 
  cs.id,
  'new_subcategory',
  'New Subcategory',
  'Description',
  4
FROM course_series cs
WHERE cs.name = 'winter-2025';
```

### 添加新的课程

```sql
INSERT INTO courses (
  subcategory_id,
  name,
  slug,
  description,
  number_of_sessions,
  target_grades,
  base_price,
  display_order
)
SELECT 
  csc.id,
  'New Course Name',
  'new-course-slug',
  'Course description',
  10,
  ARRAY['K-2'],
  299.99,
  1
FROM course_subcategories csc
WHERE csc.name = 'roboquests';
```

## 注意事项

1. **唯一性约束**：
   - `course_categories.name` 必须唯一
   - `course_series` 的 `(category_id, name)` 组合必须唯一
   - `course_subcategories` 的 `(series_id, name)` 组合必须唯一
   - `courses.slug` 必须唯一

2. **级联删除**：
   - 删除大类会级联删除所有关联的系列、子类、课程和实例
   - 删除系列会级联删除所有关联的子类、课程和实例
   - 删除子类会级联删除所有关联的课程和实例
   - 删除课程会级联删除所有关联的实例

3. **软删除**：
   - 使用 `is_active` 字段进行软删除，而不是真正删除数据
   - 这样可以保留历史数据，便于恢复和审计

