# Franchise 与 Course Assignment 关系分析

## 概述

根据 `COURSE_ARCHITECTURE_DESIGN.md` 和实际实现，**Franchise 和 Course Assignment 之间是间接关系**，通过 `course_series` 和 `course_locations` 表建立关联。

---

## 核心关系链

### 关系路径 1：通过 Series（主要路径）

```
franchises (id)
  ↓ franchise_id
course_series (id, franchise_id)
  ↓ series_id
course_assignments (series_id)
```

**说明**：
- `course_assignments.series_id` → `course_series.id`
- `course_series.franchise_id` → `franchises.id`
- **因此，每个 Assignment 通过其关联的 Series 间接关联到一个 Franchise**

### 关系路径 2：通过 Location（辅助路径）

```
franchises (id)
  ↓ franchise_id
course_locations (id, franchise_id)
  ↓ location_id
course_assignments (location_id)
```

**说明**：
- `course_assignments.location_id` → `course_locations.id`（可选，可为 NULL）
- `course_locations.franchise_id` → `franchises.id`
- **如果 Assignment 指定了 Location，也可以通过 Location 确定 Franchise**

---

## 数据模型对比

### COURSE_ARCHITECTURE_DESIGN.md 中的设计

**`course_assignments` 表结构**（文档第 119-132 行）：
```sql
CREATE TABLE course_assignments (
  id UUID PRIMARY KEY,
  course_id UUID NOT NULL,           -- 关联 Course
  category_id UUID NOT NULL,          -- 关联 Category
  series_id UUID NOT NULL,            -- 关联 Series（关键！）
  location_id UUID,                   -- 关联 Location（可选）
  display_order INTEGER,
  is_active BOOLEAN,
  ...
);
```

**关键点**：
- ✅ `series_id` 是 **NOT NULL**（必须）
- ⚠️ `location_id` 是 **可选**（可以为 NULL）
- ❌ **没有直接的 `franchise_id` 字段**

### 实际实现中的扩展

根据 `migrate-add-franchises.sql` 和 `migrate-add-course-series-franchise.sql`：

1. **`course_series` 表增加了 `franchise_id`**：
   ```sql
   ALTER TABLE course_series
     ADD COLUMN franchise_id UUID REFERENCES franchises(id);
   ```

2. **`course_locations` 表增加了 `franchise_id`**：
   ```sql
   ALTER TABLE course_locations
     ADD COLUMN franchise_id UUID REFERENCES franchises(id);
   ```

3. **`course_instances` 表增加了 `franchise_id`**（冗余字段，用于加速查询）：
   ```sql
   ALTER TABLE course_instances
     ADD COLUMN franchise_id UUID REFERENCES franchises(id);
   ```

4. **`course_assignments` 表没有增加 `franchise_id`**：
   - 保持原设计，通过关联表间接获取

---

## 关系推导逻辑

### 如何确定一个 Assignment 属于哪个 Franchise？

**方法 1：通过 Series（主要方法，总是可用）**
```sql
SELECT 
  ca.*,
  cs.franchise_id
FROM course_assignments ca
JOIN course_series cs ON ca.series_id = cs.id
WHERE ca.id = 'assignment-uuid';
```

**方法 2：通过 Location（辅助方法，仅当 location_id 不为 NULL 时可用）**
```sql
SELECT 
  ca.*,
  cl.franchise_id
FROM course_assignments ca
LEFT JOIN course_locations cl ON ca.location_id = cl.id
WHERE ca.id = 'assignment-uuid';
```

**方法 3：同时检查两者（推荐，用于数据一致性验证）**
```sql
SELECT 
  ca.*,
  cs.franchise_id as series_franchise_id,
  cl.franchise_id as location_franchise_id
FROM course_assignments ca
JOIN course_series cs ON ca.series_id = cs.id
LEFT JOIN course_locations cl ON ca.location_id = cl.id
WHERE ca.id = 'assignment-uuid';
```

**数据一致性规则**：
- 如果 `location_id` 不为 NULL，则 `location.franchise_id` 应该等于 `series.franchise_id`
- 如果两者不一致，说明数据有问题

---

## 业务逻辑含义

### 1. Assignment 的 Franchise 归属

**核心原则**：
> **一个 Assignment 的 Franchise 由其关联的 Series 决定，而不是由 Location 决定。**

**原因**：
- `series_id` 是 **NOT NULL**，总是存在
- `location_id` 是 **可选**，可能为 NULL
- Series 是 Program/Session 的概念，天然绑定到 Franchise（城市/校区）

### 2. Location 在 Assignment 中的角色

**Location 的作用**：
- 表示该 Assignment 的**默认上课地点**
- 如果指定了 Location，该 Location 必须属于同一个 Franchise（数据一致性要求）
- 如果 Location 为 NULL，表示该 Assignment 不绑定特定地点（可能适用于线上课程或跨校区课程）

### 3. 多租户隔离

**查询某个 Franchise 的所有 Assignments**：
```sql
SELECT ca.*
FROM course_assignments ca
JOIN course_series cs ON ca.series_id = cs.id
WHERE cs.franchise_id = 'franchise-uuid'
  AND ca.is_active = TRUE
  AND cs.is_active = TRUE;
```

**查询某个 Franchise 的某个 Series 的所有 Assignments**：
```sql
SELECT ca.*
FROM course_assignments ca
WHERE ca.series_id = 'series-uuid'
  AND ca.is_active = TRUE;
-- 前提：该 series.franchise_id = 'franchise-uuid'
```

---

## 设计优势

### 1. 数据一致性

- ✅ Series 必须属于一个 Franchise（`series.franchise_id` NOT NULL）
- ✅ Assignment 必须关联一个 Series（`assignment.series_id` NOT NULL）
- ✅ 因此，每个 Assignment 都有明确的 Franchise 归属

### 2. 灵活性

- ✅ 一个 Course 可以分配到多个 Franchise（通过不同的 Series）
- ✅ 一个 Course 可以在同一个 Franchise 的多个 Series 中出现
- ✅ Location 是可选的，允许跨校区或线上课程

### 3. 查询性能

- ⚠️ 需要 JOIN 才能获取 Franchise 信息（没有冗余字段）
- ✅ 可以通过索引优化（`course_series.franchise_id` 有索引）
- ✅ 如果需要频繁按 Franchise 过滤，可以考虑在 `course_assignments` 表增加冗余的 `franchise_id` 字段

---

## 潜在问题和建议

### 问题 1：没有冗余字段

**现状**：
- `course_assignments` 表没有 `franchise_id` 字段
- 每次查询都需要 JOIN `course_series` 表

**影响**：
- 查询性能可能略慢（但可以通过索引优化）
- 代码中需要记住 JOIN 逻辑

**建议**：
- 如果查询性能成为瓶颈，可以考虑添加冗余的 `franchise_id` 字段
- 通过触发器或应用层逻辑保持数据一致性

### 问题 2：Location 和 Series 的 Franchise 可能不一致

**现状**：
- 数据库层面没有强制约束确保 `location.franchise_id = series.franchise_id`
- 需要应用层验证

**建议**：
- 在创建/更新 Assignment 时，验证 Location 和 Series 属于同一个 Franchise
- 或者在数据库层面添加 CHECK 约束（如果数据库支持）

### 问题 3：文档中没有明确说明

**现状**：
- `COURSE_ARCHITECTURE_DESIGN.md` 文档中没有提到 Franchise
- 这是后来添加的多租户功能

**建议**：
- 更新文档，明确说明 Franchise 与 Assignment 的间接关系
- 添加数据查询示例，展示如何通过 Series 获取 Franchise

---

## 实际应用场景

### 场景 1：显示某个 Franchise 的课程列表

**API 路径**：`GET /api/programs?franchise=cherrycrest`

**查询逻辑**：
1. 根据 `franchise` code 查找 `franchises` 表，获取 `franchise.id`
2. 查询 `course_series` 表，过滤 `franchise_id = franchise.id`
3. 查询 `course_assignments` 表，过滤 `series_id IN (series_ids)`
4. 关联 `courses` 表，获取课程详情
5. 过滤 `course.status = 'published'`

**关键点**：
- 通过 `series.franchise_id` 间接过滤 Assignment
- 不需要直接查询 `course_assignments.franchise_id`（因为不存在）

### 场景 2：创建新的 Assignment

**流程**：
1. 选择 Course（全局，不绑定 Franchise）
2. 选择 Category（全局，不绑定 Franchise）
3. 选择 Series（**必须属于目标 Franchise**）
4. 选择 Location（可选，**必须属于同一个 Franchise**）
5. 保存 Assignment

**验证逻辑**：
```typescript
// 伪代码
if (location_id) {
  const location = await getLocation(location_id);
  const series = await getSeries(series_id);
  if (location.franchise_id !== series.franchise_id) {
    throw new Error('Location and Series must belong to the same Franchise');
  }
}
```

---

## 总结

### 核心关系

1. **Franchise → Series → Assignment**（主要路径）
   - 每个 Series 属于一个 Franchise
   - 每个 Assignment 关联一个 Series
   - 因此，每个 Assignment 通过 Series 间接关联到一个 Franchise

2. **Franchise → Location → Assignment**（辅助路径）
   - 每个 Location 属于一个 Franchise
   - 每个 Assignment 可以关联一个 Location（可选）
   - 如果指定了 Location，它应该与 Series 属于同一个 Franchise

### 设计特点

- ✅ **间接关系**：通过关联表建立，保持数据规范化
- ✅ **灵活性**：一个 Course 可以分配到多个 Franchise
- ✅ **一致性**：通过 Series 确保每个 Assignment 都有明确的 Franchise 归属
- ⚠️ **性能**：需要 JOIN 查询，但可以通过索引优化
- ⚠️ **验证**：需要在应用层验证 Location 和 Series 的 Franchise 一致性

### 建议

1. **保持当前设计**：间接关系是合理的，符合数据库规范化原则
2. **添加验证逻辑**：在创建/更新 Assignment 时验证 Location 和 Series 的 Franchise 一致性
3. **优化查询**：为 `course_series.franchise_id` 和 `course_locations.franchise_id` 创建索引
4. **更新文档**：在 `COURSE_ARCHITECTURE_DESIGN.md` 中补充 Franchise 相关说明

