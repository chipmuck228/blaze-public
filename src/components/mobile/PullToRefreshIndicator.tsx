'use client'

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PullToRefreshIndicatorProps {
  pullProgress: number // 0-1
  isRefreshing: boolean
}

export function PullToRefreshIndicator({
  pullProgress,
  isRefreshing,
}: PullToRefreshIndicatorProps) {
  if (pullProgress === 0 && !isRefreshing) {
    return null
  }

  const opacity = Math.min(pullProgress, 1)
  const scale = Math.min(pullProgress, 1)

  return (
    <div
      className="absolute top-0 left-0 right-0 flex items-center justify-center pointer-events-none"
      style={{
        transform: `translateY(${(pullProgress - 1) * 60}px)`,
        opacity,
      }}
    >
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 p-4",
          "bg-background/95 backdrop-blur-sm rounded-full shadow-lg"
        )}
        style={{
          transform: `scale(${scale})`,
        }}
      >
        {isRefreshing ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        ) : (
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        )}
        <span className="text-xs text-muted-foreground">
          {isRefreshing ? 'Refreshing...' : 'Pull to refresh'}
        </span>
      </div>
    </div>
  )
}

