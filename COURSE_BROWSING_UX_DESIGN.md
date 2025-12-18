# HQ/Franchise 架构下课程浏览 UX 设计方案

## 问题分析

### 当前架构
- **HQ 首页 (`/`)**: 品牌门户 + Location 选择入口
- **Location 子站 (`/locations/{code}`)**: 特定 franchise 的本地化页面
- **课程目录 (`/course-catalog`)**: 支持 `?franchise={code}` 参数过滤

### 核心问题
**如果用户不选择 location 而直接访问 `/course-catalog`，这种体验是否好？**

**答案：不是最佳体验，但可以优化。**

---

## 用户体验问题分析

### ❌ 直接访问 `/course-catalog` 的问题

1. **信息过载**
   - 显示所有 franchises 的课程，用户可能看到不相关的课程（如 Bellevue 用户看到 Issaquah 的课程）
   - 课程实例（instances）与 location 强绑定，跨 location 浏览意义不大

2. **行动障碍**
   - 用户看到课程后想报名，但发现该课程不在自己附近的 location
   - 需要额外步骤去查找"这个课程在哪个 location 有开班"

3. **数据混乱**
   - 不同 location 可能有相同课程但不同价格、时间、容量
   - 用户难以区分哪个 instance 属于哪个 location

4. **SEO 和品牌混淆**
   - 如果所有课程混在一起，不利于 location 子站的 SEO
   - 品牌定位不清晰（是 HQ 还是特定 location？）

---

## 最佳实践方案设计

### 🎯 **推荐方案：渐进式引导 + 智能默认 + 灵活筛选**

结合 **"Progressive Disclosure"** 和 **"Smart Defaults"** 原则。

---

## 方案详细设计

### **方案 A：智能引导模式（推荐）**

#### 1. 用户首次访问 `/course-catalog`（无 franchise 参数）

**UI 设计：**
```
┌─────────────────────────────────────────┐
│  Course Catalog                          │
├─────────────────────────────────────────┤
│                                         │
│  [Location Selector Banner]              │
│  ┌───────────────────────────────────┐ │
│  │ 🎯 Find courses near you          │ │
│  │ Select your location to see       │ │
│  │ available classes and schedules   │ │
│  │                                   │ │
│  │ [Bellevue ▼] [View All Courses]   │ │
│  └───────────────────────────────────┘ │
│                                         │
│  [Course Grid - 显示所有课程，但标注 location] │
│  ┌──────┐ ┌──────┐ ┌──────┐           │
│  │Course│ │Course│ │Course│           │
│  │Bellev│ │Issaq │ │Cherry│           │
│  └──────┘ └──────┘ └──────┘           │
│                                         │
│  [Filter Bar]                           │
│  Location: [All ▼] Category: [All ▼]   │
└─────────────────────────────────────────┘
```

**行为逻辑：**
- **顶部 Banner**: 显眼的 location 选择器，引导用户选择
- **课程列表**: 显示所有课程，但每个课程卡片标注 "Available at: Bellevue, Issaquah"
- **筛选器**: 提供 Location 筛选下拉菜单（All / Bellevue / Issaquah / Cherry Crest）
- **点击课程**: 显示该课程在所有 locations 的 instances，用户可以选择特定 location 的 instance

**优点：**
- ✅ 不强制用户选择，降低进入门槛
- ✅ 提供清晰的引导，帮助用户理解需要选择 location
- ✅ 支持"浏览所有课程"的需求（如比较不同 location 的课程）
- ✅ 筛选器让用户快速聚焦到感兴趣的 location

**缺点：**
- ⚠️ 仍然可能显示不相关的课程（但可以通过筛选解决）

---

#### 2. 用户从 Location 页面进入（`?franchise=bellevue`）

**UI 设计：**
```
┌─────────────────────────────────────────┐
│  Course Catalog - Bellevue Campus      │
├─────────────────────────────────────────┤
│  [Location Badge: Bellevue] [Change]   │
│                                         │
│  [Programs grouped by Series]          │
│  ┌───────────────────────────────────┐ │
│  │ 2025 Winter Courses                │ │
│  │ ┌──────┐ ┌──────┐ ┌──────┐        │ │
│  │ │Course│ │Course│ │Course│        │ │
│  │ │[Enroll]│ │[Enroll]│ │[Enroll]│ │ │
│  │ └──────┘ └──────┘ └──────┘        │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**行为逻辑：**
- **明确显示当前 location**: 顶部显示 "Bellevue Campus" badge
- **只显示该 location 的 instances**: 过滤掉其他 location 的课程
- **直接显示可报名实例**: 每个课程卡片显示可用的 instances（日期、时间、容量）
- **快速切换**: 提供 "Change Location" 按钮，允许用户切换到其他 location

**优点：**
- ✅ 信息精准，只显示相关课程
- ✅ 用户体验流畅，减少决策负担
- ✅ 支持直接报名，无需额外筛选

---

#### 3. 用户从 HQ 首页的 "View All Programs" 进入

**UI 设计：**
```
┌─────────────────────────────────────────┐
│  All Programs                           │
├─────────────────────────────────────────┤
│  [Location Filter: All Locations ▼]     │
│                                         │
│  [Program Overview - 不显示具体 instances] │
│  ┌───────────────────────────────────┐ │
│  │ Mastery Drivetrains                │ │
│  │ Available at: Bellevue, Issaquah   │ │
│  │ [View Details] [Select Location]   │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**行为逻辑：**
- **高层次的课程概览**: 显示课程内容、描述、适合年级，但不显示具体 instances
- **标注可用 locations**: 每个课程显示 "Available at: Bellevue, Issaquah"
- **引导到 location**: 点击 "Select Location" 跳转到 location 选择或 location 页面
- **查看详情**: 点击 "View Details" 显示课程详情，但提示用户选择 location 查看具体开班信息

**优点：**
- ✅ 适合"了解课程体系"的用户
- ✅ 避免显示过多不相关的 instances
- ✅ 自然引导用户到 location 页面

---

### **方案 B：基于地理位置的智能推荐（高级）**

#### 实现方式
1. **IP 地理位置检测**（可选，需用户同意）
   - 检测用户 IP，推荐最近的 location
   - 显示 "Courses near you: Bellevue Campus"

2. **浏览器地理位置 API**（需用户授权）
   - 使用 `navigator.geolocation` 获取用户位置
   - 计算距离，推荐最近的 location

3. **用户历史记录**
   - 记住用户上次选择的 location
   - 下次访问时默认显示该 location 的课程

**优点：**
- ✅ 个性化体验，减少用户操作
- ✅ 提高转化率（用户更可能报名附近的课程）

**缺点：**
- ⚠️ 需要用户授权（地理位置）
- ⚠️ 隐私考虑
- ⚠️ 实现复杂度较高

---

### **方案 C：混合模式（平衡方案）**

#### 设计原则
1. **默认行为**: 显示所有课程，但提供 location 筛选
2. **引导行为**: 顶部 Banner 引导用户选择 location
3. **灵活切换**: 用户可以随时切换 location 或查看所有课程

#### UI 流程

**场景 1: 直接访问 `/course-catalog`**
```
┌─────────────────────────────────────────┐
│  Course Catalog                         │
├─────────────────────────────────────────┤
│  [Banner: Select your location ▼]      │
│  Currently viewing: All Locations       │
│                                         │
│  [Filter: Location ▼] [Category ▼]    │
│                                         │
│  [Course Grid with location badges]    │
│  ┌──────┐ ┌──────┐                    │
│  │Course│ │Course│                    │
│  │[Bel] │ │[Iss] │                    │
│  └──────┘ └──────┘                    │
└─────────────────────────────────────────┘
```

**场景 2: 选择 location 后**
```
┌─────────────────────────────────────────┐
│  Course Catalog - Bellevue              │
├─────────────────────────────────────────┤
│  [Location Badge: Bellevue] [Change]   │
│                                         │
│  [Filtered Course Grid - 只显示 Bellevue] │
│  ┌──────┐ ┌──────┐                    │
│  │Course│ │Course│                    │
│  │[Enroll]│ │[Enroll]│                │
│  └──────┘ └──────┘                    │
└─────────────────────────────────────────┘
```

---

## 推荐实施策略

### **Phase 1: 基础实现（立即）**

1. **Location 筛选器**
   - 在 `/course-catalog` 页面顶部添加 Location 下拉筛选器
   - 默认值：`All Locations`
   - 选项：`All Locations` / `Bellevue` / `Bel-Red` / `Issaquah` / `Cherry Crest`

2. **引导 Banner**
   - 当用户未选择 location 时，显示引导 Banner
   - 文案："Select your location to see available classes and schedules"
   - 提供快速选择按钮

3. **课程卡片标注**
   - 每个课程卡片显示可用 locations（如 "Available at: Bellevue, Issaquah"）
   - 如果选择了特定 location，只显示该 location 的 instances

4. **URL 状态管理**
   - 筛选器变化时更新 URL: `/course-catalog?franchise=bellevue`
   - 支持直接通过 URL 参数访问特定 location 的课程

---

### **Phase 2: 优化体验（短期）**

1. **用户偏好记忆**
   - 使用 `localStorage` 记住用户上次选择的 location
   - 下次访问时自动应用该 location 筛选

2. **课程详情页优化**
   - 如果用户未选择 location，课程详情页显示所有 locations 的 instances
   - 提供 "Select Location" 按钮，引导用户选择

3. **搜索优化**
   - 搜索结果标注 location
   - 支持按 location 过滤搜索结果

---

### **Phase 3: 高级功能（长期）**

1. **地理位置推荐**（需用户同意）
   - IP 地理位置检测
   - 浏览器地理位置 API
   - 推荐最近的 location

2. **多 Location 比较**
   - 允许用户选择多个 locations 进行比较
   - 显示相同课程在不同 locations 的价格、时间、容量

3. **智能推荐**
   - 基于用户浏览历史推荐 location
   - 基于课程兴趣推荐 location

---

## 技术实现要点

### 1. URL 状态管理
```typescript
// /course-catalog?franchise=bellevue
const searchParams = useSearchParams()
const franchise = searchParams.get('franchise') // 'bellevue' | null

// 筛选器变化时更新 URL
const handleLocationChange = (location: string) => {
  const params = new URLSearchParams(searchParams.toString())
  if (location === 'all') {
    params.delete('franchise')
  } else {
    params.set('franchise', location)
  }
  router.push(`/course-catalog?${params.toString()}`)
}
```

### 2. 数据获取逻辑
```typescript
// 如果 franchise 参数存在，只获取该 franchise 的课程
// 如果不存在，获取所有课程，但标注每个课程的可用 locations
const fetchCourses = async () => {
  if (franchise) {
    // 获取特定 franchise 的课程和 instances
    const res = await fetch(`/api/programs?franchise=${franchise}`)
  } else {
    // 获取所有课程，包含 location 信息
    const res = await fetch('/api/courses?include_locations=true')
  }
}
```

### 3. 用户偏好记忆
```typescript
// 保存用户选择的 location
localStorage.setItem('preferred_location', 'bellevue')

// 读取用户偏好
const preferredLocation = localStorage.getItem('preferred_location')
if (preferredLocation && !franchise) {
  router.push(`/course-catalog?franchise=${preferredLocation}`)
}
```

---

## 总结

### ✅ **最佳实践原则**

1. **渐进式引导**: 不强制用户选择，但提供清晰的引导
2. **智能默认**: 记住用户偏好，提供个性化体验
3. **灵活筛选**: 支持"查看所有"和"查看特定 location"两种模式
4. **清晰标注**: 明确显示每个课程的可用 locations
5. **流畅切换**: 用户可以轻松切换 location，无需重新加载页面

### 🎯 **推荐方案**

**采用"混合模式"（方案 C）**，结合：
- 默认显示所有课程 + Location 筛选器
- 引导 Banner 提示用户选择 location
- 课程卡片标注可用 locations
- 选择 location 后，只显示该 location 的 instances
- 支持用户偏好记忆

这样既满足了"浏览所有课程"的需求，又引导用户选择 location 获得更精准的体验。

