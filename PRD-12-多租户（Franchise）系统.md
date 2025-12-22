# PRD-12: 多租户（Franchise）系统

**版本**: 1.0  
**日期**: 2025-12  
**状态**: 已实施（部分功能）

---

## 1. 概述

### 1.1 文档目的

本文档描述 Blaze Robotics Academy 多租户（Franchise）系统的功能需求，包括 Franchise 架构设计、Franchise 创建与配置、品牌定制（Branding Config）、数据隔离机制和路径与子域名支持等核心功能。

### 1.2 核心价值

- **统一品牌，本地化体验**：所有分站共享同一套代码和品牌形象，但提供本地化的课程和内容
- **数据隔离，精准展示**：每个 Franchise 的数据独立管理，用户只看到相关的内容
- **灵活扩展**：新增 Franchise 无需修改代码，只需配置数据
- **用户体验优化**：智能引导用户选择 Location，记住用户偏好，减少操作步骤

### 1.3 系统组成

多租户系统由以下核心模块组成：
1. **Franchise 管理**：Franchise 的创建、配置和管理
2. **品牌定制**：每个 Franchise 的品牌配置（Branding Config）
3. **数据隔离**：Franchise 数据的隔离和过滤机制
4. **路径路由**：基于路径的 Franchise 路由（`/locations/[code]`）
5. **子域名支持**（未来）：基于子域名的 Franchise 路由

---

## 2. 用户角色与场景

### 2.1 用户角色

| 角色 | 描述 | 主要使用场景 |
|------|------|------------|
| **访客（未登录）** | 浏览网站、查看课程信息 | 选择 Location、浏览课程、查看课程详情 |
| **注册用户** | 已注册的学生/家长 | 浏览课程、报名、查看个人资料 |
| **管理员** | HQ 或 Franchise 管理员 | 管理所有 Franchise 的数据、用户、课程 |
| **教练** | 各 Franchise 的教练 | 查看分配的课程、管理课程实例 |

### 2.2 核心使用场景

#### 场景 1: 新用户首次访问
1. 用户访问 HQ 首页 (`/`)
2. 看到品牌介绍和 "Choose Your Location" 区块
3. 选择所在城市（如 Bellevue）
4. 跳转到 `/locations/bellevue` 查看本地课程
5. 点击 "View Programs" 进入课程目录

#### 场景 2: 用户直接访问课程目录
1. 用户直接访问 `/course-catalog`（未选择 Location）
2. 看到引导 Banner："Find courses near you"
3. 通过 Location 筛选器选择 Location
4. 系统记住用户偏好，下次访问自动应用

#### 场景 3: 用户从 Location 页面进入
1. 用户访问 `/locations/bellevue`
2. 看到 Bellevue Campus 的本地化内容
3. 点击 "View Programs" 进入 `/course-catalog?franchise=bellevue`
4. 只显示 Bellevue 的课程和实例

#### 场景 4: 管理员管理 Franchise
1. 管理员访问 `/admin/franchises`
2. 创建新 Franchise
3. 配置 Franchise 基本信息
4. 配置品牌定制（Branding Config）
5. 关联地点到 Franchise

---

## 3. 功能需求

### 3.1 Franchise 管理

#### 3.1.1 Franchise 列表
- **位置**：`/admin/franchises`
- **显示内容**：
  - Franchise 代码（Code）
  - Franchise 名称
  - 状态（Active/Inactive）
  - 关联的地点数
  - 创建时间
  - 操作按钮（Edit, Delete）
- **功能**：
  - 搜索（按代码、名称）
  - 筛选（按状态）
  - 排序（按创建时间、名称）

#### 3.1.2 创建 Franchise
- **功能**：
  - 输入 Franchise 代码（Code，必填，唯一）
  - 输入 Franchise 名称（必填）
  - 设置状态（Active/Inactive）
  - 配置品牌定制（Branding Config）：
    - Hero 区域（标题、描述）
    - Highlights（项目、时间表、焦点）
    - Contact 信息（地址、电话、邮箱、营业时间）
- **验证**：
  - Code 必须唯一
  - Code 必须符合 URL 规范（小写字母、数字、连字符）
  - 名称不能为空

#### 3.1.3 编辑 Franchise
- **功能**：
  - 修改基本信息（名称、状态）
  - 更新品牌定制配置
  - 管理关联的地点
- **限制**：
  - Code 不能修改（一旦创建不能更改）

#### 3.1.4 删除 Franchise
- **功能**：
  - 删除 Franchise（需要确认）
- **限制**：
  - 删除前检查是否有关联的地点
  - 删除前检查是否有关联的课程实例

### 3.2 品牌定制（Branding Config）

#### 3.2.1 Hero 区域配置
- **功能**：
  - Hero 标题（Title）
  - Hero 描述（Description）
  - 自定义 Logo（可选）
  - 背景图片（可选）
- **回退机制**：
  - 如果未配置，使用 Franchise 名称作为标题
  - 如果未配置描述，使用默认描述

#### 3.2.2 Highlights 配置
- **功能**：
  - Programs（项目介绍）
  - Schedule（时间表说明）
  - Focus（焦点说明）
- **回退机制**：
  - 如果未配置，使用默认内容

#### 3.2.3 Contact 信息配置
- **功能**：
  - 地址（Address）：
    - Street（街道）
    - City（城市）
    - State（州）
    - Zip（邮编）
  - 电话（Phone）
  - 邮箱（Email）
  - 营业时间（Business Hours）
- **回退机制**：
  - 如果未配置，使用关联地点的信息
  - 如果地点也没有，显示 Franchise 名称

### 3.3 数据隔离机制

#### 3.3.1 课程实例过滤
- **规则**：
  - 课程实例（Instance）通过 `location.franchise_id` 关联到 Franchise
  - 查询时过滤 `franchise_id` 匹配的实例
  - 如果 `franchise_id` 为 `null`，显示在所有 Franchise（向后兼容）
- **实现**：
  ```sql
  SELECT * FROM course_instances ci
  JOIN course_locations cl ON ci.location_id = cl.id
  WHERE cl.franchise_id = :franchise_id
     OR cl.franchise_id IS NULL  -- 向后兼容
  ```

#### 3.3.2 课程分配过滤
- **规则**：
  - 课程分配（Assignment）通过 `location.franchise_id` 关联到 Franchise
  - 查询时过滤 `franchise_id` 匹配的分配
- **实现**：
  ```sql
  SELECT * FROM course_assignments ca
  JOIN course_locations cl ON ca.location_id = cl.id
  WHERE cl.franchise_id = :franchise_id
  ```

#### 3.3.3 地点过滤
- **规则**：
  - 地点（Location）通过 `franchise_id` 关联到 Franchise
  - 查询时过滤 `franchise_id` 匹配的地点
- **实现**：
  ```sql
  SELECT * FROM course_locations
  WHERE franchise_id = :franchise_id
  ```

### 3.4 路径路由

#### 3.4.1 Location 页面路由
- **路径格式**：`/locations/[code]`
- **功能**：
  - 根据 `code` 查询 Franchise
  - 显示 Franchise 的本地化内容
  - 显示该 Franchise 的特色课程
  - 显示该 Franchise 的联系信息
- **实现**：
  ```typescript
  // src/app/locations/[code]/page.tsx
  const franchise = await getFranchiseDetailsByCode(code)
  const locations = await getFranchiseLocations(franchise.id)
  ```

#### 3.4.2 课程目录过滤
- **URL 参数**：`?franchise=[code]`
- **功能**：
  - 根据 `franchise` 参数过滤课程
  - 只显示该 Franchise 的课程实例
  - 记住用户偏好（localStorage）
- **实现**：
  ```typescript
  const franchiseCode = searchParams.get('franchise')
  if (franchiseCode) {
    // 过滤课程实例
    instances = instances.filter(inst => 
      inst.location?.franchise_id === franchiseId
    )
  }
  ```

#### 3.4.3 用户偏好记忆
- **功能**：
  - 用户选择 Location 后，保存到 localStorage
  - 下次访问自动应用偏好
  - 用户可以清除偏好
- **实现**：
  ```typescript
  // 保存偏好
  localStorage.setItem('preferred_location', franchiseCode)
  
  // 读取偏好
  const preferredLocation = localStorage.getItem('preferred_location')
  ```

### 3.5 子域名支持（未来）

#### 3.5.1 子域名路由
- **格式**：`[code].blazerobotics.com`
- **功能**：
  - 根据子域名自动识别 Franchise
  - 重定向到对应的 Location 页面
  - 或直接显示该 Franchise 的内容
- **实现**（未来）：
  ```typescript
  // middleware.ts
  const subdomain = request.headers.get('host')?.split('.')[0]
  if (subdomain && subdomain !== 'www') {
    // 重定向到 /locations/[subdomain]
    return NextResponse.redirect(`/locations/${subdomain}`)
  }
  ```

---

## 4. 数据模型

### 4.1 核心数据表

#### 4.1.1 franchises（Franchise 表）
- `id`: Franchise ID（UUID）
- `code`: Franchise 代码（唯一，URL 友好）
- `name`: Franchise 名称
- `branding_config`: 品牌定制配置（JSONB）
- `is_active`: 是否激活
- `created_at`: 创建时间
- `updated_at`: 更新时间

#### 4.1.2 branding_config 结构
```json
{
  "hero": {
    "title": "Bellevue Campus",
    "description": "Local robotics programs..."
  },
  "highlights": {
    "programs": "Age-appropriate robotics...",
    "schedule": "After-school and weekend...",
    "focus": "Hands-on learning..."
  },
  "contact": {
    "address": {
      "street": "123 Main St",
      "city": "Bellevue",
      "state": "WA",
      "zip": "98004"
    },
    "phone": "+1-425-123-4567",
    "email": "bellevue@blazerobotics.com",
    "businessHours": "Mon-Fri: 9am-6pm"
  }
}
```

#### 4.1.3 course_locations（地点表）
- `id`: Location ID
- `name`: 地点名称
- `address`: 地址
- `city`: 城市
- `state`: 州
- `zip_code`: 邮编
- `franchise_id`: 关联的 Franchise ID（外键）
- `email`: 邮箱
- `phone`: 电话

#### 4.1.4 course_instances（课程实例表）
- `id`: Instance ID
- `assignment_id`: Assignment ID
- `location_id`: Location ID（通过 Location 关联到 Franchise）
- `start_date`: 开始日期
- `end_date`: 结束日期
- `start_time`: 开始时间
- `end_time`: 结束时间
- `max_students`: 最大学生数
- `status`: 状态

---

## 5. API 设计

### 5.1 Franchise 管理 API

#### 5.1.1 获取 Franchise 列表
```
GET /api/admin/franchises

Query Parameters:
- is_active?: boolean
- search?: string

Response:
{
  "franchises": Franchise[],
  "total": number
}
```

#### 5.1.2 获取 Franchise 详情
```
GET /api/admin/franchises/[id]

Response:
{
  "franchise": Franchise,
  "locations": CourseLocation[]
}
```

#### 5.1.3 根据 Code 获取 Franchise
```
GET /api/public/franchises/[code]

Response:
{
  "franchise": Franchise,
  "locations": CourseLocation[]
}
```

#### 5.1.4 创建 Franchise
```
POST /api/admin/franchises

Request:
{
  "code": string,
  "name": string,
  "is_active": boolean,
  "branding_config": BrandingConfig
}

Response:
{
  "success": boolean,
  "franchise": Franchise
}
```

#### 5.1.5 更新 Franchise
```
PATCH /api/admin/franchises/[id]

Request:
{
  "name"?: string,
  "is_active"?: boolean,
  "branding_config"?: BrandingConfig
}

Response:
{
  "success": boolean,
  "franchise": Franchise
}
```

#### 5.1.6 删除 Franchise
```
DELETE /api/admin/franchises/[id]

Response:
{
  "success": boolean
}
```

### 5.2 公开 API

#### 5.2.1 获取所有活跃的 Franchises
```
GET /api/public/franchises

Response:
{
  "franchises": Franchise[]
}
```

#### 5.2.2 获取 Franchise 的特色课程
```
GET /api/public/franchises/[code]/featured-courses

Response:
{
  "courses": Course[]
}
```

---

## 6. UI/UX 设计

### 6.1 Location 页面设计

#### 6.1.1 Hero 区域
- **显示内容**：
  - Hero 标题（来自 Branding Config 或 Franchise 名称）
  - Hero 描述（来自 Branding Config 或默认描述）
  - 主要地址（来自 Branding Config 或 Location）
  - CTA 按钮（"View Activities", "Contact Us"）

#### 6.1.2 Highlights 卡片
- **显示内容**：
  - Programs（项目介绍）
  - Schedule（时间表说明）
  - Focus（焦点说明）

#### 6.1.3 特色课程
- **显示内容**：
  - 该 Franchise 的特色课程列表
  - 课程卡片（名称、描述、价格）
  - "View All Courses" 链接

#### 6.1.4 Contact 信息
- **显示内容**：
  - 地址（带 Google Maps 链接）
  - 电话（可点击拨打）
  - 邮箱（可点击发送邮件）
  - 营业时间

### 6.2 课程目录过滤

#### 6.2.1 Location 筛选器
- **位置**：课程目录页面顶部
- **功能**：
  - 下拉选择 Location
  - 显示 "All Locations" 选项
  - 记住用户选择
  - 实时过滤课程

#### 6.2.2 引导 Banner
- **显示条件**：用户未选择 Location
- **内容**：
  - "Find courses near you"
  - Location 选择器
  - 提示信息

---

## 7. 业务规则

### 7.1 Franchise 规则
- Code 必须唯一
- Code 必须符合 URL 规范（小写字母、数字、连字符）
- Code 一旦创建不能修改
- 删除 Franchise 前需要先删除关联的地点

### 7.2 数据隔离规则
- 课程实例通过 Location 关联到 Franchise
- 查询时只返回匹配的 Franchise 的数据
- `franchise_id` 为 `null` 的数据显示在所有 Franchise（向后兼容）

### 7.3 品牌定制规则
- 如果 Branding Config 未配置，使用默认值
- 如果 Branding Config 部分配置，使用配置的值，其他使用默认值
- Contact 信息优先使用 Branding Config，其次使用 Location 信息

---

## 8. 非功能需求

### 8.1 性能要求
- Location 页面加载时间 < 2 秒
- 课程过滤响应时间 < 500ms
- 品牌配置缓存（可选）

### 8.2 安全要求
- Franchise 管理需要 Admin 权限
- 公开 API 不需要认证
- 数据隔离验证

### 8.3 可用性要求
- 响应式设计
- 清晰的 Location 选择
- 用户偏好记忆

---

## 9. 验收标准

### 9.1 功能验收
- ✅ 可以创建和管理 Franchise
- ✅ 可以配置品牌定制
- ✅ 数据隔离正确
- ✅ Location 页面正确显示
- ✅ 课程过滤正确

### 9.2 数据完整性
- ✅ Franchise 数据正确关联
- ✅ 品牌配置正确应用
- ✅ 数据隔离机制有效

---

## 10. 实施状态

### 10.1 已完成功能（✅）
- ✅ Franchise 基本管理
- ✅ 品牌定制配置（部分）
- ✅ Location 页面路由
- ✅ 课程目录过滤
- ✅ 用户偏好记忆

### 10.2 部分完成功能（⚠️）
- ⚠️ 品牌定制配置（Hero、Highlights 已实现，Contact 部分实现）
- ⚠️ 数据隔离（基本实现，需要完善）

### 10.3 计划功能（⏳）
- ⏳ 子域名支持
- ⏳ 高级品牌定制（Logo、主题色）
- ⏳ Franchise 级别的权限管理

---

## 11. 未来扩展

### 11.1 短期（1-3 个月）
- ⏳ 子域名支持
- ⏳ 高级品牌定制
- ⏳ Franchise 级别的配置

### 11.2 中期（3-6 个月）
- ⏳ Franchise 级别的权限管理
- ⏳ 多语言支持（按 Franchise）
- ⏳ 自定义域名支持

### 11.3 长期（6-12 个月）
- ⏳ Franchise 级别的独立部署
- ⏳ 跨 Franchise 数据共享
- ⏳ Franchise 级别的分析报表

---

## 12. 附录

### 12.1 相关文档
- `HQ_FRANCHISE_ARCHITECTURE_PRD.md`：Franchise 架构 PRD
- `FRANCHISE_PAGE_CONTENT_DESIGN.md`：Location 页面内容设计
- `PRD-10-管理员门户.md`：管理员门户 PRD

### 12.2 术语表
- **Franchise（分站）**：Blaze Robotics 在不同城市的运营点
- **Location（地点）**：具体的课程地点，属于某个 Franchise
- **Branding Config（品牌配置）**：每个 Franchise 的品牌定制配置
- **Code（代码）**：Franchise 的唯一标识符，用于 URL 路由

