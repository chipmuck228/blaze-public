# HQ/Franchise 架构产品需求文档 (PRD)

**版本**: 1.0  
**日期**: 2025-12  
**状态**: Phase 1 & Phase 2 已实施

---

## 1. 产品概述

### 1.1 背景

Blaze Robotics Academy 是一个多地点运营的机器人编程教育机构，目前在多个城市（Bellevue、Issaquah、Sammamish等）设有校区。为了支持多地点运营，同时保持统一的品牌形象和代码维护效率，系统采用 **HQ/Franchise 多租户架构**。

### 1.2 产品定位

- **HQ（总部）门户**：品牌展示、城市选择入口、通用信息
- **Franchise（分站）门户**：本地化内容、课程展示、报名入口
- **统一课程目录**：支持按 Franchise 过滤，提供智能引导和用户偏好记忆

### 1.3 核心价值

1. **统一品牌，本地化体验**：所有分站共享同一套代码和品牌形象，但提供本地化的课程和内容
2. **数据隔离，精准展示**：每个 Franchise 的数据独立管理，用户只看到相关的内容
3. **灵活扩展**：新增 Franchise 无需修改代码，只需配置数据
4. **用户体验优化**：智能引导用户选择 Location，记住用户偏好，减少操作步骤

---

## 2. 用户角色与场景

### 2.1 用户角色

| 角色 | 描述 | 主要使用场景 |
|------|------|------------|
| **访客（未登录）** | 浏览网站、查看课程信息 | 选择 Location、浏览课程、查看课程详情 |
| **注册用户** | 已注册的学生/家长 | 浏览课程、报名、查看个人资料 |
| **管理员** | HQ 或 Franchise 管理员 | 管理所有 Franchise 的数据、用户、课程 |
| **教练** | 各 Franchise 的教练 | 查看分配的课程、管理课程实例 |

### 2.2 核心用户场景

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

#### 场景 4: 用户查看课程详情
1. 用户点击课程卡片
2. 进入课程详情页
3. 如果未选择 Location，显示引导 Banner 和所有 Locations 的实例
4. 如果已选择 Location，只显示该 Location 的实例
5. 可以随时切换 Location 查看不同校区的开班情况

---

## 3. 功能需求

### 3.1 HQ 首页功能

#### 3.1.1 Location 选择区块
**优先级**: P0（必须）

**功能描述**:
- 在首页显示所有 active Franchises 的卡片
- 每个卡片显示：Franchise 名称、城市/州、Campus 数量
- 点击卡片跳转到对应的 Location 子站

**UI 设计**:
- 左右分栏布局（参考设计图）
- 左侧：标题和描述文本
- 右侧：2x2 网格显示 Location 卡片
- 响应式：移动端单列，桌面端 2x2

**数据来源**:
- API: `GET /api/public/locations`
- 返回所有 active locations 及其关联的 franchises
- 按 franchise 聚合，一个城市一个卡片

**验收标准**:
- ✅ 显示所有 active Franchises
- ✅ 点击卡片正确跳转到 `/locations/{code}`
- ✅ 响应式布局正常
- ✅ 加载状态和错误处理完善

---

### 3.2 Location 子站功能

#### 3.2.1 Location 子站首页
**优先级**: P0（必须）

**功能描述**:
- 动态路由：`/locations/[code]`
- 显示该 Franchise 的本地化内容
- 展示该 Franchise 的特色课程

**UI 设计**:
- Hero 区域：显示 Franchise 名称和描述
- 特色课程：调用 `LocationFeaturedCourses` 组件
- 联系信息：显示该 Franchise 的联系方式

**数据来源**:
- API: `getFranchiseByCode(code)` 获取 Franchise 信息
- API: `GET /api/courses/featured?franchise={code}` 获取特色课程

**验收标准**:
- ✅ 支持动态路由，任何有效的 franchise code 都能访问
- ✅ 显示正确的 Franchise 信息
- ✅ 只显示该 Franchise 的课程
- ✅ 404 处理：无效的 code 返回 404

---

### 3.3 课程目录功能

#### 3.3.1 Location 筛选器（Phase 1）
**优先级**: P0（必须）

**功能描述**:
- 在 `/course-catalog` 页面顶部提供 Location 筛选器
- 默认值：`All Locations`
- 选项：`All Locations` + 所有 active Franchises
- 筛选器变化时更新 URL：`/course-catalog?franchise={code}`

**UI 设计**:
- 使用 `Select` 组件
- 位置：搜索和筛选区域
- 标签：`Location:`

**数据来源**:
- API: `GET /api/public/franchises` 获取所有 active Franchises

**验收标准**:
- ✅ 显示所有 active Franchises
- ✅ 选择 Location 后 URL 更新
- ✅ 选择 Location 后课程列表过滤
- ✅ 选择 "All Locations" 清除筛选

---

#### 3.3.2 引导 Banner（Phase 1）
**优先级**: P0（必须）

**功能描述**:
- 当用户未选择 Location 时，显示引导 Banner
- 提示用户选择 Location 以查看相关课程
- 提供快速选择按钮

**UI 设计**:
- 位置：Hero 区域下方
- 样式：带边框和背景色的卡片
- 内容：
  - 图标：MapPin
  - 标题："Find courses near you"
  - 描述："Select your location to see available classes and schedules"
  - 操作：Location 选择器

**验收标准**:
- ✅ 只在未选择 Location 时显示
- ✅ 选择 Location 后 Banner 消失
- ✅ 点击选择器可以快速选择 Location

---

#### 3.3.3 Location Badge（Phase 1）
**优先级**: P0（必须）

**功能描述**:
- 当用户选择了特定 Location 时，显示 Location Badge
- 提供 "Change Location" 按钮，快速切换回 "All Locations"

**UI 设计**:
- 位置：Hero 区域下方
- 样式：Badge + Button
- 内容：
  - Badge：显示当前 Location 名称 + "Campus"
  - Button："Change Location"

**验收标准**:
- ✅ 只在选择了 Location 时显示
- ✅ 显示正确的 Location 名称
- ✅ 点击 "Change Location" 清除筛选

---

#### 3.3.4 用户偏好记忆（Phase 2）
**优先级**: P1（重要）

**功能描述**:
- 使用 `localStorage` 记住用户选择的 Location
- 下次访问时自动应用该 Location 筛选（如果没有 URL 参数）
- 用户可以通过筛选器或 "Change Location" 清除偏好

**实现细节**:
- 存储键：`preferred_location`
- 存储值：Franchise code（如 `bellevue`）
- 应用时机：组件挂载时，如果没有 URL 参数
- 验证：确保存储的 Location 仍然有效（active）

**验收标准**:
- ✅ 选择 Location 后保存到 localStorage
- ✅ 下次访问时自动应用
- ✅ 清除筛选时删除 localStorage
- ✅ 无效的 Location 不应用

---

#### 3.3.5 课程列表显示逻辑

**无 Location 筛选时**:
- 显示所有已发布的课程
- 每个课程卡片标注可用 Locations（如 "Available at: Bellevue, Issaquah"）
- 支持搜索和类型/年级筛选

**有 Location 筛选时**:
- 显示该 Location 的 Programs（Series）
- 每个 Program 下显示关联的 Courses
- 只显示该 Location 的课程实例（Instances）

**数据来源**:
- 无筛选：`GET /api/courses`
- 有筛选：`GET /api/programs?franchise={code}`

---

### 3.4 课程详情页功能

#### 3.4.1 Location 选择 Banner（Phase 2）
**优先级**: P1（重要）

**功能描述**:
- 如果用户未选择 Location，显示引导 Banner
- 提示用户选择 Location 以查看具体的开班信息
- 提供 Location 选择器

**UI 设计**:
- 位置：课程详情内容区域顶部
- 样式：带边框和背景色的卡片
- 内容：
  - 图标：AlertCircle
  - 标题："Select a location to see available classes"
  - 描述："Choose your preferred campus to view class schedules and enrollment options"
  - 操作：Location 选择器

**验收标准**:
- ✅ 只在未选择 Location 时显示
- ✅ 选择 Location 后 Banner 消失
- ✅ 选择 Location 后显示该 Location 的实例

---

#### 3.4.2 课程实例显示（Phase 2）
**优先级**: P1（重要）

**功能描述**:
- 显示课程的所有可用实例（Instances）
- 根据选择的 Location 过滤实例
- 显示实例的详细信息：日期、时间、地点、可用容量

**UI 设计**:
- 位置：课程详情内容区域
- 样式：卡片列表
- 每个实例显示：
  - 日期范围
  - 时间（如果有）
  - 地点
  - 可用容量 / 是否已满
  - "Enroll Now" 按钮

**数据来源**:
- API: `GET /api/courses/{id}/instances?franchise={code}`
- 如果提供了 `franchise` 参数，只返回该 Franchise 的实例

**验收标准**:
- ✅ 显示所有可用实例（未来日期）
- ✅ 根据 Location 筛选正确过滤
- ✅ 显示正确的实例信息
- ✅ 加载状态和空状态处理

---

#### 3.4.3 Location 筛选器（Phase 2）
**优先级**: P1（重要）

**功能描述**:
- 在课程详情页提供 Location 筛选器
- 允许用户切换 Location 查看不同校区的开班情况
- 记住用户选择（localStorage）

**UI 设计**:
- 位置：实例列表标题栏右侧
- 样式：Select 组件
- 选项：`All Locations` + 所有 active Franchises

**验收标准**:
- ✅ 筛选器变化时更新实例列表
- ✅ 选择保存到 localStorage
- ✅ 下次访问时自动应用

---

## 4. 技术架构

### 4.1 多租户架构模式

**模式**: 单应用多租户（Single Application Multi-Tenant）

**特点**:
- 单一代码库和部署
- 通过 `franchise_id` 实现数据隔离
- 支持路径模式和子域名模式（未来）

### 4.2 数据模型

#### 4.2.1 Franchise 表
```sql
franchises
- id: UUID (PK)
- code: TEXT (UNIQUE)              -- 'bellevue', 'issaquah'
- name: TEXT                       -- 'Bellevue Robotics Academy'
- primary_domain: TEXT             -- 'bellevue.blazeroboticsacademy.org'（可选）
- timezone: TEXT                   -- 'America/Los_Angeles'
- branding_config: JSONB           -- { logoUrl, colors, contact, ... }
- is_active: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### 4.2.2 关联表的外键
- `course_locations.franchise_id` → `franchises.id`
- `course_series.franchise_id` → `franchises.id`
- `course_instances.franchise_id` → `franchises.id`（冗余）
- `course_enrollments.franchise_id` → `franchises.id`（冗余）

### 4.3 URL 路由设计

#### 4.3.1 路径模式（当前实现）
- HQ 首页：`/`
- Location 子站：`/locations/{code}`
- 课程目录：`/course-catalog?franchise={code}`
- 课程详情：`/course-catalog/{slug}` 或 `/course-catalog?id={id}`

#### 4.3.2 子域名模式（未来）
- HQ：`www.blazeroboticsacademy.org`
- Bellevue：`bellevue.blazeroboticsacademy.org`
- Issaquah：`issaquah.blazeroboticsacademy.org`

### 4.4 API 设计

#### 4.4.1 公共 API

**获取所有 Franchises**
```
GET /api/public/franchises
Response: [{ id, code, name, is_active }]
```

**获取所有 Locations（带 Franchise 信息）**
```
GET /api/public/locations
Response: [{ id, name, address, city, state, franchise: { id, code, name } }]
```

**获取特色课程（按 Franchise 过滤）**
```
GET /api/courses/featured?franchise={code}
Response: [{ id, name, slug, ... }]
```

**获取课程列表（按 Franchise 过滤）**
```
GET /api/courses?franchise={code}
Response: [{ id, title, type, gradeLevel, ... }]
```

**获取 Programs（按 Franchise 过滤）**
```
GET /api/programs?franchise={code}
Response: [{ id, display_name, category, courses: [...] }]
```

**获取课程实例（按 Franchise 过滤）**
```
GET /api/courses/{id}/instances?franchise={code}
Response: [{ id, start_date, end_date, location, available_capacity, ... }]
```

---

## 5. UI/UX 设计规范

### 5.1 设计原则

1. **渐进式引导（Progressive Disclosure）**
   - 不强制用户选择 Location
   - 提供清晰的引导和提示
   - 允许用户先浏览再选择

2. **智能默认（Smart Defaults）**
   - 记住用户偏好
   - 自动应用上次选择的 Location
   - 减少用户操作步骤

3. **灵活筛选（Flexible Filtering）**
   - 支持 "查看所有" 和 "查看特定 Location" 两种模式
   - 用户可以随时切换 Location
   - 筛选状态通过 URL 参数保持

### 5.2 视觉设计

#### 5.2.1 Location 选择区块（首页）
- **布局**: 左右分栏（桌面端）
- **左侧**: 大标题 + 描述文本
- **右侧**: 2x2 网格卡片
- **卡片样式**:
  - 圆角、边框、阴影
  - 悬停效果：背景色变化、阴影增强
  - 内容：Franchise 名称、城市/州、Campus 数量

#### 5.2.2 引导 Banner
- **背景**: `bg-primary/5` + `border-primary/20`
- **图标**: MapPin 或 AlertCircle
- **布局**: 左右分栏（桌面端）
- **左侧**: 图标 + 标题 + 描述
- **右侧**: Location 选择器

#### 5.2.3 Location Badge
- **样式**: `Badge` 组件，`variant="secondary"`
- **内容**: MapPin 图标 + Location 名称 + "Campus"
- **位置**: Hero 区域下方，居中显示

---

## 6. 数据流设计

### 6.1 用户选择 Location 流程

```
用户访问 /course-catalog
  ↓
检查 URL 参数 ?franchise={code}
  ↓
如果没有参数：
  - 检查 localStorage 中的 preferred_location
  - 如果存在且有效，自动应用
  - 显示引导 Banner
  ↓
用户选择 Location
  ↓
更新 URL: /course-catalog?franchise={code}
  ↓
保存到 localStorage: preferred_location = {code}
  ↓
调用 API: GET /api/programs?franchise={code}
  ↓
显示该 Location 的 Programs 和 Courses
```

### 6.2 课程实例查询流程

```
用户查看课程详情
  ↓
检查 URL 参数 ?franchise={code} 或 localStorage
  ↓
调用 API: GET /api/courses/{id}/instances?franchise={code}
  ↓
如果提供了 franchise 参数：
  - 只返回该 Franchise 的实例
  - 过滤掉其他 Franchise 的实例
  ↓
显示实例列表
  ↓
用户切换 Location
  ↓
重新调用 API 并更新列表
```

---

## 7. 实施状态

### 7.1 Phase 1: 基础实现（✅ 已完成）

- ✅ 创建获取所有 Franchises 的公共 API
- ✅ 在课程目录页面添加 Location 筛选器
- ✅ 添加引导 Banner（未选择 Location 时）
- ✅ 实现 URL 状态管理（筛选器变化时更新 URL）
- ✅ 添加 Location Badge（选择 Location 时）
- ✅ 首页 Location 选择区块（左右分栏布局）

### 7.2 Phase 2: 优化体验（✅ 已完成）

- ✅ 用户偏好记忆（localStorage）
- ✅ 课程详情页 Location 选择 Banner
- ✅ 课程详情页实例显示（按 Location 过滤）
- ✅ 课程详情页 Location 筛选器

### 7.3 Phase 3: 高级功能（⏸️ 暂不实施）

- ⏸️ 地理位置推荐（IP 检测、浏览器地理位置 API）
- ⏸️ 多 Location 比较功能
- ⏸️ 智能推荐（基于浏览历史）

---

## 8. 未来规划

### 8.1 短期优化（3-6 个月）

1. **子域名模式支持**
   - 实现基于 hostname 的 Franchise 解析
   - 配置 Vercel 通配符域名
   - 更新路由逻辑

2. **品牌定制化**
   - 每个 Franchise 支持自定义 Logo、颜色主题
   - 从 `branding_config` JSONB 字段读取配置
   - 应用到 Navbar、Footer 等组件

3. **SEO 优化**
   - 为每个 Location 子站生成独立的 meta 标签
   - 实现结构化数据（Schema.org）
   - 优化 URL 结构和 sitemap

### 8.2 中期规划（6-12 个月）

1. **多语言支持**
   - 为每个 Franchise 支持不同的语言
   - 实现国际化（i18n）
   - 内容本地化

2. **高级分析**
   - Franchise 级别的访问统计
   - 用户行为分析
   - 转化率追踪

3. **移动端优化**
   - 响应式设计优化
   - 移动端专用功能
   - PWA 支持

### 8.3 长期愿景（12+ 个月）

1. **智能推荐系统**
   - 基于用户地理位置推荐最近的 Location
   - 基于用户兴趣推荐相关课程
   - 个性化内容展示

2. **多 Location 管理**
   - 支持用户同时关注多个 Locations
   - 跨 Location 课程比较
   - 统一购物车（跨 Location）

3. **Franchise 管理门户**
   - 每个 Franchise 的独立管理后台
   - Franchise 级别的数据统计
   - 本地化内容管理

---

## 9. 技术债务与注意事项

### 9.1 已知问题

1. **数据一致性**
   - `course_instances.franchise_id` 是冗余字段，需要确保与 `location.franchise_id` 一致
   - 建议：添加数据库触发器或应用层验证

2. **性能优化**
   - 当 Franchise 数量增加时，Location 筛选器可能需要分页或搜索
   - 建议：实现虚拟滚动或搜索功能

3. **缓存策略**
   - Franchise 列表变化不频繁，可以考虑缓存
   - 建议：实现客户端缓存或服务端缓存

### 9.2 安全考虑

1. **数据隔离**
   - 确保 RLS（Row Level Security）策略正确配置
   - 防止用户访问其他 Franchise 的数据

2. **输入验证**
   - 验证 `franchise` 参数的有效性
   - 防止 SQL 注入和 XSS 攻击

---

## 10. 验收标准

### 10.1 功能验收

- ✅ 用户可以从首页选择 Location 并跳转到子站
- ✅ 用户可以直接访问课程目录，系统提供引导
- ✅ 用户选择 Location 后，只显示该 Location 的课程
- ✅ 用户偏好被正确记住和应用
- ✅ 课程详情页根据 Location 显示相应的实例
- ✅ 所有筛选状态通过 URL 参数保持

### 10.2 性能验收

- ✅ 页面加载时间 < 2 秒
- ✅ API 响应时间 < 500ms
- ✅ 支持至少 10 个 Franchises 同时运行

### 10.3 兼容性验收

- ✅ 支持主流浏览器（Chrome、Firefox、Safari、Edge）
- ✅ 响应式设计：移动端、平板、桌面端
- ✅ 支持深色模式

---

## 11. 附录

### 11.1 相关文档

- `TOP_LEVEL_DESIGN.md` - 顶层设计文档
- `COURSE_BROWSING_UX_DESIGN.md` - 课程浏览 UX 设计
- `HOME_FRANCHISE_DESIGN.md` - 首页和 Location 页面设计
- `FRANCHISE_ASSIGNMENT_RELATIONSHIP.md` - Franchise 与 Assignment 关系分析

### 11.2 API 端点清单

**公共 API**:
- `GET /api/public/franchises` - 获取所有 Franchises
- `GET /api/public/locations` - 获取所有 Locations
- `GET /api/public/categories` - 获取所有 Categories
- `GET /api/courses/featured?franchise={code}` - 获取特色课程
- `GET /api/courses?franchise={code}` - 获取课程列表
- `GET /api/programs?franchise={code}` - 获取 Programs
- `GET /api/courses/{id}/instances?franchise={code}` - 获取课程实例

**管理 API**:
- `GET /api/admin/franchises` - 获取所有 Franchises（Admin）
- `POST /api/admin/franchises` - 创建 Franchise
- `PUT /api/admin/franchises/{id}` - 更新 Franchise
- `DELETE /api/admin/franchises/{id}` - 删除 Franchise

### 11.3 数据库迁移脚本

- `migrate-add-franchises.sql` - 创建 Franchises 表和关联字段
- `fix-course-series-unique-constraint.sql` - 修复 Series 唯一约束

---

**文档结束**

