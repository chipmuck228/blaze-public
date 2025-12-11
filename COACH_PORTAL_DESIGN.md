# Coach Portal 设计方案

## 一、概述

Coach Portal 是一个专门为教练（Instructor/Coach）设计的门户，允许教练查看和管理分配给自己的课程实例。

## 二、用户角色扩展

### 2.1 角色定义

当前系统角色：
- `user`: 普通用户
- `admin`: 管理员

**新增角色**：
- `coach`: 教练/讲师

### 2.2 角色权限矩阵

| 功能 | User | Coach | Admin |
|------|------|-------|-------|
| 查看自己的课程实例 | ❌ | ✅ | ✅ |
| 编辑课程实例信息 | ❌ | ✅ (有限) | ✅ |
| 查看学生列表 | ❌ | ✅ | ✅ |
| 管理学生出勤 | ❌ | ✅ | ✅ |
| 查看课程详情 | ❌ | ✅ | ✅ |
| 管理所有课程 | ❌ | ❌ | ✅ |
| 管理用户 | ❌ | ❌ | ✅ |

### 2.3 数据库变更

**users 表**：
```sql
-- 扩展 role 字段支持 'coach'
ALTER TABLE users 
  DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users 
  ADD CONSTRAINT users_role_check 
  CHECK (role IN ('user', 'admin', 'coach'));
```

**course_instances 表**（已存在，保留向后兼容）：
- `instructor_id UUID` - 关联 users.id（单教练，向后兼容）
- `instructor_name TEXT` - 教练姓名（单教练，向后兼容）

**新增表：course_instance_coaches**（多对多关系）：
```sql
CREATE TABLE course_instance_coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES course_instances(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE, -- 是否为主教练
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(instance_id, coach_id)
);

CREATE INDEX idx_course_instance_coaches_instance_id ON course_instance_coaches(instance_id);
CREATE INDEX idx_course_instance_coaches_coach_id ON course_instance_coaches(coach_id);
```

**数据迁移策略**：
- 将现有的 `instructor_id` 数据迁移到 `course_instance_coaches` 表
- 保留 `instructor_id` 和 `instructor_name` 字段（向后兼容）
- 新系统优先使用 `course_instance_coaches` 表

## 三、功能模块设计

### 3.1 认证和授权

#### 3.1.1 登录页面
- **路径**: `/coach/login`
- **功能**: 
  - 支持邮箱/密码登录
  - 支持 Google 登录（如果教练账户已关联）
  - 验证用户角色为 'coach'
  - 登录后跳转到 `/coach`

#### 3.1.2 路由保护
- **路径前缀**: `/coach/*`
- **保护规则**:
  - 必须已登录
  - 用户角色必须是 'coach'
  - 未授权用户重定向到 `/coach/login` 或 `/`

#### 3.1.3 权限验证
- API 路由需要验证：
  - 用户已登录
  - 用户角色为 'coach'
  - 数据访问权限（只能访问自己的课程实例）

### 3.2 Dashboard（仪表板）

#### 3.2.1 路径
- `/coach` 或 `/coach/dashboard`

#### 3.2.2 显示内容
1. **统计卡片**：
   - Total Classes（总课程数）
   - Upcoming Classes（即将开始的课程）
   - Ongoing Classes（进行中的课程）
   - Completed Classes（已完成的课程）

2. **最近课程列表**：
   - 显示最近 5-10 个课程实例
   - 包含：课程名称、日期、时间、地点、状态
   - 点击可跳转到详情页

3. **今日课程**：
   - 显示今天的课程（如果有）
   - 快速访问链接

4. **即将开始的课程**：
   - 显示未来 7 天内的课程
   - 按日期排序

### 3.3 My Classes（我的课程）

#### 3.3.1 路径
- `/coach/classes`

#### 3.3.2 功能
1. **课程列表**：
   - 显示所有分配给该教练的课程实例
   - 支持筛选：
     - 状态（scheduled, ongoing, completed, cancelled）
     - 日期范围
     - 课程名称
   - 支持排序：
     - 按日期（升序/降序）
     - 按课程名称
     - 按状态

2. **课程卡片/列表项显示**：
   - 课程名称（来自 assignment → course）
   - Category 和 Series
   - 日期范围
   - 上课时间
   - 地点
   - 学生数（current_students / max_students）
   - 状态 Badge
   - 操作按钮（查看详情、编辑）

3. **视图切换**：
   - 列表视图
   - 卡片视图
   - 日历视图（可选）

### 3.4 Class Details（课程详情）

#### 3.4.1 路径
- `/coach/classes/[id]`

#### 3.4.2 显示内容
1. **基本信息**（只读）：
   - 课程名称
   - Category > Series
   - 日期范围
   - 上课时间
   - 地点
   - 状态
   - 学生数（current_students / max_students）

2. **课程日历**：
   - 使用 `InstanceCalendar` 组件
   - 显示所有上课日期
   - 标记跳过和改期的日期

3. **课程笔记**（只读）：
   - 显示 `notes` 字段
   - 不允许编辑

4. **操作按钮**：
   - 导出日历（iCalendar）
   - 所有编辑操作需要管理员权限

### 3.5 Schedule（课程表）

#### 3.5.1 路径
- `/coach/schedule`

#### 3.5.2 功能
1. **日历视图**：
   - 月视图
   - 周视图（可选）
   - 日视图（可选）

2. **显示内容**：
   - 所有分配给该教练的课程实例
   - 按日期和时间显示
   - 点击可查看详情

3. **筛选**：
   - 按月份
   - 按状态

### 3.6 Students（学生管理）

**确认**：不需要学生管理功能
- 不显示学生列表
- 不提供出勤管理
- 只显示学生数量（current_students）

## 四、数据访问设计

### 4.1 数据过滤规则

**Coach 只能访问**：
- `course_instances` 表中通过 `course_instance_coaches` 表关联的记录
- 查询逻辑：
  1. 通过 `course_instance_coaches` 表查找 `coach_id = coach_user_id` 的所有 `instance_id`
  2. 获取这些 `instance_id` 对应的所有课程实例
  3. 同时兼容旧的 `instructor_id` 字段（向后兼容）

**API 查询示例**：
```typescript
// 获取教练的所有课程实例（通过关联表）
const { data: coachInstances } = await supabase
  .from('course_instance_coaches')
  .select('instance_id')
  .eq('coach_id', coachUserId)

const instanceIds = coachInstances?.map(ci => ci.instance_id) || []

// 同时查询旧的 instructor_id（向后兼容）
const { data: oldInstances } = await supabase
  .from('course_instances')
  .select('id')
  .eq('instructor_id', coachUserId)
  .eq('is_active', true)

const oldInstanceIds = oldInstances?.map(i => i.id) || []

// 合并并去重
const allInstanceIds = [...new Set([...instanceIds, ...oldInstanceIds])]

// 获取完整的课程实例数据
const instances = await supabase
  .from('course_instances')
  .select(`
    *,
    assignment:course_assignments(
      course:courses(*),
      category:course_categories(*),
      series:course_series(*)
    ),
    location:course_locations(*)
  `)
  .in('id', allInstanceIds)
  .eq('is_active', true)
```

### 4.2 权限控制

**只读权限**（所有字段）：
- 查看课程详情
- 查看课程日历
- 查看学生数量（current_students）
- 查看所有课程信息（只读）

**禁止操作**：
- 所有编辑操作（包括状态、学生数、笔记等）
- 创建/删除课程实例
- 修改任何课程信息
- 所有修改需要管理员操作

## 五、UI/UX 设计

### 5.1 布局结构

```
┌─────────────────────────────────────┐
│  Navbar (Coach Portal)              │
├──────────┬──────────────────────────┤
│          │                          │
│ Sidebar  │   Main Content Area      │
│          │                          │
│ - Dashboard                          │
│ - My Classes                         │
│ - Schedule                            │
│          │                          │
│          │                          │
│          │                          │
└──────────┴──────────────────────────┘
```

### 5.2 侧边栏菜单

- **Dashboard** - 仪表板
- **My Classes** - 我的课程
- **Schedule** - 课程表
- **Sign Out** - 退出登录

### 5.3 响应式设计

- 移动端：侧边栏折叠为抽屉菜单
- 平板：侧边栏可折叠
- 桌面：侧边栏固定显示

## 六、API 路由设计

### 6.1 课程实例相关

**GET `/api/coach/instances`**
- 获取教练的所有课程实例
- 支持查询参数：
  - `status`: 筛选状态
  - `startDate`: 开始日期
  - `endDate`: 结束日期
  - `search`: 搜索课程名称

**GET `/api/coach/instances/[id]`**
- 获取单个课程实例详情
- 包含完整的关联数据
- 验证教练是否有权限访问（通过 course_instance_coaches 表）

**GET `/api/coach/instances/[id]/export`**
- 导出课程日历（iCalendar）

### 6.2 统计信息

**GET `/api/coach/stats`**
- 返回仪表板统计数据：
  - totalClasses
  - upcomingClasses
  - ongoingClasses
  - completedClasses

### 6.3 课程表

**GET `/api/coach/schedule`**
- 获取课程表数据
- 支持查询参数：
  - `month`: 月份
  - `year`: 年份

## 七、数据库函数设计

### 7.1 新增函数

**`getCoachInstances(coachUserId: string)`**
- 获取教练的所有课程实例
- 包含关联数据

**`getCoachInstanceById(coachUserId: string, instanceId: string)`**
- 获取单个课程实例（验证权限）

**`getCoachStats(coachUserId: string)`**
- 获取教练的统计数据

### 7.2 权限验证函数

**`canCoachAccessInstance(coachUserId: string, instanceId: string)`**
- 验证教练是否有权限访问该课程实例

## 八、实施步骤

### Phase 1: 基础设置
1. 扩展用户角色支持 'coach'
2. 创建 Coach 登录页面
3. 设置路由保护
4. 创建 Coach Layout 和 Sidebar

### Phase 2: Dashboard
1. 创建 Dashboard 页面
2. 实现统计 API
3. 显示统计卡片和最近课程

### Phase 3: My Classes
1. 创建课程列表页面
2. 实现课程查询 API
3. 实现筛选和排序功能

### Phase 4: Class Details
1. 创建课程详情页面
2. 集成日历组件
3. 实现有限编辑功能

### Phase 5: Schedule
1. 创建课程表页面
2. 实现日历视图
3. 集成课程数据

### Phase 6: 优化和测试
1. 响应式设计优化
2. 性能优化
3. 错误处理
4. 用户测试

## 九、安全考虑

### 9.1 数据隔离
- Coach 只能看到自己的课程实例
- API 层面强制验证 `instructor_id`
- 数据库层面可以考虑 RLS 策略（可选）

### 9.2 权限控制
- 所有 API 路由验证用户角色
- 验证数据所有权（instructor_id 匹配）
- 限制可编辑字段

### 9.3 输入验证
- 验证所有输入数据
- 防止 SQL 注入
- 防止 XSS 攻击

## 十、扩展功能（未来考虑）

1. **学生管理**：
   - 学生注册系统
   - 出勤管理
   - 成绩管理

2. **通信功能**：
   - 向学生发送通知
   - 课程公告

3. **报告功能**：
   - 课程报告
   - 学生出勤报告

4. **移动端优化**：
   - PWA 支持
   - 移动端专用界面

5. **通知系统**：
   - 课程提醒
   - 系统通知

## 十一、技术栈

- **框架**: Next.js 14 (App Router)
- **认证**: NextAuth.js (auth.js)
- **数据库**: Supabase (PostgreSQL)
- **UI 组件**: shadcn/ui
- **样式**: Tailwind CSS
- **类型**: TypeScript

## 十二、文件结构

```
src/
├── app/
│   ├── coach/
│   │   ├── layout.tsx          # Coach Portal 布局
│   │   ├── login/
│   │   │   └── page.tsx        # Coach 登录页
│   │   ├── page.tsx            # Dashboard
│   │   ├── classes/
│   │   │   ├── page.tsx        # 课程列表
│   │   │   └── [id]/
│   │   │       └── page.tsx    # 课程详情
│   │   ├── schedule/
│   │   │   └── page.tsx        # 课程表
│   │   └── students/           # 学生管理（可选）
│   │       └── page.tsx
│   └── api/
│       └── coach/
│           ├── instances/
│           │   ├── route.ts
│           │   └── [id]/
│           │       ├── route.ts
│           │       └── export/
│           │           └── route.ts
│           ├── stats/
│           │   └── route.ts
│           └── schedule/
│               └── route.ts
├── components/
│   └── coach/
│       ├── CoachSidebar.tsx    # Coach 侧边栏
│       ├── ClassCard.tsx        # 课程卡片组件
│       ├── ClassList.tsx        # 课程列表组件
│       └── ScheduleCalendar.tsx # 课程表日历组件
└── lib/
    └── db.ts                    # 扩展数据库函数
```

## 十三、关键设计决策

### 13.1 Coach 角色 vs Instructor ID

**方案 A：Coach 必须是系统用户**
- 优点：统一管理，可以使用系统认证
- 缺点：外部教练需要先注册

**方案 B：支持外部教练（instructor_name）**
- 优点：灵活，可以快速添加外部教练
- 缺点：外部教练无法登录系统

**推荐方案**：方案 A + 方案 B 混合
- 系统用户（有 account）可以作为 Coach 登录
- 外部教练（只有 name）不能登录，但可以显示在系统中
- Coach Portal 只对系统用户开放

### 13.2 编辑权限范围

**严格模式**：
- Coach 只能查看，不能编辑
- 所有修改需要管理员操作

**宽松模式**：
- Coach 可以更新状态、学生数、笔记
- 不能修改核心信息（日期、时间、价格等）

**推荐方案**：宽松模式
- 允许 Coach 更新日常运营相关的字段
- 核心信息修改需要管理员权限

### 13.3 学生管理

**当前状态**：`course_instances` 只有 `current_students` 计数，没有学生列表

**未来扩展**：
- 创建 `course_enrollments` 表
- 关联学生和课程实例
- 支持出勤管理

**当前方案**：先不实现学生管理，只显示学生数量

## 十四、与现有系统的集成

### 14.1 复用现有组件
- `InstanceCalendar` - 课程日历组件
- UI 组件库（Button, Card, Table 等）
- 认证系统（NextAuth）

### 14.2 数据共享
- 使用相同的数据库表
- 共享类型定义
- 共享工具函数（icalendar.ts）

### 14.3 样式一致性
- 使用相同的设计系统
- 保持 UI 风格一致
- 响应式布局一致

## 十五、实施优先级

### 高优先级（MVP）
1. ✅ 角色扩展（支持 'coach'）
2. ✅ Coach 登录页面
3. ✅ 路由保护
4. ✅ Dashboard（基础统计）
5. ✅ My Classes（课程列表）
6. ✅ Class Details（课程详情）

### 中优先级
7. ⚠️ Schedule（课程表）
8. ⚠️ 日历导出

### 低优先级（未来）
10. ⏳ 通知系统
11. ⏳ 学生管理（如果需要）
12. ⏳ 出勤管理（如果需要）

## 十六、测试计划

### 16.1 功能测试
- Coach 登录流程
- 课程列表显示
- 课程详情显示
- 权限验证
- 数据过滤

### 16.2 安全测试
- 未授权访问尝试
- 跨用户数据访问尝试
- SQL 注入测试
- XSS 测试

### 16.3 性能测试
- 大量课程实例的加载性能
- 日历渲染性能
- API 响应时间

## 十七、问题与考虑

### 17.1 已确认问题
1. ✅ **Coach 编辑权限范围**：所有字段都不可编辑（只读模式）
2. ✅ **学生管理**：不需要学生管理功能
3. ✅ **通知功能**：先不提供课程提醒通知功能
4. ✅ **多教练支持**：一个课程实例可以分配给多个教练

### 17.2 技术考虑
1. **RLS 策略**：是否需要在数据库层面添加 RLS？
2. **缓存策略**：课程数据是否需要缓存？
3. **实时更新**：是否需要 WebSocket 支持实时更新？

## 十八、总结

Coach Portal 将提供一个专门为教练设计的界面，让他们能够：
- 查看分配给自己的所有课程
- 了解课程详情和日程安排
- 管理课程状态和学生信息
- 导出课程日历

这个设计遵循了最小权限原则，确保 Coach 只能访问和管理自己的课程，同时提供了必要的功能来支持日常教学工作。

