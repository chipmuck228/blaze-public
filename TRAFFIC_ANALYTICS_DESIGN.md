# Traffic Analytics 流量统计功能设计方案

## 一、概述

本方案实现完整的网站流量统计功能，包括访问来源、设备类型、浏览器类型、操作系统等维度的数据收集和分析。功能仅在 Admin Portal 中显示，只有管理员（admin role）可以访问。

## 二、数据库设计

### 2.1 表结构设计

#### 2.1.1 traffic_visits（访问记录表）

存储每次访问的详细信息。

```sql
CREATE TABLE traffic_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  page_path TEXT NOT NULL,
  referrer TEXT,
  referrer_domain TEXT,
  source_type TEXT NOT NULL, -- 'direct', 'google', 'bing', 'social', 'other'
  device_type TEXT NOT NULL, -- 'mobile', 'desktop', 'tablet'
  browser_name TEXT NOT NULL, -- 'Chrome', 'Mobile Safari', 'Chrome Mobile', 'Edge', 'Others'
  browser_version TEXT,
  os_name TEXT NOT NULL, -- 'iOS', 'Windows', 'macOS', 'Android', 'Other'
  os_version TEXT,
  user_agent TEXT,
  ip_address INET,
  country TEXT,
  city TEXT,
  is_bounce BOOLEAN DEFAULT FALSE,
  visit_duration INTEGER, -- 秒
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_traffic_visits_created_at ON traffic_visits(created_at);
CREATE INDEX idx_traffic_visits_session_id ON traffic_visits(session_id);
CREATE INDEX idx_traffic_visits_user_id ON traffic_visits(user_id);
CREATE INDEX idx_traffic_visits_source_type ON traffic_visits(source_type);
CREATE INDEX idx_traffic_visits_device_type ON traffic_visits(device_type);
CREATE INDEX idx_traffic_visits_browser_name ON traffic_visits(browser_name);
CREATE INDEX idx_traffic_visits_os_name ON traffic_visits(os_name);
-- 注意：不需要创建 DATE(created_at) 的索引，因为：
-- 1. DATE() 函数不是 IMMUTABLE，无法用于索引表达式
-- 2. created_at 上的索引已经足够用于日期范围查询
-- 3. 按日期分组查询时，PostgreSQL 会先使用 created_at 索引过滤，然后在内存中分组

-- 注释
COMMENT ON TABLE traffic_visits IS '网站访问记录表';
COMMENT ON COLUMN traffic_visits.session_id IS '会话ID，用于识别同一用户的多次访问';
COMMENT ON COLUMN traffic_visits.source_type IS '访问来源类型：direct(直接访问), google(Google搜索), bing(Bing搜索), social(社交媒体), other(其他)';
COMMENT ON COLUMN traffic_visits.device_type IS '设备类型：mobile(手机), desktop(桌面), tablet(平板)';
COMMENT ON COLUMN traffic_visits.is_bounce IS '是否为跳出访问（只访问一个页面就离开）';
```

#### 2.1.2 traffic_pageviews（页面浏览记录表）

记录每个页面的浏览情况。

```sql
CREATE TABLE traffic_pageviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID REFERENCES traffic_visits(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  page_path TEXT NOT NULL,
  page_title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_traffic_pageviews_visit_id ON traffic_pageviews(visit_id);
CREATE INDEX idx_traffic_pageviews_session_id ON traffic_pageviews(session_id);
CREATE INDEX idx_traffic_pageviews_created_at ON traffic_pageviews(created_at);
-- 注意：不需要创建 DATE(created_at) 的索引，原因同上

-- 注释
COMMENT ON TABLE traffic_pageviews IS '页面浏览记录表';
```

#### 2.1.3 traffic_sessions（会话表）

记录用户会话信息，用于计算 Unique Visitors。

```sql
CREATE TABLE traffic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES users(id),
  first_visit_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_visit_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  visit_count INTEGER DEFAULT 1,
  pageview_count INTEGER DEFAULT 0,
  is_bounce BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_traffic_sessions_session_id ON traffic_sessions(session_id);
CREATE INDEX idx_traffic_sessions_user_id ON traffic_sessions(user_id);
CREATE INDEX idx_traffic_sessions_first_visit_at ON traffic_sessions(first_visit_at);
CREATE INDEX idx_traffic_sessions_last_visit_at ON traffic_sessions(last_visit_at);

-- 注释
COMMENT ON TABLE traffic_sessions IS '用户会话表，用于追踪唯一访客';
```

### 2.2 数据分类规则

#### 2.2.1 访问来源分类（source_type）

- **direct**: `referrer` 为空或 `referrer_domain` 等于当前域名
- **google**: `referrer_domain` 包含 `google.com` 或 `google.`（包括 google.co.uk 等）
- **bing**: `referrer_domain` 包含 `bing.com` 或 `bing.`
- **social**: `referrer_domain` 包含以下任一：
  - `facebook.com`
  - `instagram.com`
  - `twitter.com`
  - `linkedin.com`
  - `youtube.com`
  - `xiaohongshu.com`
  - `tiktok.com`
- **other**: 其他所有来源

#### 2.2.2 设备类型分类（device_type）

基于 User-Agent 解析：
- **mobile**: 移动设备（手机）
- **desktop**: 桌面设备（PC）
- **tablet**: 平板设备

#### 2.2.3 浏览器类型分类（browser_name）

基于 User-Agent 解析：
- **Chrome**: Chrome 浏览器（桌面版）
- **Mobile Safari**: iOS Safari
- **Chrome Mobile**: Chrome 移动版
- **Edge**: Microsoft Edge
- **Others**: 其他浏览器（Firefox, Opera, Samsung Internet 等）

#### 2.2.4 操作系统分类（os_name）

基于 User-Agent 解析：
- **iOS**: Apple iOS
- **Windows**: Microsoft Windows
- **macOS**: Apple macOS
- **Android**: Google Android
- **Other**: 其他操作系统（Linux, Chrome OS 等）

## 三、数据收集机制

### 3.1 客户端追踪脚本

**实现方式：**
- 在 `src/app/layout.tsx` 中添加客户端追踪脚本
- 使用 Next.js API Route 收集数据
- 使用 Cookie 或 LocalStorage 存储 session_id

**收集的数据：**
- 页面路径（`window.location.pathname`）
- Referrer（`document.referrer`）
- User-Agent（`navigator.userAgent`）
- 屏幕尺寸（用于判断设备类型）
- 时间戳

**Session ID 生成：**
- 首次访问时生成 UUID
- 存储在 Cookie 中（有效期 30 天）
- 用于识别同一用户的多次访问

### 3.2 服务端 API

**API 端点：** `POST /api/public/traffic/track`

**功能：**
- 接收客户端发送的访问数据
- 解析 User-Agent（使用 `ua-parser-js` 库）
- 分类访问来源、设备类型、浏览器、操作系统
- 存储到数据库

**请求体：**
```json
{
  "session_id": "uuid-string",
  "page_path": "/",
  "referrer": "https://www.google.com/search?q=...",
  "user_agent": "Mozilla/5.0...",
  "screen_width": 1920,
  "screen_height": 1080
}
```

**处理逻辑：**
1. 验证请求数据
2. 解析 User-Agent
3. 判断访问来源类型
4. 判断设备类型（基于屏幕尺寸和 User-Agent）
5. 判断浏览器类型
6. 判断操作系统类型
7. 检查是否为跳出访问（如果 session 中只有一个 pageview）
8. 插入或更新数据库记录

### 3.3 页面浏览追踪

**实现方式：**
- 在页面加载时自动发送 pageview 事件
- 使用 Next.js `useEffect` Hook
- 避免重复追踪（使用防抖）

**追踪时机：**
- 页面首次加载
- 路由切换（Next.js Router 事件）

### 3.4 Visit 和 Pageview 的区别

**Visit（访问）的定义：**
- Visit 代表一个访问会话的开始
- 只在以下情况创建新的 visit：
  1. **新会话**：用户首次访问网站（新的 session_id）
  2. **会话超时**：用户超过 30 分钟未活动后重新访问
- **刷新页面不会创建新的 visit**，只会增加 pageview

**Pageview（页面浏览）的定义：**
- Pageview 代表每次页面加载/浏览
- **每次页面加载都创建新的 pageview**，包括：
  - 首次访问页面
  - 刷新页面
  - 路由切换（SPA 导航）
  - 返回页面（浏览器后退/前进）

**会话超时逻辑：**
- 如果同一 session 在最近 30 分钟内已有 visit，则：
  - 不创建新的 visit
  - 只创建新的 pageview，关联到最近的 visit
- 如果同一 session 超过 30 分钟未活动，则：
  - 创建新的 visit（视为新的访问会话）
  - 创建新的 pageview，关联到新的 visit

**实现细节：**
```typescript
// 检查该 session 在最近 30 分钟内是否有 visit
const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

const { data: recentVisit } = await supabaseAdmin
  .from('traffic_visits')
  .select('id')
  .eq('session_id', session_id)
  .gte('created_at', thirtyMinutesAgo)
  .order('created_at', { ascending: false })
  .limit(1)
  .single()

if (!recentVisit) {
  // 没有最近的 visit，创建新的 visit（会话超时）
  shouldCreateNewVisit = true
} else {
  // 使用最近的 visit（同一会话内的页面刷新）
  visitId = recentVisit.id
}
```

## 四、API 设计

### 4.1 Admin API（需要认证）

#### 4.1.1 GET /api/admin/traffic/summary

获取流量摘要数据（KPI 卡片）。

**查询参数：**
- `period`: 时间周期（'last_7_days', 'last_30_days', 'last_90_days'，可选）
- `start_date`: 开始日期（YYYY-MM-DD 格式，可选，与 `end_date` 一起使用时优先于 `period`）
- `end_date`: 结束日期（YYYY-MM-DD 格式，可选，与 `start_date` 一起使用时优先于 `period`）

**注意：** 如果同时提供了 `start_date` 和 `end_date`，将使用自定义日期范围；否则使用 `period` 参数（默认为 'last_30_days'）。

**响应：**
```json
{
  "visits": {
    "total": 2319,
    "mom_change": -9, // 百分比
    "mom_change_type": "decrease" // "increase" | "decrease"
  },
  "bounce_rate": {
    "value": 59.47, // 百分比
    "mom_change": -9,
    "mom_change_type": "decrease"
  },
  "unique_visitors": {
    "total": 2000,
    "mom_change": -11,
    "mom_change_type": "decrease"
  },
  "pageviews": {
    "total": 4400,
    "mom_change": -1,
    "mom_change_type": "decrease"
  },
  "period": {
    "start": "2025-12-18T00:00:00Z",
    "end": "2026-01-16T23:59:59Z"
  }
}
```

#### 4.1.2 GET /api/admin/traffic/visits-chart

获取访问量趋势图表数据。

**查询参数：**
- `period`: 时间周期（'last_7_days', 'last_30_days', 'last_90_days'，可选）
- `start_date`: 开始日期（YYYY-MM-DD 格式，可选，与 `end_date` 一起使用时优先于 `period`）
- `end_date`: 结束日期（YYYY-MM-DD 格式，可选，与 `start_date` 一起使用时优先于 `period`）
- `granularity`: 粒度（'day', 'week', 'month'，默认 'day'）

**注意：** 日期范围处理逻辑与 `summary` API 相同。

**响应：**
```json
{
  "data": [
    {
      "date": "2025-12-18",
      "visits": 120,
      "unique_visitors": 100,
      "pageviews": 200
    },
    // ...
  ],
  "total": {
    "visits": 2319,
    "unique_visitors": 2000,
    "pageviews": 4400,
    "mom_change": -9
  }
}
```

#### 4.1.3 GET /api/admin/traffic/sources

获取访问来源统计。

**查询参数：**
- `period`: 时间周期（'last_7_days', 'last_30_days', 'last_90_days'，可选）
- `start_date`: 开始日期（YYYY-MM-DD 格式，可选，与 `end_date` 一起使用时优先于 `period`）
- `end_date`: 结束日期（YYYY-MM-DD 格式，可选，与 `start_date` 一起使用时优先于 `period`）
- `limit`: 返回数量（默认 10）

**响应：**
```json
{
  "sources": [
    {
      "name": "Direct",
      "visits": 1258,
      "percentage": 54.2
    },
    {
      "name": "Google",
      "visits": 779,
      "percentage": 33.6
    },
    {
      "name": "Bing",
      "visits": 59,
      "percentage": 2.5
    },
    {
      "name": "Social",
      "visits": 114,
      "percentage": 4.9
    },
    {
      "name": "Other",
      "visits": 108,
      "percentage": 4.7
    }
  ],
  "total": 2319
}
```

#### 4.1.4 GET /api/admin/traffic/devices

获取设备类型统计。

**查询参数：**
- `period`: 时间周期（'last_7_days', 'last_30_days', 'last_90_days'，可选）
- `start_date`: 开始日期（YYYY-MM-DD 格式，可选，与 `end_date` 一起使用时优先于 `period`）
- `end_date`: 结束日期（YYYY-MM-DD 格式，可选，与 `start_date` 一起使用时优先于 `period`）

**响应：**
```json
{
  "devices": [
    {
      "name": "Mobile",
      "visits": 1500,
      "percentage": 64.6
    },
    {
      "name": "Desktop",
      "visits": 700,
      "percentage": 30.2
    },
    {
      "name": "Tablet",
      "visits": 119,
      "percentage": 5.1
    }
  ],
  "total": 2319
}
```

#### 4.1.5 GET /api/admin/traffic/browsers

获取浏览器类型统计。

**查询参数：**
- `period`: 时间周期（'last_7_days', 'last_30_days', 'last_90_days'，可选）
- `start_date`: 开始日期（YYYY-MM-DD 格式，可选，与 `end_date` 一起使用时优先于 `period`）
- `end_date`: 结束日期（YYYY-MM-DD 格式，可选，与 `start_date` 一起使用时优先于 `period`）
- `limit`: 返回数量（默认 10）

**响应：**
```json
{
  "browsers": [
    {
      "name": "Chrome",
      "visits": 852,
      "percentage": 36.7
    },
    {
      "name": "Mobile Safari",
      "visits": 637,
      "percentage": 27.5
    },
    {
      "name": "Chrome Mobile",
      "visits": 391,
      "percentage": 16.9
    },
    {
      "name": "Edge",
      "visits": 131,
      "percentage": 5.6
    },
    {
      "name": "Others",
      "visits": 313,
      "percentage": 13.5
    }
  ],
  "total": 2319
}
```

#### 4.1.6 GET /api/admin/traffic/operating-systems

获取操作系统统计。

**查询参数：**
- `period`: 时间周期（'last_7_days', 'last_30_days', 'last_90_days'，可选）
- `start_date`: 开始日期（YYYY-MM-DD 格式，可选，与 `end_date` 一起使用时优先于 `period`）
- `end_date`: 结束日期（YYYY-MM-DD 格式，可选，与 `start_date` 一起使用时优先于 `period`）
- `limit`: 返回数量（默认 10）

**响应：**
```json
{
  "operating_systems": [
    {
      "name": "iOS",
      "visits": 1004,
      "percentage": 43.3
    },
    {
      "name": "Windows",
      "visits": 550,
      "percentage": 23.7
    },
    {
      "name": "macOS",
      "visits": 474,
      "percentage": 20.4
    },
    {
      "name": "Android",
      "visits": 218,
      "percentage": 9.4
    },
    {
      "name": "Other",
      "visits": 78,
      "percentage": 3.4
    }
  ],
  "total": 2319
}
```

#### 4.1.7 GET /api/admin/traffic/stream

获取实时流量数据流（Server-Sent Events）。

**查询参数：**
- `period`: 时间周期（'last_7_days', 'last_30_days', 'last_90_days'，可选）
- `start_date`: 开始日期（YYYY-MM-DD 格式，可选，与 `end_date` 一起使用时优先于 `period`）
- `end_date`: 结束日期（YYYY-MM-DD 格式，可选，与 `start_date` 一起使用时优先于 `period`）

**注意：** 日期范围处理逻辑与其他 API 相同。

**响应格式：** Server-Sent Events (SSE)

**数据格式：**
```
data: {"visits": 2319, "pageviews": 4400, "unique_visitors": 2000, "bounce_rate": 59.47, "timestamp": "2026-01-16T12:00:00.000Z"}

data: {"visits": 2320, "pageviews": 4401, "unique_visitors": 2001, "bounce_rate": 59.48, "timestamp": "2026-01-16T12:00:30.000Z"}

...
```

**更新频率：** 每 30 秒推送一次数据

**错误格式：**
```
data: {"error": "Failed to fetch data"}
```

**实现细节：**
- 使用 `ReadableStream` 创建 SSE 流
- 立即发送一次初始数据
- 每 30 秒查询数据库并推送更新
- 客户端断开连接时自动清理定时器
- 支持日期范围参数，与其他 API 保持一致

### 4.2 公共 API（无需认证，用于数据收集）

#### 4.2.1 POST /api/public/traffic/track

记录访问数据（客户端调用）。

**请求体：**
```json
{
  "session_id": "uuid-string",
  "page_path": "/",
  "referrer": "https://www.google.com/search?q=...",
  "user_agent": "Mozilla/5.0...",
  "screen_width": 1920,
  "screen_height": 1080,
  "page_title": "Home Page",
  "source_type": "google",
  "device_type": "desktop",
  "browser_name": "Chrome",
  "os_name": "Windows"
}
```

**响应：**
```json
{
  "success": true,
  "session_id": "uuid-string",
  "visit_id": "uuid-string",
  "is_new_visit": true
}
```

**行为说明：**
- **新会话**：如果 `session_id` 不存在，创建新的 session、visit 和 pageview
- **会话内刷新**：如果 `session_id` 存在且在最近 30 分钟内有 visit，只创建新的 pageview，不创建新的 visit
- **会话超时**：如果 `session_id` 存在但超过 30 分钟未活动，创建新的 visit 和 pageview
- `is_new_visit`: 指示是否创建了新的 visit（true）还是只创建了 pageview（false）

**重要：刷新页面不会增加 visit，只会增加 pageview**

## 五、前端页面设计

### 5.1 Admin Traffic 页面

**路径：** `/admin/traffic`

**文件：** `src/app/admin/traffic/page.tsx`

**布局结构：**
```
┌─────────────────────────────────────────────────────────┐
│  Traffic Analytics                    [Live] [Date] [Export] [Enable/Disable Live] │
├─────────────────────────────────────────────────────────┤
│  [Traffic] [Traffic Sources] [Search Keywords] [Geography] │
├─────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ VISITS  │ │BOUNCE   │ │UNIQUE   │ │PAGEVIEWS│       │
│  │ 2.3K    │ │RATE     │ │VISITORS │ │ 4.4K    │       │
│  │ -9% mo/mo│ │59.47%   │ │ 2K      │ │ -1% mo/mo│       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
├─────────────────────────────────────────────────────────┤
│  Visits                                                  │
│  Dec 18, 2025 - Jan 16, 2026                            │
│  2,319 Total -9% mo/mo                                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │    [Line Chart - Visits/Unique Visitors/Pageviews] │   │
│  │    (不同颜色：蓝色/绿色/琥珀色)                    │   │
│  └─────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│  │Top Devices   │ │Top Browsers  │ │Top OS        │    │
│  │[Donut Chart] │ │[Bar Chart]  │ │[Bar Chart]   │    │
│  │(不同颜色)     │ │(不同颜色)    │ │(不同颜色)    │    │
│  └──────────────┘ └──────────────┘ └──────────────┘    │
└─────────────────────────────────────────────────────────┘
```

**Tab 功能：**
- **Traffic Tab**: 显示主要流量数据（Summary Cards、Visits Chart、Devices、Browsers、Operating Systems）
- **Traffic Sources Tab**: 显示流量来源分析
  - Top Traffic Sources 柱状图（每个来源使用不同颜色）
  - Source Breakdown 详细表格（包含访问量和百分比）
- **Search Keywords Tab**: 占位内容，提示需要 Google Search Console 集成
- **Geography Tab**: 占位内容，提示需要 IP 地理位置服务集成

### 5.2 组件设计

#### 5.2.1 TrafficSummaryCards（KPI 卡片）

**功能：**
- 显示 4 个关键指标：Visits, Bounce Rate, Unique Visitors, Pageviews
- 显示 MoM（Month-over-Month）变化百分比
- 使用颜色区分增减（绿色=增加，红色=减少）

**Props：**
```typescript
interface TrafficSummaryCardsProps {
  data: {
    visits: { total: number; mom_change: number }
    bounce_rate: { value: number; mom_change: number }
    unique_visitors: { total: number; mom_change: number }
    pageviews: { total: number; mom_change: number }
  }
}
```

#### 5.2.2 VisitsLineChart（访问量趋势图）

**功能：**
- 使用 Recharts `LineChart` 组件
- 显示每日访问量趋势
- X 轴：日期
- Y 轴：访问量
- 支持时间范围选择

**Props：**
```typescript
interface VisitsLineChartProps {
  data: Array<{
    date: string
    visits: number
    unique_visitors: number
    pageviews: number
  }>
  period: {
    start: string
    end: string
  }
}
```

#### 5.2.3 SourcesBarChart（访问来源柱状图）

**功能：**
- 使用 Recharts `BarChart` 组件
- 显示各来源的访问量
- 按访问量降序排列
- 显示百分比

**Props：**
```typescript
interface SourcesBarChartProps {
  data: Array<{
    name: string
    visits: number
    percentage: number
  }>
}
```

#### 5.2.4 DevicesDonutChart（设备类型饼图）

**功能：**
- 使用 Recharts `PieChart` 组件
- 显示设备类型分布
- 显示图例和百分比

**Props：**
```typescript
interface DevicesDonutChartProps {
  data: Array<{
    name: string
    visits: number
    percentage: number
  }>
}
```

#### 5.2.5 BrowsersBarChart（浏览器类型柱状图）

**功能：**
- 使用 Recharts `BarChart` 组件
- 显示各浏览器的访问量
- 按访问量降序排列

#### 5.2.6 OperatingSystemsBarChart（操作系统柱状图）

**功能：**
- 使用 Recharts `BarChart` 组件
- 显示各操作系统的访问量
- 按访问量降序排列

### 5.3 页面功能

#### 5.3.1 时间范围选择

**实现：**
- 使用 `DateRangePicker` 组件
- 支持预设周期：Last 7 Days, Last 30 Days, Last 90 Days
- 支持自定义日期范围选择
- 使用 Dialog 组件展示日期选择界面
- 自定义日期范围时，显示开始日期和结束日期输入框
- 自动验证日期范围的有效性（开始日期不能晚于结束日期）

**DateRangePicker 组件：**
- **文件：** `src/components/admin/traffic/DateRangePicker.tsx`
- **功能：**
  - 预设周期快速选择
  - 自定义日期范围选择
  - 日期范围验证
  - 友好的日期显示格式

#### 5.3.2 标签页导航

**标签页：**
- Traffic（默认）
- Traffic Sources（未来功能）
- Search Keywords（未来功能）
- Geography（未来功能）

**实现：**
- 使用 shadcn `Tabs` 组件
- 当前仅实现 "Traffic" 标签页

## 六、Admin 菜单集成

### 6.1 AdminSidebar 更新

**文件：** `src/components/admin/AdminSidebar.tsx`

**修改内容：**
- 在 `menuItems` 数组中添加 Traffic 菜单项
- 使用 `BarChart3` 或 `TrendingUp` 图标
- 路径：`/admin/traffic`

**代码位置：**
```typescript
const menuItems = [
  // ... existing items
  {
    title: "Traffic",
    href: "/admin/traffic",
    icon: BarChart3, // 或 TrendingUp
  },
]
```

### 6.2 权限控制

**实现方式：**
- AdminSidebar 中只对 admin role 显示 Traffic 菜单
- Traffic 页面使用 `AdminLayout`，自动检查 admin 权限
- API 路由检查 `session.user.role === 'admin'`

## 七、数据计算逻辑

### 7.1 Visits（访问次数）

**计算方式：**
- 统计指定时间范围内的 `traffic_visits` 记录数
- 按日期分组统计每日访问量

**MoM 对比：**
- 当前周期总访问量 vs 上一个月同期总访问量
- 计算公式：`((current - previous) / previous) * 100`

### 7.2 Bounce Rate（跳出率）

**计算方式：**
- 跳出访问数 / 总访问数 * 100
- 跳出访问：`is_bounce = true` 的记录

**MoM 对比：**
- 当前周期跳出率 vs 上一个月同期跳出率
- 显示变化百分比

### 7.3 Unique Visitors（唯一访客）

**计算方式：**
- 统计指定时间范围内的唯一 `session_id` 数量
- 或统计唯一 `user_id`（如果用户已登录）

**MoM 对比：**
- 当前周期唯一访客数 vs 上一个月同期唯一访客数

### 7.4 Pageviews（页面浏览量）

**计算方式：**
- 统计指定时间范围内的 `traffic_pageviews` 记录数
- 按日期分组统计每日页面浏览量

**MoM 对比：**
- 当前周期总页面浏览量 vs 上一个月同期总页面浏览量

### 7.5 访问来源统计

**计算方式：**
- 按 `source_type` 分组统计
- 计算每个来源的访问量和百分比

### 7.6 设备类型统计

**计算方式：**
- 按 `device_type` 分组统计
- 计算每个设备类型的访问量和百分比

### 7.7 浏览器类型统计

**计算方式：**
- 按 `browser_name` 分组统计
- 计算每个浏览器的访问量和百分比

### 7.8 操作系统统计

**计算方式：**
- 按 `os_name` 分组统计
- 计算每个操作系统的访问量和百分比

## 八、技术实现细节

### 8.1 统一的日期范围处理

**文件：** `src/lib/traffic-api-utils.ts`

**功能：** 统一处理所有 Traffic API 的日期范围计算逻辑。

**函数：** `getDateRangeFromParams(period, startDateParam, endDateParam)`

**逻辑：**
1. 如果提供了 `startDateParam` 和 `endDateParam`，使用自定义日期范围
2. 否则根据 `period` 参数计算预设周期
3. 返回包含 `start`, `end`, `startStr`, `endStr` 的对象

**优势：**
- 代码复用，避免重复逻辑
- 统一的行为和错误处理
- 易于维护和扩展

### 8.2 User-Agent 解析

**实现方式：** 使用自定义解析逻辑（`src/lib/traffic-utils.ts`）

**注意：** 当前实现使用自定义解析，不依赖外部库。如需更精确的解析，可以考虑使用 `ua-parser-js`：

**库：** `ua-parser-js`

**安装：**
```bash
npm install ua-parser-js
npm install --save-dev @types/ua-parser-js
```

**使用：**
```typescript
import UAParser from 'ua-parser-js'

const parser = new UAParser(userAgent)
const browser = parser.getBrowser()
const os = parser.getOS()
const device = parser.getDevice()
```

### 8.2 Session ID 管理

**生成方式：**
- 使用 `crypto.randomUUID()` 或 `uuid` 库
- 存储在 Cookie 中（`traffic_session_id`）
- 有效期：30 天

**客户端实现：**
```typescript
function getOrCreateSessionId(): string {
  const cookie = document.cookie
    .split('; ')
    .find(row => row.startsWith('traffic_session_id='))
  
  if (cookie) {
    return cookie.split('=')[1]
  }
  
  const sessionId = crypto.randomUUID()
  document.cookie = `traffic_session_id=${sessionId}; max-age=${30 * 24 * 60 * 60}; path=/`
  return sessionId
}
```

### 8.3 访问来源判断逻辑

**伪代码：**
```typescript
function classifySource(referrer: string, currentDomain: string): string {
  if (!referrer || referrer === '') {
    return 'direct'
  }
  
  const referrerDomain = new URL(referrer).hostname
  
  if (referrerDomain === currentDomain) {
    return 'direct'
  }
  
  if (referrerDomain.includes('google.com') || referrerDomain.includes('google.')) {
    return 'google'
  }
  
  if (referrerDomain.includes('bing.com') || referrerDomain.includes('bing.')) {
    return 'bing'
  }
  
  const socialDomains = [
    'facebook.com', 'instagram.com', 'twitter.com',
    'linkedin.com', 'youtube.com', 'xiaohongshu.com', 'tiktok.com'
  ]
  
  if (socialDomains.some(domain => referrerDomain.includes(domain))) {
    return 'social'
  }
  
  return 'other'
}
```

### 8.4 设备类型判断逻辑

**基于屏幕尺寸和 User-Agent：**
```typescript
function classifyDevice(screenWidth: number, userAgent: string): string {
  // 使用 UAParser 解析设备类型
  const parser = new UAParser(userAgent)
  const device = parser.getDevice()
  
  if (device.type === 'mobile') {
    return 'mobile'
  }
  
  if (device.type === 'tablet') {
    return 'tablet'
  }
  
  // 基于屏幕尺寸判断
  if (screenWidth < 768) {
    return 'mobile'
  } else if (screenWidth < 1024) {
    return 'tablet'
  } else {
    return 'desktop'
  }
}
```

### 8.5 跳出访问判断

**逻辑：**
- 如果 session 中只有一个 pageview，且用户离开网站，则标记为跳出
- 在用户离开页面时（`beforeunload` 事件）检查
- 如果 session 持续时间 < 30 秒且只有一个 pageview，标记为跳出

**实现：**
```typescript
// 客户端
window.addEventListener('beforeunload', () => {
  // 发送页面离开事件
  fetch('/api/public/traffic/track-exit', {
    method: 'POST',
    body: JSON.stringify({ session_id }),
    keepalive: true
  })
})

// 服务端
// 检查 session 的 pageview_count
// 如果 pageview_count === 1，标记 is_bounce = true
```

## 九、Recharts 图表配置

### 9.1 LineChart（访问量趋势图）

**配置：**
- X 轴：日期（`XAxis`）
- Y 轴：访问量（`YAxis`）
- 数据线：Visits、Unique Visitors、Pageviews（三条线）
- 网格线：`CartesianGrid`
- 工具提示：`Tooltip`
- 响应式：`ResponsiveContainer`

**颜色方案：**
- Visits: 蓝色 (#3b82f6)
- Unique Visitors: 绿色 (#10b981)
- Pageviews: 琥珀色 (#f59e0b)
- 网格线：`hsl(var(--border))`

### 9.2 BarChart（柱状图）

**配置：**
- X 轴：类别名称
- Y 轴：访问量
- 数据条：Visits
- 每个类别使用不同颜色（通过 `Cell` 组件实现）

**颜色方案（SourcesBarChart）：**
- Direct: 蓝色 (#3b82f6)
- Google: 绿色 (#10b981)
- Bing: 琥珀色 (#f59e0b)
- Social: 红色 (#ef4444)
- Other: 紫色 (#8b5cf6)

**颜色方案（BrowsersBarChart）：**
- Chrome: Google 蓝 (#4285f4)
- Edge: Microsoft 蓝 (#0078d4)
- Safari/Mobile Safari: Apple 蓝 (#007aff)
- Firefox: Firefox 橙 (#ff7139)
- 其他浏览器：使用默认颜色数组

**颜色方案（OperatingSystemsBarChart）：**
- iOS: Apple 蓝 (#007aff)
- Windows: Microsoft 蓝 (#0078d4)
- macOS: Apple 蓝 (#007aff)
- Android: Android 绿 (#3ddc84)
- Linux: Linux 黄 (#fcc624)
- Other: 紫色 (#8b5cf6)

**实现方式：**
- 使用函数 `getSourceColor()`, `getBrowserColor()`, `getOSColor()` 动态获取颜色
- 支持不区分大小写匹配
- 如果名称不完全匹配，使用默认颜色数组确保每个类别都有不同颜色

### 9.3 PieChart（饼图）

**配置：**
- 内半径：60（Donut 效果）
- 外半径：100
- 标签：显示百分比
- 图例：右侧显示
- 每个类别使用不同颜色（通过 `Cell` 组件实现）

**颜色方案（DevicesDonutChart）：**
- Mobile: 蓝色 (#3b82f6)
- Desktop: 绿色 (#10b981)
- Tablet: 琥珀色 (#f59e0b)

**实现方式：**
- 使用函数 `getDeviceColor()` 动态获取颜色
- 支持不区分大小写匹配

## 十、权限和安全

### 10.1 权限控制

**API 路由：**
- 所有 `/api/admin/traffic/*` 路由检查 `session.user.role === 'admin'`
- 返回 401 Unauthorized 如果用户不是 admin

**前端页面：**
- 使用 `AdminLayout`，自动检查权限
- 如果用户不是 admin，重定向到 `/admin` 或显示错误

### 10.2 数据隐私

**IP 地址处理：**
- 存储 IP 地址用于地理位置分析
- 不显示完整的 IP 地址给管理员
- 仅用于统计目的

**用户数据：**
- 如果用户已登录，记录 `user_id`
- 不显示个人身份信息
- 仅用于统计唯一访客

### 10.3 数据收集合规性

**Cookie 使用：**
- 仅用于存储 session_id
- 不包含个人信息
- 符合 GDPR 要求（如果需要，可以添加 Cookie 同意）

## 十一、性能优化

### 11.1 数据聚合

**策略：**
- 使用数据库视图或物化视图预聚合数据
- 定期计算每日统计数据
- 减少实时查询的计算量

### 11.2 缓存策略

**实现：**
- API 响应缓存（5-15 分钟）
- 使用 Next.js `revalidate` 或 Redis
- 减少数据库查询压力

### 11.3 数据清理

**策略：**
- 保留最近 90 天的详细数据
- 90 天前的数据仅保留聚合统计
- 定期清理旧数据（Cron Job）

## 十二、实施优先级

### 高优先级（MVP）
1. ✅ 数据库表结构创建
2. ✅ 数据收集 API（`POST /api/public/traffic/track`）
3. ✅ 客户端追踪脚本
4. ✅ Admin Traffic 页面基础结构
5. ✅ KPI 卡片组件
6. ✅ 访问量趋势图（LineChart）
7. ✅ AdminSidebar 菜单集成
8. ✅ 权限控制

### 中优先级
1. ✅ 访问来源统计（BarChart）
2. ✅ 设备类型统计（DonutChart）
3. ✅ 浏览器类型统计（BarChart）
4. ✅ 操作系统统计（BarChart）
5. ✅ 时间范围选择器（预设周期）
6. ✅ MoM 对比计算
7. ✅ 自定义日期范围选择
8. ✅ 统一的日期范围处理工具函数

### 低优先级
1. ✅ 数据导出功能（CSV）
2. ✅ 实时数据更新（Server-Sent Events）
3. 更多图表类型（热力图等）
4. 数据清理自动化
5. ✅ 图表样式和交互体验优化
6. ✅ 空状态和错误处理改进
7. ✅ 数据加载性能优化

## 十三、未来扩展

### 13.1 高级功能
- **Search Keywords**: 从 Google Search Console API 获取搜索关键词数据
- **Geography**: 基于 IP 地址的地理位置分析
- **Page Performance**: 页面加载时间统计
- **Conversion Tracking**: 转化率追踪（注册、报名等）

### 13.2 集成功能
- **Google Analytics 集成**: 同步 Google Analytics 数据
- **Search Console 集成**: 获取搜索关键词数据
- **A/B 测试**: 流量分配和测试结果追踪

## 十四、实施总结

### 14.1 已完成功能

#### 高优先级（MVP）
- ✅ 数据库表结构创建（包含索引优化）
- ✅ 数据收集 API 和客户端追踪脚本
- ✅ Admin Traffic 页面和所有图表组件
- ✅ AdminSidebar 菜单集成
- ✅ 权限控制

#### 中优先级
- ✅ 所有统计图表（来源、设备、浏览器、操作系统）
- ✅ 时间范围选择器（预设 + 自定义）
- ✅ MoM 对比计算
- ✅ 统一的日期范围处理工具函数

#### 低优先级
- ✅ 数据导出功能（CSV）
- ✅ 实时数据更新（Server-Sent Events）
- ✅ 图表样式和交互体验优化
- ✅ 空状态和错误处理改进
- ✅ 数据加载性能优化
- ✅ Tab 功能完善（Traffic Sources、Search Keywords、Geography）
- ✅ 图表颜色方案优化（不同类别使用不同颜色）

### 14.2 技术亮点

1. **统一的日期范围处理**
   - 创建了 `traffic-api-utils.ts` 工具函数
   - 所有 API 使用相同的日期范围计算逻辑
   - 支持预设周期和自定义日期范围

2. **灵活的日期选择器**
   - `DateRangePicker` 组件支持预设和自定义两种模式
   - 使用 Dialog 组件提供友好的用户界面
   - 自动验证日期范围的有效性

3. **数据库索引优化**
   - 移除了有问题的 `DATE(created_at)` 函数索引
   - 使用 `created_at` 索引即可满足日期范围查询需求
   - 避免了 PostgreSQL IMMUTABLE 函数限制

4. **代码复用和维护性**
   - 统一的工具函数减少代码重复
   - 清晰的 API 接口设计
   - 易于扩展和维护

5. **实时数据更新（SSE）**
   - 使用 Server-Sent Events (SSE) 实现实时数据推送
   - 每 30 秒自动更新关键指标（访问量、页面浏览量、唯一访客、跳出率）
   - 自动重连机制（指数退避，最多重试 5 次）
   - 连接状态指示器（Live/Connecting/Offline）
     - Live（已连接）：绿色 (#10b981)
     - Connecting（连接中）：黄色 (#f59e0b)
     - Offline（已禁用）：灰色 (#gray-400)
   - 可手动启用/禁用实时更新功能
   - 仅在 Summary Cards 中更新数值，不影响 MoM 对比数据
   - 流关闭时自动清理定时器，避免内存泄漏

6. **Tab 功能完善**
   - **Traffic Tab**: 显示主要流量数据（Summary Cards、Visits Chart、Devices、Browsers、Operating Systems）
   - **Traffic Sources Tab**: 显示流量来源分析
     - Top Traffic Sources 柱状图
     - Source Breakdown 详细表格（包含访问量和百分比）
   - **Search Keywords Tab**: 占位内容，提示需要 Google Search Console 集成
   - **Geography Tab**: 占位内容，提示需要 IP 地理位置服务集成
   - 所有 Tab 均可点击切换，不再禁用

7. **图表颜色方案优化**
   - **SourcesBarChart（流量来源）**:
     - Direct: 蓝色 (#3b82f6)
     - Google: 绿色 (#10b981)
     - Bing: 琥珀色 (#f59e0b)
     - Social: 红色 (#ef4444)
     - Other: 紫色 (#8b5cf6)
   - **BrowsersBarChart（浏览器）**:
     - Chrome: Google 蓝 (#4285f4)
     - Edge: Microsoft 蓝 (#0078d4)
     - Safari/Mobile Safari: Apple 蓝 (#007aff)
     - Firefox: Firefox 橙 (#ff7139)
     - 其他浏览器：使用默认颜色数组
   - **OperatingSystemsBarChart（操作系统）**:
     - iOS: Apple 蓝 (#007aff)
     - Windows: Microsoft 蓝 (#0078d4)
     - macOS: Apple 蓝 (#007aff)
     - Android: Android 绿 (#3ddc84)
     - Linux: Linux 黄 (#fcc624)
   - **DevicesDonutChart（设备类型）**:
     - Mobile: 蓝色 (#3b82f6)
     - Desktop: 绿色 (#10b981)
     - Tablet: 琥珀色 (#f59e0b)
   - **VisitsLineChart（访问量趋势）**:
     - Visits: 蓝色 (#3b82f6)
     - Unique Visitors: 绿色 (#10b981)
     - Pageviews: 琥珀色 (#f59e0b)
   - 使用函数动态获取颜色，支持不区分大小写匹配
   - 如果名称不完全匹配，使用默认颜色数组确保每个类别都有不同颜色

## 十五、注意事项

1. **数据准确性**: User-Agent 解析可能不完全准确，需要持续优化
2. **隐私合规**: 确保符合 GDPR、CCPA 等隐私法规
3. **性能影响**: 数据收集不应影响网站性能，使用异步请求
4. **数据量**: 随着访问量增长，数据量会快速增加，需要定期清理
5. **测试**: 充分测试各种浏览器、设备和操作系统的识别准确性
6. **日期范围处理**: 所有 API 都支持预设周期和自定义日期范围，优先使用自定义日期范围
7. **索引优化**: 避免使用非 IMMUTABLE 函数创建索引，使用基础字段索引即可满足查询需求
8. **Visit vs Pageview 区别**: 
   - Visit 只在新的会话或会话超时（30 分钟）后创建
   - Pageview 在每次页面加载时创建
   - 刷新页面不会增加 visit，只会增加 pageview
   - 这确保了统计数据更准确地反映真实的用户访问行为

## 十六、已知问题和待解决问题

### 16.1 SSE 实时数据更新问题（待解决）

**问题描述：**
- SSE 实时数据更新功能已实现，但在某些情况下数据不会实时更新
- 具体表现：
  - 打开新的标签页访问首页后，admin traffic 页面的 pageview 数值不会自动更新
  - 刷新 admin traffic 页面可以正确显示 visit 数值
  - SSE 数据接收正常（控制台可以看到 `[TrafficPage] SSE data received:` 日志）
  - 但 old 和 new 数值保持一致，页面数据不更新

**已尝试的修复：**
1. ✅ 使用 `useRef` 存储 `onUpdate` 回调，避免连接频繁重建
2. ✅ 使用 `useCallback` 包装 `onUpdate`，确保回调稳定
3. ✅ 在 `sendData` 函数中重新计算日期范围，确保 `endDate` 是当前时间
4. ✅ 添加数据变化检测，避免不必要的状态更新
5. ✅ 添加详细的调试日志

**当前状态：**
- SSE 连接正常建立
- 数据正常接收（控制台日志确认）
- 日期范围在每次查询时重新计算
- 但页面数据仍然不会实时更新

**可能的原因（待进一步调查）：**
1. React 状态更新可能存在时序问题
2. `TrafficSummaryCards` 组件可能没有正确响应状态变化
3. 可能存在 React 渲染优化导致组件未重新渲染
4. 数据比较逻辑可能存在问题（浮点数精度等）

**下一步计划：**
1. 检查 React DevTools，确认状态是否真的更新了
2. 检查 `TrafficSummaryCards` 组件的渲染逻辑
3. 考虑使用 `useEffect` 监听 `summary` 状态变化
4. 检查是否有其他组件或逻辑阻止了状态更新

**相关文件：**
- `src/hooks/useTrafficSSE.ts`
- `src/app/api/admin/traffic/stream/route.ts`
- `src/app/admin/traffic/page.tsx`
- `src/components/admin/traffic/TrafficSummaryCards.tsx`

### 16.2 Search Keywords 功能（未实现）

**功能描述：**
- 显示用户通过搜索引擎访问网站时使用的关键词
- 帮助了解用户搜索意图和内容需求
- 优化 SEO 策略和内容规划

**当前状态：**
- ✅ UI 界面已创建（Tab 和占位内容）
- ❌ 数据源未集成
- ❌ API 未实现
- ❌ 图表组件未实现

**实施计划：**

#### 阶段一：Google Search Console API 集成（高优先级）

**1.1 准备工作**
- 在 Google Cloud Console 创建项目
- 启用 Google Search Console API
- 创建服务账号并获取 JSON 密钥文件
- 将网站添加到 Google Search Console
- 验证网站所有权

**1.2 API 集成**
- 安装 `googleapis` npm 包
- 创建认证中间件（使用服务账号）
- 实现 Search Console API 客户端封装
- 处理 API 限流和错误重试

**1.3 数据获取**
- 实现 `GET /api/admin/traffic/search-keywords` API
- 使用 Search Console API 获取搜索查询数据
- 支持日期范围筛选
- 支持排序和分页
- 缓存数据以减少 API 调用（建议缓存 24 小时）

**1.4 数据存储（可选）**
- 考虑将 Search Console 数据存储到数据库
- 创建 `traffic_search_keywords` 表
- 定期同步数据（每日一次）
- 避免频繁调用 Search Console API

#### 阶段二：前端实现（高优先级）

**2.1 图表组件**
- 创建 `SearchKeywordsBarChart` 组件
- 显示 Top 搜索关键词（柱状图）
- 显示关键词趋势（折线图）
- 显示点击率（CTR）和平均位置

**2.2 数据表格**
- 显示详细的关键词列表
- 包含：关键词、展示次数、点击次数、CTR、平均位置
- 支持排序和筛选
- 支持导出 CSV

**2.3 UI 优化**
- 添加日期范围选择器
- 添加筛选选项（设备类型、国家等）
- 添加数据刷新按钮
- 显示数据最后更新时间

#### 阶段三：高级功能（中优先级）

**3.1 关键词分析**
- 关键词分组（按主题）
- 关键词趋势对比
- 竞争对手关键词分析

**3.2 数据可视化**
- 关键词云图
- 热力图（展示次数 vs 点击率）
- 时间序列分析

**技术栈：**
- **后端**: `googleapis` npm 包
- **认证**: Google Service Account (JSON Key)
- **API**: Google Search Console API v1
- **前端**: Recharts（图表）、Shadcn UI（表格）

**API 端点设计：**
```
GET /api/admin/traffic/search-keywords
查询参数：
- start_date: 开始日期（YYYY-MM-DD）
- end_date: 结束日期（YYYY-MM-DD）
- limit: 返回数量（默认 100）
- sort: 排序字段（clicks, impressions, ctr, position）
- order: 排序方向（asc, desc）

响应：
{
  "keywords": [
    {
      "keyword": "robotics academy",
      "clicks": 150,
      "impressions": 5000,
      "ctr": 3.0,
      "position": 2.5
    },
    ...
  ],
  "total": {
    "clicks": 5000,
    "impressions": 100000,
    "ctr": 5.0,
    "position": 3.2
  },
  "last_updated": "2026-01-16T12:00:00Z"
}
```

**依赖项：**
- Google Search Console API 访问权限
- 服务账号 JSON 密钥文件
- 网站已在 Search Console 中验证

**预计工作量：**
- 阶段一：2-3 天
- 阶段二：1-2 天
- 阶段三：2-3 天
- **总计：5-8 天**

### 16.3 Geography 功能（未实现）

**功能描述：**
- 显示访问者的地理位置分布
- 帮助了解目标受众的地理分布
- 优化内容本地化和市场策略

**当前状态：**
- ✅ UI 界面已创建（Tab 和占位内容）
- ❌ IP 地理位置服务未集成
- ❌ 数据收集未实现
- ❌ API 未实现
- ❌ 图表组件未实现

**实施计划：**

#### 阶段一：IP 地理位置服务集成（高优先级）

**1.1 服务选择**
- **选项 A**: MaxMind GeoIP2（推荐）
  - 优点：准确度高、支持离线数据库、成本低
  - 缺点：需要定期更新数据库
  - 成本：免费版（GeoLite2）或付费版（GeoIP2）
- **选项 B**: ipapi.co / ip-api.com（在线服务）
  - 优点：无需维护数据库、简单易用
  - 缺点：有 API 调用限制、需要网络请求
  - 成本：免费版有限制，付费版按调用量计费
- **选项 C**: Cloudflare（如果使用 Cloudflare）
  - 优点：免费、准确、无需额外集成
  - 缺点：需要 Cloudflare 代理

**推荐方案：MaxMind GeoIP2（GeoLite2 免费版）**

**1.2 数据库准备**
- 下载 MaxMind GeoLite2 数据库（City 或 Country）
- 设置数据库更新机制（每周自动更新）
- 将数据库文件存储在项目中或使用在线服务

**1.3 数据收集集成**
- 修改 `POST /api/public/traffic/track` API
- 在创建 visit 记录时解析 IP 地址
- 获取地理位置信息（国家、城市、经纬度）
- 存储到 `traffic_visits` 表的 `country` 和 `city` 字段

**1.4 数据库扩展**
- 如果 `traffic_visits` 表没有地理位置字段，需要添加：
  ```sql
  ALTER TABLE traffic_visits
  ADD COLUMN IF NOT EXISTS country_code TEXT,
  ADD COLUMN IF NOT EXISTS country_name TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
  
  CREATE INDEX IF NOT EXISTS idx_traffic_visits_country ON traffic_visits(country_code);
  CREATE INDEX IF NOT EXISTS idx_traffic_visits_city ON traffic_visits(city);
  ```

#### 阶段二：API 实现（高优先级）

**2.1 地理位置统计 API**
- 实现 `GET /api/admin/traffic/geography/countries` API
- 按国家统计访问量
- 支持日期范围筛选
- 返回国家代码、国家名称、访问量、百分比

**2.2 城市统计 API**
- 实现 `GET /api/admin/traffic/geography/cities` API
- 按城市统计访问量（Top N）
- 支持国家筛选
- 返回城市名称、国家、访问量、百分比

**2.3 地图数据 API**
- 实现 `GET /api/admin/traffic/geography/map` API
- 返回地图可视化所需的数据格式
- 支持 GeoJSON 格式输出

#### 阶段三：前端实现（高优先级）

**3.1 地图组件**
- 使用 `react-simple-maps` 或 `recharts` 的地图功能
- 显示世界地图，按国家着色（根据访问量）
- 支持交互（hover 显示详情、点击钻取到城市）

**3.2 图表组件**
- 创建 `GeographyBarChart` 组件
- 显示 Top 国家/城市（柱状图）
- 创建 `GeographyPieChart` 组件
- 显示国家分布（饼图）

**3.3 数据表格**
- 显示详细的地理位置列表
- 包含：国家、城市、访问量、百分比
- 支持排序和筛选
- 支持导出 CSV

**3.4 UI 优化**
- 添加日期范围选择器
- 添加国家/城市切换视图
- 添加地图缩放和交互功能
- 显示数据统计摘要

#### 阶段四：高级功能（低优先级）

**4.1 地理位置趋势**
- 显示地理位置随时间的变化趋势
- 识别新兴市场

**4.2 地理位置对比**
- 对比不同时间段的访问分布
- 识别市场增长趋势

**技术栈：**
- **IP 解析**: `maxmind` npm 包（MaxMind GeoIP2）
- **地图可视化**: `react-simple-maps` 或 `recharts` GeoMap
- **前端**: Recharts（图表）、Shadcn UI（表格）

**API 端点设计：**
```
GET /api/admin/traffic/geography/countries
查询参数：
- start_date: 开始日期（YYYY-MM-DD）
- end_date: 结束日期（YYYY-MM-DD）
- limit: 返回数量（默认 20）

响应：
{
  "countries": [
    {
      "country_code": "US",
      "country_name": "United States",
      "visits": 1500,
      "percentage": 64.7
    },
    ...
  ],
  "total": 2319
}

GET /api/admin/traffic/geography/cities
查询参数：
- start_date: 开始日期（YYYY-MM-DD）
- end_date: 结束日期（YYYY-MM-DD）
- country_code: 国家代码（可选）
- limit: 返回数量（默认 20）

响应：
{
  "cities": [
    {
      "city": "Seattle",
      "country_code": "US",
      "country_name": "United States",
      "visits": 500,
      "percentage": 21.6
    },
    ...
  ],
  "total": 2319
}
```

**实施步骤：**
1. 选择 IP 地理位置服务（推荐 MaxMind GeoLite2）
2. 安装必要的 npm 包
3. 下载并配置 GeoLite2 数据库
4. 修改数据收集 API，添加 IP 解析逻辑
5. 扩展数据库表结构
6. 实现地理位置统计 API
7. 创建前端图表和地图组件
8. 集成到 Traffic 页面

**预计工作量：**
- 阶段一：2-3 天
- 阶段二：1-2 天
- 阶段三：2-3 天
- 阶段四：1-2 天
- **总计：6-10 天**

**注意事项：**
- IP 地理位置解析可能不完全准确（特别是 VPN 用户）
- 需要定期更新 GeoLite2 数据库（建议每周）
- 考虑 GDPR 等隐私法规，可能需要用户同意
- 某些 IP 地址可能无法解析到具体城市（只能到国家级别）