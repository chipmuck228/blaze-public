# Franchise-Aware API 设计清单

本文档在现有 API 体系基础上，补充 **Franchise / Location 多租户支持** 的设计。目标：在不破坏现有功能的前提下，让所有与课程、实例、注册相关的 API 都能按 `franchise` 精确过滤。

---

## 1. Franchise 上下文传递方式

### 1.1 参数形式

API 层统一支持两类参数（至少其一）：

- **`franchise_code`**（推荐对外使用）：
  - 如：`?franchise_code=bellevue`
  - 从路由（`/[franchiseCode]/...`）或子域名解析后注入
- **`franchise_id`**（内部使用）：
  - 如：`?franchise_id=uuid`
  - 在服务端已经解析过 `franchise_code` 时，直接用 id 查询，避免二次 lookup

优先级建议：

1. 如果有 `franchise_id`，直接使用
2. 否则如果有 `franchise_code`，先查 `franchises` 表得到 `id`
3. 否则退回默认 franchise（如 `bellevue` 或 `default`），或返回错误（视场景决定）

---

## 2. Public 课程相关 API

### 2.1 `GET /api/courses/featured`

**用途**：首页 Featured Courses 模块（按 franchise 展示本地可报课程）

**新增参数**：

- `franchise_code`（可选，但在多 franchise 模式下建议必填）

**行为**：

- 解析 `franchise_id`
- 查询逻辑（示意）：
  - 找出在该 franchise 下有 **active instances** 的课程
  - 按某种排序（如热门 / 发布时间）取前 `N` 个

**过滤重点**：

- `course_instances.franchise_id = :franchise_id`
- 只统计 `is_active = true`、`status IN ('scheduled','ongoing')` 的实例

---

### 2.2 `GET /api/courses/[id]`

**用途**：获取单门课程的详细信息（与 franchise 无强绑定）

**新增参数**（Query）：

- `franchise_code`（可选）

**行为**：

- 课程内容本身（`courses`）依然是全局的
- 若提供 `franchise_code`，可在返回的 `assignments` / `instances` 部分中：
  - 只返回该 franchise 下的 assignments / instances，或
  - 标记哪些 assignments / instances 属于当前 franchise

**过滤点**（可选）：

- `course_instances.franchise_id = :franchise_id`

---

### 2.3 `GET /api/courses/[id]/instances`

**用途**：获取某课程在当前 franchise 下的所有实例（用于 Enroll 对话框）

**新增参数**：

- `franchise_code` 或 `franchise_id`（推荐必填）

**行为**：

- 只返回 `course_instances.course_id = :course_id` 且 `franchise_id = :franchise_id` 的实例
- 过滤掉已过期或 `is_active = false` 的实例

**过滤点**：

- `course_instances.franchise_id = :franchise_id`
- `is_active = true`
- `status IN ('scheduled','ongoing')`

---

## 3. 用户端注册相关 API (`/api/enrollments/*`)

### 3.1 `GET /api/enrollments/cart`

**用途**：获取当前用户的购物车

**Franchise 语义**：

- 一个用户可以在多个 franchise 有不同的 cart 项
- 该接口可：
  - 返回所有 franchise 的 cart（当前实现）
  - 或增加参数只看某个 franchise：
    - `?franchise_code=bellevue`

**新增参数**：

- `franchise_code`（可选）

**过滤点**：

- 若提供 `franchise_id`：`course_enrollments.franchise_id = :franchise_id`
- 始终：`user_id = session.user.id`、`status = 'cart'`

---

### 3.2 `POST /api/enrollments/cart`

**用途**：将课程实例加入购物车

**已知输入**：

- `instance_id`：该实例已经有 `franchise_id`

**Franchise 行为**：

- 由后端自动从 `course_instances.franchise_id` 带出 `enrollment.franchise_id`
- 前端无需传 `franchise_code`，但可以用于校验：instance 是否属于当前子站

**写入规则**：

- `course_enrollments.franchise_id = course_instances.franchise_id`

---

### 3.3 `GET /api/enrollments/waitlist`

**用途**：获取当前用户的等待列表

**新增参数**：

- `franchise_code`（可选）

**过滤点**：

- `user_id = session.user.id`
- `status = 'waitlisted'`
- 可选：`franchise_id = :franchise_id`

---

### 3.4 `GET /api/enrollments`

**用途**：获取当前用户所有注册记录（用于 Profile -> My Courses）

**新增参数**：

- `franchise_code`（可选）
- 已有 `status`（保留）

**过滤点**：

- `user_id = session.user.id`
- 若有 `status`：`status = :status`
- 若有 `franchise_id`：`franchise_id = :franchise_id`

---

## 4. Admin 端注册与实例管理 API

### 4.1 `GET /api/admin/enrollments`

**用途**：管理员查看所有 enrollment（已实现基础功能）

**新增 / 明确参数**：

- `franchise_id` 或 `franchise_code`（可选）
- `status`, `payment_status`, `user_id`, `instance_id`, `course_id`, `start_date`, `end_date`, `search`, `page`, `limit`, `sort_by`, `sort_order`（现有设计基础上）

**行为**：

- Global admin：
  - 未指定 franchise 时：可查看所有 franchise
  - 指定 franchise：只看该 franchise
- 将来如果有 franchise admin：
  - 必须限定在其被授权的 `franchise_id` 集合内

**过滤点**：

- `course_enrollments.franchise_id = :franchise_id`（如提供或由 admin 角色限定）

---

### 4.2 `GET /api/admin/enrollments/stats`

**用途**：Admin Dashboard 统计卡片

**新增参数**：

- `franchise_id` 或 `franchise_code`（可选）

**行为**：

- Global admin：可以按 franchise 聚合，也可以全局聚合
- Franchise admin：只统计自己 franchise 的数据

**过滤点**：

- 若提供 `franchise_id`：所有统计查询都带 `WHERE franchise_id = :franchise_id`
- 若不提供且为 Global admin：可做全局统计 + 按 franchise 拆分（未来扩展）

---

### 4.3 `GET /api/admin/instances`

**用途**：Admin Instances 管理页面

**新增参数**：

- `franchise_id` 或 `franchise_code`（可选）
- 已有 `assignmentId`（保留）

**行为**：

- 在返回实例列表时过滤：
  - `course_instances.franchise_id = :franchise_id`（如果指定）
  - 或：若未来有 franchise admin，自动根据角色限定

---

### 4.4 `POST /api/admin/instances`

**用途**：创建新课程实例

**Franchise 行为**：

- `location_id` 已经带有 `franchise_id`
- 创建时：
  - 强制查询 `course_locations.franchise_id`，填入 `course_instances.franchise_id`
  - 若 `location_id` 为空，但有 `franchise_id`（来自 admin 选择），则直接使用该 `franchise_id`

**防错建议**：

- 不允许在不同 franchise 的 `course_assignment` 和 `location` 组合下创建 instance（可通过触发器或 API 校验）

---

## 5. Coach 端 API (`/api/coach/*`)

### 5.1 `GET /api/coach/instances`

**用途**：教练查看自己的课程实例列表

**Franchise 行为**：

- 一个教练可以属于多个 franchise（未来通过 `user_franchises` 管理）
- 当前可简单策略：
  - 通过 `course_instances` 的 `franchise_id` 过滤教练可见的实例
  - 若未来引入 `user_franchises`，则：
    - `course_instances.franchise_id IN coach_franchises`

---

### 5.2 `GET /api/coach/instances/[id]`

**用途**：教练查看单个实例详情

**Franchise 行为**：

- 除了现有的「是否是该实例教练」检查外，可增加：
  - 该实例的 `franchise_id` 是否在教练所管 franchise 范围内

---

## 6. 用户 / Franchise 关系（未来扩展）

### 6.1 管理员与 Franchise

将来扩展时，可以通过新增表管理：

```sql
user_franchises
- id: UUID (PK)
- user_id: UUID (FK -> users.id)
- franchise_id: UUID (FK -> franchises.id)
- role: ENUM('owner','franchise_admin','staff','coach','support')
- created_at: TIMESTAMP
- UNIQUE(user_id, franchise_id)
```

API 授权逻辑（概念）：

- Global admin：`users.role = 'admin'`，不受 `user_franchises` 限制
- Franchise admin：在 `/api/admin/*` 下，只能操作 `franchise_id ∈ user_franchises` 的数据

---

## 7. 实施优先级建议

1. **第一步（必须）**：
   - 在 `courses` / `instances` / `enrollments` 相关 API 内部，统一支持 `franchise_id` 参数并带上过滤
   - 对外先提供 `franchise_code`，在 handler 内解析为 `id`

2. **第二步（Admin / Coach）**：
   - `GET /api/admin/enrollments` 和 `GET /api/admin/enrollments/stats` 增加 `franchise` 过滤逻辑
   - `GET /api/admin/instances` 增加 `franchise` 过滤逻辑

3. **第三步（Public 路由）**：
   - 在 `/[franchise]/...` 路由中解析 `franchise_code` 并注入到上述 API 调用中

4. **第四步（角色绑定）**：
   - 引入 `user_franchises`，逐步为教练和 franchise admin 配置所属 franchise，并在 API 中使用

本清单只描述 API 行为和参数设计，不涉及具体实现代码，后续可以按优先级分批落地。+

