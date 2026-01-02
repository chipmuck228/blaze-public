'use client'

import { useEffect, useRef, useState } from 'react'

interface UseInfiniteScrollOptions {
  onLoadMore: () => Promise<void> | void
  hasMore: boolean
  threshold?: number // 距离底部多少像素时触发加载
  enabled?: boolean // 是否启用
}

/**
 * 无限滚动 Hook
 */
export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  threshold = 200,
  enabled = true,
}: UseInfiniteScrollOptions) {
  const [isLoading, setIsLoading] = useState(false)
  const elementRef = useRef<HTMLElement | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (!enabled || !hasMore || isLoading) {
      return
    }

    const element = elementRef.current
    if (!element) return

    // 使用 Intersection Observer 检测是否接近底部
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting && hasMore && !isLoading) {
          setIsLoading(true)
          Promise.resolve(onLoadMore())
            .finally(() => {
              setIsLoading(false)
            })
        }
      },
      {
        root: element,
        rootMargin: `${threshold}px`,
        threshold: 0.1,
      }
    )

    // 创建一个 sentinel 元素用于检测
    const sentinel = document.createElement('div')
    sentinel.style.height = '1px'
    sentinel.style.width = '100%'
    element.appendChild(sentinel)

    observer.observe(sentinel)
    observerRef.current = observer

    return () => {
      if (sentinel.parentNode) {
        sentinel.parentNode.removeChild(sentinel)
      }
      observer.disconnect()
    }
  }, [enabled, hasMore, isLoading, onLoadMore, threshold])

  // 备用方案：使用 scroll 事件（如果 Intersection Observer 不可用）
  useEffect(() => {
    if (!enabled || !hasMore || isLoading || observerRef.current) {
      return
    }

    const element = elementRef.current
    if (!element) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = element
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight

      if (distanceFromBottom < threshold && !isLoading) {
        setIsLoading(true)
        Promise.resolve(onLoadMore())
          .finally(() => {
            setIsLoading(false)
          })
      }
    }

    element.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      element.removeEventListener('scroll', handleScroll)
    }
  }, [enabled, hasMore, isLoading, onLoadMore, threshold])

  return {
    elementRef,
    isLoading,
  }
}

