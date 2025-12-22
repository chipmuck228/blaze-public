# PRD-11: 教练门户

**版本**: 1.0  
**日期**: 2025-12  
**状态**: 已实施（部分功能）

---

## 1. 概述

### 1.1 文档目的

本文档描述 Blaze Robotics Academy 教练门户的功能需求，包括教练登录与认证、我的课程列表、课程详情查看、课程日历视图、课程导出（iCalendar）和教练统计等核心功能。

### 1.2 核心价值

- **专注教学**：教练可以专注于查看和管理分配给自己的课程
- **便捷访问**：快速查看课程时间表和学生信息
- **日历集成**：支持 iCalendar 导出，方便与个人日历同步
- **数据洞察**：了解自己的教学统计和课程情况

### 1.3 系统组成

教练门户由以下核心模块组成：
1. **Dashboard**：课程概览和关键指标
2. **我的课程**：分配给教练的所有课程实例
3. **课程详情**：单个课程的详细信息
4. **课程日历**：日历视图展示所有课程
5. **iCalendar 导出**：导出课程到日历应用
6. **教练统计**：教学数据统计

---

## 2. 用户角色与场景

### 2.1 用户角色

| 角色 | 描述 | 访问权限 |
|------|------|---------|
| **Coach** | 教练/讲师 | 只能查看分配给自己的课程 |
| **Admin** | 系统管理员 | 可以查看所有课程 |
| **User** | 普通用户 | 无法访问教练门户 |

### 2.2 核心使用场景

#### 场景 1: 查看课程概览
1. 教练登录后访问 `/coach`
2. 查看 Dashboard，了解课程统计
3. 查看即将开始的课程
4. 查看今日课程

#### 场景 2: 查看我的课程
1. 教练访问 `/coach/classes`
2. 查看所有分配给自己的课程
3. 按状态筛选（Scheduled, Ongoing, Completed）
4. 按日期排序
5. 点击课程查看详情

#### 场景 3: 查看课程详情
1. 教练点击课程卡片
2. 查看课程完整信息（时间、地点、学生列表）
3. 查看课程进度
4. 导出课程到日历

#### 场景 4: 查看课程日历
1. 教练访问 `/coach/schedule`
2. 查看日历视图的所有课程
3. 按月份导航
4. 点击课程查看详情

#### 场景 5: 导出课程到日历
1. 教练在课程详情页点击"Export to Calendar"
2. 下载 .ics 文件
3. 导入到个人日历应用（Google Calendar, Outlook等）

---

## 3. 功能需求

### 3.1 认证和授权

#### 3.1.1 登录页面
- **路径**：`/coach/login`
- **功能**：
  - 支持邮箱/密码登录
  - 支持 Google 登录（如果教练账户已关联）
  - 验证用户角色为 'coach'
  - 登录后跳转到 `/coach`
- **验证**：
  - 检查用户是否存在
  - 检查用户角色是否为 'coach'
  - 验证密码或 OAuth token

#### 3.1.2 路由保护
- **路径前缀**：`/coach/*`
- **保护规则**：
  - 必须已登录
  - 用户角色必须是 'coach'
  - 未授权用户重定向到 `/coach/login` 或 `/`
- **实现**：
  - 使用 NextAuth.js 中间件
  - API 路由验证

#### 3.1.3 权限验证
- **API 路由验证**：
  - 用户已登录
  - 用户角色为 'coach'
  - 数据访问权限（只能访问自己的课程实例）
- **数据过滤**：
  - 只返回分配给该教练的课程实例
  - 使用 `course_instance_coaches` 表查询

### 3.2 Dashboard（仪表板）

#### 3.2.1 统计卡片
- **Total Classes（总课程数）**：
  - 显示分配给该教练的所有课程实例总数
- **Upcoming Classes（即将开始的课程）**：
  - 显示未来7天内的课程数
- **Ongoing Classes（进行中的课程）**：
  - 显示当前进行中的课程数
- **Completed Classes（已完成的课程）**：
  - 显示已完成的课程数

#### 3.2.2 最近课程列表
- **显示内容**：
  - 最近 5-10 个课程实例
  - 包含：课程名称、日期、时间、地点、状态
  - 点击可跳转到详情页
- **排序**：
  - 按日期排序（最近的在前）

#### 3.2.3 今日课程
- **显示内容**：
  - 显示今天的课程（如果有）
  - 显示课程时间、地点
  - 快速访问链接
- **高亮**：
  - 如果有今日课程，高亮显示

#### 3.2.4 即将开始的课程
- **显示内容**：
  - 显示未来 7 天内的课程
  - 按日期排序
  - 显示课程名称、日期、时间、地点

### 3.3 我的课程（My Classes）

#### 3.3.1 课程列表
- **位置**：`/coach/classes`
- **显示内容**：
  - 课程名称
  - 课程分类和系列
  - 上课地点
  - 上课时间（日期、时间）
  - 课程状态（Scheduled, Ongoing, Completed, Cancelled）
  - 学生数量（当前/最大）
  - 操作按钮（View Details, Export Calendar）
- **功能**：
  - 搜索（按课程名称、地点）
  - 筛选：
    - 按状态（Scheduled, Ongoing, Completed, Cancelled）
    - 按日期范围
    - 按地点
  - 排序：
    - 按日期（升序/降序）
    - 按课程名称
    - 按状态

#### 3.3.2 课程卡片/列表项
- **显示内容**：
  - 课程名称（链接到详情页）
  - 课程分类和系列（Badge）
  - 上课地点（带图标）
  - 上课时间（日期、时间，带图标）
  - 学生数量（当前/最大，带图标）
  - 课程状态（Badge）
- **交互**：
  - 点击卡片跳转到详情页
  - 悬停显示更多信息

### 3.4 课程详情（Class Details）

#### 3.4.1 课程基本信息
- **位置**：`/coach/classes/[id]`
- **显示内容**：
  - 课程名称
  - 课程分类和系列
  - 课程描述
  - 上课地点（完整地址）
  - 上课时间（开始日期、结束日期、开始时间、结束时间）
  - 星期几（Days of Week）
  - 时区
  - 课程状态
  - 容量信息（当前学生数/最大学生数）

#### 3.4.2 学生列表
- **显示内容**：
  - 学生姓名
  - 学生邮箱（可选）
  - 报名时间
  - 报名状态
- **功能**：
  - 搜索学生
  - 导出学生列表（CSV，可选）
- **权限**：
  - 只显示已报名（Enrolled）状态的学生
  - 不显示等待列表（Waitlisted）中的学生

#### 3.4.3 课程进度
- **显示内容**：
  - 课程开始日期
  - 课程结束日期
  - 已完成的会话数
  - 总会话数
  - 进度百分比
- **可视化**：
  - 进度条显示

#### 3.4.4 课程日历视图
- **功能**：
  - 显示课程的所有会话日期
  - 日历视图（月视图）
  - 标记已完成的会话
  - 标记即将到来的会话
- **交互**：
  - 点击日期查看该日期的会话详情

#### 3.4.5 iCalendar 导出
- **功能**：
  - 点击"Export to Calendar"按钮
  - 生成 .ics 文件
  - 下载文件
- **包含信息**：
  - 课程名称
  - 上课时间
  - 上课地点
  - 课程描述
  - 重复规则（RRULE）
  - 例外日期（EXDATE）

### 3.5 课程日历（Schedule）

#### 3.5.1 日历视图
- **位置**：`/coach/schedule`
- **显示方式**：
  - 月视图（默认）
  - 周视图（可选）
  - 日视图（可选）
- **显示内容**：
  - 所有分配给该教练的课程实例
  - 按日期显示
  - 显示课程名称、时间、地点
- **交互**：
  - 点击日期查看该日期的所有课程
  - 点击课程查看详情
  - 月份导航（上一月/下一月）

#### 3.5.2 筛选功能
- **功能**：
  - 按地点筛选
  - 按课程状态筛选
  - 按日期范围筛选

#### 3.5.3 批量导出
- **功能**：
  - 导出所有课程到 .ics 文件
  - 导出筛选后的课程
  - 导出指定日期范围的课程

### 3.6 教练统计（Statistics）

#### 3.6.1 教学统计
- **显示内容**：
  - 总授课数
  - 总学生数
  - 平均每班学生数
  - 课程完成率
- **时间范围**：
  - 本月
  - 本季度
  - 本年
  - 全部时间

#### 3.6.2 课程分布
- **显示内容**：
  - 按状态分布的课程数（饼图）
  - 按地点分布的课程数（柱状图）
  - 按月份分布的课程数（折线图）

#### 3.6.3 学生统计
- **显示内容**：
  - 总学生数
  - 平均出勤率（如果有出勤数据）
  - 学生反馈（如果有反馈系统）

---

## 4. 数据模型

### 4.1 核心数据表

#### 4.1.1 users（用户表）
- `id`: 用户 ID
- `name`: 姓名
- `email`: 邮箱
- `role`: 角色（'coach'）
- `image`: 头像 URL

#### 4.1.2 course_instances（课程实例表）
- `id`: 实例 ID
- `assignment_id`: Assignment ID
- `location_id`: Location ID
- `start_date`: 开始日期
- `end_date`: 结束日期
- `start_time`: 开始时间
- `end_time`: 结束时间
- `max_students`: 最大学生数
- `instructor_id`: 主教练 ID（向后兼容）
- `instructor_name`: 主教练姓名（向后兼容）
- `status`: 状态（scheduled, ongoing, completed, cancelled）

#### 4.1.3 course_instance_coaches（课程实例教练表）
- `id`: 关联 ID
- `instance_id`: 实例 ID
- `coach_id`: 教练 ID
- `is_primary`: 是否为主教练
- `created_at`: 创建时间

#### 4.1.4 course_enrollments（报名表）
- `id`: 报名 ID
- `user_id`: 用户 ID
- `instance_id`: 实例 ID
- `status`: 状态（enrolled, completed, cancelled）
- `enrolled_at`: 报名时间

---

## 5. API 设计

### 5.1 Dashboard API

#### 5.1.1 获取 Dashboard 数据
```
GET /api/coach/dashboard

Response:
{
  "stats": {
    "totalClasses": number,
    "upcomingClasses": number,
    "ongoingClasses": number,
    "completedClasses": number
  },
  "recentClasses": CourseInstance[],
  "todayClasses": CourseInstance[],
  "upcomingClasses": CourseInstance[]
}
```

### 5.2 我的课程 API

#### 5.2.1 获取课程列表
```
GET /api/coach/classes

Query Parameters:
- status?: string
- start_date?: string
- end_date?: string
- location_id?: string
- limit?: number
- offset?: number

Response:
{
  "classes": CourseInstance[],
  "total": number
}
```

#### 5.2.2 获取课程详情
```
GET /api/coach/classes/[id]

Response:
{
  "instance": CourseInstance,
  "assignment": CourseAssignment,
  "course": Course,
  "location": CourseLocation,
  "students": Enrollment[],
  "coaches": User[]
}
```

### 5.3 课程日历 API

#### 5.3.1 获取日历数据
```
GET /api/coach/schedule

Query Parameters:
- year?: number
- month?: number
- location_id?: string

Response:
{
  "classes": CourseInstance[],
  "calendar": CalendarEvent[]
}
```

### 5.4 iCalendar 导出 API

#### 5.4.1 导出单个课程
```
GET /api/coach/classes/[id]/icalendar

Response:
Content-Type: text/calendar
Content-Disposition: attachment; filename="course.ics"

[ICS file content]
```

#### 5.4.2 批量导出课程
```
GET /api/coach/classes/icalendar

Query Parameters:
- start_date?: string
- end_date?: string
- location_id?: string

Response:
Content-Type: text/calendar
Content-Disposition: attachment; filename="all-classes.ics"

[ICS file content]
```

### 5.5 教练统计 API

#### 5.5.1 获取教练统计
```
GET /api/coach/statistics

Query Parameters:
- period?: string (month, quarter, year, all)

Response:
{
  "teachingStats": {
    "totalClasses": number,
    "totalStudents": number,
    "avgStudentsPerClass": number,
    "completionRate": number
  },
  "classDistribution": {
    "byStatus": Array<{ status: string, count: number }>,
    "byLocation": Array<{ location: string, count: number }>,
    "byMonth": Array<{ month: string, count: number }>
  },
  "studentStats": {
    "totalStudents": number,
    "avgAttendance": number
  }
}
```

---

## 6. UI/UX 设计

### 6.1 页面布局

#### 6.1.1 整体布局
- **顶部导航栏**：Logo、用户菜单、退出登录
- **侧边栏**：导航菜单（Dashboard, My Classes, Schedule, Statistics）
- **主内容区**：使用 Card 和 Table 组件展示内容

#### 6.1.2 导航菜单
- Dashboard
- My Classes
- Schedule
- Statistics

### 6.2 组件设计

#### 6.2.1 统计卡片
- 使用 Card 组件
- 显示关键指标
- 支持点击查看详情

#### 6.2.2 课程列表
- 使用 Card 或 Table 组件
- 支持筛选和排序
- 状态使用 Badge 显示

#### 6.2.3 日历组件
- 使用日历库（如 react-big-calendar）
- 支持月/周/日视图
- 支持事件点击

---

## 7. 业务规则

### 7.1 权限规则
- 只有 Coach 角色可以访问教练门户
- 只能查看分配给自己的课程
- 所有字段只读（不能编辑课程信息）

### 7.2 数据访问规则
- 使用 `course_instance_coaches` 表查询分配给教练的课程
- 如果 `is_primary = true`，显示为主教练
- 支持多教练分配（一个课程可以有多个教练）

### 7.3 课程状态规则
- Scheduled：课程已安排，尚未开始
- Ongoing：课程进行中
- Completed：课程已完成
- Cancelled：课程已取消

---

## 8. 非功能需求

### 8.1 性能要求
- 页面加载时间 < 2 秒
- 列表加载时间 < 1 秒
- 日历渲染时间 < 1 秒

### 8.2 安全要求
- 所有 API 需要身份验证
- 只有 Coach 可以访问
- 数据访问权限验证

### 8.3 可用性要求
- 响应式设计
- 清晰的错误提示
- 友好的加载状态

---

## 9. 验收标准

### 9.1 功能验收
- ✅ 可以查看分配给自己的所有课程
- ✅ 可以查看课程详情和学生列表
- ✅ 可以查看课程日历
- ✅ 可以导出课程到日历应用
- ✅ 可以查看教学统计

### 9.2 权限验收
- ✅ 只有 Coach 可以访问
- ✅ 只能查看自己的课程
- ✅ 权限验证正确

---

## 10. 实施状态

### 10.1 已完成功能（✅）
- ✅ 教练登录和认证
- ✅ Dashboard 基本功能
- ✅ 我的课程列表（基本功能）

### 10.2 部分完成功能（⚠️）
- ⚠️ 课程详情（基本信息已实现，学生列表待完善）
- ⚠️ 课程日历（基本功能已实现）
- ⚠️ iCalendar 导出（基本功能已实现）

### 10.3 计划功能（⏳）
- ⏳ 教练统计
- ⏳ 学生出勤管理
- ⏳ 课程反馈收集

---

## 11. 未来扩展

### 11.1 短期（1-3 个月）
- ⏳ 学生出勤记录
- ⏳ 课程反馈收集
- ⏳ 课程材料上传

### 11.2 中期（3-6 个月）
- ⏳ 课程评分系统
- ⏳ 学生进度跟踪
- ⏳ 课程报告生成

### 11.3 长期（6-12 个月）
- ⏳ 移动端应用
- ⏳ 实时通知
- ⏳ 视频会议集成

---

## 12. 附录

### 12.1 相关文档
- `COACH_PORTAL_DESIGN.md`：教练门户设计文档
- `PRD-05-课程管理系统.md`：课程管理 PRD
- `PRD-10-管理员门户.md`：管理员门户 PRD

### 12.2 术语表
- **Instance（实例）**：课程的具体开班实例
- **Assignment（分配）**：课程分配到特定的分类和地点
- **Coach（教练）**：课程的教学人员
- **iCalendar**：日历文件格式标准（RFC 5545）

