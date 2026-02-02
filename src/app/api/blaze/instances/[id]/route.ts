import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取单个 instance
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

    const { data, error } = await supabaseAdmin
      .from("blaze_instance")
      .select(`
        *,
        program:blaze_program(
          id,
          name,
          display_name,
          category_id,
          franchise_id
        ),
        offering:blaze_offering(
          id,
          name,
          slug,
          description,
          base_price,
          currency,
          poster_url,
          status,
          offering_type_id,
          offering_type:blaze_offering_type(
            id,
            code,
            name
          )
        ),
        category:blaze_category(
          id,
          name,
          display_name,
          franchise_id
        ),
        franchise:blaze_franchise(
          id,
          code,
          name
        ),
        campus:blaze_campus(
          id,
          name,
          display_name,
          address,
          city,
          state
        )
      `)
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Instance not found" }, { status: 404 })
      }
      throw new Error(error.message)
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

// 更新 instance
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
      campus_id,
      start_date,
      end_date,
      start_time,
      end_time,
      max_students,
      current_students,
      price_override,
      age_min,
      age_max,
      target_grades,
      session_count,
      duration_hours,
      duration_days,
      days_of_week,
      status,
      notes,
      is_active,
    } = body

    if (start_date && end_date) {
      // 验证日期
      if (new Date(start_date) > new Date(end_date)) {
        return NextResponse.json(
          { error: "start_date must be less than or equal to end_date" },
          { status: 400 }
        )
      }
    }

    // 如果提供了 campus_id，验证它存在
    if (campus_id) {
      // 获取当前 instance 的 program_id
      const { data: currentInstance } = await supabaseAdmin
        .from("blaze_instance")
        .select("program_id, franchise_id")
        .eq("id", id)
        .single()

      if (currentInstance) {
        // 获取 program 的 franchise_id
        const { data: program } = await supabaseAdmin
          .from("blaze_program")
          .select("franchise_id")
          .eq("id", currentInstance.program_id)
          .single()

        const targetFranchiseId = program?.franchise_id || currentInstance.franchise_id

        if (targetFranchiseId) {
          const { data: campus, error: campusError } = await supabaseAdmin
            .from("blaze_campus")
            .select("id, franchise_id")
            .eq("id", campus_id)
            .single()

          if (campusError || !campus) {
            return NextResponse.json(
              { error: "Invalid campus_id. Campus must exist in blaze_campus table." },
              { status: 400 }
            )
          }

          // 验证 campus 的 franchise_id 与 program 的 franchise_id 匹配
          if (campus.franchise_id !== targetFranchiseId) {
            return NextResponse.json(
              { error: "campus_id and program_id do not match. Campus must belong to the same franchise as the program." },
              { status: 400 }
            )
          }
        }
      }
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (campus_id !== undefined) {
      updateData.campus_id = campus_id || null
    }

    if (start_date !== undefined) {
      updateData.start_date = start_date
    }

    if (end_date !== undefined) {
      updateData.end_date = end_date
    }

    if (start_time !== undefined) {
      updateData.start_time = start_time || null
    }

    if (end_time !== undefined) {
      updateData.end_time = end_time || null
    }

    if (max_students !== undefined) {
      updateData.max_students = max_students || null
    }

    if (current_students !== undefined) {
      updateData.current_students = current_students
    }

    if (price_override !== undefined) {
      updateData.price_override = price_override || null
    }

    if (age_min !== undefined) {
      updateData.age_min = age_min || null
    }

    if (age_max !== undefined) {
      updateData.age_max = age_max || null
    }

    if (target_grades !== undefined) {
      updateData.target_grades = target_grades || null
    }

    if (session_count !== undefined) {
      updateData.session_count = session_count || null
    }

    if (duration_hours !== undefined) {
      updateData.duration_hours = duration_hours || null
    }

    if (duration_days !== undefined) {
      updateData.duration_days = duration_days || null
    }

    if (days_of_week !== undefined) {
      updateData.days_of_week = days_of_week || null
    }

    if (status !== undefined) {
      updateData.status = status
    }

    if (notes !== undefined) {
      updateData.notes = notes || null
    }

    if (is_active !== undefined) {
      updateData.is_active = is_active
    }

    const { data, error } = await supabaseAdmin
      .from("blaze_instance")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        program:blaze_program(
          id,
          name,
          display_name,
          category_id,
          franchise_id
        ),
        offering:blaze_offering(
          id,
          name,
          slug,
          description,
          base_price,
          currency,
          poster_url,
          status,
          offering_type_id,
          offering_type:blaze_offering_type(
            id,
            code,
            name
          )
        ),
        category:blaze_category(
          id,
          name,
          display_name,
          franchise_id
        ),
        franchise:blaze_franchise(
          id,
          code,
          name
        ),
        campus:blaze_campus(
          id,
          name,
          display_name,
          address,
          city,
          state
        )
      `)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Instance not found" }, { status: 404 })
      }
      console.error("Error updating instance:", error)
      return NextResponse.json(
        { error: error.message || "Failed to update instance" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error("Error updating instance:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update instance" },
      { status: 500 }
    )
  }
}

// 删除 instance
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

    // 检查是否有学生注册（通过 current_students）
    const { data: instance, error: instanceError } = await supabaseAdmin
      .from("blaze_instance")
      .select("id, current_students")
      .eq("id", id)
      .single()

    if (instanceError) {
      if (instanceError.code === 'PGRST116') {
        return NextResponse.json({ error: "Instance not found" }, { status: 404 })
      }
      throw new Error(instanceError.message)
    }

    if (instance && instance.current_students > 0) {
      // 如果有学生注册，只设置为 inactive，不删除
      const { error: updateError } = await supabaseAdmin
        .from("blaze_instance")
        .update({ is_active: false })
        .eq("id", id)

      if (updateError) {
        throw new Error(updateError.message)
      }

      return NextResponse.json(
        { message: "Instance deactivated successfully (has enrolled students)" },
        { status: 200 }
      )
    }

    // 如果没有学生注册，可以删除
    const { error } = await supabaseAdmin
      .from("blaze_instance")
      .delete()
      .eq("id", id)

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Instance not found" }, { status: 404 })
      }
      console.error("Error deleting instance:", error)
      return NextResponse.json(
        { error: error.message || "Failed to delete instance" },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: "Instance deleted successfully" }, { status: 200 })
  } catch (error: any) {
    console.error("Error deleting instance:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete instance" },
      { status: 500 }
    )
  }
}
