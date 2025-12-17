# Course Catalog Franchise Flow 前后端逻辑说明

## 链接
```
http://localhost:3000/course-catalog?franchise=cherrycrest
```

## 整体架构

这是一个**多租户（Multi-tenant）**架构下的课程目录页面，根据 `franchise` 参数显示特定校区（Cherry Crest）的课程列表。

---

## 前端流程

### 1. 路由层：`/course-catalog/page.tsx`

**文件位置**：`src/app/course-catalog/page.tsx`

**职责**：
- 作为 Next.js 页面路由入口
- 处理 URL 参数（`?id=xxx` 用于直接查看课程详情）
- 渲染页面布局（Navbar + Content + Footer）

**关键逻辑**：
```typescript
// 如果 URL 中有 ?id=xxx，显示单个课程详情
// 否则，显示 AllCourses 组件（课程列表）
if (!courseId) {
  return <AllCourses />;
}
```

**Suspense 边界**：
- 使用 `Suspense` 包裹 `CourseDetailById`，因为 `useSearchParams()` 需要 Suspense 边界

---

### 2. 组件层：`AllCourses.tsx`

**文件位置**：`src/components/AllCourses.tsx`

**职责**：
- 根据 `franchise` 参数决定数据获取方式
- 渲染课程列表或 Program 列表

**关键状态**：
```typescript
const searchParams = useSearchParams();
const franchise = searchParams.get("franchise"); // "cherrycrest"
const [programs, setPrograms] = useState<Program[]>([]);
const [courses, setCourses] = useState<Course[]>([]);
```

**数据获取逻辑**（第 77-113 行）：
```typescript
useEffect(() => {
  const fetchCourses = async () => {
    if (franchise) {
      // ✅ Franchise 模式：调用 /api/programs?franchise=cherrycrest
      const res = await fetch(`/api/programs?franchise=${franchise}`);
      const data = await res.json();
      setPrograms(data || []); // 设置 programs 数据
      setCourses([]); // 清空 courses
    } else {
      // 全局模式：调用 /api/courses
      const res = await fetch(`/api/courses`);
      const data = await res.json();
      setCourses(data || []);
      setPrograms([]);
    }
  };
  fetchCourses();
}, [franchise]);
```

**渲染逻辑**（第 183-327 行）：
- 如果 `franchise` 存在，渲染 **Program/Series 分组视图**：
  - 标题：`Programs at Cherry Crest`
  - 按 Program（Series）分组显示课程
  - 每个 Program 显示：名称、日期范围、类别、课程列表
- 如果 `franchise` 不存在，渲染 **全局课程列表视图**：
  - 按年级分组显示所有课程

---

## 后端流程

### 3. API 路由：`/api/programs/route.ts`

**文件位置**：`src/app/api/programs/route.ts`

**端点**：`GET /api/programs?franchise=cherrycrest`

**职责**：
- 根据 `franchise` code 查找对应的 franchise
- 查询该 franchise 下的所有 active series/programs
- 查询这些 programs 下的 assignments 和关联的 courses
- 过滤只返回 `status='published'` 的课程
- 按 Program 分组返回数据

---

### 4. 数据查询流程

#### Step 1: 查找 Franchise（第 19 行）
```typescript
const franchise = await getFranchiseByCode(franchiseCode);
// 调用 db.ts 中的 getFranchiseByCode("cherrycrest")
```

**数据库查询**（`db.ts` 第 1311-1331 行）：
```sql
SELECT * FROM franchises
WHERE code = 'cherrycrest'  -- 转换为小写
  AND is_active = true
LIMIT 1;
```

**返回结果**：
```typescript
{
  id: "uuid",
  code: "cherrycrest",
  name: "Cherry Crest Robotics Academy",
  is_active: true
}
```

---

#### Step 2: 查询 Series/Programs（第 28-49 行）
```typescript
const { data: seriesData } = await supabaseAdmin
  .from("course_series")
  .select(`
    id, name, display_name, description,
    start_date, end_date, display_order,
    category:course_categories(id, name, display_name)
  `)
  .eq("is_active", true)
  .eq("franchise_id", franchise.id)  // 关键：按 franchise_id 过滤
  .order("display_order", { ascending: true });
```

**数据库查询**：
```sql
SELECT 
  cs.*,
  cc.id as category_id,
  cc.name as category_name,
  cc.display_name as category_display_name
FROM course_series cs
LEFT JOIN course_categories cc ON cs.category_id = cc.id
WHERE cs.is_active = true
  AND cs.franchise_id = '<franchise.id>'  -- Cherry Crest 的 franchise_id
ORDER BY cs.display_order ASC;
```

**返回示例**：
```json
[
  {
    "id": "7c18a54d-...",
    "name": "2025_winter_courses",
    "display_name": "2025 Winter Courses",
    "category": {
      "id": "...",
      "name": "courses",
      "display_name": "Courses"
    }
  },
  {
    "id": "e2fc9040-...",
    "name": "2026_Spring_courses",
    "display_name": "2026 Spring Camps",
    "category": { ... }
  }
]
```

---

#### Step 3: 查询 Assignments + Courses（第 65-76 行）
```typescript
const { data: assignmentsData } = await supabaseAdmin
  .from("course_assignments")
  .select(`
    id,
    series_id,
    course:courses(*)  -- 嵌套查询关联的课程
  `)
  .eq("is_active", true)
  .in("series_id", seriesIds);  // 查询这些 series 下的所有 assignments
```

**数据库查询**：
```sql
SELECT 
  ca.id,
  ca.series_id,
  c.*  -- 课程的所有字段
FROM course_assignments ca
INNER JOIN courses c ON ca.course_id = c.id
WHERE ca.is_active = true
  AND ca.series_id IN ('<series_id_1>', '<series_id_2>', ...);
```

**返回示例**：
```json
[
  {
    "id": "assignment_id_1",
    "series_id": "7c18a54d-...",
    "course": {
      "id": "course_id_1",
      "name": "Mastery Drivetrains with VEX IQ",
      "status": "published",  // 关键字段
      "slug": "mastery-drivetrains-vex-iq",
      "target_grades": "K-2"
    }
  },
  {
    "id": "assignment_id_2",
    "series_id": "7c18a54d-...",
    "course": {
      "id": "course_id_2",
      "name": "Advanced Robotics",
      "status": "draft",  // 这个会被过滤掉
      ...
    }
  }
]
```

---

#### Step 4: 数据过滤和分组（第 98-160 行）

**关键过滤逻辑**：
```typescript
for (const row of assignmentsData || []) {
  const course = row.course;
  
  // ✅ 只保留 published 状态的课程
  if (course.status !== 'published') {
    console.log(`Skipping course: status is "${course.status}"`);
    continue;  // 跳过非 published 的课程
  }
  
  // 按 series_id 分组，使用 Map 去重
  const seriesEntry = seriesMap.get(seriesId);
  if (!seriesEntry.courses.has(course.id)) {
    seriesEntry.courses.set(course.id, {
      id: course.id,
      title: course.name,
      gradeLevel: course.target_grades || "",
      slug: course.slug
    });
  }
}
```

**过滤规则**：
1. ✅ `course.status === 'published'`（必须）
2. ✅ `assignment.is_active === true`（已在查询中过滤）
3. ✅ `series.is_active === true`（已在查询中过滤）
4. ✅ 课程去重（同一课程可能被 assign 到多个 series，但只显示一次）

---

#### Step 5: 数据转换和返回（第 162-180 行）

**最终数据结构**：
```typescript
const result = Array.from(seriesMap.values()).map((entry) => ({
  id: entry.id,
  name: entry.name,
  display_name: entry.display_name,
  description: entry.description,
  start_date: entry.start_date,
  end_date: entry.end_date,
  category: entry.category,
  courses: Array.from(entry.courses.values())  // 转换为数组
}));
```

**返回 JSON 示例**：
```json
[
  {
    "id": "7c18a54d-...",
    "display_name": "2025 Winter Courses",
    "category": {
      "display_name": "Courses"
    },
    "courses": [
      {
        "id": "course_id_1",
        "title": "Mastery Drivetrains with VEX IQ",
        "gradeLevel": "K-2",
        "slug": "mastery-drivetrains-vex-iq"
      }
    ]
  }
]
```

---

## 数据流图

```
用户访问
  ↓
/course-catalog?franchise=cherrycrest
  ↓
Next.js 路由 (/course-catalog/page.tsx)
  ↓
AllCourses 组件
  ↓
useSearchParams() 获取 franchise="cherrycrest"
  ↓
useEffect 触发
  ↓
fetch('/api/programs?franchise=cherrycrest')
  ↓
API Route (/api/programs/route.ts)
  ↓
1. getFranchiseByCode("cherrycrest")
   → 查询 franchises 表
   → 返回 franchise 对象
  ↓
2. 查询 course_series 表
   → WHERE franchise_id = franchise.id
   → AND is_active = true
  ↓
3. 查询 course_assignments 表
   → WHERE series_id IN (series_ids)
   → AND is_active = true
   → JOIN courses 表获取课程详情
  ↓
4. 过滤课程
   → 只保留 status = 'published' 的课程
  ↓
5. 按 series 分组
   → 使用 Map 去重
  ↓
6. 返回 JSON 数组
  ↓
前端接收数据
  ↓
setPrograms(data)
  ↓
渲染 Program 列表
  → 每个 Program 显示其下的课程卡片
```

---

## 关键数据库表关系

```
franchises (1)
  ↓ (franchise_id)
course_series (N)  ← Programs/Series
  ↓ (series_id)
course_assignments (N)  ← 课程分配
  ↓ (course_id)
courses (1)  ← 课程内容
```

**查询路径**：
1. `franchises.code = 'cherrycrest'` → 获取 `franchise.id`
2. `course_series.franchise_id = franchise.id` → 获取该 franchise 的所有 series
3. `course_assignments.series_id IN (series_ids)` → 获取这些 series 的 assignments
4. `courses.id = course_assignments.course_id` → 获取关联的课程
5. 过滤 `courses.status = 'published'`

---

## 关键点总结

### 前端
1. **路由**：`/course-catalog/page.tsx` 作为入口，处理 `?id=` 和 `?franchise=` 参数
2. **组件**：`AllCourses` 根据 `franchise` 参数决定调用哪个 API
3. **渲染**：Franchise 模式显示 Program 分组视图，全局模式显示年级分组视图

### 后端
1. **Franchise 查找**：通过 `code` 查找对应的 franchise 记录
2. **Series 查询**：查询该 franchise 下所有 active 的 series/programs
3. **Assignments 查询**：查询这些 series 下的所有 active assignments，并关联课程
4. **状态过滤**：只返回 `status='published'` 的课程（公开 API 安全要求）
5. **数据分组**：按 Program 分组，每个 Program 包含其下的课程列表

### 安全与性能
- ✅ 只返回 `published` 状态的课程（防止泄露 draft/suspended/archived 课程）
- ✅ 使用 `is_active` 过滤 inactive 的 series 和 assignments
- ✅ 使用 Map 去重，避免同一课程在多个 series 中重复显示
- ✅ 使用 Supabase 的嵌套查询（`course:courses(*)`）减少数据库往返

---

## 调试信息

API 路由中已添加详细的 console 日志，可在服务器终端查看：
- Franchise 查找结果
- Series 查询结果
- Assignments 查询结果
- 课程过滤过程（哪些被跳过，哪些被添加）
- 最终返回的数据结构

访问 `http://localhost:3000/course-catalog?franchise=cherrycrest` 时，查看服务器控制台即可看到完整的查询和过滤过程。

