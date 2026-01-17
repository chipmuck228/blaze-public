# 在线教育系统 Offering 字段最佳实践设计

## 1. 概述

本文档分析在线教育系统中 offering（课程/产品）所需的核心字段集合，基于行业最佳实践和用户体验设计原则。

## 2. 字段分类体系

### 2.1 核心标识字段（Core Identity）

**目的：** 唯一标识和基本展示

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `name` | TEXT | ✅ | 课程/产品名称 | "Introduction to Robotics" |
| `slug` | TEXT | ✅ | URL友好的唯一标识符 | "introduction-to-robotics" |
| `short_name` | TEXT | ❌ | 简短名称（用于列表显示） | "Robotics 101" |
| `code` | TEXT | ❌ | 内部课程代码 | "ROB-101" |
| `sku` | TEXT | ❌ | 库存单位代码（用于库存管理） | "ROB-101-2025-Q1" |

### 2.2 描述和内容字段（Description & Content）

**目的：** 详细描述课程内容和价值

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `description` | TEXT | ✅ | 详细描述（富文本） | "This course introduces..." |
| `short_description` | TEXT | ❌ | 简短描述（用于卡片/列表） | "Learn robotics fundamentals" |
| `overview` | TEXT | ❌ | 课程概览 | "What you'll learn..." |
| `curriculum` | TEXT/JSONB | ❌ | 课程大纲/课程表 | 结构化数据 |
| `learning_outcomes` | TEXT[] | ❌ | 学习成果列表 | ["Understand...", "Master..."] |
| `prerequisites` | TEXT | ❌ | 先修要求 | "Basic programming knowledge" |
| `what_you_will_learn` | TEXT[] | ❌ | 你将学到什么 | ["Skill 1", "Skill 2"] |
| `course_materials` | TEXT[] | ❌ | 课程材料清单 | ["Textbook", "Software"] |
| `syllabus` | JSONB | ❌ | 详细教学大纲 | 结构化数据 |

### 2.3 目标受众字段（Target Audience）

**目的：** 明确课程适合的人群

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `target_audience` | TEXT | ❌ | 目标受众描述 | "Elementary students..." |
| `age_min` | INTEGER | ❌ | 最小年龄 | 5 |
| `age_max` | INTEGER | ❌ | 最大年龄 | 12 |
| `target_grades` | TEXT[] | ❌ | 目标年级 | ["K-2", "3-5"] |
| `grade_level` | TEXT | ❌ | 年级级别 | "Elementary" |
| `skill_level` | ENUM | ❌ | 技能水平 | beginner/intermediate/advanced |
| `prior_knowledge_required` | TEXT | ❌ | 所需前置知识 | "Basic math" |
| `suitable_for` | TEXT[] | ❌ | 适合人群标签 | ["Beginners", "Homeschoolers"] |

### 2.4 时间相关字段（Time & Schedule）

**目的：** 定义课程的时间安排

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `duration_hours` | DECIMAL | ❌ | 单次课程时长（小时） | 1.5 |
| `total_duration_hours` | DECIMAL | ❌ | 总课程时长（小时） | 15.0 |
| `session_count` | INTEGER | ❌ | 总课程次数 | 10 |
| `session_duration_minutes` | INTEGER | ❌ | 单次课程时长（分钟） | 90 |
| `schedule_type` | ENUM | ❌ | 时间安排类型 | weekly/biweekly/daily/intensive |
| `weekly_frequency` | INTEGER | ❌ | 每周频率 | 1 (每周一次) |
| `estimated_completion_time` | TEXT | ❌ | 预计完成时间 | "10 weeks" |
| `start_date` | DATE | ❌ | 开始日期（对于固定日期课程） | 2025-01-15 |
| `end_date` | DATE | ❌ | 结束日期 | 2025-03-15 |
| `enrollment_deadline` | DATE | ❌ | 报名截止日期 | 2025-01-10 |
| `self_paced` | BOOLEAN | ❌ | 是否自定进度 | false |

### 2.5 价格和支付字段（Pricing & Payment）

**目的：** 定义价格和支付选项

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `base_price` | DECIMAL(10,2) | ❌ | 基础价格 | 299.99 |
| `currency` | TEXT | ❌ | 货币代码 | "USD" |
| `discount_price` | DECIMAL(10,2) | ❌ | 折扣价格 | 249.99 |
| `discount_percentage` | INTEGER | ❌ | 折扣百分比 | 20 |
| `price_display` | TEXT | ❌ | 价格显示文本 | "$299.99 or $24.99/month" |
| `payment_plans` | JSONB | ❌ | 分期付款计划 | [{"months": 3, "price": 100}] |
| `installment_available` | BOOLEAN | ❌ | 是否支持分期 | true |
| `free_trial_available` | BOOLEAN | ❌ | 是否提供免费试听 | true |
| `trial_duration_days` | INTEGER | ❌ | 试听时长（天） | 7 |
| `refund_policy` | TEXT | ❌ | 退款政策 | "30-day money-back guarantee" |
| `price_currency_symbol` | TEXT | ❌ | 货币符号 | "$" |

### 2.6 政策和规则字段（Policies & Rules）

**目的：** 定义课程的政策和规则

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `cancellation_policy` | TEXT | ❌ | 取消政策 | "Cancel 30 days before..." |
| `refund_policy` | TEXT | ❌ | 退款政策 | "Full refund within 7 days" |
| `attendance_policy` | TEXT | ❌ | 出勤政策 | "Minimum 80% attendance" |
| `makeup_policy` | TEXT | ❌ | 补课政策 | "One makeup session allowed" |
| `transfer_policy` | TEXT | ❌ | 转班政策 | "Transfer available before start" |
| `terms_and_conditions` | TEXT | ❌ | 条款和条件 | "By enrolling..." |
| `privacy_policy` | TEXT | ❌ | 隐私政策 | "We respect your privacy..." |
| `access_duration` | TEXT | ❌ | 访问时长 | "Lifetime access" |
| `certificate_requirements` | TEXT | ❌ | 证书要求 | "Complete all assignments" |

### 2.7 多媒体资源字段（Media & Resources）

**目的：** 存储课程相关的媒体资源

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `poster_url` | TEXT | ❌ | 课程海报/封面图 | "https://..." |
| `thumbnail_url` | TEXT | ❌ | 缩略图 | "https://..." |
| `video_preview_url` | TEXT | ❌ | 预览视频 | "https://..." |
| `video_intro_url` | TEXT | ❌ | 介绍视频 | "https://..." |
| `image_gallery` | TEXT[] | ❌ | 图片库 | ["url1", "url2"] |
| `resource_files` | JSONB | ❌ | 资源文件列表 | [{"name": "...", "url": "..."}] |
| `demo_url` | TEXT | ❌ | 演示链接 | "https://..." |
| `trailer_video_url` | TEXT | ❌ | 预告片视频 | "https://..." |

### 2.8 讲师和团队字段（Instructor & Team）

**目的：** 定义讲师和教学团队信息

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `instructor_id` | UUID | ❌ | 主讲师ID | uuid |
| `instructor_name` | TEXT | ❌ | 讲师姓名 | "John Doe" |
| `instructor_bio` | TEXT | ❌ | 讲师简介 | "10 years experience..." |
| `instructor_photo_url` | TEXT | ❌ | 讲师照片 | "https://..." |
| `instructor_credentials` | TEXT[] | ❌ | 讲师资质 | ["PhD", "Certified"] |
| `teaching_assistants` | JSONB | ❌ | 助教列表 | [{"name": "...", "role": "..."}] |
| `support_team` | JSONB | ❌ | 支持团队 | [{"name": "...", "email": "..."}] |

### 2.9 评估和认证字段（Assessment & Certification）

**目的：** 定义评估方式和认证信息

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `has_certificate` | BOOLEAN | ❌ | 是否提供证书 | true |
| `certificate_name` | TEXT | ❌ | 证书名称 | "Robotics Fundamentals Certificate" |
| `certificate_template_url` | TEXT | ❌ | 证书模板 | "https://..." |
| `assessment_type` | ENUM | ❌ | 评估类型 | quiz/project/exam/portfolio |
| `grading_policy` | TEXT | ❌ | 评分政策 | "Pass: 70% or higher" |
| `assignments_count` | INTEGER | ❌ | 作业数量 | 5 |
| `quizzes_count` | INTEGER | ❌ | 测验数量 | 3 |
| `final_project_required` | BOOLEAN | ❌ | 是否需要最终项目 | true |
| `passing_score` | INTEGER | ❌ | 及格分数 | 70 |

### 2.10 社交和互动字段（Social & Interaction）

**目的：** 定义社交功能和互动方式

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `has_community` | BOOLEAN | ❌ | 是否有社区 | true |
| `community_url` | TEXT | ❌ | 社区链接 | "https://..." |
| `discussion_forum` | BOOLEAN | ❌ | 是否有讨论区 | true |
| `live_sessions` | BOOLEAN | ❌ | 是否有直播课 | true |
| `live_session_count` | INTEGER | ❌ | 直播课次数 | 5 |
| `office_hours` | TEXT | ❌ | 答疑时间 | "Every Friday 2-4 PM" |
| `peer_review` | BOOLEAN | ❌ | 是否支持同伴互评 | false |
| `group_projects` | BOOLEAN | ❌ | 是否有小组项目 | true |
| `max_group_size` | INTEGER | ❌ | 最大小组人数 | 4 |

### 2.11 容量和限制字段（Capacity & Limits）

**目的：** 定义课程容量和限制

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `max_students` | INTEGER | ❌ | 最大学生数 | 30 |
| `min_students` | INTEGER | ❌ | 最小学生数（开课要求） | 5 |
| `current_enrollments` | INTEGER | ❌ | 当前注册数 | 25 |
| `waitlist_enabled` | BOOLEAN | ❌ | 是否启用等待列表 | true |
| `waitlist_capacity` | INTEGER | ❌ | 等待列表容量 | 10 |
| `enrollment_limit_per_user` | INTEGER | ❌ | 每用户注册限制 | 1 |
| `early_bird_capacity` | INTEGER | ❌ | 早鸟名额 | 10 |

### 2.12 位置和地点字段（Location & Venue）

**目的：** 定义课程地点（线上线下）

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `delivery_mode` | ENUM | ❌ | 授课方式 | online/in-person/hybrid |
| `location_id` | UUID | ❌ | 地点ID | uuid |
| `location_name` | TEXT | ❌ | 地点名称 | "Bellevue Campus" |
| `address` | TEXT | ❌ | 地址 | "123 Main St..." |
| `online_platform` | TEXT | ❌ | 在线平台 | "Zoom" |
| `meeting_link` | TEXT | ❌ | 会议链接 | "https://zoom.us/..." |
| `requires_physical_attendance` | BOOLEAN | ❌ | 是否需要现场出席 | false |
| `virtual_classroom_url` | TEXT | ❌ | 虚拟教室链接 | "https://..." |

### 2.13 标签和分类字段（Tags & Categories）

**目的：** 分类和标签系统

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `category_id` | UUID | ❌ | 主分类ID | uuid |
| `category_name` | TEXT | ❌ | 分类名称 | "Robotics" |
| `subcategory_ids` | UUID[] | ❌ | 子分类ID列表 | [uuid1, uuid2] |
| `tags` | TEXT[] | ❌ | 标签列表 | ["beginner", "hands-on"] |
| `topics` | TEXT[] | ❌ | 主题列表 | ["Programming", "Electronics"] |
| `keywords` | TEXT[] | ❌ | 关键词（SEO） | ["robotics", "STEM"] |
| `difficulty_level` | ENUM | ❌ | 难度等级 | beginner/intermediate/advanced |
| `subject_area` | TEXT | ❌ | 学科领域 | "STEM" |

### 2.14 SEO和营销字段（SEO & Marketing）

**目的：** SEO优化和营销信息

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `meta_title` | TEXT | ❌ | SEO标题 | "Learn Robotics..." |
| `meta_description` | TEXT | ❌ | SEO描述 | "Comprehensive robotics course..." |
| `meta_keywords` | TEXT[] | ❌ | SEO关键词 | ["robotics", "education"] |
| `og_image_url` | TEXT | ❌ | Open Graph图片 | "https://..." |
| `featured` | BOOLEAN | ❌ | 是否推荐 | true |
| `popular` | BOOLEAN | ❌ | 是否热门 | true |
| `new` | BOOLEAN | ❌ | 是否新品 | false |
| `bestseller` | BOOLEAN | ❌ | 是否畅销 | true |
| `promotion_badge` | TEXT | ❌ | 促销标签 | "20% Off" |
| `marketing_copy` | TEXT | ❌ | 营销文案 | "Join 10,000+ students..." |
| `testimonials` | JSONB | ❌ | 学员评价 | [{"name": "...", "text": "..."}] |
| `social_proof` | JSONB | ❌ | 社交证明 | {"enrollments": 1000, "rating": 4.8} |

### 2.15 状态和管理字段（Status & Management）

**目的：** 课程状态和管理信息

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `status` | ENUM | ✅ | 状态 | draft/published/suspended/archived |
| `is_active` | BOOLEAN | ✅ | 是否激活 | true |
| `is_featured` | BOOLEAN | ❌ | 是否推荐 | false |
| `is_visible` | BOOLEAN | ❌ | 是否可见 | true |
| `published_at` | TIMESTAMP | ❌ | 发布时间 | 2025-01-15 10:00:00 |
| `archived_at` | TIMESTAMP | ❌ | 归档时间 | null |
| `display_order` | INTEGER | ❌ | 显示顺序 | 1 |
| `priority` | INTEGER | ❌ | 优先级 | 1 (高) |
| `version` | INTEGER | ❌ | 版本号 | 1 |
| `last_updated_by` | UUID | ❌ | 最后更新人 | uuid |
| `approval_status` | ENUM | ❌ | 审核状态 | pending/approved/rejected |

### 2.16 语言和本地化字段（Language & Localization）

**目的：** 多语言支持

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `language` | TEXT | ❌ | 主要语言 | "en" |
| `available_languages` | TEXT[] | ❌ | 可用语言列表 | ["en", "zh", "es"] |
| `translation_id` | UUID | ❌ | 翻译关联ID | uuid |
| `locale` | TEXT | ❌ | 地区设置 | "en-US" |

### 2.17 技术需求字段（Technical Requirements）

**目的：** 定义技术要求和设备需求

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `system_requirements` | TEXT | ❌ | 系统要求 | "Windows 10 or Mac OS..." |
| `software_required` | TEXT[] | ❌ | 所需软件 | ["Python 3.8", "VS Code"] |
| `hardware_required` | TEXT[] | ❌ | 所需硬件 | ["Laptop", "Webcam"] |
| `internet_speed_required` | TEXT | ❌ | 网络要求 | "Minimum 5 Mbps" |
| `device_compatibility` | TEXT[] | ❌ | 设备兼容性 | ["Desktop", "Tablet"] |
| `browser_requirements` | TEXT[] | ❌ | 浏览器要求 | ["Chrome", "Firefox"] |

### 2.18 数据和分析字段（Analytics & Data）

**目的：** 用于分析和报告

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `view_count` | INTEGER | ❌ | 查看次数 | 1000 |
| `enrollment_count` | INTEGER | ❌ | 注册次数 | 500 |
| `completion_rate` | DECIMAL | ❌ | 完成率 | 0.85 |
| `average_rating` | DECIMAL | ❌ | 平均评分 | 4.5 |
| `review_count` | INTEGER | ❌ | 评价数量 | 120 |
| `conversion_rate` | DECIMAL | ❌ | 转化率 | 0.15 |
| `revenue` | DECIMAL | ❌ | 总收入 | 50000.00 |
| `last_analytics_update` | TIMESTAMP | ❌ | 最后分析更新 | 2025-01-20 |

### 2.19 关联和推荐字段（Relations & Recommendations）

**目的：** 课程关联和推荐

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `prerequisite_course_ids` | UUID[] | ❌ | 先修课程ID列表 | [uuid1, uuid2] |
| `recommended_courses` | UUID[] | ❌ | 推荐课程ID列表 | [uuid3, uuid4] |
| `related_courses` | UUID[] | ❌ | 相关课程ID列表 | [uuid5, uuid6] |
| `bundle_id` | UUID | ❌ | 课程包ID | uuid |
| `series_id` | UUID | ❌ | 系列ID | uuid |
| `pathway_id` | UUID | ❌ | 学习路径ID | uuid |

### 2.20 自定义配置字段（Custom Configuration）

**目的：** 类型特定的配置（JSONB）

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `type_config` | JSONB | ❌ | 类型特定配置 | {"default_session_count": 10} |
| `custom_fields` | JSONB | ❌ | 自定义字段 | {"field1": "value1"} |
| `settings` | JSONB | ❌ | 设置 | {"auto_enroll": true} |
| `metadata` | JSONB | ❌ | 元数据 | {"source": "import", "version": "1.0"} |

## 3. 字段优先级分类

### 3.1 核心必填字段（MVP - Minimum Viable Product）

**最小可用产品所需字段：**
- `name` - 名称
- `slug` - URL标识
- `description` - 描述
- `status` - 状态
- `is_active` - 是否激活

### 3.2 重要推荐字段（Recommended）

**提升用户体验的重要字段：**
- `short_description` - 简短描述
- `target_audience` - 目标受众
- `age_min` / `age_max` - 年龄范围
- `base_price` / `currency` - 价格
- `poster_url` - 封面图
- `learning_outcomes` - 学习成果
- `session_count` / `duration_hours` - 课程信息
- `cancellation_policy` - 取消政策

### 3.3 增强功能字段（Enhanced）

**提供更丰富功能的字段：**
- `curriculum` / `syllabus` - 课程大纲
- `instructor_id` / `instructor_name` - 讲师信息
- `video_preview_url` - 预览视频
- `has_certificate` - 证书信息
- `tags` / `subcategory_ids` - 分类标签
- `max_students` / `min_students` - 容量限制
- `delivery_mode` - 授课方式

### 3.4 高级功能字段（Advanced）

**提供高级功能的字段：**
- `assessment_type` / `grading_policy` - 评估系统
- `has_community` / `discussion_forum` - 社区功能
- `payment_plans` / `installment_available` - 支付计划
- `prerequisite_course_ids` - 先修课程
- `meta_title` / `meta_description` - SEO优化
- `testimonials` / `social_proof` - 社交证明

## 4. 不同 Offering 类型的字段需求

### 4.1 Course（课程）
**核心字段：**
- ✅ 所有核心必填字段
- ✅ 时间相关字段（session_count, duration_hours, schedule_type）
- ✅ 目标受众字段（age_min, age_max, target_grades）
- ✅ 学习内容字段（learning_outcomes, curriculum, prerequisites）
- ✅ 评估字段（has_certificate, assessment_type）

**可选字段：**
- 社区功能（has_community, discussion_forum）
- 直播功能（live_sessions, office_hours）

### 4.2 Camp（夏令营）
**核心字段：**
- ✅ 所有核心必填字段
- ✅ 时间相关字段（start_date, end_date, duration_hours）
- ✅ 目标受众字段（age_min, age_max）
- ✅ 地点字段（location_id, address, delivery_mode）
- ✅ 容量字段（max_students, min_students）

**可选字段：**
- 每日时间表（default_daily_schedule）
- 住宿信息（如果需要）

### 4.3 Workshop（工作坊）
**核心字段：**
- ✅ 所有核心必填字段
- ✅ 时间相关字段（duration_hours, session_count）
- ✅ 价格字段（base_price, drop_in_price, multipass_options）
- ✅ 频率字段（weekly_frequency）

**可选字段：**
- Drop-in 支持（supports_drop_in）
- Multipass 支持（supports_multipass）

### 4.4 Free Trial（免费试听）
**核心字段：**
- ✅ 所有核心必填字段
- ✅ 时间相关字段（trial_duration_days）
- ❌ 价格字段（不需要，因为是免费的）

**可选字段：**
- 限制字段（trial_limitations）

### 4.5 Gift Card（礼品卡）
**核心字段：**
- ✅ 所有核心必填字段
- ✅ 价格字段（base_price, denominations）
- ✅ 有效期字段（expiry_months）

**不需要的字段：**
- ❌ 时间相关字段（session_count, duration_hours）
- ❌ 目标受众字段（age_min, age_max, target_grades）
- ❌ 学习内容字段（learning_outcomes, curriculum）
- ❌ 地点字段（location_id）

### 4.6 Care Service（照护服务）
**核心字段：**
- ✅ 所有核心必填字段
- ✅ 时间相关字段（duration_hours, service_duration_hours）
- ✅ 目标受众字段（age_min, age_max）
- ✅ 预订字段（requires_advance_booking, advance_booking_hours）

**不需要的字段：**
- ❌ 学习内容字段（learning_outcomes, curriculum）
- ❌ 评估字段（has_certificate, assessment_type）

### 4.7 Lunch Service（午餐服务）
**核心字段：**
- ✅ 所有核心必填字段
- ✅ 价格字段（base_price）
- ✅ 选项字段（meal_options）
- ✅ 限制字段（requires_camp_enrollment）

**不需要的字段：**
- ❌ 时间相关字段（session_count, duration_hours）
- ❌ 目标受众字段（age_min, age_max）
- ❌ 学习内容字段（learning_outcomes, curriculum）

## 5. 字段使用建议

### 5.1 字段可见性配置

**建议使用 `visible_fields` 配置来控制字段显示：**
- 不同 offering 类型显示不同的字段组合
- 避免显示不相关的字段，提升用户体验
- 保持数据模型的灵活性

### 5.2 字段分组显示

**建议将字段分组显示：**
1. **基础信息**：name, slug, description, poster
2. **目标受众**：age, grade, skill_level
3. **课程内容**：curriculum, learning_outcomes, prerequisites
4. **时间安排**：duration, schedule, dates
5. **价格信息**：price, payment plans, discounts
6. **政策和规则**：cancellation, refund, attendance
7. **讲师信息**：instructor, team
8. **评估认证**：certificate, grading
9. **多媒体**：videos, images, resources
10. **分类标签**：categories, tags, topics

### 5.3 字段验证规则

**建议为不同字段设置验证规则：**
- 必填字段：name, slug, status
- 格式验证：email, URL, phone
- 范围验证：age_min < age_max, price > 0
- 依赖验证：discount_price < base_price

### 5.4 字段国际化

**建议支持多语言：**
- 核心字段支持多语言版本
- 使用 `translation_id` 关联不同语言版本
- 提供语言切换功能

## 6. 数据库设计建议

### 6.1 字段存储策略

**方案 A：扁平化存储（当前方案）**
- 所有通用字段存储在 `offerings` 表列中
- 类型特定字段存储在 `type_config` JSONB 中
- **优点：** 查询性能好，可以建立索引
- **缺点：** 表结构可能较大

**方案 B：完全 JSONB 存储**
- 所有字段存储在 JSONB 中
- **优点：** 灵活性极高
- **缺点：** 查询性能差，难以建立索引

**推荐：方案 A（当前方案）**
- 核心字段存储在表中
- 类型特定和可选字段存储在 JSONB 中
- 通过 `visible_fields` 控制字段显示

### 6.2 索引建议

**建议为以下字段建立索引：**
- `slug` - 唯一索引
- `status` - 用于过滤
- `offering_type` - 用于类型过滤
- `is_active` - 用于激活状态过滤
- `category_id` - 用于分类过滤
- `published_at` - 用于排序
- `base_price` - 用于价格范围查询

### 6.3 查询优化

**建议优化常见查询：**
- 按分类查询：使用 `category_id` 索引
- 按价格范围查询：使用 `base_price` 索引
- 按状态查询：使用 `status` 索引
- 全文搜索：使用 `name`, `description` 的全文索引

## 7. 实施建议

### 7.1 分阶段实施

**Phase 1: 核心字段（MVP）**
- 实现所有核心必填字段
- 实现基本的字段可见性配置

**Phase 2: 重要字段**
- 实现重要推荐字段
- 优化字段分组和显示

**Phase 3: 增强功能**
- 实现增强功能字段
- 添加多媒体支持

**Phase 4: 高级功能**
- 实现高级功能字段
- 添加分析和报告功能

### 7.2 字段扩展性

**建议使用以下策略保持扩展性：**
1. **使用 JSONB 存储灵活配置**：`type_config`, `custom_fields`, `metadata`
2. **使用字段可见性配置**：`visible_fields` 控制字段显示
3. **使用类型特定字段**：`type_specific_fields` 定义动态字段
4. **保持向后兼容**：新增字段时不影响现有数据

## 8. 总结

### 8.1 核心原则

1. **最小化必填字段**：只要求最核心的字段
2. **灵活配置**：使用 JSONB 和配置系统支持不同类型
3. **用户体验优先**：根据类型显示相关字段，隐藏不相关字段
4. **数据一致性**：确保字段名和结构的一致性
5. **可扩展性**：支持未来添加新字段和类型

### 8.2 推荐字段集合

**对于大多数在线教育系统，推荐实现以下字段集合：**

**核心字段（20个）：**
- name, slug, description, short_description
- status, is_active, offering_type
- base_price, currency
- age_min, age_max, target_grades
- session_count, duration_hours
- learning_outcomes, prerequisites
- poster_url, thumbnail_url
- cancellation_policy
- category_id, subcategory_ids, tags
- max_students, min_students

**增强字段（30个）：**
- curriculum, syllabus, what_you_will_learn
- instructor_id, instructor_name, instructor_bio
- video_preview_url, video_intro_url
- has_certificate, certificate_name
- delivery_mode, location_id, address
- schedule_type, weekly_frequency
- discount_price, payment_plans
- meta_title, meta_description
- featured, popular, bestseller
- view_count, enrollment_count, average_rating

**高级字段（20个）：**
- assessment_type, grading_policy
- has_community, discussion_forum
- prerequisite_course_ids, recommended_courses
- testimonials, social_proof
- system_requirements, software_required
- language, available_languages
- type_config, custom_fields

**总计：约 70 个字段**

### 8.3 实施优先级

1. **高优先级**：核心字段（20个）
2. **中优先级**：增强字段（30个）
3. **低优先级**：高级字段（20个）

根据业务需求逐步实施，不必一次性实现所有字段。

