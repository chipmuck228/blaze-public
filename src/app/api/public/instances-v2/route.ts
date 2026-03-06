import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * GET /api/public/instances-v2?category=xxx&location=yyy
 * Returns enrollable instances from v2_instance / v2_program / v2_offering.
 * - category: optional v2_category id; when omitted, returns instances from all categories.
 * - location: optional franchise code; when omitted, returns all franchises.
 * Shape: { franchises: [ { id, code, name, programs: [ { ..., instances: [...] } ] } ] }
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get("category")?.trim() || null
    const locationCode = searchParams.get("location")?.trim() || searchParams.get("franchise")?.trim() || null

    console.log("[Public instances-v2] Request params:", { categoryId, locationCode })

    let franchiseId: string | null = null
    if (locationCode) {
      const { data: f, error: fErr } = await supabaseAdmin
        .from("v2_franchise")
        .select("id")
        .eq("code", locationCode.toLowerCase())
        .eq("is_active", true)
        .maybeSingle()
      franchiseId = f?.id ?? null
      console.log("[Public instances-v2] Franchise lookup by code:", { locationCode, franchiseId, error: fErr?.message })
    }

    // v2_instance: select both table columns (start_date, end_date, etc.) and instance_data_ext; prefer table columns when present
    // C-end programs page: only show course-type instances (is_course_type = true)
    let query = supabaseAdmin
      .from("v2_instance")
      .select(
        `
        id,
        program_id,
        offering_id,
        campus_id,
        status,
        price_override,
        current_students,
        start_date,
        end_date,
        start_time,
        end_time,
        max_students,
        is_course_type,
        instance_data_ext,
        program:v2_program!inner(
          id,
          name,
          display_name,
          description,
          category_id,
          franchise_id,
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
          poster_url,
          status
        ),
        campus:v2_campus(
          id,
          name,
          display_name,
          address,
          city,
          state
        )
      `
      )
      .eq("is_active", true)
      .in("status", ["scheduled", "ongoing"])

    if (categoryId) {
      query = query.eq("program.category_id", categoryId)
    }
    if (franchiseId) {
      query = query.eq("program.franchise_id", franchiseId)
    }

    const { data: rows, error } = await query

    console.log("[Public instances-v2] Supabase response:", {
      rowsCount: rows?.length ?? 0,
      error: error ? { message: error.message, code: error.code, details: error.details } : null,
      firstRow: rows?.[0] ? { id: (rows[0] as any).id, program_id: (rows[0] as any).program_id, hasProgram: !!(rows[0] as any).program, hasOffering: !!(rows[0] as any).offering } : null,
    })

    if (error) {
      console.error("[Public instances-v2] Error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // C-end: only show course-type instances (design: PORTAL_OFFERING_TYPE_DESIGN)
    let list = ((rows || []) as any[]).filter((row: any) => row?.is_course_type === true)
    const getStart = (row: any) => row?.start_date ?? row?.instance_data_ext?.start_date ?? ""
    const getStartTime = (row: any) => row?.start_time ?? row?.instance_data_ext?.start_time ?? ""
    list = list.sort((a, b) => {
      const sa = getStart(a)
      const sb = getStart(b)
      if (sa !== sb) return String(sa).localeCompare(String(sb))
      return String(getStartTime(a)).localeCompare(String(getStartTime(b)))
    })

    if (list.length === 0) {
      const { count: instanceCount } = await supabaseAdmin.from("v2_instance").select("*", { count: "exact", head: true })
      console.log("[Public instances-v2] No rows returned. Diagnostic: v2_instance total count:", instanceCount, "filter: categoryId=", categoryId, "franchiseId=", franchiseId)
    }

    const franchiseMap = new Map<
      string,
      {
        id: string
        code: string
        name: string
        programs: Map<
          string,
          {
            id: string
            name: string
            display_name: string
            description?: string
            category: { id: string; name: string; display_name: string }
            instances: any[]
          }
        >
      }
    >()

    for (const row of list) {
      const program = Array.isArray(row.program) ? row.program[0] : row.program
      const offering = Array.isArray(row.offering) ? row.offering[0] : row.offering
      const campus = Array.isArray(row.campus) ? row.campus[0] : row.campus
      if (!program?.franchise?.id) continue
      if (!offering || offering.status !== "published") continue
      const fr = program.franchise
      const franchiseKey = fr.id
      if (!franchiseMap.has(franchiseKey)) {
        franchiseMap.set(franchiseKey, {
          id: fr.id,
          code: fr.code ?? "",
          name: fr.name ?? "",
          programs: new Map(),
        })
      }
      const franchiseData = franchiseMap.get(franchiseKey)!
      const programKey = program.id
      if (!franchiseData.programs.has(programKey)) {
        const cat = Array.isArray(program.category) ? program.category[0] : program.category
        franchiseData.programs.set(programKey, {
          id: program.id,
          name: program.name ?? "",
          display_name: program.display_name ?? program.name ?? "",
          description: program.description ?? undefined,
          category: {
            id: cat?.id ?? "",
            name: cat?.name ?? "",
            display_name: cat?.display_name ?? cat?.name ?? "",
          },
          instances: [],
        })
      }
      const programData = franchiseData.programs.get(programKey)!
      const extData = row.instance_data_ext ?? {}
      const maxStudents = row.max_students ?? extData.max_students ?? 0
      const currentStudents = row.current_students ?? 0
      const targetGrades = extData.target_grades
      const gradeLevel = Array.isArray(targetGrades) && targetGrades.length > 0 ? targetGrades[0] : null
      programData.instances.push({
        id: row.id,
        start_date: row.start_date ?? extData.start_date ?? null,
        end_date: row.end_date ?? extData.end_date ?? null,
        start_time: row.start_time ?? extData.start_time ?? null,
        end_time: row.end_time ?? extData.end_time ?? null,
        max_students: maxStudents || null,
        current_students: currentStudents,
        status: row.status,
        price_override: row.price_override,
        location: campus
          ? {
              id: campus.id,
              name: campus.display_name ?? campus.name,
              address: campus.address,
              city: campus.city,
              state: campus.state,
            }
          : undefined,
        course: {
          id: offering?.id,
          name: offering?.name,
          slug: offering?.slug,
          description: offering?.description,
          grade_level: gradeLevel,
          target_grades: Array.isArray(targetGrades) ? targetGrades : null,
          age_min: extData.age_min ?? null,
          age_max: extData.age_max ?? null,
          base_price: offering?.base_price,
          poster_url: offering?.poster_url ?? null,
        },
        offering: offering
          ? {
              id: offering.id,
              name: offering.name,
              poster_url: offering.poster_url ?? null,
              base_price: offering.base_price,
            }
          : undefined,
        available_spots: Math.max(0, maxStudents - currentStudents),
        is_full: maxStudents > 0 && currentStudents >= maxStudents,
      })
    }

    const franchises = Array.from(franchiseMap.values())
      .map((f) => ({
        id: f.id,
        code: f.code,
        name: f.name,
        programs: Array.from(f.programs.values()).filter((p) => p.instances.length > 0),
      }))
      .filter((f) => f.programs.length > 0)

    console.log("[Public instances-v2] Result:", {
      franchiseMapSize: franchiseMap.size,
      franchisesCount: franchises.length,
      programsPerFranchise: franchises.map((f) => ({ code: f.code, programs: f.programs.length, instances: f.programs.reduce((s, p) => s + p.instances.length, 0) })),
    })

    return NextResponse.json({ franchises }, { status: 200 })
  } catch (err: unknown) {
    console.error("[Public instances-v2] Error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch instances" },
      { status: 500 }
    )
  }
}
