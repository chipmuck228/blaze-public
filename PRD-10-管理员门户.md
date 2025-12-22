# PRD-10: 管理员门户

**版本**: 1.0  
**日期**: 2025-12  
**状态**: 已实施（部分功能）

---

## 1. 概述

### 1.1 文档目的

本文档描述 Blaze Robotics Academy 管理员门户的功能需求，包括用户管理、课程管理、课程分类管理、课程分配管理、课程实例管理、报名管理、团队管理、地点管理、Franchise 管理和数据统计等核心功能。

### 1.2 核心价值

- **集中管理**：管理员可以在一个地方管理所有系统资源
- **高效操作**：提供批量操作、搜索、筛选等功能，提高管理效率
- **数据洞察**：通过统计和分析，了解系统运行状况
- **灵活配置**：支持多租户（Franchise）配置和品牌定制

### 1.3 系统组成

管理员门户由以下核心模块组成：
1. **Dashboard**：系统概览和关键指标
2. **用户管理**：用户 CRUD、角色管理、权限管理
3. **课程管理**：课程、分类、系列、子类、分配、实例管理
4. **报名管理**：查看和管理所有报名记录
5. **团队管理**：团队成员管理
6. **地点管理**：课程地点管理
7. **Franchise 管理**：多租户配置和品牌定制
8. **学习路径管理**：学习路径创建和管理
9. **数据统计与分析**：系统数据统计和报表

---

## 2. 用户角色与场景

### 2.1 用户角色

| 角色 | 描述 | 访问权限 |
|------|------|---------|
| **Admin** | 系统管理员 | 完整访问所有管理功能 |
| **Coach** | 教练 | 只能查看分配给自己的课程 |
| **User** | 普通用户 | 无法访问管理员门户 |

### 2.2 核心使用场景

#### 场景 1: 查看系统概览
1. 管理员登录后访问 `/admin`
2. 查看 Dashboard，了解系统关键指标
3. 查看最近活动和新注册用户
4. 查看系统健康状况

#### 场景 2: 管理用户
1. 管理员访问 `/admin/users`
2. 查看用户列表（支持搜索和筛选）
3. 编辑用户信息（角色、邮箱验证状态）
4. 删除用户（需要确认）
5. 创建新用户

#### 场景 3: 管理课程
1. 管理员访问 `/admin/courses`
2. 查看课程列表（支持搜索和筛选）
3. 创建新课程
4. 编辑课程信息
5. 管理课程状态（Draft/Published/Suspended/Archived）
6. 删除课程（仅 Draft 状态）

#### 场景 4: 管理课程分类
1. 管理员访问 `/admin/categories`
2. 管理课程大类（Category）
3. 管理课程系列（Series）
4. 管理子类标签（Subcategory）
5. 设置分类关系和层级

#### 场景 5: 管理课程分配
1. 管理员访问 `/admin/assignments`
2. 创建课程分配（Course + Category + Series + Location）
3. 编辑分配信息
4. 查看分配关联的实例

#### 场景 6: 管理课程实例
1. 管理员访问 `/admin/instances`
2. 创建课程实例（基于 Assignment）
3. 设置实例时间、地点、教练
4. 管理实例容量
5. 查看实例报名情况
6. 导出 iCalendar

#### 场景 7: 管理报名
1. 管理员访问 `/admin/enrollments`
2. 查看所有报名记录（支持筛选和搜索）
3. 查看报名详情
4. 手动确认报名
5. 取消报名
6. 管理等待列表

#### 场景 8: 管理团队
1. 管理员访问 `/admin/teams`
2. 添加团队成员
3. 编辑成员信息
4. 上传成员头像
5. 管理社交媒体链接
6. 删除成员

#### 场景 9: 管理地点
1. 管理员访问 `/admin/locations`
2. 创建课程地点
3. 编辑地点信息
4. 关联地点到 Franchise
5. 删除地点

#### 场景 10: 管理 Franchise
1. 管理员访问 `/admin/franchises`
2. 创建新 Franchise
3. 配置 Franchise 基本信息
4. 配置品牌定制（Branding Config）
5. 管理 Franchise 关联的地点
6. 设置 Franchise 状态（Active/Inactive）

#### 场景 11: 管理学习路径
1. 管理员访问 `/admin/learning-paths`
2. 创建学习路径
3. 编辑路径信息
4. 管理路径中的课程
5. 设置路径阶段和顺序
6. 删除路径

#### 场景 12: 查看数据统计
1. 管理员访问 `/admin/analytics`
2. 查看用户统计（总数、新增、活跃）
3. 查看课程统计（总数、报名数、完成率）
4. 查看收入统计（总收入、月度收入）
5. 查看报名趋势
6. 导出报表

---

## 3. 功能需求

### 3.1 Dashboard（仪表板）

#### 3.1.1 统计卡片
- **用户统计**：
  - Total Users（总用户数）
  - Verified Users（已验证用户数）
  - Admins（管理员数）
  - New Today（今日新增用户）
- **课程统计**：
  - Total Courses（总课程数）
  - Published Courses（已发布课程数）
  - Total Instances（总实例数）
  - Active Instances（活跃实例数）
- **报名统计**：
  - Total Enrollments（总报名数）
  - Active Enrollments（活跃报名数）
  - Waitlist Count（等待列表数）
  - Completed Enrollments（已完成报名数）
- **收入统计**（如果启用支付）：
  - Total Revenue（总收入）
  - Monthly Revenue（月度收入）
  - Pending Payments（待支付金额）

#### 3.1.2 最近活动
- **显示内容**：
  - 最近注册的用户
  - 最近创建的课程
  - 最近的报名记录
  - 系统事件（错误、警告）

#### 3.1.3 快速操作
- **功能**：
  - 快速创建课程
  - 快速创建用户
  - 快速查看报表
  - 快速访问常用功能

### 3.2 用户管理（Users）

#### 3.2.1 用户列表
- **位置**：`/admin/users`
- **显示内容**：
  - 用户头像
  - 用户姓名
  - 邮箱
  - 角色（User, Coach, Admin）
  - 邮箱验证状态
  - 注册时间
  - 最后登录时间
  - 操作按钮（Edit, Delete）
- **功能**：
  - 搜索（按姓名、邮箱）
  - 筛选（按角色、验证状态）
  - 排序（按注册时间、最后登录时间）
  - 分页

#### 3.2.2 创建用户
- **功能**：
  - 输入姓名
  - 输入邮箱
  - 设置密码
  - 选择角色
  - 设置邮箱验证状态
- **验证**：
  - 邮箱格式验证
  - 邮箱唯一性验证
  - 密码强度验证
  - 角色有效性验证

#### 3.2.3 编辑用户
- **功能**：
  - 修改姓名
  - 修改邮箱（需要验证唯一性）
  - 修改角色
  - 修改邮箱验证状态
  - 重置密码（可选）
- **限制**：
  - 不能修改自己的角色（防止锁定）
  - 不能删除自己

#### 3.2.4 删除用户
- **功能**：
  - 删除用户（需要确认）
  - 级联删除相关数据（报名、完成记录等）
- **限制**：
  - 不能删除自己
  - 删除前检查是否有未完成的订单
  - 显示删除影响范围

### 3.3 课程管理（Courses）

#### 3.3.1 课程列表
- **位置**：`/admin/courses`
- **显示内容**：
  - 课程名称
  - 课程 Slug
  - 标签（Tags）
  - 会话数（Sessions）
  - 年龄范围（Age Range）
  - 年级（Grades）
  - 价格（Price）
  - 状态（Status）
  - 创建时间
  - 操作按钮（View, Edit, Delete）
- **功能**：
  - 搜索（按名称、描述、Slug）
  - 筛选（按状态、标签、分类）
  - 排序（按创建时间、名称）
  - 分页

#### 3.3.2 创建课程
- **功能**：
  - 基本信息：
    - 课程名称（必填）
    - Slug（可选，自动生成）
    - 描述
    - 目标受众
    - 学习成果
    - 先修条件
    - 取消政策
  - 课程属性：
    - 会话数
    - 年龄范围（最小、最大）
    - 年级
    - 基础价格
    - 货币
  - 课程状态：
    - Draft（草稿）
    - Published（已发布）
    - Suspended（暂停）
    - Archived（归档）
  - 课程分类：
    - 选择 Category
    - 选择 Series
    - 选择 Subcategories（多选）
  - 课程图片：
    - 上传课程海报（Poster）

#### 3.3.3 编辑课程
- **功能**：
  - 修改所有可编辑字段
  - 更新课程状态
  - 管理课程分类
  - 更新课程图片
- **限制**：
  - Archived 状态的课程不能编辑
  - 已发布的课程修改需要谨慎（可能影响已报名用户）

#### 3.3.4 删除课程
- **功能**：
  - 删除课程（需要确认）
- **限制**：
  - 只有 Draft 状态的课程可以删除
  - 其他状态的课程需要先归档（Archived）
  - 删除前检查是否有关联的 Assignment 或 Instance

### 3.4 课程分类管理

#### 3.4.1 Category（大类）管理
- **位置**：`/admin/categories`
- **功能**：
  - 创建 Category
  - 编辑 Category（名称、显示名称、描述）
  - 删除 Category（需要检查是否有关联的 Series）
  - 设置显示顺序

#### 3.4.2 Series（系列）管理
- **位置**：`/admin/series`
- **功能**：
  - 创建 Series（必须关联 Category）
  - 编辑 Series（名称、显示名称、描述、Category）
  - 删除 Series（需要检查是否有关联的 Assignment）
  - 设置显示顺序

#### 3.4.3 Subcategory（子类）管理
- **位置**：`/admin/subcategories`
- **功能**：
  - 创建 Subcategory
  - 编辑 Subcategory（名称、显示名称、描述）
  - 删除 Subcategory
  - 关联到课程（多对多关系）

### 3.5 课程分配管理（Assignments）

#### 3.5.1 分配列表
- **位置**：`/admin/assignments`
- **显示内容**：
  - 课程名称
  - Category
  - Series
  - Location
  - 关联的实例数
  - 创建时间
  - 操作按钮（View, Edit, Delete）

#### 3.5.2 创建分配
- **功能**：
  - 选择课程（Course）
  - 选择 Category
  - 选择 Series
  - 选择 Location
  - 设置其他属性
- **验证**：
  - Course 必须存在
  - Category 和 Series 必须匹配
  - Location 必须存在

#### 3.5.3 编辑分配
- **功能**：
  - 修改所有可编辑字段
  - 查看关联的实例

#### 3.5.4 删除分配
- **限制**：
  - 删除前检查是否有关联的 Instance
  - 如果有 Instance，需要先删除或转移

### 3.6 课程实例管理（Instances）

#### 3.6.1 实例列表
- **位置**：`/admin/instances`
- **显示内容**：
  - 课程名称
  - Location
  - 开始日期
  - 结束日期
  - 上课时间
  - 教练
  - 容量（当前/最大）
  - 状态
  - 操作按钮（View, Edit, Delete）

#### 3.6.2 创建实例
- **功能**：
  - 选择 Assignment
  - 设置时间：
    - 开始日期
    - 结束日期
    - 开始时间
    - 结束时间
    - 星期几（Days of Week）
  - 设置地点：
    - 选择 Location
  - 设置教练：
    - 选择主教练（Primary Coach）
    - 选择辅助教练（可选，多选）
  - 设置容量：
    - 最大学生数（Max Students）
  - 设置重复规则（iCalendar RRULE）：
    - 频率（Weekly, Daily等）
    - 重复次数或结束日期
    - 例外日期（EXDATE）
    - 额外日期（RDATE）
  - 设置时区

#### 3.6.3 编辑实例
- **功能**：
  - 修改所有可编辑字段
  - 更新容量
  - 更新教练
  - 查看报名情况

#### 3.6.4 实例日历视图
- **功能**：
  - 日历视图显示所有实例
  - 按日期筛选
  - 按 Location 筛选
  - 按教练筛选
  - 点击实例查看详情
  - 拖拽调整时间（可选）

#### 3.6.5 iCalendar 导出
- **功能**：
  - 导出单个实例为 .ics 文件
  - 批量导出多个实例
  - 导出教练的所有实例

### 3.7 报名管理（Enrollments）

#### 3.7.1 报名列表
- **位置**：`/admin/enrollments`
- **显示内容**：
  - 用户姓名
  - 课程名称
  - Location
  - 报名时间
  - 状态（Cart, Reserved, Enrolled, Waitlisted, Cancelled, Expired, Completed）
  - 支付状态
  - 操作按钮（View, Edit, Cancel）

#### 3.7.2 报名详情
- **显示内容**：
  - 用户信息
  - 课程信息
  - 实例信息
  - 报名状态历史
  - 支付信息
  - 等待列表位置（如果适用）

#### 3.7.3 手动操作
- **功能**：
  - 手动确认报名
  - 取消报名
  - 移动到等待列表
  - 从等待列表移除
  - 标记为完成

### 3.8 团队管理（Teams）

#### 3.8.1 团队成员列表
- **位置**：`/admin/teams`
- **显示内容**：
  - 成员头像
  - 成员姓名
  - 职位（Position）
  - 简介（Bio）
  - 社交媒体链接
  - 显示顺序
  - 操作按钮（Edit, Delete）

#### 3.8.2 添加成员
- **功能**：
  - 输入姓名
  - 输入职位
  - 输入简介
  - 上传头像（Vercel Blob）
  - 添加社交媒体链接（LinkedIn, Twitter等）
  - 设置显示顺序

#### 3.8.3 编辑成员
- **功能**：
  - 修改所有字段
  - 更换头像
  - 更新社交媒体链接

#### 3.8.4 删除成员
- **功能**：
  - 删除成员（需要确认）

### 3.9 地点管理（Locations）

#### 3.9.1 地点列表
- **位置**：`/admin/locations`
- **显示内容**：
  - 地点名称
  - 地址
  - 城市
  - 州
  - 邮编
  - 关联的 Franchise
  - 操作按钮（Edit, Delete）

#### 3.9.2 创建地点
- **功能**：
  - 输入地点名称
  - 输入地址信息
  - 关联到 Franchise
  - 设置联系信息（电话、邮箱）

#### 3.9.3 编辑地点
- **功能**：
  - 修改所有字段
  - 更新关联的 Franchise

#### 3.9.4 删除地点
- **限制**：
  - 删除前检查是否有关联的 Instance

### 3.10 Franchise 管理

#### 3.10.1 Franchise 列表
- **位置**：`/admin/franchises`
- **显示内容**：
  - Franchise 代码（Code）
  - Franchise 名称
  - 状态（Active/Inactive）
  - 关联的地点数
  - 操作按钮（Edit, Delete）

#### 3.10.2 创建 Franchise
- **功能**：
  - 输入 Franchise 代码（Code，唯一）
  - 输入 Franchise 名称
  - 设置状态
  - 配置品牌定制（Branding Config）：
    - Hero 区域（标题、描述）
    - Highlights（项目、时间表、焦点）
    - Contact 信息（地址、电话、邮箱、营业时间）

#### 3.10.3 编辑 Franchise
- **功能**：
  - 修改基本信息
  - 更新品牌定制配置
  - 管理关联的地点

#### 3.10.4 品牌定制配置
- **功能**：
  - Hero 标题和描述
  - Highlights 内容
  - Contact 信息
  - 自定义 Logo（可选）
  - 自定义颜色主题（可选）

### 3.11 学习路径管理

#### 3.11.1 学习路径列表
- **位置**：`/admin/learning-paths`
- **显示内容**：
  - 路径名称
  - Slug
  - 类别
  - 难度级别
  - 课程数量
  - 状态（Active/Inactive）
  - 操作按钮（View, Edit, Delete）

#### 3.11.2 创建学习路径
- **功能**：
  - 输入路径名称
  - 输入 Slug
  - 输入描述
  - 选择类别
  - 设置目标受众
  - 设置预计完成时间
  - 设置难度级别
  - 添加课程到路径：
    - 选择课程
    - 设置阶段（Stage）
    - 设置阶段名称
    - 设置是否必填
    - 设置是否可以并行学习
    - 设置显示顺序

#### 3.11.3 编辑学习路径
- **功能**：
  - 修改基本信息
  - 重新组织课程顺序
  - 添加/删除课程
  - 修改阶段设置

### 3.12 数据统计与分析

#### 3.12.1 用户统计
- **显示内容**：
  - 总用户数
  - 新增用户趋势（图表）
  - 用户角色分布（饼图）
  - 用户活跃度（折线图）

#### 3.12.2 课程统计
- **显示内容**：
  - 总课程数
  - 课程状态分布
  - 课程报名数
  - 课程完成率

#### 3.12.3 报名统计
- **显示内容**：
  - 总报名数
  - 报名趋势（图表）
  - 报名状态分布
  - 等待列表统计

#### 3.12.4 收入统计（如果启用支付）
- **显示内容**：
  - 总收入
  - 月度收入趋势（图表）
  - 课程收入分布
  - 退款统计

#### 3.12.5 报表导出
- **功能**：
  - 导出用户报表（CSV）
  - 导出课程报表（CSV）
  - 导出报名报表（CSV）
  - 导出收入报表（CSV/PDF）

---

## 4. 数据模型

### 4.1 核心数据表

#### 4.1.1 users（用户表）
- `id`: 用户 ID
- `name`: 姓名
- `email`: 邮箱
- `email_verified`: 邮箱验证状态
- `role`: 角色（user, coach, admin）
- `image`: 头像 URL
- `created_at`: 创建时间
- `updated_at`: 更新时间

#### 4.1.2 courses（课程表）
- `id`: 课程 ID
- `name`: 课程名称
- `slug`: URL 标识符
- `description`: 描述
- `status`: 状态（draft, published, suspended, archived）
- `base_price`: 基础价格
- `created_at`: 创建时间
- `updated_at`: 更新时间

#### 4.1.3 course_categories（课程大类表）
- `id`: Category ID
- `name`: 名称
- `display_name`: 显示名称
- `description`: 描述
- `display_order`: 显示顺序

#### 4.1.4 course_series（课程系列表）
- `id`: Series ID
- `category_id`: 关联的 Category ID
- `name`: 名称
- `display_name`: 显示名称
- `description`: 描述
- `display_order`: 显示顺序

#### 4.1.5 course_assignments（课程分配表）
- `id`: Assignment ID
- `course_id`: 课程 ID
- `category_id`: Category ID
- `series_id`: Series ID
- `location_id`: Location ID
- `created_at`: 创建时间

#### 4.1.6 course_instances（课程实例表）
- `id`: Instance ID
- `assignment_id`: Assignment ID
- `location_id`: Location ID
- `start_date`: 开始日期
- `end_date`: 结束日期
- `start_time`: 开始时间
- `end_time`: 结束时间
- `max_students`: 最大学生数
- `instructor_id`: 主教练 ID
- `status`: 状态（scheduled, ongoing, completed, cancelled）
- `created_at`: 创建时间

#### 4.1.7 course_enrollments（报名表）
- `id`: Enrollment ID
- `user_id`: 用户 ID
- `instance_id`: Instance ID
- `status`: 状态（cart, reserved, enrolled, waitlisted, cancelled, expired, completed）
- `enrolled_at`: 报名时间
- `created_at`: 创建时间

#### 4.1.8 teams（团队表）
- `id`: 成员 ID
- `name`: 姓名
- `position`: 职位
- `bio`: 简介
- `image_url`: 头像 URL
- `social_links`: 社交媒体链接（JSON）
- `display_order`: 显示顺序

#### 4.1.9 course_locations（地点表）
- `id`: Location ID
- `name`: 地点名称
- `address`: 地址
- `city`: 城市
- `state`: 州
- `zip_code`: 邮编
- `franchise_id`: 关联的 Franchise ID

#### 4.1.10 franchises（Franchise 表）
- `id`: Franchise ID
- `code`: Franchise 代码（唯一）
- `name`: Franchise 名称
- `branding_config`: 品牌定制配置（JSON）
- `is_active`: 是否激活
- `created_at`: 创建时间

---

## 5. API 设计

### 5.1 Dashboard API

#### 5.1.1 获取 Dashboard 数据
```
GET /api/admin/dashboard

Response:
{
  "users": {
    "total": number,
    "verified": number,
    "admins": number,
    "newToday": number
  },
  "courses": {
    "total": number,
    "published": number,
    "instances": number,
    "activeInstances": number
  },
  "enrollments": {
    "total": number,
    "active": number,
    "waitlist": number,
    "completed": number
  },
  "revenue": {
    "total": number,
    "monthly": number,
    "pending": number
  },
  "recentActivity": Activity[]
}
```

### 5.2 用户管理 API

#### 5.2.1 获取用户列表
```
GET /api/admin/users

Query Parameters:
- search?: string
- role?: string
- email_verified?: boolean
- limit?: number
- offset?: number

Response:
{
  "users": User[],
  "total": number
}
```

#### 5.2.2 创建用户
```
POST /api/admin/users

Request:
{
  "name": string,
  "email": string,
  "password": string,
  "role": "user" | "coach" | "admin",
  "email_verified": boolean
}

Response:
{
  "success": boolean,
  "user": User
}
```

#### 5.2.3 更新用户
```
PATCH /api/admin/users/[id]

Request:
{
  "name"?: string,
  "email"?: string,
  "role"?: string,
  "email_verified"?: boolean
}

Response:
{
  "success": boolean,
  "user": User
}
```

#### 5.2.4 删除用户
```
DELETE /api/admin/users/[id]

Response:
{
  "success": boolean
}
```

### 5.3 课程管理 API

#### 5.3.1 获取课程列表
```
GET /api/admin/courses

Query Parameters:
- search?: string
- status?: string
- category_id?: string
- limit?: number
- offset?: number

Response:
{
  "courses": Course[],
  "total": number
}
```

#### 5.3.2 创建课程
```
POST /api/admin/courses

Request:
{
  "name": string,
  "slug"?: string,
  "description"?: string,
  "status": "draft" | "published" | "suspended" | "archived",
  // ... 其他字段
}

Response:
{
  "success": boolean,
  "course": Course
}
```

#### 5.3.3 更新课程
```
PATCH /api/admin/courses/[id]

Request:
{
  // 可更新的字段
}

Response:
{
  "success": boolean,
  "course": Course
}
```

#### 5.3.4 删除课程
```
DELETE /api/admin/courses/[id]

Response:
{
  "success": boolean
}
```

### 5.4 其他管理 API

（课程分类、分配、实例、报名、团队、地点、Franchise、学习路径等 API 设计类似，遵循 RESTful 规范）

---

## 6. UI/UX 设计

### 6.1 页面布局

#### 6.1.1 整体布局
- **顶部导航栏**：Logo、用户菜单、退出登录
- **侧边栏**：可折叠的导航菜单，按功能分组
- **主内容区**：使用 Card 和 Table 组件展示内容
- **页脚**：版权信息

#### 6.1.2 侧边栏导航
- Dashboard
- Users
- Courses
  - Courses
  - Categories
  - Series
  - Subcategories
  - Assignments
  - Instances
- Enrollments
- Teams
- Locations
- Franchises
- Learning Paths
- Analytics

### 6.2 组件设计

#### 6.2.1 数据表格
- 使用 Table 组件
- 支持排序
- 支持筛选
- 支持分页
- 操作列（View, Edit, Delete）

#### 6.2.2 表单对话框
- 使用 Dialog 组件
- 表单验证
- 加载状态
- 错误提示
- 成功提示

#### 6.2.3 统计卡片
- 使用 Card 组件
- 显示关键指标
- 支持点击查看详情
- 趋势指示（上升/下降）

---

## 7. 业务规则

### 7.1 权限规则
- 只有 Admin 角色可以访问管理员门户
- 所有 API 需要验证 Admin 权限
- 敏感操作需要二次确认

### 7.2 数据完整性规则
- 删除操作前检查关联数据
- 状态变更需要符合状态机规则
- 唯一性约束（如 Slug、Code）

### 7.3 业务逻辑规则
- 只有 Draft 状态的课程可以删除
- Archived 状态的课程不能编辑
- 删除 Franchise 前需要先删除关联的地点
- 删除 Location 前需要先删除关联的 Instance

---

## 8. 非功能需求

### 8.1 性能要求
- 列表加载时间 < 2 秒
- 搜索响应时间 < 500ms
- 批量操作响应时间 < 5 秒

### 8.2 安全要求
- 所有 API 需要身份验证
- 只有 Admin 可以访问
- 敏感操作需要确认
- 操作日志记录

### 8.3 可用性要求
- 响应式设计
- 清晰的错误提示
- 友好的加载状态
- 批量操作支持

---

## 9. 验收标准

### 9.1 功能验收
- ✅ 可以管理所有系统资源
- ✅ 可以查看统计数据
- ✅ 可以执行批量操作
- ✅ 数据完整性保证

### 9.2 权限验收
- ✅ 只有 Admin 可以访问
- ✅ 权限验证正确
- ✅ 操作日志完整

---

## 10. 实施状态

### 10.1 已完成功能（✅）
- ✅ 用户管理（基本功能）
- ✅ 课程管理（基本功能）
- ✅ 课程分类管理（基本功能）
- ✅ 课程实例管理（基本功能）

### 10.2 部分完成功能（⚠️）
- ⚠️ 报名管理（查看已实现，手动操作待完善）
- ⚠️ 团队管理（基本功能已实现）
- ⚠️ 地点管理（基本功能已实现）
- ⚠️ Franchise 管理（基本功能已实现，品牌定制部分实现）
- ⚠️ 学习路径管理（基本功能已实现）
- ⚠️ 数据统计（基础统计已实现，高级分析待完善）

### 10.3 计划功能（⏳）
- ⏳ 批量导入课程
- ⏳ 批量操作报名
- ⏳ 高级数据分析和报表
- ⏳ 系统配置管理

---

## 11. 未来扩展

### 11.1 短期（1-3 个月）
- ⏳ 批量导入功能
- ⏳ 高级搜索和筛选
- ⏳ 操作历史记录

### 11.2 中期（3-6 个月）
- ⏳ 工作流自动化
- ⏳ 自定义报表
- ⏳ 数据导出增强

### 11.3 长期（6-12 个月）
- ⏳ AI 辅助管理
- ⏳ 预测分析
- ⏳ 多语言支持

---

## 12. 附录

### 12.1 相关文档
- `PRD-05-课程管理系统.md`：课程管理 PRD
- `PRD-07-用户注册与报名系统.md`：报名系统 PRD
- `PRD-12-多租户（Franchise）系统.md`：Franchise 系统 PRD
- `ADMIN_QUICK_START.md`：管理员快速开始指南

### 12.2 术语表
- **Category（大类）**：课程的最高级别分类
- **Series（系列）**：属于某个 Category 的课程系列
- **Subcategory（子类）**：课程的标签分类
- **Assignment（分配）**：将课程分配到特定的 Category、Series 和 Location
- **Instance（实例）**：课程的具体开班实例，包含时间、地点、教练等信息

