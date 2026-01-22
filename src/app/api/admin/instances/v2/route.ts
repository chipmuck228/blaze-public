/**
 * Phase 2: 新 API 端点 - Instances V2
 * 使用 instance_v2 表创建和查询 Instances
 */

import { NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  createInstanceV2,
  getInstancesV2,
  validateOfferingStatus,
  validateInstanceData,
  getOfferingV2,
} from "@/lib/db-v2"
import { supabaseAdmin } from "@/lib/supabase"

// 获取所有 Instances V2（从 instance_v2 表）
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const seriesId = searchParams.get("seriesId")
    const offeringId = searchParams.get("offeringId")
    const franchiseId = searchParams.get("franchiseId")
    const categoryId = searchParams.get("categoryId")
    const status = searchParams.get("status")

    const instances = await getInstancesV2({
      seriesId: seriesId || undefined,
      offeringId: offeringId || undefined,
      franchiseId: franchiseId || undefined,
      categoryId: categoryId || undefined,
      status: status || undefined,
    })

    return NextResponse.json(instances, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching instances v2:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch instances" },
      { status: 500 }
    )
  }
}

// 创建新 Instance V2（写入 instance_v2 表）
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      offering_id,
      series_id,
      category_id,
      franchise_id,
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
      icalendar_exdates,
      icalendar_rdates,
      timezone,
      status,
      notes,
      is_active,
      exceptions, // 例外日期数组（用于自动生成 exdates 和 rdates）
    } = body

    // 必需字段验证
    if (!offering_id || !series_id || !start_date || !end_date) {
      return NextResponse.json(
        { error: "Missing required fields: offering_id, series_id, start_date, end_date" },
        { status: 400 }
      )
    }

    // 1. 验证 Offering 存在且状态为 published
    try {
      await validateOfferingStatus(offering_id)
    } catch (err: any) {
      console.error(`Error validating offering status (id: ${offering_id}):`, err)
      return NextResponse.json(
        { error: err.message || `Failed to validate offering: ${offering_id}` },
        { status: 400 }
      )
    }

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
    
    // 4. 处理 franchise_id：始终使用 series.franchise_id（数据库触发器要求匹配）
    // 重要：数据库触发器 validate_instance_v2_franchise_series_match 会验证：
    //   instance_v2.franchise_id 必须与 course_series.franchise_id 完全匹配
    // 
    // 问题：如果 course_series.franchise_id 是旧表的 ID，而我们映射到新表的 ID，触发器会失败
    // 
    // 解决方案：
    // 1. 如果 series.franchise_id 已经是新表的 ID（存在于 franchises_v2），直接使用
    // 2. 如果 series.franchise_id 是旧表的 ID，我们需要：
    //    - 检查是否能映射到新表
    //    - 如果能映射，但触发器要求匹配旧表的 ID，我们有两个选择：
    //      a) 设置为 NULL（触发器允许 NULL，但会丢失 franchise 信息）
    //      b) 使用旧表的 ID（但这会导致外键约束失败，因为 instance_v2.franchise_id 是 FK 到 franchises_v2）
    //    - 最佳方案：如果 series.franchise_id 是旧表的 ID，设置为 NULL
    //      因为 instance_v2.franchise_id 必须是 franchises_v2 表的 ID，不能是旧表的 ID
    
    // 处理 franchise_id：数据库触发器已更新，支持旧表 ID 到新表 ID 的映射
    // 触发器逻辑：
    // 1. 如果 course_series.franchise_id 已经是新表的 ID，直接比较
    // 2. 如果 course_series.franchise_id 是旧表的 ID，触发器会映射到新表 ID 后比较
    // 3. 如果无法映射，instance_v2.franchise_id 必须是 NULL
    //
    // 因此，我们的逻辑应该是：
    // 1. 检查 series.franchise_id 是否已经是新表的 ID（存在于 franchises_v2）
    // 2. 如果是，直接使用
    // 3. 如果是旧表的 ID，尝试映射到新表 ID，如果映射成功，使用映射后的 ID
    // 4. 如果无法映射，设置为 NULL
    
    let finalFranchiseId: string | null = null
    
    if (series.franchise_id) {
      const { getFranchiseV2ByLegacyId, getFranchiseV2 } = await import("@/lib/db-v2")
      
      // 首先尝试直接查询新表（检查是否已经是新表的 ID）
      const franchiseV2Direct = await getFranchiseV2(series.franchise_id)
      if (franchiseV2Direct) {
        // series.franchise_id 已经是新表的 ID，可以直接使用
        // 数据库触发器会验证 franchise_id 必须与 course_series.franchise_id 匹配
        // 如果它们都是新表的 ID，会匹配成功
        finalFranchiseId = franchiseV2Direct.id
      } else {
        // series.franchise_id 不在新表中，可能是旧表的 ID
        // 尝试通过 legacy_franchise_id 查找映射
        const franchiseV2 = await getFranchiseV2ByLegacyId(series.franchise_id)
        if (franchiseV2) {
          // 找到了映射，使用映射后的新表 ID
          // 数据库触发器会检查映射关系，所以这会匹配成功
          finalFranchiseId = franchiseV2.id
          console.log(`Series franchise_id (${series.franchise_id}) is from legacy table. Mapped to new table ID (${franchiseV2.id}).`)
        } else {
          // 如果都找不到，设置为 NULL（数据库触发器允许 NULL）
          console.warn(`Could not find franchise mapping for series.franchise_id (${series.franchise_id}). Setting to NULL.`)
          finalFranchiseId = null
        }
      }
    }
    
    // 注意：数据库触发器已更新，支持旧表 ID 到新表 ID 的映射
    // 如果 series.franchise_id 是旧表的 ID，我们映射到新表的 ID，触发器会验证映射关系

    // 6. 验证数据一致性
    if (finalCategoryId && finalCategoryId !== series.category_id) {
      return NextResponse.json(
        { error: "Category ID does not match series category" },
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

    // 8. 验证 Instance 数据（根据 Offering Type 动态验证）
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

    // 9. 创建 Instance（写入 instance_v2 表）
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
  } catch (error: any) {
    console.error("Error creating instance v2:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create instance" },
      { status: 500 }
    )
  }
}
