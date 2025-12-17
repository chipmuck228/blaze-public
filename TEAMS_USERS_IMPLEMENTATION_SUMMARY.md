# Teams 和 Users 表关联实施总结

## ✅ 已完成的工作

### 1. 数据库迁移脚本
- ✅ 创建了 `migrate-teams-link-users.sql` 迁移脚本
- ✅ 添加 `user_id` 字段到 Teams 表
- ✅ 添加 `is_featured`、`is_active`、`bio` 字段
- ✅ 创建唯一约束和触发器验证
- ✅ 提供数据迁移辅助函数

### 2. TypeScript 接口更新
- ✅ 更新 `TeamMember` 接口，添加：
  - `user_id?: string | null`
  - `bio?: string`
  - `is_featured?: boolean`
  - `is_active?: boolean`
  - `user?: { id, name, email, image, role }`（关联的 Users 信息）

### 3. 数据库函数更新
- ✅ `getAllTeamMembers()`：公开 API，只返回激活的、在首页展示的团队成员，JOIN Users 表
- ✅ `getAllTeamMembersForAdmin()`：Admin API，返回所有状态的团队成员，JOIN Users 表
- ✅ `createTeamMember()`：支持 `user_id`，验证用户是 coach，检查是否已有 Teams 记录
- ✅ `updateTeamMember()`：支持更新 `user_id`、`is_featured`、`is_active`、`bio` 等字段

### 4. API 路由更新
- ✅ `GET /api/admin/teams`：使用 `getAllTeamMembersForAdmin()` 返回所有 Teams 记录（包括关联的 Users 信息）
- ✅ `POST /api/admin/teams`：支持 `user_id`、`is_featured`、`is_active`、`bio` 字段
- ✅ `PATCH /api/admin/teams/[id]`：支持更新所有新字段

### 5. Admin UI 更新

#### Teams Management 页面
- ✅ 显示 "User" 列，展示关联的 Users 信息（name, email）
- ✅ 显示 "Status" 列，展示 `is_featured` 和 `is_active` 状态
- ✅ 更新 `TeamMember` 接口以支持新字段

#### User Management 页面
- ✅ 显示 coach 用户是否有 Teams 记录（"Has Team Profile" / "No Team Profile" badge）
- ✅ 在 dropdown menu 中提供 "Create Team Profile" 或 "View Team Profile" 链接
- ✅ 自动获取 Teams 信息并关联到 Users

## 📋 待完成的工作

### 1. 数据库迁移（需要手动执行）
- ⚠️ **重要**：在 Supabase SQL Editor 中运行 `migrate-teams-link-users.sql`
- ⚠️ **数据迁移**：为现有的 Teams 记录创建或关联 Users 记录
  - 可以使用脚本中的 `migrate_team_to_user()` 函数
  - 或者手动为每个 Teams 记录创建对应的 Users 记录

### 2. TeamEditDialog 组件更新（可选但推荐）
- ⚠️ 添加 `user_id` 选择器（下拉选择 coach 用户）
- ⚠️ 添加 `is_featured` 和 `is_active` 复选框
- ⚠️ 添加 `bio` 文本域
- ⚠️ 如果选择了 `user_id`，自动填充 `name` 和 `image_url`（从 Users 表）

### 3. Teams Management 页面增强（可选）
- ⚠️ 支持从 User Management 页面跳转并预填充 `user_id`
- ⚠️ 添加筛选功能（按 `is_featured`、`is_active`、是否有 `user_id` 筛选）

### 4. 数据迁移验证
- ⚠️ 验证所有 Teams 记录都有对应的 Users 记录（如果 `user_id` 不为 NULL）
- ⚠️ 验证所有 `user_id` 对应的用户都是 coach
- ⚠️ 验证没有重复的 `user_id`

## 🔧 使用说明

### 创建新的 Team Member（推荐方式）

1. **先创建 Coach 用户**（在 User Management 中）：
   - 创建用户，设置 `role = 'coach'`
   - 填写 name, email, password 等信息

2. **创建 Team Profile**（在 Team Management 中）：
   - 点击 "Add Team Member"
   - 选择 `user_id`（从下拉列表中选择 coach 用户）
   - 填写 `position`、`description`、`bio` 等信息
   - 设置 `is_featured = true`（如果要在首页展示）
   - 设置 `is_active = true`

### 从 User Management 创建 Team Profile

1. 在 User Management 页面找到 coach 用户
2. 点击 dropdown menu
3. 选择 "Create Team Profile"
4. 会自动跳转到 Team Management 页面，并预填充 `user_id`

## 📝 注意事项

1. **向后兼容**：
   - 如果 `user_id` 为 NULL，仍然可以使用 `name` 和 `image_url`（向后兼容）
   - 但推荐所有新的 Teams 记录都关联 Users 记录

2. **数据一致性**：
   - 触发器会确保 `user_id` 对应的用户是 coach
   - 唯一约束确保一个 coach 只能有一条 Teams 记录

3. **首页展示**：
   - 只有 `is_active = true` 且 `is_featured = true` 的 Teams 记录会在首页展示
   - `getAllTeamMembers()` 会自动过滤这些条件

4. **数据优先级**：
   - 如果 `user_id` 存在，优先使用 Users 表的 `name` 和 `image`
   - 如果 `user_id` 为 NULL，使用 Teams 表的 `name` 和 `image_url`

## 🚀 下一步

1. **立即执行**：运行数据库迁移脚本
2. **数据迁移**：为现有 Teams 记录创建或关联 Users 记录
3. **测试**：验证创建、更新、删除 Teams 记录的功能
4. **可选增强**：更新 TeamEditDialog 组件以支持新字段

