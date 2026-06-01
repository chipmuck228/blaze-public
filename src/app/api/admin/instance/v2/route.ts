import { NextResponse } from "next/server"
import {getErrorMessage, type StringKeyRecord} from "@/lib/typed-error"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import type { SchemaFieldConfig } from "@/lib/instance-schema"

/** Resolve v2_program ids for franchise/category filters (avoid PostgREST embed filters that null out program). */
async function resolveProgramIdsForFilter(opts: {
  franchiseId?: string | null
  categoryId?: string | null
}): Promise<string[]> {
  let q = supabaseAdmin.from("v2_program").select("id")
  if (opts.franchiseId) q = q.eq("franchise_id", opts.franchiseId)
  if (opts.categoryId) q = q.eq("category_id", opts.categoryId)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map((row) => row.id)
}

// 获取所有 Instances V2（从 v2_instance 表）
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const programId = searchParams.get("programId")
    const offeringId = searchParams.get("offeringId")
    const franchiseId = searchParams.get("franchiseId")
    const categoryId = searchParams.get("categoryId")
    const status = searchParams.get("status")
    const activeOnly = searchParams.get("activeOnly") !== "false"

    let query = supabaseAdmin
      .from("v2_instance")
      .select(`
        *,
        program:v2_program(
          id,
          name,
          display_name,
          category_id,
          franchise_id,
          start_date,
          end_date,
          category:v2_category(
            id,
            name,
            display_name
          ),
          franchise:v2_franchise(
            id,
            code,
            name
          )
        ),
        offering:v2_offering(
          id,
          name,
          slug,
          description,
          base_price,
          currency,
          status,
          offering_type:v2_offering_type(
            id,
            code,
            name,
            instance_schema
          )
        ),
        campus:v2_campus(
          id,
          name,
          display_name,
          address
        )
      `)
      .order("start_date", { ascending: true })
      .order("start_time", { ascending: true })

    if (activeOnly) {
      query = query.eq("is_active", true)
    }

    if (programId) {
      query = query.eq("program_id", programId)
    }

    if (offeringId) {
      query = query.eq("offering_id", offeringId)
    }

    // Filter on v2_instance.program_id — not program.* embed columns. PostgREST embed
    // filters (e.g. program.franchise_id) return all rows but set program=null on non-matches.
    if (!programId && (franchiseId || categoryId)) {
      const programIds = await resolveProgramIdsForFilter({
        franchiseId,
        categoryId,
      })
      if (programIds.length === 0) {
        return NextResponse.json([], { status: 200 })
      }
      query = query.in("program_id", programIds)
    }

    if (status) {
      query = query.eq("status", status)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching instances v2:", error)
      return NextResponse.json(
        { error: getErrorMessage(error) || "Failed to fetch instances" },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [], { status: 200 })
  } catch (error: unknown) {
    console.error("Error fetching instances v2:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch instances" },
      { status: 500 }
    )
  }
}

// 创建新 Instance V2（写入 v2_instance 表）
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      program_id,
      offering_id,
      campus_id,
      price_override,
      start_date,
      end_date,
      start_time,
      end_time,
      session_count,
      days_of_week,
      max_students,
      current_students = 0,
      instance_data_ext = {},
      icalendar_rrule,
      icalendar_exdates,
      icalendar_rdates,
      timezone = "UTC",
      status = "scheduled",
      notes,
      is_active = true,
      featured = false,
      amilia_link,
    } = body

    // 仅 program_id、offering_id 为必填；start_date/end_date 由 instance_schema 决定
    if (!program_id || !offering_id) {
      return NextResponse.json(
        { error: "Missing required fields: program_id, offering_id" },
        { status: 400 }
      )
    }

    // 1. 验证 Program 存在并获取 category 信息
    const { data: program, error: programError } = await supabaseAdmin
      .from("v2_program")
      .select(`
        id,
        category_id,
        franchise_id,
        category:v2_category(
          id,
          config_base
        )
      `)
      .eq("id", program_id)
      .single()

    if (programError || !program) {
      return NextResponse.json(
        { error: "Program not found" },
        { status: 400 }
      )
    }

    // 获取 category 的 config_base 作为默认配置
    let categoryConfigBase: Record<string, unknown> = {}
    const programData = program as {
      category?: { config_base?: Record<string, unknown> } | { config_base?: Record<string, unknown> }[]
    }
    if (programData.category && typeof programData.category === "object" && !Array.isArray(programData.category)) {
      const category = programData.category
      if (category.config_base && typeof category.config_base === 'object') {
        categoryConfigBase = category.config_base
      }
    }

    // 2. 验证 Offering 存在且状态为 published（并取 type_config_data、offering_type.portal_service_role 用于 is_course_type / portal_service_role）
    const { data: offering, error: offeringError } = await supabaseAdmin
      .from("v2_offering")
      .select(`
        id,
        status,
        category_id,
        offering_type_id,
        type_config_data,
        offering_type:v2_offering_type(
          id,
          code,
          name,
          instance_schema,
          portal_service_role
        )
      `)
      .eq("id", offering_id)
      .single()

    if (offeringError || !offering) {
      return NextResponse.json(
        { error: "Offering not found" },
        { status: 400 }
      )
    }

    if (offering.status !== "published") {
      return NextResponse.json(
        { error: `Cannot create instance for offering with status '${offering.status}'. Only 'published' offerings can have instances.` },
        { status: 400 }
      )
    }

    // 3. 验证 Offering 属于 Program 对应的 Category
    if (offering.category_id !== program.category_id) {
      return NextResponse.json(
        { error: "Offering category does not match program category" },
        { status: 400 }
      )
    }

    const schemaSource = Array.isArray(offering.offering_type)
      ? offering.offering_type[0]
      : offering.offering_type
    const instanceSchemaFields = (
      schemaSource as { instance_schema?: { fields?: Record<string, SchemaFieldConfig> } } | null
    )?.instance_schema?.fields

    // 4. 合并到 instance_data_ext（请求平铺字段 + instance_data_ext，后者覆盖）
    const flatFieldsForExt: Record<string, unknown> = {}
    if (start_date !== undefined) flatFieldsForExt.start_date = start_date
    if (end_date !== undefined) flatFieldsForExt.end_date = end_date
    if (start_time !== undefined) flatFieldsForExt.start_time = start_time
    if (end_time !== undefined) flatFieldsForExt.end_time = end_time
    if (session_count !== undefined) flatFieldsForExt.session_count = session_count
    if (days_of_week !== undefined) flatFieldsForExt.days_of_week = days_of_week
    if (max_students !== undefined) flatFieldsForExt.max_students = max_students
    if (notes !== undefined) flatFieldsForExt.notes = notes
    const mergedInstanceDataExt = {
      ...categoryConfigBase,
      ...flatFieldsForExt,
      ...(typeof instance_data_ext === "object" && instance_data_ext !== null ? instance_data_ext : {}),
    } as Record<string, unknown>

    // 4.1 从 instance_data_ext 的 object 组（schedule, capacity_price）推导行级字段，用于写入 v2_instance 表
    let finalStartDate = start_date
    let finalEndDate = end_date
    let finalStartTime = start_time
    let finalEndTime = end_time
    let finalDaysOfWeek = days_of_week
    let finalMaxStudents = max_students
    let finalPriceOverride = price_override
    if (mergedInstanceDataExt.schedule && typeof mergedInstanceDataExt.schedule === "object") {
      const s = mergedInstanceDataExt.schedule as Record<string, unknown>
      if (finalStartDate === undefined && typeof s.start_date === "string") finalStartDate = s.start_date
      if (finalEndDate === undefined && typeof s.end_date === "string") finalEndDate = s.end_date
      if (finalStartTime === undefined && typeof s.start_time === "string") finalStartTime = s.start_time
      if (finalEndTime === undefined && typeof s.end_time === "string") finalEndTime = s.end_time
      if (finalDaysOfWeek === undefined && Array.isArray(s.days_of_week)) finalDaysOfWeek = s.days_of_week
    }
    if (mergedInstanceDataExt.capacity_price && typeof mergedInstanceDataExt.capacity_price === "object") {
      const c = mergedInstanceDataExt.capacity_price as Record<string, unknown>
      if (finalMaxStudents === undefined && typeof c.max_students === "number") finalMaxStudents = c.max_students
      if (finalPriceOverride === undefined && typeof c.price_override === "number") finalPriceOverride = c.price_override
    }

    // 3.1 按 instance_schema 校验 start_date / end_date 必填（含 object schedule 内 required）
    if (instanceSchemaFields) {
      const scheduleObj = instanceSchemaFields.schedule?.type === "object" ? instanceSchemaFields.schedule : null
      const startRequired = instanceSchemaFields.start_date?.required || scheduleObj?.properties?.start_date?.required
      const endRequired = instanceSchemaFields.end_date?.required || scheduleObj?.properties?.end_date?.required
      const scheduleForRequired = mergedInstanceDataExt.schedule as Record<string, unknown> | undefined
      const startVal =
        finalStartDate ??
        (typeof scheduleForRequired?.start_date === "string" ? scheduleForRequired.start_date : undefined)
      const endVal =
        finalEndDate ??
        (typeof scheduleForRequired?.end_date === "string" ? scheduleForRequired.end_date : undefined)
      if (startRequired && (startVal === undefined || startVal === null || startVal === "")) {
        return NextResponse.json(
          { error: (scheduleObj?.properties?.start_date?.label || instanceSchemaFields.start_date?.label || "Start date") + " is required" },
          { status: 400 }
        )
      }
      if (endRequired && (endVal === undefined || endVal === null || endVal === "")) {
        return NextResponse.json(
          { error: (scheduleObj?.properties?.end_date?.label || instanceSchemaFields.end_date?.label || "End date") + " is required" },
          { status: 400 }
        )
      }
    }
    if (finalStartDate && finalEndDate && new Date(finalStartDate) > new Date(finalEndDate)) {
      return NextResponse.json(
        { error: "start_date must be less than or equal to end_date" },
        { status: 400 }
      )
    }

    // 5. 验证 instance_data_ext 是否符合 instance_schema（含 type=object 的嵌套校验）
    if (schemaSource?.instance_schema && typeof schemaSource.instance_schema === "object") {
      const schema = schemaSource.instance_schema as { fields?: Record<string, SchemaFieldConfig> }
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
            const optSet = new Set(
              (fieldConfig.options as unknown[]).map((o) => String(o))
            )
            const invalid = values.filter((v) => !optSet.has(String(v)))
            if (invalid.length > 0) errors.push(`${fieldLabel} contains invalid values: ${invalid.join(", ")}`)
          }
        }
        for (const [fieldName, fieldConfig] of Object.entries(schema.fields)) {
          const fieldLabel = fieldConfig.label || fieldName
          if (fieldConfig.type === "object" && fieldConfig.properties) {
            const obj = mergedInstanceDataExt[fieldName]
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
            validateField(mergedInstanceDataExt[fieldName], fieldConfig, fieldLabel)
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

    // 6. 验证 Campus（如果提供）
    if (campus_id) {
      const { data: campus, error: campusError } = await supabaseAdmin
        .from("v2_campus")
        .select("id, franchise_id")
        .eq("id", campus_id)
        .single()

      if (campusError || !campus) {
        return NextResponse.json(
          { error: "Campus not found" },
          { status: 400 }
        )
      }

      // 验证 Campus 属于 Program 的 Franchise
      if (campus.franchise_id !== program.franchise_id) {
        return NextResponse.json(
          { error: "Campus does not belong to program's franchise" },
          { status: 400 }
        )
      }
    }

    // 7. 验证容量（使用推导后的 max_students）
    if (finalMaxStudents !== null && finalMaxStudents !== undefined) {
      if (finalMaxStudents < 1) {
        return NextResponse.json(
          { error: "max_students must be at least 1" },
          { status: 400 }
        )
      }
      if (current_students > finalMaxStudents) {
        return NextResponse.json(
          { error: "current_students cannot exceed max_students" },
          { status: 400 }
        )
      }
    }

    type OfferingPortalConfig = {
      type_config_data?: {
        portal_config?: { is_course_type?: boolean }
        portal_service_role?: string
      }
      offering_type?: { portal_service_role?: string } | Array<{ portal_service_role?: string }>
    }
    const offeringPortal = offering as OfferingPortalConfig
    // 7.1 is_course_type：从 v2_offering.type_config_data.portal_config.is_course_type 得出（设计文档 PORTAL_OFFERING_TYPE_DESIGN）
    const isCourseType = !!offeringPortal.type_config_data?.portal_config?.is_course_type
    // 7.2 portal_service_role：从 type_config_data 平铺，缺省时用 v2_offering_type.portal_service_role（设计文档 INSTANCE_DETAIL_MEAL_CARE_SERVICES_DESIGN 4.3）
    const rawRole = offeringPortal.type_config_data?.portal_service_role
    const typeRole = (() => {
      const ot = Array.isArray(offeringPortal.offering_type)
        ? offeringPortal.offering_type[0]
        : offeringPortal.offering_type
      return ot?.portal_service_role
    })()
    const portalServiceRole =
      rawRole === "meal_service" || rawRole === "care_service"
        ? rawRole
        : typeRole === "meal_service" || typeRole === "care_service"
          ? typeRole
          : null

    // 8. 创建 Instance（行级字段用从 instance_data_ext 推导后的值）
    const { data: instance, error: instanceError } = await supabaseAdmin
      .from("v2_instance")
      .insert({
        program_id,
        offering_id,
        campus_id: campus_id || null,
        price_override: finalPriceOverride ?? price_override ?? null,
        start_date: finalStartDate ?? null,
        end_date: finalEndDate ?? null,
        start_time: finalStartTime ?? null,
        end_time: finalEndTime ?? null,
        session_count: session_count || null,
        days_of_week: finalDaysOfWeek ?? null,
        max_students: finalMaxStudents ?? max_students ?? null,
        current_students,
        instance_data_ext: mergedInstanceDataExt,
        icalendar_rrule: icalendar_rrule || null,
        icalendar_exdates: icalendar_exdates || null,
        icalendar_rdates: icalendar_rdates || null,
        timezone,
        status,
        notes: notes || null,
        is_active,
        featured: !!featured,
        is_course_type: isCourseType,
        portal_service_role: portalServiceRole,
        amilia_link:
          typeof amilia_link === "string" && amilia_link.trim() ? amilia_link.trim() : null,
      })
      .select(`
        *,
        program:v2_program(
          id,
          name,
          display_name,
          category:v2_category(id, name, display_name),
          franchise:v2_franchise(id, code, name)
        ),
        offering:v2_offering(
          id,
          name,
          base_price,
          currency,
          offering_type:v2_offering_type(code, name)
        ),
        campus:v2_campus(id, name, display_name)
      `)
      .single()

    if (instanceError) {
      console.error("Error creating instance:", instanceError)
      return NextResponse.json(
        { error: instanceError.message || "Failed to create instance" },
        { status: 500 }
      )
    }

    return NextResponse.json(instance, { status: 201 })
  } catch (error: unknown) {
    console.error("Error creating instance v2:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to create instance" },
      { status: 500 }
    )
  }
}
