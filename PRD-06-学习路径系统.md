# PRD-06: 学习路径系统

**版本**: 1.0  
**日期**: 2025-12  
**状态**: 已实施（部分功能）

---

## 1. 概述

### 1.1 文档目的

本文档描述 Blaze Robotics Academy 学习路径系统的功能需求，包括先修课程管理、学习路径定义、用户进度跟踪和智能推荐等核心功能。

### 1.2 核心价值

- **结构化学习**：通过先修课程和学习路径，为用户提供清晰的学习顺序
- **个性化推荐**：基于用户学习历史，智能推荐适合的课程和路径
- **进度可视化**：实时跟踪学习进度，帮助用户了解完成情况
- **灵活的先修逻辑**：支持简单的 AND 关系和复杂的 OR 关系（通过组）

### 1.3 系统组成

学习路径系统由以下核心组件组成：
1. **先修课程系统**：定义课程之间的依赖关系
2. **学习路径定义**：创建完整的学习序列
3. **用户进度跟踪**：记录和计算学习进度
4. **智能推荐系统**：推荐适合的课程和路径

---

## 2. 先修课程系统

### 2.1 先修课程概念

#### 2.1.1 定义
先修课程（Prerequisite）是指学习某门课程前需要完成的课程。系统支持三种先修课程类型：
- **Required（必需）**：必须完成才能报名
- **Recommended（推荐）**：建议完成，但不强制
- **Optional（可选）**：可选完成，仅供参考

#### 2.1.2 先修关系类型

**简单关系（AND）**：
- 所有先修课程都必须完成
- 示例：Course B 需要完成 Course A 和 Course C

**复杂关系（OR，通过组）**：
- 至少完成组内指定数量的课程
- 示例：Course D 需要完成 Course A 和 Course B，并且完成 Course C 或 Course E 中的任意一个

### 2.2 先修课程管理（管理员）

#### 2.2.1 添加先修课程
- **入口**：管理员门户 → Courses → Edit → Prerequisites 标签页
- **功能**：
  - 选择先修课程（从已发布的课程列表）
  - 设置要求类型（required/recommended/optional）
  - 设置是否强制（is_mandatory）
  - 设置显示顺序
  - 添加备注说明
- **验证**：
  - 防止自引用（课程不能将自己设为先修课程）
  - 防止循环依赖（A → B → C → A）
  - 只有 `published` 状态的课程可以作为先修课程

#### 2.2.2 先修课程组管理
- **功能**：
  - 创建先修课程组（AND/OR 关系）
  - 设置组类型：
    - `and`：组内所有课程都必须完成
    - `or`：组内至少完成 `min_required` 门课程
  - 添加课程到组
  - 设置组描述
  - 删除组
- **用途**：实现复杂的先修逻辑（如"完成 A 和 B，并且完成 C 或 D"）

#### 2.2.3 编辑和删除
- **编辑**：修改要求类型、显示顺序、备注
- **删除**：删除先修关系或组
- **限制**：删除有依赖的课程前，需要先删除依赖关系

### 2.3 先修课程展示（用户）

#### 2.3.1 课程详情页展示
- **位置**：课程详情页的 "Prerequisites" 部分
- **显示内容**：
  - Required Prerequisites（必需先修课程）
    - ✅ 已完成：绿色标记，显示课程名称和链接
    - ❌ 未完成：红色标记，显示课程名称和链接
  - Recommended Prerequisites（推荐先修课程）
    - 显示课程名称和链接
    - 标记为推荐
  - Optional Prerequisites（可选先修课程）
    - 显示课程名称和链接
    - 标记为可选
- **交互**：
  - 点击先修课程跳转到课程详情页
  - 显示先修课程描述
  - 显示完成先修课程所需时间（如果配置）

#### 2.3.2 先修课程组展示
- **显示方式**：
  - 组标题（如"完成以下任意一门课程"）
  - 组内课程列表
  - 显示完成状态（部分完成/全部完成）

### 2.4 先修条件验证

#### 2.4.1 注册时验证
- **时机**：用户尝试将课程加入购物车时
- **检查内容**：
  - 检查用户是否完成所有必填先修课程
  - 检查先修课程组是否满足（AND/OR 逻辑）
  - 实时验证
- **验证结果**：
  - ✅ **满足条件**：允许加入购物车
  - ❌ **不满足条件**：
    - 显示缺失的先修课程列表
    - 提供直接链接到先修课程
    - 显示推荐的学习路径
    - 阻止加入购物车

#### 2.4.2 验证逻辑

**简单验证（无组）**：
```typescript
// 检查所有必填先修课程是否完成
const missing = prerequisites.filter(
  p => p.requirement_type === 'required' && 
  !completedCourses.includes(p.prerequisite_course_id)
);

canEnroll = missing.length === 0;
```

**复杂验证（有组）**：
```typescript
// 检查每个组是否满足
const allGroupsSatisfied = groups.every(group => {
  if (group.group_type === 'and') {
    return group.prerequisites.every(p => completedCourses.includes(p.id));
  } else if (group.group_type === 'or') {
    const completedCount = group.prerequisites.filter(
      p => completedCourses.includes(p.id)
    ).length;
    return completedCount >= group.min_required;
  }
});

canEnroll = allGroupsSatisfied;
```

---

## 3. 学习路径定义

### 3.1 学习路径概念

#### 3.1.1 定义
学习路径（Learning Path）是一系列按顺序组织的课程，帮助用户规划完整的学习旅程。路径包含：
- **阶段（Stage）**：学习的不同阶段（如基础、进阶、高级）
- **课程**：每个阶段包含的课程
- **必填/可选**：课程是否必须完成
- **并行学习**：同阶段的课程是否可以并行学习

#### 3.1.2 路径属性
- **基本信息**：
  - 名称（name）
  - Slug（URL 友好标识符）
  - 描述（description）
  - 关联的课程类别（category_id）
  - 目标受众（target_audience）
  - 预计完成时间（estimated_duration_weeks）
  - 难度级别（difficulty_level：beginner/intermediate/advanced）
  - 是否激活（is_active）

### 3.2 学习路径管理（管理员）

#### 3.2.1 创建学习路径
- **入口**：管理员门户 → Learning Paths → Add Path
- **基本信息**：
  - 路径名称（必填）
  - Slug（可选，自动生成）
  - 描述
  - 类别
  - 目标受众
  - 预计完成时间
  - 难度级别
- **课程管理**：
  - 添加课程到路径
  - 设置课程阶段（Stage 1, 2, 3...）
  - 设置阶段名称（如"基础阶段"、"进阶阶段"）
  - 设置课程属性：
    - 是否必填（is_required）
    - 是否可以并行学习（is_parallel）
    - 预计完成时间（周）
    - 备注
  - 调整课程顺序（拖拽排序）

#### 3.2.2 编辑学习路径
- **功能**：
  - 修改路径基本信息
  - 重新组织课程顺序
  - 添加/删除课程
  - 修改阶段名称
  - 调整阶段顺序

#### 3.2.3 删除学习路径
- **限制**：确认对话框（防止误删）
- **影响**：删除路径不会影响课程本身，但会删除用户进度记录

### 3.3 学习路径展示（用户）

#### 3.3.1 路径列表页面 (`/learning-paths`)
- **功能**：
  - 显示所有活跃的学习路径
  - 搜索功能（按名称、描述）
  - 过滤功能（按类别、难度）
  - 路径卡片展示：
    - 路径名称
    - 描述
    - 难度级别标签
    - 预计完成时间
    - 包含的课程数量
    - 类别标签
    - CTA：`View Path`
- **设计**：
  - 响应式网格布局
  - 卡片悬停效果
  - 清晰的视觉层次

#### 3.3.2 路径详情页面 (`/learning-paths/[slug]`)
- **显示内容**：
  - 路径完整信息（名称、描述、难度、时间等）
  - 按阶段展示课程
  - 每个阶段的课程列表
  - 区分必填和可选课程
  - 显示课程预计完成时间
  - 用户进度显示（如果已开始）
- **进度展示**：
  - 总体完成百分比
  - 当前阶段
  - 已完成阶段数/总阶段数
  - 已完成课程数/总课程数
  - 下一个可学习的课程

---

## 4. 用户进度跟踪

### 4.1 课程完成记录

#### 4.1.1 完成记录创建
- **自动完成**：
  - 当课程实例状态变为 `completed` 时自动创建
  - 关联到具体的实例（instance_id）
  - 完成日期为实例结束日期
- **手动完成**：
  - 教练/管理员可以手动标记完成
  - 可以设置完成日期、成绩、证书
  - 需要验证（verified_by）

#### 4.1.2 完成记录字段
- `user_id`：用户 ID
- `course_id`：课程 ID
- `instance_id`：实例 ID（可选）
- `completion_date`：完成日期
- `grade`：成绩/等级（可选）
- `certificate_url`：证书 URL（可选）
- `notes`：备注
- `verified_by`：验证人（教练/管理员）
- `verified_at`：验证时间

### 4.2 学习路径进度

#### 4.2.1 进度计算
- **总体进度**：
  ```
  进度 = (已完成的必填课程数 / 总必填课程数) × 100
  ```
- **当前阶段**：
  - 找到第一个未完成的阶段
  - 如果所有阶段都完成，标记为已完成
- **阶段进度**：
  - 每个阶段的完成状态
  - 阶段内课程完成情况

#### 4.2.2 进度更新
- **自动更新**：
  - 当用户完成课程时自动更新
  - 通过数据库触发器实现
- **实时计算**：
  - 也可以实时计算（不依赖数据库存储）
  - 用于显示最新进度

### 4.3 进度展示（用户）

#### 4.3.1 路径详情页进度
- **进度卡片**：
  - 总体完成百分比（进度条）
  - 当前阶段
  - 已完成阶段数/总阶段数
  - 已完成课程数/总课程数
- **阶段进度**：
  - 每个阶段的完成状态
  - 阶段内课程完成情况
  - 下一个可学习的课程

#### 4.3.2 用户 Profile 进度
- **位置**：Profile 页面 → Analytics 标签页
- **显示内容**：
  - 所有学习路径的进度
  - 每个路径的完成百分比
  - 已完成/总课程数
  - 路径完成时间

---

## 5. 智能推荐系统

### 5.1 课程推荐

#### 5.1.1 推荐算法
- **基于先修条件**：
  - 优先推荐先修条件已满足的课程
  - 过滤掉不满足先修条件的课程
- **基于学习历史**：
  - 推荐与已学课程相关的课程
  - 推荐同系列或同类别的课程
- **基于难度匹配**：
  - 为新用户推荐入门课程
  - 为有经验用户推荐进阶课程

#### 5.1.2 推荐展示
- **位置**：
  - 首页推荐区域
  - 课程列表页推荐区域
  - 用户 Profile 推荐区域
- **推荐卡片**：
  - 课程名称
  - 课程描述
  - 推荐理由
  - 快速操作按钮（`View Details`、`Enroll Now`）

### 5.2 学习路径推荐

#### 5.2.1 推荐算法
- **基于完成度**：
  - 推荐用户已开始但未完成的路径
  - 推荐用户可以开始的路径（先修条件已满足）
- **基于兴趣匹配**：
  - 基于用户已学的课程类别
  - 推荐相似类别的路径
- **基于难度匹配**：
  - 基于用户的学习经验
  - 推荐适合的难度级别

#### 5.2.2 推荐展示
- **位置**：学习路径列表页
- **标记**：推荐路径显示 "Recommended" 标签
- **排序**：推荐路径优先显示

---

## 6. 用户故事

### 6.1 用户故事

#### 故事 1：查看先修要求
- **作为** 潜在学生/家长
- **我希望** 查看课程的先修要求
- **以便** 了解需要先完成哪些课程

#### 故事 2：浏览学习路径
- **作为** 潜在学生/家长
- **我希望** 浏览所有可用的学习路径
- **以便** 选择适合的学习路径

#### 故事 3：跟踪学习进度
- **作为** 注册用户
- **我希望** 查看我在学习路径中的进度
- **以便** 了解完成情况和下一步学习内容

#### 故事 4：获得推荐
- **作为** 注册用户
- **我希望** 获得个性化的课程和路径推荐
- **以便** 发现适合的学习内容

### 6.2 管理员故事

#### 故事 1：管理先修课程
- **作为** 管理员
- **我希望** 为课程设置先修要求
- **以便** 确保学生按正确顺序学习

#### 故事 2：创建学习路径
- **作为** 管理员
- **我希望** 创建完整的学习路径
- **以便** 为学生提供清晰的学习指引

---

## 7. 数据模型

### 7.1 核心表结构

#### 7.1.1 course_prerequisites（先修课程表）
- `id`：主键
- `course_id`：课程 ID
- `prerequisite_course_id`：先修课程 ID
- `requirement_type`：要求类型（required/recommended/optional）
- `is_mandatory`：是否强制
- `display_order`：显示顺序
- `notes`：备注

#### 7.1.2 prerequisite_groups（先修课程组表）
- `id`：主键
- `course_id`：课程 ID
- `group_type`：组类型（and/or）
- `min_required`：至少需要完成的数量
- `description`：组描述

#### 7.1.3 prerequisite_group_items（组项表）
- `id`：主键
- `group_id`：组 ID
- `prerequisite_id`：先修课程 ID

#### 7.1.4 learning_paths（学习路径表）
- `id`：主键
- `name`：路径名称
- `slug`：URL 标识符
- `description`：描述
- `category_id`：类别 ID
- `target_audience`：目标受众
- `estimated_duration_weeks`：预计完成时间
- `difficulty_level`：难度级别
- `is_active`：是否激活

#### 7.1.5 learning_path_courses（路径课程表）
- `id`：主键
- `path_id`：路径 ID
- `course_id`：课程 ID
- `stage`：阶段
- `stage_name`：阶段名称
- `is_required`：是否必填
- `is_parallel`：是否可以并行学习
- `display_order`：显示顺序
- `estimated_weeks`：预计完成时间

#### 7.1.6 user_course_completions（用户完成记录表）
- `id`：主键
- `user_id`：用户 ID
- `course_id`：课程 ID
- `instance_id`：实例 ID（可选）
- `completion_date`：完成日期
- `grade`：成绩
- `certificate_url`：证书 URL
- `verified_by`：验证人
- `verified_at`：验证时间

#### 7.1.7 user_learning_path_progress（用户路径进度表）
- `id`：主键
- `user_id`：用户 ID
- `path_id`：路径 ID
- `current_stage`：当前阶段
- `completed_courses_count`：已完成课程数
- `total_courses_count`：总课程数
- `started_at`：开始时间
- `last_activity_at`：最后活动时间
- `completed_at`：完成时间
- `is_completed`：是否已完成

---

## 8. API 设计

### 8.1 先修课程 API

#### 8.1.1 管理员 API
- `GET /api/admin/courses/[id]/prerequisites`：获取课程的先修课程
- `POST /api/admin/courses/[id]/prerequisites`：添加先修课程
- `PUT /api/admin/courses/[id]/prerequisites/[prereqId]`：更新先修课程
- `DELETE /api/admin/courses/[id]/prerequisites/[prereqId]`：删除先修课程
- `GET /api/admin/courses/[id]/prerequisite-groups`：获取先修课程组
- `POST /api/admin/courses/[id]/prerequisite-groups`：创建组
- `PUT /api/admin/courses/[id]/prerequisite-groups/[groupId]`：更新组
- `DELETE /api/admin/courses/[id]/prerequisite-groups/[groupId]`：删除组

#### 8.1.2 用户 API
- `GET /api/user/courses/[id]/can-enroll`：检查是否可以注册

### 8.2 学习路径 API

#### 8.2.1 公开 API
- `GET /api/learning-paths`：获取所有活跃路径
- `GET /api/learning-paths/[slug]`：获取路径详情

#### 8.2.2 管理员 API
- `GET /api/admin/learning-paths`：获取所有路径
- `POST /api/admin/learning-paths`：创建路径
- `GET /api/admin/learning-paths/[id]`：获取单个路径
- `PUT /api/admin/learning-paths/[id]`：更新路径
- `DELETE /api/admin/learning-paths/[id]`：删除路径

#### 8.2.3 用户 API
- `GET /api/user/learning-paths/recommended`：获取推荐路径
- `GET /api/user/learning-paths/[pathId]/progress`：获取路径进度

### 8.3 推荐 API

#### 8.3.1 用户 API
- `GET /api/user/courses/recommended`：获取推荐课程
- `GET /api/user/learning-paths/recommended`：获取推荐路径

### 8.4 完成记录 API

#### 8.4.1 用户 API
- `GET /api/user/completions`：获取用户的完成记录

#### 8.4.2 管理员/教练 API
- `POST /api/user/completions`：创建完成记录
- `PUT /api/user/completions/[id]`：更新完成记录
- `DELETE /api/user/completions/[id]`：删除完成记录

---

## 9. 业务规则

### 9.1 先修课程规则

#### 9.1.1 创建规则
- 只有 `published` 状态的课程可以作为先修课程
- 只有 `published` 状态的课程可以被分配先修课程
- 防止自引用：课程不能将自己设为先修课程
- 防止循环依赖：A → B → C → A（系统自动检测）

#### 9.1.2 验证规则
- Required 先修课程必须全部完成才能注册
- Recommended 先修课程不强制，但会提示
- Optional 先修课程仅供参考
- 组内 OR 关系：至少完成 `min_required` 门课程

### 9.2 学习路径规则

#### 9.2.1 创建规则
- 路径名称必须唯一（在同一类别内）
- 只有 `published` 状态的课程可以添加到路径
- 路径必须至少包含一门课程
- 删除路径不会影响课程本身

#### 9.2.2 进度规则
- 只有必填课程计入进度计算
- 可选课程不影响进度，但可以显示
- 并行课程可以同时学习，不影响阶段进度

---

## 10. 非功能需求

### 10.1 性能要求
- **路径列表加载**：< 2 秒
- **路径详情加载**：< 1 秒
- **进度计算**：< 500ms
- **推荐计算**：< 1 秒

### 10.2 数据完整性
- **防止循环依赖**：数据库约束 + 应用层验证
- **防止删除有依赖的课程**：需要先删除依赖关系
- **事务保证**：确保数据一致性

### 10.3 可扩展性
- **支持新增路径**：无需修改代码
- **支持新增先修关系**：无需修改代码
- **支持推荐算法优化**：易于扩展

---

## 11. 技术实现

### 11.1 数据库设计

#### 11.1.1 表关系
```
courses
  ├── course_prerequisites (一对多)
  │   └── prerequisite_groups (多对一)
  │       └── prerequisite_group_items (一对多)
  └── learning_path_courses (多对多)
      └── learning_paths (多对一)

users
  ├── user_course_completions (一对多)
  └── user_learning_path_progress (一对多)
```

#### 11.1.2 索引
- `idx_course_prerequisites_course`：加速先修课程查询
- `idx_learning_paths_slug`：加速路径查询
- `idx_path_courses_path`：加速路径课程查询
- `idx_completions_user`：加速完成记录查询

### 11.2 核心函数

#### 11.2.1 先修条件检查
```typescript
checkUserPrerequisites(userId: string, courseId: string): {
  canEnroll: boolean;
  missingPrerequisites: Course[];
  recommendations: Course[];
}
```

#### 11.2.2 进度计算
```typescript
calculateLearningPathProgress(userId: string, pathId: string): {
  progress: number; // 0-100
  currentStage: number;
  completedStages: number;
  totalStages: number;
  nextCourses: Course[];
}
```

#### 11.2.3 推荐算法
```typescript
recommendCourses(userId: string, pathId?: string): Course[]
recommendLearningPaths(userId: string): LearningPath[]
```

---

## 12. 验收标准

### 12.1 功能验收
- ✅ 可以创建和管理先修课程
- ✅ 可以创建和管理学习路径
- ✅ 注册时正确验证先修条件
- ✅ 正确计算和显示学习进度
- ✅ 推荐算法准确有效
- ✅ 防止循环依赖

### 12.2 数据完整性
- ✅ 防止循环依赖
- ✅ 防止自引用
- ✅ 外键约束正确

---

## 13. 实施状态

### 13.1 已完成功能（✅）
- ✅ 先修课程基础功能（简单 AND 关系）
- ✅ 先修条件验证（注册时检查）
- ✅ 学习路径创建和管理
- ✅ 学习路径展示（列表和详情）
- ✅ 用户进度跟踪（部分）
- ✅ 先修课程组（OR 关系）

### 13.2 部分完成功能（⚠️）
- ⚠️ 用户完成记录（自动完成已实现，手动完成部分实现）
- ⚠️ 智能推荐系统（基础推荐已实现，高级推荐待完善）

### 13.3 计划功能（⏳）
- ⏳ 路径可视化（图形化展示）
- ⏳ 证书系统
- ⏳ 学习分析报告
- ⏳ AI 驱动的个性化推荐

---

## 14. 未来扩展

### 14.1 短期（1-3 个月）
- ⏳ 学习目标设置和跟踪
- ⏳ 学习提醒和通知
- ⏳ 社交分享功能

### 14.2 中期（3-6 个月）
- ⏳ 学习小组功能
- ⏳ 讨论区和问答
- ⏳ 成就和徽章系统
- ⏳ 证书生成和下载

### 14.3 长期（6-12 个月）
- ⏳ AI 驱动的个性化学习计划
- ⏳ 自适应学习路径
- ⏳ 学习分析和洞察
- ⏳ 多语言支持

---

## 15. 附录

### 15.1 相关文档
- `LEARNING_PATH_DESIGN.md`：学习路径系统设计
- `LEARNING_PATH_USER_PRD.md`：用户端 PRD
- `LEARNING_PATH_ADMIN_PRD.md`：管理员端 PRD
- `LEARNING_PATH_ARCHITECTURE.md`：系统架构文档

### 15.2 数据库脚本
- `migrate-add-learning-paths.sql`：学习路径表创建脚本
- `migrate-add-course-prerequisites.sql`：先修课程表创建脚本
- `migrate-add-prerequisite-groups.sql`：先修课程组表创建脚本
- `migrate-add-user-progress-tracking.sql`：用户进度跟踪表创建脚本

### 15.3 术语表
- **先修课程 (Prerequisite)**：学习某门课程前需要完成的课程
- **学习路径 (Learning Path)**：一系列按顺序组织的课程
- **阶段 (Stage)**：学习路径中的学习阶段
- **完成记录 (Completion)**：用户完成某门课程的记录
- **推荐分数 (Recommendation Score)**：系统计算的推荐匹配度（0-100）

