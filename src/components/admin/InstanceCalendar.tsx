'use client'

import { useMemo, useState } from 'react'
import { getActualClassDates } from '@/lib/icalendar'
import type { CourseInstance } from '@/lib/db'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'

interface InstanceCalendarProps {
  instance: CourseInstance
  className?: string
}

export function InstanceCalendar({ instance, className }: InstanceCalendarProps) {
  // 计算实际开课日期
  const classDates = useMemo(() => {
    try {
      return getActualClassDates(instance)
    } catch (error) {
      console.error('Error calculating class dates:', error)
      return [new Date(instance.start_date)]
    }
  }, [instance])

  // 辅助函数：比较日期（只比较年月日）
  const isSameDate = (date1: Date, date2: Date): boolean => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate()
  }

  // 解析 skip dates (exdates)
  const skipDates = useMemo(() => {
    if (!instance.icalendar_exdates || instance.icalendar_exdates.length === 0) {
      return []
    }
    
    return instance.icalendar_exdates.map(dateStr => {
      // 解析 YYYYMMDD 格式
      const year = parseInt(dateStr.substring(0, 4))
      const month = parseInt(dateStr.substring(4, 6)) - 1
      const day = parseInt(dateStr.substring(6, 8))
      // 设置为中午，避免时区问题
      return new Date(year, month, day, 12, 0, 0)
    })
  }, [instance.icalendar_exdates])

  // 解析 rescheduled dates (rdates)
  const rescheduledDates = useMemo(() => {
    if (!instance.icalendar_rdates || instance.icalendar_rdates.length === 0) {
      return []
    }
    
    return instance.icalendar_rdates.map(dateTimeStr => {
      // 解析 YYYYMMDDTHHMMSS 格式
      const year = parseInt(dateTimeStr.substring(0, 4))
      const month = parseInt(dateTimeStr.substring(4, 6)) - 1
      const day = parseInt(dateTimeStr.substring(6, 8))
      const hours = dateTimeStr.length > 8 ? parseInt(dateTimeStr.substring(9, 11)) : 12
      const minutes = dateTimeStr.length > 10 ? parseInt(dateTimeStr.substring(11, 13)) : 0
      return new Date(year, month, day, hours, minutes)
    })
  }, [instance.icalendar_rdates])

  // 获取所有需要显示的日期（包括 skip dates 和 rescheduled dates）
  const allDisplayDates = useMemo(() => {
    const datesMap = new Map<string, Date>()
    
    // 添加实际开课日期
    classDates.forEach(date => {
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
      datesMap.set(dateKey, date)
    })
    
    // 添加 skip dates（在日期范围内）
    const startDate = new Date(instance.start_date)
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date(instance.end_date)
    endDate.setHours(23, 59, 59, 999)
    
    skipDates.forEach(date => {
      if (date >= startDate && date <= endDate) {
        const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
        if (!datesMap.has(dateKey)) {
          datesMap.set(dateKey, date)
        }
      }
    })
    
    // 添加 rescheduled dates
    rescheduledDates.forEach(date => {
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
      datesMap.set(dateKey, date)
    })
    
    return Array.from(datesMap.values()).sort((a, b) => a.getTime() - b.getTime())
  }, [classDates, skipDates, rescheduledDates, instance.start_date, instance.end_date])

  // 计算所有需要显示的月份（从 start_date 到 end_date）
  const allMonths = useMemo(() => {
    const months: Array<{ year: number; month: number; monthName: string }> = []
    const startDate = new Date(instance.start_date)
    const endDate = new Date(instance.end_date)
    
    // 设置时间为月初，避免时区问题
    startDate.setDate(1)
    startDate.setHours(12, 0, 0, 0)
    endDate.setDate(1)
    endDate.setHours(12, 0, 0, 0)
    
    const current = new Date(startDate)
    while (current <= endDate) {
      months.push({
        year: current.getFullYear(),
        month: current.getMonth(),
        monthName: current.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
      })
      // 移动到下一个月
      current.setMonth(current.getMonth() + 1)
    }
    
    return months
  }, [instance.start_date, instance.end_date])

  // 当前显示的月份索引（初始化为第一个月份）
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0)

  // 导航到上一个月份
  const goToPreviousMonth = () => {
    setCurrentMonthIndex(prev => Math.max(0, prev - 1))
  }

  // 导航到下一个月份
  const goToNextMonth = () => {
    setCurrentMonthIndex(prev => Math.min(allMonths.length - 1, prev + 1))
  }

  // 格式化日期
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // 格式化时间（用于 tooltip）
  const formatTime = (time?: string) => {
    if (!time) return ''
    return time
  }

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Class Schedule</h3>
        </div>

        {/* Summary */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Total Classes:</span>
          <Badge variant="secondary">{classDates.length}</Badge>
        </div>

        {/* Calendar View for Upcoming Classes */}
        {allMonths.length > 0 ? (
          <div className="space-y-4 border-t pt-4">
            {/* Month Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={goToPreviousMonth}
                disabled={currentMonthIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h5 className="text-base font-semibold text-foreground">
                {allMonths[currentMonthIndex].monthName}
              </h5>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={goToNextMonth}
                disabled={currentMonthIndex === allMonths.length - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            {(() => {
              const currentMonth = allMonths[currentMonthIndex]
              const year = currentMonth.year
              const monthIndex = currentMonth.month
              
              // Get first day of month and number of days
              const firstDayOfMonth = new Date(year, monthIndex, 1)
              const lastDayOfMonth = new Date(year, monthIndex + 1, 0)
              const startDay = firstDayOfMonth.getDay() // 0 = Sunday
              const daysInMonth = lastDayOfMonth.getDate()
              
              // Create array of all dates in month
              const monthDates: (Date | null)[] = []
              for (let i = 0; i < startDay; i++) {
                monthDates.push(null)
              }
              for (let day = 1; day <= daysInMonth; day++) {
                monthDates.push(new Date(year, monthIndex, day))
              }
              
              return (
                <div className="border rounded-lg p-3 bg-background">
                  {/* Day headers */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div
                        key={day}
                        className="text-xs text-center text-muted-foreground font-semibold py-1"
                      >
                        {day}
                      </div>
                    ))}
                  </div>
                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {monthDates.map((date, idx) => {
                      if (!date) {
                        return <div key={`empty-${idx}`} className="h-9" />
                      }
                      
                      // 使用日期比较而不是字符串比较，避免时区问题
                      const isClassDate = classDates.some(d => isSameDate(d, date))
                      const isSkipDate = skipDates.some(d => isSameDate(d, date))
                      const isRescheduled = rescheduledDates.some(d => isSameDate(d, date))
                      
                      const isToday = 
                        date.getDate() === new Date().getDate() &&
                        date.getMonth() === new Date().getMonth() &&
                        date.getFullYear() === new Date().getFullYear()
                      
                      // 构建 title
                      let title = formatDate(date)
                      if (isClassDate) {
                        title += ` - Class Day${instance.start_time ? ` at ${formatTime(instance.start_time)}` : ''}`
                      } else if (isSkipDate) {
                        title += ' - Skipped'
                      } else if (isRescheduled) {
                        title += ' - Rescheduled'
                      }
                      
                      return (
                        <div
                          key={idx}
                          className={`h-9 flex flex-col items-center justify-center text-xs rounded-md transition-all cursor-default relative ${
                            isClassDate
                              ? isToday
                                ? 'bg-primary text-primary-foreground font-bold ring-2 ring-primary ring-offset-1 shadow-sm'
                                : 'bg-primary text-primary-foreground font-semibold hover:bg-primary/90'
                              : isSkipDate
                              ? isToday
                                ? 'bg-destructive/20 text-destructive font-medium ring-1 ring-destructive line-through'
                                : 'bg-destructive/10 text-destructive/70 font-medium line-through'
                              : isRescheduled
                              ? isToday
                                ? 'bg-blue-500/20 text-blue-700 font-medium ring-1 ring-blue-500'
                                : 'bg-blue-500/10 text-blue-600 font-medium'
                              : isToday
                              ? 'bg-accent font-medium ring-1 ring-border'
                              : 'text-muted-foreground hover:bg-muted/50'
                          }`}
                          title={title}
                        >
                          <span className="leading-none">{date.getDate()}</span>
                          {isClassDate && !isSkipDate && (
                            <span className="text-[6px] leading-none mt-0.5 opacity-80">●</span>
                          )}
                          {isSkipDate && (
                            <span className="absolute top-0.5 right-0.5 text-[8px] text-destructive">✕</span>
                          )}
                          {isRescheduled && !isClassDate && (
                            <span className="text-[6px] leading-none mt-0.5 opacity-80 text-blue-600">↻</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {/* Legend */}
                  <div className="flex items-center justify-center flex-wrap gap-3 mt-3 pt-3 border-t text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-md bg-primary"></div>
                      <span className="text-muted-foreground">Class Day</span>
                    </div>
                    {skipDates.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-md bg-destructive/10 border border-destructive/30"></div>
                        <span className="text-muted-foreground line-through">Skipped</span>
                      </div>
                    )}
                    {rescheduledDates.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-md bg-blue-500/10 border border-blue-500/30"></div>
                        <span className="text-muted-foreground">Rescheduled</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-md bg-accent ring-1 ring-border"></div>
                      <span className="text-muted-foreground">Today</span>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        ) : (
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground text-center py-4">
              No class dates scheduled
            </p>
          </div>
        )}

        {/* Exception Dates Info */}
        {(instance.icalendar_exdates?.length || instance.icalendar_rdates?.length) && (
          <div className="space-y-1 border-t pt-4 text-xs text-muted-foreground">
            {instance.icalendar_exdates && instance.icalendar_exdates.length > 0 && (
              <div>
                <span className="font-medium">Skipped dates:</span> {instance.icalendar_exdates.length}
              </div>
            )}
            {instance.icalendar_rdates && instance.icalendar_rdates.length > 0 && (
              <div>
                <span className="font-medium">Rescheduled dates:</span> {instance.icalendar_rdates.length}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

