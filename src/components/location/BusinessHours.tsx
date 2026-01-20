'use client'

import { Clock } from "lucide-react"

interface BusinessHoursProps {
  businessHours?: {
    monday?: string
    tuesday?: string
    wednesday?: string
    thursday?: string
    friday?: string
    saturday?: string
    sunday?: string
  } | null
}

const dayLabels: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

export function BusinessHours({ businessHours }: BusinessHoursProps) {
  if (!businessHours) {
    return null
  }

  // 检查是否有任何营业时间数据
  const hasAnyHours = dayOrder.some(day => businessHours[day as keyof typeof businessHours])
  
  if (!hasAnyHours) {
    return null
  }

  // 获取当前日期
  const today = new Date().getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const currentDayIndex = today === 0 ? 6 : today - 1 // 转换为我们的顺序：Monday = 0, Sunday = 6
  const currentDay = dayOrder[currentDayIndex]

  return (
    <div className="relative">
      {/* Modern Card Container */}
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-background to-muted/20 shadow-sm hover:shadow-md transition-all duration-300">
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-foreground">Business Hours</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Open today until closing</p>
            </div>
          </div>

          {/* Hours List */}
          <div className="space-y-1.5">
            {dayOrder.map((day, index) => {
              const hours = businessHours[day as keyof typeof businessHours]
              if (!hours) return null
              
              const isToday = day === currentDay
              const isClosed = hours.toLowerCase().includes('closed') || hours.toLowerCase().includes('close')
              
              return (
                <div
                  key={day}
                  className={`
                    group relative flex items-center justify-between gap-4 px-3 py-2.5 rounded-lg
                    transition-all duration-200
                    ${isToday 
                      ? 'bg-primary/10 border border-primary/20 shadow-sm' 
                      : 'hover:bg-muted/50 border border-transparent'
                    }
                  `}
                >
                  {/* Day label */}
                  <div className="flex items-center gap-2.5 min-w-[110px]">
                    {isToday && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    )}
                    <dt className={`font-medium text-sm ${isToday ? 'text-primary' : 'text-foreground'}`}>
                      {dayLabels[day]}
                      {isToday && (
                        <span className="ml-2 text-xs font-normal text-primary/70">Today</span>
                      )}
                    </dt>
                  </div>
                  
                  {/* Hours */}
                  <dd className={`
                    text-sm font-medium text-right flex-1
                    ${isClosed 
                      ? 'text-muted-foreground' 
                      : isToday 
                        ? 'text-primary' 
                        : 'text-foreground'
                    }
                  `}>
                    {hours || 'Closed'}
                  </dd>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
