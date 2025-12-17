# Assignment 状态管理分析

## 当前状态

目前 Assignment 只有一个简单的 `is_active` 布尔字段：
- `is_active = true`: Active（激活）
- `is_active = false`: Inactive（未激活）

## 业务场景分析

### 1. Assignment 的生命周期

```
创建 Assignment → 激活 → 创建 Instances → 可能有学生注册 → 课程结束 → 归档
```

### 2. 可能需要的状态

#### 方案 A：保持简单的布尔状态（推荐）

**优点**：
- 简单明了，易于理解
- 符合当前业务需求
- 不需要数据库迁移
- 性能好（布尔索引）

**缺点**：
- 无法区分"未激活"的原因（是刚创建、还是被暂停、还是已归档）
- 无法记录状态变更历史

**适用场景**：
- Assignment 主要用于"课程在 Program 中的上架记录"
- 如果 Assignment 被设置为 inactive，通常意味着：
  - 该课程不再在这个 Program 中提供
  - 或者暂时下架（但可能还会重新上架）

#### 方案 B：多状态枚举（类似 Course 的 status）

**状态定义**：
- `draft`: 草稿，刚创建但还未准备好
- `active`: 已激活，可以创建 Instances
- `suspended`: 暂停，暂时不可用（但可能恢复）
- `archived`: 已归档，不再使用

**优点**：
- 更细粒度的状态控制
- 可以区分不同的"未激活"原因
- 便于状态管理和查询

**缺点**：
- 需要数据库迁移（添加 `status` 字段，迁移 `is_active` 数据）
- 增加复杂度
- 可能过度设计（如果业务不需要这么细的区分）

**适用场景**：
- 需要区分"暂时下架"和"永久移除"
- 需要状态变更历史
- 需要更复杂的权限控制（例如：只有 `active` 的 Assignment 才能创建 Instance）

## 推荐方案

### 推荐：保持简单的布尔状态（方案 A）

**理由**：

1. **Assignment 的职责**：
   - Assignment 主要是"课程在 Program 中的上架记录"
   - 它的生命周期相对简单：要么可用，要么不可用
   - 不需要像 Course 那样复杂的状态管理（Course 需要区分 draft/published/suspended/archived）

2. **实际业务需求**：
   - 如果课程不再在某个 Program 中提供，直接设置为 `is_active = false` 即可
   - 如果需要重新上架，设置为 `is_active = true`
   - 不需要区分"暂时下架"和"永久移除"（因为 Assignment 可以随时删除）

3. **与 Course 状态的关系**：
   - Course 本身已经有 `status` 字段（draft/published/suspended/archived）
   - 如果 Course 是 `draft` 或 `archived`，不应该创建 Assignment
   - 如果 Course 是 `suspended`，Assignment 可以保持 `active`，但不会创建新的 Instance
   - Assignment 的 `is_active` 主要用于控制"该课程是否在这个 Program 中上架"

4. **简化原则**：
   - 如果简单的方案能满足需求，就不要过度设计
   - 如果将来确实需要更细粒度的状态，可以再迁移

### 如果将来需要多状态（方案 B）

如果业务发展后确实需要多状态，可以考虑：

1. **迁移策略**：
   ```sql
   -- 添加 status 字段
   ALTER TABLE course_assignments 
   ADD COLUMN status VARCHAR(20) DEFAULT 'active';
   
   -- 迁移现有数据
   UPDATE course_assignments 
   SET status = CASE 
     WHEN is_active THEN 'active' 
     ELSE 'archived' 
   END;
   
   -- 添加约束
   ALTER TABLE course_assignments 
   ADD CONSTRAINT course_assignments_status_check 
   CHECK (status IN ('draft', 'active', 'suspended', 'archived'));
   
   -- 可选：移除 is_active 字段（或保留作为冗余）
   ```

2. **状态转换规则**：
   - `draft` → `active`: 准备就绪，可以创建 Instances
   - `active` → `suspended`: 暂时下架
   - `suspended` → `active`: 重新上架
   - `active` / `suspended` → `archived`: 永久移除
   - `archived` → 不允许转换（需要重新创建）

3. **业务逻辑**：
   - 只有 `active` 的 Assignment 可以创建新的 Instance
   - `suspended` 的 Assignment 的现有 Instance 仍然有效，但不能创建新的
   - `archived` 的 Assignment 不能创建 Instance，现有 Instance 仍然保留（历史记录）

## 结论

**当前推荐：保持 `is_active` 布尔字段**

- 简单、清晰、满足当前需求
- 如果将来需要更细粒度的状态，可以再迁移到多状态枚举
- 避免过度设计

**如果将来需要多状态**：
- 参考 Course 的 `status` 设计
- 使用 `draft` / `active` / `suspended` / `archived` 四个状态
- 添加状态转换验证和业务逻辑

