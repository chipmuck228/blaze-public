# Offerings 数据表重新设计方案

## 1. 问题分析

### 1.1 不同 Offering 类型的字段需求

分析每种 offering 类型实际需要的字段：

| 字段 | Course | Camp | Workshop | Free Trial | Gift Card | Care Service | Lunch Service |
|------|--------|------|----------|------------|-----------|--------------|---------------|
| **核心字段（所有类型必需）** |
| `name` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `slug` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `description` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `poster_url` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `offering_type` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `status` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `type_config` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **教育相关字段（仅部分类型需要）** |
| `target_audience` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `age_min` / `age_max` | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| `target_grades` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `grade_level` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `session_count` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `duration_hours` | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| `learning_outcomes` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `prerequisites` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **价格相关字段** |
| `base_price` | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| `currency` | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| **政策相关字段** |
| `cancellation_policy` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **分类标签** |
| `subcategory_tags` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

### 1.2 问题总结

1. **Gift Card** 只需要：name, description, slug, poster_url, base_price, currency
2. **Lunch Service** 只需要：name, description, slug, poster_url, base_price, currency
3. **Care Service** 不需要：target_grades, grade_level, session_count, learning_outcomes, prerequisites
4. **Workshop** 可能不需要：learning_outcomes, prerequisites
5. **Free Trial** 不需要：base_price, currency, cancellation_policy

**结论：** 当前设计将所有字段都作为"通用字段"是不合理的，需要重新设计。

## 2. 设计方案

### 2.1 方案对比

#### 方案 A：字段可见性配置（推荐）⭐

**核心思想：**
- 保持数据库表结构不变（所有字段都保留）
- 在 `offering_types.config_schema` 中定义哪些通用字段应该显示
- UI 根据配置动态显示/隐藏字段

**优点：**
- ✅ 不需要修改数据库表结构
- ✅ 向后兼容性好
- ✅ 灵活，可以为每种类型定制字段显示
- ✅ 数据库查询性能不受影响（字段仍然可以索引）

**缺点：**
- ⚠️ 某些字段对某些类型没有意义（但可以为 NULL）
- ⚠️ 需要在 config_schema 中维护字段可见性配置

**实施：**
```json
{
  "visible_fields": {
    "general": ["name", "slug", "description", "poster_url", "status"],
    "education": ["target_audience", "age_min", "age_max", "target_grades", "session_count", "duration_hours", "learning_outcomes", "prerequisites"],
    "pricing": ["base_price", "currency"],
    "policy": ["cancellation_policy"],
    "tags": ["subcategory_tags"]
  },
  "type_specific_fields": [
    {
      "name": "denominations",
      "type": "array",
      "label": "Denominations"
    }
  ]
}
```

#### 方案 B：核心字段 + 可选字段分离

**核心思想：**
- 将字段分为"核心字段"（所有类型必需）和"可选字段"（部分类型需要）
- 可选字段存储在 JSONB 中

**优点：**
- ✅ 数据库结构更清晰
- ✅ 字段语义更准确

**缺点：**
- ❌ 需要修改数据库表结构
- ❌ 可选字段无法建立索引（影响查询性能）
- ❌ 向后兼容性差

#### 方案 C：所有非核心字段移到 JSONB

**核心思想：**
- 只保留核心字段在表中
- 其他所有字段都存储在 JSONB 中

**优点：**
- ✅ 数据库结构最简洁

**缺点：**
- ❌ 查询性能差（JSONB 字段无法高效索引）
- ❌ 向后兼容性差
- ❌ 字段验证困难

### 2.2 推荐方案：方案 A（字段可见性配置）

#### 2.2.1 数据库表结构（保持不变）

```sql
CREATE TABLE offerings (
  -- 核心字段（所有类型必需）
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  poster_url TEXT,
  offering_type offering_type_enum NOT NULL,
  status course_status DEFAULT 'draft',
  type_config JSONB DEFAULT '{}',
  
  -- 教育相关字段（部分类型需要，可以为 NULL）
  target_audience TEXT,
  age_min INTEGER,
  age_max INTEGER,
  target_grades TEXT[],
  grade_level TEXT,
  session_count INTEGER,
  duration_hours INTEGER,
  learning_outcomes TEXT,
  prerequisites TEXT,
  
  -- 价格相关字段（部分类型需要，可以为 NULL）
  base_price DECIMAL(10, 2),
  currency TEXT DEFAULT 'USD',
  
  -- 政策相关字段（部分类型需要，可以为 NULL）
  cancellation_policy TEXT,
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2.2.2 config_schema 扩展结构

```json
{
  "visible_fields": {
    "general": {
      "name": true,
      "slug": true,
      "description": true,
      "poster_url": true,
      "status": true
    },
    "education": {
      "target_audience": false,
      "age_min": false,
      "age_max": false,
      "target_grades": false,
      "grade_level": false,
      "session_count": false,
      "duration_hours": false,
      "learning_outcomes": false,
      "prerequisites": false
    },
    "pricing": {
      "base_price": true,
      "currency": true
    },
    "policy": {
      "cancellation_policy": false
    },
    "tags": {
      "subcategory_tags": false
    }
  },
  "type_specific_fields": [
    {
      "name": "denominations",
      "type": "array",
      "label": "Denominations",
      "placeholder": "50, 100, 200, 500",
      "required": false
    },
    {
      "name": "expiry_months",
      "type": "number",
      "label": "Expiry (Months)",
      "placeholder": "12",
      "required": false
    }
  ]
}
```

#### 2.2.3 各类型的 config_schema 示例

**Course 类型：**
```json
{
  "visible_fields": {
    "general": {
      "name": true,
      "slug": true,
      "description": true,
      "poster_url": true,
      "status": true
    },
    "education": {
      "target_audience": true,
      "age_min": true,
      "age_max": true,
      "target_grades": true,
      "grade_level": true,
      "session_count": true,
      "duration_hours": true,
      "learning_outcomes": true,
      "prerequisites": true
    },
    "pricing": {
      "base_price": true,
      "currency": true
    },
    "policy": {
      "cancellation_policy": true
    },
    "tags": {
      "subcategory_tags": true
    }
  },
  "type_specific_fields": [
    {
      "name": "default_session_count",
      "type": "number",
      "label": "Default Session Count",
      "placeholder": "10"
    },
    {
      "name": "default_weekly_frequency",
      "type": "select",
      "label": "Default Weekly Frequency",
      "options": [
        {"value": "1", "label": "1 (Weekly)"},
        {"value": "2", "label": "2 (Bi-weekly)"}
      ]
    }
  ]
}
```

**Gift Card 类型：**
```json
{
  "visible_fields": {
    "general": {
      "name": true,
      "slug": true,
      "description": true,
      "poster_url": true,
      "status": true
    },
    "education": {
      "target_audience": false,
      "age_min": false,
      "age_max": false,
      "target_grades": false,
      "grade_level": false,
      "session_count": false,
      "duration_hours": false,
      "learning_outcomes": false,
      "prerequisites": false
    },
    "pricing": {
      "base_price": true,
      "currency": true
    },
    "policy": {
      "cancellation_policy": false
    },
    "tags": {
      "subcategory_tags": false
    }
  },
  "type_specific_fields": [
    {
      "name": "denominations",
      "type": "array",
      "label": "Denominations",
      "placeholder": "50, 100, 200, 500"
    },
    {
      "name": "expiry_months",
      "type": "number",
      "label": "Expiry (Months)",
      "placeholder": "12"
    }
  ]
}
```

**Lunch Service 类型：**
```json
{
  "visible_fields": {
    "general": {
      "name": true,
      "slug": true,
      "description": true,
      "poster_url": true,
      "status": true
    },
    "education": {
      "target_audience": false,
      "age_min": false,
      "age_max": false,
      "target_grades": false,
      "grade_level": false,
      "session_count": false,
      "duration_hours": false,
      "learning_outcomes": false,
      "prerequisites": false
    },
    "pricing": {
      "base_price": true,
      "currency": true
    },
    "policy": {
      "cancellation_policy": false
    },
    "tags": {
      "subcategory_tags": false
    }
  },
  "type_specific_fields": [
    {
      "name": "meal_options",
      "type": "array",
      "label": "Meal Options",
      "placeholder": "vegetarian, non-vegetarian, vegan"
    },
    {
      "name": "requires_camp_enrollment",
      "type": "boolean",
      "label": "Requires Camp Enrollment"
    }
  ]
}
```

**Care Service 类型：**
```json
{
  "visible_fields": {
    "general": {
      "name": true,
      "slug": true,
      "description": true,
      "poster_url": true,
      "status": true
    },
    "education": {
      "target_audience": false,
      "age_min": true,
      "age_max": true,
      "target_grades": false,
      "grade_level": false,
      "session_count": false,
      "duration_hours": true,
      "learning_outcomes": false,
      "prerequisites": false
    },
    "pricing": {
      "base_price": true,
      "currency": true
    },
    "policy": {
      "cancellation_policy": true
    },
    "tags": {
      "subcategory_tags": false
    }
  },
  "type_specific_fields": [
    {
      "name": "service_duration_hours",
      "type": "number",
      "label": "Service Duration (Hours)",
      "placeholder": "2"
    },
    {
      "name": "requires_advance_booking",
      "type": "boolean",
      "label": "Requires Advance Booking"
    },
    {
      "name": "advance_booking_hours",
      "type": "number",
      "label": "Advance Booking (Hours)",
      "placeholder": "24"
    }
  ]
}
```

**Free Trial 类型：**
```json
{
  "visible_fields": {
    "general": {
      "name": true,
      "slug": true,
      "description": true,
      "poster_url": true,
      "status": true
    },
    "education": {
      "target_audience": true,
      "age_min": true,
      "age_max": true,
      "target_grades": true,
      "grade_level": true,
      "session_count": false,
      "duration_hours": true,
      "learning_outcomes": false,
      "prerequisites": false
    },
    "pricing": {
      "base_price": false,
      "currency": false
    },
    "policy": {
      "cancellation_policy": false
    },
    "tags": {
      "subcategory_tags": true
    }
  },
  "type_specific_fields": []
}
```

## 3. UI 实现设计

### 3.1 字段分组和显示逻辑

```typescript
// 伪代码
function renderOfferingDialog(offeringType, configSchema) {
  const visibleFields = configSchema.visible_fields
  
  return (
    <Dialog>
      {/* 通用配置区域 */}
      <Section title="General Information">
        {visibleFields.general.name && <NameField />}
        {visibleFields.general.slug && <SlugField />}
        {visibleFields.general.description && <DescriptionField />}
        {visibleFields.general.poster_url && <PosterField />}
        {visibleFields.general.status && <StatusField />}
      </Section>
      
      {/* 教育相关字段（条件显示） */}
      {hasAnyEducationField(visibleFields.education) && (
        <Section title="Education Information">
          {visibleFields.education.target_audience && <TargetAudienceField />}
          {visibleFields.education.age_min && <AgeMinField />}
          {visibleFields.education.age_max && <AgeMaxField />}
          {visibleFields.education.target_grades && <TargetGradesField />}
          {visibleFields.education.session_count && <SessionCountField />}
          {visibleFields.education.duration_hours && <DurationHoursField />}
          {visibleFields.education.learning_outcomes && <LearningOutcomesField />}
          {visibleFields.education.prerequisites && <PrerequisitesField />}
        </Section>
      )}
      
      {/* 价格相关字段（条件显示） */}
      {hasAnyPricingField(visibleFields.pricing) && (
        <Section title="Pricing">
          {visibleFields.pricing.base_price && <BasePriceField />}
          {visibleFields.pricing.currency && <CurrencyField />}
        </Section>
      )}
      
      {/* 政策相关字段（条件显示） */}
      {visibleFields.policy.cancellation_policy && (
        <Section title="Policy">
          <CancellationPolicyField />
        </Section>
      )}
      
      {/* 分类标签（条件显示） */}
      {visibleFields.tags.subcategory_tags && (
        <Section title="Tags">
          <SubcategoryTagsField />
        </Section>
      )}
      
      {/* 类型特定配置 */}
      {configSchema.type_specific_fields.length > 0 && (
        <Section title={`${offeringType} Configuration`}>
          {renderTypeSpecificFields(configSchema.type_specific_fields)}
        </Section>
      )}
    </Dialog>
  )
}
```

### 3.2 字段验证规则

根据 `visible_fields` 配置，只有显示的字段才需要验证：

```typescript
function validateOffering(formData, configSchema) {
  const errors = {}
  const visibleFields = configSchema.visible_fields
  
  // 验证通用字段
  if (visibleFields.general.name && !formData.name) {
    errors.name = "Name is required"
  }
  
  // 验证价格字段（如果显示）
  if (visibleFields.pricing.base_price && !formData.base_price) {
    errors.base_price = "Base price is required"
  }
  
  // 验证类型特定字段
  for (const field of configSchema.type_specific_fields) {
    if (field.required && !formData.type_config[field.name]) {
      errors[field.name] = `${field.label} is required`
    }
  }
  
  return errors
}
```

## 4. 数据保存逻辑

### 4.1 保存通用字段

```typescript
const offeringData = {
  // 核心字段（始终保存）
  name: formData.name,
  slug: formData.slug,
  description: formData.description,
  poster_url: formData.poster_url,
  offering_type: formData.offering_type,
  status: formData.status,
  
  // 教育相关字段（根据 visible_fields 决定是否保存）
  ...(configSchema.visible_fields.education.target_audience && {
    target_audience: formData.target_audience
  }),
  ...(configSchema.visible_fields.education.age_min && {
    age_min: formData.age_min
  }),
  // ... 其他字段
  
  // 价格相关字段
  ...(configSchema.visible_fields.pricing.base_price && {
    base_price: formData.base_price,
    currency: formData.currency
  }),
  
  // 类型特定配置（保存到 type_config）
  type_config: buildTypeConfig(formData, configSchema.type_specific_fields)
}
```

### 4.2 保存类型特定配置

```typescript
function buildTypeConfig(formData, typeSpecificFields) {
  const typeConfig = {}
  
  for (const field of typeSpecificFields) {
    const value = formData.type_config?.[field.name]
    if (value !== undefined && value !== null && value !== '') {
      typeConfig[field.name] = value
    }
  }
  
  return typeConfig
}
```

## 5. 迁移策略

### 5.1 数据库迁移

**不需要修改表结构**，只需要：
1. 更新 `offering_types` 表的 `config_schema` 字段
2. 为每种类型添加 `visible_fields` 配置

### 5.2 数据迁移

对于现有的 offerings：
- 如果某个字段对某个类型没有意义，可以保持为 NULL
- 不影响现有数据的查询和显示

### 5.3 向后兼容

- 如果 `config_schema` 中没有 `visible_fields`，默认显示所有字段（向后兼容）
- 如果某个字段的 `visible_fields` 配置缺失，默认显示该字段

## 6. 优势分析

### 6.1 方案 A 的优势

1. **不需要修改数据库表结构**
   - 保持现有表结构不变
   - 向后兼容性好
   - 不需要数据迁移

2. **灵活性强**
   - 可以为每种类型定制字段显示
   - 可以随时调整字段可见性
   - 不需要修改代码

3. **性能不受影响**
   - 字段仍然可以建立索引
   - 查询性能不受影响
   - 只是 UI 层面的显示/隐藏

4. **易于维护**
   - 字段定义集中管理（在 offering_types 表中）
   - Admin 可以通过 UI 配置字段可见性
   - 不需要修改代码

### 6.2 与其他方案对比

| 特性 | 方案 A（推荐） | 方案 B | 方案 C |
|------|---------------|--------|--------|
| 数据库修改 | ❌ 不需要 | ✅ 需要 | ✅ 需要 |
| 向后兼容 | ✅ 完全兼容 | ⚠️ 部分兼容 | ❌ 不兼容 |
| 查询性能 | ✅ 不受影响 | ⚠️ 部分影响 | ❌ 性能差 |
| 灵活性 | ✅ 高 | ⚠️ 中 | ✅ 高 |
| 实施复杂度 | ✅ 低 | ⚠️ 中 | ⚠️ 中 |

## 7. 实施步骤

### Phase 1: 更新 config_schema 结构
1. 扩展 `offering_types.config_schema` 结构，添加 `visible_fields`
2. 为每种类型定义字段可见性配置

### Phase 2: 更新 UI 组件
1. 修改 `OfferingEditDialog` 组件，根据 `visible_fields` 动态显示字段
2. 实现字段分组和条件显示逻辑

### Phase 3: 更新验证逻辑
1. 根据 `visible_fields` 调整字段验证规则
2. 只验证显示的字段

### Phase 4: 测试和优化
1. 测试每种类型的字段显示
2. 优化 UI 布局和用户体验

## 8. 总结

**推荐方案：方案 A（字段可见性配置）**

通过扩展 `config_schema` 结构，添加 `visible_fields` 配置，可以在不修改数据库表结构的情况下，为每种 offering 类型定制字段显示。这样既保持了数据库结构的清晰性，又提供了足够的灵活性来满足不同 offering 类型的需求。

**关键点：**
- ✅ 数据库表结构保持不变
- ✅ 通过 `visible_fields` 配置控制字段显示
- ✅ 向后兼容性好
- ✅ 查询性能不受影响
- ✅ 易于维护和扩展

