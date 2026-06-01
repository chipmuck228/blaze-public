import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { supabaseAdmin } from "@/lib/supabase"
import { extractIsoDatePart } from "@/lib/format-calendar-date"
import { filterInstanceDataExtByDisplayScope } from "@/lib/instance-schema"
import { unwrapRelation } from "@/lib/supabase-relation"
import type { JsonRecord } from "@/types/json"
import type { V2InstanceDetailRow } from "@/types/v2-instance-detail"

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
      console.error("[v2_instance] Error:", error)
      return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
    }
    if (!row) {
      return NextResponse.json({ error: "Instance not found" }, { status: 404 })
    }

    const instanceRow = row as V2InstanceDetailRow
    const program = unwrapRelation(instanceRow.program)
    const offering = unwrapRelation(instanceRow.offering)
    const campus = unwrapRelation(instanceRow.campus)

    if (!program?.id || !offering?.id || offering.status !== "published") {
      return NextResponse.json({ error: "Instance not found" }, { status: 404 })
    }

    const offeringType = unwrapRelation(offering.offering_type)
    const instanceSchema = offeringType?.instance_schema ?? null
    const offeringSchema = offeringType?.offering_schema ?? null

    const extData: JsonRecord = instanceRow.instance_data_ext ?? {}
    const schedule = extData.schedule && typeof extData.schedule === "object" && !Array.isArray(extData.schedule)
      ? (extData.schedule as Record<string, unknown>)
      : null
    const capacityPrice =
      extData.capacity_price &&
      typeof extData.capacity_price === "object" &&
      !Array.isArray(extData.capacity_price)
        ? (extData.capacity_price as Record<string, unknown>)
        : null
    const typeConfigData = (offering.type_config_data ?? {}) as JsonRecord
    const portalConfigForPayload =
      typeof typeConfigData === "object" && typeConfigData !== null && "portal_config" in typeConfigData
        ? typeConfigData.portal_config
        : undefined
    const maxStudentsRaw = capacityPrice?.max_students
    const maxStudents =
      instanceRow.max_students ??
      (typeof extData.max_students === "number" ? extData.max_students : undefined) ??
      (typeof maxStudentsRaw === "number" ? maxStudentsRaw : 0) ??
      0
    const currentStudents = instanceRow.current_students ?? 0

    const rowStart = normalizeInstanceDateColumn(instanceRow.start_date)
    const rowEnd = normalizeInstanceDateColumn(instanceRow.end_date)

    const payload = {
      id: instanceRow.id,
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
      start_time:
        instanceRow.start_time ??
        (typeof extData.start_time === "string" ? extData.start_time : null) ??
        (typeof schedule?.start_time === "string" ? schedule.start_time : null) ??
        null,
      end_time:
        instanceRow.end_time ??
        (typeof extData.end_time === "string" ? extData.end_time : null) ??
        (typeof schedule?.end_time === "string" ? schedule.end_time : null) ??
        null,
      max_students: maxStudents || null,
      current_students: currentStudents,
      status: instanceRow.status,
      price_override:
        instanceRow.price_override ??
        (typeof extData.price_override === "number" ? extData.price_override : null) ??
        (typeof capacityPrice?.price_override === "number" ? capacityPrice.price_override : null) ??
        null,
      amilia_link: instanceRow.amilia_link?.trim() || null,
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
        category: unwrapRelation(program.category) ?? undefined,
        franchise: unwrapRelation(program.franchise) ?? undefined,
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
    console.error("[v2_instance] Error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? getErrorMessage(err) : "Failed to fetch instance" },
      { status: 500 }
    )
  }
}
