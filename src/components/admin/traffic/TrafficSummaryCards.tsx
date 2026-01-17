'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TrafficSummaryCardsProps {
  data: {
    visits: { total: number; mom_change: number; mom_change_type: string }
    bounce_rate: { value: number; mom_change: number; mom_change_type: string }
    unique_visitors: { total: number; mom_change: number; mom_change_type: string }
    pageviews: { total: number; mom_change: number; mom_change_type: string }
  }
}

export function TrafficSummaryCards({ data }: TrafficSummaryCardsProps) {
  // 添加调试日志
  console.log('[TrafficSummaryCards] Rendering with data:', {
    visits: data.visits.total,
    pageviews: data.pageviews.total,
    unique_visitors: data.unique_visitors.total,
    bounce_rate: data.bounce_rate.value,
  })

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }

  const cards = [
    {
      title: 'VISITS',
      value: formatNumber(data.visits.total),
      change: data.visits.mom_change,
      changeType: data.visits.mom_change_type,
    },
    {
      title: 'BOUNCE RATE',
      value: `${data.bounce_rate.value.toFixed(2)}%`,
      change: data.bounce_rate.mom_change,
      changeType: data.bounce_rate.mom_change_type,
    },
    {
      title: 'UNIQUE VISITORS',
      value: formatNumber(data.unique_visitors.total),
      change: data.unique_visitors.mom_change,
      changeType: data.unique_visitors.mom_change_type,
    },
    {
      title: 'PAGEVIEWS',
      value: formatNumber(data.pageviews.total),
      change: data.pageviews.mom_change,
      changeType: data.pageviews.mom_change_type,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card
          key={card.title}
          className="transition-all duration-200 hover:shadow-md hover:border-primary/20"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">{card.value}</div>
            <div
              className={cn(
                'flex items-center gap-1 text-sm',
                card.changeType === 'increase'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-green-600 dark:text-green-400'
              )}
            >
              {card.changeType === 'increase' ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span className="font-medium">
                {card.change > 0 ? '+' : ''}
                {card.change}% mo/mo
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
