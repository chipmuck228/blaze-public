# PRD-05: 课程管理系统

**版本**: 1.0  
**日期**: 2025-12  
**状态**: 已实施

---

## 1. 概述

### 1.1 文档目的

本文档描述 Blaze Robotics Academy 课程管理系统的功能需求，包括灵活的课程架构、课程状态管理、分类体系、先修条件、实例管理和 iCalendar 支持等核心功能。

### 1.2 核心价值

- **灵活性**：支持课程在不同分类、系列和地点中的灵活分配
- **可扩展性**：易于添加新的分类、系列和课程
- **完整性**：支持课程从创建到归档的完整生命周期
- **实用性**：支持复杂的课程安排和日历管理

---

## 2. 课程架构设计

### 2.1 架构概览

课程系统采用 **五层架构**：

```
Course（课程）
  ↓
Course Assignment（课程分配）
  ├── Category（大类）
  ├── Series（系列）
  └── Location（地点，可选）
      ↓
Course Instance（课程实例）
  ├── 时间信息
  ├── 地点信息
  ├── 教练信息
  └── 容量信息
```

### 2.2 核心概念

#### 2.2.1 Course（课程）
- **定义**：课程的核心内容，独立于分类和地点
- **特点**：
  - 包含课程名称、描述、学习目标等基本信息
  - 包含价格、适龄范围、先修条件等属性
  - 不绑定任何分类或地点
  - 可以在多个地方使用（通过 Assignment）

#### 2.2.2 Category（大类）
- **定义**：课程的第一级分类
- **示例**：`Courses`、`Camp`、`Workshop`
- **特点**：
  - 完全独立，可以独立管理
  - 不依赖其他表

#### 2.2.3 Series（系列）
- **定义**：课程的第二级分类，属于某个 Category
- **示例**：`Winter 2025`、`Spring 2025`
- **特点**：
  - 必须关联到一个 Category
  - 同一 Category 下 Series 名称唯一
  - 可以关联到 Franchise（通过 `franchise_id`）

#### 2.2.4 Subcategory（子类标签）
- **定义**：课程的标签系统，用于标记课程类型
- **示例**：`RoboQuests`、`LaunchPad`、`RoboChamps`
- **特点**：
  - 完全独立，作为标签使用
  - 一个课程可以有多个 Subcategory 标签
  - 多对多关系

#### 2.2.5 Assignment（课程分配）
- **定义**：将 Course 分配到特定的 Category + Series + Location 组合
- **特点**：
  - 实现 Course 到具体分类的分配
  - 一个 Course 可以分配到多个不同的组合
  - 必须指定 Category 和 Series
  - Location 可选

#### 2.2.6 Instance（课程实例）
- **定义**：课程的具体开课实例，包含时间、地点、教练等信息
- **特点**：
  - 关联到 Assignment（而不是直接关联 Course）
  - 包含具体的上课时间、地点、教练
  - 包含容量信息（最大学生数、当前学生数）
  - 支持 iCalendar 格式

---

## 3. 课程状态管理

### 3.1 状态定义

| 状态 | 标识 | 说明 | 可见性 | 可操作 |
|------|------|------|--------|--------|
| **草稿** | `draft` | 课程正在设计中 | ❌ 不对外显示 | ✅ 可编辑，❌ 不能创建 Assignment |
| **已发布** | `published` | 课程已完成，可以上架 | ✅ 对外显示 | ✅ 可编辑，✅ 可以创建 Assignment/Instance |
| **暂停** | `suspended` | 临时下架 | ❌ 不对外显示 | ✅ 可编辑，❌ 不能创建新 Assignment/Instance |
| **已归档** | `archived` | 永久下架，保留历史 | ❌ 不对外显示 | ❌ 通常不编辑，❌ 不能创建 Assignment/Instance |

### 3.2 状态转换规则

```
draft → published    ✅ 完成设计后发布
published → suspended ✅ 临时下架
suspended → published ✅ 恢复上架
published → archived  ✅ 永久下架
suspended → archived  ✅ 永久下架
draft → archived      ✅ 直接归档
archived → published  ❌ 不允许（已归档的课程不应恢复）
```

### 3.3 状态影响

#### 3.3.1 对 Assignment 的影响
- **draft**：❌ 不能创建 Assignment
- **published**：✅ 可以创建 Assignment
- **suspended**：❌ 不能创建新 Assignment（已有 Assignment 不受影响）
- **archived**：❌ 不能创建 Assignment

#### 3.3.2 对 Instance 的影响
- **draft**：❌ 不能创建 Instance
- **published**：✅ 可以创建 Instance
- **suspended**：❌ 不能创建新 Instance（已有 Instance 不受影响）
- **archived**：❌ 不能创建 Instance

#### 3.3.3 对公开显示的影响
- **draft**：❌ 不对外显示
- **published**：✅ 对外显示
- **suspended**：❌ 不对外显示
- **archived**：❌ 不对外显示

---

## 4. 课程管理功能

### 4.1 课程创建与编辑

#### 4.1.1 创建课程
- **入口**：管理员门户 → Courses → Add Course
- **必填字段**：
  - 课程名称（name）
  - Slug（自动生成或手动输入）
- **可选字段**：
  - 描述（description）
  - 目标受众（target_audience）
  - 学习目标（outcomes）
  - 先修条件（prerequisites，文本）
  - 取消政策（cancellation_policy）
  - 课程次数（number_of_sessions）
  - 适龄范围（target_age_min, target_age_max）
  - 年级范围（target_grades）
  - 基础价格（base_price）
  - 货币（currency）
  - 课程海报（poster_url）
- **默认状态**：`draft`
- **操作**：保存后可以继续编辑

#### 4.1.2 编辑课程
- **入口**：管理员门户 → Courses → Edit
- **限制**：
  - `archived` 状态的课程通常不编辑（保留历史）
  - 状态变更需要确认（特别是从 `published` 改为 `suspended` 或 `archived`）
- **状态变更检查**：
  - 检查是否有活跃的 Instance
  - 检查是否有活跃的 Enrollment
  - 显示警告信息

#### 4.1.3 删除课程
- **限制**：只有 `draft` 状态的课程可以删除
- **原因**：其他状态的课程可能有历史数据，应归档而非删除

### 4.2 课程分类管理

#### 4.2.1 Category（大类）管理
- **功能**：
  - 创建、编辑、删除 Category
  - 设置显示顺序（display_order）
  - 激活/停用
- **特点**：
  - 完全独立，不依赖其他表
  - 可以独立管理

#### 4.2.2 Series（系列）管理
- **功能**：
  - 创建、编辑、删除 Series
  - 必须选择所属 Category
  - 可以关联 Franchise（通过 `franchise_id`）
  - 设置开始/结束日期
  - 设置显示顺序
- **特点**：
  - 必须关联到一个 Category
  - 同一 Category 下 Series 名称唯一

#### 4.2.3 Subcategory（子类标签）管理
- **功能**：
  - 创建、编辑、删除 Subcategory
  - 为课程添加/移除标签
  - 设置显示顺序
- **特点**：
  - 作为标签系统，多对多关系
  - 一个课程可以有多个标签

### 4.3 课程分配（Assignment）管理

#### 4.3.1 创建 Assignment
- **前提条件**：课程状态必须是 `published`
- **必填字段**：
  - Course（课程）
  - Category（大类）
  - Series（系列）
- **可选字段**：
  - Location（地点）
  - Display Order（显示顺序）
- **验证**：
  - 检查课程状态
  - 防止重复分配（UNIQUE 约束）

#### 4.3.2 管理 Assignment
- **功能**：
  - 查看所有 Assignment
  - 编辑 Assignment
  - 删除 Assignment
  - 按 Course、Category、Series 筛选

### 4.4 课程先修条件（Prerequisites）

#### 4.4.1 先修条件类型
- **Required（必需）**：必须完成才能报名
- **Recommended（推荐）**：建议完成，但不是必须
- **Optional（可选）**：可选完成

#### 4.4.2 先修条件管理
- **功能**：
  - 为课程添加先修课程
  - 设置先修条件类型
  - 移除先修条件
  - 支持先修条件组（Prerequisite Groups，未来）

#### 4.4.3 先修条件检查
- **报名时检查**：用户报名时自动检查是否满足先修条件
- **前端显示**：在课程详情页显示先修条件
- **错误提示**：如果不满足，显示缺失的先修课程

---

## 5. 课程实例（Instance）管理

### 5.1 实例创建

#### 5.1.1 创建单个实例
- **入口**：管理员门户 → Instances → Add Instance
- **必填字段**：
  - Assignment（课程分配）
  - Location（地点）
  - Start Date（开始日期）
  - End Date（结束日期）
- **可选字段**：
  - Start Time（开始时间）
  - End Time（结束时间）
  - Days of Week（星期几）
  - Max Students（最大学生数）
  - Price Override（价格覆盖）
  - Instructor（教练）
  - Notes（备注）

#### 5.1.2 批量创建实例
- **功能**：基于模板批量创建多个实例
- **支持**：
  - 重复规则（RRULE）
  - 例外日期（EXDATE）
  - 额外日期（RDATE）
- **入口**：管理员门户 → Instances → Batch Create

### 5.2 实例管理

#### 5.2.1 实例列表
- **功能**：
  - 查看所有实例
  - 按 Assignment、Location、日期筛选
  - 按状态筛选（scheduled/ongoing/completed/cancelled）
  - 搜索功能

#### 5.2.2 实例编辑
- **功能**：
  - 编辑实例信息
  - 更新时间、地点、教练
  - 更新容量
  - 更新价格

#### 5.2.3 实例状态
- **状态类型**：
  - `scheduled`：已安排
  - `ongoing`：进行中
  - `completed`：已完成
  - `cancelled`：已取消

### 5.3 实例日历视图

#### 5.3.1 日历展示
- **视图**：月视图、周视图、日视图
- **功能**：
  - 显示所有实例
  - 按 Location 筛选
  - 按 Assignment 筛选
  - 点击查看详情

#### 5.3.2 实例导出
- **格式**：iCalendar (.ics)
- **功能**：
  - 导出单个实例
  - 导出多个实例
  - 支持重复规则
  - 支持例外日期

---

## 6. iCalendar 支持

### 6.1 功能描述

#### 6.1.1 重复规则（RRULE）
- **支持**：RFC5545 标准
- **功能**：
  - 每周重复
  - 每月重复
  - 自定义重复规则
- **示例**：`FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20251231T235959Z`

#### 6.1.2 例外日期（EXDATE）
- **功能**：排除特定日期（如节假日）
- **格式**：日期数组，如 `['20250121', '20250218']`

#### 6.1.3 额外日期（RDATE）
- **功能**：添加额外的上课日期
- **格式**：日期时间数组

#### 6.1.4 时区支持
- **默认时区**：`America/Los_Angeles`
- **功能**：支持不同时区的实例

### 6.2 导出功能

#### 6.2.1 实例导出
- **格式**：.ics 文件
- **内容**：
  - 课程名称
  - 时间信息
  - 地点信息
  - 重复规则
  - 例外日期

#### 6.2.2 批量导出
- **功能**：导出多个实例到一个 .ics 文件
- **用途**：教练可以导入到个人日历

---

## 7. 课程查询与筛选

### 7.1 公开查询

#### 7.1.1 课程列表
- **过滤条件**：
  - 只返回 `published` 状态的课程
  - 按 Franchise 过滤
  - 按 Category 过滤
  - 按 Series 过滤
  - 按 Subcategory 过滤
  - 按年龄范围过滤
  - 按年级过滤
  - 搜索（名称、描述）

#### 7.1.2 课程详情
- **过滤条件**：
  - 只返回 `published` 状态的课程
  - 通过 Slug 或 ID 访问
  - 显示可用实例（只显示该 Franchise 的实例）

### 7.2 管理员查询

#### 7.2.1 课程列表
- **过滤条件**：
  - 显示所有状态的课程
  - 按状态筛选
  - 按 Category 筛选
  - 按 Series 筛选
  - 搜索功能

#### 7.2.2 实例列表
- **过滤条件**：
  - 显示所有状态的实例
  - 按 Assignment 筛选
  - 按 Location 筛选
  - 按日期范围筛选
  - 按状态筛选

---

## 8. 批量导入功能

### 8.1 课程批量导入

#### 8.1.1 功能描述
- **格式**：CSV 或 Excel
- **字段**：
  - 课程名称
  - 描述
  - 价格
  - 适龄范围
  - 其他课程字段
- **流程**：
  1. 上传文件
  2. 预览数据
  3. 验证数据
  4. 确认导入
  5. 显示导入结果

#### 8.1.2 模板下载
- **功能**：提供 CSV/Excel 模板
- **内容**：包含所有字段和示例数据

---

## 9. 用户故事

### 9.1 管理员故事

#### 故事 1：创建新课程
- **作为** 管理员
- **我希望** 创建新课程并设置基本信息
- **以便** 后续可以分配到不同的分类和系列

#### 故事 2：发布课程
- **作为** 管理员
- **我希望** 将草稿课程发布为已发布状态
- **以便** 课程可以对外显示和创建实例

#### 故事 3：管理课程分类
- **作为** 管理员
- **我希望** 创建和管理课程分类体系
- **以便** 更好地组织课程

#### 故事 4：创建课程实例
- **作为** 管理员
- **我希望** 为已发布的课程创建实例
- **以便** 学生可以报名

### 9.2 用户故事

#### 故事 1：浏览课程
- **作为** 潜在学生/家长
- **我希望** 浏览所有可用的课程
- **以便** 找到适合的课程

#### 故事 2：查看课程详情
- **作为** 潜在学生/家长
- **我希望** 查看课程的详细信息
- **以便** 了解课程内容和要求

---

## 10. 非功能需求

### 10.1 性能要求
- **课程列表加载**：< 2 秒
- **课程详情加载**：< 1 秒
- **实例查询**：< 1 秒

### 10.2 数据完整性
- **唯一性约束**：防止重复的 Assignment
- **外键约束**：确保数据关联正确
- **状态一致性**：确保状态转换符合规则

### 10.3 可扩展性
- **支持新增分类**：无需修改代码
- **支持新增系列**：无需修改代码
- **支持新增子类标签**：无需修改代码

---

## 11. 技术实现

### 11.1 数据模型

#### 11.1.1 核心表
- `courses`：课程表
- `course_categories`：大类表
- `course_series`：系列表
- `course_subcategories`：子类标签表
- `course_subcategory_tags`：课程-标签关联表
- `course_assignments`：课程分配表
- `course_instances`：课程实例表
- `course_prerequisites`：先修条件表

#### 11.1.2 关系
- Course ↔ Subcategory：多对多（通过 `course_subcategory_tags`）
- Course → Assignment：一对多
- Assignment → Category：多对一
- Assignment → Series：多对一
- Assignment → Location：多对一（可选）
- Assignment → Instance：一对多

### 11.2 API 端点

#### 11.2.1 公开 API
- `GET /api/courses`：获取课程列表
- `GET /api/courses/[id]`：获取课程详情
- `GET /api/courses/[id]/instances`：获取课程实例

#### 11.2.2 管理员 API
- `GET /api/admin/courses`：获取所有课程
- `POST /api/admin/courses`：创建课程
- `PUT /api/admin/courses/[id]`：更新课程
- `DELETE /api/admin/courses/[id]`：删除课程
- `GET /api/admin/courses/[id]/check-status-change`：检查状态变更影响
- `POST /api/admin/courses/upload`：批量导入课程
- `GET /api/admin/categories`：获取分类列表
- `POST /api/admin/categories`：创建分类
- `GET /api/admin/series`：获取系列列表
- `POST /api/admin/series`：创建系列
- `GET /api/admin/assignments`：获取分配列表
- `POST /api/admin/assignments`：创建分配
- `GET /api/admin/instances`：获取实例列表
- `POST /api/admin/instances`：创建实例
- `POST /api/admin/instances/batch`：批量创建实例

---

## 12. 验收标准

### 12.1 功能验收
- ✅ 可以创建、编辑、删除课程
- ✅ 可以管理课程分类体系
- ✅ 可以创建课程分配
- ✅ 可以创建课程实例
- ✅ 课程状态管理正确
- ✅ 先修条件检查正确
- ✅ iCalendar 导出功能正常

### 12.2 数据完整性
- ✅ 防止重复分配
- ✅ 状态转换符合规则
- ✅ 外键约束正确

---

## 13. 未来扩展

### 13.1 计划功能
- ⏳ 课程视频上传
- ⏳ 课程材料管理
- ⏳ 课程评价系统
- ⏳ 课程推荐算法
- ⏳ 高级先修条件组（AND/OR 逻辑）

---

## 14. 附录

### 14.1 相关文档
- `COURSE_ARCHITECTURE_DESIGN.md`：课程架构设计
- `COURSE_STATUS_DESIGN.md`：课程状态设计
- `ICALENDAR_IMPLEMENTATION_PLAN.md`：iCalendar 实施计划

### 14.2 数据库脚本
- `create-courses-tables.sql`：课程表创建脚本
- `migrate-course-status.sql`：课程状态迁移脚本

