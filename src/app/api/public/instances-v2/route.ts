import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * GET /api/public/instances-v2?category=xxx&location=yyy&portal_service_role=meal_service|care_service
 * Returns enrollable instances from v2_instance only (instance_v2 已废弃，不再使用).
 * - category: optional v2_category id; filters by offering.category_id (C-end Program), not program.category_id.
 * - location: optional franchise code; when omitted, returns all franchises.
 * - portal_service_role: optional 'meal_service' | 'care_service'; when set, returns only instances with that role (for detail page Meal/Care blocks). Design: INSTANCE_DETAIL_MEAL_CARE_SERVICES_DESIGN.
 * Shape: { franchises: [ { id, code, name, programs: [ { ..., instances: [...] } ] } ] }
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get("category")?.trim() || null
    const locationCode = searchParams.get("location")?.trim() || searchParams.get("franchise")?.trim() || null
    const portalServiceRoleParam = searchParams.get("portal_service_role")?.trim() || null
    const portalServiceRole =
      portalServiceRoleParam === "meal_service" || portalServiceRoleParam === "care_service"
        ? portalServiceRoleParam
        : null

    console.log("[Public instances-v2] Request params:", { categoryId, locationCode, portalServiceRole })

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
        portal_service_role,
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
        offering:v2_offering!inner(
          id,
          name,
          slug,
          description,
          base_price,
          poster_url,
          status,
          category_id,
          category:v2_category(
            id,
            name,
            display_name
          )
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

    if (franchiseId) {
      query = query.eq("program.franchise_id", franchiseId)
    }
    if (portalServiceRole) {
      query = query.eq("portal_service_role", portalServiceRole)
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

    // C-end: when portal_service_role filter is set, return those instances; otherwise only show course-type instances (design: PORTAL_OFFERING_TYPE_DESIGN, INSTANCE_DETAIL_MEAL_CARE_SERVICES_DESIGN)
    let list = (rows || []) as any[]
    if (portalServiceRole) {
      list = list.filter((row: any) => row?.portal_service_role === portalServiceRole)
    } else {
      list = list.filter((row: any) => row?.is_course_type === true)
    }
    if (categoryId) {
      list = list.filter((row: any) => {
        const offering = Array.isArray(row.offering) ? row.offering[0] : row.offering
        const cat = Array.isArray(offering?.category) ? offering.category[0] : offering?.category
        return cat?.id === categoryId
      })
    }
    const getStart = (row: any) => {
      const ext = row?.instance_data_ext
      const s = ext?.schedule
      return row?.start_date ?? ext?.start_date ?? (s && typeof s === "object" ? s.start_date : undefined) ?? ""
    }
    const getStartTime = (row: any) => {
      const ext = row?.instance_data_ext
      const s = ext?.schedule
      return row?.start_time ?? ext?.start_time ?? (s && typeof s === "object" ? s.start_time : undefined) ?? ""
    }
    list = list.sort((a, b) => {
      const sa = getStart(a)
      const sb = getStart(b)
      if (sa !== sb) return String(sa).localeCompare(String(sb))
      return String(getStartTime(a)).localeCompare(String(getStartTime(b)))
    })

    if (list.length === 0) {
      const { count: instanceCount } = await supabaseAdmin.from("v2_instance").select("*", { count: "exact", head: true })
      console.log("[Public instances-v2] No rows returned. Diagnostic (v2_instance only): total count=", instanceCount, "filter: categoryId=", categoryId, "franchiseId=", franchiseId, "portal_service_role=", portalServiceRole)
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
      const offeringCategory = Array.isArray(offering.category)
        ? offering.category[0]
        : offering.category
      if (!offeringCategory?.id) continue
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
      // Same v2_program can appear under multiple C-end Programs when offerings differ by category
      const programKey = `${program.id}:${offeringCategory.id}`
      if (!franchiseData.programs.has(programKey)) {
        franchiseData.programs.set(programKey, {
          id: program.id,
          name: program.name ?? "",
          display_name: program.display_name ?? program.name ?? "",
          description: program.description ?? undefined,
          category: {
            id: offeringCategory.id,
            name: offeringCategory.name ?? "",
            display_name: offeringCategory.display_name ?? offeringCategory.name ?? "",
          },
          instances: [],
        })
      }
      const programData = franchiseData.programs.get(programKey)!
      const extData = row.instance_data_ext ?? {}
      const schedule = extData.schedule && typeof extData.schedule === "object" ? extData.schedule : null
      const capacityPrice = extData.capacity_price && typeof extData.capacity_price === "object" ? extData.capacity_price : null
      const audience = extData.audience && typeof extData.audience === "object" ? extData.audience : null
      const maxStudents = row.max_students ?? extData.max_students ?? capacityPrice?.max_students ?? 0
      const currentStudents = row.current_students ?? 0
      const targetGrades = audience?.target_grades ?? extData.target_grades
      const gradeLevel = Array.isArray(targetGrades) && targetGrades.length > 0 ? targetGrades[0] : null
      programData.instances.push({
        id: row.id,
        start_date: row.start_date ?? extData.start_date ?? schedule?.start_date ?? null,
        end_date: row.end_date ?? extData.end_date ?? schedule?.end_date ?? null,
        start_time: row.start_time ?? extData.start_time ?? schedule?.start_time ?? null,
        end_time: row.end_time ?? extData.end_time ?? schedule?.end_time ?? null,
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
