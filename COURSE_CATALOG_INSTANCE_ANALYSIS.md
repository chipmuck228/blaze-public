# Course Catalog 页面 Instance 显示分析

## 问题描述

用户期望在 `http://localhost:3000/course-catalog?franchise=cherrycrest` 页面中：
- ✅ 显示 Programs
- ✅ 每个 Program 下显示 **Course Instances**（具体的课程安排/班级）
- ✅ 用户可以直接选择 Instance 进行 Enroll

**但当前实现**：
- ✅ 显示 Programs
- ❌ 每个 Program 下显示 **Courses**（课程内容，不是实例）
- ❌ 用户需要点击课程，跳转到详情页，然后才能看到 Instances 并 Enroll

---

## 当前实现分析

### 1. API 层：`GET /api/programs?franchise=cherrycrest`

**文件位置**：`src/app/api/programs/route.ts`

**当前返回的数据结构**：
```json
[
  {
    "id": "series-id",
    "display_name": "2025 Winter Courses",
    "category": { ... },
    "courses": [
      {
        "id": "course-id",
        "title": "Mastery Drivetrains with VEX IQ",
        "gradeLevel": "K-2",
        "slug": "mastery-drivetrains-vex-iq"
      }
    ]
  }
]
```

**关键问题**：
- ❌ 只返回了 `courses`（课程内容）
- ❌ **没有返回 `instances`**（具体的课程安排/班级）
- ❌ 查询逻辑只涉及：
  - `course_series`（Programs）
  - `course_assignments`（课程分配）
  - `courses`（课程内容）
  - **没有查询 `course_instances`**

**查询流程**（第 28-172 行）：
1. 查询 `course_series`（过滤 `franchise_id`）
2. 查询 `course_assignments`（过滤 `series_id`）
3. 关联查询 `courses`（通过 `assignment.course_id`）
4. 按 Series 分组，返回 Courses 列表
5. **完全没有查询 `course_instances`**

---

### 2. 前端层：`AllCourses.tsx`

**文件位置**：`src/components/AllCourses.tsx`

**当前渲染逻辑**（第 300-340 行）：
```typescript
{visibleCourses.map((course) => (
  <Card>
    <CardTitle>{course.title}</CardTitle>
    <CardDescription>Grade level: {course.gradeLevel}</CardDescription>
    <Button asChild>
      <a href={`/course-catalog/${course.slug}`}>
        View Details  // 跳转到课程详情页
      </a>
    </Button>
  </Card>
))}
```

**关键问题**：
- ❌ 显示的是 `courses`（课程内容卡片）
- ❌ 点击后跳转到 `/course-catalog/${slug}`（课程详情页）
- ❌ **没有显示 `instances`**（具体的课程安排）
- ❌ **没有 Enroll 按钮**

---

### 3. Enrollment 流程（当前实现）

**文件位置**：`src/components/Courses.tsx`（首页的 Courses 组件）

**Enrollment 流程**（第 165-206 行）：
```typescript
const handleEnroll = async (courseId: string) => {
  // 1. 检查用户是否登录
  if (!session?.user) {
    router.push('/login');
    return;
  }

  // 2. 打开 Enroll 对话框
  setIsEnrollDialogOpen(true);

  // 3. 调用 API 获取该课程的所有实例
  const response = await fetch(`/api/courses/${courseId}/instances?franchise=${franchiseCode}`);
  const instances = await response.json();
  setCourseInstances(instances);

  // 4. 在对话框中显示实例列表
  // 5. 用户选择实例
  // 6. 加入购物车
};
```

**关键点**：
- ✅ Enrollment 流程是存在的
- ✅ 但只在首页的 `Courses` 组件中实现
- ❌ `AllCourses` 组件（课程目录页）**没有实现 Enrollment 功能**

---

### 4. Instance API：`GET /api/courses/[id]/instances`

**文件位置**：`src/app/api/courses/[id]/instances/route.ts`

**功能**：
- 返回某个课程的所有可用实例
- 支持 `?franchise=code` 参数过滤
- 只返回 `status IN ('scheduled', 'ongoing')` 和 `is_active = true` 的实例

**数据结构**：
```json
[
  {
    "id": "instance-id",
    "assignment_id": "assignment-id",
    "location_id": "location-id",
    "start_date": "2025-01-15",
    "end_date": "2025-03-29",
    "start_time": "09:00",
    "end_time": "15:00",
    "max_students": 20,
    "current_students": 5,
    "status": "scheduled",
    "location": { ... },
    "assignment": { ... }
  }
]
```

**关键点**：
- ✅ API 存在且功能完整
- ✅ 支持按 Franchise 过滤
- ❌ 但 `AllCourses` 组件**没有调用这个 API**

---

## 数据流对比

### 当前实现的数据流

```
用户访问 /course-catalog?franchise=cherrycrest
  ↓
AllCourses 组件
  ↓
调用 GET /api/programs?franchise=cherrycrest
  ↓
返回: Programs + Courses（课程内容）
  ↓
前端渲染: Program 卡片 → Course 卡片
  ↓
用户点击 Course → 跳转到 /course-catalog/${slug}
  ↓
课程详情页（显示课程信息，但没有实例列表）
```

**问题**：
- 用户看不到具体的课程安排（Instances）
- 用户无法直接选择 Instance 进行 Enroll
- 需要额外的步骤才能看到 Instances

---

### 期望实现的数据流

```
用户访问 /course-catalog?franchise=cherrycrest
  ↓
AllCourses 组件
  ↓
调用 GET /api/programs?franchise=cherrycrest
  ↓
返回: Programs + Courses + Instances（课程内容 + 具体安排）
  ↓
前端渲染: Program 卡片 → Course 卡片 → Instance 卡片列表
  ↓
每个 Instance 显示：
  - 日期时间
  - 地点
  - 容量信息
  - "Enroll" 按钮
  ↓
用户点击 "Enroll" → 直接加入购物车
```

**优势**：
- ✅ 用户可以直接看到所有可用的课程安排
- ✅ 用户可以直接选择 Instance 进行 Enroll
- ✅ 减少用户操作步骤
- ✅ 更符合电商/课程平台的用户体验

---

## 数据结构对比

### 当前 API 返回的数据

```typescript
interface Program {
  id: string;
  display_name: string;
  category: { ... };
  courses: Course[];  // ❌ 只有课程内容
}

interface Course {
  id: string;
  title: string;
  gradeLevel: string;
  slug: string;
}
```

### 期望的 API 返回数据

```typescript
interface Program {
  id: string;
  display_name: string;
  category: { ... };
  courses: CourseWithInstances[];  // ✅ 课程 + 实例
}

interface CourseWithInstances {
  id: string;
  title: string;
  gradeLevel: string;
  slug: string;
  instances: Instance[];  // ✅ 该课程的所有可用实例
}

interface Instance {
  id: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  location: { name: string; ... };
  max_students: number;
  current_students: number;
  available_capacity: number;  // 可用名额
  status: 'scheduled' | 'ongoing';
}
```

---

## 实现差距分析

### 1. API 层差距

**需要修改**：`src/app/api/programs/route.ts`

**当前逻辑**：
- 查询 `course_assignments` → 关联 `courses`
- 返回 Courses 列表

**需要增加**：
- 查询 `course_instances`（关联到 `course_assignments`）
- 过滤条件：
  - `instance.status IN ('scheduled', 'ongoing')`
  - `instance.is_active = true`
  - `instance.franchise_id = franchise.id`（如果实例有冗余字段）
  - 或者通过 `assignment.series_id` 间接过滤
- 按 Course 分组 Instances
- 返回 Courses + Instances 的嵌套结构

**查询示例**：
```sql
-- 伪代码
SELECT 
  ci.*,
  cl.name as location_name,
  ca.course_id
FROM course_instances ci
JOIN course_assignments ca ON ci.assignment_id = ca.id
JOIN course_series cs ON ca.series_id = cs.id
LEFT JOIN course_locations cl ON ci.location_id = cl.id
WHERE cs.franchise_id = :franchise_id
  AND ci.status IN ('scheduled', 'ongoing')
  AND ci.is_active = true
  AND ca.is_active = true
  AND cs.is_active = true
ORDER BY ci.start_date, ci.start_time;
```

---

### 2. 前端层差距

**需要修改**：`src/components/AllCourses.tsx`

**当前渲染**：
- Program → Course 卡片（只有课程信息）
- 点击跳转到课程详情页

**需要改为**：
- Program → Course → Instance 列表
- 每个 Instance 显示：
  - 日期时间范围
  - 上课地点
  - 容量信息（如 "5/20 available"）
  - "Enroll" 按钮（如果用户已登录）
  - "Login to Enroll" 按钮（如果用户未登录）

**UI 结构建议**：
```
Program: 2025 Winter Courses
  └─ Course: Mastery Drivetrains with VEX IQ
      ├─ Instance 1: Jan 15 - Mar 29, Mon/Wed/Fri 9:00-15:00 @ Bellevue (5/20 available) [Enroll]
      ├─ Instance 2: Jan 16 - Mar 30, Tue/Thu 9:00-15:00 @ Issaquah (10/20 available) [Enroll]
      └─ Instance 3: Jan 17 - Mar 31, Sat 9:00-12:00 @ Bel-Red (FULL) [Join Waitlist]
```

---

### 3. Enrollment 功能差距

**当前状态**：
- ✅ Enrollment 功能在 `Courses.tsx`（首页）中实现
- ❌ `AllCourses.tsx`（课程目录页）中没有 Enrollment 功能

**需要增加**：
- 在 `AllCourses.tsx` 中实现 `handleEnroll` 函数
- 调用 `POST /api/enrollments/cart` 将 Instance 加入购物车
- 显示成功/错误提示
- 可选：显示购物车数量更新

---

## 技术实现要点

### 1. API 查询优化

**挑战**：
- 需要 JOIN 多个表（`course_instances`, `course_assignments`, `course_series`, `course_locations`）
- 需要按 Course 分组 Instances
- 需要计算可用容量（`max_students - current_students`）

**建议**：
- 使用 Supabase 的嵌套查询（`instance:course_instances(...)`）
- 或者分两步查询：
  1. 先查询 Assignments + Courses（当前逻辑）
  2. 再批量查询每个 Assignment 的 Instances
- 使用 `Promise.all` 并行查询以提高性能

---

### 2. 前端性能考虑

**挑战**：
- 如果每个 Course 有很多 Instances，数据量可能很大
- 需要优化渲染性能

**建议**：
- 使用虚拟滚动（如果 Instances 列表很长）
- 或者使用折叠/展开（默认折叠，点击 Course 展开 Instances）
- 使用 `React.memo` 优化 Instance 卡片组件
- 考虑分页或懒加载

---

### 3. 用户体验优化

**建议**：
- 显示实例的可用容量（如 "5 spots left"）
- 已满的实例显示 "FULL" 和 "Join Waitlist" 按钮
- 已登录用户显示 "Enroll" 按钮
- 未登录用户显示 "Login to Enroll" 按钮
- 显示实例的日期时间、地点等关键信息
- 可选：显示实例的日历视图（使用 `InstanceCalendar` 组件）

---

## 总结

### 当前实现的问题

1. **API 层**：
   - ❌ 只返回 Courses，没有返回 Instances
   - ❌ 没有查询 `course_instances` 表

2. **前端层**：
   - ❌ 只显示 Courses，没有显示 Instances
   - ❌ 没有 Enrollment 功能
   - ❌ 用户需要额外步骤才能看到 Instances

3. **用户体验**：
   - ❌ 用户无法直接看到可用的课程安排
   - ❌ 用户无法直接选择 Instance 进行 Enroll
   - ❌ 操作流程不够直观

### 需要修改的地方

1. **API**：`/api/programs` 需要返回 Instances
2. **前端**：`AllCourses.tsx` 需要显示 Instances 并实现 Enrollment
3. **UI**：需要设计 Instance 卡片的展示方式

### 建议的实现方案

1. **方案 A：在 API 中直接返回 Instances**
   - 修改 `/api/programs`，查询并返回 Instances
   - 前端直接渲染 Instances 列表
   - **优点**：一次请求获取所有数据
   - **缺点**：如果 Instances 很多，响应可能很大

2. **方案 B：按需加载 Instances**
   - API 只返回 Courses
   - 前端点击 Course 时，调用 `/api/courses/[id]/instances` 获取 Instances
   - 使用折叠/展开 UI
   - **优点**：减少初始数据量
   - **缺点**：需要额外的 API 调用

3. **方案 C：混合方案**
   - API 返回 Courses + 每个 Course 的 Instance 数量
   - 前端默认显示 Courses，点击后展开显示 Instances（调用 `/api/courses/[id]/instances`）
   - **优点**：平衡性能和用户体验
   - **缺点**：需要管理展开/折叠状态

**推荐**：方案 C（混合方案），既保证了初始加载速度，又提供了良好的用户体验。

