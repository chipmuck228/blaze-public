# Learning Path / Course Prerequisites System Design

## 1. 概述

设计一个灵活的学习路径系统，支持：
- 课程之间的依赖关系（先修课程）
- 学习路径/序列的定义和管理
- 注册时的前置条件验证
- 学习进度跟踪
- 路径可视化

## 2. 设计目标

### 2.1 核心需求
1. **灵活的依赖关系**：
   - 有些课程不需要先修课程（独立课程）
   - 有些课程需要单个先修课程
   - 有些课程需要多个先修课程（AND 关系）
   - 有些课程需要多个先修课程中的任意一个（OR 关系）

2. **学习路径管理**：
   - 定义完整的学习路径（课程序列）
   - 支持分支路径（不同难度或方向）
   - 支持并行路径（可以同时学习）

3. **前置条件验证**：
   - 注册时自动检查是否满足前置条件
   - 显示缺失的先修课程
   - 提供学习路径建议

4. **学习进度跟踪**：
   - 跟踪学员已完成的课程
   - 计算学习进度
   - 推荐下一步课程

## 3. 数据模型设计

### 3.1 核心表结构

#### 3.1.1 course_prerequisites（课程先修关系表）

```sql
CREATE TABLE course_prerequisites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  prerequisite_course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  requirement_type VARCHAR(20) NOT NULL DEFAULT 'required', -- 'required', 'recommended', 'optional'
  is_mandatory BOOLEAN DEFAULT TRUE, -- 是否必须完成（用于 AND/OR 逻辑）
  display_order INTEGER DEFAULT 0, -- 显示顺序
  notes TEXT, -- 备注说明
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 防止自引用和重复
  CONSTRAINT no_self_reference CHECK (course_id != prerequisite_course_id),
  CONSTRAINT unique_prerequisite UNIQUE (course_id, prerequisite_course_id)
);

CREATE INDEX idx_course_prerequisites_course ON course_prerequisites(course_id);
CREATE INDEX idx_course_prerequisites_prerequisite ON course_prerequisites(prerequisite_course_id);
```

**字段说明**：
- `course_id`：需要先修课程的课程ID
- `prerequisite_course_id`：先修课程ID
- `requirement_type`：
  - `required`：必须完成（默认）
  - `recommended`：推荐完成（不强制）
  - `optional`：可选完成（仅供参考）
- `is_mandatory`：在 AND/OR 逻辑中是否必须（见下文）
- `display_order`：多个先修课程的显示顺序

**关系类型**：
- **AND 关系**：所有 `is_mandatory = TRUE` 的先修课程都必须完成
- **OR 关系**：至少完成一个 `is_mandatory = TRUE` 的先修课程（通过 `prerequisite_groups` 实现）

#### 3.1.2 prerequisite_groups（先修课程组表）

用于实现 OR 关系和复杂的逻辑组合。

```sql
CREATE TABLE prerequisite_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  group_type VARCHAR(20) NOT NULL DEFAULT 'and', -- 'and', 'or', 'custom'
  min_required INTEGER DEFAULT 1, -- 至少需要完成组内多少门课程（用于 OR 关系）
  display_order INTEGER DEFAULT 0,
  description TEXT, -- 组描述，如 "完成以下任意一门课程"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_prerequisite_groups_course ON prerequisite_groups(course_id);
```

**组类型**：
- `and`：组内所有课程都必须完成
- `or`：组内至少完成 `min_required` 门课程
- `custom`：自定义逻辑（未来扩展）

**关系**：
- 一个课程可以有多个组（组之间是 AND 关系）
- 一个组可以包含多个先修课程（根据 `group_type` 决定是 AND 还是 OR）

#### 3.1.3 prerequisite_group_items（先修课程组项表）

连接 `prerequisite_groups` 和 `course_prerequisites`。

```sql
CREATE TABLE prerequisite_group_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES prerequisite_groups(id) ON DELETE CASCADE,
  prerequisite_id UUID NOT NULL REFERENCES course_prerequisites(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_group_prerequisite UNIQUE (group_id, prerequisite_id)
);

CREATE INDEX idx_group_items_group ON prerequisite_group_items(group_id);
CREATE INDEX idx_group_items_prerequisite ON prerequisite_group_items(prerequisite_id);
```

#### 3.1.4 learning_paths（学习路径表）

定义完整的学习路径/序列。

```sql
CREATE TABLE learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- 路径名称，如 "VEX GO 完整路径"
  slug TEXT UNIQUE, -- URL友好的标识符
  description TEXT, -- 路径描述
  category_id UUID REFERENCES course_categories(id) ON DELETE SET NULL, -- 关联的课程大类
  target_audience TEXT, -- 目标受众
  estimated_duration_weeks INTEGER, -- 预计完成时间（周）
  difficulty_level VARCHAR(20), -- 'beginner', 'intermediate', 'advanced'
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_learning_paths_category ON learning_paths(category_id);
CREATE INDEX idx_learning_paths_slug ON learning_paths(slug);
```

#### 3.1.5 learning_path_courses（学习路径课程表）

定义路径中的课程序列。

```sql
CREATE TABLE learning_path_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  stage INTEGER NOT NULL, -- 阶段/级别（1, 2, 3...）
  stage_name TEXT, -- 阶段名称，如 "基础阶段", "进阶阶段"
  is_required BOOLEAN DEFAULT TRUE, -- 是否必须完成
  is_parallel BOOLEAN DEFAULT FALSE, -- 是否可以与同阶段其他课程并行学习
  display_order INTEGER DEFAULT 0, -- 同阶段内的显示顺序
  estimated_weeks INTEGER, -- 预计完成时间（周）
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_path_course UNIQUE (path_id, course_id)
);

CREATE INDEX idx_path_courses_path ON learning_path_courses(path_id);
CREATE INDEX idx_path_courses_course ON learning_path_courses(course_id);
CREATE INDEX idx_path_courses_stage ON learning_path_courses(path_id, stage);
```

**阶段设计**：
- `stage`：数字，表示学习阶段（1 = 第一阶段，2 = 第二阶段...）
- `is_parallel`：同阶段的课程是否可以并行学习
- 示例：
  - Stage 1: Course A (required)
  - Stage 2: Course B (required), Course C (optional, parallel)
  - Stage 3: Course D (required)

#### 3.1.6 user_course_completions（用户课程完成记录表）

跟踪用户完成的课程。

```sql
CREATE TABLE user_course_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES course_instances(id) ON DELETE SET NULL, -- 完成的具体实例
  completion_date DATE NOT NULL, -- 完成日期
  grade TEXT, -- 成绩/等级（可选）
  certificate_url TEXT, -- 证书URL（可选）
  notes TEXT, -- 备注
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL, -- 验证人（教练/管理员）
  verified_at TIMESTAMP WITH TIME ZONE, -- 验证时间
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_user_course_completion UNIQUE (user_id, course_id, instance_id)
);

CREATE INDEX idx_completions_user ON user_course_completions(user_id);
CREATE INDEX idx_completions_course ON user_course_completions(course_id);
CREATE INDEX idx_completions_date ON user_course_completions(completion_date);
```

**完成状态**：
- 自动完成：课程实例状态变为 `completed` 时自动记录
- 手动完成：教练/管理员手动标记完成
- 验证机制：可以要求教练验证后才能算完成

#### 3.1.7 user_learning_path_progress（用户学习路径进度表）

跟踪用户在学习路径上的进度。

```sql
CREATE TABLE user_learning_path_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  current_stage INTEGER DEFAULT 1, -- 当前阶段
  completed_courses_count INTEGER DEFAULT 0, -- 已完成的课程数
  total_courses_count INTEGER NOT NULL, -- 路径总课程数
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- 开始时间
  last_activity_at TIMESTAMP WITH TIME ZONE, -- 最后活动时间
  completed_at TIMESTAMP WITH TIME ZONE, -- 完成时间（如果完成）
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_user_path UNIQUE (user_id, path_id)
);

CREATE INDEX idx_path_progress_user ON user_learning_path_progress(user_id);
CREATE INDEX idx_path_progress_path ON user_learning_path_progress(path_id);
```

## 4. 业务逻辑设计

### 4.1 先修课程验证逻辑

#### 4.1.1 简单情况（无组）

如果课程的先修课程没有分组，则所有先修课程都必须完成（AND 关系）。

```typescript
function checkPrerequisites(userId: string, courseId: string): {
  canEnroll: boolean;
  missingPrerequisites: Course[];
  recommendations: Course[];
} {
  // 获取所有先修课程
  const prerequisites = getPrerequisites(courseId);
  
  // 获取用户已完成的课程
  const completedCourses = getUserCompletedCourses(userId);
  
  // 检查是否满足所有先修条件
  const missing = prerequisites.filter(
    p => p.requirement_type === 'required' && 
    !completedCourses.includes(p.prerequisite_course_id)
  );
  
  return {
    canEnroll: missing.length === 0,
    missingPrerequisites: missing,
    recommendations: prerequisites.filter(p => p.requirement_type === 'recommended')
  };
}
```

#### 4.1.2 复杂情况（有组）

如果课程的先修课程有分组，需要按组验证：

```typescript
function checkPrerequisitesWithGroups(userId: string, courseId: string): {
  canEnroll: boolean;
  missingPrerequisites: Course[];
  groupRequirements: GroupRequirement[];
} {
  const groups = getPrerequisiteGroups(courseId);
  const completedCourses = getUserCompletedCourses(userId);
  
  const groupRequirements = groups.map(group => {
    const groupPrerequisites = getGroupPrerequisites(group.id);
    const completedInGroup = groupPrerequisites.filter(
      p => completedCourses.includes(p.prerequisite_course_id)
    );
    
    let satisfied = false;
    if (group.group_type === 'and') {
      satisfied = completedInGroup.length === groupPrerequisites.length;
    } else if (group.group_type === 'or') {
      satisfied = completedInGroup.length >= group.min_required;
    }
    
    return {
      groupId: group.id,
      groupType: group.group_type,
      satisfied,
      required: groupPrerequisites.length,
      completed: completedInGroup.length,
      missing: groupPrerequisites.filter(
        p => !completedCourses.includes(p.prerequisite_course_id)
      )
    };
  });
  
  const allSatisfied = groupRequirements.every(gr => gr.satisfied);
  
  return {
    canEnroll: allSatisfied,
    missingPrerequisites: groupRequirements
      .filter(gr => !gr.satisfied)
      .flatMap(gr => gr.missing),
    groupRequirements
  };
}
```

### 4.2 学习路径推荐

根据用户已完成的课程，推荐下一步课程：

```typescript
function recommendNextCourses(userId: string, pathId?: string): Course[] {
  const completedCourses = getUserCompletedCourses(userId);
  
  // 如果指定了路径，推荐路径中的下一阶段课程
  if (pathId) {
    const path = getLearningPath(pathId);
    const currentStage = getUserCurrentStage(userId, pathId);
    const nextStageCourses = getPathCoursesByStage(pathId, currentStage + 1);
    
    // 过滤掉不满足先修条件的课程
    return nextStageCourses.filter(course => {
      const check = checkPrerequisites(userId, course.id);
      return check.canEnroll;
    });
  }
  
  // 否则，推荐所有满足先修条件的课程
  const allCourses = getAllPublishedCourses();
  return allCourses.filter(course => {
    const check = checkPrerequisites(userId, course.id);
    return check.canEnroll && !completedCourses.includes(course.id);
  });
}
```

### 4.3 学习进度计算

```typescript
function calculatePathProgress(userId: string, pathId: string): {
  progress: number; // 0-100
  currentStage: number;
  completedStages: number;
  totalStages: number;
  nextCourses: Course[];
} {
  const path = getLearningPath(pathId);
  const pathCourses = getPathCourses(pathId);
  const completedCourses = getUserCompletedCourses(userId);
  
  // 计算总体进度
  const requiredCourses = pathCourses.filter(pc => pc.is_required);
  const completedRequired = requiredCourses.filter(
    pc => completedCourses.includes(pc.course_id)
  );
  const progress = (completedRequired.length / requiredCourses.length) * 100;
  
  // 计算当前阶段
  const stages = [...new Set(pathCourses.map(pc => pc.stage))].sort();
  let currentStage = 1;
  for (const stage of stages) {
    const stageCourses = pathCourses.filter(pc => pc.stage === stage && pc.is_required);
    const allCompleted = stageCourses.every(
      pc => completedCourses.includes(pc.course_id)
    );
    if (allCompleted) {
      currentStage = stage + 1;
    } else {
      break;
    }
  }
  
  // 获取下一阶段的课程
  const nextStageCourses = pathCourses.filter(
    pc => pc.stage === currentStage && pc.is_required
  );
  
  return {
    progress: Math.round(progress),
    currentStage,
    completedStages: currentStage - 1,
    totalStages: stages.length,
    nextCourses: nextStageCourses.map(pc => getCourse(pc.course_id))
  };
}
```

## 5. API 设计

### 5.1 先修课程管理 API

#### 5.1.1 获取课程的先修课程

```
GET /api/admin/courses/{courseId}/prerequisites

Response:
{
  "course": Course,
  "prerequisites": [
    {
      "id": string,
      "prerequisite_course": Course,
      "requirement_type": "required" | "recommended" | "optional",
      "is_mandatory": boolean,
      "display_order": number,
      "notes": string
    }
  ],
  "groups": [
    {
      "id": string,
      "group_type": "and" | "or",
      "min_required": number,
      "description": string,
      "prerequisites": Prerequisite[]
    }
  ]
}
```

#### 5.1.2 添加先修课程

```
POST /api/admin/courses/{courseId}/prerequisites

Request:
{
  "prerequisite_course_id": string,
  "requirement_type": "required" | "recommended" | "optional",
  "is_mandatory": boolean,
  "display_order": number,
  "notes": string,
  "group_id": string | null // 如果添加到组中
}

Response:
{
  "success": boolean,
  "prerequisite": Prerequisite
}
```

#### 5.1.3 创建先修课程组

```
POST /api/admin/courses/{courseId}/prerequisite-groups

Request:
{
  "group_type": "and" | "or",
  "min_required": number,
  "description": string,
  "prerequisite_ids": string[] // 添加到组中的先修课程ID
}

Response:
{
  "success": boolean,
  "group": PrerequisiteGroup
}
```

### 5.2 学习路径管理 API

#### 5.2.1 获取所有学习路径

```
GET /api/admin/learning-paths

Query Parameters:
- category_id: string (optional)
- is_active: boolean (optional)

Response:
{
  "paths": LearningPath[]
}
```

#### 5.2.2 创建学习路径

```
POST /api/admin/learning-paths

Request:
{
  "name": string,
  "slug": string,
  "description": string,
  "category_id": string | null,
  "target_audience": string,
  "estimated_duration_weeks": number,
  "difficulty_level": "beginner" | "intermediate" | "advanced",
  "courses": [
    {
      "course_id": string,
      "stage": number,
      "stage_name": string,
      "is_required": boolean,
      "is_parallel": boolean,
      "display_order": number,
      "estimated_weeks": number
    }
  ]
}

Response:
{
  "success": boolean,
  "path": LearningPath
}
```

### 5.3 用户相关 API

#### 5.3.1 检查用户是否可以注册课程

```
GET /api/user/courses/{courseId}/can-enroll

Response:
{
  "canEnroll": boolean,
  "missingPrerequisites": Course[],
  "recommendations": Course[],
  "groupRequirements": GroupRequirement[]
}
```

#### 5.3.2 获取用户的学习路径进度

```
GET /api/user/learning-paths/{pathId}/progress

Response:
{
  "path": LearningPath,
  "progress": {
    "progress": number, // 0-100
    "currentStage": number,
    "completedStages": number,
    "totalStages": number,
    "nextCourses": Course[]
  },
  "completedCourses": Course[],
  "remainingCourses": Course[]
}
```

#### 5.3.3 获取推荐课程

```
GET /api/user/courses/recommended

Query Parameters:
- path_id: string (optional)

Response:
{
  "recommendedCourses": Course[],
  "basedOn": {
    "completedCourses": Course[],
    "path": LearningPath | null
  }
}
```

#### 5.3.4 标记课程完成

```
POST /api/admin/courses/{courseId}/complete

Request:
{
  "user_id": string,
  "instance_id": string | null,
  "completion_date": string, // ISO date
  "grade": string | null,
  "notes": string | null
}

Response:
{
  "success": boolean,
  "completion": UserCourseCompletion
}
```

## 6. UI/UX 设计

### 6.1 Admin Portal

#### 6.1.1 课程先修课程管理

**位置**：在课程编辑对话框中添加 "Prerequisites" 标签页

**功能**：
- 显示当前课程的所有先修课程
- 添加/删除先修课程
- 设置先修课程类型（required/recommended/optional）
- 创建先修课程组（AND/OR 关系）
- 可视化依赖关系图

**UI 组件**：
```
┌─────────────────────────────────────┐
│ Prerequisites                       │
├─────────────────────────────────────┤
│                                     │
│ Required Prerequisites:             │
│ ┌─────────────────────────────┐   │
│ │ ✓ Introduction to Robotics  │   │
│ │   (Required)                 │   │
│ └─────────────────────────────┘   │
│ ┌─────────────────────────────┐   │
│ │ ✓ Basic Programming          │   │
│ │   (Required)                 │   │
│ └─────────────────────────────┘   │
│                                     │
│ Recommended Prerequisites:          │
│ ┌─────────────────────────────┐   │
│ │ ○ Math Fundamentals          │   │
│ │   (Recommended)              │   │
│ └─────────────────────────────┘   │
│                                     │
│ [Add Prerequisite] [Create Group]   │
└─────────────────────────────────────┘
```

#### 6.1.2 学习路径管理页面

**位置**：`/admin/learning-paths`

**功能**：
- 列表显示所有学习路径
- 创建/编辑/删除学习路径
- 可视化路径图（阶段、课程、依赖关系）
- 拖拽排序课程

**路径可视化**：
```
Stage 1                    Stage 2                    Stage 3
┌─────────────┐           ┌─────────────┐           ┌─────────────┐
│ Course A    │──────────▶│ Course B    │──────────▶│ Course D    │
│ (Required)  │           │ (Required)  │           │ (Required)  │
└─────────────┘           └─────────────┘           └─────────────┘
                                         │
                                         ▼
                                  ┌─────────────┐
                                  │ Course C    │
                                  │ (Optional)  │
                                  └─────────────┘
```

### 6.2 Public Portal

#### 6.2.1 课程详情页

**显示先修课程要求**：
```
┌─────────────────────────────────────┐
│ Prerequisites                        │
├─────────────────────────────────────┤
│ Required:                            │
│ • Introduction to Robotics           │
│ • Basic Programming                  │
│                                     │
│ Recommended:                         │
│ • Math Fundamentals                  │
│                                     │
│ [View Learning Path]                 │
└─────────────────────────────────────┘
```

**注册按钮状态**：
- ✅ 满足条件：显示 "Enroll Now"
- ❌ 不满足条件：显示 "Prerequisites Required"，点击显示缺失的先修课程

#### 6.2.2 学习路径页面

**位置**：`/learning-paths` 或 `/learning-paths/{slug}`

**功能**：
- 显示所有可用的学习路径
- 显示路径详情和课程序列
- 显示用户在该路径上的进度
- 推荐适合的路径

**路径进度显示**：
```
┌─────────────────────────────────────┐
│ VEX GO Complete Path                │
│ Progress: 60% ████████░░░░           │
├─────────────────────────────────────┤
│ Stage 1: Foundation (Completed)     │
│ ✓ Introduction to Robotics          │
│                                     │
│ Stage 2: Intermediate (In Progress) │
│ ✓ Basic Programming                 │
│ → Advanced Programming (Current)    │
│                                     │
│ Stage 3: Advanced (Locked)          │
│ 🔒 Competition Prep                 │
└─────────────────────────────────────┘
```

#### 6.2.3 用户学习中心

**位置**：`/profile/learning` 或 `/my-learning`

**功能**：
- 显示用户已完成的课程
- 显示用户正在学习的路径
- 显示推荐的下一个课程
- 显示学习成就和证书

## 7. 数据迁移策略

### 7.1 现有数据迁移

如果 `courses.prerequisites` 字段中有文本描述，可以：

1. **保留文本字段**：作为补充说明
2. **手动创建关系**：管理员根据文本描述手动创建结构化关系
3. **自动解析**（如果可能）：使用 NLP 或关键词匹配尝试自动创建关系（需要人工审核）

### 7.2 迁移脚本

```sql
-- 创建新表
-- (使用上面定义的表结构)

-- 迁移现有数据（如果有）
-- 注意：需要根据实际情况调整

-- 示例：如果 prerequisites 字段包含课程名称
-- 可以尝试匹配并创建关系（需要人工审核）
```

## 8. 实施优先级

### Phase 1: 基础先修课程系统
1. 创建 `course_prerequisites` 表
2. 实现简单的 AND 关系验证
3. Admin UI：在课程编辑中添加先修课程管理
4. Public UI：在课程详情页显示先修要求
5. 注册时验证先修条件

### Phase 2: 学习路径系统
1. 创建 `learning_paths` 和 `learning_path_courses` 表
2. Admin UI：学习路径管理页面
3. Public UI：学习路径展示页面
4. 路径推荐功能

### Phase 3: 高级功能
1. 先修课程组（OR 关系）
2. 用户学习进度跟踪
3. 学习路径可视化
4. 证书和成就系统

### Phase 4: 优化和扩展
1. 智能推荐算法
2. 学习分析报告
3. 个性化学习路径
4. 社交功能（学习小组、讨论）

## 9. 最佳实践

### 9.1 依赖关系设计
- **避免循环依赖**：A → B → C → A（需要在创建时检测）
- **避免过深依赖**：建议最多 3-4 层
- **保持灵活性**：允许课程独立存在（无先修要求）

### 9.2 学习路径设计
- **清晰的阶段划分**：每个阶段有明确的学习目标
- **合理的难度递进**：从基础到高级
- **提供选择**：在关键节点提供不同方向的路径

### 9.3 用户体验
- **清晰的提示**：明确告知用户需要完成哪些先修课程
- **便捷的导航**：提供直接链接到先修课程
- **进度可视化**：让用户清楚看到自己的学习进度

## 10. 安全考虑

### 10.1 数据完整性
- 防止循环依赖（数据库约束 + 应用层验证）
- 防止删除有依赖的课程（需要先删除依赖关系）
- 事务保证数据一致性

### 10.2 权限控制
- 只有 admin 可以管理先修课程和学习路径
- 用户可以查看自己的学习进度
- 教练可以标记课程完成（需要权限验证）

## 11. 性能优化

### 11.1 查询优化
- 使用索引加速先修课程查询
- 缓存用户完成状态
- 批量查询优化

### 11.2 推荐算法
- 预计算推荐结果（定期更新）
- 使用缓存减少重复计算

## 12. 测试用例

### 12.1 先修课程验证
- 无先修要求的课程可以直接注册
- 有单个先修要求的课程验证
- 有多个先修要求的课程验证（AND）
- 有组先修要求的课程验证（OR）
- 循环依赖检测

### 12.2 学习路径
- 路径创建和编辑
- 路径进度计算
- 路径推荐
- 路径完成检测

## 13. 扩展性考虑

### 13.1 未来可能的扩展
- **技能点系统**：课程关联技能点，路径基于技能点推荐
- **自适应学习**：根据用户表现动态调整路径
- **微证书**：完成特定路径后颁发微证书
- **学习分析**：分析学习路径效果，优化路径设计

### 13.2 集成考虑
- **LMS 集成**：与外部学习管理系统集成
- **认证系统**：与认证机构集成
- **支付系统**：路径打包销售

