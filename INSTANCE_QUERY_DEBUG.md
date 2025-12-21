# Instance 查询问题调试

## 查询结果分析

用户运行的 SQL 查询返回了一个 instance：

```json
{
  "id": "d977a187-42fd-470d-9487-f055e8850703",
  "assignment_id": "af048b6e-da87-46b4-bfa9-91d277b7babb",
  "start_date": "2026-10-20",
  "end_date": "2026-12-20",
  "max_students": 15,
  "current_students": 0,
  "is_active": true,
  "franchise_id": null  // ⚠️ 关键问题
}
```

## 问题分析

### 问题 1：`franchise_id = null`

**影响**：
- 如果用户在 URL 中指定了 `?franchise=xxx` 参数，API 会过滤实例
- 过滤逻辑：`instance.franchise_id === franchise.id`
- 如果 `franchise_id = null`，这个过滤会失败，导致实例被排除

**代码位置**：`src/app/api/courses/[id]/instances/route.ts` 第 40-42 行

```typescript
instances = instances.filter(
  (instance: any) => instance.franchise_id === franchise.id
)
```

### 问题 2：Assignment 的 `is_active` 状态

`getCourseInstances` 函数只查询 `is_active = true` 的 assignment：

```typescript
const { data: assignments } = await supabaseAdmin
  .from('course_assignments')
  .select('id')
  .eq('course_id', courseId)
  .eq('is_active', true)  // ⚠️ 只查询活跃的 assignment
```

如果 assignment `af048b6e-da87-46b4-bfa9-91d277b7babb` 的 `is_active = false`，就不会被查询到。

### 问题 3：日期过滤

API 会过滤掉过去的实例：

```typescript
const futureInstances = instancesWithCapacity.filter(instance => {
  const startDate = new Date(instance.start_date)
  startDate.setHours(0, 0, 0, 0)
  return startDate >= today
})
```

虽然 instance 的 `start_date = "2026-10-20"` 是未来日期，但如果时区处理有问题，可能会被误过滤。

## 需要验证的查询

### 1. 检查 Assignment 状态

```sql
SELECT 
  ca.id,
  ca.course_id,
  ca.is_active,
  ca.series_id,
  ca.category_id
FROM course_assignments ca
WHERE ca.id = 'af048b6e-da87-46b4-bfa9-91d277b7babb';
```

### 2. 检查完整的查询路径

```sql
SELECT 
  c.id as course_id,
  c.name as course_name,
  ca.id as assignment_id,
  ca.is_active as assignment_active,
  ci.id as instance_id,
  ci.is_active as instance_active,
  ci.start_date,
  ci.franchise_id
FROM courses c
JOIN course_assignments ca ON c.id = ca.course_id
JOIN course_instances ci ON ca.id = ci.assignment_id
WHERE c.id = 'efc0633c-b0b4-4c78-9ed6-a34792558ce5'
  AND ca.is_active = true  -- 这是 getCourseInstances 的查询条件
  AND ci.is_active = true;  -- 这是 getCourseInstances 的查询条件
```

### 3. 检查 Series 和 Franchise 关系

```sql
SELECT 
  cs.id as series_id,
  cs.franchise_id as series_franchise_id,
  ca.id as assignment_id,
  ci.id as instance_id,
  ci.franchise_id as instance_franchise_id
FROM course_assignments ca
JOIN course_series cs ON ca.series_id = cs.id
JOIN course_instances ci ON ca.id = ci.assignment_id
WHERE ca.id = 'af048b6e-da87-46b4-bfa9-91d277b7babb';
```

## 可能的修复方案

### 方案 1：修复 `franchise_id = null` 问题

如果 instance 的 `franchise_id` 应该从 assignment → series 推导：

```sql
-- 更新 instance 的 franchise_id
UPDATE course_instances ci
SET franchise_id = cs.franchise_id
FROM course_assignments ca
JOIN course_series cs ON ca.series_id = cs.id
WHERE ci.assignment_id = ca.id
  AND ci.franchise_id IS NULL
  AND cs.franchise_id IS NOT NULL;
```

### 方案 2：修改 API 过滤逻辑

如果 `franchise_id = null` 是合法的（表示全局实例），修改过滤逻辑：

```typescript
// 当前逻辑（有问题）
instances = instances.filter(
  (instance: any) => instance.franchise_id === franchise.id
)

// 修改为（允许 franchise_id = null）
instances = instances.filter(
  (instance: any) => 
    instance.franchise_id === franchise.id || 
    instance.franchise_id === null
)
```

### 方案 3：检查 Assignment 状态

如果 assignment 的 `is_active = false`，需要激活：

```sql
UPDATE course_assignments
SET is_active = true
WHERE id = 'af048b6e-da87-46b4-bfa9-91d277b7babb';
```

## 建议的调试步骤

1. **运行验证查询**：
   - 检查 assignment 的 `is_active` 状态
   - 检查完整的查询路径
   - 检查 series 和 franchise 关系

2. **检查前端请求**：
   - 查看浏览器 Network 标签
   - 确认 `/api/courses/{id}/instances` 的请求参数
   - 确认是否有 `?franchise=xxx` 参数

3. **检查服务器日志**：
   - 查看 `getCourseInstances` 是否返回了实例
   - 查看过滤后的结果

4. **根据结果修复**：
   - 如果 `franchise_id = null`，更新为正确的值
   - 如果 assignment `is_active = false`，激活它
   - 如果过滤逻辑有问题，修改 API

