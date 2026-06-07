import { NextResponse } from "next/server"
import {getErrorMessage, type StringKeyRecord} from "@/lib/typed-error"
import { supabaseAdmin } from "@/lib/supabase"
import { normalizeRemoteImageUrl } from "@/lib/normalize-image-url"
import {
  catalogCols,
  catalogFrom,
  catalogSelect,
  catalogTables,
  isMissingSessionPortalColumnError,
  resolveCatalogCategoryFromRow,
} from "@/lib/catalog-db"

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

function resolvePortalServiceRole(row: InstanceV2Row): string | null {
  const direct = row.portal_service_role
  if (typeof direct === "string" && direct.trim()) return direct.trim()
  const offering = asRecord(Array.isArray(row.offering) ? row.offering[0] : row.offering)
  const typeConfig = asRecord(offering?.type_config_data)
  const raw = typeConfig?.portal_service_role
  return typeof raw === "string" && raw.trim() ? raw.trim() : null
}

function resolveIsCourseType(row: InstanceV2Row, offeringTypeCode: string | null): boolean {
  if (typeof row.is_course_type === "boolean") return row.is_course_type
  const offering = asRecord(Array.isArray(row.offering) ? row.offering[0] : row.offering)
  const typeConfig = asRecord(offering?.type_config_data)
  const portalConfig = asRecord(typeConfig?.portal_config)
  if (typeof portalConfig?.is_course_type === "boolean") return portalConfig.is_course_type
  if (offeringTypeCode === "course") return portalConfig?.is_course_type !== false
  return !!portalConfig?.is_course_type
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

    console.log(`[${catalogTables.session}] Request params:`, { categoryId, locationCode, offeringTypeParam, portalServiceRole })

    let franchiseId: string | null = null
    if (locationCode) {
      const { data: f, error: fErr } = await catalogFrom("campus")
        .select("id")
        .eq("code", locationCode.toLowerCase())
        .eq("is_active", true)
        .maybeSingle()
      franchiseId = f?.id ?? null
      console.log(`[${catalogTables.session}] Franchise lookup by code:`, { locationCode, franchiseId, error: fErr?.message })
    }

    // v2_instance: select both table columns (start_date, end_date, etc.) and instance_data_ext; prefer table columns when present
    // C-end programs page: only show course-type instances (is_course_type = true)
    let query = catalogFrom("session")
      .select(catalogSelect.publicInstancesCatalog({ includePortalFields: true }))
      .eq("is_active", true)
      .in("status", ["scheduled", "ongoing"])

    if (franchiseId) {
      query = query.eq(`program.${catalogCols.series.campusId}`, franchiseId)
    }
    if (portalServiceRole) {
      query = query.eq("portal_service_role", portalServiceRole)
    }

    let { data: rows, error } = await query

    if (error && isMissingSessionPortalColumnError(error)) {
      console.warn(
        `[${catalogTables.session}] is_course_type/portal_service_role missing — run v3/17_v3_session_portal_columns.sql in Supabase SQL Editor`
      )
      let fallbackQuery = catalogFrom("session")
        .select(catalogSelect.publicInstancesCatalog({ includePortalFields: false }))
        .eq("is_active", true)
        .in("status", ["scheduled", "ongoing"])
      if (franchiseId) {
        fallbackQuery = fallbackQuery.eq(`program.${catalogCols.series.campusId}`, franchiseId)
      }
      ;({ data: rows, error } = await fallbackQuery)
    }

    console.log(`[${catalogTables.session}] Supabase response:`, {
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
      console.error(`[${catalogTables.session}] Error:`, error)
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
    let list: InstanceV2Row[] = (rows || []) as unknown as InstanceV2Row[]
    if (portalServiceRole) {
      list = list.filter((row) => resolvePortalServiceRole(row) === portalServiceRole)
    } else if (offeringTypeParam === "all") {
      list = list.filter((row) => !resolvePortalServiceRole(row))
    } else if (offeringTypeParam) {
      list = list.filter((row) => getOfferingTypeCode(row) === offeringTypeParam)
    } else {
      list = list.filter((row) => resolveIsCourseType(row, getOfferingTypeCode(row)))
    }
    if (categoryId) {
      list = list.filter((row) => {
        const program = asRecord(Array.isArray(row.program) ? row.program[0] : row.program)
        const offering = asRecord(Array.isArray(row.offering) ? row.offering[0] : row.offering)
        const cat = resolveCatalogCategoryFromRow(program, offering)
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
      const { count: instanceCount } = await supabaseAdmin.from(catalogTables.session).select("*", { count: "exact", head: true })
      console.log(`[${catalogTables.session}] No rows returned. Diagnostic (v2_instance only): total count=`, instanceCount, "filter: categoryId=", categoryId, "franchiseId=", franchiseId, "portal_service_role=", portalServiceRole)
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
      const catalogCategory = resolveCatalogCategoryFromRow(program, offering)
      if (!catalogCategory?.id || typeof catalogCategory.id !== "string") continue
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
      const programKey = `${programId}:${catalogCategory.id}`
      if (!franchiseData.programs.has(programKey)) {
        franchiseData.programs.set(programKey, {
          id: programId,
          name: String(program.name ?? ""),
          display_name: String(program.display_name ?? program.name ?? ""),
          description:
            typeof program.description === "string" ? program.description : undefined,
          category: {
            id: catalogCategory.id as string,
            name: String(catalogCategory.name ?? ""),
            display_name: String(catalogCategory.display_name ?? catalogCategory.name ?? ""),
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

    console.log(`[${catalogTables.session}] Result:`, {
      franchiseMapSize: franchiseMap.size,
      franchisesCount: franchises.length,
      programsPerFranchise: franchises.map((f) => ({ code: f.code, programs: f.programs.length, instances: f.programs.reduce((s, p) => s + p.instances.length, 0) })),
    })

    return NextResponse.json({ franchises }, { status: 200 })
  } catch (err: unknown) {
    console.error(`[${catalogTables.session}] Error:`, err)
    return NextResponse.json(
      { error: err instanceof Error ? getErrorMessage(err) : "Failed to fetch instances" },
      { status: 500 }
    )
  }
}
