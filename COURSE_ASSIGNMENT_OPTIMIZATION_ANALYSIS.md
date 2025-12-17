# Course Assignment 层优化方案分析

## 执行摘要

本文档分析取消 `course_assignments` 层的可行性，评估直接在 `course_instances` 中将全局课程分配到不同 franchise 的 category/programs 下的方案。

**结论**：**可以取消 Assignment 层**，但需要权衡业务灵活性和数据一致性。推荐采用**渐进式优化方案**。

---

## 一、现有结构分析

### 1.1 当前数据模型

```
Course (全局课程内容)
  └── CourseAssignment (课程分配)
      ├── course_id → Course
      ├── category_id → Category
      ├── series_id → Series (Program)
      ├── location_id → Location (可选，默认地点)
      ├── display_order (在 Program 中的显示顺序)
      └── is_active (是否在 Program 中上架)
          └── CourseInstance (具体班级)
              ├── assignment_id → Assignment
              ├── location_id (可覆盖 Assignment 的 location)
              ├── start_date, end_date, start_time, end_time
              ├── icalendar_rrule, icalendar_exdates, icalendar_rdates
              ├── max_students, current_students
              └── price_override, status, notes
```

### 1.2 Assignment 层的职责

根据 `COURSE_PROGRAM_DESIGN.md` 和 `COURSE_ARCHITECTURE_DESIGN.md`，Assignment 层的主要职责：

1. **课程上架管理**
   - 表示"某门课程在某个 Program 中是否上架"
   - `is_active` 字段控制上架状态

2. **显示顺序管理**
   - `display_order` 字段控制课程在 Program 中的显示顺序

3. **默认地点设置**
   - `location_id` 字段提供默认上课地点（Instance 可以覆盖）

4. **数据关联**
   - 将 `Course` 关联到 `Category + Series` 组合
   - 通过 `series_id` 间接关联到 `Franchise`

5. **数据完整性**
   - 确保 `category_id` 与 `series.category_id` 一致
   - 通过 `UNIQUE(course_id, category_id, series_id, location_id)` 防止重复分配

---

## 二、取消 Assignment 层的可行性分析

### 2.1 优势分析

#### ✅ 优势 1：简化工作流程

**当前流程**（3步）：
```
1. 创建 Course（课程内容）
2. 创建 Assignment（课程分配）
3. 创建 Instance（具体班级）
```

**优化后流程**（1步）：
```
1. 创建 Instance（直接选择 Course + Series + Location，填写时间等信息）
```

**收益**：
- ⭐⭐⭐⭐⭐ **大幅简化操作流程**：从 3 步减少到 1 步
- ⭐⭐⭐⭐⭐ **更直观**：管理员直接创建可 enroll 的实例
- ⭐⭐⭐⭐ **减少认知负担**：不需要理解 Course → Assignment → Instance 的三层关系

#### ✅ 优势 2：减少数据冗余

**当前问题**：
- Assignment 存储的信息（`course_id`, `category_id`, `series_id`）可以通过 Instance 直接关联获取
- `location_id` 在 Assignment 中是"默认值"，但在 Instance 中可以被覆盖，容易混淆

**优化后**：
- Instance 直接存储 `course_id`, `series_id`, `location_id`
- 减少一层数据存储，降低维护成本

#### ✅ 优势 3：查询性能优化

**当前查询路径**（需要 JOIN Assignment）：
```sql
SELECT ci.*, c.*, cs.*, f.*
FROM course_instances ci
JOIN course_assignments ca ON ci.assignment_id = ca.id
JOIN courses c ON ca.course_id = c.id
JOIN course_series cs ON ca.series_id = cs.id
JOIN franchises f ON cs.franchise_id = f.id
WHERE f.code = 'bellevue';
```

**优化后查询路径**（减少一层 JOIN）：
```sql
SELECT ci.*, c.*, cs.*, f.*
FROM course_instances ci
JOIN courses c ON ci.course_id = c.id
JOIN course_series cs ON ci.series_id = cs.id
JOIN franchises f ON cs.franchise_id = f.id
WHERE f.code = 'bellevue';
```

**收益**：
- ⭐⭐⭐ **减少 JOIN 操作**：从 4 层 JOIN 减少到 3 层
- ⭐⭐⭐ **提升查询性能**：特别是在大量数据场景下

#### ✅ 优势 4：数据一致性

**当前问题**：
- Assignment 的 `category_id` 需要与 `series.category_id` 保持一致（需要应用层验证）
- Instance 的 `location_id` 可以覆盖 Assignment 的 `location_id`，容易产生不一致

**优化后**：
- Instance 直接关联 `series_id`，通过 `series.category_id` 获取 Category
- `location_id` 直接在 Instance 中设置，逻辑更清晰

---

### 2.2 劣势分析

#### ❌ 劣势 1：失去"课程上架"概念

**当前能力**：
- 可以单独管理"某门课程是否在某个 Program 中上架"（通过 Assignment 的 `is_active`）
- 即使没有 Instance，也可以表示"这门课程在这个 Program 中可用"

**优化后影响**：
- ❌ **无法单独表示"课程上架"**：只能通过是否存在 Instance 来判断
- ❌ **无法提前规划**：无法在创建 Instance 之前就表示"这门课程将在某个 Program 中提供"

**业务场景影响**：
- ⚠️ **课程目录展示**：如果需要在课程目录中显示"某 Program 中有哪些课程"（即使还没有 Instance），需要额外处理
- ⚠️ **课程规划**：无法提前规划"下个学期将提供哪些课程"

**解决方案**：
- 可以通过查询"某个 Series 下有哪些 Course（通过 Instance 聚合）"来获取
- 或者创建"占位 Instance"（`status = 'planned'`）来表示规划中的课程

#### ❌ 劣势 2：失去显示顺序管理

**当前能力**：
- Assignment 的 `display_order` 可以控制课程在 Program 中的显示顺序

**优化后影响**：
- ❌ **无法统一管理显示顺序**：如果同一门课程在同一 Program 中有多个 Instance，如何确定显示顺序？

**业务场景影响**：
- ⚠️ **课程目录排序**：在展示"某个 Program 中的课程列表"时，需要额外的排序逻辑

**解决方案**：
- 在 Instance 中添加 `display_order` 字段（但同一课程可能有多个 Instance，需要聚合逻辑）
- 或者在 Course 层面添加"默认显示顺序"（但这样会失去 Program 级别的灵活性）
- 或者通过 Instance 的创建时间、开始日期等来排序

#### ❌ 劣势 3：数据迁移复杂度

**当前数据**：
- 所有现有的 `course_instances` 都通过 `assignment_id` 关联到 `course_assignments`
- 需要迁移数据，将 Assignment 的信息（`course_id`, `category_id`, `series_id`, `location_id`）复制到 Instance

**迁移复杂度**：
- ⚠️ **数据迁移脚本**：需要编写复杂的迁移脚本
- ⚠️ **数据验证**：需要确保迁移后的数据完整性
- ⚠️ **回滚方案**：需要准备回滚方案，以防迁移失败

**风险评估**：
- ⭐⭐⭐ **中等风险**：如果数据量不大，迁移相对简单；如果数据量大，需要谨慎处理

#### ❌ 劣势 4：查询模式变化

**当前查询模式**：
- "某个 Program 中有哪些课程" → 查询 `course_assignments WHERE series_id = ?`
- "某门课程在哪些 Program 中" → 查询 `course_assignments WHERE course_id = ?`

**优化后查询模式**：
- "某个 Program 中有哪些课程" → 查询 `course_instances WHERE series_id = ? GROUP BY course_id`
- "某门课程在哪些 Program 中" → 查询 `course_instances WHERE course_id = ? GROUP BY series_id`

**影响**：
- ⚠️ **需要 GROUP BY**：增加了查询复杂度
- ⚠️ **性能影响**：如果 Instance 数量很大，GROUP BY 可能影响性能
- ⚠️ **空结果处理**：如果某个 Program 中某门课程还没有 Instance，查询结果为空

**解决方案**：
- 添加适当的索引（`(series_id, course_id)`, `(course_id, series_id)`）
- 使用物化视图或缓存来优化查询性能

---

## 三、优化方案设计

### 方案 A：完全移除 Assignment 层（激进方案）

#### 3.1 数据模型变更

```sql
-- 1. 修改 course_instances 表
ALTER TABLE course_instances
  -- 移除 assignment_id
  DROP COLUMN assignment_id,
  -- 添加直接关联字段
  ADD COLUMN course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  ADD COLUMN series_id UUID NOT NULL REFERENCES course_series(id) ON DELETE CASCADE,
  ADD COLUMN category_id UUID REFERENCES course_categories(id) ON DELETE SET NULL,
  -- 保留 location_id（已存在）
  -- 添加 display_order（用于在 Program 中的显示顺序）
  ADD COLUMN display_order INTEGER DEFAULT 0;

-- 2. 添加数据完整性约束
ALTER TABLE course_instances
  ADD CONSTRAINT check_category_series_match
  CHECK (
    category_id IS NULL OR
    category_id = (SELECT category_id FROM course_series WHERE id = series_id)
  );

-- 3. 添加唯一约束（可选，防止重复创建相同的 Instance）
-- 注意：这个约束可能过于严格，因为同一课程在同一 Program 同一地点可以有多个时间段
-- ALTER TABLE course_instances
--   ADD CONSTRAINT unique_course_series_location_time
--   UNIQUE(course_id, series_id, location_id, start_date, start_time);

-- 4. 添加索引以优化查询
CREATE INDEX idx_course_instances_course_series 
  ON course_instances(course_id, series_id);
CREATE INDEX idx_course_instances_series_course 
  ON course_instances(series_id, course_id);
CREATE INDEX idx_course_instances_franchise 
  ON course_instances(franchise_id);

-- 5. 删除 course_assignments 表（在数据迁移完成后）
-- DROP TABLE course_assignments CASCADE;
```

#### 3.2 数据迁移策略

```sql
-- 迁移脚本：将 Assignment 的信息复制到 Instance
UPDATE course_instances ci
SET 
  course_id = ca.course_id,
  series_id = ca.series_id,
  category_id = ca.category_id,
  location_id = COALESCE(ci.location_id, ca.location_id),  -- Instance 的 location 优先
  display_order = ca.display_order
FROM course_assignments ca
WHERE ci.assignment_id = ca.id;

-- 验证迁移结果
SELECT 
  COUNT(*) as total_instances,
  COUNT(course_id) as instances_with_course,
  COUNT(series_id) as instances_with_series,
  COUNT(category_id) as instances_with_category
FROM course_instances;
```

#### 3.3 业务逻辑变更

**创建 Instance 流程**：
```
1. 选择 Franchise（可选，用于过滤）
2. 选择 Category
3. 选择 Series (Program)
4. 选择 Course（自动过滤该 Series 下的课程，或显示所有课程）
5. 选择 Location
6. 填写 Instance 详情（日期、时间、容量、价格等）
7. 设置 display_order（可选，用于在 Program 中的显示顺序）
```

**查询"某个 Program 中有哪些课程"**：
```sql
SELECT DISTINCT 
  c.id,
  c.name,
  c.slug,
  MIN(ci.display_order) as display_order,  -- 取最小的 display_order
  COUNT(ci.id) as instance_count
FROM courses c
JOIN course_instances ci ON c.id = ci.course_id
WHERE ci.series_id = :series_id
  AND ci.status IN ('scheduled', 'ongoing')
GROUP BY c.id, c.name, c.slug
ORDER BY display_order, c.name;
```

#### 3.4 优点

- ✅ **大幅简化流程**：从 3 步减少到 1 步
- ✅ **更直观**：管理员直接创建可 enroll 的实例
- ✅ **减少数据冗余**：不需要维护 Assignment 层
- ✅ **查询性能优化**：减少一层 JOIN

#### 3.5 缺点

- ❌ **失去"课程上架"概念**：无法单独管理课程的上架状态
- ❌ **显示顺序管理复杂**：需要聚合逻辑来确定显示顺序
- ❌ **数据迁移复杂**：需要迁移所有现有数据
- ❌ **查询模式变化**：需要 GROUP BY 来获取课程列表

---

### 方案 B：保留 Assignment 但简化（保守方案）

#### 3.1 数据模型优化

```sql
-- 简化 course_assignments 表
ALTER TABLE course_assignments
  -- 移除 location_id（不再需要默认地点）
  DROP COLUMN location_id,
  -- 添加唯一约束：一个 Course 在一个 Series 中只有一个 Assignment
  ADD CONSTRAINT unique_course_series 
  UNIQUE(course_id, series_id);

-- 保留其他字段：
-- - course_id, category_id, series_id (必须)
-- - display_order (显示顺序)
-- - is_active (上架状态)
```

#### 3.2 业务逻辑优化

**创建 Instance 流程**（改进）：
```
1. 选择 Series (Program) ← 先选 Program
2. 选择 Course（自动过滤该 Series 下的课程，或显示所有课程）
   - 如果 Course 还没有 Assignment，提供"快速创建 Assignment"选项
3. 选择 Location
4. 填写 Instance 详情
```

**快速创建 Assignment**：
- 如果选择 Course 时发现没有对应的 Assignment，系统自动创建
- 或者提示用户先创建 Assignment

#### 3.3 优点

- ✅ **保持灵活性**：仍然可以单独管理课程的上架状态和显示顺序
- ✅ **最小改动**：不需要修改数据模型的核心结构
- ✅ **向后兼容**：不影响现有数据

#### 3.4 缺点

- ❌ **仍然需要 2-3 步**：流程复杂度没有根本改变
- ❌ **Assignment 层可能仍然显得多余**：如果只是作为"中间层"

---

### 方案 C：混合方案（推荐）

#### 3.1 核心思路

**短期**：采用方案 B（简化 Assignment 层）
**长期**：根据实际使用情况，评估是否需要方案 A（完全移除）

#### 3.2 实施步骤

**Phase 1：简化 Assignment 层（1-2周）**
1. 移除 Assignment 的 `location_id` 字段
2. 添加 `UNIQUE(course_id, series_id)` 约束
3. 优化 Instance 创建流程：先选 Series，再选 Course
4. 提供"快速创建 Assignment"功能

**Phase 2：增强 Instance 创建体验（2-4周）**
1. 实现批量创建 Instance 功能
2. 改进 UI/UX，使流程更直观
3. 收集用户反馈

**Phase 3：评估移除 Assignment 层（1-2月后）**
1. 分析 Assignment 的使用频率
2. 评估业务需求：是否真的需要"课程上架"概念？
3. 如果决定移除，制定迁移计划

#### 3.3 优点

- ✅ **渐进式优化**：风险最小，可以随时调整方向
- ✅ **快速改善体验**：Phase 1 的优化可以立即改善用户体验
- ✅ **保持灵活性**：可以根据反馈决定是否完全移除 Assignment 层

---

## 四、推荐方案对比

| 方案 | 复杂度 | 改动范围 | 用户体验 | 数据模型 | 业务灵活性 | 推荐度 |
|------|--------|----------|----------|----------|------------|--------|
| **A: 完全移除** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **B: 简化保留** | ⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **C: 混合方案** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 五、具体实施建议

### 5.1 如果选择方案 A（完全移除 Assignment 层）

#### 实施步骤

1. **数据迁移准备**
   - 备份所有相关表
   - 编写数据迁移脚本
   - 在测试环境验证迁移脚本

2. **数据库变更**
   - 修改 `course_instances` 表结构
   - 迁移数据
   - 添加索引和约束
   - 删除 `course_assignments` 表

3. **代码更新**
   - 更新 TypeScript 类型定义
   - 更新数据库操作函数（`db.ts`）
   - 更新 API 路由
   - 更新 UI 组件

4. **测试验证**
   - 单元测试
   - 集成测试
   - 用户验收测试

#### 风险评估

- ⚠️ **数据迁移风险**：如果数据量大，迁移可能需要较长时间
- ⚠️ **业务逻辑风险**：需要确保所有查询和业务逻辑都正确更新
- ⚠️ **回滚风险**：如果迁移失败，需要回滚方案

#### 迁移时间估算

- **小规模数据**（< 1000 instances）：1-2 天
- **中等规模数据**（1000-10000 instances）：3-5 天
- **大规模数据**（> 10000 instances）：1-2 周

---

### 5.2 如果选择方案 B（简化保留 Assignment 层）

#### 实施步骤

1. **数据库变更**
   - 移除 Assignment 的 `location_id` 字段
   - 添加 `UNIQUE(course_id, series_id)` 约束

2. **代码更新**
   - 更新 TypeScript 类型定义
   - 更新数据库操作函数
   - 更新 API 路由
   - 更新 UI 组件（移除 Location 选择）

3. **UI/UX 优化**
   - 优化 Instance 创建流程：先选 Series，再选 Course
   - 提供"快速创建 Assignment"功能

#### 风险评估

- ✅ **低风险**：改动范围小，不影响现有数据
- ✅ **易于回滚**：如果出现问题，可以快速回滚

#### 实施时间估算

- **开发时间**：3-5 天
- **测试时间**：1-2 天
- **总计**：1 周

---

### 5.3 如果选择方案 C（混合方案）

#### Phase 1 实施步骤（同方案 B）

#### Phase 2 评估指标

1. **Assignment 使用频率**
   - 统计 Assignment 的创建、编辑、删除频率
   - 分析是否大多数 Assignment 只是"Course + Series"的组合

2. **业务需求分析**
   - 是否真的需要"课程上架"概念？
   - 是否需要在没有 Instance 的情况下表示"课程可用"？
   - 显示顺序管理是否重要？

3. **用户反馈**
   - 收集管理员对当前流程的反馈
   - 了解痛点和不便之处

#### Phase 3 决策

- **如果决定移除 Assignment 层**：按照方案 A 实施
- **如果决定保留**：继续优化方案 B

---

## 六、关键问题解答

### Q1: 取消 Assignment 层后，如何表示"某门课程在某个 Program 中上架"？

**A**: 可以通过以下方式：
1. **通过 Instance 聚合**：查询"某个 Series 下有哪些 Course（通过 Instance 聚合）"
2. **创建占位 Instance**：创建 `status = 'planned'` 的 Instance 来表示规划中的课程
3. **在 Course 层面添加标记**：添加 `available_in_series` 字段（但这样会失去灵活性）

**推荐**：方案 1（通过 Instance 聚合），因为：
- 简单直接
- 不需要额外的数据结构
- 可以通过 `status` 字段区分"已上架"和"规划中"

---

### Q2: 取消 Assignment 层后，如何管理课程在 Program 中的显示顺序？

**A**: 可以通过以下方式：
1. **在 Instance 中添加 `display_order`**：同一课程可能有多个 Instance，取最小的 `display_order`
2. **通过 Instance 的创建时间排序**：先创建的排在前面
3. **通过 Instance 的开始日期排序**：开始日期早的排在前面

**推荐**：方案 1（在 Instance 中添加 `display_order`），因为：
- 最灵活
- 可以精确控制显示顺序
- 查询时使用 `MIN(display_order)` 聚合即可

---

### Q3: 取消 Assignment 层后，如何防止重复创建相同的 Instance？

**A**: 可以通过以下方式：
1. **添加唯一约束**：`UNIQUE(course_id, series_id, location_id, start_date, start_time)`
2. **应用层验证**：在创建 Instance 前检查是否已存在
3. **允许重复但标记**：允许重复，但添加 `is_duplicate` 标记

**推荐**：方案 1（添加唯一约束），因为：
- 数据库层面保证数据完整性
- 防止意外创建重复数据

**注意**：这个约束可能过于严格，因为：
- 同一课程在同一 Program 同一地点可以有多个时间段（例如：上午班和下午班）
- 需要根据实际业务需求调整约束条件

---

### Q4: 取消 Assignment 层后，查询性能会如何？

**A**: 分析如下：

**当前查询**（需要 JOIN Assignment）：
```sql
SELECT ci.*, c.*, cs.*, f.*
FROM course_instances ci
JOIN course_assignments ca ON ci.assignment_id = ca.id  -- 4 层 JOIN
JOIN courses c ON ca.course_id = c.id
JOIN course_series cs ON ca.series_id = cs.id
JOIN franchises f ON cs.franchise_id = f.id
WHERE f.code = 'bellevue';
```

**优化后查询**（减少一层 JOIN）：
```sql
SELECT ci.*, c.*, cs.*, f.*
FROM course_instances ci
JOIN courses c ON ci.course_id = c.id  -- 3 层 JOIN
JOIN course_series cs ON ci.series_id = cs.id
JOIN franchises f ON cs.franchise_id = f.id
WHERE f.code = 'bellevue';
```

**性能影响**：
- ✅ **减少 JOIN 操作**：从 4 层减少到 3 层，理论上性能更好
- ⚠️ **GROUP BY 查询**：某些查询需要 GROUP BY，可能影响性能
- ✅ **索引优化**：添加适当的索引（`(series_id, course_id)`, `(course_id, series_id)`）可以优化性能

**结论**：整体性能应该更好，但需要适当的索引支持。

---

## 七、最终推荐

### 推荐方案：**方案 C（混合方案）**

#### 理由

1. **渐进式优化**：风险最小，可以随时调整方向
2. **快速改善体验**：Phase 1 的优化可以立即改善用户体验
3. **保持灵活性**：可以根据反馈决定是否完全移除 Assignment 层
4. **业务连续性**：不会对现有业务造成重大影响

#### 实施计划

**Phase 1（1-2周）**：
- 简化 Assignment 层（移除 `location_id`，添加唯一约束）
- 优化 Instance 创建流程
- 提供"快速创建 Assignment"功能

**Phase 2（2-4周）**：
- 实现批量创建 Instance 功能
- 改进 UI/UX
- 收集用户反馈

**Phase 3（1-2月后）**：
- 分析 Assignment 的使用情况
- 评估业务需求
- 决定是否完全移除 Assignment 层

---

## 八、总结

### 核心结论

1. **可以取消 Assignment 层**，但需要权衡业务灵活性和数据一致性
2. **推荐采用渐进式优化**：先简化 Assignment 层，再根据实际使用情况决定是否完全移除
3. **关键权衡**：
   - **简化流程** vs **业务灵活性**
   - **数据一致性** vs **查询性能**
   - **实施复杂度** vs **长期维护成本**

### 下一步行动

1. **评估业务需求**：确认是否真的需要"课程上架"概念和显示顺序管理
2. **分析现有数据**：统计 Assignment 的使用情况
3. **制定实施计划**：根据评估结果选择方案并制定详细计划
4. **准备迁移脚本**：如果决定完全移除，准备数据迁移脚本

---

## 附录：数据模型对比

### 当前模型（有 Assignment 层）

```sql
course_assignments (
  id,
  course_id,
  category_id,
  series_id,
  location_id,  -- 可选，默认地点
  display_order,
  is_active
)

course_instances (
  id,
  assignment_id,  -- 关联 Assignment
  location_id,    -- 可覆盖 Assignment 的 location
  ...
)
```

### 优化后模型（无 Assignment 层）

```sql
course_instances (
  id,
  course_id,      -- 直接关联 Course
  series_id,      -- 直接关联 Series (Program)
  category_id,    -- 冗余字段，从 series.category_id 获取
  location_id,    -- 直接设置地点
  display_order,  -- 用于在 Program 中的显示顺序
  ...
)
```

### 关键差异

| 特性 | 当前模型 | 优化后模型 |
|------|----------|------------|
| **工作流程** | 3 步（Course → Assignment → Instance） | 1 步（直接创建 Instance） |
| **数据层数** | 4 层（Course → Assignment → Series → Franchise） | 3 层（Course → Series → Franchise） |
| **课程上架** | 通过 Assignment.is_active | 通过 Instance 存在与否 |
| **显示顺序** | Assignment.display_order | Instance.display_order（需要聚合） |
| **查询复杂度** | 需要 JOIN Assignment | 直接查询 Instance，但需要 GROUP BY |

