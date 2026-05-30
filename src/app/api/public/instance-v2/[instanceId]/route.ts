import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { extractIsoDatePart } from "@/lib/format-calendar-date"
import { filterInstanceDataExtByDisplayScope } from "@/lib/instance-schema"

/** v2_instance DATE columns: expose YYYY-MM-DD only (no timezone shift on clients). */
function normalizeInstanceDateColumn(value: unknown): string | null {
  return extractIsoDatePart(value == null ? undefined : String(value))
}

/** Filter offering type_config_data by schema display_scope (web or both) for C-end. Top-level only. */
function filterOfferingConfigByDisplayScope(
  schema: { fields?: Record<string, { display_scope?: string }> } | null,
  data: Record<string, unknown> | null
): Record<string, unknown> {
  if (!data || typeof data !== "object") return {}
  if (!schema?.fields || typeof schema.fields !== "object") return data as Record<string, unknown>
  const allowed = new Set(
    Object.entries(schema.fields)
      .filter(([, config]) => {
        const scope = config?.display_scope ?? "admin"
        return scope === "web" || scope === "both"
      })
      .map(([k]) => k)
  )
  return Object.fromEntries(
    Object.entries(data).filter(([k]) => allowed.has(k))
  )
}

/**
 * GET /api/public/instance-v2/[instanceId]
 * Returns a single enrollable instance with offering (type_config_data filtered for web),
 * offering_type, program, franchise, campus. instance_data_ext filtered by instance_schema for web.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ instanceId: string }> }
) {
  try {
    const { instanceId } = await context.params
    if (!instanceId?.trim()) {
      return NextResponse.json({ error: "Missing instance id" }, { status: 400 })
    }

    const { data: row, error } = await supabaseAdmin
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
        amilia_link,
        instance_data_ext,
        program:v2_program(
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
          status,
          type_config_data,
          offering_type_id,
          offering_type:v2_offering_type(
            id,
            code,
            name,
            offering_schema,
            instance_schema
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
      .eq("id", instanceId.trim())
      .eq("is_active", true)
      .in("status", ["scheduled", "ongoing"])
      .maybeSingle()

    if (error) {
      console.error("[Public instance-v2] Error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!row) {
      return NextResponse.json({ error: "Instance not found" }, { status: 404 })
    }

    const program = Array.isArray((row as any).program) ? (row as any).program[0] : (row as any).program
    const offering = Array.isArray((row as any).offering) ? (row as any).offering[0] : (row as any).offering
    const campus = Array.isArray((row as any).campus) ? (row as any).campus[0] : (row as any).campus

    if (!program?.id || !offering?.id || offering.status !== "published") {
      return NextResponse.json({ error: "Instance not found" }, { status: 404 })
    }

    const offeringType = Array.isArray(offering.offering_type)
      ? offering.offering_type[0]
      : offering.offering_type
    const instanceSchema = offeringType?.instance_schema ?? null
    const offeringSchema = offeringType?.offering_schema ?? null

    const extData = (row as any).instance_data_ext ?? {}
    const schedule = extData.schedule && typeof extData.schedule === "object" ? (extData.schedule as Record<string, unknown>) : null
    const capacityPrice = extData.capacity_price && typeof extData.capacity_price === "object" ? (extData.capacity_price as Record<string, unknown>) : null
    const typeConfigData = offering.type_config_data ?? {}
    const portalConfigForPayload =
      typeConfigData && typeof typeConfigData === "object" && typeConfigData !== null && "portal_config" in typeConfigData
        ? (typeConfigData as Record<string, unknown>).portal_config
        : undefined
    const maxStudents = (row as any).max_students ?? extData.max_students ?? capacityPrice?.max_students ?? 0
    const currentStudents = (row as any).current_students ?? 0

    const rowStart = normalizeInstanceDateColumn((row as any).start_date)
    const rowEnd = normalizeInstanceDateColumn((row as any).end_date)

    const payload = {
      id: (row as any).id,
      start_date:
        rowStart ??
        normalizeInstanceDateColumn(extData.start_date) ??
        normalizeInstanceDateColumn(schedule?.start_date) ??
        null,
      end_date:
        rowEnd ??
        normalizeInstanceDateColumn(extData.end_date) ??
        normalizeInstanceDateColumn(schedule?.end_date) ??
        null,
      start_time: (row as any).start_time ?? extData.start_time ?? schedule?.start_time ?? null,
      end_time: (row as any).end_time ?? extData.end_time ?? schedule?.end_time ?? null,
      max_students: maxStudents || null,
      current_students: currentStudents,
      status: (row as any).status,
      price_override: (row as any).price_override ?? extData.price_override ?? capacityPrice?.price_override ?? null,
      amilia_link: (row as any).amilia_link?.trim() || null,
      instance_data_ext: filterInstanceDataExtByDisplayScope(instanceSchema, extData),
      location: campus
        ? {
            id: campus.id,
            name: campus.display_name ?? campus.name,
            address: campus.address,
            city: campus.city,
            state: campus.state,
          }
        : undefined,
      program: {
        id: program.id,
        name: program.name,
        display_name: program.display_name ?? program.name,
        description: program.description ?? undefined,
        category: Array.isArray(program.category) ? program.category[0] : program.category,
        franchise: Array.isArray(program.franchise) ? program.franchise[0] : program.franchise,
      },
      offering: {
        id: offering.id,
        name: offering.name,
        slug: offering.slug ?? undefined,
        poster_url: offering.poster_url ?? undefined,
        type_config_data: filterOfferingConfigByDisplayScope(offeringSchema, typeConfigData),
        /** Always include portal_config for C-end detail page (show_meal_service / show_care_service). Design: INSTANCE_DETAIL_MEAL_CARE_SERVICES_DESIGN */
        portal_config: portalConfigForPayload,
        offering_type: offeringType
          ? { id: offeringType.id, code: offeringType.code, name: offeringType.name, instance_schema: offeringType.instance_schema ?? undefined, offering_schema: offeringType.offering_schema ?? undefined }
          : undefined,
        base_price: offering.base_price ?? typeConfigData.base_price ?? undefined,
        currency: typeConfigData.currency ?? "USD",
      },
      available_spots: Math.max(0, maxStudents - currentStudents),
      is_full: maxStudents > 0 && currentStudents >= maxStudents,
    }

    return NextResponse.json(payload, { status: 200 })
  } catch (err: unknown) {
    console.error("[Public instance-v2] Error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch instance" },
      { status: 500 }
    )
  }
}
