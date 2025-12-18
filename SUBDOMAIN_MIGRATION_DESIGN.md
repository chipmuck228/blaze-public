# 从路径模式到子域名模式的迁移方案

## 核心答案

**不需要重新开发代码！** 只需要修改 **Franchise 解析逻辑**，所有业务逻辑、API、组件都可以完全复用。

---

## 1. 架构优势说明

### 1.1 多租户架构的核心优势

当前系统采用 **"单应用多租户（Single Application Multi-Tenant）"** 架构，这意味着：

- ✅ **单一代码库**：所有 Franchise 共享同一套代码
- ✅ **统一部署**：一次部署，所有分站可用
- ✅ **数据隔离**：通过 `franchise_id` 实现逻辑隔离
- ✅ **灵活切换**：只需改变 Franchise 解析方式，无需修改业务逻辑

### 1.2 路径模式 vs 子域名模式

| 特性 | 路径模式（当前） | 子域名模式（未来） |
|------|----------------|------------------|
| **URL 示例** | `/locations/bellevue` | `bellevue.blazeroboticsacademy.org` |
| **Franchise 解析** | 从 `pathname` 解析 | 从 `hostname` 解析 |
| **代码复用** | ✅ 100% | ✅ 100% |
| **API 逻辑** | ✅ 完全复用 | ✅ 完全复用 |
| **组件逻辑** | ✅ 完全复用 | ✅ 完全复用 |
| **数据模型** | ✅ 完全复用 | ✅ 完全复用 |

**结论**：两种模式只是 **Franchise 解析方式不同**，其他所有代码都可以复用。

---

## 2. 实现方案

### 2.1 核心改动点

只需要修改 **Franchise 解析逻辑**，从以下位置：

**当前（路径模式）**：
```typescript
// 从 URL 路径解析
const pathname = window.location.pathname
// /locations/bellevue → 'bellevue'
const franchiseCode = pathname.split('/locations/')[1]
```

**未来（子域名模式）**：
```typescript
// 从 hostname 解析
const hostname = window.location.hostname
// bellevue.blazeroboticsacademy.org → 'bellevue'
const franchiseCode = hostname.split('.')[0]
```

### 2.2 具体实现步骤

#### Step 1: 创建 Franchise 解析工具函数

**文件**: `src/lib/franchise-utils.ts`

```typescript
/**
 * 从请求中解析当前 Franchise Code
 * 支持两种模式：
 * 1. 路径模式：/locations/{code}
 * 2. 子域名模式：{code}.blazeroboticsacademy.org
 */
export function getFranchiseCodeFromRequest(
  pathname: string,
  hostname: string
): string | null {
  // 优先级 1: 子域名模式
  // 例如：bellevue.blazeroboticsacademy.org
  if (hostname && hostname !== 'localhost' && hostname !== 'www.blazeroboticsacademy.org') {
    const parts = hostname.split('.')
    // 如果是子域名（至少 3 部分：subdomain.domain.tld）
    if (parts.length >= 3) {
      const subdomain = parts[0]
      // 排除 'www'
      if (subdomain !== 'www') {
        return subdomain.toLowerCase()
      }
    }
  }

  // 优先级 2: 路径模式
  // 例如：/locations/bellevue
  if (pathname.startsWith('/locations/')) {
    const match = pathname.match(/^\/locations\/([^/]+)/)
    if (match && match[1]) {
      return decodeURIComponent(match[1]).toLowerCase()
    }
  }

  // 优先级 3: URL 参数
  // 例如：/course-catalog?franchise=bellevue
  // （这个逻辑已经在组件中实现）

  return null
}

/**
 * 在服务端获取 Franchise Code（Next.js Server Component）
 */
export function getFranchiseCodeFromHeaders(
  headers: Headers
): string | null {
  const hostname = headers.get('host') || ''
  const pathname = headers.get('x-pathname') || '' // 需要在 middleware 中设置

  return getFranchiseCodeFromRequest(pathname, hostname)
}
```

#### Step 2: 创建 Middleware（Next.js）

**文件**: `src/middleware.ts`

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getFranchiseCodeFromRequest } from '@/lib/franchise-utils'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') || ''

  // 解析当前 Franchise Code
  const franchiseCode = getFranchiseCodeFromRequest(pathname, hostname)

  // 将 Franchise Code 添加到请求头，供 Server Components 使用
  const requestHeaders = new Headers(request.headers)
  if (franchiseCode) {
    requestHeaders.set('x-franchise-code', franchiseCode)
  }
  requestHeaders.set('x-pathname', pathname)

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
```

#### Step 3: 创建 Franchise Context（可选，用于客户端）

**文件**: `src/contexts/FranchiseContext.tsx`

```typescript
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { getFranchiseCodeFromRequest } from '@/lib/franchise-utils'

interface FranchiseContextType {
  franchiseCode: string | null
  isLoading: boolean
}

const FranchiseContext = createContext<FranchiseContextType>({
  franchiseCode: null,
  isLoading: true,
})

export function FranchiseProvider({ children }: { children: React.ReactNode }) {
  const [franchiseCode, setFranchiseCode] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const code = getFranchiseCodeFromRequest(
        window.location.pathname,
        window.location.hostname
      )
      setFranchiseCode(code)
      setIsLoading(false)
    }
  }, [])

  return (
    <FranchiseContext.Provider value={{ franchiseCode, isLoading }}>
      {children}
    </FranchiseContext.Provider>
  )
}

export function useFranchise() {
  return useContext(FranchiseContext)
}
```

#### Step 4: 更新 Location 页面（支持两种模式）

**文件**: `src/app/locations/[code]/page.tsx`（路径模式，保持不变）

**新增文件**: `src/app/page.tsx`（根页面，支持子域名模式）

```typescript
import { headers } from 'next/headers'
import { getFranchiseCodeFromHeaders } from '@/lib/franchise-utils'
import { getFranchiseByCode } from '@/lib/db'
import { notFound } from 'next/navigation'

export default async function HomePage() {
  const headersList = await headers()
  const franchiseCode = getFranchiseCodeFromHeaders(headersList)

  // 如果是子域名模式且有 franchise code，显示 Location 子站
  if (franchiseCode) {
    const franchise = await getFranchiseByCode(franchiseCode)
    if (franchise) {
      // 渲染 Location 子站内容（复用现有组件）
      return <LocationSubSite franchise={franchise} />
    }
  }

  // 否则显示 HQ 首页
  return <HQHomePage />
}
```

---

## 3. 代码复用说明

### 3.1 完全复用的部分

以下代码 **100% 复用**，无需任何修改：

#### ✅ API 路由
- `/api/courses?franchise={code}` - 完全复用
- `/api/programs?franchise={code}` - 完全复用
- `/api/courses/{id}/instances?franchise={code}` - 完全复用
- 所有其他 API - 完全复用

#### ✅ 数据库函数
- `getFranchiseByCode(code)` - 完全复用
- `getAllLearningPaths()` - 完全复用
- 所有其他数据库函数 - 完全复用

#### ✅ React 组件
- `AllCourses` - 完全复用
- `CourseDetail` - 完全复用
- `LocationFeaturedCourses` - 完全复用
- 所有其他组件 - 完全复用

#### ✅ 业务逻辑
- 课程过滤逻辑 - 完全复用
- 用户偏好记忆 - 完全复用
- 注册流程 - 完全复用
- 所有其他业务逻辑 - 完全复用

### 3.2 需要调整的部分

只需要调整 **Franchise 解析方式**：

| 位置 | 当前实现 | 新实现 |
|------|---------|--------|
| **Location 页面** | 从 `params.code` 获取 | 从 `hostname` 或 `params.code` 获取 |
| **客户端组件** | 从 `window.location.pathname` 解析 | 从 `window.location.hostname` 解析 |
| **服务端组件** | 从 `params` 获取 | 从 `headers` 获取 |

---

## 4. 迁移步骤

### Phase 1: 准备阶段（不破坏现有功能）

1. **创建工具函数**
   - 创建 `src/lib/franchise-utils.ts`
   - 实现 `getFranchiseCodeFromRequest` 函数
   - 支持两种模式的解析

2. **创建 Middleware**
   - 创建 `src/middleware.ts`
   - 解析 Franchise Code 并添加到请求头
   - 不影响现有路径模式

3. **测试工具函数**
   - 单元测试：路径模式解析
   - 单元测试：子域名模式解析
   - 确保两种模式都能正常工作

### Phase 2: 渐进式迁移（可选）

1. **同时支持两种模式**
   - 路径模式继续工作：`/locations/bellevue`
   - 子域名模式开始工作：`bellevue.blazeroboticsacademy.org`
   - 两种模式可以并存

2. **更新链接生成**
   - 根据当前模式生成正确的链接
   - 路径模式：`/locations/{code}`
   - 子域名模式：`https://{code}.blazeroboticsacademy.org`

3. **SEO 和重定向**
   - 设置 301 重定向：`/locations/bellevue` → `bellevue.blazeroboticsacademy.org`
   - 更新 sitemap.xml
   - 更新 robots.txt

### Phase 3: 完全切换（可选）

1. **移除路径模式支持**
   - 删除 `/locations/[code]` 路由（如果不再需要）
   - 所有访问都通过子域名

2. **清理代码**
   - 移除路径模式相关的特殊处理
   - 统一使用子域名模式

---

## 5. 配置要求

### 5.1 DNS 配置

需要在 DNS 提供商配置通配符域名：

```
*.blazeroboticsacademy.org  →  Vercel 服务器 IP
```

### 5.2 Vercel 配置

在 `vercel.json` 或 Vercel Dashboard 中配置：

```json
{
  "domains": [
    "blazeroboticsacademy.org",
    "*.blazeroboticsacademy.org"
  ]
}
```

### 5.3 数据库配置

确保 `franchises` 表的 `primary_domain` 字段正确：

```sql
UPDATE franchises 
SET primary_domain = 'bellevue.blazeroboticsacademy.org'
WHERE code = 'bellevue';
```

---

## 6. 优势对比

### 6.1 路径模式（当前）

**优点**:
- ✅ 实现简单，无需 DNS 配置
- ✅ 适合开发和测试
- ✅ 所有分站共享同一个域名

**缺点**:
- ⚠️ URL 较长：`/locations/bellevue/course-catalog`
- ⚠️ SEO 不如子域名模式
- ⚠️ 品牌独立性较弱

### 6.2 子域名模式（未来）

**优点**:
- ✅ URL 更简洁：`bellevue.blazeroboticsacademy.org/course-catalog`
- ✅ 更好的 SEO（每个子域名独立索引）
- ✅ 更强的品牌独立性
- ✅ 可以配置独立的 SSL 证书（如果需要）

**缺点**:
- ⚠️ 需要 DNS 配置
- ⚠️ 需要 Vercel 通配符域名支持
- ⚠️ 开发环境需要额外配置（可以使用 hosts 文件）

---

## 7. 实施建议

### 7.1 推荐方案：渐进式迁移

1. **保持路径模式**（当前实现）
2. **添加子域名支持**（新功能）
3. **两种模式并存**（过渡期）
4. **逐步迁移**（根据业务需求）

### 7.2 代码改动量估算

| 任务 | 文件数 | 代码行数 | 复杂度 |
|------|--------|---------|--------|
| 创建工具函数 | 1 | ~50 | 低 |
| 创建 Middleware | 1 | ~30 | 低 |
| 更新根页面 | 1 | ~20 | 低 |
| 测试 | 3-5 | ~100 | 中 |
| **总计** | **6-8** | **~200** | **低-中** |

**结论**：改动量很小，主要是添加新功能，不破坏现有功能。

---

## 8. 示例代码

### 8.1 完整的工具函数实现

```typescript
// src/lib/franchise-utils.ts
export function getFranchiseCodeFromRequest(
  pathname: string,
  hostname: string
): string | null {
  // 优先级 1: 子域名模式
  if (hostname && !isLocalhost(hostname) && !isMainDomain(hostname)) {
    const subdomain = extractSubdomain(hostname)
    if (subdomain) {
      return subdomain.toLowerCase()
    }
  }

  // 优先级 2: 路径模式
  const pathMatch = pathname.match(/^\/locations\/([^/]+)/)
  if (pathMatch && pathMatch[1]) {
    return decodeURIComponent(pathMatch[1]).toLowerCase()
  }

  return null
}

function isLocalhost(hostname: string): boolean {
  return hostname === 'localhost' || hostname.startsWith('localhost:')
}

function isMainDomain(hostname: string): boolean {
  return hostname === 'www.blazeroboticsacademy.org' || 
         hostname === 'blazeroboticsacademy.org'
}

function extractSubdomain(hostname: string): string | null {
  const parts = hostname.split('.')
  // 至少需要 3 部分：subdomain.domain.tld
  if (parts.length >= 3) {
    const subdomain = parts[0]
    if (subdomain !== 'www') {
      return subdomain
    }
  }
  return null
}
```

---

## 9. 总结

### ✅ 核心答案

**不需要重新开发代码！** 只需要：

1. **创建工具函数**：统一 Franchise Code 解析逻辑（~50 行代码）
2. **创建 Middleware**：在请求层面解析 Franchise Code（~30 行代码）
3. **更新根页面**：支持子域名模式（~20 行代码）

**总代码量**：约 100 行新代码，所有现有代码 100% 复用。

### ✅ 架构优势

多租户架构的核心优势就是 **代码复用**：
- 单一代码库
- 统一部署
- 灵活切换
- 易于维护

### ✅ 迁移建议

1. **保持路径模式**：现有功能不受影响
2. **添加子域名支持**：作为新功能添加
3. **两种模式并存**：根据需求选择使用
4. **渐进式迁移**：不需要一次性切换

---

**结论**：从路径模式切换到子域名模式，只需要添加约 100 行代码，所有现有业务逻辑、API、组件都可以完全复用，无需重新开发。

