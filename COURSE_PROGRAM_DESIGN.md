## Course / Program / Franchise 设计方案

> 本文档补充 `COURSE_ARCHITECTURE_DESIGN.md`，聚焦在「课程内容 (Course)」「Program / Series」「Franchise / Location」「Assignment / Instance」之间的关系，确保：
> - 课程内容只设计一次，可复用到多个城市 / 多个 Program；
> - 不同 Franchise 可以有完全不同的 Program（例如 Cherry Crest 有 2025 Winter + Camps，Bellevue 有 2026 Spring + Camps）；
> - 能清晰表达“某门课在某个城市、某个 Program、某个 campus 下开课”的关系。

---

### 1. 设计目标

- **Course 内容全局复用**：课程描述、学习目标、适龄等不绑定城市或时间，只建一次。
- **Program (Series) 按 Franchise 划分**：每个城市可以有自己的学期/批次/项目集，例如：
  - Cherry Crest: `2025 Winter Courses`, `2025 Winter Camps`
  - Bellevue: `2026 Spring Courses`, `2025 Winter Camps`
- **同一门 Course 可以出现在多个城市、多个 Program 中**。
- **Instance 是最细粒度的具体班级**：包含日期、时间、地点、容量、iCalendar 规则等，且能追溯到：
  - 所属 Course
  - 所属 Franchise
  - 所属 Program (Series)
  - 所属 Location (campus)

---

### 2. 核心实体与关系

整体关系（简化）：

```text
Franchise (城市 / 子站)
  └── CourseLocation (campus)
  └── CourseSeries (Program / Session)
        └── CourseAssignment (该 Program 中的某门课，可以绑定默认 Location)
              └── CourseInstance (具体班级，某时间段在某 Location 上课)
Course (全局课程内容)
  └── CourseSubcategoryTags (Tag 体系，例如 RoboQuests / LaunchPad / RoboChamps)
CourseCategory (全局类别：Courses / Camps / Workshops)
```

#### 2.1 全局课程内容

- **CourseCategory（全局）**
  - 表示课程大类：`Courses`, `Camps`, `Workshops` 等。
  - 不带 franchise 信息。

- **CourseSubcategory（全局 Tag）**
  - 表示课程子类/标签：RoboQuests, LaunchPad, RoboChamps 等。
  - 通过 `course_subcategory_tags` 多对多关联到 Course。

- **Course（全局）**
  - 定义课程内容：名称、描述、学习目标、适龄、学段、base_price 等。
  - 不直接绑定 Franchise 或 Location。

> 这些实体负责「教学内容」维度，与城市、时间、地点解耦。

#### 2.2 Franchise & Location

- **Franchise**
  - 表示一个「城市级子站」或「运营实体」，如 `bellevue`, `issaquah`, `cherrycrest`, `newyork`。
  - 字段示例：
    - `code`: `bellevue`
    - `name`: `Bellevue Robotics Academy`
    - `primary_domain`: `bellevue.blazeroboticsacademy.org`（预留给子域名模式）
    - `timezone`: `America/Los_Angeles`

- **CourseLocation**
  - 表示一个具体 campus / 校址。
  - 字段示例：
    - `name`, `address`, `city`, `state`, `zip_code`
    - `franchise_id`: 对应哪个 Franchise
  - 一个 Franchise 可以有多个 Location。

> 规则：同一个城市的多个 campus 共用一个 Franchise，不同城市用不同 Franchise。

#### 2.3 CourseSeries = Program / Session

**关键重构点**：将 `course_series` 明确用作 Program / Session 实体。

- 新增字段：
  - `franchise_id UUID (FK -> franchises.id)`
- 语义：
  - **某个 Franchise + Category 下的一次 Program / Session / 学期**。
  - 例如：
    - Cherry Crest + Courses + 2025 Winter → `course_series(code='cherrycrest', name='2025_winter_courses')`
    - Bellevue + Camps + 2026 Spring → `course_series(code='bellevue', name='2026_spring_camps')`
- 字段（现有基础上）：
  - `category_id`：关联 CourseCategory（Courses / Camps / Workshops）
  - `name`: 机器名（如 `"2025_winter_courses"`）
  - `display_name`: 展示名（如 `"2025 Winter Courses"`）
  - `description`: Program 说明
  - `start_date`, `end_date`: Program 时间范围

> 这样，一个 Program 就天然绑定到某个 Franchise 和某个 Category。

#### 2.4 CourseAssignment：把 Course 投放到 Program / Location

`course_assignments` 的职责：

> 在某个 Franchise 的某个 Program 中，将某门 Course「上架」，并可指定默认 Location。

- 字段：
  - `course_id` → Course（内容是谁）
  - `category_id` → Category（与 Series 一致，用于冗余和校验）
  - `series_id` → CourseSeries（Program / Session）
  - `location_id`（可选）→ CourseLocation，表示该 Program 中该课的默认地点（可为空）
  - `is_active`, `display_order`

- 重要关系：
  - `course_assignments.series_id -> course_series.id`
  - `course_series.franchise_id -> franchises.id`
  - （可选约束）`course_locations.franchise_id` 必须与 `course_series.franchise_id` 一致。

> 一条 Assignment =「这门课在这座城市的某个 Program 中出现一次，默认在某个 campus 上课」。

#### 2.5 CourseInstance：具体班级

`course_instances` 仍然是最细粒度「班级 / Instance」实体：

- 关键字段：
  - `assignment_id` → CourseAssignment
  - `location_id`：具体上课 campus（可覆盖 assignment 的默认 location）
  - `franchise_id`：冗余字段，等于 `course_series.franchise_id`（或从 location 推导）  
  - `start_date`, `end_date`, `start_time`, `end_time`
  - `icalendar_rrule`, `icalendar_exdates`, `icalendar_rdates`, `timezone`
  - `max_students`, `current_students`
  - `status`, `notes`

> 通过 `assignment_id` 向上可以追溯到：Course / Category / Series(Program) / Franchise / Location。

---

### 3. 使用流程示例

#### 3.1 设计一门新课程（全局）

1. 在 Admin 的 **Courses 管理**中创建 Course：
   - 填写名称、描述、学习成果、目标学员、年级等。
   - 选择 Category（Courses/Camps/Workshops）。
   - 添加 Subcategory tags（RoboQuests / LaunchPad / RoboChamps）。
2. 此 Course 作为全局资源，可被任意 Franchise 的任意 Program 使用。

#### 3.2 在 Cherry Crest 创建 2025 Winter Courses Program

1. 在 **Series (Programs) 管理**中：
   - 创建一条 `course_series`：
     - `franchise_id` = CherryCrest
     - `category_id` = Courses
     - `name` = `2025_winter_courses`
     - `display_name` = `"2025 Winter Courses"`
     - `start_date` / `end_date` = 2025 冬季日期范围
2. 在 **Assignments 管理**中：
   - 过滤 `franchise = CherryCrest` + `series = 2025 Winter Courses`。
   - 挑选若干 Course 作为该 Program 的一部分，逐条建立 `course_assignments`：
     - 对于每条 assignment，可选指定默认 `location_id`（Cherry Crest 校区）。
3. 在 **Instances 管理**中：
   - 选中某条 assignment，为其创建多条 `course_instances`：
     - 设定 iCalendar 规则（例如 每周二 4:00–5:30 PM，共 8 次）。
     - 设定每个 Instance 的容量、价格、状态等。

> 现在，CherryCrest 的 2025 Winter Courses Program 里有哪些课、在哪些 campus、有哪些具体班级，都完全由 Series + Assignments + Instances 描述。

#### 3.3 在 Bellevue 创建 2026 Spring Camps Program

流程与上面类似：

1. 创建 `course_series`：
   - `franchise_id` = Bellevue
   - `category_id` = Camps
   - `name` = `2026_spring_camps`
   - `display_name` = `"2026 Spring Camps"`
2. 在 Assignments 里：
   - 选择 Bellevue 下适合 Camps 的 Course，加入该 Series。
3. 在 Instances 中：
   - 为这些 Assignment 创建具体班级。

> 同一门 Course 可以在 CherryCrest 2025 Winter 和 Bellevue 2026 Spring 两个 Program 中分别出现，互不干扰。

---

### 4. 前端与 API 策略

#### 4.1 按 Franchise 过滤视图

- **公共端**：
  - 首页：`/api/public/locations` → 按 franchise 聚合成城市卡片。
  - Featured Courses：`GET /api/courses/featured?franchise={code}` → 通过 `course_instances.franchise_id` 反查课程。
  - 课程目录：`GET /course-catalog?franchise={code}` → 内部调用 `GET /api/courses?franchise={code}` 返回当前城市实际开班课程。

- **Admin / Coach 端**：
  - Instances & Enrollments 页面已支持 `?franchise={code}` 参数，按 `franchise_id` 过滤。
  - 后续可以在 Series / Assignments 管理中增加 `franchise` 过滤和选择：
    - `GET /api/admin/series?franchise={id}`
    - `GET /api/admin/assignments?franchise={id}`

#### 4.2 Program 视图（Series）

- 将 Admin 的 Series 页面理解为「Program 管理」：
  - 支持选择 `Category` + `Franchise` 创建 Series（Program）。
  - 列表中展示：Program 名、所属 Franchise、Category、起止日期、是否 active。
  - 未来可以在前端展示“按 Program 分组的课程”，例如：
    - CherryCrest 站点的 Programs 页面：
      - 2025 Winter Courses → 下挂课程列表与班级。
      - 2025 Winter Camps → 同上。

---

### 5. 总结

- **Course**：只关注「教什么」，全局唯一，不绑定城市与时间。
- **Franchise + CourseSeries (Program)**：决定「在哪个城市、哪个学期/批次开哪些类型的课」。
- **CourseAssignment**：在某个 Program 中上架某门课，可指定默认 campus。
- **CourseInstance**：最终的具体班级，承载日期、时间、地点、容量、iCalendar 规则等，并通过 Assignment/Series 关联到正确的 Franchise 与 Program。

这套设计保证：

- 轻松为不同城市设计完全不同的 Program 组合（2025 Winter / 2026 Spring / Camps 等）。
- 同一门课可以复用在多个 Program 下，无需复制课程内容。
- 所有前端与后台视图都能一致地按 Franchise、Program、Location 过滤和展示数据。


