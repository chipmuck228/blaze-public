import { NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  getCourseInstancesByAssignment,
  createCourseInstance,
  getFranchiseByCode,
} from "@/lib/db"
import { supabaseAdmin } from "@/lib/supabase"

// 获取所有课程实例（支持按 assignment 过滤）
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const assignmentId = searchParams.get("assignmentId")
    const franchiseCode = searchParams.get("franchise")

    if (assignmentId) {
      const instances = await getCourseInstancesByAssignment(assignmentId)
      return NextResponse.json(instances, { status: 200 })
    }

    // 如果指定了 franchise，则先解析为 franchise_id
    let franchiseId: string | null = null
    if (franchiseCode) {
      const franchise = await getFranchiseByCode(franchiseCode)
      if (!franchise) {
        return NextResponse.json(
          { error: "Invalid franchise code" },
          { status: 400 }
        )
      }
      franchiseId = franchise.id
    }

    // 获取所有实例（包含 location 和 assignment 信息）
    let query = supabaseAdmin
      .from("course_instances")
      .select(`
        *,
        location:course_locations(
          id,
          name,
          address,
          city,
          state
        ),
        assignment:course_assignments(
          id,
          course:courses(name),
          category:course_categories(display_name),
          series:course_series(display_name)
        )
      `)
      .eq("is_active", true)
      .order("start_date", { ascending: true })
      .order("start_time", { ascending: true })

    if (franchiseId) {
      query = query.eq("franchise_id", franchiseId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching instances:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch instances" },
      { status: 500 }
    )
  }
}

// 创建新课程实例（必须指定 assignment_id）
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      assignment_id,
      location_id,
      start_date,
      end_date,
      start_time,
      end_time,
      days_of_week,
      instructor_id,
      instructor_name,
      max_students,
      price_override,
      status,
      notes,
      // iCalendar 字段
      icalendar_rrule,
      icalendar_exdates,
      icalendar_rdates,
      timezone,
      exceptions,  // 例外日期数组（用于自动生成 exdates 和 rdates）
    } = body

    if (!assignment_id || !start_date || !end_date) {
      return NextResponse.json(
        { error: "Missing required fields: assignment_id, start_date, end_date" },
        { status: 400 }
      )
    }

    // 处理例外日期
    const { addExceptionDate, addRescheduleDate, formatICalDate, formatICalDateTime } = await import('@/lib/icalendar')
    let finalExdates = icalendar_exdates || []
    let finalRdates = icalendar_rdates || []
    const finalTimezone = timezone || 'America/Los_Angeles'

    // 如果提供了 exceptions 数组，自动生成 exdates 和 rdates
    if (exceptions && Array.isArray(exceptions)) {
      exceptions.forEach((exc: any) => {
        if (exc.type === 'skip' && exc.originalDate) {
          const dateStr = formatICalDate(exc.originalDate)
          if (!finalExdates.includes(dateStr)) {
            finalExdates.push(dateStr)
          }
        } else if (exc.type === 'reschedule' && exc.originalDate && exc.newDate) {
          // 排除原日期
          const originalDateStr = formatICalDate(exc.originalDate)
          if (!finalExdates.includes(originalDateStr)) {
            finalExdates.push(originalDateStr)
          }
          // 添加新日期
          const rdateValue = formatICalDateTime(
            exc.newDate,
            exc.newStartTime || start_time,
            finalTimezone
          )
          if (!finalRdates.includes(rdateValue)) {
            finalRdates.push(rdateValue)
          }
        }
      })
    }

    const instance = await createCourseInstance({
      assignment_id,
      location_id: location_id && location_id.trim() !== "" ? location_id : undefined,
      start_date,
      end_date,
      start_time,
      end_time,
      days_of_week,
      icalendar_rrule,
      icalendar_exdates: finalExdates.length > 0 ? finalExdates : undefined,
      icalendar_rdates: finalRdates.length > 0 ? finalRdates : undefined,
      timezone: finalTimezone,
      instructor_id,
      instructor_name,
      max_students,
      current_students: 0,
      price_override,
      status: status || "scheduled",
      notes,
      is_active: true,
    })

    return NextResponse.json(instance, { status: 201 })
  } catch (error: any) {
    console.error("Error creating instance:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create instance" },
      { status: 500 }
    )
  }
}

