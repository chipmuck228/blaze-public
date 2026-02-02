import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取所有 instances（支持按 programId, offeringId, franchiseId, categoryId 筛选）
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
    const activeOnly = searchParams.get("activeOnly") === "true"

    let query = supabaseAdmin
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
      query = query.eq("franchise_id", franchiseId)
    }

    if (categoryId) {
      query = query.eq("category_id", categoryId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch instances: ${error.message}`)
    }

    return NextResponse.json(data || [], { status: 200 })
  } catch (error: any) {
    console.error("Error fetching instances:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch instances" },
      { status: 500 }
    )
  }
}

// 创建新 instance
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
      start_date,
      end_date,
      start_time,
      end_time,
      max_students,
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

    if (!program_id || !offering_id || !start_date || !end_date) {
      return NextResponse.json(
        { error: "Missing required fields: program_id, offering_id, start_date, end_date" },
        { status: 400 }
      )
    }

    // 验证日期
    if (new Date(start_date) > new Date(end_date)) {
      return NextResponse.json(
        { error: "start_date must be less than or equal to end_date" },
        { status: 400 }
      )
    }

    // 验证 program_id 存在
    const { data: program, error: programError } = await supabaseAdmin
      .from("blaze_program")
      .select("id, category_id, franchise_id")
      .eq("id", program_id)
      .single()

    if (programError || !program) {
      return NextResponse.json(
        { error: "Invalid program_id. Program must exist in blaze_program table." },
        { status: 400 }
      )
    }

    // 验证 offering_id 存在且状态为 published
    const { data: offering, error: offeringError } = await supabaseAdmin
      .from("blaze_offering")
      .select("id, status")
      .eq("id", offering_id)
      .single()

    if (offeringError || !offering) {
      return NextResponse.json(
        { error: "Invalid offering_id. Offering must exist in blaze_offering table." },
        { status: 400 }
      )
    }

    if (offering.status !== 'published') {
      return NextResponse.json(
        { error: "Cannot create instance from non-published offering. Offering status must be 'published'." },
        { status: 400 }
      )
    }

    // 如果提供了 campus_id，验证它存在
    if (campus_id) {
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
      if (campus.franchise_id !== program.franchise_id) {
        return NextResponse.json(
          { error: "campus_id and program_id do not match. Campus must belong to the same franchise as the program." },
          { status: 400 }
        )
      }
    }

    const { data, error } = await supabaseAdmin
      .from("blaze_instance")
      .insert({
        program_id,
        offering_id,
        category_id: program.category_id,
        franchise_id: program.franchise_id,
        campus_id: campus_id || null,
        start_date,
        end_date,
        start_time: start_time || null,
        end_time: end_time || null,
        max_students: max_students || null,
        current_students: 0,
        price_override: price_override || null,
        age_min: age_min || null,
        age_max: age_max || null,
        target_grades: target_grades || null,
        session_count: session_count || null,
        duration_hours: duration_hours || null,
        duration_days: duration_days || null,
        days_of_week: days_of_week || null,
        status: status || 'scheduled',
        notes: notes || null,
        is_active: is_active !== undefined ? is_active : true,
      })
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
      console.error("Error creating instance:", error)
      return NextResponse.json(
        { error: error.message || "Failed to create instance" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error("Error creating instance:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create instance" },
      { status: 500 }
    )
  }
}
