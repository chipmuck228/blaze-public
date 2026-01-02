'use client'

import { useEffect, useRef, useState } from 'react'
import { usePlatform } from './usePlatform'

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void
  threshold?: number // 下拉阈值（像素）
  enabled?: boolean // 是否启用
}

/**
 * 下拉刷新 Hook
 * 仅在移动端原生平台启用
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  enabled = true,
}: UsePullToRefreshOptions) {
  const { isNative, isReady } = usePlatform()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef<number>(0)
  const currentY = useRef<number>(0)
  const elementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isReady || !isNative || !enabled) {
      return
    }

    const element = elementRef.current
    if (!element) return

    let isPulling = false
    let isAtTop = false

    const handleTouchStart = (e: TouchEvent) => {
      // 检查是否在页面顶部
      isAtTop = element.scrollTop === 0
      if (isAtTop) {
        startY.current = e.touches[0].clientY
        isPulling = true
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || !isAtTop) return

      currentY.current = e.touches[0].clientY
      const distance = currentY.current - startY.current

      // 只允许向下拉
      if (distance > 0) {
        e.preventDefault() // 防止页面滚动
        const pullDistance = Math.min(distance, threshold * 1.5)
        setPullDistance(pullDistance)
      } else {
        setPullDistance(0)
      }
    }

    const handleTouchEnd = async () => {
      if (!isPulling) return

      isPulling = false

      // 如果下拉距离超过阈值，触发刷新
      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true)
        setPullDistance(threshold) // 保持下拉状态

        try {
          await onRefresh()
        } finally {
          // 延迟重置，让用户看到刷新完成
          setTimeout(() => {
            setIsRefreshing(false)
            setPullDistance(0)
          }, 300)
        }
      } else {
        // 未达到阈值，平滑回弹
        setPullDistance(0)
      }
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: false })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isReady, isNative, enabled, threshold, onRefresh, isRefreshing, pullDistance])

  return {
    elementRef,
    isRefreshing,
    pullDistance,
    pullProgress: Math.min(pullDistance / threshold, 1), // 0-1 的进度值
  }
}

