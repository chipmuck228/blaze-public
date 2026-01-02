'use client'

import { usePlatform } from '@/hooks/usePlatform'
import { AppBottomNavigation } from '@/components/mobile/AppBottomNavigation'
import { MobileBackButton } from '@/components/mobile/MobileBackButton'

export function MobileLayout({ children }: { children: React.ReactNode }) {
  const { isNative, isReady } = usePlatform()

  // 等待平台检测完成，避免 SSR hydration mismatch
  if (!isReady) {
    // 服务器端和客户端初始渲染保持一致
    return <>{children}</>
  }

  // 仅在移动端显示移动端布局
  if (!isNative) {
    return <>{children}</>
  }

  return (
    <div className="flex flex-col h-screen">
      <main 
        ref={(el) => {
          // 用于下拉刷新的 ref 会通过 usePullToRefresh 设置
        }}
        className="flex-1 overflow-y-auto pb-16 relative"
        style={{ 
          paddingTop: 'env(safe-area-inset-top, 0px)' // 仅保留安全区域
        }}
      >
        {/* 返回按钮 - 固定在页面左上角 */}
        <div className="fixed top-10 left-10 z-50" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <MobileBackButton />
        </div>
        {children}
      </main>
      <AppBottomNavigation />
    </div>
  )
}

