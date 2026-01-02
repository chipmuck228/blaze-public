# iOS App 返回导航功能设计文档

**版本**: 1.0  
**日期**: 2025-12  
**状态**: 设计阶段 📋

---

## 📋 目录

1. [概述](#概述)
2. [需求分析](#需求分析)
3. [设计方案](#设计方案)
4. [技术实现方案](#技术实现方案)
5. [UI/UX 设计](#uiux-设计)
6. [边界情况处理](#边界情况处理)
7. [实施计划](#实施计划)

---

## 概述

### 目标

为 iOS App 中的每个页面实现统一的返回导航功能，确保用户能够方便地返回到前一个页面。

### 背景

当前 iOS App 使用 Next.js + Capacitor 构建，采用单页应用（SPA）架构。虽然底部导航栏提供了主要入口，但缺少统一的返回按钮机制，特别是在深层页面导航时。

### 设计原则

1. **一致性**：所有页面使用统一的返回导航模式
2. **可发现性**：返回按钮清晰可见，符合 iOS 设计规范
3. **原生体验**：支持 iOS 原生的边缘滑动返回手势
4. **智能显示**：只在需要时显示返回按钮（非首页且有历史记录）
5. **性能优化**：不影响现有导航性能

---

## 需求分析

### 功能需求

1. **返回按钮显示**
   - 在非首页页面显示返回按钮
   - 返回按钮位于顶部导航栏左侧
   - 显示前一个页面的标题或"返回"文字

2. **导航历史管理**
   - 跟踪用户的导航历史栈
   - 支持浏览器历史记录（Next.js Router）
   - 处理深层链接和直接访问

3. **返回行为**
   - 点击返回按钮：返回到前一个页面
   - iOS 边缘滑动：使用原生手势返回
   - 处理表单未保存等特殊情况

4. **特殊页面处理**
   - 首页（`/`）：不显示返回按钮
   - 底部导航入口页面：返回到首页
   - 深层页面：返回到上一个页面

### 非功能需求

1. **性能**：不影响页面加载和导航速度
2. **兼容性**：与现有导航系统兼容
3. **可维护性**：代码结构清晰，易于扩展

---

## 设计方案

### 架构设计

```
┌─────────────────────────────────────────┐
│         MobileTopBar (现有)              │
│  ┌──────────┐  ┌──────────────────┐   │
│  │ 返回按钮  │  │  Logo/标题/搜索  │   │
│  └──────────┘  └──────────────────┘   │
└─────────────────────────────────────────┘
           │
           ├─── 导航历史管理 (新增)
           │    └─── useNavigationHistory Hook
           │
           ├─── 返回按钮组件 (新增)
           │    └─── MobileBackButton Component
           │
           └─── iOS 原生手势支持 (Capacitor)
                └─── App Plugin (可选)
```

### 核心组件

#### 1. 导航历史管理 Hook

**文件**: `src/hooks/useNavigationHistory.ts`

**功能**:
- 跟踪导航历史栈
- 判断是否显示返回按钮
- 获取前一个页面的信息

**API**:
```typescript
interface NavigationHistory {
  canGoBack: boolean
  previousPath: string | null
  previousTitle: string | null
  goBack: () => void
}

function useNavigationHistory(): NavigationHistory
```

**实现逻辑**:
- 使用 Next.js Router 的 `usePathname` 和 `useRouter`
- 维护一个客户端历史栈（localStorage 或内存）
- 监听路由变化，更新历史栈
- 排除底部导航入口页面（这些页面应返回到首页）

#### 2. 返回按钮组件

**文件**: `src/components/mobile/MobileBackButton.tsx`

**功能**:
- 显示返回按钮（iOS 风格的箭头图标）
- 处理点击事件
- 显示前一个页面标题（可选）

**Props**:
```typescript
interface MobileBackButtonProps {
  previousTitle?: string | null
  onClick?: () => void
  className?: string
}
```

**UI 设计**:
- iOS 风格：左箭头图标 + "返回" 或页面标题
- 位置：顶部导航栏左侧
- 尺寸：44x44pt（iOS 最小触摸区域）
- 样式：与现有 MobileTopBar 风格一致

#### 3. 增强的 MobileTopBar

**修改**: `src/components/mobile/MobileTopBar.tsx`

**变更**:
- 集成 `MobileBackButton` 组件
- 根据 `useNavigationHistory` 决定是否显示返回按钮
- 调整布局：返回按钮 | Logo/标题 | 搜索/通知/用户

---

## 技术实现方案

### 方案 1: 基于 Next.js Router 历史（推荐）

**优点**:
- 利用 Next.js 内置的路由历史
- 无需额外状态管理
- 兼容性好

**实现**:

1. **导航历史 Hook**
   ```typescript
   // src/hooks/useNavigationHistory.ts
   import { useRouter, usePathname } from 'next/navigation'
   import { useEffect, useRef, useState } from 'react'
   
   export function useNavigationHistory() {
     const router = useRouter()
     const pathname = usePathname()
     const historyRef = useRef<string[]>([])
     const [canGoBack, setCanGoBack] = useState(false)
     
     useEffect(() => {
       // 更新历史栈
       if (pathname) {
         const history = historyRef.current
         const lastPath = history[history.length - 1]
         
         // 避免重复添加相同路径
         if (lastPath !== pathname) {
           history.push(pathname)
           // 限制历史栈大小（防止内存泄漏）
           if (history.length > 50) {
             history.shift()
           }
         }
         
         // 判断是否可以返回
         // 排除首页和底部导航入口页面
         const isHomePage = pathname === '/'
         const isBottomNavPage = [
           '/',
           '/course-catalog',
           '/profile',
           '/locations'
         ].includes(pathname)
         
         setCanGoBack(!isHomePage && history.length > 1)
       }
     }, [pathname])
     
     const goBack = () => {
       if (canGoBack) {
         router.back() // 使用 Next.js 的 back() 方法
       }
     }
     
     return {
       canGoBack,
       goBack
     }
   }
   ```

2. **返回按钮组件**
   ```typescript
   // src/components/mobile/MobileBackButton.tsx
   'use client'
   
   import { ArrowLeft } from 'lucide-react'
   import { Button } from '@/components/ui/button'
   import { useNavigationHistory } from '@/hooks/useNavigationHistory'
   
   export function MobileBackButton() {
     const { canGoBack, goBack } = useNavigationHistory()
     
     if (!canGoBack) {
       return null
     }
     
     return (
       <Button
         variant="ghost"
         size="icon"
         onClick={goBack}
         className="h-9 w-9 -ml-2"
         aria-label="返回"
       >
         <ArrowLeft className="h-5 w-5" />
       </Button>
     )
   }
   ```

3. **集成到 MobileTopBar**
   ```typescript
   // 在 MobileTopBar.tsx 中添加
   import { MobileBackButton } from '@/components/mobile/MobileBackButton'
   
   // 在 header 的 flex 容器中，Logo 之前添加
   <MobileBackButton />
   <Link href="/" className="flex items-center gap-2">
     <BlazeLogoIcon />
     <span className="font-bold text-lg">Blaze Robotics</span>
   </Link>
   ```

### 方案 2: 自定义历史栈管理

**适用场景**: 需要更精细的控制，如显示前一个页面标题

**实现**:
- 使用 Context API 或 Zustand 管理全局导航历史
- 存储每个页面的元数据（标题、路径等）
- 支持更复杂的导航逻辑

### 方案 3: Capacitor App Plugin（可选）

**用途**: 监听 iOS 原生的返回按钮（如果有）或处理应用生命周期

**实现**:
```typescript
import { App } from '@capacitor/app'

// 监听应用返回事件（Android 物理返回键，iOS 无此需求）
App.addListener('backButton', () => {
  // 处理返回逻辑
})
```

**注意**: iOS 没有物理返回键，主要依赖边缘滑动手势，由 WebView 自动处理。

---

## UI/UX 设计

### 返回按钮设计

#### 视觉设计

**位置**: 顶部导航栏最左侧

**尺寸**: 
- 按钮: 44x44pt（iOS 最小触摸区域）
- 图标: 20x20pt

**样式**:
```
┌─────────────────────────────────────────┐
│ [←]  Blaze Robotics    [🔍] [🔔] [👤]  │
└─────────────────────────────────────────┘
```

**状态**:
- **默认**: 灰色图标，半透明
- **悬停/按下**: 高亮，轻微缩放动画
- **禁用**: 隐藏（不显示）

#### 交互设计

1. **点击返回**
   - 立即响应（无延迟）
   - 平滑的页面过渡动画（Next.js 默认）
   - 保持滚动位置（如果可能）

2. **边缘滑动返回**（iOS 原生）
   - 由 WebView 自动处理
   - 无需额外实现
   - 与返回按钮行为一致

3. **长按返回按钮**（可选）
   - 显示导航历史菜单
   - 快速跳转到历史页面

### 页面标题显示（可选增强）

**场景**: 返回按钮旁边显示前一个页面标题

**设计**:
```
┌─────────────────────────────────────────┐
│ [← 课程详情]  Blaze Robotics  [🔍][🔔] │
└─────────────────────────────────────────┘
```

**实现**: 需要维护页面标题映射表

---

## 边界情况处理

### 1. 直接访问深层页面

**场景**: 用户通过外部链接直接访问 `/course-catalog/robotics-101`

**处理**:
- 检查是否有历史记录
- 如果没有，返回到默认页面（首页或课程目录）
- 或显示"关闭"按钮而不是返回按钮

### 2. 表单页面

**场景**: 用户在填写表单时点击返回

**处理**:
- 检查表单是否有未保存的更改
- 如果有，显示确认对话框
- 用户确认后返回

**实现**:
```typescript
const handleBack = () => {
  if (hasUnsavedChanges) {
    if (confirm('您有未保存的更改，确定要离开吗？')) {
      goBack()
    }
  } else {
    goBack()
  }
}
```

### 3. 模态页面/对话框

**场景**: 从模态页面返回

**处理**:
- 关闭模态而不是返回
- 或返回到打开模态的页面

### 4. 底部导航入口页面

**场景**: 用户在 `/course-catalog` 点击返回

**处理**:
- 返回到首页（`/`）
- 因为这些页面是主要入口，不是深层页面

**逻辑**:
```typescript
const bottomNavPages = ['/', '/course-catalog', '/profile', '/locations']

const getBackPath = () => {
  if (bottomNavPages.includes(currentPath)) {
    return '/' // 返回到首页
  }
  return previousPath // 返回到上一个页面
}
```

### 5. 循环导航

**场景**: 页面 A → 页面 B → 页面 A

**处理**:
- 检测循环，避免无限循环
- 返回到首页或最近的唯一页面

### 6. 外部链接导航

**场景**: 从外部网站跳转到应用内页面

**处理**:
- 重置导航历史
- 或返回到首页

---

## 实施计划

### 阶段 1: 基础返回功能（MVP）

**目标**: 实现基本的返回按钮功能

**任务**:
1. ✅ 创建 `useNavigationHistory` Hook
2. ✅ 创建 `MobileBackButton` 组件
3. ✅ 集成到 `MobileTopBar`
4. ✅ 测试基本返回功能

**预计时间**: 2-3 小时

### 阶段 2: 边界情况处理

**目标**: 处理各种边界情况

**任务**:
1. 处理直接访问深层页面
2. 处理表单未保存警告
3. 处理底部导航入口页面
4. 处理循环导航

**预计时间**: 3-4 小时

### 阶段 3: UI/UX 优化（可选）

**目标**: 增强用户体验

**任务**:
1. 添加页面标题显示
2. 添加返回动画
3. 添加长按显示历史菜单
4. 优化触摸反馈

**预计时间**: 2-3 小时

### 阶段 4: 测试和优化

**目标**: 确保功能稳定

**任务**:
1. 单元测试
2. 集成测试
3. 真机测试
4. 性能优化

**预计时间**: 2-3 小时

---

## 技术细节

### 依赖项

**现有依赖**:
- `next/navigation`: Next.js 路由
- `@capacitor/core`: Capacitor 平台检测
- `lucide-react`: 图标库

**无需新增依赖**: 使用现有技术栈即可实现

### 性能考虑

1. **历史栈大小限制**: 限制为 50 条记录，防止内存泄漏
2. **懒加载**: 返回按钮组件按需渲染
3. **防抖**: 避免频繁更新历史栈

### 兼容性

- ✅ iOS 13+
- ✅ 支持深色模式
- ✅ 支持安全区域（Safe Area）
- ✅ 支持动态字体大小

---

## 测试用例

### 功能测试

1. **基本返回**
   - 从首页进入课程详情页，点击返回，应返回到课程列表
   - 从课程列表进入课程详情，点击返回，应返回到课程列表

2. **深层导航**
   - 首页 → 课程列表 → 课程详情 → 报名页面
   - 在报名页面点击返回，应返回到课程详情

3. **底部导航页面**
   - 在 `/course-catalog` 点击返回，应返回到首页

4. **直接访问**
   - 直接访问 `/course-catalog/robotics-101`
   - 应显示返回按钮，点击返回到课程列表或首页

### 边界测试

1. **表单未保存**
   - 在表单页面修改内容，点击返回
   - 应显示确认对话框

2. **循环导航**
   - 页面 A → B → A
   - 应正确处理，避免循环

3. **外部链接**
   - 从外部链接进入应用
   - 应正确处理导航历史

---

## 后续优化方向

### 短期优化

1. **页面标题显示**: 在返回按钮旁显示前一个页面标题
2. **导航历史菜单**: 长按返回按钮显示历史菜单
3. **返回动画**: 自定义返回过渡动画

### 长期优化

1. **智能返回**: 根据上下文智能决定返回目标
2. **返回手势增强**: 自定义边缘滑动行为
3. **导航分析**: 收集导航数据，优化用户体验

---

## 相关文件清单

### 需要创建的文件

1. `src/hooks/useNavigationHistory.ts` - 导航历史管理 Hook
2. `src/components/mobile/MobileBackButton.tsx` - 返回按钮组件

### 需要修改的文件

1. `src/components/mobile/MobileTopBar.tsx` - 集成返回按钮
2. `src/app/mobile-layout.tsx` - 可能需要调整布局（如果需要）

### 相关文档

1. `IOS_APP_IMPLEMENTATION_SUMMARY.md` - iOS 实现总结
2. `MOBILE_APP_HOME_DESIGN.md` - 移动端首页设计
3. `MOBILE_APP_CONVERSION_PLAN.md` - 移动端转换方案

---

## 总结

本设计文档详细规划了 iOS App 返回导航功能的实现方案。核心思路是：

1. **利用 Next.js Router**: 使用内置的 `router.back()` 方法
2. **智能显示**: 只在需要时显示返回按钮
3. **统一体验**: 与 iOS 原生应用保持一致
4. **渐进增强**: 先实现基础功能，再逐步优化

该方案无需修改大量现有代码，主要通过新增组件和 Hook 实现，对现有系统影响最小。

---

**最后更新**: 2025-12

