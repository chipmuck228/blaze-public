'use client'

import { Clock } from "lucide-react"
import { useMemo } from "react"

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

// 获取美国常见节假日列表（固定日期和计算日期）
function getUSHolidays(year: number): Date[] {
  const holidays: Date[] = []
  
  // 固定日期的节假日
  holidays.push(new Date(year, 0, 1))   // New Year's Day
  holidays.push(new Date(year, 6, 4))   // Independence Day
  holidays.push(new Date(year, 10, 11)) // Veterans Day
  holidays.push(new Date(year, 11, 25)) // Christmas Day
  
  // 计算日期的节假日
  // Martin Luther King Jr. Day - 1月第三个星期一
  const mlkDay = getNthWeekday(year, 0, 1, 3) // 1月，星期一，第3个
  holidays.push(mlkDay)
  
  // Presidents' Day - 2月第三个星期一
  const presidentsDay = getNthWeekday(year, 1, 1, 3) // 2月，星期一，第3个
  holidays.push(presidentsDay)
  
  // Memorial Day - 5月最后一个星期一
  const memorialDay = getLastWeekday(year, 4, 1) // 5月，星期一
  holidays.push(memorialDay)
  
  // Labor Day - 9月第一个星期一
  const laborDay = getNthWeekday(year, 8, 1, 1) // 9月，星期一，第1个
  holidays.push(laborDay)
  
  // Thanksgiving - 11月第四个星期四
  const thanksgiving = getNthWeekday(year, 10, 4, 4) // 11月，星期四，第4个
  holidays.push(thanksgiving)
  
  return holidays
}

// 获取指定月份的第N个星期X
function getNthWeekday(year: number, month: number, weekday: number, n: number): Date {
  const firstDay = new Date(year, month, 1)
  const firstWeekday = firstDay.getDay()
  const offset = (weekday - firstWeekday + 7) % 7
  const day = 1 + offset + (n - 1) * 7
  return new Date(year, month, day)
}

// 获取指定月份的最后一个星期X
function getLastWeekday(year: number, month: number, weekday: number): Date {
  const lastDay = new Date(year, month + 1, 0) // 下个月的第0天 = 这个月的最后一天
  const lastWeekday = lastDay.getDay()
  const offset = (lastWeekday - weekday + 7) % 7
  const day = lastDay.getDate() - offset
  return new Date(year, month, day)
}

// 检查日期是否是节假日
function isHoliday(date: Date): boolean {
  const year = date.getFullYear()
  const holidays = getUSHolidays(year)
  
  return holidays.some(holiday => {
    return holiday.getFullYear() === date.getFullYear() &&
           holiday.getMonth() === date.getMonth() &&
           holiday.getDate() === date.getDate()
  })
}

// 获取本周的日期列表（周一到周日）
function getWeekDates(): Date[] {
  const today = new Date()
  const currentDay = today.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay // 计算到本周一的偏移
  
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset)
  monday.setHours(0, 0, 0, 0)
  
  const weekDates: Date[] = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    weekDates.push(date)
  }
  
  return weekDates
}

function BusinessHoursContent({ businessHours }: { businessHours: NonNullable<BusinessHoursProps['businessHours']> }) {
  // 获取本周的日期列表
  const weekDates = useMemo(() => getWeekDates(), [])
  
  // 创建日期到星期几的映射
  const dateToDayMap = useMemo(() => {
    const map = new Map<string, string>()
    weekDates.forEach((date, index) => {
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      map.set(dateKey, dayOrder[index])
    })
    return map
  }, [weekDates])

  // 获取当前日期
  const today = new Date().getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const currentDayIndex = today === 0 ? 6 : today - 1 // 转换为我们的顺序：Monday = 0, Sunday = 6
  const currentDay = dayOrder[currentDayIndex]
  
  // 检查每一天是否是节假日
  const isHolidayDay = useMemo(() => {
    const holidayMap = new Map<string, boolean>()
    weekDates.forEach((date, index) => {
      const day = dayOrder[index]
      holidayMap.set(day, isHoliday(date))
    })
    return holidayMap
  }, [weekDates])

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
              const isHoliday = isHolidayDay.get(day) || false
              const isClosed = isHoliday || hours.toLowerCase().includes('closed') || hours.toLowerCase().includes('close')
              const displayHours = isHoliday ? 'Closed' : (hours || 'Closed')
              
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
                      {isHoliday && !isToday && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">Holiday</span>
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
                    {displayHours}
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

export function BusinessHours({ businessHours }: BusinessHoursProps) {
  if (!businessHours) {
    return null
  }

  const hasAnyHours = dayOrder.some(
    (day) => businessHours[day as keyof typeof businessHours]
  )

  if (!hasAnyHours) {
    return null
  }

  return <BusinessHoursContent businessHours={businessHours} />
}
