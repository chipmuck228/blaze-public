# Enroll 按钮禁用条件说明

## 概述

"Enroll" 按钮应该在以下情况下被禁用，以提供更好的用户体验并防止无效操作。

## 禁用条件列表

### 1. **数据加载状态**
- **条件**: `isLoadingInstances === true`
- **原因**: 正在加载课程实例数据，无法确定是否有可用实例
- **用户体验**: 显示加载状态，按钮显示 "Loading..." 或禁用

### 2. **没有可用实例**
- **条件**: `instances.length === 0`
- **原因**: 当前选定的位置/校区没有可用的课程实例
- **用户体验**: 按钮禁用，可能显示提示信息 "No available sessions"

### 3. **正在处理注册**
- **条件**: `isAddingToCart === true`
- **原因**: 正在将课程添加到购物车，防止重复提交
- **用户体验**: 按钮显示加载状态 "Adding..." 或 "Processing..."

### 4. **未选择实例**（多个实例时）
- **条件**: `!selectedInstanceId && instances.length > 1`
- **原因**: 有多个可用实例，但用户尚未选择
- **用户体验**: 按钮禁用，提示用户先选择实例

### 5. **实例已满**
- **条件**: `selectedInstance?.is_full === true`
- **原因**: 选定的课程实例已满员，无法注册
- **用户体验**: 
  - 按钮禁用
  - 显示 "Full" 标签
  - 提供 "Join Waitlist" 选项

### 6. **用户未登录**
- **条件**: `!session?.user`
- **原因**: 需要登录才能注册课程
- **当前行为**: 点击时跳转到登录页面
- **建议**: 可以禁用按钮并显示 "Please login to enroll"

### 7. **已注册该课程**
- **条件**: 用户已有该实例的活跃注册（状态为 `cart`, `reserved`, `enrolled`, `waitlisted`）
- **原因**: 防止重复注册
- **用户体验**: 
  - 按钮禁用
  - 显示 "Already Enrolled" 或 "In Cart"
  - 提供查看注册详情的链接

### 8. **不满足先修条件**
- **条件**: `prerequisiteCheck.canEnroll === false`
- **原因**: 用户尚未完成必需的先修课程
- **用户体验**: 
  - 按钮禁用
  - 显示缺失的先修课程列表
  - 提供链接到先修课程

### 9. **课程状态限制**
- **条件**: 课程状态不是 `published`
- **原因**: 只有已发布的课程可以注册
- **用户体验**: 按钮不显示或禁用

### 10. **实例已过期**
- **条件**: `instance.start_date < today`
- **原因**: 课程已经开始或已结束
- **用户体验**: 按钮禁用，显示 "Past Session"

## 当前实现状态

### CourseDetail.tsx
```typescript
disabled={isLoadingInstances || instances.length === 0 || isAddingToCart}
```

**已实现**:
- ✅ 加载状态
- ✅ 无可用实例
- ✅ 正在处理

**未实现**:
- ❌ 实例已满检查（前端）
- ❌ 已注册检查（前端）
- ❌ 先修条件检查（前端）
- ❌ 用户登录状态（当前是跳转）

### Courses.tsx
```typescript
disabled={!selectedInstanceId || isAddingToCart || courseInstances.find(i => i.id === selectedInstanceId)?.is_full}
```

**已实现**:
- ✅ 未选择实例
- ✅ 正在处理
- ✅ 实例已满

**未实现**:
- ❌ 已注册检查（前端）
- ❌ 先修条件检查（前端）

## 建议改进

### 1. 添加前端预检查
在禁用按钮之前，可以调用 API 检查：
- `/api/user/courses/[id]/can-enroll` - 检查先修条件
- `/api/enrollments/check` - 检查是否已注册

### 2. 显示禁用原因
当按钮禁用时，显示工具提示说明原因：
- "Please select a session"
- "This session is full"
- "You need to complete prerequisite courses first"
- "You are already enrolled in this course"

### 3. 提供替代操作
- 如果已满，显示 "Join Waitlist" 按钮
- 如果已注册，显示 "View Enrollment" 链接
- 如果不满足先修条件，显示先修课程链接

## 实现优先级

### 高优先级
1. ✅ 加载状态检查（已实现）
2. ✅ 无可用实例检查（已实现）
3. ✅ 正在处理检查（已实现）
4. ⚠️ 实例已满检查（部分实现，需要改进）

### 中优先级
5. 已注册检查（前端预检查）
6. 先修条件检查（前端预检查）
7. 用户登录状态（改为禁用而非跳转）

### 低优先级
8. 课程状态检查
9. 实例过期检查
10. 显示禁用原因工具提示

