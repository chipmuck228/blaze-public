import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

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

    if (franchiseId) {
      query = query.eq("program.franchise_id", franchiseId)
    }

    if (categoryId) {
      query = query.eq("program.category_id", categoryId)
    }

    if (status) {
      query = query.eq("status", status)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching instances v2:", error)
      return NextResponse.json(
        { error: error.message || "Failed to fetch instances" },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [], { status: 200 })
  } catch (error: any) {
    console.error("Error fetching instances v2:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch instances" },
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
    let categoryConfigBase: Record<string, any> = {}
    const programData = program as any
    if (programData.category && typeof programData.category === 'object' && !Array.isArray(programData.category)) {
      const category = programData.category as { config_base?: Record<string, any> }
      if (category.config_base && typeof category.config_base === 'object') {
        categoryConfigBase = category.config_base
      }
    }

    // 2. 验证 Offering 存在且状态为 published
    const { data: offering, error: offeringError } = await supabaseAdmin
      .from("v2_offering")
      .select(`
        id,
        status,
        category_id,
        offering_type_id,
        offering_type:v2_offering_type(
          id,
          code,
          name,
          instance_schema
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

    // 3.1 按 instance_schema 校验 start_date / end_date 必填，以及日期范围
    const schemaSource = Array.isArray(offering.offering_type) ? offering.offering_type[0] : offering.offering_type
    const instanceSchemaFields = (schemaSource as any)?.instance_schema?.fields
    if (instanceSchemaFields) {
      if (instanceSchemaFields.start_date?.required && (start_date === undefined || start_date === null || start_date === "")) {
        return NextResponse.json(
          { error: (instanceSchemaFields.start_date.label || "Start date") + " is required" },
          { status: 400 }
        )
      }
      if (instanceSchemaFields.end_date?.required && (end_date === undefined || end_date === null || end_date === "")) {
        return NextResponse.json(
          { error: (instanceSchemaFields.end_date.label || "End date") + " is required" },
          { status: 400 }
        )
      }
    }
    if (start_date && end_date && new Date(start_date) > new Date(end_date)) {
      return NextResponse.json(
        { error: "start_date must be less than or equal to end_date" },
        { status: 400 }
      )
    }

    // 4. 合并到 instance_data_ext（Phase A 双写：平铺字段也写入 instance_data_ext，便于后续只读 JSONB）
    // 顺序：category config_base → 请求中的平铺业务字段 → 请求中的 instance_data_ext（后者覆盖）
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
    }

    // 5. 验证 instance_data_ext 是否符合 instance_schema（如果提供了 schema）
    if (schemaSource?.instance_schema && typeof schemaSource.instance_schema === "object") {
      const schema = schemaSource.instance_schema as { fields?: Record<string, any> }
      if (schema.fields) {
        const errors: string[] = []
        
        // 验证必填字段（使用合并后的数据）
        for (const [fieldName, fieldConfig] of Object.entries(schema.fields)) {
          if (fieldConfig.required && (mergedInstanceDataExt[fieldName] === undefined || mergedInstanceDataExt[fieldName] === null || mergedInstanceDataExt[fieldName] === "")) {
            errors.push(`${fieldConfig.label || fieldName} is required`)
          }
          
          // 验证字段类型和范围（使用合并后的数据）
          if (mergedInstanceDataExt[fieldName] !== undefined && mergedInstanceDataExt[fieldName] !== null) {
            if (fieldConfig.type === "number") {
              const value = Number(mergedInstanceDataExt[fieldName])
              if (isNaN(value)) {
                errors.push(`${fieldConfig.label || fieldName} must be a number`)
              } else {
                if (fieldConfig.min !== undefined && value < fieldConfig.min) {
                  errors.push(`${fieldConfig.label || fieldName} must be at least ${fieldConfig.min}`)
                }
                if (fieldConfig.max !== undefined && value > fieldConfig.max) {
                  errors.push(`${fieldConfig.label || fieldName} must be at most ${fieldConfig.max}`)
                }
              }
            }
            
            if (fieldConfig.type === "select" && fieldConfig.options && !fieldConfig.options.includes(mergedInstanceDataExt[fieldName])) {
              errors.push(`${fieldConfig.label || fieldName} must be one of: ${fieldConfig.options.join(", ")}`)
            }
            
            if (fieldConfig.type === "multiselect" && fieldConfig.options) {
              const values = Array.isArray(mergedInstanceDataExt[fieldName]) ? mergedInstanceDataExt[fieldName] : [mergedInstanceDataExt[fieldName]]
              const optSet = new Set(fieldConfig.options.map((o: any) => String(o)))
              const invalidValues = values.filter((v: any) => !optSet.has(String(v)))
              if (invalidValues.length > 0) {
                errors.push(`${fieldConfig.label || fieldName} contains invalid values: ${invalidValues.join(", ")}`)
              }
            }
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

    // 7. 验证容量
    if (max_students !== null && max_students !== undefined) {
      if (max_students < 1) {
        return NextResponse.json(
          { error: "max_students must be at least 1" },
          { status: 400 }
        )
      }
      if (current_students > max_students) {
        return NextResponse.json(
          { error: "current_students cannot exceed max_students" },
          { status: 400 }
        )
      }
    }

    // 8. 创建 Instance（使用合并后的 instance_data_ext）
    const { data: instance, error: instanceError } = await supabaseAdmin
      .from("v2_instance")
      .insert({
        program_id,
        offering_id,
        campus_id: campus_id || null,
        price_override: price_override || null,
        start_date: start_date ?? null,
        end_date: end_date ?? null,
        start_time: start_time || null,
        end_time: end_time || null,
        session_count: session_count || null,
        days_of_week: days_of_week || null,
        max_students: max_students || null,
        current_students,
        instance_data_ext: mergedInstanceDataExt,
        icalendar_rrule: icalendar_rrule || null,
        icalendar_exdates: icalendar_exdates || null,
        icalendar_rdates: icalendar_rdates || null,
        timezone,
        status,
        notes: notes || null,
        is_active,
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
  } catch (error: any) {
    console.error("Error creating instance v2:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create instance" },
      { status: 500 }
    )
  }
}
