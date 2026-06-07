/**
 * Catalog DB table/column names for Node import scripts (mirrors src/lib/catalog-db.ts).
 */

function isCatalogV3() {
  return (process.env.CATALOG_SCHEMA || "").trim().toLowerCase() === "v3"
}

const V2 = {
  offeringType: "v2_offering_type",
  stage: "v2_category",
  campus: "v2_franchise",
  offering: "v2_offering",
  campusStageMap: "v2_franchise_category_map",
  location: "v2_campus",
  series: "v2_program",
  session: "v2_instance",
}

const V3 = {
  offeringType: "v3_offering_type",
  stage: "v3_stage",
  campus: "v3_campus",
  offering: "v3_offering",
  campusStageMap: "v3_campus_stage_map",
  location: "v3_location",
  series: "v3_series",
  session: "v3_session",
}

function tables() {
  return isCatalogV3() ? V3 : V2
}

function cols() {
  if (isCatalogV3()) {
    return {
      seriesCampusId: "campus_id",
      seriesStageId: "stage_id",
      sessionSeriesId: "series_id",
      sessionLocationId: "location_id",
      locationCampusId: "campus_id",
      mapCampusId: "campus_id",
      mapStageId: "stage_id",
      offeringStageId: null,
    }
  }
  return {
    seriesCampusId: "franchise_id",
    seriesStageId: "category_id",
    sessionSeriesId: "program_id",
    sessionLocationId: "campus_id",
    locationCampusId: "franchise_id",
    mapCampusId: "franchise_id",
    mapStageId: "category_id",
    offeringStageId: "category_id",
  }
}

/** Normalize series/program row for import code expecting franchise_id / category_id */
function normalizeSeriesRow(row) {
  if (!row || !isCatalogV3()) return row
  return {
    ...row,
    franchise_id: row.franchise_id ?? row.campus_id,
    category_id: row.category_id ?? row.stage_id,
  }
}

function instancePreflightSelects() {
  const t = tables()
  const c = cols()
  if (isCatalogV3()) {
    return {
      offeringTypeFields: "id, code, is_active, instance_schema, updated_at",
      campusFields: "id, code, name, is_active",
      stageFields: "id, name, display_name, is_active, config_base",
      seriesFields: `id, name, display_name, ${c.seriesCampusId}, ${c.seriesStageId}, is_active,
        category:${t.stage}(id, name, display_name, config_base),
        franchise:${t.campus}!campus_id(id, code)`,
      offeringFields: `id, name, status, offering_type_id, type_config_data,
        offering_type:${t.offeringType}(id, code, instance_schema)`,
      locationFields: `id, name, display_name, ${c.locationCampusId}`,
      sessionFields: `id, ${c.sessionSeriesId}, offering_id, ${c.sessionLocationId}, start_date, end_date, start_time, end_time,
        max_students, price_override, current_students, instance_data_ext, status, notes,
        is_active, featured, days_of_week, amilia_link,
        program:${t.series}(
          franchise:${t.campus}(code),
          display_name,
          name,
          category:${t.stage}(display_name, name)
        ),
        offering:${t.offering}(name),
        campus:${t.location}(name, display_name)`,
    }
  }
  return {
    offeringTypeFields: "id, code, is_active, instance_schema, portal_service_role, updated_at",
    campusFields: "id, code, name, is_active",
    stageFields: "id, name, display_name, is_active, config_base",
    seriesFields: `id, name, display_name, franchise_id, category_id, is_active,
        category:v2_category(id, name, display_name, config_base),
        franchise:v2_franchise(id, code)`,
    offeringFields: `id, name, status, category_id, offering_type_id, type_config_data,
        offering_type:v2_offering_type(id, code, instance_schema, portal_service_role)`,
    locationFields: "id, name, display_name, franchise_id",
    sessionFields: `id, program_id, offering_id, campus_id, start_date, end_date, start_time, end_time,
        max_students, price_override, current_students, instance_data_ext, status, notes,
        is_active, featured, days_of_week, amilia_link,
        program:v2_program(
          franchise:v2_franchise(code),
          display_name,
          name,
          category:v2_category(display_name, name)
        ),
        offering:v2_offering(name),
        campus:v2_campus(name, display_name)`,
  }
}

/** Build insert/update payload for session from v2-style body (program_id / campus_id). */
function sessionInsertFromBody(body) {
  if (!isCatalogV3()) return body
  const { program_id, campus_id, ...rest } = body
  const out = { ...rest }
  if (program_id !== undefined) out.series_id = program_id
  if (campus_id !== undefined) out.location_id = campus_id
  delete out.program_id
  delete out.campus_id
  return out
}

module.exports = {
  isCatalogV3,
  tables,
  cols,
  normalizeSeriesRow,
  instancePreflightSelects,
  sessionInsertFromBody,
}
