/**
 * Catalog database abstraction — switch v2/v3 tables via CATALOG_SCHEMA env.
 * Default: v2 (production-safe). Set CATALOG_SCHEMA=v3 after migration + validation.
 *
 * @see v3/README.md
 * @see scripts/validate-v3-migration.js
 */

import { supabaseAdmin } from "@/lib/supabase"

export type CatalogSchemaVersion = "v2" | "v3"

export function getCatalogSchema(): CatalogSchemaVersion {
  const raw =
    process.env.CATALOG_SCHEMA?.trim().toLowerCase() ||
    process.env.NEXT_PUBLIC_CATALOG_SCHEMA?.trim().toLowerCase()
  return raw === "v3" ? "v3" : "v2"
}

export function isCatalogV3(): boolean {
  return getCatalogSchema() === "v3"
}

/** Supabase table names for catalog entities */
export const catalogTables = {
  get offeringType() {
    return isCatalogV3() ? "v3_offering_type" : "v2_offering_type"
  },
  get stage() {
    return isCatalogV3() ? "v3_stage" : "v2_category"
  },
  get campus() {
    return isCatalogV3() ? "v3_campus" : "v2_franchise"
  },
  get offering() {
    return isCatalogV3() ? "v3_offering" : "v2_offering"
  },
  get campusStageMap() {
    return isCatalogV3() ? "v3_campus_stage_map" : "v2_franchise_category_map"
  },
  get location() {
    return isCatalogV3() ? "v3_location" : "v2_campus"
  },
  get series() {
    return isCatalogV3() ? "v3_series" : "v2_program"
  },
  get session() {
    return isCatalogV3() ? "v3_session" : "v2_instance"
  },
  get resourceCategory() {
    return isCatalogV3() ? "v3_resource_category" : "v2_resource_category"
  },
  get resource() {
    return isCatalogV3() ? "v3_resource" : "v2_resource"
  },
} as const

export type CatalogTableKey = keyof typeof catalogTables

/** Supabase .from() for runtime v2/v3 table names — avoids GenericStringError on query results */
export function catalogFrom(table: CatalogTableKey) {
  // Dynamic table + select strings; cast to any so TS does not infer ParserError/GenericStringError
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabaseAdmin.from(catalogTables[table] as any) as any
}

/** FK column names that differ between v2 and v3 */
export const catalogCols = {
  series: {
    get campusId() {
      return isCatalogV3() ? "campus_id" : "franchise_id"
    },
    get stageId() {
      return isCatalogV3() ? "stage_id" : "category_id"
    },
  },
  session: {
    get seriesId() {
      return isCatalogV3() ? "series_id" : "program_id"
    },
    get locationId() {
      return isCatalogV3() ? "location_id" : "campus_id"
    },
  },
  location: {
    get campusId() {
      return isCatalogV3() ? "campus_id" : "franchise_id"
    },
  },
  campusStageMap: {
    get campusId() {
      return isCatalogV3() ? "campus_id" : "franchise_id"
    },
    get stageId() {
      return isCatalogV3() ? "stage_id" : "category_id"
    },
  },
  offering: {
    /** v3 has no stage/category FK on offering */
    get stageId() {
      return isCatalogV3() ? null : "category_id"
    },
  },
} as const

/** PostgREST embed: series → parent campus/franchise (v3 uses campus_id FK) */
export function seriesFranchiseEmbed(fields: string): string {
  const campus = catalogTables.campus
  if (isCatalogV3()) {
    return `franchise:${campus}!campus_id(${fields})`
  }
  return `franchise:${campus}(${fields})`
}

/** PostgREST embed: session → physical location (v3 uses location_id FK; alias campus kept for API) */
export function sessionLocationEmbed(fields: string): string {
  const loc = catalogTables.location
  if (isCatalogV3()) {
    return `campus:${loc}!location_id(${fields})`
  }
  return `campus:${loc}(${fields})`
}

/** C-end Program (stage/category) for grouping — v3 from series.stage, v2 from offering.category */
export function resolveCatalogCategoryFromRow(
  program: Record<string, unknown> | undefined,
  offering: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!program && !offering) return undefined
  if (isCatalogV3()) {
    const cat = program?.category
    return (Array.isArray(cat) ? cat[0] : cat) as Record<string, unknown> | undefined
  }
  const cat = offering?.category
  return (Array.isArray(cat) ? cat[0] : cat) as Record<string, unknown> | undefined
}

/** PostgREST embed aliases — v2 names kept in API responses where noted */
export const catalogSelect = {
  seriesWithRelations(): string {
    const t = catalogTables
    if (isCatalogV3()) {
      return `
        *,
        category:v3_stage(id, name, display_name, description, poster_url, is_active, link),
        ${seriesFranchiseEmbed("id, code, name, is_active")}
      `
    }
    return `
      *,
      category:v2_category(id, name, display_name, description, poster_url, is_active, link),
      franchise:v2_franchise(id, code, name, is_active)
    `
  },

  offeringWithRelations(): string {
    const t = catalogTables
    if (isCatalogV3()) {
      return `
        *,
        offering_type:v3_offering_type(
          id, code, name, description, icon, color, is_active, offering_schema, instance_schema
        )
      `
    }
    return `
      *,
      offering_type:v2_offering_type(
        id, code, name, description, icon, color, is_active, offering_schema, instance_schema
      ),
      category:v2_category(id, name, display_name)
    `
  },

  sessionWithRelations(): string {
    if (isCatalogV3()) {
      return `
        *,
        program:v3_series(
          id, name, display_name, campus_id, stage_id,
          ${seriesFranchiseEmbed("id, code, name")},
          category:v3_stage(id, name, display_name)
        ),
        offering:v3_offering(
          id, name, slug, base_price, currency, poster_url, status, type_config_data,
          offering_type:v3_offering_type(id, code, name, instance_schema)
        ),
        ${sessionLocationEmbed("id, name, display_name, address, city, state")}
      `
    }
    return `
      *,
      program:v2_program(
        id, name, display_name, franchise_id, category_id,
        franchise:v2_franchise(id, code, name),
        category:v2_category(id, name, display_name)
      ),
      offering:v2_offering(
        id, name, slug, base_price, currency, poster_url, status, type_config_data, category_id,
        offering_type:v2_offering_type(id, code, name, instance_schema)
      ),
      campus:v2_campus(id, name, display_name, address, city, state)
    `
  },

  campusStageMapWithStage(): string {
    if (isCatalogV3()) {
      return `
        *,
        category:v3_stage(id, name, display_name, description, poster_url, link, is_active, display_order, config_base)
      `
    }
    return `
      *,
      category:v2_category(id, name, display_name, description, poster_url, link, is_active, display_order, config_base)
    `
  },

  featuredSession(options?: { includeSeriesPoster?: boolean }): string {
    const seriesPoster =
      options?.includeSeriesPoster === false
        ? ""
        : `
          poster_url,`
    if (isCatalogV3()) {
      return `
        id,
        start_date,
        start_time,
        location_id,
        ${sessionLocationEmbed("id, name, display_name")},
        program:v3_series!inner(
          id,
          name,
          display_name,
          description,${seriesPoster}
          campus_id,
          category:v3_stage(
            id,
            name,
            display_name
          ),
          ${seriesFranchiseEmbed("id, code, name, is_active")}
        ),
        offering:v3_offering(
          id,
          name,
          description,
          poster_url,
          status
        )
      `
    }
    return `
      id,
      start_date,
      start_time,
      campus_id,
      campus:v2_campus(
        id,
        name,
        display_name
      ),
      program:v2_program!inner(
        id,
        name,
        display_name,
        description,
        poster_url,
        franchise_id,
        category:v2_category(
          id,
          name,
          display_name
        ),
        franchise:v2_franchise(
          id,
          code,
          name,
          is_active
        )
      ),
      offering:v2_offering(
        id,
        name,
        description,
        poster_url,
        status,
        category:v2_category(
          id,
          name,
          display_name
        )
      )
    `
  },

  /** GET /api/public/instances-v2 catalog query */
  publicInstancesCatalog(options?: { includePortalFields?: boolean }): string {
    const t = catalogTables
    const portalFields =
      options?.includePortalFields === false
        ? ""
        : `
        is_course_type,
        portal_service_role,`
    const offeringTypeConfig =
      options?.includePortalFields === false
        ? `
          type_config_data,`
        : ""
    if (isCatalogV3()) {
      return `
        id,
        series_id,
        offering_id,
        location_id,
        status,
        price_override,
        current_students,
        start_date,
        end_date,
        start_time,
        end_time,
        max_students,${portalFields}
        days_of_week,
        instance_data_ext,
        program:${t.series}!inner(
          id,
          name,
          display_name,
          description,
          stage_id,
          campus_id,
          category:${t.stage}(
            id,
            name,
            display_name
          ),
          ${seriesFranchiseEmbed("id, code, name")}
        ),
        offering:${t.offering}!inner(
          id,
          name,
          slug,
          description,
          base_price,
          poster_url,
          status,${offeringTypeConfig}
          offering_type:${t.offeringType}(
            id,
            code,
            name
          )
        ),
        ${sessionLocationEmbed("id, name, display_name, address, city, state")}
      `
    }
    return `
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
      max_students,${portalFields}
      days_of_week,
      instance_data_ext,
      program:${t.series}!inner(
        id,
        name,
        display_name,
        description,
        category_id,
        franchise_id,
        category:${t.stage}(
          id,
          name,
          display_name
        ),
        franchise:${t.campus}(
          id,
          code,
          name
        )
      ),
      offering:${t.offering}!inner(
        id,
        name,
        slug,
        description,
        base_price,
        poster_url,
        status,
        category_id,${offeringTypeConfig}
        category:${t.stage}(
          id,
          name,
          display_name
        ),
        offering_type:${t.offeringType}(
          id,
          code,
          name
        )
      ),
      campus:${t.location}(
        id,
        name,
        display_name,
        address,
        city,
        state
      )
    `
  },

  /** GET /api/public/instance-v2/[id] detail query */
  publicInstanceDetail(): string {
    const t = catalogTables
    if (isCatalogV3()) {
      return `
        id,
        series_id,
        offering_id,
        location_id,
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
        program:${t.series}(
          id,
          name,
          display_name,
          description,
          stage_id,
          campus_id,
          category:${t.stage}(
            id,
            name,
            display_name
          ),
          ${seriesFranchiseEmbed("id, code, name")}
        ),
        offering:${t.offering}(
          id,
          name,
          slug,
          description,
          base_price,
          poster_url,
          status,
          type_config_data,
          offering_type_id,
          offering_type:${t.offeringType}(
            id,
            code,
            name,
            offering_schema,
            instance_schema
          )
        ),
        ${sessionLocationEmbed("id, name, display_name, address, city, state")}
      `
    }
    return `
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
      program:${t.series}(
        id,
        name,
        display_name,
        description,
        category_id,
        franchise_id,
        category:${t.stage}(
          id,
          name,
          display_name
        ),
        franchise:${t.campus}(
          id,
          code,
          name
        )
      ),
      offering:${t.offering}(
        id,
        name,
        slug,
        description,
        base_price,
        poster_url,
        status,
        type_config_data,
        offering_type_id,
        offering_type:${t.offeringType}(
          id,
          code,
          name,
          offering_schema,
          instance_schema
        )
      ),
      campus:${t.location}(
        id,
        name,
        display_name,
        address,
        city,
        state
      )
    `
  },

  /** GET /api/public/locations — location row with parent campus/franchise embed */
  locationWithCampus(): string {
    const t = catalogTables
    if (isCatalogV3()) {
      return `
        id,
        name,
        display_name,
        address,
        city,
        state,
        zip_code,
        campus:${t.campus}!campus_id!inner(
          id,
          code,
          name,
          is_active
        )
      `
    }
    return `
      id,
      name,
      display_name,
      address,
      city,
      state,
      zip_code,
      franchise:${t.campus}!inner(
        id,
        code,
        name,
        is_active
      )
    `
  },

  /** Admin GET /api/admin/instance/v2 list */
  adminSessionList(): string {
    const t = catalogTables
    if (isCatalogV3()) {
      return `
        *,
        program:${t.series}(
          id,
          name,
          display_name,
          stage_id,
          campus_id,
          start_date,
          end_date,
          category:${t.stage}(id, name, display_name),
          ${seriesFranchiseEmbed("id, code, name")}
        ),
        offering:${t.offering}(
          id,
          name,
          slug,
          description,
          base_price,
          currency,
          status,
          offering_type:${t.offeringType}(id, code, name, instance_schema)
        ),
        ${sessionLocationEmbed("id, name, display_name, address")}
      `
    }
    return `
      *,
      program:${t.series}(
        id,
        name,
        display_name,
        category_id,
        franchise_id,
        start_date,
        end_date,
        category:${t.stage}(id, name, display_name),
        franchise:${t.campus}(id, code, name)
      ),
      offering:${t.offering}(
        id,
        name,
        slug,
        description,
        base_price,
        currency,
        status,
        offering_type:${t.offeringType}(id, code, name, instance_schema)
      ),
      campus:${t.location}(id, name, display_name, address)
    `
  },

  /** Admin GET /api/admin/instance/v2/[id] */
  adminSessionDetail(): string {
    const t = catalogTables
    if (isCatalogV3()) {
      return `
        *,
        program:${t.series}(
          id,
          name,
          display_name,
          stage_id,
          campus_id,
          category:${t.stage}(id, name, display_name),
          ${seriesFranchiseEmbed("id, code, name")}
        ),
        offering:${t.offering}(
          id,
          name,
          slug,
          description,
          base_price,
          currency,
          status,
          offering_type_id,
          offering_type:${t.offeringType}(id, code, name, instance_schema)
        ),
        ${sessionLocationEmbed("id, name, display_name, address")}
      `
    }
    return `
      *,
      program:${t.series}(
        id,
        name,
        display_name,
        category_id,
        franchise_id,
        category:${t.stage}(id, name, display_name),
        franchise:${t.campus}(id, code, name)
      ),
      offering:${t.offering}(
        id,
        name,
        slug,
        description,
        base_price,
        currency,
        status,
        offering_type_id,
        offering_type:${t.offeringType}(id, code, name, instance_schema)
      ),
      campus:${t.location}(id, name, display_name, address)
    `
  },

  /** Admin POST/PUT instance response embed */
  adminSessionMutationResponse(): string {
    const t = catalogTables
    if (isCatalogV3()) {
      return `
        *,
        program:${t.series}(
          id,
          name,
          display_name,
          category:${t.stage}(id, name, display_name),
          ${seriesFranchiseEmbed("id, code, name")}
        ),
        offering:${t.offering}(
          id,
          name,
          base_price,
          currency,
          offering_type:${t.offeringType}(code, name)
        ),
        ${sessionLocationEmbed("id, name, display_name")}
      `
    }
    return `
      *,
      program:${t.series}(
        id,
        name,
        display_name,
        category:${t.stage}(id, name, display_name),
        franchise:${t.campus}(id, code, name)
      ),
      offering:${t.offering}(
        id,
        name,
        base_price,
        currency,
        offering_type:${t.offeringType}(code, name)
      ),
      campus:${t.location}(id, name, display_name)
    `
  },
}

/** Campus list fields for public franchise picker */
export function campusPublicSelect(includePosterUrl = true): string {
  return includePosterUrl
    ? "id, code, name, is_active, poster_url"
    : "id, code, name, is_active"
}

export function isMissingPosterUrlColumnError(error: unknown): boolean {
  return isMissingColumnError(error, "poster_url")
}

export function isMissingSessionPortalColumnError(error: unknown): boolean {
  return (
    isMissingColumnError(error, "is_course_type") ||
    isMissingColumnError(error, "portal_service_role")
  )
}

export function isMissingColumnError(error: unknown, column: string): boolean {
  const msg =
    typeof error === "object" && error && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error ?? "")
  return new RegExp(`column [\\w.]*\\.${column} does not exist`, "i").test(msg)
}

/** PostgREST ON CONFLICT columns for campus↔stage subscription map */
export function campusStageMapConflictKey(): string {
  return isCatalogV3() ? "campus_id,stage_id" : "franchise_id,category_id"
}

/** Insert/upsert payload for v2_franchise_category_map / v3_campus_stage_map */
export function campusStageMapWriteRow(
  campusId: string,
  stageId: string,
  fields: { is_visible?: boolean; display_order?: number }
): Record<string, unknown> {
  return {
    [catalogCols.campusStageMap.campusId]: campusId,
    [catalogCols.campusStageMap.stageId]: stageId,
    is_visible: fields.is_visible !== undefined ? fields.is_visible : true,
    display_order: fields.display_order ?? 0,
  }
}

/** Map v3 campus_stage_map row to v2-shaped API (franchise_id / category_id aliases) */
export function normalizeCampusStageMapRow<T extends Record<string, unknown>>(row: unknown): T {
  if (!isCatalogV3() || !row || typeof row !== "object") return row as T
  const out = { ...(row as Record<string, unknown>) }
  if ("campus_id" in out && out.franchise_id === undefined) {
    out.franchise_id = out.campus_id
  }
  if ("stage_id" in out && out.category_id === undefined) {
    out.category_id = out.stage_id
  }
  return out as T
}

/** Map v3 location row to v2-shaped API (franchise_id alias) */
export function normalizeLocationRow<T extends Record<string, unknown>>(row: unknown): T {
  if (!isCatalogV3() || !row || typeof row !== "object") return row as T
  const out = { ...(row as Record<string, unknown>) }
  if ("campus_id" in out && out.franchise_id === undefined) {
    out.franchise_id = out.campus_id
  }
  const campus = out.campus
  if (campus && typeof campus === "object" && !Array.isArray(campus) && !out.franchise) {
    out.franchise = campus
  }
  return out as T
}

/** Admin GET /api/blaze/campuses — location with parent campus/franchise embed */
export function adminLocationListSelect(): string {
  const t = catalogTables
  if (isCatalogV3()) {
    return `
      *,
      franchise:${t.campus}!campus_id(
        id,
        code,
        name
      )
    `
  }
  return `
    *,
    franchise:${t.campus}(
      id,
      code,
      name
    )
  `
}

/** Build insert/update payload for location from v2-style request body (franchise_id) */
export function locationWriteFromBody(
  body: Record<string, unknown>,
  options?: { isUpdate?: boolean }
): Record<string, unknown> {
  const {
    franchise_id,
    campus_id,
    name,
    display_name,
    address,
    city,
    state,
    zip_code,
    country,
    phone,
    email,
    latitude,
    longitude,
    is_active,
  } = body

  const row: Record<string, unknown> = {
    display_name: display_name ?? name,
    address: address ?? null,
    city: city ?? null,
    state: state ?? null,
    zip_code: zip_code ?? null,
    country: country ?? "US",
    phone: phone ?? null,
    email: email ?? null,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
  }

  if (!options?.isUpdate && name != null && String(name).trim()) {
    row.name = String(name).trim()
  }

  if (is_active !== undefined) {
    row.is_active = is_active
  }

  const parentId = campus_id ?? franchise_id
  if (parentId !== undefined) {
    row[catalogCols.location.campusId] = parentId
  }

  return row
}

/** Map v3 series row to v2-shaped API object (franchise_id / category_id aliases) */
export function normalizeSeriesRow<T extends Record<string, unknown>>(row: unknown): T {
  if (!isCatalogV3() || !row || typeof row !== "object") return row as T
  const out = { ...(row as Record<string, unknown>) }
  if ("campus_id" in out && out.franchise_id === undefined) {
    out.franchise_id = out.campus_id
  }
  if ("stage_id" in out && out.category_id === undefined) {
    out.category_id = out.stage_id
  }
  return out as T
}

/** Admin: series row for instance create validation */
export function adminSeriesValidationSelect(): string {
  const t = catalogTables
  return `
    id,
    ${catalogCols.series.stageId},
    ${catalogCols.series.campusId},
    category:${t.stage}(id, config_base)
  `
}

/** PostgREST embed for offering_type on admin validation queries */
export function offeringTypeValidationEmbed(): string {
  const t = catalogTables.offeringType
  if (isCatalogV3()) {
    return `offering_type:${t}(id, code, name, instance_schema)`
  }
  return `offering_type:${t}(id, code, name, instance_schema, portal_service_role)`
}

/** Admin offering create/update: load offering type for schema validation (v3 has no portal_service_role) */
export function adminOfferingTypeSchemaSelect(): string {
  return isCatalogV3()
    ? "id, is_active, offering_schema"
    : "id, is_active, offering_schema, portal_service_role"
}

/** Public GET /api/public/offerings/recommend select */
export function publicRecommendOfferingSelect(): string {
  const t = catalogTables
  if (isCatalogV3()) {
    return `
      id,
      name,
      slug,
      poster_url,
      base_price
    `
  }
  return `
    id,
    name,
    slug,
    poster_url,
    base_price,
    category_id,
    category:${t.stage}(
      id,
      name,
      display_name
    )
  `
}

/** Admin offering update: minimal fields for validation */
export function adminOfferingExistingSelect(): string {
  return isCatalogV3()
    ? "id, slug, offering_type_id, status, name"
    : "id, slug, offering_type_id, category_id, status, name"
}

/** Admin: offering row for instance create/update validation */
export function adminOfferingValidationSelect(): string {
  const t = catalogTables
  const ot = t.offeringType
  if (isCatalogV3()) {
    return `
      id,
      status,
      offering_type_id,
      type_config_data,
      offering_type:${ot}(id, code, name, instance_schema)
    `
  }
  return `
    id,
    status,
    category_id,
    offering_type_id,
    type_config_data,
    offering_type:${ot}(id, code, name, instance_schema, portal_service_role)
  `
}

/** Admin PUT /api/admin/instance/v2/[id] — session + offering for update validation */
export function adminSessionUpdateFetchSelect(): string {
  const t = catalogTables
  const ot = t.offeringType
  if (isCatalogV3()) {
    return `
      *,
      offering:${t.offering}(
        id,
        offering_type_id,
        type_config_data,
        offering_type:${ot}(id, code, name, instance_schema)
      )
    `
  }
  return `
    *,
    offering:${t.offering}(
      id,
      offering_type_id,
      type_config_data,
      offering_type:${ot}(id, code, name, instance_schema, portal_service_role)
    )
  `
}

/** Map v3 session row to v2-shaped API object */
export function normalizeSessionRow<T extends Record<string, unknown>>(row: unknown): T {
  if (!isCatalogV3() || !row || typeof row !== "object") return row as T
  const out = { ...(row as Record<string, unknown>) }
  if ("series_id" in out && out.program_id === undefined) {
    out.program_id = out.series_id
  }
  if ("location_id" in out && out.campus_id === undefined) {
    out.campus_id = out.location_id
  }
  if (out.program && typeof out.program === "object" && !Array.isArray(out.program)) {
    out.program = normalizeSeriesRow(out.program)
  }
  return out as T
}

/** Build insert payload for series from v2-style request body */
export function seriesInsertFromBody(body: {
  franchise_id?: string
  campus_id?: string
  category_id?: string
  stage_id?: string
  [key: string]: unknown
}): Record<string, unknown> {
  const { franchise_id, campus_id, category_id, stage_id, ...rest } = body
  if (isCatalogV3()) {
    delete rest.franchise_id
    delete rest.category_id
    return {
      ...rest,
      campus_id: campus_id ?? franchise_id,
      stage_id: stage_id ?? category_id,
    }
  }
  delete rest.campus_id
  delete rest.stage_id
  return {
    ...rest,
    franchise_id: franchise_id ?? campus_id,
    category_id: category_id ?? stage_id,
  }
}

/** Build insert payload for session from v2-style request body */
export function sessionInsertFromBody(body: {
  program_id?: string
  series_id?: string
  campus_id?: string
  location_id?: string
  [key: string]: unknown
}): Record<string, unknown> {
  const { program_id, series_id, campus_id, location_id, ...rest } = body
  if (isCatalogV3()) {
    return {
      ...rest,
      series_id: series_id ?? program_id,
      location_id: location_id ?? campus_id,
    }
  }
  return {
    ...rest,
    program_id: program_id ?? series_id,
    campus_id: campus_id ?? location_id,
  }
}

export function isCatalogV3Client(): boolean {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_CATALOG_SCHEMA?.trim().toLowerCase() === "v3"
  }
  return isCatalogV3()
}
