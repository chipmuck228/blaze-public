import { NextResponse } from "next/server"
import {getErrorMessage, type StringKeyRecord} from "@/lib/typed-error"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import type { SchemaFieldConfig } from "@/lib/instance-schema"
import type { JsonRecord } from "@/types/json"
import { catalogCols, catalogSelect, catalogTables, adminSessionUpdateFetchSelect, normalizeSessionRow } from "@/lib/catalog-db"

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

    const { data: instance, error } = await supabaseAdmin
      .from(catalogTables.session)
      .select(catalogSelect.adminSessionDetail())
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Instance not found" }, { status: 404 })
      }
      console.error("Error fetching instance:", error)
      return NextResponse.json(
        { error: getErrorMessage(error) || "Failed to fetch instance" },
        { status: 500 }
      )
    }

    return NextResponse.json(normalizeSessionRow(instance), { status: 200 })
  } catch (error: unknown) {
    console.error("Error fetching instance v2:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch instance" },
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

    // 获取当前 instance 及 offering.type_config_data、offering_type.portal_service_role（用于 is_course_type / portal_service_role）
    const { data: currentInstanceRaw, error: fetchError } = await supabaseAdmin
      .from(catalogTables.session)
      .select(adminSessionUpdateFetchSelect())
      .eq("id", id)
      .single()

    if (fetchError || !currentInstanceRaw) {
      return NextResponse.json({ error: "Instance not found" }, { status: 404 })
    }

    const currentInstance = currentInstanceRaw as unknown as Record<string, unknown>

    const body = await request.json()
    const {
      campus_id,
      price_override,
      start_date,
      end_date,
      start_time,
      end_time,
      session_count,
      days_of_week,
      max_students,
      current_students,
      instance_data_ext,
      icalendar_rrule,
      icalendar_exdates,
      icalendar_rdates,
      timezone,
      status,
      notes,
      is_active,
      featured,
      amilia_link,
    } = body

    type OfferingJoin = {
      type_config_data?: {
        portal_config?: { is_course_type?: boolean }
        portal_service_role?: string
      }
      offering_type?:
        | { instance_schema?: unknown; portal_service_role?: string }
        | Array<{ instance_schema?: unknown; portal_service_role?: string }>
    }

    const extBase =
      typeof currentInstance.instance_data_ext === "object" &&
      currentInstance.instance_data_ext !== null
        ? (currentInstance.instance_data_ext as Record<string, unknown>)
        : {}

    const nextDataExt = {
      ...extBase,
      ...(typeof instance_data_ext === "object" && instance_data_ext !== null ? instance_data_ext : {}),
    } as Record<string, unknown>
    const scheduleExt = nextDataExt.schedule as Record<string, unknown> | undefined
    const capacityExt = nextDataExt.capacity_price as Record<string, unknown> | undefined
    // 从 instance_data_ext 的 schedule / capacity_price 推导行级字段
    const finalStartDate = start_date ?? scheduleExt?.start_date ?? currentInstance.start_date
    const finalEndDate = end_date ?? scheduleExt?.end_date ?? currentInstance.end_date
    const finalStartTime = start_time ?? scheduleExt?.start_time ?? currentInstance.start_time
    const finalEndTime = end_time ?? scheduleExt?.end_time ?? currentInstance.end_time
    const finalDaysOfWeek = days_of_week ?? scheduleExt?.days_of_week ?? currentInstance.days_of_week
    const finalMaxStudents = max_students ?? capacityExt?.max_students ?? currentInstance.max_students
    const finalPriceOverride = price_override ?? capacityExt?.price_override ?? currentInstance.price_override

    if (finalStartDate && finalEndDate && new Date(finalStartDate) > new Date(finalEndDate)) {
      return NextResponse.json(
        { error: "start_date must be less than or equal to end_date" },
        { status: 400 }
      )
    }

    const offeringData = (
      Array.isArray(currentInstance.offering)
        ? currentInstance.offering[0]
        : currentInstance.offering
    ) as OfferingJoin | undefined

    const offeringType = Array.isArray(offeringData?.offering_type)
      ? offeringData.offering_type[0]
      : offeringData?.offering_type
    if (offeringType?.instance_schema && typeof offeringType.instance_schema === "object") {
      const schema = offeringType.instance_schema as { fields?: Record<string, SchemaFieldConfig> }
      if (schema.fields) {
        const errors: string[] = []
        const validateField = (val: unknown, fieldConfig: SchemaFieldConfig, fieldLabel: string) => {
          if (fieldConfig.required && (val === undefined || val === null || val === "")) {
            errors.push(`${fieldLabel} is required`)
            return
          }
          if (val === undefined || val === null) return
          if (fieldConfig.type === "number") {
            const value = Number(val)
            if (isNaN(value)) errors.push(`${fieldLabel} must be a number`)
            else {
              if (fieldConfig.min !== undefined && value < fieldConfig.min) errors.push(`${fieldLabel} must be at least ${fieldConfig.min}`)
              if (fieldConfig.max !== undefined && value > fieldConfig.max) errors.push(`${fieldLabel} must be at most ${fieldConfig.max}`)
            }
          }
          if (fieldConfig.type === "select" && fieldConfig.options && !fieldConfig.options.includes(val)) {
            errors.push(`${fieldLabel} must be one of: ${fieldConfig.options.join(", ")}`)
          }
          if (fieldConfig.type === "multiselect" && fieldConfig.options) {
            const values = Array.isArray(val) ? val : [val]
            const optSet = new Set(fieldConfig.options.map((o) => String(o)))
            const invalid = values.filter((v) => !optSet.has(String(v)))
            if (invalid.length > 0) errors.push(`${fieldLabel} contains invalid values: ${invalid.join(", ")}`)
          }
        }
        for (const [fieldName, fieldConfig] of Object.entries(schema.fields)) {
          const fieldLabel = fieldConfig.label || fieldName
          if (fieldConfig.type === "object" && fieldConfig.properties) {
            const obj = nextDataExt[fieldName]
            if (fieldConfig.required && (obj === undefined || obj === null || typeof obj !== "object")) {
              errors.push(`${fieldLabel} is required`)
              continue
            }
            if (obj && typeof obj === "object" && !Array.isArray(obj)) {
              const objRecord = obj as Record<string, unknown>
              for (const [propKey, propConfig] of Object.entries(fieldConfig.properties ?? {})) {
                validateField(objRecord[propKey], propConfig, propConfig.label || propKey)
              }
            }
          } else {
            validateField(nextDataExt[fieldName], fieldConfig, fieldLabel)
          }
        }
        if (errors.length > 0) {
          return NextResponse.json(
            { error: errors.join(", ") },
            { status: 400 }
          )
        }
      }
    }

    const finalCurrentStudents =
      current_students !== undefined
        ? current_students
        : Number(currentInstance.current_students ?? 0)
    if (finalMaxStudents != null && finalCurrentStudents > finalMaxStudents) {
      return NextResponse.json(
        { error: "current_students cannot exceed max_students" },
        { status: 400 }
      )
    }

    const updateData: StringKeyRecord = {}
    if (campus_id !== undefined) updateData[catalogCols.session.locationId] = campus_id
    if (current_students !== undefined) updateData.current_students = current_students
    if (session_count !== undefined) updateData.session_count = session_count
    updateData.instance_data_ext = nextDataExt as JsonRecord
    updateData.start_date = finalStartDate
    updateData.end_date = finalEndDate
    updateData.start_time = finalStartTime
    updateData.end_time = finalEndTime
    updateData.days_of_week = finalDaysOfWeek
    updateData.max_students = finalMaxStudents
    updateData.price_override = finalPriceOverride
    // is_course_type：从 offering.type_config_data.portal_config.is_course_type 得出（设计文档 PORTAL_OFFERING_TYPE_DESIGN）
    updateData.is_course_type = !!offeringData?.type_config_data?.portal_config?.is_course_type
    // portal_service_role：从 type_config_data 平铺，缺省时用 offering_type.portal_service_role（设计文档 INSTANCE_DETAIL_MEAL_CARE_SERVICES_DESIGN 4.3）
    const rawRole = offeringData?.type_config_data?.portal_service_role
    const ot = Array.isArray(offeringData?.offering_type)
      ? offeringData.offering_type[0]
      : offeringData?.offering_type
    const typeRole = ot?.portal_service_role
    updateData.portal_service_role =
      rawRole === "meal_service" || rawRole === "care_service"
        ? rawRole
        : typeRole === "meal_service" || typeRole === "care_service"
          ? typeRole
          : null
    if (icalendar_rrule !== undefined) updateData.icalendar_rrule = icalendar_rrule
    if (icalendar_exdates !== undefined) updateData.icalendar_exdates = icalendar_exdates
    if (icalendar_rdates !== undefined) updateData.icalendar_rdates = icalendar_rdates
    if (timezone !== undefined) updateData.timezone = timezone
    if (status !== undefined) updateData.status = status
    if (notes !== undefined) updateData.notes = notes
    if (is_active !== undefined) updateData.is_active = is_active
    if (featured !== undefined) updateData.featured = !!featured
    if (amilia_link !== undefined) {
      updateData.amilia_link =
        typeof amilia_link === "string" && amilia_link.trim() ? amilia_link.trim() : null
    }

    // 更新 Instance
    const { data: updatedInstance, error: updateError } = await supabaseAdmin
      .from(catalogTables.session)
      .update(updateData)
      .eq("id", id)
      .select(catalogSelect.adminSessionMutationResponse())
      .single()

    if (updateError) {
      console.error("Error updating instance:", updateError)
      return NextResponse.json(
        { error: updateError.message || "Failed to update instance" },
        { status: 500 }
      )
    }

    return NextResponse.json(normalizeSessionRow(updatedInstance), { status: 200 })
  } catch (error: unknown) {
    console.error("Error updating instance v2:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to update instance" },
      { status: 500 }
    )
  }
}

// 删除 Instance V2（从 v2_instance 表物理删除）
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

    // 检查是否有活跃的 enrollments，有则不允许删除
    const { data: enrollments, error: enrollmentsError } = await supabaseAdmin
      .from("enrollments")
      .select("id")
      .eq("instance_id", id)
      .in("status", ["cart", "reserved", "enrolled", "waitlisted"])
      .limit(1)

    if (enrollmentsError && enrollmentsError.code !== "PGRST116") {
      console.error("Error checking enrollments:", enrollmentsError)
    }

    if (enrollments && enrollments.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete instance with active enrollments. Please cancel or complete enrollments first." },
        { status: 400 }
      )
    }

    // 从 v2_instance 表物理删除
    const { error: deleteError } = await supabaseAdmin
      .from(catalogTables.session)
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("Error deleting instance:", deleteError)
      return NextResponse.json(
        { error: deleteError.message || "Failed to delete instance" },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: "Instance deleted successfully" }, { status: 200 })
  } catch (error: unknown) {
    console.error("Error deleting instance v2:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to delete instance" },
      { status: 500 }
    )
  }
}
