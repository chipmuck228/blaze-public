# Franchise 页面内容管理设计方案

## 1. 概述

在 HQ/Franchise 架构下，每个 franchise 的页面（如 `/locations/issaquah` 或 `issaquah.blazeroboticsacademy.org`）应该显示该 franchise 特有的内容，包括：
- Hero 区域（标题、描述、地址）
- 特色亮点（Programs、Schedule、Focus）
- 联系方式（地址、电话、邮箱、营业时间）
- 社交媒体链接
- 品牌配置（Logo、颜色主题）
- 本地化内容（欢迎语、介绍文本）

这些内容应该从数据库动态获取，而不是硬编码。

---

## 2. 需要扩展的表

### 2.1 `franchises` 表扩展

**当前字段**：
```sql
- id: UUID (PK)
- code: TEXT (UNIQUE)
- name: TEXT
- primary_domain: TEXT
- timezone: TEXT
- branding_config: JSONB
- is_active: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

**建议扩展字段**：
```sql
-- 扩展 franchises 表
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS hero_title TEXT;
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS hero_description TEXT;
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS hero_subtitle TEXT;

-- 联系方式（可以放在 branding_config 中，也可以单独字段）
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS contact_address TEXT;
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS contact_city TEXT;
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS contact_state TEXT;
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS contact_zip_code TEXT;

-- 营业时间（可以放在 branding_config 中，也可以单独字段）
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS business_hours JSONB;
-- 示例: {"monday": "9:00 AM - 6:00 PM", "tuesday": "9:00 AM - 6:00 PM", ...}

-- 社交媒体链接（可以放在 branding_config 中，也可以单独字段）
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS social_links JSONB;
-- 示例: {"facebook": "https://...", "instagram": "https://...", "twitter": "https://..."}

-- 特色亮点（可以放在 branding_config 中，也可以单独字段）
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS highlights JSONB;
-- 示例: {"programs": "...", "schedule": "...", "focus": "..."}

-- SEO 相关
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS meta_title TEXT;
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS meta_keywords TEXT;
```

**或者使用 `branding_config` JSONB 字段（推荐）**：
```sql
-- 保持 branding_config 字段，但定义标准结构
-- branding_config JSONB 结构：
{
  "hero": {
    "title": "Issaquah Robotics Academy",
    "subtitle": "Empowering the next generation of innovators",
    "description": "Local robotics, coding, and engineering programs for students in the Issaquah area."
  },
  "contact": {
    "email": "issaquah@blazeroboticsacademy.org",
    "phone": "+1 (425) 555-0123",
    "address": {
      "street": "123 Main Street",
      "city": "Issaquah",
      "state": "WA",
      "zip": "98027"
    },
    "businessHours": {
      "monday": "9:00 AM - 6:00 PM",
      "tuesday": "9:00 AM - 6:00 PM",
      "wednesday": "9:00 AM - 6:00 PM",
      "thursday": "9:00 AM - 6:00 PM",
      "friday": "9:00 AM - 6:00 PM",
      "saturday": "10:00 AM - 4:00 PM",
      "sunday": "Closed"
    }
  },
  "social": {
    "facebook": "https://facebook.com/blazeroboticsissaquah",
    "instagram": "https://instagram.com/blazeroboticsissaquah",
    "twitter": "https://twitter.com/blazeroboticsissaquah",
    "youtube": "https://youtube.com/@blazeroboticsissaquah"
  },
  "highlights": {
    "programs": "Age-appropriate robotics, coding, and STEM programs designed for local students.",
    "schedule": "After-school and weekend offerings during the school year, plus camps during breaks.",
    "focus": "Hands-on learning, teamwork, and preparing students for real-world robotics challenges."
  },
  "branding": {
    "logoUrl": "https://...",
    "primaryColor": "#0066CC",
    "secondaryColor": "#FF6600",
    "accentColor": "#00CC66"
  },
  "seo": {
    "title": "Issaquah Robotics Academy | Blaze Robotics",
    "description": "Join Issaquah Robotics Academy for hands-on robotics and coding programs...",
    "keywords": "robotics, coding, Issaquah, STEM education"
  }
}
```

**推荐方案**：使用 `branding_config` JSONB 字段，因为：
- 灵活性高，可以随时添加新字段
- 不需要频繁修改表结构
- 可以存储复杂的嵌套数据
- 便于版本控制和迁移

---

### 2.2 新建 `franchise_content` 表（可选，用于更复杂的内容管理）

如果需要更细粒度的内容管理（如多语言支持、内容版本控制），可以创建单独的表：

```sql
CREATE TABLE IF NOT EXISTS franchise_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id UUID NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,  -- 'hero_title', 'hero_description', 'highlight_programs', 'contact_email', etc.
  content_key TEXT NOT NULL,   -- 内容键，如 'hero.title', 'contact.email'
  content_value TEXT,          -- 内容值（文本）
  content_json JSONB,          -- 内容值（JSON，用于复杂结构）
  language_code TEXT DEFAULT 'en',  -- 多语言支持
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(franchise_id, content_key, language_code)
);

CREATE INDEX idx_franchise_content_franchise ON franchise_content(franchise_id);
CREATE INDEX idx_franchise_content_type ON franchise_content(content_type);
CREATE INDEX idx_franchise_content_active ON franchise_content(is_active);
```

**使用场景**：
- 需要多语言支持
- 需要内容版本控制
- 需要内容审核工作流
- 需要更细粒度的权限控制

**当前阶段建议**：暂时不使用此表，优先使用 `branding_config` JSONB 字段。

---

### 2.3 `course_locations` 表扩展（用于显示该 franchise 的所有 campus）

**当前字段**：
```sql
- id: UUID (PK)
- name: TEXT
- address: TEXT
- city: TEXT
- state: TEXT
- zip_code: TEXT
- franchise_id: UUID (FK -> franchises.id)
- is_active: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

**建议扩展字段**（如果需要更详细的 campus 信息）：
```sql
ALTER TABLE course_locations ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE course_locations ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE course_locations ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE course_locations ADD COLUMN IF NOT EXISTS parking_info TEXT;
ALTER TABLE course_locations ADD COLUMN IF NOT EXISTS check_in_info TEXT;
ALTER TABLE course_locations ADD COLUMN IF NOT EXISTS amenities JSONB;
-- 示例: {"parking": "Free parking available", "wifi": "Free WiFi", "accessibility": "Wheelchair accessible"}
```

---

## 3. 数据获取策略

### 3.1 页面内容数据来源

#### 3.1.1 Hero 区域
**数据来源**：`franchises.branding_config.hero`
- `hero.title`: 页面主标题（如 "Issaquah Robotics Academy"）
- `hero.subtitle`: 副标题（可选）
- `hero.description`: 描述文本

**备用方案**：如果 `branding_config` 中没有，使用 `franchises.name` + 默认描述

#### 3.1.2 地址信息
**数据来源**：`franchises.branding_config.contact.address` 或 `course_locations` 表
- 优先使用 `branding_config.contact.address`（如果存在）
- 否则，从 `course_locations` 表中获取该 franchise 的所有 active locations
- 如果只有一个 location，显示该 location 的地址
- 如果有多个 locations，显示主要 location 的地址，或显示 "Multiple campuses in {city}"

#### 3.1.3 联系方式
**数据来源**：`franchises.branding_config.contact`
- `contact.email`: 联系邮箱
- `contact.phone`: 联系电话
- `contact.businessHours`: 营业时间

#### 3.1.4 社交媒体链接
**数据来源**：`franchises.branding_config.social`
- `social.facebook`: Facebook 链接
- `social.instagram`: Instagram 链接
- `social.twitter`: Twitter 链接
- `social.youtube`: YouTube 链接

#### 3.1.5 特色亮点
**数据来源**：`franchises.branding_config.highlights`
- `highlights.programs`: Programs 描述
- `highlights.schedule`: Schedule 描述
- `highlights.focus`: Focus 描述

**备用方案**：如果 `branding_config` 中没有，使用默认文本

#### 3.1.6 品牌配置
**数据来源**：`franchises.branding_config.branding`
- `branding.logoUrl`: Logo URL（可选，用于替换默认 Logo）
- `branding.primaryColor`: 主色调（可选，用于主题定制）
- `branding.secondaryColor`: 次要颜色（可选）
- `branding.accentColor`: 强调色（可选）

#### 3.1.7 特色课程
**数据来源**：`courses` 表 + `course_instances` 表（通过 franchise_id 过滤）
- 获取该 franchise 的 active instances
- 关联到对应的 courses
- 显示为 "Featured Courses" 或 "Available Programs"

#### 3.1.8 Campus 列表
**数据来源**：`course_locations` 表（通过 franchise_id 过滤）
- 获取该 franchise 的所有 active locations
- 显示为 "Our Campuses" 或 "Locations"

---

### 3.2 数据获取 API 设计

#### 3.2.1 获取 Franchise 详细信息
```
GET /api/public/franchises/{code}
Response: {
  id: string,
  code: string,
  name: string,
  primary_domain: string | null,
  timezone: string,
  branding_config: {
    hero: { title, subtitle, description },
    contact: { email, phone, address, businessHours },
    social: { facebook, instagram, twitter, youtube },
    highlights: { programs, schedule, focus },
    branding: { logoUrl, primaryColor, secondaryColor, accentColor },
    seo: { title, description, keywords }
  },
  is_active: boolean
}
```

#### 3.2.2 获取 Franchise 的 Locations
```
GET /api/public/franchises/{code}/locations
Response: [{
  id: string,
  name: string,
  address: string,
  city: string,
  state: string,
  zip_code: string,
  description: string | null,
  phone: string | null,
  email: string | null,
  parking_info: string | null,
  check_in_info: string | null,
  amenities: object | null
}]
```

#### 3.2.3 获取 Franchise 的特色课程
```
GET /api/public/franchises/{code}/featured-courses
Response: [{
  id: string,
  name: string,
  slug: string,
  description: string,
  poster_url: string | null,
  target_grades: string[],
  base_price: number,
  instances: [{
    id: string,
    start_date: string,
    end_date: string,
    location: { name, address },
    available_capacity: number
  }]
}]
```

---

## 4. 前端显示内容

### 4.1 Hero 区域
**显示内容**：
- 主标题：`branding_config.hero.title` 或 `franchises.name`
- 副标题：`branding_config.hero.subtitle`（可选）
- 描述：`branding_config.hero.description` 或默认描述
- 地址信息：`branding_config.contact.address` 或主要 location 的地址
- CTA 按钮：
  - "View Programs" → `/course-catalog?franchise={code}`
  - "Contact Us" → `#contact`

### 4.2 特色亮点卡片
**显示内容**：
- Programs：`branding_config.highlights.programs` 或默认文本
- Schedule：`branding_config.highlights.schedule` 或默认文本
- Focus：`branding_config.highlights.focus` 或默认文本

### 4.3 特色课程区域
**显示内容**：
- 从 API 获取该 franchise 的特色课程
- 显示课程卡片（名称、描述、价格、可用实例）
- "Learn More" 按钮 → `/course-catalog/{slug}?franchise={code}`
- "Enroll" 按钮 → 注册流程

### 4.4 联系方式区域
**显示内容**：
- 地址：`branding_config.contact.address` 或主要 location 的地址
- 电话：`branding_config.contact.phone`
- 邮箱：`branding_config.contact.email`
- 营业时间：`branding_config.contact.businessHours`
- 社交媒体链接：`branding_config.social`（Facebook、Instagram、Twitter、YouTube）

### 4.5 Campus 列表（如果有多个 locations）
**显示内容**：
- 从 API 获取该 franchise 的所有 active locations
- 显示每个 location 的：
  - 名称
  - 地址
  - 电话（如果有）
  - 描述（如果有）
  - 设施信息（如果有）

---

## 5. 数据优先级和回退策略

### 5.1 优先级顺序

1. **Franchise 特定内容**（最高优先级）
   - `franchises.branding_config` 中的内容
   - 如果存在，优先使用

2. **Location 聚合内容**（中等优先级）
   - 从 `course_locations` 表获取该 franchise 的 locations
   - 如果有多个 locations，使用主要 location 的信息
   - 如果只有一个 location，使用该 location 的信息

3. **默认内容**（最低优先级）
   - 如果以上都没有，使用默认文本
   - 例如："Local robotics, coding, and engineering programs for students in the {city} area."

### 5.2 回退策略示例

**Hero 标题**：
1. `branding_config.hero.title`（如果存在）
2. `franchises.name`（如果存在）
3. `{city} Robotics Academy`（基于 location 的 city）

**地址信息**：
1. `branding_config.contact.address`（如果存在）
2. 主要 location 的地址（如果存在）
3. `{city}, {state}`（基于 location 的 city 和 state）

**联系方式**：
1. `branding_config.contact.email` / `phone`（如果存在）
2. 主要 location 的 email / phone（如果存在）
3. HQ 的联系方式（全局默认）

---

## 6. 实施建议

### 6.1 阶段 1：基础扩展（立即实施）

1. **扩展 `franchises.branding_config` 字段**
   - 定义标准 JSON 结构
   - 为现有 franchises 添加默认内容
   - 创建 Admin UI 用于编辑 `branding_config`

2. **创建 API 路由**
   - `GET /api/public/franchises/{code}` - 获取 franchise 详细信息
   - `GET /api/public/franchises/{code}/locations` - 获取 franchise 的 locations
   - `GET /api/public/franchises/{code}/featured-courses` - 获取特色课程

3. **更新前端页面**
   - 修改 `/locations/[code]/page.tsx` 使用 API 数据
   - 实现回退策略
   - 添加加载状态和错误处理

### 6.2 阶段 2：内容管理（短期）

1. **创建 Admin UI**
   - Franchise 内容编辑页面
   - 支持编辑 `branding_config` 的各个字段
   - 实时预览功能

2. **扩展 `course_locations` 表**
   - 添加 `description`、`phone`、`email` 等字段
   - 更新 Admin UI 支持编辑这些字段

### 6.3 阶段 3：高级功能（长期）

1. **多语言支持**
   - 创建 `franchise_content` 表
   - 支持多语言内容管理

2. **内容版本控制**
   - 添加内容历史记录
   - 支持内容审核工作流

3. **SEO 优化**
   - 使用 `branding_config.seo` 字段
   - 动态生成 meta 标签

---

## 7. 数据库迁移脚本示例

```sql
-- =========================================================
-- migrate-extend-franchises-content.sql
-- 扩展 franchises 表以支持页面内容管理
-- =========================================================

-- 1. 确保 branding_config 字段存在（如果不存在，创建它）
-- 注意：branding_config 字段应该已经在 migrate-add-franchises.sql 中创建

-- 2. 为现有 franchises 添加默认 branding_config（如果为空）
UPDATE franchises
SET branding_config = jsonb_build_object(
  'hero', jsonb_build_object(
    'title', name,
    'description', 'Local robotics, coding, and engineering programs for students in the ' || 
                   CASE 
                     WHEN code = 'bellevue' THEN 'Bellevue'
                     WHEN code = 'belred' THEN 'Bel-Red'
                     WHEN code = 'issaquah' THEN 'Issaquah'
                     WHEN code = 'cherrycrest' THEN 'Cherry Crest'
                     ELSE code
                   END || ' area.'
  ),
  'highlights', jsonb_build_object(
    'programs', 'Age-appropriate robotics, coding, and STEM programs designed for local students.',
    'schedule', 'After-school and weekend offerings during the school year, plus camps during breaks.',
    'focus', 'Hands-on learning, teamwork, and preparing students for real-world robotics challenges.'
  )
)
WHERE branding_config IS NULL OR branding_config = '{}'::jsonb;

-- 3. 扩展 course_locations 表（如果需要）
ALTER TABLE course_locations 
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS parking_info TEXT,
  ADD COLUMN IF NOT EXISTS check_in_info TEXT,
  ADD COLUMN IF NOT EXISTS amenities JSONB;
```

---

## 8. 总结

### 8.1 核心建议

1. **使用 `branding_config` JSONB 字段**（推荐）
   - 灵活性高，易于扩展
   - 不需要频繁修改表结构
   - 可以存储复杂的嵌套数据

2. **数据获取优先级**
   - Franchise 特定内容 > Location 聚合内容 > 默认内容

3. **API 设计**
   - 提供统一的 API 接口
   - 实现回退策略
   - 支持缓存以提高性能

4. **前端实现**
   - 动态加载内容
   - 实现回退策略
   - 添加加载状态和错误处理

### 8.2 需要扩展的表

1. **`franchises` 表**（主要）
   - 使用 `branding_config` JSONB 字段存储页面内容
   - 定义标准 JSON 结构

2. **`course_locations` 表**（可选）
   - 添加 `description`、`phone`、`email` 等字段
   - 用于显示详细的 campus 信息

3. **`franchise_content` 表**（未来，可选）
   - 用于多语言支持
   - 用于内容版本控制

### 8.3 数据来源

1. **Hero 区域**：`franchises.branding_config.hero`
2. **联系方式**：`franchises.branding_config.contact`
3. **社交媒体**：`franchises.branding_config.social`
4. **特色亮点**：`franchises.branding_config.highlights`
5. **品牌配置**：`franchises.branding_config.branding`
6. **特色课程**：`courses` + `course_instances`（通过 franchise_id 过滤）
7. **Campus 列表**：`course_locations`（通过 franchise_id 过滤）

---

**结论**：优先使用 `franchises.branding_config` JSONB 字段存储页面内容，通过 API 动态获取并显示，实现回退策略以确保即使没有配置内容也能正常显示页面。

