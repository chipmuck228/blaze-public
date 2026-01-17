'use client'

import { BarChart3 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface EmptyStateProps {
  title?: string
  description?: string
}

export function EmptyState({
  title = 'No data available',
  description = 'There is no traffic data for the selected time range.',
}: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          {description}
        </p>
      </CardContent>
    </Card>
  )
}
