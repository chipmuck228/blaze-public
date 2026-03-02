import { NextResponse } from "next/server"
import { auth } from "@/auth"
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

    const { data: instance, error } = await supabaseAdmin
      .from("v2_instance")
      .select(`
        *,
        program:v2_program(
          id,
          name,
          display_name,
          category_id,
          franchise_id,
          category:v2_category(id, name, display_name),
          franchise:v2_franchise(id, code, name)
        ),
        offering:v2_offering(
          id,
          name,
          slug,
          description,
          base_price,
          currency,
          status,
          offering_type_id,
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
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Instance not found" }, { status: 404 })
      }
      console.error("Error fetching instance:", error)
      return NextResponse.json(
        { error: error.message || "Failed to fetch instance" },
        { status: 500 }
      )
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

    // 获取当前 instance
    const { data: currentInstance, error: fetchError } = await supabaseAdmin
      .from("v2_instance")
      .select(`
        *,
        offering:v2_offering(
          id,
          offering_type_id,
          offering_type:v2_offering_type(instance_schema)
        )
      `)
      .eq("id", id)
      .single()

    if (fetchError || !currentInstance) {
      return NextResponse.json({ error: "Instance not found" }, { status: 404 })
    }

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
    } = body

    // 验证日期范围
    const finalStartDate = start_date || currentInstance.start_date
    const finalEndDate = end_date || currentInstance.end_date
    if (new Date(finalStartDate) > new Date(finalEndDate)) {
      return NextResponse.json(
        { error: "start_date must be less than or equal to end_date" },
        { status: 400 }
      )
    }

    // 验证 instance_data_ext（如果提供了更新）
    const offeringType = Array.isArray(currentInstance.offering?.offering_type) 
      ? currentInstance.offering.offering_type[0] 
      : currentInstance.offering?.offering_type
    if (instance_data_ext !== undefined && offeringType?.instance_schema) {
      const schema = offeringType.instance_schema as { fields?: Record<string, any> }
      if (schema.fields) {
        const errors: string[] = []
        const finalDataExt = { ...currentInstance.instance_data_ext, ...instance_data_ext }
        
        for (const [fieldName, fieldConfig] of Object.entries(schema.fields)) {
          if (fieldConfig.required && (finalDataExt[fieldName] === undefined || finalDataExt[fieldName] === null || finalDataExt[fieldName] === "")) {
            errors.push(`${fieldConfig.label || fieldName} is required`)
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

    // 验证容量
    const finalMaxStudents = max_students !== undefined ? max_students : currentInstance.max_students
    const finalCurrentStudents = current_students !== undefined ? current_students : currentInstance.current_students
    if (finalMaxStudents !== null && finalCurrentStudents > finalMaxStudents) {
      return NextResponse.json(
        { error: "current_students cannot exceed max_students" },
        { status: 400 }
      )
    }

    // 构建更新数据（Phase A 双写：平铺字段同时写入 instance_data_ext）
    const updateData: any = {}
    if (campus_id !== undefined) updateData.campus_id = campus_id
    if (price_override !== undefined) updateData.price_override = price_override
    if (start_date !== undefined) updateData.start_date = start_date
    if (end_date !== undefined) updateData.end_date = end_date
    if (start_time !== undefined) updateData.start_time = start_time
    if (end_time !== undefined) updateData.end_time = end_time
    if (session_count !== undefined) updateData.session_count = session_count
    if (days_of_week !== undefined) updateData.days_of_week = days_of_week
    if (max_students !== undefined) updateData.max_students = max_students
    if (current_students !== undefined) updateData.current_students = current_students
    const extFromFlat: Record<string, unknown> = {}
    if (start_date !== undefined) extFromFlat.start_date = start_date
    if (end_date !== undefined) extFromFlat.end_date = end_date
    if (start_time !== undefined) extFromFlat.start_time = start_time
    if (end_time !== undefined) extFromFlat.end_time = end_time
    if (session_count !== undefined) extFromFlat.session_count = session_count
    if (days_of_week !== undefined) extFromFlat.days_of_week = days_of_week
    if (max_students !== undefined) extFromFlat.max_students = max_students
    if (notes !== undefined) extFromFlat.notes = notes
    const nextDataExt = {
      ...(currentInstance.instance_data_ext || {}),
      ...extFromFlat,
      ...(typeof instance_data_ext === "object" && instance_data_ext !== null ? instance_data_ext : {}),
    }
    updateData.instance_data_ext = nextDataExt
    if (icalendar_rrule !== undefined) updateData.icalendar_rrule = icalendar_rrule
    if (icalendar_exdates !== undefined) updateData.icalendar_exdates = icalendar_exdates
    if (icalendar_rdates !== undefined) updateData.icalendar_rdates = icalendar_rdates
    if (timezone !== undefined) updateData.timezone = timezone
    if (status !== undefined) updateData.status = status
    if (notes !== undefined) updateData.notes = notes
    if (is_active !== undefined) updateData.is_active = is_active

    // 更新 Instance
    const { data: updatedInstance, error: updateError } = await supabaseAdmin
      .from("v2_instance")
      .update(updateData)
      .eq("id", id)
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

    if (updateError) {
      console.error("Error updating instance:", updateError)
      return NextResponse.json(
        { error: updateError.message || "Failed to update instance" },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedInstance, { status: 200 })
  } catch (error: any) {
    console.error("Error updating instance v2:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update instance" },
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
      .from("v2_instance")
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
  } catch (error: any) {
    console.error("Error deleting instance v2:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete instance" },
      { status: 500 }
    )
  }
}
