'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import {
  getOrCreateSessionId,
  getCurrentDomain,
  classifySource,
  classifyDevice,
  classifyBrowser,
  classifyOS,
} from '@/lib/traffic-utils'

/**
 * Traffic Tracker 组件
 * 自动追踪页面访问和页面浏览
 */
export function TrafficTracker() {
  const pathname = usePathname()

  useEffect(() => {
    // 只在客户端执行
    if (typeof window === 'undefined') {
      return
    }

    const trackPageView = async () => {
      try {
        const sessionId = getOrCreateSessionId()
        const currentDomain = getCurrentDomain()
        const referrer = document.referrer || ''
        const userAgent = navigator.userAgent
        const screenWidth = window.screen.width
        const screenHeight = window.screen.height
        const pagePath = window.location.pathname
        const pageTitle = document.title

        // 分类访问来源
        const sourceType = classifySource(referrer, currentDomain)

        // 分类设备类型
        const deviceType = classifyDevice(screenWidth, userAgent)

        // 分类浏览器类型
        const browserName = classifyBrowser(userAgent)

        // 分类操作系统
        const osName = classifyOS(userAgent)

        // 发送追踪数据
        const response = await fetch('/api/public/traffic/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: sessionId,
            page_path: pagePath,
            referrer: referrer || null,
            user_agent: userAgent,
            screen_width: screenWidth,
            screen_height: screenHeight,
            page_title: pageTitle,
            source_type: sourceType,
            device_type: deviceType,
            browser_name: browserName,
            os_name: osName,
          }),
        })

        if (!response.ok) {
          const errBody = await response.text()
          console.error(
            'Failed to track page view:',
            response.status,
            response.statusText,
            errBody || undefined
          )
        }
      } catch (error) {
        // 静默失败，不影响用户体验
        console.error('Error tracking page view:', error)
      }
    }

    // 延迟追踪，避免阻塞页面加载
    const timeoutId = setTimeout(trackPageView, 1000)

    // 页面卸载时追踪跳出
    const handleBeforeUnload = () => {
      // 使用 sendBeacon 确保数据发送成功
      const sessionId = getOrCreateSessionId()
      if (sessionId) {
        navigator.sendBeacon(
          '/api/public/traffic/track-exit',
          JSON.stringify({
            session_id: sessionId,
          })
        )
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [pathname])

  // 此组件不渲染任何内容
  return null
}
