'use client'

import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigationHistory } from '@/hooks/useNavigationHistory'
import { usePlatform } from '@/hooks/usePlatform'

/**
 * 移动端返回按钮组件
 * 仅在 iOS/Android 原生平台显示，且只在有导航历史时显示
 * 固定在页面左上角，带有背景和阴影以确保可见性
 */
export function MobileBackButton() {
  const { canGoBack, goBack } = useNavigationHistory()
  const { isNative, isReady } = usePlatform()

  // 等待平台检测完成，避免 SSR hydration mismatch
  if (!isReady || !isNative) {
    return null
  }

  // 如果没有历史记录，不显示返回按钮
  if (!canGoBack) {
    return null
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={goBack}
      className="h-11 w-11 m-2 rounded-full bg-background/80 backdrop-blur-sm shadow-lg border border-border/50 hover:bg-background/90 active:scale-95 transition-all"
      aria-label="返回"
    >
      <ArrowLeft className="h-5 w-5" />
    </Button>
  )
}

