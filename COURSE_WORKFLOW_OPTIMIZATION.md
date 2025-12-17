# 课程管理工作流优化方案

## 当前流程分析

### 现有流程（3步）

```
1. 创建 Course（课程内容）
   └── 填写：名称、描述、学习目标、适龄、年级、价格等
   └── 状态：draft（默认）

2. 创建 Assignment（课程分配）
   └── 选择：Course + Category + Series + Location（可选）
   └── 作用：将课程"上架"到某个 Program

3. 创建 Instance（具体班级）
   └── 选择：Assignment
   └── 填写：日期、时间、iCalendar 规则、容量、coach 等
   └── 作用：生成可 enroll 的具体班级
```

### 当前流程的问题

1. **步骤过多**：需要3步才能创建一个可 enroll 的实例
2. **Assignment 层必要性存疑**：
   - Assignment 主要作用是"将 Course 分配到 Series"
   - 但 Instance 已经可以通过 `assignment_id` 追溯到 Series
   - Assignment 的 `location_id` 是"默认地点"，但 Instance 可以覆盖，容易混淆
3. **批量创建困难**：
   - 同一门课程在不同时间、不同地点开课，需要多次创建 Instance
   - 没有批量创建或模板功能
4. **信息继承不明确**：
   - Instance 应该从 Assignment 继承什么？
   - Location 的覆盖逻辑不够清晰
5. **UI/UX 不够直观**：
   - 管理员需要理解 Course → Assignment → Instance 的三层关系
   - 选择 Assignment 时，显示信息可能不够清晰

---

## 优化方案

### 方案 A：简化 Assignment 层（推荐）

#### 核心思路
- **保留 Assignment**，但简化其作用
- **Assignment 作为"课程在 Program 中的上架记录"**，不强制绑定 Location
- **Instance 直接关联 Assignment**，但可以更灵活地选择 Location

#### 优化点

1. **Assignment 简化**
   - 移除 `location_id` 字段（或改为可选的"推荐地点"）
   - Assignment 只表示：`Course + Category + Series` 的组合
   - 一个 Course 在一个 Series 中只有一个 Assignment（添加唯一约束）

2. **Instance 创建流程优化**
   - 创建 Instance 时，先选择 `Series`，然后自动过滤该 Series 下的所有 Courses
   - 选择 Course 后，自动查找或创建对应的 Assignment
   - 如果 Assignment 不存在，提示用户先创建 Assignment，或提供"快速创建"选项

3. **批量创建 Instance**
   - 提供"批量创建"功能：
     - 选择 Assignment
     - 选择多个 Location（可选）
     - 选择时间模板（如：每周二、四，4:00-5:30 PM）
     - 系统自动生成多个 Instance

4. **UI/UX 改进**
   - **Instance 创建对话框**：
     ```
     步骤 1: 选择 Program (Series)
     步骤 2: 选择 Course（自动过滤该 Program 下的课程）
     步骤 3: 填写 Instance 详情（日期、时间、地点、容量等）
     ```
   - 如果 Course 还没有 Assignment，提供"快速创建 Assignment"按钮

#### 优点
- 保持数据模型的清晰性
- 减少 Assignment 的复杂度
- 改善用户体验

#### 缺点
- 仍然需要理解 Course → Assignment → Instance 的关系
- Assignment 层仍然存在

---

### 方案 B：合并 Assignment 和 Instance（激进）

#### 核心思路
- **移除 Assignment 层**
- **Instance 直接关联 Course + Series + Location**
- 通过数据库约束确保数据一致性

#### 数据模型变更

```sql
-- 移除 course_assignments 表
-- 修改 course_instances 表
ALTER TABLE course_instances
  ADD COLUMN course_id UUID REFERENCES courses(id),
  ADD COLUMN series_id UUID REFERENCES course_series(id),
  ADD COLUMN category_id UUID REFERENCES course_categories(id),
  -- 保留 location_id
  -- 移除 assignment_id
```

#### 业务逻辑

1. **创建 Instance 流程**：
   ```
   1. 选择 Franchise（可选，用于过滤）
   2. 选择 Category
   3. 选择 Series（Program）
   4. 选择 Course
   5. 选择 Location
   6. 填写 Instance 详情
   ```

2. **唯一性约束**：
   - 可以考虑：`(course_id, series_id, location_id, start_date, start_time)` 唯一
   - 或者允许同一课程在同一 Program 同一地点有多个时间段

#### 优点
- **大幅简化流程**：从3步减少到1步（创建 Instance）
- **更直观**：管理员直接创建可 enroll 的实例
- **减少数据冗余**：不需要维护 Assignment 层

#### 缺点
- **数据迁移复杂**：需要迁移所有现有数据
- **失去"课程上架"的概念**：无法单独管理"某门课是否在某个 Program 中上架"
- **查询性能**：某些查询可能需要更多的 JOIN
- **灵活性降低**：如果将来需要"课程在 Program 中的元数据"（如显示顺序、是否推荐），需要重新设计

---

### 方案 C：增强 Assignment 层（保守）

#### 核心思路
- **保留现有架构**
- **增强 Assignment 的功能和 UI**

#### 优化点

1. **Assignment 增强**
   - 添加更多元数据：
     - `default_price_override`：该 Program 中该课程的默认价格覆盖
     - `default_max_students`：默认最大学生数
     - `default_time_slots`：默认时间段模板（JSON）
     - `is_featured`：是否在 Program 中推荐
   - 添加批量操作：
     - "从 Assignment 创建多个 Instance"功能

2. **Instance 创建流程优化**
   - **方式 1：从 Assignment 创建**
     - 在 Assignment 列表中，提供"创建 Instance"按钮
     - 点击后，自动填充 Assignment 的信息（Course、Series、Location）
     - 只需填写 Instance 特有的信息（日期、时间、容量等）
   - **方式 2：独立创建**
     - 保持现有的独立创建流程
     - 但改进选择器，显示更多信息

3. **批量创建 Instance**
   - 在 Assignment 详情页，提供"批量创建 Instance"功能：
     - 选择多个 Location
     - 选择时间模板
     - 选择日期范围
     - 系统自动生成多个 Instance

4. **UI/UX 改进**
   - **Assignment 管理页面**：
     - 显示每个 Assignment 下的 Instance 数量
     - 提供"查看 Instances"、"创建 Instance"快捷操作
   - **Instance 创建对话框**：
     - 改进 Course/Assignment 选择器，显示更多区分信息
     - 提供"从 Assignment 创建"的快捷方式

#### 优点
- **最小改动**：不需要修改数据模型
- **增强功能**：Assignment 层更有价值
- **向后兼容**：不影响现有数据

#### 缺点
- **仍然需要3步**：流程复杂度没有根本改变
- **Assignment 层可能仍然显得多余**：如果只是作为"中间层"

---

### 方案 D：混合方案（推荐用于渐进式优化）

#### 核心思路
- **短期**：采用方案 C（增强 Assignment 层）
- **长期**：评估是否需要方案 B（移除 Assignment 层）

#### 短期优化（方案 C 的部分）

1. **改进 Instance 创建流程**
   - 提供两种创建方式：
     - **从 Assignment 创建**（推荐）：在 Assignment 页面直接创建 Instance
     - **独立创建**：保持现有流程，但改进 UI

2. **批量创建功能**
   - 在 Assignment 详情页，提供"批量创建 Instance"
   - 支持：
     - 多个 Location
     - 时间模板（每周几、几点到几点）
     - 日期范围
     - 自动生成 iCalendar 规则

3. **UI/UX 改进**
   - Assignment 列表显示 Instance 数量
   - Instance 列表显示 Assignment 信息（Course、Series）
   - 改进选择器，显示更多区分信息

#### 长期评估

- 收集用户反馈：Assignment 层是否真的必要？
- 如果大多数情况下，Assignment 只是"Course + Series"的组合，考虑方案 B
- 如果 Assignment 需要存储更多元数据（价格、推荐状态等），保留方案 C

---

## 推荐方案对比

| 方案 | 复杂度 | 改动范围 | 用户体验 | 数据模型 | 推荐度 |
|------|--------|----------|----------|----------|--------|
| A: 简化 Assignment | 中 | 中 | ⭐⭐⭐⭐ | 小改动 | ⭐⭐⭐⭐ |
| B: 移除 Assignment | 高 | 大 | ⭐⭐⭐⭐⭐ | 大改动 | ⭐⭐⭐ |
| C: 增强 Assignment | 低 | 小 | ⭐⭐⭐ | 无改动 | ⭐⭐⭐⭐ |
| D: 混合方案 | 中 | 渐进 | ⭐⭐⭐⭐ | 渐进 | ⭐⭐⭐⭐⭐ |

---

## 具体优化建议

### 1. 立即实施（方案 C + 部分方案 A）

#### 1.1 改进 Instance 创建流程

**当前问题**：
- 创建 Instance 时需要选择 Assignment
- Assignment 选择器只显示 Course 名称，无法区分同名课程

**优化方案**：
- **方式 1：从 Assignment 创建（推荐）**
  - 在 Assignment 管理页面，每个 Assignment 行添加"创建 Instance"按钮
  - 点击后，打开 Instance 创建对话框，自动填充：
    - `assignment_id`
    - `course_id`（从 Assignment 获取）
    - `series_id`（从 Assignment 获取）
    - `location_id`（从 Assignment 获取，可修改）
  - 用户只需填写 Instance 特有信息

- **方式 2：改进独立创建流程**
  - 创建 Instance 时，先选择 `Series`（Program）
  - 然后自动过滤该 Series 下的所有 Courses
  - 选择 Course 后，自动查找对应的 Assignment
  - 如果不存在，提示创建 Assignment 或提供快速创建

#### 1.2 批量创建 Instance

**功能**：
- 在 Assignment 详情页或 Instance 管理页面，提供"批量创建"功能
- 支持：
  - 选择多个 Location
  - 时间模板（如：每周二、四，4:00-5:30 PM）
  - 日期范围（如：2025-01-15 到 2025-03-19）
  - 自动生成 iCalendar RRULE
  - 批量设置容量、价格等

**UI 设计**：
```
批量创建 Instance
├── 选择 Assignment（自动填充 Course、Series）
├── 选择 Locations（多选）
├── 时间设置
│   ├── 开始时间：4:00 PM
│   ├── 结束时间：5:30 PM
│   └── 上课日期：周二、周四
├── 日期范围
│   ├── 开始日期：2025-01-15
│   └── 结束日期：2025-03-19
├── 其他设置
│   ├── 最大学生数：15
│   ├── 价格覆盖：（可选）
│   └── Coach：（可选）
└── 预览：将生成 16 个 Instance（2 locations × 8 weeks）
```

#### 1.3 改进 Assignment 选择器

**当前问题**：
- Assignment 选择器只显示 Course 名称
- 无法区分同名但不同 grades 的课程

**优化方案**：
- 显示格式：`Course Name • Grades: K-2, 3-5 • Slug: course-slug • [Series Name]`
- 或者使用两行显示：
  ```
  Introduction to Robotics with VEX GO
  Grades: K-2, 3-5 • Slug: intro-robotics-vex-go • 2025 Winter Courses
  ```

#### 1.4 Assignment 管理页面增强

**添加功能**：
- 显示每个 Assignment 下的 Instance 数量
- 提供快捷操作：
  - "查看 Instances"：跳转到 Instance 页面，自动过滤该 Assignment
  - "创建 Instance"：直接创建 Instance，自动填充 Assignment 信息
  - "批量创建 Instance"：打开批量创建对话框

---

### 2. 中期优化（方案 A）

#### 2.1 简化 Assignment 表结构

- 移除 `location_id` 字段（或改为 `recommended_location_id`，仅作提示）
- 添加唯一约束：`UNIQUE(course_id, series_id)`，确保一个 Course 在一个 Series 中只有一个 Assignment

#### 2.2 Instance 创建流程优化

- 创建 Instance 时，先选择 `Series`
- 然后选择 `Course`（自动过滤该 Series 下的课程）
- 系统自动查找或创建 Assignment
- 最后填写 Instance 详情

---

### 3. 长期评估（方案 B）

#### 评估指标

1. **Assignment 的使用频率**：
   - 是否经常需要单独管理 Assignment？
   - Assignment 是否需要存储额外的元数据？

2. **查询模式**：
   - 是否经常需要查询"某个 Program 中有哪些课程"？
   - 这种查询是否可以通过 Instance 聚合实现？

3. **业务需求**：
   - 是否需要"课程在 Program 中的上架状态"独立于 Instance？
   - 是否需要"课程在 Program 中的推荐状态"？

#### 如果决定移除 Assignment 层

- 需要数据迁移脚本
- 需要更新所有相关查询
- 需要更新 UI 组件

---

## 实施优先级

### Phase 1：立即实施（1-2周）
1. ✅ 改进 Assignment 选择器（已完成）
2. 添加"从 Assignment 创建 Instance"功能
3. 改进 Instance 创建对话框的 UI

### Phase 2：短期优化（2-4周）
1. 实现批量创建 Instance 功能
2. 增强 Assignment 管理页面（显示 Instance 数量、快捷操作）
3. 简化 Assignment 表结构（移除 location_id）

### Phase 3：中期优化（1-2月）
1. 优化 Instance 创建流程（先选 Series，再选 Course）
2. 添加 Assignment 的元数据字段（如果需要）
3. 实现 Instance 模板功能

### Phase 4：长期评估（3-6月）
1. 收集用户反馈
2. 评估是否需要移除 Assignment 层
3. 如果决定移除，制定迁移计划

---

## 总结

**推荐采用方案 D（混合方案）**：

1. **短期**：采用方案 C，增强 Assignment 层的功能和 UI
2. **中期**：采用方案 A，简化 Assignment 层
3. **长期**：根据实际使用情况，评估是否需要方案 B

这样可以：
- 最小化风险（渐进式改进）
- 快速改善用户体验（Phase 1 的优化）
- 保持灵活性（可以根据反馈调整方向）

