import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getCoachInstanceById } from "@/lib/db"
import ical from "ical-generator"
import { rrulestr } from "rrule"
import { formatInTimeZone, toZonedTime } from "date-fns-tz"

// 复用 admin 版本的辅助函数
function parseDateTime(dateStr: string, timeStr: string | undefined, timezone: string): Date {
  const date = new Date(dateStr)
  if (timeStr) {
    const [hours, minutes] = timeStr.split(":").map(Number)
    date.setHours(hours, minutes || 0, 0, 0)
  } else {
    date.setHours(12, 0, 0, 0) // 默认中午
  }
  return toZonedTime(date, timezone)
}

function parseICalDateTime(dateTimeStr: string, timezone: string): Date | null {
  try {
    // 格式: YYYYMMDDTHHMMSS
    const year = parseInt(dateTimeStr.substring(0, 4))
    const month = parseInt(dateTimeStr.substring(4, 6)) - 1
    const day = parseInt(dateTimeStr.substring(6, 8))
    const hours = dateTimeStr.length > 8 ? parseInt(dateTimeStr.substring(9, 11)) : 12
    const minutes = dateTimeStr.length > 10 ? parseInt(dateTimeStr.substring(11, 13)) : 0
    const date = new Date(year, month, day, hours, minutes)
    return toZonedTime(date, timezone)
  } catch {
    return null
  }
}

function formatLocation(location: any): string {
  if (!location) return ""
  const parts = [
    location.name,
    location.address,
    location.city,
    location.state,
  ].filter(Boolean)
  return parts.join(", ")
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user || session.user.role !== "coach") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // 验证教练是否有权限访问该实例
    const instance = await getCoachInstanceById(session.user.id, id)

    if (!instance) {
      return NextResponse.json(
        { error: "Instance not found or access denied" },
        { status: 404 }
      )
    }

    const courseName = instance.assignment?.course?.name || "Course"
    const location = instance.location || instance.assignment?.location
    const timezone = instance.timezone || "America/Los_Angeles"

    // 生成 iCalendar
    const calendar = ical({
      name: `${courseName} - Course Schedule`,
      timezone: timezone,
    })

    // 解析开始和结束时间
    const startDateTime = parseDateTime(
      instance.start_date,
      instance.start_time,
      timezone
    )
    const endDateTime = parseDateTime(
      instance.end_date,
      instance.end_time || instance.start_time,
      timezone
    )

    // 创建事件
    const event = calendar.createEvent({
      start: startDateTime,
      end: endDateTime,
      summary: courseName,
      description: instance.notes || instance.assignment?.course?.description || "",
      location: formatLocation(location),
      timezone: timezone,
      url: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/coach/classes/${instance.id}`,
    })

    // 添加 RRULE
    if (instance.icalendar_rrule) {
      try {
        const rule = rrulestr(instance.icalendar_rrule)
        const options = rule.options

        const repeating: any = {
          freq: options.freq === 2 ? 2 : undefined, // 2 = WEEKLY
        }

        if (options.byweekday && options.byweekday.length > 0) {
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

    // 添加额外日期 (RDATE) - 改期
    if (instance.icalendar_rdates && instance.icalendar_rdates.length > 0) {
      const duration = endDateTime.getTime() - startDateTime.getTime()
      instance.icalendar_rdates.forEach((dateTimeStr: string) => {
        const rDate = parseICalDateTime(dateTimeStr, timezone)
        if (rDate) {
          calendar.createEvent({
            start: rDate,
            end: new Date(rDate.getTime() + duration),
            summary: `${courseName} (Rescheduled)`,
            description: instance.notes || "",
            location: formatLocation(location),
            timezone: timezone,
          })
        }
      })
    }

    // 生成 iCalendar 字符串
    let icalString = calendar.toString()

    // 手动添加 EXDATE（排除日期）
    if (instance.icalendar_exdates && instance.icalendar_exdates.length > 0) {
      const exdateLines = instance.icalendar_exdates.map((exdateStr) => {
        // 格式: YYYYMMDD
        const year = exdateStr.substring(0, 4)
        const month = exdateStr.substring(4, 6)
        const day = exdateStr.substring(6, 8)
        return `EXDATE:${year}${month}${day}`
      })
      // 在最后一个事件后插入 EXDATE
      icalString = icalString.replace(
        /(END:VEVENT)/,
        `${exdateLines.join("\r\n")}\r\n$1`
      )
    }

    // 返回 iCalendar 文件
    return new NextResponse(icalString, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="course-instance-${instance.id}.ics"`,
      },
    })
  } catch (error: any) {
    console.error("Error exporting calendar:", error)
    return NextResponse.json(
      { error: error.message || "Failed to export calendar" },
      { status: 500 }
    )
  }
}

