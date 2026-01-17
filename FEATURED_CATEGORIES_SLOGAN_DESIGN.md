# Featured Categories Slogan 字段设计方案

## 一、需求分析

在 `HeroCards` 组件中，当前使用：
- `display_name`：类别名称（标题）
- `description`：详细描述（较长文本）
- `poster_url`：招贴画图片

需要添加 slogan 字段，用于在 portal 上突出展示 featured categories，提升用户体验和视觉吸引力。

## 二、数据库设计

### 2.1 字段设计

在 `course_categories` 表中添加以下字段：

| 字段名 | 类型 | 默认值 | 说明 | 字符限制 |
|--------|------|--------|------|----------|
| `featured_slogan` | TEXT | NULL | 主标语，用于在 poster 图片上叠加显示或作为副标题 | 建议 50-100 字符 |
| `featured_subtitle` | TEXT | NULL | 副标题/补充标语，用于在 slogan 下方显示 | 建议 30-60 字符 |

### 2.2 字段用途区分

- **`display_name`**：类别名称（如 "Robotics Courses"）
- **`description`**：详细描述（较长文本，用于说明）
- **`featured_slogan`**：主标语（简短、吸引人，如 "Ignite Your Future with Robotics"）
- **`featured_subtitle`**：副标题（补充信息，如 "Learn, Build, Compete"）

### 2.3 字段使用场景

1. 在 poster 图片上叠加显示 `featured_slogan`（overlay text）
2. 在 `display_name` 下方显示 `featured_subtitle`
3. 在卡片内容区域显示 `featured_slogan` 作为强调文本

### 2.4 数据库迁移脚本

```sql
-- 添加 featured slogan 相关字段
ALTER TABLE course_categories
ADD COLUMN IF NOT EXISTS featured_slogan TEXT,
ADD COLUMN IF NOT EXISTS featured_subtitle TEXT;

-- 添加注释
COMMENT ON COLUMN course_categories.featured_slogan IS 'Main slogan for featured category display in hero section';
COMMENT ON COLUMN course_categories.featured_subtitle IS 'Subtitle for featured category display in hero section';
```

## 三、前端显示方案

### 3.1 Mobile 布局（< 1024px）

**当前结构：**
```
[Icon]
[display_name]
[description]
[Explore Button]
```

**建议修改：**
```
[Icon]
[display_name]
[featured_slogan] ← 新增，加粗或特殊样式
[description] ← 可选显示
[Explore Button]
```

### 3.2 Desktop Portrait 布局（>= 1024px, portrait）

**当前结构：**
```
[Poster Image]
[display_name]
[description]
[Explore Button]
```

**建议修改：**
```
[Poster Image]
  [Overlay: featured_slogan] ← 新增，在图片上叠加显示
[display_name]
[featured_subtitle] ← 新增，在标题下方
[description] ← 可选显示
[Explore Button]
```

### 3.3 Desktop Landscape 布局（>= 1024px, landscape）

**当前结构：**
```
[Poster Image (varying heights)]
[display_name]
[description]
[Explore Button]
```

**建议修改：**
```
[Poster Image (varying heights)]
  [Overlay: featured_slogan] ← 新增，在图片上叠加显示
[display_name]
[featured_subtitle] ← 新增，在标题下方
[description] ← 可选显示（line-clamp）
[Explore Button]
```

### 3.4 样式设计建议

#### Poster 图片上的 Overlay
- **位置**：图片底部
- **背景**：渐变（`bg-gradient-to-t from-black/60 to-transparent`）
- **文字**：白色、加粗、较大字号
- **响应式**：根据图片高度调整字号
- **示例样式**：
  ```tsx
  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 via-black/40 to-transparent">
    <p className="text-white font-bold text-lg lg:text-xl">
      {featured_slogan}
    </p>
  </div>
  ```

#### Subtitle 样式
- **位置**：`display_name` 下方
- **样式**：较小字号、muted 颜色或使用渐变色
- **间距**：与标题保持适当间距
- **示例样式**：
  ```tsx
  <p className="text-sm lg:text-base text-muted-foreground mt-1">
    {featured_subtitle}
  </p>
  ```

## 四、Admin 管理界面设计

### 4.1 编辑表单字段位置

在现有的编辑对话框中，在 "Featured in Hero Section" 部分添加：

```
┌─────────────────────────────────────┐
│ Featured in Hero Section            │
│ ☑ Featured in Hero Section          │
│                                     │
│ Poster Image: [Upload] [Preview]    │
│                                     │
│ Display Order: [0]                  │
│                                     │
│ ─── Featured Content ───            │
│ Featured Slogan:                    │
│ [Text Input - 单行]                  │
│ (显示在 poster 图片上或标题下方)     │
│ 提示：建议 50-100 字符               │
│                                     │
│ Featured Subtitle:                  │
│ [Text Input - 单行]                 │
│ (显示在标题下方，作为补充信息)       │
│ 提示：建议 30-60 字符               │
└─────────────────────────────────────┘
```

### 4.2 字段验证规则

1. **`featured_slogan`**：
   - 可选（当 `featured = true` 时建议填写）
   - 最大长度：100 字符
   - 不允许 HTML 标签（纯文本）

2. **`featured_subtitle`**：
   - 可选
   - 最大长度：60 字符
   - 不允许 HTML 标签（纯文本）

### 4.3 字段提示文本

- **Featured Slogan**: "简短、吸引人的标语，将显示在 poster 图片上或标题下方（建议 50-100 字符）"
- **Featured Subtitle**: "副标题或补充信息，显示在类别名称下方（建议 30-60 字符）"

### 4.4 字符计数器（可选增强）

在输入框下方显示字符计数，例如：
- `featured_slogan`: "50/100 字符"
- `featured_subtitle`: "30/60 字符"

## 五、API 设计

### 5.1 API 路由修改

需要修改以下 API 路由以支持新字段：

#### 5.1.1 GET /api/public/featured-categories

**修改内容**：
- 在 SELECT 查询中添加 `featured_slogan` 和 `featured_subtitle` 字段

**返回数据结构**：
```json
{
  "categories": [
    {
      "id": "...",
      "name": "...",
      "display_name": "...",
      "description": "...",
      "poster_url": "...",
      "featured_slogan": "...",
      "featured_subtitle": "...",
      "featured_display_order": 0
    }
  ]
}
```

#### 5.1.2 POST /api/admin/categories

**修改内容**：
- 接受 `featured_slogan` 和 `featured_subtitle` 参数
- 验证字符长度（前端和后端）

**请求体示例**：
```json
{
  "name": "robotics",
  "display_name": "Robotics",
  "description": "...",
  "featured": true,
  "poster_url": "...",
  "featured_slogan": "Ignite Your Future with Robotics",
  "featured_subtitle": "Learn, Build, Compete",
  "featured_display_order": 0
}
```

#### 5.1.3 PUT /api/admin/categories/[id]

**修改内容**：
- 接受 `featured_slogan` 和 `featured_subtitle` 参数
- 验证字符长度（前端和后端）

### 5.2 数据验证

#### 后端验证
- 字符长度验证：`featured_slogan` ≤ 100 字符，`featured_subtitle` ≤ 60 字符
- 如果 `featured = true`，建议填写 `featured_slogan`（非强制，仅警告）

#### 前端验证
- 实时字符计数显示
- 提交前验证字符长度
- 显示友好的错误提示

## 六、前端组件修改

### 6.1 HeroCards 组件

**文件**：`src/components/HeroCards.tsx`

**需要修改的内容**：

1. **更新 `FeaturedCategory` 接口**：
   ```typescript
   interface FeaturedCategory {
     id: string
     name: string
     display_name: string
     description?: string | null
     poster_url?: string | null
     featured_slogan?: string | null
     featured_subtitle?: string | null
     featured_display_order: number
   }
   ```

2. **Mobile 布局修改**：
   - 在 `display_name` 下方显示 `featured_slogan`（如果存在）
   - 保持 `description` 的显示逻辑

3. **Desktop Portrait 布局修改**：
   - 在 poster 图片上叠加显示 `featured_slogan`（如果存在）
   - 在 `display_name` 下方显示 `featured_subtitle`（如果存在）

4. **Desktop Landscape 布局修改**：
   - 在 poster 图片上叠加显示 `featured_slogan`（如果存在）
   - 在 `display_name` 下方显示 `featured_subtitle`（如果存在）

### 6.2 Admin Categories 管理页面

**文件**：`src/app/admin/categories/page.tsx`

**需要修改的内容**：

1. **更新 `CourseCategory` 接口**：
   ```typescript
   interface CourseCategory {
     // ... 现有字段
     featured_slogan?: string | null
     featured_subtitle?: string | null
   }
   ```

2. **更新 `formData` 状态**：
   ```typescript
   const [formData, setFormData] = useState({
     // ... 现有字段
     featured_slogan: "",
     featured_subtitle: "",
   })
   ```

3. **在编辑对话框中添加输入字段**：
   - Featured Slogan 输入框（单行，最大 100 字符）
   - Featured Subtitle 输入框（单行，最大 60 字符）
   - 字符计数器（可选）

### 6.3 类型定义更新

**文件**：`src/lib/db.ts`

**需要修改的内容**：

更新 `CourseCategory` 接口：
```typescript
export interface CourseCategory {
  id: string
  name: string
  display_name: string
  description?: string
  display_order: number
  is_active: boolean
  featured: boolean
  poster_url?: string | null
  featured_slogan?: string | null
  featured_subtitle?: string | null
  featured_display_order: number
  created_at: string
  updated_at: string
}
```

## 七、实施步骤

### 7.1 数据库迁移

1. 创建迁移脚本：`migrate-add-featured-slogan.sql`
2. 执行 SQL 脚本，添加 `featured_slogan` 和 `featured_subtitle` 字段

### 7.2 API 修改

1. 修改 `src/lib/db.ts` 中的 `CourseCategory` 接口
2. 修改 `src/app/api/public/featured-categories/route.ts`
3. 修改 `src/app/api/admin/categories/route.ts`（POST 方法）
4. 修改 `src/app/api/admin/categories/[id]/route.ts`（PUT 方法）

### 7.3 前端组件修改

1. 修改 `src/components/HeroCards.tsx`：
   - 更新接口定义
   - 更新三个布局的渲染逻辑

2. 修改 `src/app/admin/categories/page.tsx`：
   - 更新接口定义
   - 添加表单字段
   - 更新提交逻辑

### 7.4 测试

1. 数据库字段是否正确添加
2. API 是否正确返回新字段
3. Admin 界面是否可以编辑新字段
4. HeroCards 组件是否正确显示 slogan 和 subtitle
5. 响应式布局是否正常

## 八、实施优先级

### 高优先级
- ✅ 数据库字段添加
- ✅ API 路由更新
- ✅ Admin 管理界面添加编辑字段
- ✅ HeroCards 组件更新（三个布局）

### 中优先级
- 样式优化（overlay、subtitle）
- 字符长度验证（前端和后端）

### 低优先级
- 字符计数器（在编辑表单中显示剩余字符数）
- 预览功能（在编辑时预览效果）

## 九、可选增强功能

### 9.1 字符计数器
在编辑表单中显示剩余字符数，帮助管理员控制文本长度。

### 9.2 预览功能
在编辑对话框中实时预览 slogan 和 subtitle 的显示效果。

### 9.3 多语言支持
如果未来需要，可以扩展为 `featured_slogan_en`、`featured_slogan_zh` 等字段。

## 十、注意事项

### 10.1 向后兼容
- 新字段为可选（NULL），不影响现有数据
- 如果字段为空，前端应优雅降级（不显示或显示默认内容）

### 10.2 性能
- slogan 和 subtitle 为短文本，对性能影响很小
- 图片 overlay 使用 CSS 实现，性能良好

### 10.3 可访问性
- overlay 文字需确保对比度，符合 WCAG 标准
- 使用语义化 HTML 标签
- 确保屏幕阅读器可以正确读取内容

### 10.4 响应式设计
- 在不同屏幕尺寸下，overlay 文字大小和位置需适配
- 移动端可能需要调整显示方式（不在图片上叠加，改为在下方显示）

## 十一、示例数据

### 示例 1：Robotics Courses
- **display_name**: "Robotics Courses"
- **featured_slogan**: "Ignite Your Future with Robotics"
- **featured_subtitle**: "Learn, Build, Compete"
- **description**: "Comprehensive robotics courses for all skill levels..."

### 示例 2：Summer Camps
- **display_name**: "Summer Camps"
- **featured_slogan**: "Adventure Awaits This Summer"
- **featured_subtitle**: "Fun, Learning, and Friends"
- **description**: "Join us for exciting summer camp experiences..."

### 示例 3：Workshops
- **display_name**: "Workshops"
- **featured_slogan**: "Hands-On Learning Experience"
- **featured_subtitle**: "Create, Innovate, Excel"
- **description**: "Interactive workshops to enhance your skills..."
