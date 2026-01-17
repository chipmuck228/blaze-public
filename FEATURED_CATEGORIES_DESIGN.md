# Featured Categories 功能设计方案

## 一、概述

本方案实现 Featured Categories 功能，允许管理员配置特定的课程类别在主页 HeroCards 组件中显示，并支持为每个 featured category 配置招贴画和 Explore 按钮。

## 二、数据库设计

### 2.1 表结构修改

需要在 `course_categories` 表中添加以下字段：

```sql
ALTER TABLE course_categories 
ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS poster_url TEXT,
ADD COLUMN IF NOT EXISTS featured_display_order INTEGER DEFAULT 0;
```

### 2.2 字段说明

| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `featured` | BOOLEAN | FALSE | 是否在 HeroCards 组件中显示 |
| `poster_url` | TEXT | NULL | 招贴画 URL（存储在 Vercel Blob 或 Supabase Storage） |
| `featured_display_order` | INTEGER | 0 | 在 HeroCards 中的显示顺序，数字越小越靠前 |

### 2.3 字段用途区分

- **`is_active`**: 
  - 控制是否在 portal 上显示
  - 控制是否可以用来 assign programs
  - 必须为 `true` 才能设置 `featured = true`

- **`featured`**: 
  - 控制是否在 HeroCards 组件中显示
  - 只有 `is_active = true` 的 category 才能设置为 `featured = true`

### 2.4 数据验证规则

1. 如果 `featured = true`，则必须 `is_active = true`
2. 如果 `featured = true`，建议提供 `poster_url`（非强制）
3. `featured_display_order` 用于排序，数字越小越靠前

## 三、Admin 管理界面设计

### 3.1 修改位置

**文件**: `src/app/admin/categories/page.tsx`

### 3.2 需要添加的功能

#### 3.2.1 编辑表单字段

在现有的编辑对话框中添加以下字段：

1. **Featured Toggle** (Checkbox)
   - 标签: "Featured in Hero Section"
   - 字段: `featured`
   - 验证: 如果勾选，必须确保 `is_active` 也为 true

2. **Poster URL** (File Upload + URL Input)
   - 标签: "Poster Image"
   - 字段: `poster_url`
   - 支持两种方式：
     - 文件上传（上传到 Vercel Blob 或 Supabase Storage）
     - 直接输入 URL
   - 图片预览功能

3. **Featured Display Order** (Number Input)
   - 标签: "Display Order"
   - 字段: `featured_display_order`
   - 类型: 整数
   - 默认值: 0
   - 提示: 数字越小越靠前

#### 3.2.2 列表显示增强

在 categories 表格中添加以下列：

1. **Featured Status Column**
   - 显示 featured 状态（Badge 或 Icon）
   - 如果 `featured = true`，显示 "Featured" badge
   - 如果 `featured = false`，显示空或 "-"

2. **Poster Preview Column** (可选)
   - 如果 `poster_url` 存在，显示缩略图
   - 点击可查看大图

### 3.3 UI 组件结构

```
Categories Management Page
├── Search & Filter
├── Categories Table
│   ├── Name
│   ├── Display Name
│   ├── Active Status (is_active)
│   ├── Featured Status (featured) ← 新增
│   ├── Poster Preview ← 新增（可选）
│   └── Actions
└── Edit/Create Dialog
    ├── Basic Info
    │   ├── Name
    │   ├── Display Name
    │   └── Description
    ├── Status Settings
    │   ├── Active Toggle (is_active)
    │   └── Featured Toggle (featured) ← 新增
    ├── Hero Section Settings ← 新增
    │   ├── Poster Upload/URL (poster_url) ← 新增
    │   └── Display Order (featured_display_order) ← 新增
    └── Display Order (display_order)
```

### 3.4 表单验证逻辑

```typescript
// 伪代码
const validateForm = (formData) => {
  // 如果 featured = true，必须 is_active = true
  if (formData.featured && !formData.is_active) {
    return {
      error: "Category must be active to be featured"
    }
  }
  
  // 如果 featured = true，建议提供 poster_url（警告，非错误）
  if (formData.featured && !formData.poster_url) {
    // 显示警告提示，但不阻止提交
    showWarning("Recommended: Add a poster image for better display")
  }
  
  return { valid: true }
}
```

## 四、API 设计

### 4.1 新增 API 端点

#### 4.1.1 获取 Featured Categories（公开 API）

**文件**: `src/app/api/public/featured-categories/route.ts`

**端点**: `GET /api/public/featured-categories`

**功能**: 获取所有 featured categories（无需认证）

**请求**: 无参数

**响应**:
```typescript
{
  categories: [
    {
      id: string,
      name: string,
      display_name: string,
      description: string | null,
      poster_url: string | null,
      featured_display_order: number,
      // ... 其他字段（可选）
    }
  ]
}
```

**查询条件**:
- `is_active = true`（必须在 portal 上显示）
- `featured = true`（必须标记为 featured）
- 按 `featured_display_order ASC` 排序
- 如果 `featured_display_order` 相同，按 `display_order ASC` 排序

**实现示例**:
```typescript
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('course_categories')
      .select('id, name, display_name, description, poster_url, featured_display_order')
      .eq('is_active', true)
      .eq('featured', true)
      .order('featured_display_order', { ascending: true })
      .order('display_order', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch featured categories: ${error.message}`)
    }

    return NextResponse.json({ categories: data || [] }, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching featured categories:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch featured categories" },
      { status: 500 }
    )
  }
}
```

### 4.2 修改现有 API

#### 4.2.1 Admin Categories API

**文件**: `src/app/api/admin/categories/route.ts`

**修改内容**:
- `POST` 方法：支持接收 `featured`, `poster_url`, `featured_display_order` 字段
- 验证逻辑：如果 `featured = true`，确保 `is_active = true`

**文件**: `src/app/api/admin/categories/[id]/route.ts`

**修改内容**:
- `PUT` 方法：支持更新 `featured`, `poster_url`, `featured_display_order` 字段
- 验证逻辑：如果 `featured = true`，确保 `is_active = true`

**验证逻辑示例**:
```typescript
// 在 POST/PUT 处理中
if (body.featured && !body.is_active) {
  return NextResponse.json(
    { error: "Category must be active to be featured" },
    { status: 400 }
  )
}
```

## 五、HeroCards 组件重构

### 5.1 组件结构

**文件**: `src/components/HeroCards.tsx`

**新的组件结构**:

```
HeroCards Component
├── State Management
│   ├── featuredCategories (state)
│   ├── isLoading (state)
│   └── error (state)
├── Data Fetching (useEffect)
│   └── GET /api/public/featured-categories
├── Conditional Rendering
│   ├── Loading State
│   ├── Error State
│   ├── Empty State (no featured categories)
│   └── Content State
└── Layout Rendering
    ├── Mobile Layout (flex-col)
    │   └── Featured Category Cards (垂直堆叠)
    ├── Desktop Portrait Layout (flex-col)
    │   └── Featured Category Cards (垂直堆叠)
    └── Desktop Landscape Layout (grid-cols-2)
        └── Featured Category Cards (照片墙布局)
```

### 5.2 Featured Category Card 设计

#### 5.2.1 卡片结构（根据屏幕尺寸变化）

**大屏幕版本（>= 768px）**:
```
┌─────────────────────────────┐
│   [Poster Image]            │  ← 招贴画（顶部，16:9 或 4:3）
│   (使用 Next.js Image)      │
│   (高度: 200-300px)         │
│                             │
│   [Category Name]           │  ← display_name（标题）
│   (font-bold, text-xl)      │
│                             │
│   [Description]             │  ← description（可选，简化版）
│   (text-muted, text-sm)     │
│                             │
│   [Explore Button]          │  ← 链接到 /programs?category={id}
│   (primary button)          │
└─────────────────────────────┘
```

**小屏幕版本 (< 768px)**:
```
┌─────────────────────────────┐
│   [Category Icon]           │  ← 使用 category icon 替代招贴画
│   (圆形图标，带渐变背景)     │
│   (或隐藏招贴画)            │
│                             │
│   [Category Name]           │  ← display_name（标题）
│   (font-bold, text-lg)      │
│                             │
│   [Description]             │  ← description（可选，简化版）
│   (text-muted, text-sm)     │
│   (可能截断或隐藏)          │
│                             │
│   [Explore Button]          │  ← 链接到 /programs?category={id}
│   (primary button, full)    │
└─────────────────────────────┘
```

### 5.3 响应式布局详细设计

#### 5.3.1 超小屏幕布局 (< 640px - 手机竖屏)

**布局策略**:
- 使用 `flex-col` 垂直堆叠
- 每个 card 占满宽度 (`w-full`)
- **招贴画处理**: 隐藏招贴画，使用 category icon 替代
- 卡片间距: `gap-4`（较小间距）
- 内边距: `px-4`

**Card 设计**:
- 无招贴画，顶部显示圆形图标（带渐变背景）
- 图标尺寸: `w-16 h-16` 或 `w-20 h-20`
- 标题字体: `text-lg`（较小）
- 描述: 显示但可能截断（最多 2-3 行）
- 按钮: 全宽按钮

**性能优化**:
- 不加载招贴画图片，节省带宽和加载时间
- 使用轻量级图标替代

#### 5.3.2 小屏幕布局 (640px - 768px - 手机横屏/小平板)

**布局策略**:
- 使用 `flex-col` 垂直堆叠
- 每个 card 占满宽度 (`w-full`)
- **招贴画处理**: 可选显示缩略图或隐藏
- 卡片间距: `gap-5`
- 内边距: `px-4` 或 `px-6`

**Card 设计**:
- **选项 A**: 显示缩略图招贴画（高度: 150-180px）
- **选项 B**: 隐藏招贴画，使用图标（推荐，保证性能）
- 标题字体: `text-xl`
- 描述: 完整显示或最多 3-4 行
- 按钮: 全宽或自适应宽度

#### 5.3.3 中等屏幕布局 (768px - 1024px - 平板)

**布局策略**:
- 使用 `flex-col` 垂直堆叠
- 每个 card 占满宽度 (`w-full`)
- **招贴画处理**: 显示招贴画（中等尺寸）
- 卡片间距: `gap-6`
- 内边距: `px-6` 或 `px-8`
- 最大宽度: `max-w-[600px]` 或 `max-w-[700px]`

**Card 设计**:
- 显示招贴画（高度: 200-250px）
- 标题字体: `text-xl` 或 `text-2xl`
- 描述: 完整显示
- 按钮: 自适应宽度

#### 5.3.4 桌面竖屏布局 (>= 1024px, portrait)

**布局策略**:
- 使用 `flex-col` 垂直堆叠
- 每个 card 占满宽度 (`w-full`)
- **招贴画处理**: 显示完整招贴画
- 卡片间距: `gap-6` 或 `gap-8`
- 最大宽度: `max-w-[700px]` 或 `max-w-[800px]`

**Card 设计**:
- 显示完整招贴画（高度: 250-300px）
- 标题字体: `text-2xl`
- 描述: 完整显示
- 按钮: 自适应宽度

#### 5.3.5 桌面横屏布局 (>= 1024px, landscape)

**布局策略**:
- 使用 `grid grid-cols-2` 2列网格布局
- **招贴画处理**: 显示完整招贴画
- 卡片间距: `gap-4` 或 `gap-6`
- 最大宽度: `max-w-[700px]` 或 `max-w-[900px]`
- 根据 `featured_display_order` 排列

**Card 设计**:
- 显示完整招贴画（高度: 200-250px，适应网格）
- 标题字体: `text-xl` 或 `text-2xl`
- 描述: 完整显示或截断（最多 4-5 行）
- 按钮: 全宽按钮

**特殊处理**:
- 如果只有 1 个 featured category，可以居中显示或占满一行
- 如果只有 2 个，正常显示 2 列
- 如果 3 个或更多，按顺序排列，最后一行的单个卡片可以居中

### 5.3.6 响应式断点总结

| 屏幕尺寸 | 断点 | 布局 | 招贴画策略 | 卡片间距 | 备注 |
|---------|------|------|-----------|---------|------|
| 超小屏 | < 640px | flex-col | 隐藏，使用图标 | gap-4 | 手机竖屏 |
| 小屏 | 640px - 768px | flex-col | 可选缩略图或隐藏 | gap-5 | 手机横屏/小平板 |
| 中屏 | 768px - 1024px | flex-col | 显示中等尺寸 | gap-6 | 平板 |
| 桌面竖屏 | >= 1024px, portrait | flex-col | 显示完整 | gap-6-8 | 大屏竖屏 |
| 桌面横屏 | >= 1024px, landscape | grid-cols-2 | 显示完整 | gap-4-6 | 大屏横屏 |

### 5.3.7 招贴画显示策略实现

**使用 Tailwind CSS 响应式类**:

```tsx
{/* 招贴画 - 只在中等及以上屏幕显示 */}
{poster_url && (
  <div className="hidden sm:block">
    <Image
      src={poster_url}
      alt={display_name}
      width={800}
      height={450}
      className="w-full h-48 sm:h-56 md:h-64 lg:h-72 object-cover rounded-t-lg"
      priority={index < 2} // 前两个优先加载
    />
  </div>
)}

{/* 图标 - 小屏幕显示 */}
<div className="sm:hidden flex justify-center mb-4">
  <div className="w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg"
       style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }}>
    {categoryIcon}
  </div>
</div>
```

**或者使用条件渲染**:

```tsx
{/* 根据屏幕尺寸条件渲染 */}
{poster_url ? (
  <div className="hidden sm:block">
    {/* 招贴画 */}
  </div>
) : (
  <div className="flex justify-center mb-4">
    {/* 图标 */}
  </div>
)}
```

### 5.4 交互设计

#### 5.4.1 Explore 按钮
- **链接目标**: `/programs?category={category_id}` 或 `/programs#category-{category_id}`
- **样式**: Primary button，使用 category 的主题色
- **图标**: ArrowRight icon
- **文字**: "Explore" 或 "Explore {display_name}"
- **响应式**: 
  - 小屏幕: 全宽按钮 (`w-full`)
  - 大屏幕: 自适应宽度或固定宽度

#### 5.4.2 Hover 效果
- **桌面端**:
  - 卡片阴影增强: `hover:shadow-xl`
  - 轻微缩放: `hover:scale-105`
  - 过渡动画: `transition-all duration-300`
- **移动端**:
  - 无缩放效果（避免误触）
  - 保持阴影效果
  - 按钮点击反馈: `active:scale-95`

#### 5.4.3 图片处理优化

**图片加载策略**:
- 使用 Next.js `Image` 组件优化加载
- **优先级加载**: 前 2 个 featured categories 的图片使用 `priority={true}`
- **懒加载**: 其他图片使用默认懒加载
- **响应式尺寸**: 根据屏幕尺寸加载不同大小的图片

**图片尺寸建议**:
- **原始尺寸**: 16:9 或 4:3 比例
- **最小宽度**: 800px（用于大屏幕）
- **中等宽度**: 600px（用于平板）
- **小宽度**: 400px（用于小屏幕，如果显示）

**占位符策略**:
- 如果 `poster_url` 为空:
  - **小屏幕**: 显示 category icon（圆形，带渐变背景）
  - **大屏幕**: 显示默认占位图或 category icon
- 如果图片加载失败:
  - 显示 category icon 作为 fallback
  - 显示友好的错误提示（可选）

**图片优化配置**:
```tsx
<Image
  src={poster_url}
  alt={display_name}
  width={800}
  height={450}
  className="w-full h-48 sm:h-56 md:h-64 lg:h-72 object-cover rounded-t-lg"
  sizes="(max-width: 640px) 0px, (max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
  priority={index < 2}
  placeholder="blur"
  blurDataURL="/placeholder-category.jpg" // 可选
  onError={(e) => {
    // 处理图片加载错误
    e.currentTarget.style.display = 'none'
  }}
/>
```

### 5.5 用户体验优化

#### 5.5.1 加载状态优化

**Skeleton Loader**:
- 在数据加载时显示 skeleton cards
- 匹配实际 card 的布局和尺寸
- 使用 shimmer 动画效果

**渐进式加载**:
- 优先显示文本内容
- 图片延迟加载或使用占位符
- 避免布局偏移（CLS - Cumulative Layout Shift）

#### 5.5.2 性能优化

**图片优化**:
- 使用 WebP 格式（如果支持）
- 根据设备像素比加载适当尺寸
- 使用 `sizes` 属性优化响应式图片

**代码分割**:
- HeroCards 组件可以考虑使用动态导入
- 图片懒加载（非首屏）

**缓存策略**:
- API 响应缓存（ISR 或 SWR）
- 图片 CDN 缓存

#### 5.5.3 可访问性

**ARIA 标签**:
- 为每个 card 添加适当的 ARIA 标签
- 图片添加有意义的 alt 文本
- 按钮添加 aria-label

**键盘导航**:
- 确保所有交互元素可以通过键盘访问
- Tab 顺序合理

**屏幕阅读器支持**:
- 语义化 HTML 结构
- 适当的标题层级

#### 5.5.4 触摸优化（移动端）

**触摸目标大小**:
- 按钮最小尺寸: 44x44px
- 卡片点击区域足够大

**触摸反馈**:
- 按钮点击时有视觉反馈
- 避免 hover 效果在移动端触发

**滚动优化**:
- 平滑滚动
- 避免滚动冲突

### 5.5 空状态处理

如果没有 featured categories：
- **选项 1**: 隐藏 HeroCards 组件
- **选项 2**: 显示默认的静态内容（保持现有设计）
- **选项 3**: 显示提示信息 "Coming soon"

建议使用选项 2，保持向后兼容。

## 六、数据流设计

### 6.1 Admin 配置流程

```
Admin User
  ↓
Categories Management Page
  ↓
Edit Category Dialog
  ↓
设置字段:
  - is_active = true (必须)
  - featured = true
  - poster_url = [上传图片或输入URL]
  - featured_display_order = [数字]
  ↓
Save
  ↓
API: PUT /api/admin/categories/[id]
  ↓
验证: featured=true 时 is_active 必须为 true
  ↓
Database: Update course_categories
  ↓
Success
```

### 6.2 前端显示流程

```
Home Page
  ↓
HeroCards Component Mount
  ↓
useEffect: Fetch featured categories
  ↓
API: GET /api/public/featured-categories
  ↓
Filter & Sort:
  - is_active = true
  - featured = true
  - Sort by featured_display_order ASC
  ↓
Render Cards
  ↓
Display:
  - poster_url (Image)
  - display_name (Title)
  - description (Optional)
  - Explore Button (Link to /programs?category={id})
```

## 七、文件修改清单

### 7.1 数据库迁移

**新增文件**: `migrate-add-featured-categories.sql`

```sql
-- 添加 featured categories 相关字段
ALTER TABLE course_categories 
ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS poster_url TEXT,
ADD COLUMN IF NOT EXISTS featured_display_order INTEGER DEFAULT 0;

-- 添加索引优化查询
CREATE INDEX IF NOT EXISTS idx_categories_featured 
ON course_categories(featured, is_active, featured_display_order) 
WHERE featured = TRUE AND is_active = TRUE;

-- 添加注释
COMMENT ON COLUMN course_categories.featured IS 'Whether this category is featured in the hero section';
COMMENT ON COLUMN course_categories.poster_url IS 'Poster image URL for featured display';
COMMENT ON COLUMN course_categories.featured_display_order IS 'Display order in hero section (lower number = higher priority)';
```

### 7.2 API 文件

#### 新增文件
- `src/app/api/public/featured-categories/route.ts`

#### 修改文件
- `src/app/api/admin/categories/route.ts`
  - 在 `POST` 方法中添加 `featured`, `poster_url`, `featured_display_order` 字段支持
  - 添加验证逻辑

- `src/app/api/admin/categories/[id]/route.ts`
  - 在 `PUT` 方法中添加 `featured`, `poster_url`, `featured_display_order` 字段支持
  - 添加验证逻辑

### 7.3 组件文件

#### 修改文件
- `src/components/HeroCards.tsx`
  - 重构为从 API 获取数据
  - 实现响应式布局
  - 添加 Featured Category Cards
  - 添加 Explore 按钮

- `src/app/admin/categories/page.tsx`
  - 添加 `featured` 字段到表单
  - 添加 `poster_url` 上传/输入功能
  - 添加 `featured_display_order` 输入
  - 在表格中显示 featured 状态
  - 添加表单验证逻辑

### 7.4 类型定义

#### 修改文件
- `src/lib/db.ts`
  - 更新 `CourseCategory` 接口，添加 `featured`, `poster_url`, `featured_display_order` 字段

**类型定义示例**:
```typescript
export interface CourseCategory {
  id: string
  name: string
  display_name: string
  description?: string | null
  display_order: number
  is_active: boolean
  featured: boolean  // 新增
  poster_url?: string | null  // 新增
  featured_display_order: number  // 新增
  created_at: string
  updated_at: string
}
```

## 八、实现优先级

### Phase 1: 数据库和基础 API（优先级：高）

1. ✅ 创建数据库迁移脚本
2. ✅ 更新 `CourseCategory` 类型定义
3. ✅ 创建 `GET /api/public/featured-categories` API
4. ✅ 更新 Admin API 支持 featured 字段

**预计时间**: 2-3 小时

### Phase 2: Admin 管理界面（优先级：高）

1. ✅ 在 categories 管理页面添加 featured 相关字段
2. ✅ 添加 poster_url 上传功能（或 URL 输入）
3. ✅ 添加 featured_display_order 输入
4. ✅ 在表格中显示 featured 状态
5. ✅ 添加表单验证逻辑

**预计时间**: 3-4 小时

### Phase 3: HeroCards 组件重构（优先级：高）

1. ✅ 重构 HeroCards 组件，从 API 获取数据
2. ✅ 实现响应式布局（移动端、桌面竖屏、桌面横屏）
3. ✅ 添加 Featured Category Cards 渲染
4. ✅ 添加 Explore 按钮和链接
5. ✅ 处理空状态和错误状态

**预计时间**: 4-5 小时

### Phase 4: 测试和优化（优先级：中）

1. ✅ 测试各种屏幕尺寸下的显示
2. ✅ 测试图片上传和显示
3. ✅ 优化图片加载性能
4. ✅ 添加错误处理和加载状态
5. ✅ 测试表单验证逻辑

**预计时间**: 2-3 小时

**总预计时间**: 11-15 小时

## 九、注意事项

### 9.1 数据验证

1. **必须验证**: 如果 `featured = true`，则必须 `is_active = true`
   - 在 API 层面验证
   - 在 Admin 表单层面验证
   - 在数据库层面可以考虑添加 CHECK 约束

2. **建议验证**: 如果 `featured = true`，建议提供 `poster_url`
   - 在 Admin 表单层面显示警告（非错误）
   - 如果 `poster_url` 为空，使用默认占位图

### 9.2 图片存储

1. **存储方案**:
   - 优先使用 Vercel Blob Storage
   - 备选：Supabase Storage
   - 支持直接输入外部 URL

2. **图片要求**:
   - 建议尺寸：16:9 或 4:3 比例
   - 最小宽度：800px（用于大屏幕）
   - 文件格式：JPG, PNG, WebP
   - 文件大小：建议 < 500KB（优化加载速度）

3. **图片优化**:
   - 使用 Next.js `Image` 组件
   - 启用图片优化和懒加载
   - 提供占位符和错误处理
   - **响应式图片**: 根据屏幕尺寸加载不同大小的图片
   - **优先级加载**: 前 2 个 featured categories 的图片优先加载
   - **小屏幕优化**: 小屏幕不加载招贴画，使用轻量级图标替代

4. **图片显示策略**:
   - **< 640px**: 不显示招贴画，使用 category icon
   - **640px - 768px**: 可选显示缩略图或隐藏（推荐隐藏）
   - **>= 768px**: 显示完整招贴画，根据屏幕尺寸调整高度

### 9.3 向后兼容

1. **如果没有 featured categories**:
   - 显示默认的静态内容（保持现有设计）
   - 或隐藏 HeroCards 组件
   - 建议使用前者，保持页面完整性

2. **现有 HeroCards 内容**:
   - 可以保留作为 fallback
   - 或者完全替换为 featured categories

### 9.4 性能优化

1. **API 缓存**:
   - 考虑使用 Next.js ISR（Incremental Static Regeneration）
   - 缓存时间：5-10 分钟

2. **图片优化（关键）**:
   - **小屏幕策略**: 不加载招贴画，节省带宽和加载时间
     - 移动端用户通常使用流量，节省数据使用
     - 减少页面加载时间，提升用户体验
     - 使用轻量级图标替代（< 1KB）
   - **大屏幕策略**: 使用 Next.js Image 组件优化
     - 启用图片 CDN
     - 使用 WebP 格式
     - 根据设备像素比加载适当尺寸
     - 使用 `sizes` 属性优化响应式图片
   - **优先级加载**: 只对前 2 个 featured categories 使用 `priority={true}`
   - **懒加载**: 其他图片使用默认懒加载

3. **数据获取**:
   - 使用 React Query 或 SWR 进行数据缓存
   - 减少不必要的 API 调用

4. **代码分割**:
   - HeroCards 组件可以考虑使用动态导入
   - 图片懒加载（非首屏）

5. **渲染优化**:
   - 使用条件渲染避免不必要的 DOM 元素
   - 小屏幕不渲染招贴画元素，减少 DOM 节点
   - 使用 CSS 媒体查询控制显示/隐藏，而非 JavaScript

6. **性能指标目标**:
   - **小屏幕**: 
     - 首屏加载时间 < 1.5s
     - 总页面大小 < 100KB（不含图片）
   - **大屏幕**:
     - 首屏加载时间 < 2.5s
     - 图片加载时间 < 1s（使用 CDN）

### 9.5 用户体验

1. **加载状态**:
   - 显示 skeleton loader
   - 避免页面闪烁

2. **错误处理**:
   - 优雅处理 API 错误
   - 显示友好的错误信息

3. **空状态**:
   - 提供有意义的空状态提示
   - 引导用户到其他内容

## 十、测试清单

### 10.1 功能测试

- [ ] Admin 可以设置 category 为 featured
- [ ] Admin 可以上传/设置 poster_url
- [ ] Admin 可以设置 featured_display_order
- [ ] 验证：featured=true 时，is_active 必须为 true
- [ ] HeroCards 组件正确显示 featured categories
- [ ] Explore 按钮正确链接到 programs 页面
- [ ] 响应式布局在不同屏幕尺寸下正常显示

### 10.2 UI/UX 测试

#### 10.2.1 响应式布局测试

**超小屏幕 (< 640px)**:
- [ ] 布局为垂直堆叠
- [ ] 招贴画隐藏，显示图标替代
- [ ] 图标显示正常（圆形，带渐变背景）
- [ ] 标题和描述文字大小合适
- [ ] 按钮全宽显示
- [ ] 卡片间距合适（gap-4）

**小屏幕 (640px - 768px)**:
- [ ] 布局为垂直堆叠
- [ ] 招贴画隐藏或显示缩略图（根据策略）
- [ ] 如果显示招贴画，尺寸合适（150-180px 高度）
- [ ] 标题和描述文字大小合适
- [ ] 按钮显示正常
- [ ] 卡片间距合适（gap-5）

**中等屏幕 (768px - 1024px)**:
- [ ] 布局为垂直堆叠
- [ ] 招贴画显示正常（200-250px 高度）
- [ ] 图片加载和显示正常
- [ ] 标题和描述完整显示
- [ ] 按钮显示正常
- [ ] 卡片间距合适（gap-6）

**桌面竖屏 (>= 1024px, portrait)**:
- [ ] 布局为垂直堆叠
- [ ] 招贴画显示完整（250-300px 高度）
- [ ] 图片质量清晰
- [ ] 标题和描述完整显示
- [ ] 按钮显示正常
- [ ] 卡片间距合适（gap-6-8）

**桌面横屏 (>= 1024px, landscape)**:
- [ ] 布局为 2 列网格
- [ ] 招贴画显示完整（200-250px 高度）
- [ ] 图片质量清晰
- [ ] 标题和描述显示正常（可能截断）
- [ ] 按钮全宽显示
- [ ] 卡片间距合适（gap-4-6）
- [ ] 如果只有 1 个 category，居中或占满一行
- [ ] 如果只有 2 个 category，正常显示 2 列
- [ ] 如果 3 个或更多，排列正常

#### 10.2.2 图片显示测试

- [ ] 小屏幕时招贴画正确隐藏
- [ ] 小屏幕时图标正确显示
- [ ] 中等及以上屏幕时招贴画正确显示
- [ ] 图片加载优先级正确（前 2 个优先）
- [ ] 图片懒加载正常工作
- [ ] 图片尺寸响应式调整正常
- [ ] 图片加载失败时显示 fallback（图标）
- [ ] 图片 alt 文本正确
- [ ] 图片占位符显示正常（如果有）

#### 10.2.3 交互测试

- [ ] Hover 效果在桌面端正常（阴影、缩放）
- [ ] Hover 效果在移动端不触发（避免误触）
- [ ] 按钮点击反馈正常
- [ ] Explore 按钮链接正确
- [ ] 按钮在移动端有足够的触摸目标（44x44px）
- [ ] 卡片点击区域合理

#### 10.2.4 加载和错误状态测试

- [ ] 加载状态显示正常（skeleton loader）
- [ ] 加载状态布局匹配实际内容
- [ ] 错误状态处理正常
- [ ] 空状态显示正常（无 featured categories）
- [ ] 图片加载错误时显示 fallback

### 10.3 性能测试

- [ ] API 响应时间 < 500ms
- [ ] 图片加载优化正常
- [ ] 页面渲染性能良好
- [ ] 没有内存泄漏

### 10.4 边界情况测试

- [ ] 没有 featured categories 时的处理
- [ ] poster_url 为空时的处理（小屏幕显示图标，大屏幕显示占位图）
- [ ] poster_url 无效时的处理（显示 fallback）
- [ ] 多个 featured categories 的排序
- [ ] featured_display_order 相同时的排序
- [ ] 只有 1 个 featured category 时的布局（横屏时居中或占满一行）
- [ ] 只有 2 个 featured category 时的布局（横屏时正常 2 列）
- [ ] 3 个或更多 featured categories 时的布局（横屏时正常排列）
- [ ] 超长 category name 的显示（截断或换行）
- [ ] 超长 description 的显示（截断或隐藏）
- [ ] 不同屏幕尺寸下的文字截断处理

## 十一、后续优化建议

### 11.1 功能增强

1. **多语言支持**: 如果未来需要多语言，考虑为 poster_url 和 description 添加多语言字段

2. **A/B 测试**: 可以考虑为不同的 featured categories 设置不同的展示样式

3. **分析统计**: 添加点击统计，了解哪些 featured categories 更受欢迎

### 11.2 性能优化

1. **CDN 加速**: 将 poster_url 图片存储在 CDN 上

2. **预加载**: 对于首屏显示的 featured categories，可以考虑预加载图片

3. **懒加载**: 对于非首屏的 featured categories，使用懒加载

### 11.3 用户体验优化

1. **动画效果**: 添加更丰富的过渡动画

2. **交互反馈**: 增强按钮点击反馈

3. **可访问性**: 确保所有交互元素都有适当的 ARIA 标签

## 十二、总结

本方案实现了完整的 Featured Categories 功能，包括：

1. ✅ 数据库字段扩展（featured, poster_url, featured_display_order）
2. ✅ Admin 管理界面增强
3. ✅ 公开 API 端点
4. ✅ HeroCards 组件重构
5. ✅ 响应式布局支持
6. ✅ 完整的验证和错误处理

该方案保持了向后兼容性，提供了良好的用户体验，并考虑了性能优化和可扩展性。
