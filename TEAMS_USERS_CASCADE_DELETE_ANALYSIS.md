# Teams 和 Users 表级联删除行为分析

## 一、当前数据库设计

### 1.1 外键约束

根据 `migrate-teams-link-users.sql`，Teams 表的 `user_id` 字段设置了以下约束：

```sql
ALTER TABLE teams 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
```

**关键点**：
- `REFERENCES users(id)`: Teams 表的 `user_id` 引用 Users 表的 `id`
- `ON DELETE CASCADE`: 当 Users 表中的记录被删除时，**自动删除**关联的 Teams 记录

### 1.2 关系说明

```
Users (父表)
  ↓ (1:1)
Teams (子表，通过 user_id 关联)
  ↓ (1:N)
team_social_networks (子表，通过 team_id 关联，ON DELETE CASCADE)
```

## 二、级联删除行为

### 2.1 场景 1：删除 Teams 记录

**问题**：如果删除了 Teams 中的某一个 Teams 记录，Users 的 profile 是否会同步删除？

**答案**：**不会**

**原因**：
- Teams 表是**子表**，Users 表是**父表**
- 外键约束是单向的：`Teams.user_id → Users.id`
- 删除子表（Teams）的记录**不会影响**父表（Users）的记录
- Users 表中的用户记录会**保留**，只是 Teams 表中的展示信息被删除

**影响**：
- ✅ Users 表中的用户记录不受影响
- ✅ 用户仍然可以登录系统
- ❌ 首页不再显示该 coach（Teams 记录被删除）
- ❌ 如果用户想重新在首页展示，需要重新创建 Teams 记录

### 2.2 场景 2：删除 Users 记录

**问题**：如果删除了 Users 中的某一个用户，Teams 中的 user 绑定是不是会同步删除？

**答案**：**会（自动级联删除）**

**原因**：
- 外键约束设置了 `ON DELETE CASCADE`
- 当删除 Users 表中的记录时，PostgreSQL 会**自动删除**所有引用该用户的 Teams 记录
- 同时，由于 `team_social_networks` 表也设置了 `ON DELETE CASCADE`，社交媒体链接也会被自动删除

**影响**：
- ✅ Teams 记录被自动删除（级联）
- ✅ team_social_networks 记录被自动删除（级联）
- ❌ 用户无法登录系统
- ❌ 首页不再显示该 coach
- ⚠️ **数据丢失**：Teams 表中的展示信息（position, description, bio 等）会永久丢失

## 三、潜在问题分析

### 3.1 问题 1：数据丢失风险

**场景**：
- Admin 误删了 Users 表中的 coach 用户
- 由于 `ON DELETE CASCADE`，关联的 Teams 记录也被自动删除
- Teams 表中的展示信息（position, description, bio, social_networks）**永久丢失**

**影响**：
- 如果只是误操作，需要重新创建用户和 Teams 记录
- 历史展示信息无法恢复

### 3.2 问题 2：业务逻辑不一致

**场景**：
- 删除 Teams 记录：用户仍然存在，可以登录，但不在首页展示
- 删除 Users 记录：用户被删除，Teams 记录也被删除，无法登录，不在首页展示

**问题**：
- 两种删除方式的影响不同
- 可能造成混淆

## 四、优化方案

### 方案 A：改为 ON DELETE SET NULL（推荐）

**设计理念**：
- 删除 Users 记录时，**不清除** Teams 记录
- 只将 Teams 记录的 `user_id` 设置为 `NULL`
- 保留 Teams 表中的展示信息（向后兼容）

**优点**：
- ✅ 保留历史数据（Teams 展示信息）
- ✅ 可以恢复（重新关联 user_id）
- ✅ 向后兼容（支持没有 user_id 的 Teams 记录）

**缺点**：
- ⚠️ Teams 记录可能变成"孤儿"记录（user_id 为 NULL）
- ⚠️ 需要额外的业务逻辑处理 NULL 情况

**实施**：
```sql
-- 修改外键约束
ALTER TABLE teams 
  DROP CONSTRAINT IF EXISTS teams_user_id_fkey;

ALTER TABLE teams 
  ADD CONSTRAINT teams_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES users(id) 
  ON DELETE SET NULL;
```

### 方案 B：保持 ON DELETE CASCADE + 添加警告

**设计理念**：
- 保持当前的 `ON DELETE CASCADE` 行为
- 在删除 Users 记录前，检查是否有关联的 Teams 记录
- 在 UI 中显示警告，要求 Admin 确认

**优点**：
- ✅ 数据一致性（不会出现孤儿记录）
- ✅ 自动清理关联数据

**缺点**：
- ❌ 数据丢失风险（Teams 展示信息）
- ❌ 无法恢复

**实施**：
- 在 `deleteUser` 函数中检查关联的 Teams 记录
- 在 Admin UI 中显示警告信息
- 要求 Admin 确认删除

### 方案 C：软删除（Soft Delete）

**设计理念**：
- 不真正删除 Users 和 Teams 记录
- 添加 `deleted_at` 字段标记删除
- 查询时过滤已删除的记录

**优点**：
- ✅ 可以恢复数据
- ✅ 保留完整历史记录
- ✅ 支持审计

**缺点**：
- ⚠️ 需要修改所有查询逻辑
- ⚠️ 数据库会积累"已删除"的数据

## 五、推荐方案

### 推荐：方案 A（ON DELETE SET NULL）+ 方案 B（删除前警告）

**组合方案**：
1. **修改外键约束**为 `ON DELETE SET NULL`
2. **在删除 Users 前检查**关联的 Teams 记录
3. **在 UI 中显示警告**，告知 Admin 删除用户会影响 Teams 展示
4. **提供选项**：删除用户时，可以选择是否同时删除 Teams 记录

**实施步骤**：
1. 修改外键约束（`ON DELETE SET NULL`）
2. 更新 `deleteUser` 函数，检查关联的 Teams 记录
3. 更新 Admin UI，显示警告和选项
4. 可选：提供"删除用户并保留 Teams 记录"和"删除用户并删除 Teams 记录"两个选项

## 六、当前行为总结

### 删除 Teams 记录
- ✅ **不会**删除 Users 记录
- ✅ 用户仍然可以登录
- ❌ 首页不再显示该 coach
- ✅ 可以重新创建 Teams 记录恢复展示

### 删除 Users 记录
- ✅ **会自动删除**关联的 Teams 记录（CASCADE）
- ✅ **会自动删除**关联的 team_social_networks 记录（CASCADE）
- ❌ 用户无法登录
- ❌ Teams 展示信息**永久丢失**
- ⚠️ **数据丢失风险**

## 七、建议

1. **短期**：在删除 Users 记录前，添加警告提示，告知 Admin 会同时删除 Teams 记录
2. **中期**：考虑修改为 `ON DELETE SET NULL`，保留 Teams 展示信息
3. **长期**：考虑实现软删除（Soft Delete）机制

## 八、修改外键约束的 SQL 脚本

如果需要修改为 `ON DELETE SET NULL`：

```sql
-- ==================== 修改 Teams 表外键约束 ====================
-- 从 ON DELETE CASCADE 改为 ON DELETE SET NULL

-- 删除现有约束
ALTER TABLE teams 
  DROP CONSTRAINT IF EXISTS teams_user_id_fkey;

-- 添加新约束（ON DELETE SET NULL）
ALTER TABLE teams 
  ADD CONSTRAINT teams_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES users(id) 
  ON DELETE SET NULL;

-- 验证
-- SELECT 
--   conname AS constraint_name,
--   contype AS constraint_type,
--   pg_get_constraintdef(oid) AS constraint_definition
-- FROM pg_constraint
-- WHERE conrelid = 'teams'::regclass
--   AND conname = 'teams_user_id_fkey';
```

