import { NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  getCourseInstancesByAssignment,
  createCourseInstance,
  getFranchiseByCode,
} from "@/lib/db"
import { supabaseAdmin } from "@/lib/supabase"

// 获取所有课程实例（支持按 assignment 过滤）
// Phase 2: 支持 useLegacy 和 includeLegacy 参数
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const assignmentId = searchParams.get("assignmentId")
    const franchiseCode = searchParams.get("franchise")
    const useLegacy = searchParams.get("useLegacy") === "true"
    const includeLegacy = searchParams.get("includeLegacy") === "true"

    // Phase 2: 如果 useLegacy=false，使用新表（默认）
    if (!useLegacy) {
      const { getInstancesV2 } = await import("@/lib/db-v2")
      
      // 转换参数
      const seriesId = searchParams.get("seriesId")
      const offeringId = searchParams.get("offeringId")
      let franchiseId = searchParams.get("franchiseId")
      const categoryId = searchParams.get("categoryId")
      const status = searchParams.get("status")

      // 如果提供了 franchiseCode，需要映射到新表的 franchise_id
      if (franchiseCode && !franchiseId) {
        const { getFranchiseV2ByCode } = await import("@/lib/db-v2")
        const franchiseV2 = await getFranchiseV2ByCode(franchiseCode)
        if (franchiseV2) {
          franchiseId = franchiseV2.id
        }
      }

      const instances = await getInstancesV2({
        seriesId: seriesId || undefined,
        offeringId: offeringId || undefined,
        franchiseId: franchiseId || undefined,
        categoryId: categoryId || undefined,
        status: status || undefined,
      })

      // 如果 includeLegacy=true，同时返回旧表数据
      if (includeLegacy) {
        const legacyInstances = await getLegacyInstances(assignmentId, franchiseCode)
        return NextResponse.json({
          v2: instances,
          legacy: legacyInstances,
        }, { status: 200 })
      }

      return NextResponse.json(instances, { status: 200 })
    }

    // 使用旧表（向后兼容）
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
          series:course_series(id, display_name, franchise_id)
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

// 辅助函数：获取旧表数据
async function getLegacyInstances(assignmentId: string | null, franchiseCode: string | null) {
  const { getFranchiseByCode } = await import("@/lib/db")
  
  let franchiseId: string | null = null
  if (franchiseCode) {
    const franchise = await getFranchiseByCode(franchiseCode)
    if (franchise) {
      franchiseId = franchise.id
    }
  }

  if (assignmentId) {
    const { getCourseInstancesByAssignment } = await import("@/lib/db")
    return await getCourseInstancesByAssignment(assignmentId)
  }

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
        series:course_series(id, display_name, franchise_id)
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

  return data || []
}

// 创建新课程实例（必须指定 assignment_id）
// Phase 2: 支持 useLegacy 参数，默认使用新表
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      useLegacy, // Phase 2: 新增参数
      assignment_id, // 旧表使用
      offering_id, // 新表使用
      series_id, // 新表使用
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
      // 新表字段
      category_id,
      franchise_id,
      session_count,
      duration_hours,
      duration_days,
      age_min,
      age_max,
      target_grades,
      drop_in_available,
      drop_in_price,
      multipass_available,
      denomination,
      expiry_date,
      caregiver_id,
      caregiver_name,
      meal_options,
    } = body

    // Phase 2: 如果 useLegacy=false，使用新表（默认）
    if (useLegacy !== true) {
      // 使用新 API 逻辑（直接调用新 API 的处理函数）
      const { createInstanceV2, validateOfferingStatus, validateInstanceData } = await import("@/lib/db-v2")
      
      // 验证必需字段
      if (!offering_id || !series_id || !start_date || !end_date) {
        return NextResponse.json(
          { error: "Missing required fields: offering_id, series_id, start_date, end_date" },
          { status: 400 }
        )
      }

      // 1. 验证 Offering 状态
      await validateOfferingStatus(offering_id)

      // 2. 验证 Series 存在
      const { data: series, error: seriesError } = await supabaseAdmin
        .from("course_series")
        .select("id, category_id, franchise_id")
        .eq("id", series_id)
        .single()

      if (seriesError || !series) {
        return NextResponse.json(
          { error: "Series not found" },
          { status: 400 }
        )
      }

      // 3. 推导 category_id 和 franchise_id
      const finalCategoryId = category_id || series.category_id
      let finalFranchiseId = franchise_id || series.franchise_id

      // 4. 映射 franchise_id 到新表
      if (finalFranchiseId) {
        const { getFranchiseV2ByLegacyId } = await import("@/lib/db-v2")
        const franchiseV2 = await getFranchiseV2ByLegacyId(finalFranchiseId)
        if (franchiseV2) {
          finalFranchiseId = franchiseV2.id
        }
      }

      // 5. 处理例外日期
      const { addExceptionDate, addRescheduleDate, formatICalDate, formatICalDateTime } = await import('@/lib/icalendar')
      let finalExdates = icalendar_exdates || []
      let finalRdates = icalendar_rdates || []
      const finalTimezone = timezone || 'America/Los_Angeles'

      if (exceptions && Array.isArray(exceptions)) {
        exceptions.forEach((exc: any) => {
          if (exc.type === 'skip' && exc.originalDate) {
            const dateStr = formatICalDate(exc.originalDate)
            if (!finalExdates.includes(dateStr)) {
              finalExdates.push(dateStr)
            }
          } else if (exc.type === 'reschedule' && exc.originalDate && exc.newDate) {
            const originalDateStr = formatICalDate(exc.originalDate)
            if (!finalExdates.includes(originalDateStr)) {
              finalExdates.push(originalDateStr)
            }
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

      // 6. 验证 Instance 数据
      const validationErrors = await validateInstanceData(offering_id, {
        offering_id,
        series_id,
        category_id: finalCategoryId,
        franchise_id: finalFranchiseId,
        start_date,
        end_date,
        start_time,
        end_time,
        days_of_week,
        location_id,
        session_count,
        duration_hours,
        duration_days,
        age_min,
        age_max,
        target_grades,
        max_students,
        current_students,
        price_override,
        instructor_id,
        instructor_name,
        drop_in_available,
        drop_in_price,
        multipass_available,
        denomination,
        expiry_date,
        caregiver_id,
        caregiver_name,
        meal_options,
        icalendar_rrule,
        icalendar_exdates: finalExdates.length > 0 ? finalExdates : undefined,
        icalendar_rdates: finalRdates.length > 0 ? finalRdates : undefined,
        timezone: finalTimezone,
        status,
        notes,
        is_active,
      } as any)

      if (validationErrors.length > 0) {
        return NextResponse.json(
          { error: validationErrors.join(", ") },
          { status: 400 }
        )
      }

      // 7. 创建 Instance
      const instance = await createInstanceV2({
        offering_id,
        series_id,
        category_id: finalCategoryId,
        franchise_id: finalFranchiseId,
        start_date,
        end_date,
        start_time: start_time || null,
        end_time: end_time || null,
        days_of_week: days_of_week || null,
        location_id: location_id || null,
        session_count: session_count || null,
        duration_hours: duration_hours || null,
        duration_days: duration_days || null,
        age_min: age_min || null,
        age_max: age_max || null,
        target_grades: target_grades || null,
        max_students: max_students || null,
        current_students: current_students || 0,
        price_override: price_override || null,
        instructor_id: instructor_id || null,
        instructor_name: instructor_name || null,
        drop_in_available: drop_in_available || false,
        drop_in_price: drop_in_price || null,
        multipass_available: multipass_available || false,
        denomination: denomination || null,
        expiry_date: expiry_date || null,
        caregiver_id: caregiver_id || null,
        caregiver_name: caregiver_name || null,
        meal_options: meal_options || null,
        icalendar_rrule: icalendar_rrule || null,
        icalendar_exdates: finalExdates.length > 0 ? finalExdates : null,
        icalendar_rdates: finalRdates.length > 0 ? finalRdates : null,
        timezone: finalTimezone,
        status: status || "scheduled",
        notes: notes || null,
        is_active: is_active !== undefined ? is_active : true,
        legacy_instance_id: null,
        legacy_assignment_id: null,
      })

      return NextResponse.json(instance, { status: 201 })
    }

    // 使用旧表（向后兼容）
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

