/**
 * 导航历史管理 Hook
 * 用于跟踪用户的导航历史，判断是否显示返回按钮
 */

import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

interface NavigationHistory {
  canGoBack: boolean
  previousPath: string | null
  goBack: () => void
}

// 底部导航入口页面列表 - 这些页面应该返回到首页
const BOTTOM_NAV_PAGES = ['/', '/course-catalog', '/profile', '/locations']

export function useNavigationHistory(): NavigationHistory {
  const router = useRouter()
  const pathname = usePathname()
  const historyRef = useRef<string[]>([])
  const isInitializedRef = useRef(false)
  const [canGoBack, setCanGoBack] = useState(false)
  const [previousPath, setPreviousPath] = useState<string | null>(null)

  // 使用 useLayoutEffect 确保同步更新，避免闪烁
  useLayoutEffect(() => {
    if (!pathname) return

    const history = historyRef.current
    const lastPath = history[history.length - 1]

    // 初始化：如果是第一次，添加当前路径
    if (!isInitializedRef.current) {
      history.push(pathname)
      isInitializedRef.current = true
    } else {
      // 避免重复添加相同路径
      if (lastPath !== pathname) {
        history.push(pathname)
        // 限制历史栈大小（防止内存泄漏）
        if (history.length > 50) {
          history.shift()
        }
      }
    }

    // 判断是否可以返回
    const isHomePage = pathname === '/'
    const isBottomNavPage = BOTTOM_NAV_PAGES.includes(pathname)
    const hasCustomHistory = history.length > 1
    
    // 可以返回的条件：只要不是首页，就显示返回按钮
    const shouldShowBack = !isHomePage

    setCanGoBack(shouldShowBack)

    // 获取前一个页面路径
    if (hasCustomHistory && history.length >= 2) {
      // 如果当前是底部导航页面，返回到首页
      if (isBottomNavPage) {
        setPreviousPath('/')
      } else {
        // 否则返回到上一个页面
        const prevIndex = history.length - 2
        setPreviousPath(history[prevIndex] || '/')
      }
    } else if (shouldShowBack) {
      // 即使没有自定义历史，默认返回到首页
      setPreviousPath('/')
    } else {
      setPreviousPath(null)
    }
  }, [pathname])

  const goBack = () => {
    if (!canGoBack) return

    const currentPath = pathname || ''
    const history = historyRef.current

    // 如果当前是底部导航入口页面，返回到首页
    if (BOTTOM_NAV_PAGES.includes(currentPath)) {
      router.push('/')
      return
    }

    // 如果有历史记录，使用 back() 方法
    if (history.length > 1) {
      router.back()
    } else {
      // 如果没有历史记录，返回到首页
      router.push('/')
    }
  }

  return {
    canGoBack,
    previousPath,
    goBack,
  }
}

