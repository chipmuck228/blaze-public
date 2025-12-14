# Blaze Robotics Academy - Top Level Design Document

## 1. 项目概述

### 1.1 项目简介
Blaze Robotics Academy 是一个基于 Next.js 的在线教育平台，专注于机器人编程课程管理。系统支持多角色用户（学生、教练、管理员），提供完整的课程管理、用户管理、团队管理等功能。

### 1.2 核心功能
- **公开网站**：课程展示、团队介绍、FAQ、新闻订阅
- **用户系统**：注册、登录、邮箱验证、密码重置、个人资料管理
- **课程管理**：灵活的课程架构、多层级分类、课程实例管理、iCalendar 支持
- **课程注册系统**：注册清单、等待列表、容量管理、过期处理、后台任务
- **管理员门户**：用户管理、课程管理、团队管理、数据统计
- **教练门户**：课程查看、日历管理、课程导出

### 1.3 技术栈
- **前端框架**: Next.js 16.0.7 (App Router)
- **UI 框架**: React 19.2.1
- **样式**: Tailwind CSS 3.4.17
- **UI 组件库**: shadcn/ui (Radix UI)
- **认证**: NextAuth.js 5.0.0-beta.30 (auth.js)
- **数据库**: Supabase (PostgreSQL)
- **文件存储**: Vercel Blob Storage
- **邮件服务**: Nodemailer (SMTP)
- **日期处理**: date-fns-tz, rrule
- **日历格式**: iCalendar RFC5545 (ical-generator)
- **类型系统**: TypeScript 5

---

## 2. 系统架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Public     │  │    User      │  │    Admin     │   │
│  │   Website    │  │    Portal    │  │    Portal    │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│  ┌──────────────┐                                         │
│  │   Coach      │                                         │
│  │   Portal     │                                         │
│  └──────────────┘                                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Application                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              App Router (Server Components)          │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              API Routes (Route Handlers)              │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Authentication (NextAuth.js)            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   Supabase   │   │  Vercel Blob │   │   SMTP       │
│  PostgreSQL  │   │   Storage    │   │   Server     │
└──────────────┘   └──────────────┘   └──────────────┘
```

### 2.2 目录结构

```
blaze/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── page.tsx                  # 首页
│   │   ├── layout.tsx                # 根布局
│   │   ├── login/                    # 用户登录
│   │   ├── register/                 # 用户注册
│   │   ├── profile/                  # 用户资料
│   │   ├── enrollments/              # 课程注册
│   │   │   ├── cart/                 # 注册清单
│   │   │   └── waitlist/             # 等待列表
│   │   ├── course-catalog/           # 课程目录
│   │   │   ├── page.tsx              # 所有课程
│   │   │   └── [slug]/               # 课程详情
│   │   ├── admin/                    # 管理员门户
│   │   │   ├── layout.tsx            # Admin 布局
│   │   │   ├── page.tsx              # Dashboard
│   │   │   ├── users/                # 用户管理
│   │   │   ├── teams/                # 团队管理
│   │   │   ├── courses/              # 课程管理
│   │   │   ├── categories/           # 分类管理
│   │   │   ├── series/               # 系列管理
│   │   │   ├── subcategories/        # 子类管理
│   │   │   ├── assignments/          # 分配管理
│   │   │   ├── locations/            # 地点管理
│   │   │   └── instances/            # 实例管理
│   │   ├── coach/                    # 教练门户
│   │   │   ├── layout.tsx            # Coach 布局
│   │   │   ├── page.tsx              # Dashboard
│   │   │   ├── classes/              # 我的课程
│   │   │   └── schedule/             # 课程表
│   │   └── api/                      # API 路由
│   │       ├── auth/                 # 认证 API
│   │       ├── admin/                # 管理员 API
│   │       ├── coach/                # 教练 API
│   │       ├── courses/              # 课程 API
│   │       ├── teams/                 # 团队 API
│   │       ├── enrollments/          # 注册 API
│   │       ├── cron/                  # 后台任务 API
│   │       └── user/                  # 用户 API
│   ├── components/                   # React 组件
│   │   ├── ui/                       # UI 基础组件
│   │   ├── admin/                    # 管理员组件
│   │   ├── coach/                    # 教练组件
│   │   └── [公共组件]                # Hero, Navbar, Footer 等
│   ├── lib/                          # 工具库
│   │   ├── db.ts                     # 数据库操作
│   │   ├── supabase.ts               # Supabase 客户端
│   │   ├── email.ts                  # 邮件服务
│   │   ├── icalendar.ts              # iCalendar 工具
│   │   └── utils.ts                  # 工具函数
│   ├── auth.ts                       # NextAuth 配置
│   └── types/                        # TypeScript 类型
├── public/                           # 静态资源
├── scripts/                          # 脚本文件
└── [配置文件]                        # package.json, tsconfig.json 等
```

---

## 3. 功能模块

### 3.1 公开网站模块

#### 3.1.1 首页 (`/`)
- **Hero Section**: 主视觉区域
- **Advantages**: 优势展示
- **Courses**: 特色课程展示（从数据库获取前6个）
- **Camps**: 夏令营展示
- **Testimonials**: 用户评价
- **Team**: 团队成员展示（从数据库获取）
- **FAQ**: 常见问题
- **Newsletter**: 邮件订阅

#### 3.1.2 课程目录 (`/course-catalog`)
- 所有课程列表
- 课程详情页面 (`/course-catalog/[slug]`)
- 支持通过 slug 或 ID 访问

#### 3.1.3 导航栏
- 响应式设计（移动端使用 Sheet）
- 用户认证状态显示
- 购物车图标（显示商品数量）
- 用户下拉菜单（Profile, Settings, Sign Out）

### 3.2 用户认证模块

#### 3.2.1 认证方式
- **邮箱/密码**: 传统注册登录
- **Google OAuth**: Google 账号登录
- **邮箱验证**: 注册后发送验证邮件
- **密码重置**: 忘记密码功能

#### 3.2.2 用户角色
- **user**: 普通用户（默认）
- **coach**: 教练
- **admin**: 管理员

#### 3.2.3 路由保护
- `/admin/*`: 需要 admin 角色
- `/coach/*`: 需要 coach 或 admin 角色
- `/profile`: 需要登录

### 3.3 用户资料模块 (`/profile`)

#### 3.3.1 个人信息
- 头像显示（支持 Google 头像）
- 姓名编辑
- 邮箱显示（验证状态）
- 注册时间

#### 3.3.2 我的课程
- 课程注册列表（支持多种状态：enrolled, cart, waitlisted, reserved 等）
- 课程信息展示（课程名称、地点、时间、价格等）
- 注册状态显示（带颜色标识）
- 快速链接到购物车和等待列表

#### 3.3.3 付款信息
- 支付方式管理（预留接口）
- 账单历史（预留接口）

### 3.4 课程注册模块

#### 3.4.1 注册流程
1. **浏览课程** → 选择课程实例
2. **加入注册清单** (Cart) → 15 分钟保留时间
3. **结账** (Checkout) → 转为 Reserved 状态（10 分钟支付时间）
4. **支付确认** → 转为 Enrolled 状态
5. **等待列表** → 课程已满时加入，有名额时自动通知

#### 3.4.2 注册状态
- **cart**: 在注册清单中（未支付，15 分钟过期）
- **reserved**: 已保留（支付中，10 分钟过期）
- **enrolled**: 已正式注册
- **waitlisted**: 在等待列表中（FIFO 队列）
- **cancelled**: 已取消
- **expired**: 已过期（自动释放）
- **completed**: 课程已完成

#### 3.4.3 容量管理
- 实时计算可用容量：`max_students - enrolled - reserved - cart`
- 并发控制（数据库锁）
- 地理位置差异化容量

#### 3.4.4 等待列表机制
- FIFO（先进先出）队列
- 自动位置排序
- 名额可用时自动通知（24 小时有效期）
- 自动过期处理（7 天未收到通知）

#### 3.4.5 过期处理
- Cart 过期：15 分钟（可配置）
- Reserved 过期：10 分钟（可配置）
- Waitlist 过期：7 天自动过期 + 24 小时通知有效期
- 后台定时任务自动处理

#### 3.4.6 用户界面
- **注册清单页面** (`/enrollments/cart`): 显示购物车、倒计时、结账
- **等待列表页面** (`/enrollments/waitlist`): 显示等待位置、通知状态
- **课程卡片**: 显示 "Enroll" 按钮，支持选择实例
- **Navbar**: 购物车图标和数量提示

### 3.5 课程管理模块

#### 3.4.1 课程架构设计
采用灵活的 Assignment 模型：

```
Course (独立实体)
    ↓
Course Assignment (多对多关系)
    ├── Category
    ├── Series (必须关联 Category)
    ├── Location (可选)
    └── Subcategories (标签系统，多对多)
        ↓
Course Instance (课程实例)
    ├── Assignment (关联)
    ├── Location (可选覆盖)
    ├── iCalendar (RFC5545)
    │   ├── RRULE (重复规则)
    │   ├── EXDATE (排除日期)
    │   └── RDATE (额外日期)
    └── Coaches (多对多关系)
```

#### 3.4.2 核心实体
1. **Course**: 课程内容（独立）
2. **CourseCategory**: 课程大类（Courses, Camp, Workshop）
3. **CourseSeries**: 课程系列（必须关联 Category）
4. **CourseSubcategory**: 子类标签（多对多）
5. **CourseLocation**: 地点
6. **CourseAssignment**: 课程分配（Course + Category + Series + Location）
7. **CourseInstance**: 课程实例（Assignment + 时间 + 地点 + 教练）

#### 3.4.3 iCalendar 支持
- 使用 RFC5545 标准
- 支持重复规则 (RRULE)
- 支持例外日期 (EXDATE)
- 支持额外日期 (RDATE)
- 时区支持
- 导出 .ics 文件

### 3.6 管理员门户模块 (`/admin`)

#### 3.5.1 Dashboard
- 统计卡片：
  - Total Users
  - Verified Users
  - Admins
  - New Today

#### 3.5.2 用户管理 (`/admin/users`)
- 用户列表（表格）
- 用户编辑（角色、邮箱验证状态）
- 用户删除
- 角色筛选

#### 3.5.3 团队管理 (`/admin/teams`)
- 团队成员列表
- 添加/编辑团队成员
- 头像上传（Vercel Blob）
- 社交媒体链接管理

#### 3.5.4 课程管理 (`/admin/courses`)
- **Courses**: 课程内容管理
- **Categories**: 大类管理
- **Series**: 系列管理（必须关联 Category）
- **Subcategories**: 子类标签管理
- **Assignments**: 课程分配管理
- **Locations**: 地点管理
- **Instances**: 课程实例管理
  - 日历视图
  - iCalendar 导出
  - 多教练分配

#### 3.5.5 侧边栏
- 可折叠设计
- 课程相关功能分组（Accordion）

### 3.7 教练门户模块 (`/coach`)

#### 3.6.1 Dashboard (`/coach`)
- 统计卡片：
  - Total Classes
  - Upcoming Classes
  - Ongoing Classes
  - Completed Classes

#### 3.6.2 我的课程 (`/coach/classes`)
- 课程实例列表
- 筛选和排序
- 课程详情查看

#### 3.6.3 课程详情 (`/coach/classes/[id]`)
- 课程信息（只读）
- 日历视图（InstanceCalendar）
- iCalendar 导出

#### 3.6.4 课程表 (`/coach/schedule`)
- 日历视图
- 所有分配的课程

#### 3.6.5 权限
- 所有字段只读
- 只能查看分配给自己的课程
- 支持多教练分配

### 3.8 API 模块

#### 3.7.1 认证 API (`/api/auth/*`)
- `[...nextauth]`: NextAuth 处理
- `register`: 用户注册
- `verify-email`: 邮箱验证
- `forgot-password`: 忘记密码
- `reset-password`: 重置密码
- `resend-verification`: 重发验证邮件

#### 3.7.2 管理员 API (`/api/admin/*`)
- `users`: 用户 CRUD
- `teams`: 团队 CRUD + 上传
- `stats`: 统计数据
- `courses`: 课程 CRUD
- `categories`: 分类 CRUD
- `series`: 系列 CRUD
- `subcategories`: 子类 CRUD
- `assignments`: 分配 CRUD
- `locations`: 地点 CRUD
- `instances`: 实例 CRUD + 导出

#### 3.7.3 教练 API (`/api/coach/*`)
- `stats`: 教练统计
- `instances`: 课程实例查询 + 导出

#### 3.7.4 注册 API (`/api/enrollments/*`)
- `GET /cart`: 获取注册清单
- `POST /cart`: 加入注册清单
- `DELETE /cart/[id]`: 从清单移除
- `POST /cart/[id]`: 延长过期时间
- `GET /waitlist`: 获取等待列表
- `POST /waitlist`: 加入等待列表
- `DELETE /waitlist/[id]`: 从等待列表移除
- `POST /checkout`: 结账（转为 reserved）
- `GET /`: 获取所有注册
- `GET /[id]`: 获取单个注册
- `PATCH /[id]`: 更新注册（确认/取消）

#### 3.7.5 后台任务 API (`/api/cron/*`)
- `GET/POST /process-expired-enrollments`: 处理过期注册（定时任务）

#### 3.7.6 公开 API (`/api/*`)
- `courses/featured`: 特色课程
- `courses/[id]`: 课程详情
- `courses/[id]/instances`: 获取课程的可用实例
- `teams`: 团队成员列表
- `user/profile`: 用户资料
- `user/enrollments`: 课程注册列表
- `user/payment-methods`: 支付方式（预留）

---

## 4. 数据模型

### 4.1 用户相关表

#### 4.1.1 users
```sql
- id: UUID (PK)
- name: TEXT
- email: TEXT (UNIQUE)
- password_hash: TEXT
- email_verified: BOOLEAN
- email_verification_token: TEXT
- email_verification_expires: TIMESTAMP
- role: ENUM('user', 'coach', 'admin')
- image: TEXT (头像 URL)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### 4.1.2 password_reset_tokens
```sql
- id: UUID (PK)
- user_id: UUID (FK -> users.id)
- token: TEXT
- expires_at: TIMESTAMP
- used: BOOLEAN
- created_at: TIMESTAMP
```

### 4.2 团队相关表

#### 4.2.1 teams
```sql
- id: UUID (PK)
- name: TEXT
- role: TEXT
- description: TEXT
- avatar_url: TEXT (Vercel Blob URL)
- display_order: INTEGER
- is_active: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### 4.2.2 team_social_networks
```sql
- id: UUID (PK)
- team_id: UUID (FK -> teams.id)
- platform: TEXT
- url: TEXT
- created_at: TIMESTAMP
```

### 4.3 课程相关表

#### 4.3.1 course_categories
```sql
- id: UUID (PK)
- name: TEXT (UNIQUE)
- display_name: TEXT
- description: TEXT
- display_order: INTEGER
- is_active: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### 4.3.2 course_series
```sql
- id: UUID (PK)
- category_id: UUID (FK -> course_categories.id)
- name: TEXT
- display_name: TEXT
- description: TEXT
- start_date: DATE
- end_date: DATE
- display_order: INTEGER
- is_active: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- UNIQUE(category_id, name)
```

#### 4.3.3 course_subcategories
```sql
- id: UUID (PK)
- name: TEXT
- display_name: TEXT
- description: TEXT
- display_order: INTEGER
- is_active: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### 4.3.4 courses
```sql
- id: UUID (PK)
- name: TEXT
- slug: TEXT (UNIQUE)
- description: TEXT
- target_audience: TEXT
- learning_outcomes: TEXT
- prerequisites: TEXT
- cancellation_policy: TEXT
- base_price: DECIMAL(10,2)
- currency: TEXT
- duration_hours: INTEGER
- session_count: INTEGER
- age_min: INTEGER
- age_max: INTEGER
- grade_level: TEXT
- is_active: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### 4.3.5 course_subcategory_tags
```sql
- id: UUID (PK)
- course_id: UUID (FK -> courses.id)
- subcategory_id: UUID (FK -> course_subcategories.id)
- created_at: TIMESTAMP
- UNIQUE(course_id, subcategory_id)
```

#### 4.3.6 course_locations
```sql
- id: UUID (PK)
- name: TEXT
- address: TEXT
- city: TEXT
- state: TEXT
- zip_code: TEXT
- phone: TEXT
- email: TEXT
- is_active: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### 4.3.7 course_assignments
```sql
- id: UUID (PK)
- course_id: UUID (FK -> courses.id)
- category_id: UUID (FK -> course_categories.id)
- series_id: UUID (FK -> course_series.id)
- location_id: UUID (FK -> course_locations.id, NULLABLE)
- display_order: INTEGER
- is_active: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- UNIQUE(course_id, category_id, series_id, location_id)
```

#### 4.3.8 course_instances
```sql
- id: UUID (PK)
- assignment_id: UUID (FK -> course_assignments.id)
- location_id: UUID (FK -> course_locations.id, NULLABLE)
- start_date: DATE
- end_date: DATE
- start_time: TIME
- end_time: TIME
- icalendar_rrule: TEXT (RRULE 字符串)
- icalendar_exdates: TEXT[] (排除日期)
- icalendar_rdates: TEXT[] (额外日期)
- timezone: TEXT
- price_override: DECIMAL(10,2)
- max_students: INTEGER
- current_students: INTEGER
- instructor_name: TEXT (向后兼容)
- instructor_id: UUID (向后兼容)
- status: ENUM('scheduled', 'ongoing', 'completed', 'cancelled')
- notes: TEXT
- is_active: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### 4.3.9 course_instance_coaches
```sql
- id: UUID (PK)
- instance_id: UUID (FK -> course_instances.id)
- coach_id: UUID (FK -> users.id)
- created_at: TIMESTAMP
- UNIQUE(instance_id, coach_id)
```

### 4.4 注册相关表

#### 4.4.1 course_enrollments
```sql
- id: UUID (PK)
- user_id: UUID (FK -> users.id)
- instance_id: UUID (FK -> course_instances.id)
- status: ENUM('cart', 'reserved', 'enrolled', 'waitlisted', 'cancelled', 'expired', 'completed')
- added_to_cart_at: TIMESTAMP
- cart_expires_at: TIMESTAMP
- reserved_at: TIMESTAMP
- reserved_expires_at: TIMESTAMP
- enrolled_at: TIMESTAMP
- waitlisted_at: TIMESTAMP
- waitlist_position: INTEGER
- waitlist_notified_at: TIMESTAMP
- waitlist_expires_at: TIMESTAMP
- cancelled_at: TIMESTAMP
- cancelled_reason: TEXT
- payment_status: ENUM('unpaid', 'pending', 'paid', 'refunded', 'failed')
- payment_method_id: UUID
- amount_paid: DECIMAL(10,2)
- currency: TEXT
- payment_transaction_id: TEXT
- notes: TEXT
- metadata: JSONB
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### 4.4.2 enrollment_status_history
```sql
- id: UUID (PK)
- enrollment_id: UUID (FK -> course_enrollments.id)
- from_status: TEXT
- to_status: TEXT
- changed_by: UUID (FK -> users.id)
- change_reason: TEXT
- metadata: JSONB
- created_at: TIMESTAMP
```

#### 4.4.3 waitlist_notifications
```sql
- id: UUID (PK)
- enrollment_id: UUID (FK -> course_enrollments.id)
- notification_type: ENUM('spot_available', 'expiring_soon', 'expired')
- notification_method: ENUM('email', 'sms', 'in_app')
- sent_at: TIMESTAMP
- read_at: TIMESTAMP
- metadata: JSONB
```

#### 4.4.4 enrollment_config
```sql
- id: UUID (PK)
- config_key: TEXT (UNIQUE)
- config_value: TEXT
- description: TEXT
- updated_at: TIMESTAMP
```

### 4.5 关系图

```
users
  ├── course_enrollments (一对多)
  │   ├── course_instances
  │   ├── enrollment_status_history (一对多)
  │   └── waitlist_notifications (一对多)
  ├── course_instance_coaches (多对多)
  │   └── course_instances
  │       └── course_assignments
  │           ├── courses
  │           │   └── course_subcategory_tags (多对多)
  │           │       └── course_subcategories
  │           ├── course_categories
  │           ├── course_series
  │           └── course_locations
  └── teams
      └── team_social_networks
```

---

## 5. 安全架构

### 5.1 认证与授权

#### 5.1.1 NextAuth.js 配置
- **Secret**: AUTH_SECRET（环境变量）
- **Providers**: Credentials, Google OAuth
- **Session Strategy**: JWT
- **Callbacks**: 
  - `signIn`: 处理 Google 用户创建/更新
  - `jwt`: 将 role 添加到 token
  - `session`: 将 role 添加到 session

#### 5.1.2 路由保护
- **Middleware**: `authorized` 回调函数
- **Admin Routes**: `/admin/*` 需要 admin 角色
- **Coach Routes**: `/coach/*` 需要 coach 或 admin 角色
- **Protected Routes**: `/profile` 需要登录

#### 5.1.3 API 保护
- 所有 API 路由验证 session
- 角色验证（admin, coach）
- 数据所有权验证（coach 只能访问自己的课程）

### 5.2 数据安全

#### 5.2.1 Row Level Security (RLS)
- Supabase RLS 策略
- 管理员操作使用 `supabaseAdmin`（服务角色）
- 用户操作使用普通客户端（受 RLS 保护）

#### 5.2.2 密码安全
- 使用 bcryptjs 加密
- 密码重置令牌过期机制
- 邮箱验证令牌过期机制

#### 5.2.3 输入验证
- TypeScript 类型检查
- API 路由参数验证
- SQL 注入防护（使用 Supabase 参数化查询）

### 5.3 文件上传安全
- Vercel Blob Storage
- 文件类型验证
- 文件大小限制
- URL 签名验证

---

## 6. 部署架构

### 6.1 部署平台
- **主平台**: Vercel
- **数据库**: Supabase (PostgreSQL)
- **文件存储**: Vercel Blob Storage
- **邮件服务**: SMTP (通过 Nodemailer)

### 6.2 环境变量
```env
# NextAuth
AUTH_SECRET=
NEXTAUTH_URL=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# SMTP
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=

# Vercel Blob
BLOB_READ_WRITE_TOKEN=

# Cron Jobs (可选)
CRON_SECRET=
```

### 6.3 构建配置
- Next.js 16 App Router
- TypeScript 严格模式
- ESLint 代码检查
- 自动部署（Git 推送触发）

### 6.4 后台任务配置
- **Vercel Cron Jobs**: 通过 `vercel.json` 配置
- **任务频率**: 每 5 分钟执行一次过期注册处理
- **任务路径**: `/api/cron/process-expired-enrollments`
- **安全**: 支持 `CRON_SECRET` 环境变量保护

---

## 7. 开发规范

### 7.1 代码组织
- **组件**: 按功能模块组织
- **API 路由**: RESTful 风格
- **类型定义**: 集中在 `lib/db.ts` 和 `types/`
- **工具函数**: 集中在 `lib/`

### 7.2 命名规范
- **组件**: PascalCase (e.g., `CourseDetail.tsx`)
- **文件**: kebab-case (e.g., `course-detail.tsx`) 或 PascalCase
- **函数**: camelCase (e.g., `getCourseWithDetails`)
- **常量**: UPPER_SNAKE_CASE
- **类型/接口**: PascalCase (e.g., `CourseWithDetails`)

### 7.3 UI 组件规范
- 使用 shadcn/ui 组件库
- 响应式设计（移动端优先）
- 统一的容器宽度：`container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl`
- 自定义滚动条（3px 宽度）

### 7.4 API 设计规范
- RESTful 风格
- 统一错误响应格式
- 使用 NextResponse
- 适当的 HTTP 状态码

### 7.5 数据库操作规范
- 使用 `supabaseAdmin` 进行管理员操作
- 使用类型安全的接口
- 错误处理和日志记录
- 事务处理（如需要）

---

## 8. 关键特性

### 8.1 响应式设计
- 移动端优先
- 断点：sm (640px), md (768px), lg (1024px)
- 移动端使用 Sheet 组件替代导航栏

### 8.2 主题支持
- 使用 next-themes
- 支持明暗主题切换
- CSS 变量系统

### 8.3 性能优化
- Next.js App Router（服务端组件）
- 图片优化（next/image）
- 代码分割
- 懒加载

### 8.4 可访问性
- Radix UI（ARIA 支持）
- 键盘导航
- 屏幕阅读器支持
- 语义化 HTML

---

## 9. 扩展功能（预留）

### 9.1 学生注册系统 ✅
- ✅ 课程注册表（`course_enrollments`）
- ✅ 注册流程（Cart → Reserved → Enrolled）
- ✅ 等待列表机制
- ✅ 容量管理
- ✅ 过期处理
- ⏳ 支付集成（待实现）

### 9.2 支付系统
- 支付方式管理
- 账单生成
- 支付历史

### 9.3 通知系统
- 邮件通知
- 课程提醒
- 系统通知

### 9.4 报告系统
- 课程报告
- 学生出勤报告
- 收入报告

---

## 10. 技术决策

### 10.1 为什么选择 Next.js App Router？
- 服务端组件提升性能
- 更好的 SEO 支持
- 简化的数据获取
- 内置 API 路由

### 10.2 为什么选择 Supabase？
- PostgreSQL 的强大功能
- 实时功能支持
- Row Level Security
- 易于扩展

### 10.3 为什么选择 NextAuth.js？
- 多种认证方式支持
- 易于集成
- 安全性高
- 活跃的社区

### 10.4 为什么选择 iCalendar？
- 标准格式（RFC5545）
- 支持复杂重复规则
- 支持例外日期
- 广泛兼容

---

## 11. 项目状态

### 11.1 已完成功能
✅ 用户认证系统（邮箱/密码 + Google OAuth）
✅ 用户资料管理
✅ 课程注册系统（注册清单、等待列表、容量管理、过期处理）
✅ 管理员门户（用户、团队、课程管理）
✅ 教练门户（课程查看、日历）
✅ 课程管理系统（灵活架构）
✅ iCalendar 支持
✅ 公开网站（课程展示、团队展示）
✅ 响应式设计
✅ 主题支持
✅ 后台任务（过期注册处理）

### 11.2 进行中功能
🔄 支付集成（结账流程已实现，等待支付网关集成）

### 11.3 待实现功能
⏳ 支付系统（Stripe 或其他支付网关）
⏳ 通知系统（邮件、in-app、SMS）
⏳ 报告系统

---

## 12. 维护与支持

### 12.1 日志记录
- 服务器端错误日志
- API 请求日志
- 认证事件日志

### 12.2 错误处理
- 统一错误响应格式
- 用户友好的错误消息
- 错误边界（Error Boundaries）

### 12.3 测试策略
- 单元测试（待实现）
- 集成测试（待实现）
- E2E 测试（待实现）

---

## 13. 文档

### 13.1 现有文档
- `README.md`: 项目说明
- `AUTH_SETUP.md`: 认证设置指南
- `ADMIN_SETUP.md`: 管理员设置指南
- `COURSE_ARCHITECTURE_DESIGN.md`: 课程架构设计
- `COACH_PORTAL_DESIGN.md`: 教练门户设计
- `ICALENDAR_IMPLEMENTATION_PLAN.md`: iCalendar 实现计划
- `VERCEL_BLOB_SETUP.md`: Vercel Blob 设置指南
- `COURSE_ENROLLMENT_DESIGN.md`: 课程注册系统设计方案
- `ENROLLMENT_IMPLEMENTATION_STATUS.md`: 注册系统实施状态
- `CRON_SETUP.md`: 后台任务配置说明

### 13.2 API 文档
- API 路由文档（待完善）
- 数据模型文档（待完善）

---

## 14. 版本信息

- **当前版本**: 0.1.0
- **Next.js**: 16.0.7
- **React**: 19.2.1
- **TypeScript**: 5.x
- **最后更新**: 2025-01

---

## 15. 联系与支持

- **项目名称**: Blaze Robotics Academy
- **技术栈**: Next.js + Supabase + TypeScript
- **部署**: Vercel

---

*本文档会随着项目发展持续更新。*

