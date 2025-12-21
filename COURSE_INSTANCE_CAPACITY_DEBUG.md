# 课程实例容量问题诊断指南

## 问题描述

用户登录后浏览课程详情页时，显示 "All Sessions Full"，但实际上用户没有注册任何课程。

## 可能的原因

### 1. 实例的 `max_students` 为 0 或 null

如果实例的 `max_students` 字段为 0 或 null，可用容量会被计算为 0，导致显示为 "full"。

**检查方法**：
```sql
SELECT 
  ci.id,
  ci.max_students,
  ci.current_students,
  c.name as course_name
FROM course_instances ci
JOIN course_assignments ca ON ci.assignment_id = ca.id
JOIN courses c ON ca.course_id = c.id
WHERE c.slug = 'introduction-to-programming-via-vex-iq-3-5'
  AND ci.is_active = true
  AND ci.start_date >= CURRENT_DATE
ORDER BY ci.start_date;
```

**修复方法**：
如果 `max_students` 为 0 或 null，需要更新为合理的值：
```sql
UPDATE course_instances
SET max_students = 20  -- 根据实际情况设置
WHERE max_students IS NULL OR max_students = 0;
```

### 2. 实例确实已满

所有实例的注册数量已达到 `max_students`。

**检查方法**：
```sql
SELECT 
  ci.id,
  ci.max_students,
  ci.current_students,
  COUNT(CASE WHEN ce.status = 'enrolled' THEN 1 END) as enrolled_count,
  COUNT(CASE WHEN ce.status = 'reserved' AND ce.reserved_expires_at > NOW() THEN 1 END) as reserved_count,
  COUNT(CASE WHEN ce.status = 'cart' AND ce.cart_expires_at > NOW() THEN 1 END) as cart_count,
  (ci.max_students - 
   COUNT(CASE WHEN ce.status = 'enrolled' THEN 1 END) - 
   COUNT(CASE WHEN ce.status = 'reserved' AND ce.reserved_expires_at > NOW() THEN 1 END) - 
   COUNT(CASE WHEN ce.status = 'cart' AND ce.cart_expires_at > NOW() THEN 1 END)
  ) as available_capacity
FROM course_instances ci
JOIN course_assignments ca ON ci.assignment_id = ca.id
JOIN courses c ON ca.course_id = c.id
LEFT JOIN course_enrollments ce ON ci.id = ce.instance_id
WHERE c.slug = 'introduction-to-programming-via-vex-iq-3-5'
  AND ci.is_active = true
  AND ci.start_date >= CURRENT_DATE
GROUP BY ci.id, ci.max_students, ci.current_students
ORDER BY ci.start_date;
```

### 3. 实例的 `start_date` 已过期

API 只返回未来的实例（`start_date >= today`）。如果所有实例的 `start_date` 都已过期，会返回空数组。

**检查方法**：
```sql
SELECT 
  ci.id,
  ci.start_date,
  ci.end_date,
  CURRENT_DATE as today,
  CASE 
    WHEN ci.start_date >= CURRENT_DATE THEN 'Future'
    ELSE 'Past'
  END as status
FROM course_instances ci
JOIN course_assignments ca ON ci.assignment_id = ca.id
JOIN courses c ON ca.course_id = c.id
WHERE c.slug = 'introduction-to-programming-via-vex-iq-3-5'
  AND ci.is_active = true
ORDER BY ci.start_date;
```

### 4. 过期的 cart/reserved 注册未被清理

如果数据库中有大量过期的 `cart` 或 `reserved` 状态注册，虽然查询时会过滤过期项，但可能影响性能。

**检查方法**：
```sql
SELECT 
  status,
  COUNT(*) as total_count,
  COUNT(CASE WHEN status = 'cart' AND cart_expires_at < NOW() THEN 1 END) as expired_cart,
  COUNT(CASE WHEN status = 'reserved' AND reserved_expires_at < NOW() THEN 1 END) as expired_reserved
FROM course_enrollments
WHERE instance_id IN (
  SELECT ci.id
  FROM course_instances ci
  JOIN course_assignments ca ON ci.assignment_id = ca.id
  JOIN courses c ON ca.course_id = c.id
  WHERE c.slug = 'introduction-to-programming-via-vex-iq-3-5'
)
GROUP BY status;
```

**清理过期注册**：
```sql
-- 清理过期的 cart 状态注册（可选，建议先备份）
DELETE FROM course_enrollments
WHERE status = 'cart'
  AND cart_expires_at < NOW();

-- 清理过期的 reserved 状态注册（可选，建议先备份）
DELETE FROM course_enrollments
WHERE status = 'reserved'
  AND reserved_expires_at < NOW();
```

## 调试步骤

### 步骤 1：查看服务器日志

访问课程详情页时，查看服务器控制台输出。已添加的调试日志会显示：

1. **每个实例的容量详情**：
   ```
   [Instance {id}] Capacity check: {
     instance_id: ...,
     max_students: ...,
     current_students: ...,
     available_capacity: ...,
     is_full: ...,
     start_date: ...
   }
   ```

2. **课程实例汇总**：
   ```
   [Course {id} Instances] Summary: {
     total_instances: ...,
     instances_with_capacity: ...,
     future_instances: ...,
     all_full: ...,
     instances_detail: [...]
   }
   ```

3. **容量计算详情**：
   ```
   [getInstanceAvailableCapacity {id}] {
     max_students: ...,
     enrolled_count: ...,
     reserved_count: ...,
     cart_count: ...,
     available_capacity: ...
   }
   ```

### 步骤 2：检查 API 响应

在浏览器开发者工具的 Network 标签中，查看 `/api/courses/{id}/instances` 的响应：

```json
[
  {
    "id": "...",
    "start_date": "...",
    "max_students": 20,
    "available_capacity": 0,
    "is_full": true,
    ...
  }
]
```

### 步骤 3：检查数据库

运行上述 SQL 查询，检查：
1. 实例的 `max_students` 是否合理
2. 注册数量是否真的达到上限
3. 实例的 `start_date` 是否在未来

## 常见问题修复

### 问题 1：`max_students` 为 0

**原因**：创建实例时未设置 `max_students`，默认为 0。

**修复**：
```sql
-- 更新所有 max_students 为 0 或 null 的实例
UPDATE course_instances
SET max_students = 20  -- 根据实际情况设置默认值
WHERE (max_students IS NULL OR max_students = 0)
  AND is_active = true;
```

### 问题 2：实例已过期

**原因**：所有实例的 `start_date` 都在过去。

**修复**：需要创建新的实例或更新现有实例的日期：
```sql
-- 查看实例日期
SELECT id, start_date, end_date
FROM course_instances
WHERE id IN (
  SELECT ci.id
  FROM course_instances ci
  JOIN course_assignments ca ON ci.assignment_id = ca.id
  JOIN courses c ON ca.course_id = c.id
  WHERE c.slug = 'introduction-to-programming-via-vex-iq-3-5'
);
```

### 问题 3：容量计算错误

**原因**：`current_students` 字段未正确更新，或查询逻辑有问题。

**修复**：检查 `getInstanceAvailableCapacity` 函数的实现，确保正确统计各种状态的注册。

## 临时解决方案

如果问题持续存在，可以：

1. **临时禁用容量检查**（仅用于调试）：
   在 `src/app/api/courses/[id]/instances/route.ts` 中，临时设置：
   ```typescript
   is_full: false,  // 临时禁用
   ```

2. **显示更多调试信息**：
   在前端显示实例的详细信息，包括 `max_students`、`available_capacity` 等。

## 下一步

1. 查看服务器日志，确认具体是哪个原因
2. 根据日志信息，运行相应的 SQL 查询验证
3. 修复发现的问题
4. 重新测试课程详情页

