# PRD-09: 用户门户

**版本**: 1.0  
**日期**: 2025-12  
**状态**: 已实施（部分功能）

---

## 1. 概述

### 1.1 文档目的

本文档描述 Blaze Robotics Academy 用户门户的功能需求，包括个人资料管理、课程管理、学习进度跟踪、支付方式管理和订单历史等核心功能。

### 1.2 核心价值

- **一站式管理**：用户可以在一个地方管理所有个人信息、课程和支付方式
- **学习进度可视化**：清晰展示学习进度和统计数据
- **便捷的支付管理**：支持多种支付方式，方便管理
- **订单历史追踪**：完整记录所有订单和支付历史

### 1.3 系统组成

用户门户由以下核心模块组成：
1. **个人资料管理**：基本信息、头像、联系方式
2. **我的课程**：已报名、进行中、已完成的课程
3. **学习进度与统计**：学习分析、进度跟踪
4. **支付方式管理**：添加、编辑、删除支付方式
5. **订单历史**：查看所有订单和支付记录

---

## 2. 用户角色与场景

### 2.1 用户角色

| 角色 | 描述 | 访问权限 |
|------|------|---------|
| **注册用户** | 已注册的学生/家长 | 完整访问用户门户所有功能 |
| **未登录用户** | 访客 | 无法访问，重定向到登录页 |

### 2.2 核心使用场景

#### 场景 1: 查看个人资料
1. 用户登录后访问 `/profile`
2. 查看个人基本信息（姓名、邮箱、注册时间）
3. 编辑个人信息（姓名、头像）
4. 查看邮箱验证状态

#### 场景 2: 管理我的课程
1. 用户访问 `/profile` → "My Courses" 标签页
2. 查看所有已报名的课程（按状态分组）
3. 查看课程详情（时间、地点、状态）
4. 查看已完成课程的学习记录

#### 场景 3: 查看学习统计
1. 用户访问 `/profile` → "Analytics" 标签页
2. 查看学习统计（完成课程数、进行中课程数）
3. 查看学习路径进度
4. 查看推荐课程

#### 场景 4: 管理支付方式
1. 用户访问 `/profile` → "Payment Methods" 标签页
2. 查看已保存的支付方式
3. 添加新的支付方式（使用 Stripe Elements）
4. 设置默认支付方式
5. 删除不需要的支付方式

#### 场景 5: 查看订单历史
1. 用户访问 `/profile` → "Orders" 标签页
2. 查看所有历史订单
3. 查看订单详情（课程、金额、支付状态）
4. 下载订单收据

---

## 3. 功能需求

### 3.1 个人资料管理

#### 3.1.1 基本信息展示
- **位置**：`/profile` → "Profile" 标签页
- **显示内容**：
  - 用户头像（Avatar）
  - 姓名（Name）
  - 邮箱（Email）
  - 邮箱验证状态（Verified/Unverified）
  - 注册时间（Created At）
  - 最后登录时间（Last Login）
- **交互**：
  - 点击头像可以上传新头像
  - 点击编辑按钮可以修改姓名
  - 邮箱验证状态显示 Badge（绿色=已验证，红色=未验证）

#### 3.1.2 编辑个人信息
- **功能**：
  - 编辑姓名（Name）
  - 上传/更换头像（Avatar）
  - 头像支持预览和裁剪
- **验证**：
  - 姓名不能为空
  - 头像文件大小限制（如 5MB）
  - 头像格式限制（JPG, PNG, GIF）
- **保存**：
  - 实时保存（自动保存或手动保存）
  - 保存成功后显示成功提示
  - 保存失败显示错误提示

#### 3.1.3 邮箱验证
- **功能**：
  - 显示邮箱验证状态
  - 未验证时显示"Resend Verification Email"按钮
  - 点击后发送验证邮件
  - 显示验证邮件发送成功提示

### 3.2 我的课程（My Courses）

#### 3.2.1 课程列表展示
- **位置**：`/profile` → "My Courses" 标签页
- **显示内容**：
  - 课程名称
  - 课程分类和系列
  - 上课地点
  - 上课时间（日期、时间）
  - 课程状态（Enrolled, Completed, Cancelled）
  - 支付状态（Paid, Pending, Refunded）
- **分组**：
  - 按状态分组：进行中、已完成、已取消
  - 按时间排序：最近的在前面

#### 3.2.2 课程状态
- **Enrolled（已报名）**：
  - 显示课程开始日期
  - 显示上课地点和时间
  - 显示课程进度（如果支持）
  - 提供"View Details"链接
- **Completed（已完成）**：
  - 显示完成日期
  - 显示课程成绩（如果有）
  - 显示证书链接（如果有）
  - 提供"View Certificate"链接
- **Cancelled（已取消）**：
  - 显示取消日期
  - 显示取消原因
  - 显示退款状态（如果有）

#### 3.2.3 课程详情查看
- **功能**：
  - 点击课程卡片查看详情
  - 显示完整课程信息
  - 显示课程进度（如果支持）
  - 显示学习记录（出勤、作业等）

#### 3.2.4 等待列表（Waitlist）
- **功能**：
  - 显示等待列表中的课程
  - 显示等待位置（Position）
  - 显示预计可用时间（如果有）
  - 提供"Remove from Waitlist"选项

### 3.3 学习进度与统计（Analytics）

#### 3.3.1 统计摘要
- **显示内容**：
  - 总完成课程数（Total Completed Courses）
  - 当前进行中的课程数（Ongoing Courses）
  - 总注册课程数（Total Enrollments）
  - 完成的学习路径数（Completed Learning Paths）
  - 最近30天活动数（Recent Activity）

#### 3.3.2 学习趋势
- **图表展示**：
  - 按月完成情况图表（柱状图）
  - 学习强度趋势（折线图）
  - 平均完成时间（统计）
- **时间范围**：
  - 最近30天
  - 最近3个月
  - 最近1年
  - 全部时间

#### 3.3.3 类别分析
- **显示内容**：
  - 最常学习的课程类别（Top Categories）
  - 各类别完成数量（Category Distribution）
  - 类别分布图表（饼图或柱状图）

#### 3.3.4 学习路径进度
- **显示内容**：
  - 所有学习路径的进度
  - 每个路径的完成百分比
  - 已完成/总课程数
  - 路径完成时间
  - 下一个推荐课程

#### 3.3.5 推荐课程
- **功能**：
  - 基于学习历史推荐
  - 基于先修条件推荐
  - 显示推荐理由
  - 提供快速报名链接

### 3.4 支付方式管理（Payment Methods）

#### 3.4.1 支付方式列表
- **位置**：`/profile` → "Payment Methods" 标签页
- **显示内容**：
  - 支付方式类型（Card, PayPal, Bank）
  - 卡号后4位（Last 4）
  - 卡片品牌（Visa, Mastercard, Amex等）
  - 过期日期（Expiry Date）
  - 默认支付方式标记（Default Badge）
  - 创建时间

#### 3.4.2 添加支付方式
- **功能**：
  - 点击"Add Payment Method"按钮
  - 打开 Stripe Elements 对话框
  - 使用 PaymentElement 输入支付信息
  - 创建 Setup Intent
  - 保存支付方式到 Stripe Customer
- **验证**：
  - 支付信息验证（由 Stripe 处理）
  - 错误提示（用户友好）
- **成功**：
  - 保存成功后刷新列表
  - 显示成功提示

#### 3.4.3 设置默认支付方式
- **功能**：
  - 点击"Set as Default"按钮
  - 更新 Stripe Customer 的 default_payment_method
  - 更新 UI 显示
- **限制**：
  - 只能有一个默认支付方式
  - 设置新的默认后，旧的自动取消

#### 3.4.4 删除支付方式
- **功能**：
  - 点击"Delete"按钮
  - 确认对话框（防止误删）
  - 从 Stripe Customer 中删除
  - 如果删除的是默认支付方式，需要选择新的默认
- **限制**：
  - 不能删除唯一的支付方式（如果有订单依赖）
  - 删除前检查是否有未完成的订单

### 3.5 订单历史（Orders）

#### 3.5.1 订单列表
- **位置**：`/profile` → "Orders" 标签页
- **显示内容**：
  - 订单号（Order ID）
  - 订单日期（Order Date）
  - 订单金额（Total Amount）
  - 支付状态（Paid, Pending, Failed, Refunded）
  - 包含的课程数量
  - 操作按钮（View Details, Download Receipt）

#### 3.5.2 订单详情
- **显示内容**：
  - 订单基本信息（订单号、日期、金额）
  - 订单包含的课程列表
  - 每个课程的详细信息（名称、价格、时间）
  - 支付信息（支付方式、交易ID）
  - 订单状态历史

#### 3.5.3 订单收据
- **功能**：
  - 下载订单收据（PDF）
  - 打印订单收据
  - 邮件发送收据（可选）

#### 3.5.4 订单筛选和搜索
- **功能**：
  - 按日期范围筛选
  - 按支付状态筛选
  - 按课程名称搜索
  - 按订单号搜索

---

## 4. 数据模型

### 4.1 核心数据表

#### 4.1.1 users（用户表）
- `id`: 用户 ID
- `name`: 姓名
- `email`: 邮箱
- `email_verified`: 邮箱验证状态
- `image`: 头像 URL
- `stripe_customer_id`: Stripe 客户 ID
- `created_at`: 创建时间
- `updated_at`: 更新时间

#### 4.1.2 course_enrollments（课程报名表）
- `id`: 报名 ID
- `user_id`: 用户 ID
- `instance_id`: 课程实例 ID
- `status`: 状态（cart, reserved, enrolled, waitlisted, cancelled, expired, completed）
- `enrolled_at`: 报名时间
- `waitlist_position`: 等待列表位置
- `stripe_session_id`: Stripe Session ID
- `stripe_payment_intent_id`: Stripe Payment Intent ID
- `created_at`: 创建时间
- `updated_at`: 更新时间

#### 4.1.3 user_course_completions（用户课程完成记录表）
- `id`: 完成记录 ID
- `user_id`: 用户 ID
- `course_id`: 课程 ID
- `instance_id`: 课程实例 ID
- `completion_date`: 完成日期
- `grade`: 成绩
- `certificate_url`: 证书 URL
- `created_at`: 创建时间

#### 4.1.4 user_learning_path_progress（用户学习路径进度表）
- `id`: 进度 ID
- `user_id`: 用户 ID
- `path_id`: 学习路径 ID
- `current_stage`: 当前阶段
- `completed_courses_count`: 已完成课程数
- `total_courses_count`: 总课程数
- `is_completed`: 是否已完成
- `started_at`: 开始时间
- `completed_at`: 完成时间

---

## 5. API 设计

### 5.1 用户资料 API

#### 5.1.1 获取用户资料
```
GET /api/user/profile

Response:
{
  "id": string,
  "name": string,
  "email": string,
  "email_verified": boolean,
  "image": string | null,
  "created_at": string,
  "updated_at": string
}
```

#### 5.1.2 更新用户资料
```
PATCH /api/user/profile

Request:
{
  "name"?: string,
  "image"?: string
}

Response:
{
  "success": boolean,
  "user": UserProfile
}
```

### 5.2 我的课程 API

#### 5.2.1 获取用户课程列表
```
GET /api/user/enrollments

Query Parameters:
- status?: string (enrolled, completed, cancelled, waitlisted)
- limit?: number
- offset?: number

Response:
{
  "enrollments": Enrollment[],
  "total": number
}
```

#### 5.2.2 获取课程详情
```
GET /api/user/enrollments/[id]

Response:
{
  "enrollment": Enrollment,
  "instance": CourseInstance,
  "course": Course
}
```

### 5.3 学习统计 API

#### 5.3.1 获取学习统计
```
GET /api/user/analytics

Response:
{
  "summary": {
    "totalCompleted": number,
    "ongoing": number,
    "totalEnrollments": number,
    "completedPaths": number,
    "recentActivity": number
  },
  "trends": {
    "monthlyCompletions": Array<{ month: string, count: number }>,
    "learningIntensity": Array<{ date: string, activity: number }>
  },
  "categories": Array<{ name: string, count: number }>,
  "paths": LearningPathProgress[]
}
```

#### 5.3.2 获取推荐课程
```
GET /api/user/courses/recommended

Response:
{
  "recommendedCourses": Course[],
  "basedOn": {
    "completedCourses": Course[],
    "path": LearningPath | null
  }
}
```

### 5.4 支付方式 API

#### 5.4.1 获取支付方式列表
```
GET /api/user/payment-methods

Response:
{
  "paymentMethods": PaymentMethod[]
}
```

#### 5.4.2 添加支付方式
```
POST /api/user/payment-methods

Request:
{
  "setup_intent_id": string
}

Response:
{
  "success": boolean,
  "paymentMethod": PaymentMethod
}
```

#### 5.4.3 设置默认支付方式
```
PATCH /api/user/payment-methods/[id]

Request:
{
  "is_default": boolean
}

Response:
{
  "success": boolean
}
```

#### 5.4.4 删除支付方式
```
DELETE /api/user/payment-methods/[id]

Response:
{
  "success": boolean
}
```

### 5.5 订单历史 API

#### 5.5.1 获取订单列表
```
GET /api/user/orders

Query Parameters:
- status?: string
- start_date?: string
- end_date?: string
- limit?: number
- offset?: number

Response:
{
  "orders": Order[],
  "total": number
}
```

#### 5.5.2 获取订单详情
```
GET /api/user/orders/[id]

Response:
{
  "order": Order,
  "enrollments": Enrollment[],
  "payment": PaymentInfo
}
```

---

## 6. UI/UX 设计

### 6.1 页面布局

#### 6.1.1 整体布局
- **导航栏**：顶部导航栏，包含 Logo、菜单、用户头像
- **侧边栏**（可选）：快速导航菜单
- **主内容区**：使用 Tabs 组件组织不同功能模块
- **页脚**：版权信息和链接

#### 6.1.2 Tabs 组织
- **Profile**：个人资料
- **My Courses**：我的课程
- **Analytics**：学习统计
- **Payment Methods**：支付方式
- **Orders**：订单历史

### 6.2 组件设计

#### 6.2.1 个人资料卡片
- 使用 Card 组件
- 头像使用 Avatar 组件
- 信息使用 Label + Value 布局
- 编辑按钮使用 IconButton

#### 6.2.2 课程列表
- 使用 Card 或 Table 组件
- 支持筛选和排序
- 状态使用 Badge 显示
- 提供快速操作按钮

#### 6.2.3 统计图表
- 使用 Recharts 或类似库
- 响应式设计
- 支持时间范围选择
- 清晰的图例和标签

#### 6.2.4 支付方式卡片
- 使用 Card 组件
- 显示卡片品牌图标
- 显示卡号后4位和过期日期
- 操作按钮（Set Default, Delete）

---

## 7. 业务规则

### 7.1 个人资料规则
- 姓名不能为空
- 邮箱不能修改（由系统管理）
- 头像文件大小限制：5MB
- 头像格式限制：JPG, PNG, GIF

### 7.2 课程管理规则
- 只能查看自己的课程
- 已完成的课程不能取消
- 等待列表中的课程可以移除

### 7.3 支付方式规则
- 每个用户可以有多个支付方式
- 只能有一个默认支付方式
- 不能删除唯一的支付方式（如果有订单依赖）
- 删除默认支付方式时，需要选择新的默认

### 7.4 订单规则
- 只能查看自己的订单
- 订单一旦创建不能修改
- 订单状态由系统自动更新

---

## 8. 非功能需求

### 8.1 性能要求
- 页面加载时间 < 2 秒
- 列表加载时间 < 1 秒
- 图表渲染时间 < 1 秒
- API 响应时间 < 500ms

### 8.2 安全要求
- 所有 API 需要身份验证
- 用户只能访问自己的数据
- 支付信息加密传输
- 敏感操作需要确认

### 8.3 可用性要求
- 响应式设计，支持移动端
- 无障碍设计（WCAG 2.1 AA）
- 清晰的错误提示
- 友好的加载状态

---

## 9. 验收标准

### 9.1 功能验收
- ✅ 可以查看和编辑个人资料
- ✅ 可以查看所有已报名的课程
- ✅ 可以查看学习统计和进度
- ✅ 可以管理支付方式
- ✅ 可以查看订单历史

### 9.2 数据完整性
- ✅ 用户只能访问自己的数据
- ✅ 数据更新实时同步
- ✅ 支付信息正确关联

---

## 10. 实施状态

### 10.1 已完成功能（✅）
- ✅ 个人资料管理（基本功能）
- ✅ 我的课程列表（基本功能）
- ✅ 支付方式管理（完整功能）
- ✅ 订单历史（基本功能）

### 10.2 部分完成功能（⚠️）
- ⚠️ 学习统计（基础统计已实现，高级分析待完善）
- ⚠️ 学习路径进度（部分实现）

### 10.3 计划功能（⏳）
- ⏳ 头像上传和裁剪
- ⏳ 课程进度详细跟踪
- ⏳ 证书生成和下载
- ⏳ 订单收据 PDF 生成

---

## 11. 未来扩展

### 11.1 短期（1-3 个月）
- ⏳ 学习目标设置和跟踪
- ⏳ 学习提醒和通知
- ⏳ 社交分享功能

### 11.2 中期（3-6 个月）
- ⏳ 学习小组功能
- ⏳ 讨论区和问答
- ⏳ 成就和徽章系统

### 11.3 长期（6-12 个月）
- ⏳ AI 驱动的个性化学习建议
- ⏳ 学习分析和洞察
- ⏳ 多语言支持

---

## 12. 附录

### 12.1 相关文档
- `PRD-07-用户注册与报名系统.md`：报名系统 PRD
- `PRD-08-支付系统.md`：支付系统 PRD
- `PRD-06-学习路径系统.md`：学习路径系统 PRD

### 12.2 术语表
- **Enrollment（报名）**：用户报名课程实例的记录
- **Payment Method（支付方式）**：用户保存的支付信息
- **Order（订单）**：一次支付交易，可能包含多个课程报名
- **Learning Path（学习路径）**：一系列按顺序组织的课程

