# "Add Offering" 对话框设计方案

## 1. 内容分析

### 1.1 当前对话框中的字段分类

#### A. 通用字段（所有 Offering 类型共有）
这些字段存储在 `offerings` 表的列中，适用于所有类型的 offering：

**基础信息：**
- `offering_type` - Offering 类型（从 offering_types 表选择）
- `name` - Offering 名称 *
- `slug` - URL 友好的标识符（自动生成）
- `description` - 描述
- `poster_url` - 招贴画 URL

**分类和标签：**
- `subcategory_ids` - 子类别标签（通过关联表 course_subcategory_tags）

**目标受众：**
- `target_audience` - 目标受众描述
- `age_min` / `age_max` - 年龄范围
- `target_grades` - 目标年级数组
- `grade_level` - 年级级别

**课程信息：**
- `session_count` / `number_of_sessions` - 课程次数（向后兼容）
- `duration_hours` - 每次课程时长（小时）
- `learning_outcomes` - 学习成果
- `prerequisites` - 先修课程要求

**价格：**
- `base_price` - 基础价格
- `currency` - 货币（默认 USD）

**政策：**
- `cancellation_policy` - 取消政策

**状态：**
- `status` - 状态（draft, published, suspended, archived）

#### B. 专有配置（类型特定）
这些字段存储在 `offerings.type_config` JSONB 字段中，根据不同的 offering_type 而不同：

**Course 类型：**
- `default_session_count` - 默认总课次数
- `default_weekly_frequency` - 默认每周频率（1=每周，2=每两周）
- `default_duration_hours` - 默认每次课程时长
- `supports_multi_child_discount` - 是否支持多子女折扣

**Workshop 类型：**
- `supports_drop_in` - 是否支持一次性 drop-in
- `drop_in_price` - 单次 drop-in 价格
- `supports_multipass` - 是否支持 multipass
- `weekly_frequency` - 每周频率（1 或 2）
- `biweekly_interval` - 每两周间隔（当 weekly_frequency = 2 时）

**Camp 类型：**
- `default_duration_days` - 默认持续天数
- `default_daily_schedule` - 默认每日时间表
  - `start_time` - 开始时间
  - `end_time` - 结束时间

**Gift Card 类型：**
- `denominations` - 面额选项数组
- `expiry_months` - 有效期（月）

**Care Service 类型：**
- `service_duration_hours` - 服务时长（小时）
- `requires_advance_booking` - 是否需要提前预订
- `advance_booking_hours` - 提前预订时间（小时）

**Lunch Service 类型：**
- `meal_options` - 餐食选项数组
- `requires_camp_enrollment` - 是否仅限 Camp 参与者

**Free Trial 类型：**
- 通常不需要额外配置

## 2. 设计方案

### 2.1 字段分类原则

#### 通用字段（存储在 `offerings` 表列中）
**原则：**
- 所有 offering 类型都需要的字段
- 用于描述 offering 的基本信息、目标受众、价格、政策等
- 这些字段在数据库中有明确的列定义
- 在 UI 中始终显示，不随类型变化

**特点：**
- 字段名和类型固定
- 有数据库约束和验证
- 可以建立索引
- 便于查询和过滤

#### 专有配置（存储在 `offerings.type_config` JSONB 中）
**原则：**
- 只有特定 offering 类型需要的配置
- 配置内容由 `offering_types.config_schema` 定义
- 这些字段在数据库中没有独立的列
- 在 UI 中根据选中的类型动态显示

**特点：**
- 字段名和类型由 config_schema 定义
- 灵活，可以随时添加新字段
- 不需要修改数据库表结构
- 通过 JSONB 查询和索引

### 2.2 config_schema 结构设计

#### 方案 A：简单字段列表（当前实现）
```json
{
  "fields": ["default_session_count", "default_weekly_frequency", "default_duration_hours"]
}
```

**优点：**
- 简单直观
- 易于实现

**缺点：**
- 字段定义硬编码在代码中
- 无法自定义字段标签、验证规则等
- 扩展性差

#### 方案 B：详细字段定义（推荐）
```json
{
  "fields": [
    {
      "name": "default_session_count",
      "type": "number",
      "label": "Default Session Count",
      "placeholder": "10",
      "required": false,
      "min": 1,
      "max": 100,
      "description": "Default total number of sessions for this course"
    },
    {
      "name": "default_weekly_frequency",
      "type": "select",
      "label": "Default Weekly Frequency",
      "required": false,
      "options": [
        { "value": "1", "label": "1 (Weekly)" },
        { "value": "2", "label": "2 (Bi-weekly)" }
      ],
      "default": "1"
    },
    {
      "name": "supports_drop_in",
      "type": "boolean",
      "label": "Supports Drop-In",
      "default": false,
      "description": "Allow one-time drop-in purchases"
    },
    {
      "name": "drop_in_price",
      "type": "number",
      "label": "Drop-In Price",
      "placeholder": "50.00",
      "step": 0.01,
      "required": false,
      "dependsOn": {
        "field": "supports_drop_in",
        "value": true
      }
    },
    {
      "name": "default_daily_schedule",
      "type": "object",
      "label": "Default Daily Schedule",
      "fields": [
        {
          "name": "start_time",
          "type": "time",
          "label": "Start Time",
          "default": "09:00"
        },
        {
          "name": "end_time",
          "type": "time",
          "label": "End Time",
          "default": "15:00"
        }
      ]
    },
    {
      "name": "denominations",
      "type": "array",
      "label": "Denominations",
      "placeholder": "50, 100, 200, 500",
      "itemType": "number",
      "separator": ","
    },
    {
      "name": "meal_options",
      "type": "array",
      "label": "Meal Options",
      "placeholder": "vegetarian, non-vegetarian, vegan",
      "itemType": "text",
      "separator": ","
    }
  ]
}
```

**优点：**
- 完全动态，字段定义存储在数据库中
- 可以自定义标签、验证规则、依赖关系
- 易于扩展和维护
- Admin 可以在 offering_types 管理页面中配置字段

**缺点：**
- 实现复杂度较高
- 需要更完善的字段渲染引擎

### 2.3 UI 布局设计

#### 布局结构

```
┌─────────────────────────────────────────────────┐
│  Add New Offering                               │
├─────────────────────────────────────────────────┤
│                                                 │
│  【通用配置区域】                                │
│  ┌───────────────────────────────────────────┐ │
│  │ 1. Offering Type *                        │ │
│  │ 2. Offering Name *                         │ │
│  │ 3. Slug                                    │ │
│  │ 4. Description                             │ │
│  │ 5. Poster                                  │ │
│  │ 6. Subcategory Tags                        │ │
│  │ 7. Target Audience                         │ │
│  │ 8. Learning Outcomes                       │ │
│  │ 9. Prerequisites                           │ │
│  │ 10. Age Range (Min/Max)                    │ │
│  │ 11. Target Grades                          │ │
│  │ 12. Number of Sessions                     │ │
│  │ 13. Duration (Hours)                       │ │
│  │ 14. Base Price & Currency                 │ │
│  │ 15. Cancellation Policy                   │ │
│  │ 16. Status                                 │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  【类型特定配置区域】                            │
│  ┌───────────────────────────────────────────┐ │
│  │ {Offering Type} Configuration             │ │
│  │ (根据 config_schema 动态渲染)              │ │
│  │                                            │ │
│  │ - Field 1 (根据 schema 定义)              │ │
│  │ - Field 2 (根据 schema 定义)              │ │
│  │ - Field 3 (根据 schema 定义)              │ │
│  │ ...                                        │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  [Cancel]  [Create Offering]                   │
└─────────────────────────────────────────────────┘
```

#### 视觉区分

**通用配置区域：**
- 使用统一的背景色（默认白色/卡片色）
- 标题："General Information" 或 "Basic Information"
- 字段按逻辑分组（基础信息、目标受众、价格等）

**类型特定配置区域：**
- 使用不同的背景色（如浅灰色 `bg-muted/50`）
- 标题："{Offering Type Name} Configuration"
- 边框和圆角，视觉上与通用区域区分
- 根据 config_schema 动态显示字段

### 2.4 字段分组建议

#### 通用字段分组

**组 1：基础信息**
- Offering Type *
- Offering Name *
- Slug
- Description
- Poster

**组 2：分类和标签**
- Subcategory Tags

**组 3：目标受众**
- Target Audience
- Age Range (Min/Max)
- Target Grades

**组 4：课程信息**
- Number of Sessions
- Duration (Hours)
- Learning Outcomes
- Prerequisites

**组 5：价格**
- Base Price
- Currency

**组 6：政策**
- Cancellation Policy

**组 7：状态**
- Status *

#### 类型特定配置
- 根据 config_schema 动态渲染
- 所有字段在一个区域内
- 字段顺序按照 config_schema 中定义的顺序

### 2.5 数据流设计

#### 创建 Offering 流程

1. **用户选择 Offering Type**
   - 从 `offering_types` 表加载所有激活的类型
   - 用户选择类型后，获取该类型的 `config_schema`

2. **显示通用字段**
   - 始终显示所有通用字段
   - 字段值保存到 `offerings` 表的对应列

3. **显示类型特定配置**
   - 根据选中类型的 `config_schema` 动态渲染字段
   - 字段值保存到 `offerings.type_config` JSONB 字段

4. **数据验证**
   - 通用字段：使用数据库约束和前端验证
   - 类型特定配置：根据 config_schema 中的验证规则验证

5. **数据保存**
   ```typescript
   {
     // 通用字段（保存到 offerings 表列）
     name: "Introduction to Robotics",
     slug: "introduction-to-robotics",
     description: "...",
     age_min: 5,
     age_max: 8,
     base_price: 299.99,
     currency: "USD",
     // ...
     
     // 类型特定配置（保存到 type_config JSONB）
     type_config: {
       default_session_count: 10,
       default_weekly_frequency: 1,
       default_duration_hours: 1.5,
       supports_multi_child_discount: true
     }
   }
   ```

### 2.6 config_schema 字段类型支持

#### 支持的字段类型

1. **number**
   - 整数或浮点数
   - 支持 `min`, `max`, `step` 属性
   - 示例：session_count, price, duration

2. **text**
   - 单行文本
   - 支持 `maxLength`, `pattern` 属性
   - 示例：name, description

3. **textarea**
   - 多行文本
   - 支持 `rows` 属性
   - 示例：description, policy

4. **boolean**
   - 复选框
   - 默认值：false
   - 示例：supports_drop_in, requires_advance_booking

5. **select**
   - 下拉选择
   - 支持 `options` 数组
   - 示例：weekly_frequency, currency

6. **array**
   - 数组（逗号分隔或 JSON 数组）
   - 支持 `itemType`（number/text）
   - 支持 `separator`（默认 ","）
   - 示例：denominations, meal_options, target_grades

7. **time**
   - 时间选择器
   - 格式：HH:mm
   - 示例：start_time, end_time

8. **object**
   - 嵌套对象
   - 支持 `fields` 数组定义子字段
   - 示例：default_daily_schedule

9. **date**
   - 日期选择器
   - 格式：YYYY-MM-DD
   - 示例：start_date, end_date

### 2.7 字段依赖关系

#### 条件显示
```json
{
  "name": "drop_in_price",
  "dependsOn": {
    "field": "supports_drop_in",
    "value": true,
    "operator": "equals"  // equals, notEquals, greaterThan, lessThan, in, notIn
  }
}
```

#### 条件验证
```json
{
  "name": "biweekly_interval",
  "dependsOn": {
    "field": "weekly_frequency",
    "value": 2,
    "required": true  // 当依赖条件满足时，此字段变为必填
  }
}
```

### 2.8 字段验证规则

#### 验证规则定义
```json
{
  "name": "default_session_count",
  "type": "number",
  "validation": {
    "required": false,
    "min": 1,
    "max": 100,
    "integer": true,
    "custom": "function_name"  // 自定义验证函数
  }
}
```

### 2.9 UI 组件映射

#### 字段类型到 UI 组件的映射

| 字段类型 | UI 组件 | 说明 |
|---------|---------|------|
| number | Input (type="number") | 数字输入框 |
| text | Input (type="text") | 文本输入框 |
| textarea | Textarea | 多行文本 |
| boolean | Checkbox | 复选框 |
| select | Select | 下拉选择 |
| array | Input (type="text") + 解析 | 逗号分隔的文本输入 |
| time | Input (type="time") | 时间选择器 |
| object | 嵌套字段组 | 对象字段组 |
| date | Input (type="date") | 日期选择器 |

### 2.10 实施建议

#### Phase 1: 基础实现
1. 保持当前简单字段列表的 config_schema 结构
2. 在代码中硬编码字段定义映射（getFieldConfig）
3. 实现基本的动态渲染

#### Phase 2: 增强 config_schema
1. 扩展 config_schema 结构，支持详细字段定义
2. 更新 offering_types 表的默认数据
3. 实现完整的字段渲染引擎

#### Phase 3: Admin 配置界面
1. 在 offering_types 管理页面中添加 config_schema 编辑器
2. 允许 admin 通过 UI 配置字段定义
3. 支持字段的添加、删除、修改

#### Phase 4: 高级功能
1. 支持字段依赖关系
2. 支持自定义验证规则
3. 支持字段分组和布局配置

## 3. 数据存储映射

### 3.1 通用字段 → offerings 表列

| 对话框字段 | 数据库列 | 类型 | 必填 |
|-----------|---------|------|------|
| Offering Type | offering_type | offering_type_enum | ✅ |
| Offering Name | name | TEXT | ✅ |
| Slug | slug | TEXT | ❌ |
| Description | description | TEXT | ❌ |
| Poster | poster_url | TEXT | ❌ |
| Subcategory Tags | - | 关联表 | ❌ |
| Target Audience | target_audience | TEXT | ❌ |
| Learning Outcomes | learning_outcomes | TEXT | ❌ |
| Prerequisites | prerequisites | TEXT | ❌ |
| Min Age | age_min | INTEGER | ❌ |
| Max Age | age_max | INTEGER | ❌ |
| Target Grades | target_grades | TEXT[] | ❌ |
| Number of Sessions | session_count | INTEGER | ❌ |
| Duration (Hours) | duration_hours | INTEGER | ❌ |
| Base Price | base_price | DECIMAL(10,2) | ❌ |
| Currency | currency | TEXT | ❌ |
| Cancellation Policy | cancellation_policy | TEXT | ❌ |
| Status | status | course_status | ✅ |

### 3.2 类型特定配置 → offerings.type_config JSONB

所有通过 config_schema 定义的字段都存储在 `type_config` JSONB 字段中。

## 4. 优势分析

### 4.1 分离通用字段和专有配置的优势

1. **清晰的职责分离**
   - 通用字段：描述 offering 的基本属性
   - 专有配置：类型特定的业务逻辑配置

2. **数据库优化**
   - 通用字段有明确的列定义，可以建立索引
   - 专有配置使用 JSONB，灵活但不影响核心查询性能

3. **UI 清晰度**
   - 用户可以清楚区分哪些是通用信息，哪些是类型特定配置
   - 视觉上通过不同的区域区分

4. **维护性**
   - 通用字段的修改需要数据库迁移
   - 专有配置的修改只需要更新 config_schema，不需要数据库迁移

5. **扩展性**
   - 添加新的 offering 类型时，只需要在 offering_types 表中添加记录和 config_schema
   - 不需要修改代码或数据库表结构

## 5. 实施注意事项

### 5.1 向后兼容
- 保持现有的通用字段不变
- 确保现有的 offerings 数据可以正常显示和编辑

### 5.2 数据验证
- 通用字段：使用数据库约束和前端验证
- 专有配置：根据 config_schema 中的验证规则验证

### 5.3 错误处理
- 如果 config_schema 格式错误，显示友好的错误信息
- 如果字段定义缺失，使用默认的字段配置

### 5.4 性能考虑
- config_schema 可以缓存，避免每次打开对话框都查询数据库
- 字段渲染可以使用 React.memo 优化

## 6. 总结

这个设计方案清晰地分离了：
- **通用字段**：存储在 `offerings` 表列中，所有类型共有
- **专有配置**：存储在 `offerings.type_config` JSONB 中，由 `offering_types.config_schema` 定义

通过这种设计，系统既保持了数据库结构的清晰性，又提供了足够的灵活性来支持不同类型的 offering 配置。

