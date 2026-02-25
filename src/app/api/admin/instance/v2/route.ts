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

    // 必需字段验证
    if (!program_id || !offering_id || !start_date || !end_date) {
      return NextResponse.json(
        { error: "Missing required fields: program_id, offering_id, start_date, end_date" },
        { status: 400 }
      )
    }

    // 验证日期范围
    if (new Date(start_date) > new Date(end_date)) {
      return NextResponse.json(
        { error: "start_date must be less than or equal to end_date" },
        { status: 400 }
      )
    }

    // 1. 验证 Program 存在
    const { data: program, error: programError } = await supabaseAdmin
      .from("v2_program")
      .select("id, category_id, franchise_id")
      .eq("id", program_id)
      .single()

    if (programError || !program) {
      return NextResponse.json(
        { error: "Program not found" },
        { status: 400 }
      )
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

    // 4. 验证 instance_data_ext 是否符合 instance_schema（如果提供了 schema）
    const offeringType = Array.isArray(offering.offering_type) ? offering.offering_type[0] : offering.offering_type
    if (offeringType?.instance_schema && typeof offeringType.instance_schema === "object") {
      const schema = offeringType.instance_schema as { fields?: Record<string, any> }
      if (schema.fields) {
        const errors: string[] = []
        
        // 验证必填字段
        for (const [fieldName, fieldConfig] of Object.entries(schema.fields)) {
          if (fieldConfig.required && (instance_data_ext[fieldName] === undefined || instance_data_ext[fieldName] === null || instance_data_ext[fieldName] === "")) {
            errors.push(`${fieldConfig.label || fieldName} is required`)
          }
          
          // 验证字段类型和范围
          if (instance_data_ext[fieldName] !== undefined && instance_data_ext[fieldName] !== null) {
            if (fieldConfig.type === "number") {
              const value = Number(instance_data_ext[fieldName])
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
            
            if (fieldConfig.type === "select" && fieldConfig.options && !fieldConfig.options.includes(instance_data_ext[fieldName])) {
              errors.push(`${fieldConfig.label || fieldName} must be one of: ${fieldConfig.options.join(", ")}`)
            }
            
            if (fieldConfig.type === "multiselect" && fieldConfig.options) {
              const values = Array.isArray(instance_data_ext[fieldName]) ? instance_data_ext[fieldName] : [instance_data_ext[fieldName]]
              const invalidValues = values.filter((v: any) => !fieldConfig.options.includes(v))
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

    // 5. 验证 Campus（如果提供）
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

    // 6. 验证容量
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

    // 7. 创建 Instance
    const { data: instance, error: instanceError } = await supabaseAdmin
      .from("v2_instance")
      .insert({
        program_id,
        offering_id,
        campus_id: campus_id || null,
        price_override: price_override || null,
        start_date,
        end_date,
        start_time: start_time || null,
        end_time: end_time || null,
        session_count: session_count || null,
        days_of_week: days_of_week || null,
        max_students: max_students || null,
        current_students,
        instance_data_ext,
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
