# 多地点 Franchise 重构 - Web Home & Location Page 设计草图

本文档定义在已引入 `franchises` / `franchise_id` 的前提下，对 Web 首页和 Location 子站首页的重构方案。目标是在不立刻大改后端逻辑的前提下，先完成前端信息架构和 UI 设计，为后续路由与 API 绑定打基础。

---

## 1. 顶层信息架构概览

### 1.1 总站（Global Home）角色

路径：`/`

定位为「品牌门户 + 城市入口」：

- 主要目标：
  - 介绍 Blaze Robotics Academy 品牌与使命
  - 引导用户选择所在地区（Bellevue / Bel-Red / Issaquah / Cherry Crest）
  - 提供对所有 franchise 通用的信息（理念、课程体系、竞赛战绩等）
- 不再过度承担「具体开班信息」的展示（这些下沉到各 Location 子站）

### 1.2 Location 子站首页角色

路径建议（Phase 1，路径模式）：

- `/locations/bellevue`
- `/locations/belred`
- `/locations/issaquah`
- `/locations/cherrycrest`

后续可演进为子域名模式：

- `bellevue.blazeroboticsacademy.org`
- `belred.blazeroboticsacademy.org`
- `issaquah.blazeroboticsacademy.org`
- `cherrycrest.blazeroboticsacademy.org`

子站首页主要目标：

- 聚焦本地点的课程与开班信息（通过 `franchise_id` 过滤）
- 突出该校区的特色（交通、环境、师资、获奖等）
- 作为该 Location 下所有业务（课程、营队、报名）的统一入口

---

## 2. 总站首页 (`/`) 设计草图

### 2.1 页面结构

大致区块顺序：

1. **Global Hero**（品牌主视觉）
2. **“选择你的城市 / Location” 区块**
3. **品牌/课程体系介绍**
4. （可选）**全国性战绩 / 媒体报道 / 合作伙伴**
5. **统一的 FAQ & 联系方式**

### 2.2 各区块详细设计

#### 2.2.1 Global Hero

- 内容：
  - 标题：例如 “Inspiring Young Innovators Through Robotics”
  - 副标题：简要说明 Blaze 的教育理念和覆盖人群
  - CTA 按钮：
    - “Find a Location Near You” → 滚动到 Location 区块
    - 次级 CTA： “Explore Our Programs” → `/course-catalog`（全局课程体系，而非具体班级）
- 视觉：
  - 机器人主题插画/照片
  - 品牌色 + 柔和渐变背景（保持当前设计语言）

#### 2.2.2 Location 选择区块

- 标题： “Choose Your Location”
- 文案：简单说明「我们在多个地点开设课程，请选择离你最近的校区」
- 布局：
  - 响应式 grid：桌面 4 列、平板 2 列、手机 1 列
  - 每个 Location 卡片包含：
    - 名称：Bellevue / Bel-Red / Issaquah / Cherry Crest
    - 简短描述（可硬编码或从 `franchises.branding_config` 里读取）：
      - 例：`"Conveniently located near Bellevue downtown..."`
    - 地址/城市信息（可从 `course_locations` 或 `franchises` 衍生）
    - CTA 按钮： “View Bellevue Campus” 等
  - 点击行为（Phase 1）：
    - 跳转到 `/locations/{code}`，例如 `/locations/bellevue`

#### 2.2.3 品牌/课程体系介绍区块

- 将现有 Home 中的 `Courses` / `Advantages` 内容提升为「品牌层面」介绍：
  - 不列出具体班级和时间，而是描述：
    - RoboQuests / LaunchPad / RoboChamps 等产品线
    - 不同年龄段的能力培养目标
  - CTA 引导：
    - “View Full Program Catalog” → `/course-catalog`
    - “See Schedule at Your Location” → 滚动回 Location 区块

#### 2.2.4 全国性战绩 / 媒体报道 / 合作伙伴（可选）

- 用于强化品牌信任度，不与具体 Location 绑定。

#### 2.2.5 FAQ & 联系方式

- 保持当前 FAQ 区块
- 联系方式偏向「总部」联系邮箱 / 电话
- 引导用户针对具体开班问题前往 Location 子站获取本地联系信息

---

## 3. Location 子站首页设计草图 (`/locations/{code}`)

### 3.1 通用结构模板

- 顶部共享 `Navbar`（后续可根据 franchise 加 Logo / 联系方式定制）
- 主体区块顺序：
  1. **Location Hero**（本地校区主视觉）
  2. **本地课程 / 班级预览**（基于 `franchise_id` 的 Featured Courses）
  3. **校区介绍与环境**（图片 + 文案）
  4. **本地 Team / 教练介绍**（可选）
  5. **地图 & 交通信息**
  6. **本地联系信息 & 报名咨询 CTA**

### 3.2 Location Hero

- 标题：`{Location Name} Robotics Academy`
  - 例如：`Bellevue Robotics Academy`
- 副标题：
  - 例：“Serving K-8 students in the Bellevue area with hands-on robotics programs.”
- 标签/徽章：
  - 城市 / 校区名称
  - 年龄段 /年级范围（如 K-8）
- CTA 按钮：
  - “View All Classes at Bellevue” → 将来跳转到 location-specific 课程列表，如 `/locations/bellevue/classes`
  - “Contact Us” → 滚动到联系区块

### 3.3 本地课程 / 班级预览

- 数据来源（设计层面）：
  - 按 `franchise_id` 过滤 `course_instances`，只展示该校区即将开班的几门课程/班级
  - 也可先简化为「课程预览」，按 franchise 过滤 `assignments` + `instances`
- 展示形式：
  - 类似当前 Home `Courses` 的卡片布局，但限定在本 location：
    - 课程名
    - 年级/年龄段
    - 下一期开课日期（最近的一个 instance）
    - 「Learn More」→ 课程详情（可用现有 `/course-catalog` 页面）
    - 「View Schedule」→ 将来跳转到 location-specific 课程安排页

### 3.4 校区介绍与环境

- 内容来源：暂时可以硬编码在前端，后续放入 `franchises.branding_config`：
  - 校区照片（1–3 张）
  - 环境介绍（教室、机器人设备、比赛训练等）
  - 特殊优势（如靠近某学校、停车方便等）

### 3.5 本地 Team / 教练介绍（可选阶段）

- 如果将来需要 per-location 的 Team：
  - 设计 `team_members` 与 `franchise` 的关联（或用标签区分）
  - 在 Location 页中只展示本地核心教练和负责人

### 3.6 地图 & 交通信息

- 显示校园地址（来自 `course_locations` 或 `franchises.branding_config`）：
  - 地址
  - 停车信息
  - 可能配合一个静态地图截图或嵌入地图链接

### 3.7 本地联系信息 & CTA

- 显示：
  - 本地联系电话
  - 本地联系邮箱
  - 本地微信/社交账号（如有）
- CTA：
  - “Email Bellevue Campus”
  - “Call Now”
  - “Schedule a Visit”（将来可接预约系统）

---

## 4. 路由与导航交互设计（Phase 1）

### 4.1 导航栏行为（不立即改代码，只做设计）

- 顶部 Navbar 保持当前结构，但增加：
  - 在 Logo 附近显示当前 Location（当在 `/locations/{code}` 下时），例如：
    - Blaze Logo | Bellevue
  - 在头像 / 用户菜单附近预留一个 Location 切换入口（未来实现）

### 4.2 从总站到 Location 的跳转

- 方式：
  - 首页 Location 卡片 → `/locations/{code}`
  - 课程详情中（未来）也可以显示「在哪些 Location 开班」，并跳转到相应 Location 页

---

## 5. 数据绑定规划（后续 Phase 使用）

> 本节只是为后续实现做铺垫，不在当前阶段改代码。

- 总站 `/`：
  - Location 列表可以从 `franchises` 读取：
    - `SELECT code, name, branding_config FROM franchises WHERE is_active = TRUE`
- `/locations/{code}`：
  - 解析 `{code}` → 查询 `franchises` 表得到 `franchise_id`
  - 用 `franchise_id` 查询本地课程/实例/联系方式：
    - `course_instances.franchise_id = :franchise_id`
    - `course_locations.franchise_id = :franchise_id`
    - 后续 `course_enrollments.franchise_id = :franchise_id`（用于统计）

---

## 6. 实施顺序建议（仅前端层面）

1. **实现新的 `/` 布局**：
   - 加入 Location 选择区块
   - 将原 Home 的课程具体实例信息弱化为“课程体系介绍”
2. **为四个 Location 设计静态子站页面结构**：
   - `/locations/bellevue`
   - `/locations/belred`
   - `/locations/issaquah`
   - `/locations/cherrycrest`
   - 先使用静态数据 + 统一模板
3. **待你确认 UI 后，再进入下一阶段**：
   - 把这些页面与 `franchises` + `franchise_id` 动态数据绑定
   - 再按照 `API_FRANCHISE_DESIGN.md` 调整对应 API

这样可以保证：即使暂时不动 API，只用静态/半静态数据，也能先把多地点的信息架构和 UI 骨架搭建好。后续再一点点把 franchise 过滤和多租户逻辑接上去。+

