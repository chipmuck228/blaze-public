# Course Catalog Franchise Instance 显示分析（含 Franchise 过滤）

## 问题描述

用户期望在 `http://localhost:3000/course-catalog?franchise=cherrycrest` 页面中：
- ✅ 显示 **Cherry Crest franchise** 的 Programs
- ✅ 每个 Program 下显示 **Cherry Crest franchise** 的 Course Instances（具体的课程安排/班级）
- ✅ 用户可以直接选择 Instance 进行 Enroll
- ✅ **关键要求**：只显示和该 franchise 相关的 program 和 course instance

**但当前实现**：
- ✅ 显示 Programs（已正确过滤 franchise）
- ❌ 每个 Program 下显示 **Courses**（课程内容，不是实例）
- ❌ **没有显示 Instances**
- ❌ 即使显示 Instances，也需要确保只显示该 franchise 的 Instances

---

## Franchise 过滤逻辑分析

### 1. 数据关系链（关键）

根据 `FRANCHISE_ASSIGNMENT_RELATIONSHIP.md` 的分析：

```
Franchise (cherrycrest)
  ↓ franchise_id (直接关联)
Course Series (2025 Winter Courses)
  ↓ series_id (直接关联)
Course Assignment
  ↓ assignment_id (直接关联)
Course Instance
  ↓ franchise_id (冗余字段，用于加速查询)
```

**关键点**：
- `course_series.franchise_id` → 直接关联到 Franchise
- `course_instances.franchise_id` → 冗余字段，应该等于 `series.franchise_id`
- `course_instances.assignment_id` → 关联到 Assignment
- `course_assignments.series_id` → 关联到 Series

---

### 2. 当前 API 实现：`GET /api/programs?franchise=cherrycrest`

**文件位置**：`src/app/api/programs/route.ts`

#### Step 1: Franchise 查找（第 19 行）
```typescript
const franchise = await getFranchiseByCode(franchiseCode);
// 查找 franchises 表，code = 'cherrycrest'
// 返回: { id: 'franchise-uuid', code: 'cherrycrest', name: 'Cherry Crest Robotics Academy' }
```
✅ **正确**：找到了对应的 franchise

#### Step 2: 查询 Series/Programs（第 28-49 行）
```typescript
const { data: seriesData } = await supabaseAdmin
  .from("course_series")
  .select(`...`)
  .eq("is_active", true)
  .eq("franchise_id", franchise.id)  // ✅ 正确过滤：只查询该 franchise 的 series
  .order("display_order", { ascending: true });
```
✅ **正确**：只返回 `franchise_id = franchise.id` 的 Series

**过滤结果**：
- ✅ 只返回 Cherry Crest 的 Programs（如 "2025 Winter Courses"）
- ✅ 不会返回 Bellevue、Issaquah 等其他 franchise 的 Programs

#### Step 3: 查询 Assignments（第 65-76 行）
```typescript
const { data: assignmentsData } = await supabaseAdmin
  .from("course_assignments")
  .select(`
    id,
    series_id,
    course:courses(*)
  `)
  .eq("is_active", true)
  .in("series_id", seriesIds);  // seriesIds 来自 Step 2，已经是该 franchise 的 series
```
✅ **正确**：通过 `series_id IN (seriesIds)` 间接过滤，只返回该 franchise 的 Assignments

**过滤结果**：
- ✅ 只返回属于 Cherry Crest Programs 的 Assignments
- ✅ 不会返回其他 franchise 的 Assignments

#### Step 4: 返回 Courses（第 122-172 行）
```typescript
// 按 series 分组课程（去重）
// 返回 Courses 列表
```
✅ **正确**：只返回该 franchise 的 Courses（通过 Assignment → Series 间接过滤）

**当前问题**：
- ❌ **没有查询 `course_instances`**
- ❌ **没有返回 Instances**

---

### 3. Instance API 实现：`GET /api/courses/[id]/instances?franchise=cherrycrest`

**文件位置**：`src/app/api/courses/[id]/instances/route.ts`

#### Step 1: 获取所有 Instances（第 28 行）
```typescript
let instances = await getCourseInstances(courseId);
```

**`getCourseInstances` 函数**（`src/lib/db.ts` 第 1540-1566 行）：
```typescript
export async function getCourseInstances(courseId: string): Promise<CourseInstance[]> {
  // 1. 获取所有 Assignment
  const { data: assignments } = await supabaseAdmin
    .from('course_assignments')
    .select('id')
    .eq('course_id', courseId)
    .eq('is_active', true)
  // ❌ 没有过滤 franchise！

  // 2. 获取所有 Instances
  const { data, error } = await supabaseAdmin
    .from('course_instances')
    .select('*')
    .in('assignment_id', assignmentIds)
    .eq('is_active', true)
  // ❌ 没有过滤 franchise！
  
  return data as CourseInstance[]
}
```

**问题**：
- ❌ `getCourseInstances` 返回的是**该 Course 的所有 Instances**（跨所有 franchise）
- ❌ 没有在数据库层面过滤 `franchise_id`

#### Step 2: 前端过滤 Franchise（第 30-43 行）
```typescript
if (franchiseCode) {
  const franchise = await getFranchiseByCode(franchiseCode);
  instances = instances.filter(
    (instance: any) => instance.franchise_id === franchise.id
  );
}
```
✅ **正确**：在应用层过滤，只返回该 franchise 的 Instances

**过滤结果**：
- ✅ 只返回 `franchise_id = franchise.id` 的 Instances
- ✅ 不会返回其他 franchise 的 Instances

**性能问题**：
- ⚠️ 先查询所有 Instances，再在应用层过滤
- ⚠️ 如果 Course 有很多跨 franchise 的 Instances，会有不必要的数据库查询

---

## Franchise 过滤的完整路径分析

### 路径 1：通过 Series（主要路径，总是可用）

```
Franchise (cherrycrest, id: 'franchise-uuid')
  ↓ franchise_id = 'franchise-uuid'
Course Series (2025 Winter Courses, franchise_id: 'franchise-uuid')
  ↓ series_id
Course Assignment (assignment_id, series_id: 'series-uuid')
  ↓ assignment_id
Course Instance (instance_id, assignment_id: 'assignment-uuid', franchise_id: 'franchise-uuid')
```

**过滤逻辑**：
1. ✅ 查询 Series：`WHERE franchise_id = 'franchise-uuid'`
2. ✅ 查询 Assignment：`WHERE series_id IN (series_ids_from_step_1)`
3. ✅ 查询 Instance：`WHERE assignment_id IN (assignment_ids_from_step_2)`
4. ✅ 验证：`WHERE franchise_id = 'franchise-uuid'`（冗余字段验证）

**数据一致性要求**：
- `instance.franchise_id` 应该等于 `series.franchise_id`
- 如果两者不一致，说明数据有问题

---

### 路径 2：通过 Location（辅助路径，可选）

```
Franchise (cherrycrest, id: 'franchise-uuid')
  ↓ franchise_id = 'franchise-uuid'
Course Location (Bellevue Campus, franchise_id: 'franchise-uuid')
  ↓ location_id
Course Instance (instance_id, location_id: 'location-uuid', franchise_id: 'franchise-uuid')
```

**注意**：
- `location_id` 是可选的（可以为 NULL）
- 如果指定了 Location，`location.franchise_id` 应该等于 `series.franchise_id`

---

## 当前实现的问题（Franchise 角度）

### 问题 1：`/api/programs` 没有返回 Instances

**当前状态**：
- ✅ 正确过滤了 Series（按 `franchise_id`）
- ✅ 正确过滤了 Assignments（通过 `series_id`）
- ✅ 正确过滤了 Courses（通过 Assignment）
- ❌ **没有查询 Instances**
- ❌ **没有返回 Instances**

**如果要在 `/api/programs` 中返回 Instances，需要**：
1. 查询 `course_instances` 表
2. 通过 `assignment_id` 关联到 `course_assignments`
3. 过滤条件：
   - `instance.status IN ('scheduled', 'ongoing')`
   - `instance.is_active = true`
   - `instance.franchise_id = franchise.id`（直接过滤，利用冗余字段）
   - 或者通过 `assignment.series_id` 间接过滤（确保 `series.franchise_id = franchise.id`）

---

### 问题 2：`getCourseInstances` 函数不区分 Franchise

**当前实现**（`src/lib/db.ts` 第 1540-1566 行）：
```typescript
export async function getCourseInstances(courseId: string): Promise<CourseInstance[]> {
  // 查询所有 Assignment（不区分 franchise）
  const { data: assignments } = await supabaseAdmin
    .from('course_assignments')
    .select('id')
    .eq('course_id', courseId)
    .eq('is_active', true)
  // ❌ 没有过滤 franchise

  // 查询所有 Instances（不区分 franchise）
  const { data, error } = await supabaseAdmin
    .from('course_instances')
    .select('*')
    .in('assignment_id', assignmentIds)
    .eq('is_active', true)
  // ❌ 没有过滤 franchise_id
  
  return data as CourseInstance[]
}
```

**问题**：
- ❌ 返回的是该 Course 的**所有 Instances**（跨所有 franchise）
- ❌ 需要在调用方（API 路由）中手动过滤 `franchise_id`
- ⚠️ 性能问题：查询了不必要的数据

**如果要在 `/api/programs` 中查询 Instances，有两种方案**：

**方案 A：在 API 中直接查询并过滤**
```typescript
// 在 /api/programs 中
const { data: instancesData } = await supabaseAdmin
  .from('course_instances')
  .select(`
    *,
    assignment:course_assignments(
      id,
      course_id,
      series_id
    )
  `)
  .in('assignment_id', assignmentIds)  // assignmentIds 来自该 franchise 的 assignments
  .eq('franchise_id', franchise.id)    // ✅ 直接过滤 franchise_id（利用冗余字段）
  .eq('is_active', true)
  .in('status', ['scheduled', 'ongoing'])
  .order('start_date', { ascending: true });
```

**方案 B：创建新的数据库函数**
```typescript
// 在 db.ts 中创建新函数
export async function getCourseInstancesByFranchise(
  courseId: string,
  franchiseId: string
): Promise<CourseInstance[]> {
  // 查询逻辑，同时过滤 course_id 和 franchise_id
}
```

---

## 正确的 Franchise 过滤查询示例

### 查询某个 Franchise 的所有 Instances（通过 Series）

```sql
-- 伪代码
SELECT 
  ci.*,
  ca.course_id,
  ca.series_id,
  cs.franchise_id as series_franchise_id,
  cl.name as location_name
FROM course_instances ci
JOIN course_assignments ca ON ci.assignment_id = ca.id
JOIN course_series cs ON ca.series_id = cs.id
LEFT JOIN course_locations cl ON ci.location_id = cl.id
WHERE cs.franchise_id = :franchise_id  -- ✅ 通过 Series 过滤
  AND ci.franchise_id = :franchise_id   -- ✅ 通过冗余字段验证（双重保险）
  AND ci.status IN ('scheduled', 'ongoing')
  AND ci.is_active = true
  AND ca.is_active = true
  AND cs.is_active = true
ORDER BY ci.start_date, ci.start_time;
```

**关键过滤点**：
1. ✅ `cs.franchise_id = :franchise_id`（通过 Series 过滤，主要路径）
2. ✅ `ci.franchise_id = :franchise_id`（通过冗余字段过滤，验证一致性）
3. ✅ `ci.status IN ('scheduled', 'ongoing')`（只返回未来的实例）
4. ✅ `ci.is_active = true`（只返回激活的实例）

---

## 数据一致性验证

### 验证点 1：Instance 的 Franchise 应该等于 Series 的 Franchise

**规则**：
- `instance.franchise_id` 应该等于 `series.franchise_id`
- 如果两者不一致，说明数据有问题

**验证查询**：
```sql
SELECT 
  ci.id as instance_id,
  ci.franchise_id as instance_franchise_id,
  cs.id as series_id,
  cs.franchise_id as series_franchise_id
FROM course_instances ci
JOIN course_assignments ca ON ci.assignment_id = ca.id
JOIN course_series cs ON ca.series_id = cs.id
WHERE ci.franchise_id != cs.franchise_id;
-- 如果返回结果，说明数据不一致
```

---

### 验证点 2：Instance 的 Franchise 应该等于 Location 的 Franchise（如果指定了 Location）

**规则**：
- 如果 `instance.location_id` 不为 NULL，则 `instance.franchise_id` 应该等于 `location.franchise_id`
- 如果两者不一致，说明数据有问题

**验证查询**：
```sql
SELECT 
  ci.id as instance_id,
  ci.franchise_id as instance_franchise_id,
  cl.id as location_id,
  cl.franchise_id as location_franchise_id
FROM course_instances ci
JOIN course_locations cl ON ci.location_id = cl.id
WHERE ci.franchise_id != cl.franchise_id;
-- 如果返回结果，说明数据不一致
```

---

## 期望的数据流（含 Franchise 过滤）

### 完整的数据流

```
用户访问 /course-catalog?franchise=cherrycrest
  ↓
AllCourses 组件
  ↓
调用 GET /api/programs?franchise=cherrycrest
  ↓
API 处理：
  1. 查找 franchise (code='cherrycrest') → franchise.id
  2. 查询 course_series WHERE franchise_id = franchise.id
  3. 查询 course_assignments WHERE series_id IN (series_ids)
  4. 查询 courses (通过 assignment.course_id)
  5. ✅ 查询 course_instances WHERE assignment_id IN (assignment_ids) AND franchise_id = franchise.id
  6. 按 Series → Course → Instance 分组
  ↓
返回数据结构：
  [
    {
      id: "series-id",
      display_name: "2025 Winter Courses",
      courses: [
        {
          id: "course-id",
          title: "Mastery Drivetrains",
          instances: [  // ✅ 只包含该 franchise 的 instances
            {
              id: "instance-id",
              start_date: "2025-01-15",
              end_date: "2025-03-29",
              location: { name: "Cherry Crest Campus" },
              available_capacity: 5,
              franchise_id: "franchise-uuid"  // ✅ 验证：等于 franchise.id
            }
          ]
        }
      ]
    }
  ]
  ↓
前端渲染：
  Program → Course → Instance 列表（只显示该 franchise 的 instances）
  ↓
用户点击 "Enroll" → 加入购物车
```

---

## 关键过滤点总结

### 1. Series 过滤（已实现 ✅）

```typescript
.eq("franchise_id", franchise.id)  // 在 /api/programs 中
```
✅ **正确**：只返回该 franchise 的 Programs

### 2. Assignment 过滤（已实现 ✅）

```typescript
.in("series_id", seriesIds)  // seriesIds 来自该 franchise 的 series
```
✅ **正确**：只返回该 franchise 的 Assignments

### 3. Course 过滤（已实现 ✅）

```typescript
// 通过 Assignment → Course 间接过滤
```
✅ **正确**：只返回该 franchise 的 Courses

### 4. Instance 过滤（未实现 ❌）

**当前状态**：
- ❌ `/api/programs` 没有查询 Instances
- ⚠️ `/api/courses/[id]/instances` 在应用层过滤（性能问题）

**需要实现**：
```typescript
// 在 /api/programs 中查询 Instances
const { data: instancesData } = await supabaseAdmin
  .from('course_instances')
  .select(`...`)
  .in('assignment_id', assignmentIds)  // assignmentIds 来自该 franchise 的 assignments
  .eq('franchise_id', franchise.id)     // ✅ 直接过滤 franchise_id
  .eq('is_active', true)
  .in('status', ['scheduled', 'ongoing'])
```

---

## 数据一致性要求

### 要求 1：Instance 的 Franchise 必须等于 Series 的 Franchise

**规则**：
```
instance.franchise_id = series.franchise_id
```

**验证**：
- 在查询时，同时过滤 `series.franchise_id` 和 `instance.franchise_id`
- 如果两者不一致，说明数据有问题，应该记录错误日志

### 要求 2：Instance 的 Franchise 必须等于 Location 的 Franchise（如果指定了 Location）

**规则**：
```
如果 instance.location_id IS NOT NULL，则
  instance.franchise_id = location.franchise_id
```

**验证**：
- 在查询时，如果 `location_id` 不为 NULL，验证 `location.franchise_id = instance.franchise_id`
- 如果两者不一致，说明数据有问题

---

## 性能优化建议

### 1. 利用冗余字段 `franchise_id`

**优势**：
- `course_instances.franchise_id` 是冗余字段，用于加速查询
- 可以直接过滤 `instance.franchise_id`，而不需要 JOIN `course_series`

**查询优化**：
```sql
-- 方案 A：利用冗余字段（推荐）
SELECT * FROM course_instances
WHERE franchise_id = :franchise_id  -- ✅ 直接过滤，利用索引
  AND assignment_id IN (:assignment_ids)
  AND is_active = true;

-- 方案 B：通过 JOIN（不推荐，性能较差）
SELECT ci.* FROM course_instances ci
JOIN course_assignments ca ON ci.assignment_id = ca.id
JOIN course_series cs ON ca.series_id = cs.id
WHERE cs.franchise_id = :franchise_id  -- ❌ 需要 JOIN，性能较差
  AND ci.assignment_id IN (:assignment_ids);
```

### 2. 索引建议

**现有索引**（根据 `migrate-add-franchises.sql`）：
```sql
CREATE INDEX idx_course_instances_franchise_id ON course_instances(franchise_id);
```

**查询时应该使用**：
- ✅ `WHERE franchise_id = :franchise_id`（利用索引）
- ✅ `WHERE assignment_id IN (:assignment_ids)`（利用主键/外键索引）
- ✅ `WHERE status IN ('scheduled', 'ongoing')`（如果 status 有索引）

---

## 总结

### 当前实现的 Franchise 过滤状态

| 层级 | 过滤方式 | 状态 | 说明 |
|------|---------|------|------|
| Franchise | 直接查询 | ✅ 正确 | `getFranchiseByCode(code)` |
| Series | 直接过滤 | ✅ 正确 | `WHERE franchise_id = franchise.id` |
| Assignment | 间接过滤 | ✅ 正确 | `WHERE series_id IN (series_ids)` |
| Course | 间接过滤 | ✅ 正确 | 通过 Assignment → Course |
| **Instance** | **未实现** | ❌ **缺失** | **没有查询 Instances** |

### 关键问题

1. **`/api/programs` 没有返回 Instances**
   - 需要查询 `course_instances` 表
   - 需要过滤 `franchise_id = franchise.id`
   - 需要按 Course 分组 Instances

2. **`getCourseInstances` 函数不区分 Franchise**
   - 返回的是所有 franchise 的 Instances
   - 需要在 API 层手动过滤
   - 建议：创建新函数 `getCourseInstancesByFranchise`

3. **数据一致性验证**
   - 需要确保 `instance.franchise_id = series.franchise_id`
   - 需要确保 `instance.franchise_id = location.franchise_id`（如果指定了 Location）

### 推荐的实现方案

**方案：在 `/api/programs` 中直接查询并过滤 Instances**

```typescript
// 在 /api/programs 中，Step 5（新增）
const { data: instancesData } = await supabaseAdmin
  .from('course_instances')
  .select(`
    *,
    assignment:course_assignments(
      id,
      course_id,
      series_id
    ),
    location:course_locations(
      id,
      name,
      address
    )
  `)
  .in('assignment_id', assignmentIds)  // 来自该 franchise 的 assignments
  .eq('franchise_id', franchise.id)    // ✅ 直接过滤 franchise_id
  .eq('is_active', true)
  .in('status', ['scheduled', 'ongoing'])
  .order('start_date', { ascending: true });

// 按 Course 分组 Instances
// 返回嵌套结构：Program → Course → Instances
```

**优势**：
- ✅ 一次查询获取所有数据
- ✅ 利用冗余字段 `franchise_id` 直接过滤（性能好）
- ✅ 确保只返回该 franchise 的 Instances
- ✅ 数据一致性：通过 `assignment_id` 和 `franchise_id` 双重验证

