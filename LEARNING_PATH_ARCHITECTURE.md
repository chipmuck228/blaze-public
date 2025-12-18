# Learning Path System Architecture Overview

## 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        Course System                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐         ┌──────────────────────┐            │
│  │   Courses    │────────▶│ Course Prerequisites │            │
│  │              │         │                      │            │
│  │ - id         │         │ - course_id          │            │
│  │ - name       │         │ - prerequisite_id    │            │
│  │ - status     │         │ - requirement_type  │            │
│  │ - ...        │         │ - is_mandatory       │            │
│  └──────────────┘         └──────────────────────┘            │
│         │                              │                       │
│         │                              │                       │
│         │                              ▼                       │
│         │                    ┌──────────────────────┐        │
│         │                    │ Prerequisite Groups   │        │
│         │                    │                      │        │
│         │                    │ - group_type (AND/OR)│        │
│         │                    │ - min_required       │        │
│         │                    └──────────────────────┘        │
│         │                              │                       │
│         │                              ▼                       │
│         │                    ┌──────────────────────┐        │
│         │                    │ Group Items           │        │
│         │                    └──────────────────────┘        │
│         │                                                      │
│         │                                                      │
│         ▼                                                      │
│  ┌──────────────────────┐                                    │
│  │  Learning Paths       │                                    │
│  │                      │                                    │
│  │ - id                 │                                    │
│  │ - name               │                                    │
│  │ - difficulty_level   │                                    │
│  └──────────────────────┘                                    │
│         │                                                      │
│         │                                                      │
│         ▼                                                      │
│  ┌──────────────────────┐                                    │
│  │ Path Courses          │                                    │
│  │                      │                                    │
│  │ - path_id            │                                    │
│  │ - course_id          │                                    │
│  │ - stage              │                                    │
│  │ - is_required        │                                    │
│  │ - is_parallel        │                                    │
│  └──────────────────────┘                                    │
│                                                               │
└───────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      User Progress System                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐         ┌──────────────────────┐            │
│  │    Users     │────────▶│ Course Completions   │            │
│  │              │         │                      │            │
│  │ - id         │         │ - user_id            │            │
│  │ - name       │         │ - course_id          │            │
│  │ - email      │         │ - completion_date    │            │
│  └──────────────┘         │ - grade              │            │
│         │                 └──────────────────────┘            │
│         │                                                      │
│         │                                                      │
│         ▼                                                      │
│  ┌──────────────────────┐                                    │
│  │ Path Progress         │                                    │
│  │                      │                                    │
│  │ - user_id            │                                    │
│  │ - path_id            │                                    │
│  │ - current_stage      │                                    │
│  │ - progress (%)       │                                    │
│  │ - is_completed       │                                    │
│  └──────────────────────┘                                    │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## 数据流图

### 1. 注册课程时的验证流程

```
User clicks "Enroll"
    │
    ▼
Check Prerequisites
    │
    ├─→ No prerequisites? ──→ ✅ Allow enrollment
    │
    ├─→ Has prerequisites?
    │   │
    │   ├─→ Check user completions
    │   │
    │   ├─→ All required met? ──→ ✅ Allow enrollment
    │   │
    │   └─→ Missing prerequisites? ──→ ❌ Show missing courses
    │                                    │
    │                                    └─→ Suggest learning path
```

### 2. 学习路径推荐流程

```
User visits course catalog
    │
    ▼
Get user completed courses
    │
    ▼
For each course:
    │
    ├─→ Check prerequisites
    │   │
    │   ├─→ All met? ──→ ✅ Show "Enroll" button
    │   │
    │   └─→ Missing? ──→ ⚠️ Show "Prerequisites Required"
    │
    ▼
Filter courses user can enroll
    │
    ▼
Recommend based on:
    ├─→ Learning path (if user is on a path)
    ├─→ Similar completed courses
    └─→ Popular courses
```

### 3. 课程完成流程

```
Course instance completed
    │
    ▼
Auto-create completion record
    │
    ├─→ Update user completions
    │
    ├─→ Update path progress (if on a path)
    │
    ├─→ Check if path completed
    │   │
    │   └─→ Yes? ──→ Issue certificate
    │
    └─→ Recommend next courses
```

## 关系示例

### 示例 1: 简单依赖关系

```
Course A (Introduction to Robotics)
    │
    └─→ No prerequisites ✅

Course B (Advanced Programming)
    │
    ├─→ Requires: Course A ✅
    └─→ Recommended: Math Fundamentals

Course C (Competition Prep)
    │
    ├─→ Requires: Course B ✅
    └─→ Recommended: Course A (if not already taken)
```

### 示例 2: 复杂依赖关系（组）

```
Course D (Advanced Robotics)
    │
    ├─→ Group 1 (AND): All required
    │   ├─→ Course A ✅
    │   └─→ Course B ✅
    │
    └─→ Group 2 (OR): At least one required
        ├─→ Course C (optional)
        └─→ Course E (optional)
```

### 示例 3: 学习路径

```
Learning Path: "VEX GO Complete Path"
    │
    ├─→ Stage 1: Foundation
    │   ├─→ Course A (Required)
    │   └─→ Course F (Optional, parallel)
    │
    ├─→ Stage 2: Intermediate
    │   ├─→ Course B (Required)
    │   └─→ Course G (Optional, parallel)
    │
    └─→ Stage 3: Advanced
        ├─→ Course C (Required)
        └─→ Course D (Required)
```

## 关键设计决策

### 1. 为什么需要 Prerequisite Groups？

**问题**：有些课程需要"完成 A 和 B，并且完成 C 或 D"

**解决方案**：
- Group 1 (AND): A, B（必须都完成）
- Group 2 (OR): C, D（至少完成一个）
- 两个组之间是 AND 关系

### 2. 为什么需要 Learning Paths？

**问题**：先修课程只定义了"需要什么"，但没有定义"学习顺序"

**解决方案**：
- Learning Path 定义了完整的学习序列
- 可以包含多个阶段
- 可以支持并行学习
- 可以跟踪整体进度

### 3. 为什么需要 User Completions？

**问题**：如何知道用户完成了哪些课程？

**解决方案**：
- 独立记录用户完成状态
- 支持手动标记完成（教练验证）
- 支持自动完成（实例状态变更）
- 可以记录成绩和证书

## 实施建议

### 阶段 1: MVP（最小可行产品）
1. ✅ 简单的先修课程关系（无组）
2. ✅ 注册时验证先修条件
3. ✅ 显示先修要求

### 阶段 2: 增强功能
1. ✅ 先修课程组（OR 关系）
2. ✅ 学习路径定义
3. ✅ 路径推荐

### 阶段 3: 完整功能
1. ✅ 用户进度跟踪
2. ✅ 路径可视化
3. ✅ 证书系统

## 与现有系统的集成

### 与 Course 表的关系
- `courses.prerequisites` 文本字段保留（作为补充说明）
- 新增结构化关系表（`course_prerequisites`）
- 两者可以共存，结构化关系优先

### 与 Enrollment 系统的关系
- 注册前检查先修条件
- 完成课程后自动更新完成状态
- 影响推荐算法

### 与 Assignment/Instance 系统的关系
- 先修关系基于 Course，不基于 Instance
- 完成状态可以关联到具体 Instance
- 路径可以包含多个 Assignment 的课程

