import { NextResponse } from "next/server"
import {getErrorMessage, type StringKeyRecord} from "@/lib/typed-error"
import { supabaseAdmin } from "@/lib/supabase"
import { normalizeRemoteImageUrl } from "@/lib/normalize-image-url"

type InstanceV2Row = Record<string, unknown>

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return undefined
}

function instanceDataExt(row: InstanceV2Row): Record<string, unknown> {
  return asRecord(row.instance_data_ext) ?? {}
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && !Number.isNaN(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value)
    return Number.isNaN(n) ? fallback : n
  }
  return fallback
}

/**
 * GET /api/public/instances-v2?category=xxx&location=yyy&offering_type=camp|course|all&portal_service_role=meal_service|care_service
 * Returns enrollable instances from v2_instance only (instance_v2 已废弃，不再使用).
 * - category: optional v2_category id; filters by offering.category_id (C-end Program), not program.category_id.
 * - location: optional franchise code; when omitted, returns all franchises.
 * - offering_type: optional v2_offering_type.code, or "all" for all catalog types (excludes meal/care service roles). When omitted, defaults to course-type instances only (is_course_type = true).
 * - portal_service_role: optional 'meal_service' | 'care_service'; when set, returns only instances with that role (for detail page Meal/Care blocks). Design: INSTANCE_DETAIL_MEAL_CARE_SERVICES_DESIGN.
 * Shape: { franchises: [ { id, code, name, programs: [ { ..., instances: [...] } ] } ] }
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get("category")?.trim() || null
    const locationCode = searchParams.get("location")?.trim() || searchParams.get("franchise")?.trim() || null
    const offeringTypeParam = searchParams.get("offering_type")?.trim().toLowerCase() || null
    const portalServiceRoleParam = searchParams.get("portal_service_role")?.trim() || null
    const portalServiceRole =
      portalServiceRoleParam === "meal_service" || portalServiceRoleParam === "care_service"
        ? portalServiceRoleParam
        : null

    console.log("[v2_instance] Request params:", { categoryId, locationCode, offeringTypeParam, portalServiceRole })

    let franchiseId: string | null = null
    if (locationCode) {
      const { data: f, error: fErr } = await supabaseAdmin
        .from("v2_franchise")
        .select("id")
        .eq("code", locationCode.toLowerCase())
        .eq("is_active", true)
        .maybeSingle()
      franchiseId = f?.id ?? null
      console.log("[v2_instance] Franchise lookup by code:", { locationCode, franchiseId, error: fErr?.message })
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
        days_of_week,
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
          ),
          offering_type:v2_offering_type(
            id,
            code,
            name
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

    console.log("[v2_instance] Supabase response:", {
      rowsCount: rows?.length ?? 0,
      error: error ? { message: getErrorMessage(error), code: error.code, details: error.details } : null,
      firstRow: rows?.[0]
        ? {
            id: rows[0].id,
            program_id: rows[0].program_id,
            hasProgram: !!rows[0].program,
            hasOffering: !!rows[0].offering,
          }
        : null,
    })

    if (error) {
      console.error("[v2_instance] Error:", error)
      return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
    }

    const getOfferingTypeCode = (row: InstanceV2Row): string | null => {
      const offering = asRecord(Array.isArray(row.offering) ? row.offering[0] : row.offering)
      const ot = asRecord(
        Array.isArray(offering?.offering_type) ? offering.offering_type[0] : offering?.offering_type
      )
      const code = ot?.code
      return typeof code === "string" ? code.toLowerCase() : null
    }

    // C-end: portal_service_role filter for detail-page Meal/Care blocks; otherwise catalog by offering_type param
    let list: InstanceV2Row[] = (rows || []) as InstanceV2Row[]
    if (portalServiceRole) {
      list = list.filter((row) => row?.portal_service_role === portalServiceRole)
    } else if (offeringTypeParam === "all") {
      list = list.filter((row) => !row?.portal_service_role)
    } else if (offeringTypeParam) {
      list = list.filter((row) => getOfferingTypeCode(row) === offeringTypeParam)
    } else {
      list = list.filter((row) => row?.is_course_type === true)
    }
    if (categoryId) {
      list = list.filter((row) => {
        const offering = asRecord(Array.isArray(row.offering) ? row.offering[0] : row.offering)
        const cat = asRecord(
          Array.isArray(offering?.category) ? offering.category[0] : offering?.category
        )
        return cat?.id === categoryId
      })
    }
    const getStart = (row: InstanceV2Row) => {
      const ext = instanceDataExt(row)
      const s = asRecord(ext.schedule)
      const scheduleStart = typeof s?.start_date === "string" ? s.start_date : undefined
      const extStart = typeof ext.start_date === "string" ? ext.start_date : undefined
      const rowStart = typeof row.start_date === "string" ? row.start_date : undefined
      return rowStart ?? extStart ?? scheduleStart ?? ""
    }
    const getStartTime = (row: InstanceV2Row) => {
      const ext = instanceDataExt(row)
      const s = asRecord(ext.schedule)
      const scheduleTime = typeof s?.start_time === "string" ? s.start_time : undefined
      const extTime = typeof ext.start_time === "string" ? ext.start_time : undefined
      const rowTime = typeof row.start_time === "string" ? row.start_time : undefined
      return rowTime ?? extTime ?? scheduleTime ?? ""
    }
    list = list.sort((a, b) => {
      const sa = getStart(a)
      const sb = getStart(b)
      if (sa !== sb) return String(sa).localeCompare(String(sb))
      return String(getStartTime(a)).localeCompare(String(getStartTime(b)))
    })

    if (list.length === 0) {
      const { count: instanceCount } = await supabaseAdmin.from("v2_instance").select("*", { count: "exact", head: true })
      console.log("[v2_instance] No rows returned. Diagnostic (v2_instance only): total count=", instanceCount, "filter: categoryId=", categoryId, "franchiseId=", franchiseId, "portal_service_role=", portalServiceRole)
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
            instances: unknown[]
          }
        >
      }
    >()

    for (const row of list) {
      const program = asRecord(Array.isArray(row.program) ? row.program[0] : row.program)
      if (!program) continue
      const offering = asRecord(Array.isArray(row.offering) ? row.offering[0] : row.offering)
      const campus = asRecord(Array.isArray(row.campus) ? row.campus[0] : row.campus)
      const fr = asRecord(program.franchise)
      if (!fr?.id || typeof fr.id !== "string") continue
      if (!offering || offering.status !== "published") continue
      const offeringCategory = asRecord(
        Array.isArray(offering.category) ? offering.category[0] : offering.category
      )
      if (!offeringCategory?.id || typeof offeringCategory.id !== "string") continue
      const franchiseKey = fr.id as string
      if (!franchiseMap.has(franchiseKey)) {
        franchiseMap.set(franchiseKey, {
          id: franchiseKey,
          code: String(fr.code ?? ""),
          name: String(fr.name ?? ""),
          programs: new Map(),
        })
      }
      const franchiseData = franchiseMap.get(franchiseKey)!
      // Same v2_program can appear under multiple C-end Programs when offerings differ by category
      const programId = String(program.id ?? "")
      const programKey = `${programId}:${offeringCategory.id}`
      if (!franchiseData.programs.has(programKey)) {
        franchiseData.programs.set(programKey, {
          id: programId,
          name: String(program.name ?? ""),
          display_name: String(program.display_name ?? program.name ?? ""),
          description:
            typeof program.description === "string" ? program.description : undefined,
          category: {
            id: offeringCategory.id as string,
            name: String(offeringCategory.name ?? ""),
            display_name: String(offeringCategory.display_name ?? offeringCategory.name ?? ""),
          },
          instances: [],
        })
      }
      const programData = franchiseData.programs.get(programKey)!
      const extData = instanceDataExt(row)
      const schedule = asRecord(extData.schedule) ?? null
      const capacityPrice = asRecord(extData.capacity_price) ?? null
      const audience = asRecord(extData.audience) ?? null
      const maxStudents = asNumber(
        row.max_students,
        asNumber(extData.max_students, asNumber(capacityPrice?.max_students, 0))
      )
      const currentStudents = asNumber(row.current_students, 0)
      const targetGrades = audience?.target_grades ?? extData.target_grades
      const gradeLevel = Array.isArray(targetGrades) && targetGrades.length > 0 ? targetGrades[0] : null
      const rawDaysOfWeek =
        row.days_of_week ??
        (schedule && typeof schedule === "object" ? (schedule as { days_of_week?: unknown[] }).days_of_week : null)
      const daysOfWeek = Array.isArray(rawDaysOfWeek)
        ? rawDaysOfWeek
            .map((d: unknown) => (typeof d === "string" ? parseInt(d, 10) : Number(d)))
            .filter((d: number) => !Number.isNaN(d))
            .sort((a: number, b: number) => a - b)
        : []
      programData.instances.push({
        id: String(row.id ?? ""),
        start_date:
          (typeof row.start_date === "string" ? row.start_date : null) ??
          (typeof extData.start_date === "string" ? extData.start_date : null) ??
          (typeof schedule?.start_date === "string" ? schedule.start_date : null),
        end_date:
          (typeof row.end_date === "string" ? row.end_date : null) ??
          (typeof extData.end_date === "string" ? extData.end_date : null) ??
          (typeof schedule?.end_date === "string" ? schedule.end_date : null),
        start_time:
          (typeof row.start_time === "string" ? row.start_time : null) ??
          (typeof extData.start_time === "string" ? extData.start_time : null) ??
          (typeof schedule?.start_time === "string" ? schedule.start_time : null),
        end_time:
          (typeof row.end_time === "string" ? row.end_time : null) ??
          (typeof extData.end_time === "string" ? extData.end_time : null) ??
          (typeof schedule?.end_time === "string" ? schedule.end_time : null),
        max_students: maxStudents || null,
        current_students: currentStudents,
        status: row.status,
        price_override: row.price_override,
        days_of_week: daysOfWeek.length > 0 ? daysOfWeek : undefined,
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
          poster_url: normalizeRemoteImageUrl(
            typeof offering.poster_url === "string" ? offering.poster_url : null
          ),
        },
        offering: offering
          ? {
              id: offering.id,
              name: offering.name,
              description:
                typeof offering.description === "string" ? offering.description : null,
              poster_url: normalizeRemoteImageUrl(
                typeof offering.poster_url === "string" ? offering.poster_url : null
              ),
              base_price: offering.base_price,
              offering_type: (() => {
                const ot = asRecord(
                  Array.isArray(offering.offering_type)
                    ? offering.offering_type[0]
                    : offering.offering_type
                )
                return ot
                  ? {
                      id: ot.id,
                      code: ot.code,
                      name: ot.name,
                    }
                  : undefined
              })(),
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

    console.log("[v2_instance] Result:", {
      franchiseMapSize: franchiseMap.size,
      franchisesCount: franchises.length,
      programsPerFranchise: franchises.map((f) => ({ code: f.code, programs: f.programs.length, instances: f.programs.reduce((s, p) => s + p.instances.length, 0) })),
    })

    return NextResponse.json({ franchises }, { status: 200 })
  } catch (err: unknown) {
    console.error("[v2_instance] Error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? getErrorMessage(err) : "Failed to fetch instances" },
      { status: 500 }
    )
  }
}
