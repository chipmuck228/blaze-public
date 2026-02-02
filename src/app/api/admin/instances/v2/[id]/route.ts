/**
 * Instance V2 API endpoints - Update and Delete
 * 使用 instance_v2 表更新和删除 Instances
 */

import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { updateInstanceV2, deleteInstanceV2, getInstanceV2, validateInstanceData } from "@/lib/db-v2"
import { supabaseAdmin } from "@/lib/supabase"

// 获取单个 Instance V2
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

    const instance = await getInstanceV2(id)

    if (!instance) {
      return NextResponse.json({ error: "Instance not found" }, { status: 404 })
    }

    return NextResponse.json(instance, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching instance v2:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch instance" },
      { status: 500 }
    )
  }
}

// 更新 Instance V2
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

    // 获取当前 instance 以获取 offering_id
    const currentInstance = await getInstanceV2(id)
    if (!currentInstance) {
      return NextResponse.json({ error: "Instance not found" }, { status: 404 })
    }

    const body = await request.json()
    const {
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
    } = body

    // 验证必需字段
    if (!start_date || !end_date) {
      return NextResponse.json(
        { error: "Start date and end date are required" },
        { status: 400 }
      )
    }

    // 验证数据（使用当前的 offering_id）
    const validationErrors = await validateInstanceData(currentInstance.offering_id, {
      start_date,
      end_date,
      series_id: currentInstance.series_id,
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
      price_override,
    })

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: validationErrors.join(", ") },
        { status: 400 }
      )
    }

    // 更新 Instance
    const updatedInstance = await updateInstanceV2(id, {
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
      current_students: current_students !== undefined ? current_students : currentInstance.current_students,
      price_override: price_override || null,
      instructor_id: instructor_id || null,
      instructor_name: instructor_name || null,
      drop_in_available: drop_in_available !== undefined ? drop_in_available : currentInstance.drop_in_available,
      drop_in_price: drop_in_price || null,
      multipass_available: multipass_available !== undefined ? multipass_available : currentInstance.multipass_available,
      denomination: denomination || null,
      expiry_date: expiry_date || null,
      caregiver_id: caregiver_id || null,
      caregiver_name: caregiver_name || null,
      meal_options: meal_options || null,
      icalendar_rrule: icalendar_rrule || null,
      icalendar_exdates: icalendar_exdates || null,
      icalendar_rdates: icalendar_rdates || null,
      timezone: timezone || currentInstance.timezone,
      status: status || currentInstance.status,
      notes: notes || null,
      is_active: is_active !== undefined ? is_active : currentInstance.is_active,
    })

    return NextResponse.json(updatedInstance, { status: 200 })
  } catch (error: any) {
    console.error("Error updating instance v2:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update instance" },
      { status: 500 }
    )
  }
}

// 删除 Instance V2（软删除）
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

    // 检查是否有活跃的 enrollments
    const { data: enrollments, error: enrollmentsError } = await supabaseAdmin
      .from("enrollments")
      .select("id")
      .eq("instance_id", id)
      .in("status", ["cart", "reserved", "enrolled", "waitlisted"])
      .limit(1)

    if (enrollmentsError) {
      console.error("Error checking enrollments:", enrollmentsError)
      // 继续执行删除，但记录错误
    }

    if (enrollments && enrollments.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete instance with active enrollments. Please cancel or complete enrollments first." },
        { status: 400 }
      )
    }

    await deleteInstanceV2(id)

    return NextResponse.json({ message: "Instance deleted successfully" }, { status: 200 })
  } catch (error: any) {
    console.error("Error deleting instance v2:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete instance" },
      { status: 500 }
    )
  }
}
