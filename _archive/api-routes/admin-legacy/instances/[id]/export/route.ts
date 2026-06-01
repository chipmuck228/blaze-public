import { NextResponse } from "next/server"
import { auth } from "@/auth"
import ical from "ical-generator"
import { formatInTimeZone, toZonedTime } from "date-fns-tz"
import { rrulestr } from "rrule"
import { supabaseAdmin } from "@/lib/supabase"
import type { CourseInstance } from "@/lib/db"

// 获取单个实例并生成 iCalendar
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 获取实例及其关联数据
    const { data: instance, error: instanceError } = await supabaseAdmin
      .from("course_instances")
      .select(`
        *,
        assignment:course_assignments(
          course:courses(name),
          category:course_categories(display_name),
          series:course_series(display_name),
          location:course_locations(name, address, city, state)
        )
      `)
      .eq("id", id)
      .single()

    if (instanceError || !instance) {
      return NextResponse.json({ error: "Instance not found" }, { status: 404 })
    }

    const courseInstance = instance as any
    const assignment = courseInstance.assignment
    const courseName = assignment?.course?.name || "Course"
    const location = assignment?.location || courseInstance.location

    // 生成 iCalendar
    const calendar = ical({
      name: `${courseName} - Course Schedule`,
      timezone: courseInstance.timezone || "America/Los_Angeles",
    })

    const timezone = courseInstance.timezone || "America/Los_Angeles"

    // 解析开始和结束时间
    const startDateTime = parseDateTime(
      courseInstance.start_date,
      courseInstance.start_time,
      timezone
    )
    const endDateTime = parseDateTime(
      courseInstance.end_date,
      courseInstance.end_time || courseInstance.start_time,
      timezone
    )

    // 创建事件
    const event = calendar.createEvent({
      start: startDateTime,
      end: endDateTime,
      summary: courseName,
      description: courseInstance.notes || "",
      location: formatLocation(location),
      timezone: timezone,
    })

    // 添加 RRULE
    if (courseInstance.icalendar_rrule) {
      try {
        const rule = rrulestr(courseInstance.icalendar_rrule)
        const options = rule.options

        // 构建重复规则 - ical-generator 使用数字常量
        const repeating: any = {
          freq: options.freq === 2 ? 2 : undefined, // 2 = WEEKLY
        }

        if (options.byweekday && options.byweekday.length > 0) {
          // ical-generator 使用 0-6 表示周日到周六
          repeating.byDay = options.byweekday
            .map((day: any) => {
              const dayNum = typeof day === 'number' ? day : (day.weekday !== undefined ? day.weekday : day)
              return dayNum >= 0 && dayNum <= 6 ? dayNum : undefined
            })
            .filter((day: any): day is number => day !== undefined && day >= 0 && day <= 6)
        }

        if (options.until) {
          repeating.until = options.until
        }

        if (repeating.freq !== undefined) {
          event.repeating(repeating)
        }
      } catch (error) {
        console.error("Error parsing RRULE:", error)
      }
    }

    // 添加额外日期 (RDATE) - 改期（创建单独的事件）
    if (courseInstance.icalendar_rdates && courseInstance.icalendar_rdates.length > 0) {
      const duration = endDateTime.getTime() - startDateTime.getTime()
      courseInstance.icalendar_rdates.forEach((dateTimeStr: string) => {
        const rDate = parseICalDateTime(dateTimeStr, timezone)
        if (rDate) {
          // 创建额外的事件实例（改期）
          calendar.createEvent({
            start: rDate,
            end: new Date(rDate.getTime() + duration),
            summary: `${courseName} (Rescheduled)`,
            description: courseInstance.notes || "",
            location: formatLocation(location),
            timezone: timezone,
          })
        }
      })
    }

    // 生成 iCalendar 字符串
    let icalString = calendar.toString()

    // 手动添加 EXDATE（如果 ical-generator 不支持）
    if (courseInstance.icalendar_exdates && courseInstance.icalendar_exdates.length > 0) {
      // 在事件中添加 EXDATE 属性
      const exdateLines = courseInstance.icalendar_exdates
        .map((dateStr: string) => {
          // 确保格式正确 (YYYYMMDD)
          return `EXDATE:${dateStr}`
        })
        .join('\r\n')

      // 在事件的 END:VEVENT 之前插入 EXDATE
      icalString = icalString.replace(
        /(END:VEVENT)/g,
        `${exdateLines}\r\n$1`
      )
    }

    return new NextResponse(icalString, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="course-${id}.ics"`,
      },
    })
  } catch (error: any) {
    console.error("Error exporting iCalendar:", error)
    return NextResponse.json(
      { error: error.message || "Failed to export iCalendar" },
      { status: 500 }
    )
  }
}

// 辅助函数：解析日期时间
function parseDateTime(
  date: string,
  time?: string,
  timezone: string = "America/Los_Angeles"
): Date {
  const d = new Date(date)
  if (time) {
    const [hours, minutes] = time.split(":").map(Number)
    d.setHours(hours, minutes || 0, 0, 0)
  }
  return toZonedTime(d, timezone)
}

// 辅助函数：解析 iCalendar 日期格式 (YYYYMMDD)
function parseICalDate(dateStr: string): Date | null {
  try {
    const year = parseInt(dateStr.substring(0, 4))
    const month = parseInt(dateStr.substring(4, 6)) - 1
    const day = parseInt(dateStr.substring(6, 8))
    return new Date(year, month, day)
  } catch {
    return null
  }
}

// 辅助函数：解析 iCalendar 日期时间格式 (YYYYMMDDTHHMMSS)
function parseICalDateTime(dateTimeStr: string, timezone: string = "America/Los_Angeles"): Date | null {
  try {
    const year = parseInt(dateTimeStr.substring(0, 4))
    const month = parseInt(dateTimeStr.substring(4, 6)) - 1
    const day = parseInt(dateTimeStr.substring(6, 8))
    const hours = dateTimeStr.length > 8 ? parseInt(dateTimeStr.substring(9, 11)) : 0
    const minutes = dateTimeStr.length > 10 ? parseInt(dateTimeStr.substring(11, 13)) : 0
    
    const date = new Date(year, month, day, hours, minutes)
    return toZonedTime(date, timezone)
  } catch {
    return null
  }
}

// 辅助函数：格式化地点
function formatLocation(location: any): string {
  if (!location) return ""
  const parts = [location.name]
  if (location.address) parts.push(location.address)
  if (location.city) parts.push(location.city)
  if (location.state) parts.push(location.state)
  return parts.join(", ")
}

