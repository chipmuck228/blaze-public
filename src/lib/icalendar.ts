/**
 * iCalendar (RFC5545) 工具函数库
 * 用于处理课程实例的重复规则和例外日期
 */

import { RRule, rrulestr } from 'rrule'
import { formatInTimeZone, toZonedTime } from 'date-fns-tz'
import type { CourseInstance } from './db'

// 星期几映射：days_of_week [1,3,5] -> RRULE BYDAY ['MO','WE','FR']
const DAY_TO_RRULE: Record<number, string> = {
  0: 'SU', 1: 'MO', 2: 'TU', 3: 'WE', 4: 'TH', 5: 'FR', 6: 'SA'
}

const RRULE_TO_DAY: Record<string, number> = {
  'SU': 0, 'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6
}

/**
 * 从现有字段生成 RRULE 字符串
 */
export function generateRRULE(
  startDate: string,
  endDate: string,
  daysOfWeek?: number[],
  startTime?: string,
  timezone: string = 'America/Los_Angeles'
): string | undefined {
  // 如果没有指定星期几，返回 undefined（单次事件）
  if (!daysOfWeek || daysOfWeek.length === 0) {
    return undefined
  }

  // 将 daysOfWeek 转换为 RRULE 的 BYDAY
  const byDay = daysOfWeek
    .sort((a, b) => a - b)
    .map(day => DAY_TO_RRULE[day])
    .join(',')

  // 计算 UNTIL 日期（endDate 的结束时间）
  const untilDate = new Date(endDate)
  untilDate.setHours(23, 59, 59, 999)

  // 格式化 UNTIL 为 UTC 时间（RRULE 要求）
  const untilStr = formatInTimeZone(untilDate, 'UTC', "yyyyMMdd'T'HHmmss'Z'")

  return `FREQ=WEEKLY;BYDAY=${byDay};UNTIL=${untilStr}`
}

/**
 * 格式化日期为 iCalendar 日期格式 (YYYYMMDD)
 */
export function formatICalDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return formatInTimeZone(d, 'UTC', 'yyyyMMdd')
}

/**
 * 格式化日期时间为 iCalendar 日期时间格式 (YYYYMMDDTHHMMSS)
 */
export function formatICalDateTime(
  date: string | Date,
  time?: string,
  timezone: string = 'America/Los_Angeles'
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  if (time) {
    // 解析时间字符串 (HH:mm)
    const [hours, minutes] = time.split(':').map(Number)
    d.setHours(hours, minutes || 0, 0, 0)
  }

  // 转换为指定时区
  const zonedDate = toZonedTime(d, timezone)
  return formatInTimeZone(zonedDate, timezone, "yyyyMMdd'T'HHmmss")
}

/**
 * 解析 RRULE 字符串，提取星期几
 */
export function parseRRULEToDaysOfWeek(rrule?: string): number[] | undefined {
  if (!rrule) return undefined

  try {
    const rule = rrulestr(rrule)
    const byDay = rule.options.byweekday
    
    if (!byDay || byDay.length === 0) {
      return undefined
    }

    // 将 RRULE 的星期几转换为数字数组
    return byDay
      .map(day => {
        const dayStr = day.toString()
        return RRULE_TO_DAY[dayStr] ?? undefined
      })
      .filter((day): day is number => day !== undefined)
      .sort((a, b) => a - b)
  } catch (error) {
    console.error('Error parsing RRULE:', error)
    return undefined
  }
}

/**
 * 添加排除日期（跳过某个日期）
 */
export function addExceptionDate(
  instance: CourseInstance,
  dateToSkip: string,
  reason?: string
): CourseInstance {
  const exdates = instance.icalendar_exdates || []
  const dateStr = formatICalDate(dateToSkip)
  
  if (!exdates.includes(dateStr)) {
    exdates.push(dateStr)
  }

  return {
    ...instance,
    icalendar_exdates: exdates
  }
}

/**
 * 添加改期日期（将原日期改到新日期）
 */
export function addRescheduleDate(
  instance: CourseInstance,
  originalDate: string,
  newDate: string,
  newStartTime?: string,
  newEndTime?: string,
  reason?: string
): CourseInstance {
  // 1. 将原日期添加到 EXDATE（排除）
  const exdates = instance.icalendar_exdates || []
  const originalDateStr = formatICalDate(originalDate)
  if (!exdates.includes(originalDateStr)) {
    exdates.push(originalDateStr)
  }

  // 2. 将新日期添加到 RDATE（额外日期）
  const rdates = instance.icalendar_rdates || []
  const rdateValue = formatICalDateTime(
    newDate,
    newStartTime || instance.start_time,
    instance.timezone || 'America/Los_Angeles'
  )
  if (!rdates.includes(rdateValue)) {
    rdates.push(rdateValue)
  }

  return {
    ...instance,
    icalendar_exdates: exdates,
    icalendar_rdates: rdates
  }
}

/**
 * 移除例外日期
 */
export function removeExceptionDate(
  instance: CourseInstance,
  date: string
): CourseInstance {
  const dateStr = formatICalDate(date)
  
  return {
    ...instance,
    icalendar_exdates: (instance.icalendar_exdates || []).filter(d => d !== dateStr),
    icalendar_rdates: (instance.icalendar_rdates || []).filter(d => !d.startsWith(dateStr))
  }
}

/**
 * 计算实际开课日期列表
 */
export function getActualClassDates(instance: CourseInstance): Date[] {
  const dates: Date[] = []
  const timezone = instance.timezone || 'America/Los_Angeles'

  // 辅助函数：创建本地日期（避免时区问题）
  const createLocalDate = (dateStr: string): Date => {
    // 如果 dateStr 是 YYYY-MM-DD 格式
    if (dateStr.includes('-')) {
      const [year, month, day] = dateStr.split('-').map(Number)
      return new Date(year, month - 1, day)
    }
    // 如果 dateStr 是 YYYYMMDD 格式
    if (dateStr.length === 8) {
      const year = parseInt(dateStr.substring(0, 4))
      const month = parseInt(dateStr.substring(4, 6)) - 1
      const day = parseInt(dateStr.substring(6, 8))
      return new Date(year, month, day)
    }
    // 默认使用 Date 构造函数
    return new Date(dateStr)
  }

  // 辅助函数：比较日期（只比较年月日，忽略时间）
  const isSameDate = (date1: Date, date2: Date): boolean => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate()
  }

  // 1. 从 RRULE 生成基础日期
  if (instance.icalendar_rrule) {
    try {
      const rule = rrulestr(instance.icalendar_rrule)
      
      // 创建本地日期范围，避免时区问题
      const startDate = createLocalDate(instance.start_date)
      const endDate = createLocalDate(instance.end_date)
      
      // 设置时间为中午，避免时区边界问题
      startDate.setHours(12, 0, 0, 0)
      endDate.setHours(12, 0, 0, 0)
      
      const baseDates = rule.between(startDate, endDate, true)
      
      // 将日期标准化为本地日期（只保留年月日，时间设为中午）
      dates.push(...baseDates.map(date => {
        const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0)
        return localDate
      }))
    } catch (error) {
      console.error('Error parsing RRULE:', error)
      // 如果解析失败，使用 start_date
      const startDate = createLocalDate(instance.start_date)
      startDate.setHours(12, 0, 0, 0)
      dates.push(startDate)
    }
  } else {
    // 如果没有 RRULE，使用 start_date
    const startDate = createLocalDate(instance.start_date)
    startDate.setHours(12, 0, 0, 0)
    dates.push(startDate)
  }

  // 2. 移除排除日期
  if (instance.icalendar_exdates && instance.icalendar_exdates.length > 0) {
    const exdates = instance.icalendar_exdates.map(d => {
      // 解析 YYYYMMDD 格式
      const year = parseInt(d.substring(0, 4))
      const month = parseInt(d.substring(4, 6)) - 1
      const day = parseInt(d.substring(6, 8))
      return new Date(year, month, day, 12, 0, 0)
    })

    const filteredDates = dates.filter(date => {
      return !exdates.some(ex => isSameDate(date, ex))
    })
    dates.length = 0
    dates.push(...filteredDates)
  }

  // 3. 添加额外日期（改期）
  if (instance.icalendar_rdates && instance.icalendar_rdates.length > 0) {
    const rdates = instance.icalendar_rdates.map(d => {
      // 解析 YYYYMMDDTHHMMSS 格式
      const year = parseInt(d.substring(0, 4))
      const month = parseInt(d.substring(4, 6)) - 1
      const day = parseInt(d.substring(6, 8))
      const hours = d.length > 8 ? parseInt(d.substring(9, 11)) : 12
      const minutes = d.length > 10 ? parseInt(d.substring(11, 13)) : 0
      return new Date(year, month, day, hours, minutes)
    })
    dates.push(...rdates)
  }

  // 排序并去重（使用日期比较）
  const uniqueDates: Date[] = []
  const seenDates = new Set<string>()
  
  dates.forEach(date => {
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    if (!seenDates.has(dateKey)) {
      seenDates.add(dateKey)
      uniqueDates.push(date)
    }
  })

  return uniqueDates.sort((a, b) => a.getTime() - b.getTime())
}

/**
 * 在创建/更新 Instance 时自动生成 RRULE
 */
export function autoGenerateRRULE(instance: Partial<CourseInstance>): string | undefined {
  if (!instance.start_date || !instance.end_date) {
    return undefined
  }

  // 如果已经有 RRULE，不覆盖
  if (instance.icalendar_rrule) {
    return instance.icalendar_rrule
  }

  // 从 days_of_week 生成 RRULE
  return generateRRULE(
    instance.start_date,
    instance.end_date,
    instance.days_of_week,
    instance.start_time,
    instance.timezone || 'America/Los_Angeles'
  )
}

/**
 * 验证日期是否在实例的时间范围内
 */
export function isDateInInstanceRange(
  instance: CourseInstance,
  date: string
): boolean {
  const checkDate = new Date(date)
  const startDate = new Date(instance.start_date)
  const endDate = new Date(instance.end_date)
  
  return checkDate >= startDate && checkDate <= endDate
}

