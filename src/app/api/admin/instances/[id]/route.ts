import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { updateCourseInstance, deleteCourseInstance } from "@/lib/db"

// 获取单个实例
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

    const { supabaseAdmin } = await import("@/lib/supabase")
    const { data, error } = await supabaseAdmin
      .from("course_instances")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      return NextResponse.json({ error: "Instance not found" }, { status: 404 })
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching instance:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch instance" },
      { status: 500 }
    )
  }
}

// 更新课程实例
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      location_id,
      start_date,
      end_date,
      start_time,
      end_time,
      days_of_week,
      instructor_id,
      instructor_name,
      max_students,
      current_students,
      price_override,
      status,
      notes,
      is_active,
      // iCalendar 字段
      icalendar_rrule,
      icalendar_exdates,
      icalendar_rdates,
      timezone,
      exceptions,  // 例外日期数组
    } = body

    // 处理例外日期
    const { formatICalDate, formatICalDateTime } = await import('@/lib/icalendar')
    let finalExdates = icalendar_exdates
    let finalRdates = icalendar_rdates
    const finalTimezone = timezone

    // 如果提供了 exceptions 数组，自动生成 exdates 和 rdates
    if (exceptions && Array.isArray(exceptions)) {
      finalExdates = icalendar_exdates || []
      finalRdates = icalendar_rdates || []
      
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
            finalTimezone || 'America/Los_Angeles'
          )
          if (!finalRdates.includes(rdateValue)) {
            finalRdates.push(rdateValue)
          }
        }
      })
    }

    const instance = await updateCourseInstance(id, {
      location_id,
      start_date,
      end_date,
      start_time,
      end_time,
      days_of_week,
      icalendar_rrule,
      icalendar_exdates: finalExdates,
      icalendar_rdates: finalRdates,
      timezone: finalTimezone,
      instructor_id,
      instructor_name,
      max_students,
      current_students,
      price_override,
      status,
      notes,
      is_active,
    })

    return NextResponse.json(instance, { status: 200 })
  } catch (error: any) {
    console.error("Error updating instance:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update instance" },
      { status: 500 }
    )
  }
}

// 删除课程实例
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await deleteCourseInstance(id)

    return NextResponse.json({ message: "Instance deleted successfully" }, { status: 200 })
  } catch (error: any) {
    console.error("Error deleting instance:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete instance" },
      { status: 500 }
    )
  }
}

