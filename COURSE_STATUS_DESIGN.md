# 课程状态管理设计文档

## 概述

将课程表的 `is_active` 布尔值替换为 `status` 枚举类型，支持更细粒度的状态管理，以适应课程生命周期的不同阶段。

## 状态定义

### 1. `draft` - 草稿
- **含义**：课程正在设计中，尚未完成
- **特点**：
  - 刚创建的课程默认状态
  - 可以编辑所有字段
  - **不能创建 assignment**（不能分配）
  - **不对外显示**（不在公开页面显示）
  - Admin 可以查看和编辑

### 2. `published` - 已发布
- **含义**：课程已完成设计，可以分配和上架
- **特点**：
  - 课程设计已完成
  - **可以创建 assignment**（可以分配到不同的 category/series/location）
  - **对外可见**（在公开页面显示）
  - 可以创建 course instance
  - Admin 可以查看和编辑

### 3. `suspended` - 暂停
- **含义**：临时下架，不再接受新的分配和实例
- **特点**：
  - 已有实例不受影响（可以继续运行）
  - **不能再创建新的 assignment**
  - **不能再创建新的 course instance**
  - **不对外显示**（不在公开页面显示）
  - 可以恢复为 `published` 状态
  - Admin 可以查看和编辑

### 4. `archived` - 已归档
- **含义**：课程不再使用，保留历史记录
- **特点**：
  - 课程已废弃或不再提供
  - **不能创建 assignment**
  - **不能创建 course instance**
  - **不对外显示**（不在公开页面显示）
  - **已有实例不受影响**（保留历史记录，可以继续查看和管理）
  - 公开 API 不返回已归档课程的实例
  - Admin 和 Coach 可以查看已归档课程的实例（用于历史记录）
  - 通常不再编辑（保留历史数据）
  - Admin 可以查看（通常不编辑）

## 状态转换规则

```
draft → published    ✅ 完成设计后发布
published → suspended ✅ 临时下架
suspended → published ✅ 恢复上架
published → archived  ✅ 永久下架
suspended → archived  ✅ 永久下架
draft → archived      ✅ 直接归档（未发布的课程）
archived → published  ❌ 不允许（已归档的课程不应恢复）
```

## 数据库设计

### 枚举类型
```sql
CREATE TYPE course_status AS ENUM (
  'draft',
  'published',
  'suspended',
  'archived'
);
```

### 表结构变更
```sql
-- 移除
is_active BOOLEAN DEFAULT TRUE

-- 添加
status course_status DEFAULT 'draft' NOT NULL
```

### 索引
```sql
CREATE INDEX idx_courses_status ON courses(status);
```

## 业务逻辑

### 1. 创建课程
- 新创建的课程默认状态为 `draft`
- Admin 可以编辑所有字段

### 2. 发布课程
- 只有当课程状态为 `draft` 时，可以发布为 `published`
- 发布前应验证必要字段是否完整（name, slug, description 等）

### 3. 创建 Assignment
- 只有 `published` 状态的课程可以创建 assignment
- 在 `createCourseAssignment` 函数中检查状态

### 4. 创建 Instance
- 只有 `published` 状态的课程可以创建 instance
- 在 `createCourseInstance` 函数中检查状态

### 5. 公开查询
- 只返回 `published` 状态的课程
- RLS 策略：`status = 'published'`

### 6. Admin 查询
- Admin 可以查看所有状态的课程
- 可以按状态筛选

## API 变更

### 前端需要更新的地方

1. **Course 接口**
   ```typescript
   interface Course {
     // 移除
     // is_active: boolean
     
     // 添加
     status: 'draft' | 'published' | 'suspended' | 'archived'
   }
   ```

2. **查询过滤**
   - 公开 API：只返回 `status = 'published'` 的课程
   - Admin API：可以按 `status` 筛选

3. **创建 Assignment 验证**
   - 检查课程状态是否为 `published`
   - 如果不是，返回错误

4. **创建 Instance 验证**
   - 检查课程状态是否为 `published`
   - 如果不是，返回错误

5. **UI 显示**
   - 在 Admin 课程列表中显示状态标签
   - 提供状态切换按钮（draft → published, published → suspended 等）

## 迁移策略

1. **阶段 1**：添加 `status` 列，保留 `is_active` 列
2. **阶段 2**：迁移数据（`is_active = TRUE` → `published`, `FALSE` → `archived`）
3. **阶段 3**：更新所有代码使用 `status`
4. **阶段 4**：删除 `is_active` 列（可选，建议保留一段时间以便回滚）

## 最佳实践

1. **状态转换验证**：在应用层验证状态转换的合法性
2. **历史记录**：考虑添加 `status_history` 表记录状态变更历史
3. **审计日志**：记录谁在什么时候改变了课程状态
4. **批量操作**：支持批量发布/归档操作
5. **通知机制**：状态变更时通知相关人员（可选）

## 相关文件

- 迁移脚本：`migrate-course-status.sql`
- 数据库函数：`can_assign_course()`, `is_course_visible()`
- 需要更新的代码：
  - `src/lib/db.ts` - Course 接口和查询函数
  - `src/app/api/admin/courses/route.ts` - API 路由
  - `src/components/admin/CourseEditDialog.tsx` - 编辑对话框
  - `src/app/admin/courses/page.tsx` - 课程列表页面

