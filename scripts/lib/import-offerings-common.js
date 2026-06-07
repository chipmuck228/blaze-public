/**
 * Shared logic for v2_offering CSV export/import (schema-driven, per offering type).
 * Used by scripts/export-offerings.js and scripts/import-offerings.js.
 */

const fs = require("fs")
const path = require("path")
const { execFileSync } = require("child_process")
const {
  computeSchemaHash,
  buildSchemaColumns,
  flattenToRow,
  buildFromRow,
  normalizeConfigForCompare,
  stableStringify,
  parseXlsxSpreadsheet,
} = require("./csv-schema-utils")
const { tables, isCatalogV3 } = require("./catalog-db")

const FIXED_COLUMNS = [
  "id",
  "slug",
  "Title",
  "Offering Type",
  "Program (tag)",
  "Status",
  "Description for admin",
  "Image Link",
]

const HEADER_ALIASES = {
  title: "Title",
  name: "Title",
  "description for admin": "Description for admin",
  "description for offering": "content|description",
  "image link": "Image Link",
  poster_url: "Image Link",
  program: "Program (tag)",
  "program (tag)": "Program (tag)",
  "program （tag）": "Program (tag)",
  "offering type": "Offering Type",
  "offering-type": "Offering Type",
  "offering type (tag)": "Offering Type",
  status: "Status",
  target_audience: "content|target_audience",
  learning_outcomes: "content|learning_outcomes",
  prerequisites: "content|prerequisites",
  currency: "pricing|currency",
  "base price": "pricing|base_price",
  "meal option": "capacity_meal|meal_option",
  materials: "options|materials_included",
  certificate: "options|certificate_available",
  "default occurrences": "capacity_sessions|base_sessions_count",
  "treat as course": "portal_config|is_course_type",
  "show care service": "portal_config|show_care_service",
  "show meal service": "portal_config|show_meal_service",
}

const VALID_STATUSES = ["draft", "published", "suspended", "archived"]

const ERROR_CODES = {
  UNKNOWN_TYPE: "UNKNOWN_TYPE",
  UNKNOWN_CATEGORY: "UNKNOWN_CATEGORY",
  SCHEMA_VALIDATION: "SCHEMA_VALIDATION",
  SCHEMA_DRIFT: "SCHEMA_DRIFT",
  DUPLICATE_IN_FILE: "DUPLICATE_IN_FILE",
  PARSE_ERROR: "PARSE_ERROR",
  INTEGRITY: "INTEGRITY",
  NOT_FOUND: "NOT_FOUND",
  TYPE_MISMATCH: "TYPE_MISMATCH",
}

function loadEnv() {
  const envPath = path.join(__dirname, "..", "..", ".env.local")
  if (!fs.existsSync(envPath)) return
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .forEach((line) => {
      const match = line.match(/^([^=:#]+)=(.*)$/)
      if (!match) return
      const key = match[1].trim()
      let value = match[2].trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      process.env[key] = value
    })
}

function parseImportArgs(argv) {
  const args = {
    dryRun: true,
    execute: false,
    insertOnly: false,
    includeArchived: false,
    typeCode: null,
    file: null,
    manifest: null,
  }
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--execute") {
      args.execute = true
      args.dryRun = false
    } else if (argv[i] === "--dry-run") {
      args.dryRun = true
      args.execute = false
    } else if (argv[i] === "--insert-only") {
      args.insertOnly = true
    } else if (argv[i] === "--include-archived") {
      args.includeArchived = true
    } else if (argv[i] === "--type" && argv[i + 1]) {
      args.typeCode = argv[++i].trim().toLowerCase()
    } else if (argv[i] === "--file" && argv[i + 1]) {
      args.file = argv[++i]
    } else if (argv[i] === "--manifest" && argv[i + 1]) {
      args.manifest = argv[++i]
    }
  }
  if (!args.typeCode) {
    throw new Error("--type is required (e.g. --type camp)")
  }
  if (!args.file) {
    args.file = defaultOfferingCsvPath(args.typeCode)
  }
  return args
}

function parseExportArgs(argv) {
  const args = {
    typeCode: null,
    out: null,
    status: null,
    writeTemplate: false,
  }
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--type" && argv[i + 1]) {
      args.typeCode = argv[++i].trim().toLowerCase()
    } else if (argv[i] === "--out" && argv[i + 1]) {
      args.out = argv[++i]
    } else if (argv[i] === "--status" && argv[i + 1]) {
      args.status = argv[++i].trim().toLowerCase()
    } else if (argv[i] === "--write-template") {
      args.writeTemplate = true
    }
  }
  if (!args.typeCode) {
    throw new Error("--type is required (e.g. --type camp)")
  }
  if (!args.out) {
    args.out = args.writeTemplate
      ? path.join(__dirname, "..", "templates", `offerings-${args.typeCode}-template.csv`)
      : defaultOfferingCsvPath(args.typeCode)
  }
  return args
}

function defaultOfferingCsvPath(typeCode) {
  return path.join(__dirname, "..", "output", `Blaze-Offerings-${typeCode}.csv`)
}

function defaultManifestPath(csvPath) {
  const dir = path.dirname(csvPath)
  const base = path.basename(csvPath, path.extname(csvPath))
  return path.join(dir, `${base}-schema.json`)
}

function parseCsvLine(line) {
  const out = []
  let cur = ""
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') inQ = false
      else cur += ch
    } else if (ch === '"') inQ = true
    else if (ch === ",") {
      out.push(cur)
      cur = ""
    } else cur += ch
  }
  out.push(cur)
  return out
}

function parseCsv(filePath) {
  const text = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "")
  return text.split(/\r?\n/).filter((l) => l.trim().length > 0).map(parseCsvLine)
}

function escapeCsv(val) {
  const s = val == null ? "" : String(val)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function writeCsv(filePath, headers, rows) {
  const lines = [headers.map(escapeCsv).join(",")]
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsv(row[h] ?? "")).join(","))
  }
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(filePath, lines.join("\n") + "\n", "utf8")
}

function parseXlsx(filePath) {
  const py = `
import json, sys, zipfile, xml.etree.ElementTree as ET
path = sys.argv[1]
ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
def col_idx(ref):
    col = "".join(ch for ch in ref if ch.isalpha())
    n = 0
    for ch in col:
        n = n * 26 + (ord(ch) - 64)
    return n - 1
z = zipfile.ZipFile(path)
ss = []
root = ET.fromstring(z.read("xl/sharedStrings.xml"))
for si in root.findall(".//m:si", ns):
    ss.append("".join((t.text or "") for t in si.findall(".//m:t", ns)))
sheet = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
rows = []
for row in sheet.findall(".//m:sheetData/m:row", ns):
    cells = {}
    for c in row.findall("m:c", ns):
        ref = c.get("r", "")
        t = c.get("t")
        v = c.find("m:v", ns)
        val = v.text if v is not None else ""
        if t == "s" and val.isdigit():
            val = ss[int(val)]
        cells[col_idx(ref)] = val
    if not cells:
        continue
    max_i = max(cells)
    rows.append([cells.get(i, "") for i in range(max_i + 1)])
print(json.dumps(rows))
`
  const out = execFileSync("python3", ["-c", py, filePath], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  })
  return JSON.parse(out)
}

function parseSpreadsheet(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === ".csv") return parseCsv(filePath)
  if (ext === ".xlsx" || ext === ".xls") return parseXlsx(filePath)
  throw new Error(`Unsupported file type: ${ext} (use .csv or .xlsx)`)
}

function normalizeHeader(h) {
  const raw = String(h || "")
    .trim()
    .replace(/\uFF08/g, "(")
    .replace(/\uFF09/g, ")")
    .replace(/\s+/g, " ")
  const key = raw.toLowerCase()
  return HEADER_ALIASES[key] || raw
}

function normalizeKey(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function decodeHtmlEntities(text) {
  if (!text) return text
  return String(text)
    .replace(/&mdash;/g, "\u2014")
    .replace(/&ndash;/g, "\u2013")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim()
}

function normalizePosterUrl(url) {
  const raw = String(url ?? "").trim()
  if (!raw) return ""
  try {
    const parsed = new URL(raw)
    parsed.pathname = parsed.pathname.replace(/\/{2,}/g, "/")
    return parsed.toString()
  } catch {
    return raw.replace(/([^:]\/)\/+/g, "$1")
  }
}

function parseYesNo(val, defaultVal) {
  const v = String(val ?? "")
    .trim()
    .toLowerCase()
  if (!v) return defaultVal
  if (v === "yes" || v === "true" || v === "1") return true
  if (v === "no" || v === "false" || v === "0") return false
  throw new Error(`Invalid Yes/No: ${val}`)
}

function buildManifest(offeringType, schemaColumns) {
  return {
    offering_type_code: offeringType.code,
    offering_type_id: offeringType.id,
    schema_updated_at: offeringType.updated_at || null,
    schema_hash: computeSchemaHash(offeringType.offering_schema),
    fixed_columns: FIXED_COLUMNS,
    columns: schemaColumns.map((c) => ({
      header: c.header,
      path: c.path,
      type: c.type,
      required: c.required,
      label: c.label,
    })),
  }
}

function getAllHeaders(schemaColumns) {
  return [...FIXED_COLUMNS, ...schemaColumns.map((c) => c.header)]
}

const flattenTypeConfigToRow = flattenToRow
const buildTypeConfigFromRow = buildFromRow

function offeringToCsvRow(offering, offeringType, categoryLabel, schemaColumns) {
  const typeConfig =
    offering.type_config_data && typeof offering.type_config_data === "object"
      ? offering.type_config_data
      : {}
  const dynamic = flattenTypeConfigToRow(typeConfig, schemaColumns)
  return {
    id: offering.id || "",
    slug: offering.slug || "",
    Title: offering.name || "",
    "Offering Type": offeringType.code || "",
    "Program (tag)": categoryLabel || "",
    Status: offering.status || "draft",
    "Description for admin": offering.description || "",
    "Image Link": offering.poster_url || "",
    ...dynamic,
  }
}

function requiredFixedColumns() {
  const cols = ["Title", "Offering Type"]
  if (!isCatalogV3()) cols.push("Program (tag)")
  return cols
}

function rowTitle(row) {
  return String(row.Title || row.name || "").trim()
}

/** Map operator-friendly Excel columns onto schema pipe headers (type-agnostic). */
function remapRowForSchema(row, schemaColumns) {
  const out = { ...row }
  const schemaHeaders = new Set(schemaColumns.map((c) => c.header))

  const pick = (...keys) => {
    for (const k of keys) {
      const v = out[k]
      if (v != null && String(v).trim() !== "") return String(v).trim()
    }
    return ""
  }

  const assignIfEmpty = (header, value) => {
    if (!value || !schemaHeaders.has(header) || String(out[header] || "").trim()) return
    out[header] = value
  }

  const defaultCapacity = pick("Default Capacity", "default capacity")
  if (defaultCapacity) {
    const capCol = schemaColumns.find((c) => c.field === "base_capacity")
    if (capCol) assignIfEmpty(capCol.header, defaultCapacity)
  }

  assignIfEmpty("options|materials_included", pick("Materials", "materials"))
  assignIfEmpty("options|certificate_available", pick("Certificate", "certificate"))
  assignIfEmpty(
    "capacity_sessions|base_sessions_count",
    pick("Default Occurrences", "default occurrences", "capacity_sessions|base_sessions_count")
  )

  if (schemaHeaders.has("content|description") && !pick("content|description")) {
    const adminDesc = pick("Description for admin", "description for admin")
    if (adminDesc) out["content|description"] = adminDesc
  }

  return out
}

function rowsToObjects(tableRows) {
  if (!tableRows.length) return []
  const headers = tableRows[0].map(normalizeHeader)
  const missingFixed = requiredFixedColumns().filter((h) => !headers.includes(h))
  if (missingFixed.length) {
    throw new Error(`Missing required columns: ${missingFixed.join(", ")}`)
  }
  return tableRows.slice(1).map((row, idx) => {
    const obj = { _rowNum: idx + 2 }
    headers.forEach((h, i) => {
      obj[h] = row[i] != null ? String(row[i]).trim() : ""
    })
    return obj
  })
}

function rowIsEmpty(row) {
  return !rowTitle(row) && !String(row.id || "").trim()
}

function flattenTypeConfigDataForTable(config) {
  if (!config || typeof config !== "object") return {}
  const p = config.pricing
  const c = config.content
  return {
    base_price:
      p?.base_price != null
        ? Number(p.base_price)
        : config.base_price != null
          ? Number(config.base_price)
          : null,
    currency:
      p?.currency != null
        ? String(p.currency)
        : config.currency != null
          ? String(config.currency)
          : null,
    description:
      c?.description != null
        ? String(c.description)
        : config.description != null
          ? String(config.description)
          : null,
    target_audience:
      c?.target_audience != null
        ? String(c.target_audience)
        : config.target_audience != null
          ? String(c.target_audience)
          : null,
    learning_outcomes:
      c?.learning_outcomes != null
        ? String(c.learning_outcomes)
        : config.learning_outcomes != null
          ? String(config.learning_outcomes)
          : null,
    prerequisites:
      c?.prerequisites != null
        ? String(c.prerequisites)
        : config.prerequisites != null
          ? String(config.prerequisites)
          : null,
  }
}

function mergeConfig(categoryConfigBase, userConfigData) {
  return {
    ...(categoryConfigBase && typeof categoryConfigBase === "object" ? categoryConfigBase : {}),
    ...userConfigData,
  }
}

function buildDbRow(payload, configData) {
  const flattened = flattenTypeConfigDataForTable(configData)
  const row = {
    name: payload.name,
    description: payload.description ?? flattened.description ?? null,
    target_audience: flattened.target_audience ?? null,
    learning_outcomes: flattened.learning_outcomes ?? null,
    prerequisites: flattened.prerequisites ?? null,
    base_price: flattened.base_price ?? null,
    currency: flattened.currency ?? "USD",
    poster_url: payload.poster_url,
    offering_type_id: payload.offering_type_id,
    type_config_data: configData,
    status: payload.status,
  }
  if (!isCatalogV3()) {
    row.category_id = payload.category_id
  }
  if (payload.slug) row.slug = payload.slug
  return row
}

function validateOfferingSchema(offeringSchemaFields, mergedConfig) {
  if (!offeringSchemaFields) return
  const errors = []
  const validateField = (val, fieldConfig, fieldLabel, fieldPath) => {
    if (fieldConfig.required && (val === undefined || val === null || val === "")) {
      errors.push(`${fieldLabel} is required`)
      return
    }
    if (val === undefined || val === null) return
    if (fieldConfig.type === "number") {
      const value = Number(val)
      if (Number.isNaN(value)) errors.push(`${fieldLabel} must be a number`)
      else {
        if (fieldConfig.min !== undefined && value < fieldConfig.min) {
          errors.push(`${fieldLabel} must be at least ${fieldConfig.min}`)
        }
        if (fieldConfig.max !== undefined && value > fieldConfig.max) {
          errors.push(`${fieldLabel} must be at most ${fieldConfig.max}`)
        }
      }
    }
    if (fieldConfig.type === "select" && fieldConfig.options) {
      const optSet = new Set(fieldConfig.options.map((o) => String(o)))
      if (!optSet.has(String(val))) {
        errors.push(`${fieldLabel} must be one of: ${fieldConfig.options.join(", ")}`)
      }
    }
    if (fieldConfig.type === "multiselect" && fieldConfig.options) {
      const values = Array.isArray(val) ? val : [val]
      const optSet = new Set(fieldConfig.options.map((o) => String(o)))
      const invalid = values.filter((v) => !optSet.has(String(v)))
      if (invalid.length) errors.push(`${fieldLabel} contains invalid values: ${invalid.join(", ")}`)
    }
  }

  for (const [fieldName, fieldConfig] of Object.entries(offeringSchemaFields)) {
    const fieldLabel = fieldConfig.label || fieldName
    if (fieldConfig.type === "object" && fieldConfig.properties) {
      const obj = mergedConfig[fieldName]
      if (fieldConfig.required && (obj === undefined || obj === null || typeof obj !== "object")) {
        errors.push(`${fieldLabel} is required`)
        continue
      }
      if (obj && typeof obj === "object" && !Array.isArray(obj)) {
        for (const [propKey, propConfig] of Object.entries(fieldConfig.properties)) {
          validateField(
            obj[propKey],
            propConfig,
            propConfig?.label || propKey,
            `${fieldName}.${propKey}`
          )
        }
      }
    } else {
      validateField(mergedConfig[fieldName], fieldConfig, fieldLabel, fieldName)
    }
  }

  if (errors.length) throw new Error(errors.join("; "))
}

function diffDbRow(existing, dbRow) {
  const keys = [
    "name",
    "slug",
    "description",
    "target_audience",
    "learning_outcomes",
    "prerequisites",
    "base_price",
    "currency",
    "poster_url",
    ...(isCatalogV3() ? [] : ["category_id"]),
    "status",
    "type_config_data",
  ]
  const diff = {}
  for (const k of keys) {
    if (k === "type_config_data") {
      const a = stableStringify(normalizeConfigForCompare(existing[k] || {}))
      const b = stableStringify(normalizeConfigForCompare(dbRow[k] || {}))
      if (a !== b) diff[k] = dbRow[k]
    } else if (k === "base_price") {
      const ea = existing[k] == null ? null : Number(existing[k])
      const eb = dbRow[k] == null ? null : Number(dbRow[k])
      if (ea !== eb) diff[k] = dbRow[k]
    } else if (existing[k] !== dbRow[k]) {
      diff[k] = dbRow[k]
    }
  }
  return diff
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

async function preflight(supabase, typeCode) {
  const { data: offeringType, error: typeErr } = await supabase
    .from(tables().offeringType)
    .select("id, code, name, is_active, offering_schema, updated_at")
    .eq("code", typeCode)
    .maybeSingle()

  if (typeErr || !offeringType) {
    throw new Error(`Offering type "${typeCode}" not found: ${typeErr?.message || "no row"}`)
  }
  if (!offeringType.is_active) {
    throw new Error(`Offering type "${typeCode}" exists but is not active`)
  }

  const { data: categories, error: catErr } = await supabase
    .from(tables().stage)
    .select("id, name, display_name, config_base, is_active")

  if (catErr) throw new Error(`Failed to load categories: ${catErr.message}`)

  const categoriesByKey = new Map()
  const categoryById = new Map()
  for (const c of categories || []) {
    categoryById.set(c.id, c)
    if (c.is_active === false) continue
    for (const k of [c.name, c.display_name].filter(Boolean)) {
      const key = String(k).trim().toLowerCase()
      if (categoriesByKey.has(key) && categoriesByKey.get(key).id !== c.id) {
        throw new Error(`Ambiguous category key: ${key}`)
      }
      categoriesByKey.set(key, c)
    }
  }

  const offeringSelect = isCatalogV3()
    ? "id, name, slug, offering_type_id, status, description, poster_url, type_config_data, target_audience, learning_outcomes, prerequisites, base_price, currency"
    : "id, name, slug, category_id, offering_type_id, status, description, poster_url, type_config_data, target_audience, learning_outcomes, prerequisites, base_price, currency"

  const { data: offerings, error: offErr } = await supabase
    .from(tables().offering)
    .select(offeringSelect)
    .eq("offering_type_id", offeringType.id)

  if (offErr) throw new Error(`Failed to load offerings: ${offErr.message}`)

  const offeringsById = new Map()
  const offeringsByNameAndType = new Map()
  for (const o of offerings || []) {
    offeringsById.set(o.id, o)
    const nk = `${String(o.name).trim().toLowerCase()}|${offeringType.id}`
    if (offeringsByNameAndType.has(nk)) {
      // keep first; duplicate detection on import
    } else {
      offeringsByNameAndType.set(nk, o)
    }
  }

  const schemaColumns = buildSchemaColumns(offeringType.offering_schema)
  const manifest = buildManifest(offeringType, schemaColumns)

  return {
    offeringType,
    categoriesByKey,
    categoryById,
    offeringsById,
    offeringsByNameAndType,
    schemaColumns,
    manifest,
  }
}

function resolveCategoryId(programTag, categoriesByKey) {
  const key = String(programTag || "").trim().toLowerCase()
  if (!key) throw new Error("Program (tag) is required")
  const cat = categoriesByKey.get(key)
  if (!cat) {
    throw new Error(
      `Unknown Program (category): "${programTag}". Available: ${[...categoriesByKey.values()]
        .map((c) => c.display_name || c.name)
        .filter((v, i, a) => a.indexOf(v) === i)
        .join(", ")}`
    )
  }
  return cat.id
}

function getCategoryLabel(category, categoryById) {
  if (!category) return ""
  if (typeof category === "string") {
    const c = categoryById.get(category)
    return c ? c.display_name || c.name || "" : ""
  }
  return category.display_name || category.name || ""
}

async function countInstancesForOffering(supabase, offeringId) {
  const { count, error } = await supabase
    .from(tables().session)
    .select("id", { count: "exact", head: true })
    .eq("offering_id", offeringId)
  if (error) throw new Error(`Instance count failed: ${error.message}`)
  return count || 0
}

async function slugExists(supabase, slug, excludeId) {
  let q = supabase.from(tables().offering).select("id").eq("slug", slug)
  if (excludeId) q = q.neq("id", excludeId)
  const { data, error } = await q.maybeSingle()
  if (error && error.code !== "PGRST116") throw error
  return !!data
}

async function allocateSlug(supabase, name, excludeId) {
  let base = slugify(name)
  if (!base) base = "offering"
  let candidate = base
  let n = 2
  while (await slugExists(supabase, candidate, excludeId)) {
    candidate = `${base}-${n}`
    n++
  }
  return candidate
}

function mapRowToPayload(row, offeringTypeId, categoryId, typeCode) {
  const name = decodeHtmlEntities(rowTitle(row))
  if (!name) throw new Error("Title is required")

  const rowType = String(row["Offering Type"] || "")
    .trim()
    .toLowerCase()
  if (rowType && rowType !== typeCode) {
    throw new Error(`Offering Type mismatch: expected "${typeCode}", got "${row["Offering Type"]}"`)
  }

  const statusRaw = String(row.Status || "draft").trim().toLowerCase()
  if (!VALID_STATUSES.includes(statusRaw)) {
    throw new Error(`Invalid status: ${row.Status}`)
  }

  const adminDesc = decodeHtmlEntities(row["Description for admin"])
  const posterUrl = normalizePosterUrl(row["Image Link"])
  const slugRaw = String(row.slug || "").trim().toLowerCase()
  if (slugRaw && !/^[a-z0-9-]+$/.test(slugRaw)) {
    throw new Error("slug must contain only lowercase letters, numbers, and hyphens")
  }

  return {
    id: String(row.id || "").trim() || null,
    name,
    slug: slugRaw || null,
    description: adminDesc || null,
    poster_url: posterUrl || null,
    offering_type_id: offeringTypeId,
    category_id: categoryId,
    status: statusRaw,
  }
}

function detectSchemaDrift(fileManifest, dbManifest) {
  const warnings = []
  if (!fileManifest) return warnings
  if (fileManifest.schema_hash !== dbManifest.schema_hash) {
    warnings.push({
      code: ERROR_CODES.SCHEMA_DRIFT,
      message: `Schema hash mismatch: file=${fileManifest.schema_hash} db=${dbManifest.schema_hash}`,
    })
  }
  const fileHeaders = new Set((fileManifest.columns || []).map((c) => c.header))
  const dbHeaders = new Set(dbManifest.columns.map((c) => c.header))
  const missingInFile = [...dbHeaders].filter((h) => !fileHeaders.has(h))
  const extraInFile = [...fileHeaders].filter((h) => !dbHeaders.has(h))
  if (missingInFile.length) {
    warnings.push({
      code: ERROR_CODES.SCHEMA_DRIFT,
      message: `CSV/manifest missing schema columns: ${missingInFile.join(", ")}`,
    })
  }
  if (extraInFile.length) {
    warnings.push({
      code: ERROR_CODES.SCHEMA_DRIFT,
      message: `Unknown columns (ignored): ${extraInFile.join(", ")}`,
    })
  }
  return warnings
}

function loadManifest(manifestPath) {
  if (!manifestPath || !fs.existsSync(manifestPath)) return null
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"))
}

async function processImportRow(supabase, ctx, row, opts) {
  const { offeringType, categoriesByKey, schemaColumns, offeringsById, offeringsByNameAndType } = ctx
  const categoryId = isCatalogV3()
    ? null
    : resolveCategoryId(row["Program (tag)"], categoriesByKey)
  const payload = mapRowToPayload(row, offeringType.id, categoryId, offeringType.code)

  if (payload.status === "archived" && !opts.includeArchived) {
    return { action: "SKIPPED", reason: "archived status (--include-archived to import)" }
  }

  const mappedRow = remapRowForSchema(row, schemaColumns)
  const userConfig = buildTypeConfigFromRow(mappedRow, schemaColumns)
  let configData = userConfig
  if (!isCatalogV3()) {
    const cat = categoriesByKey.get(String(row["Program (tag)"]).trim().toLowerCase())
    const configBase =
      cat?.config_base && typeof cat.config_base === "object" ? cat.config_base : {}
    configData = mergeConfig(configBase, userConfig)
  }

  validateOfferingSchema(offeringType.offering_schema?.fields, configData)

  const fullDbRow = buildDbRow(payload, configData)

  let existing = null
  if (payload.id) {
    existing = offeringsById.get(payload.id)
    if (!existing) {
      throw new Error(`Offering id not found: ${payload.id}`)
    }
    if (existing.offering_type_id !== offeringType.id) {
      throw new Error("Cannot change offering type on existing offering")
    }
  } else {
    const nk = `${payload.name.trim().toLowerCase()}|${offeringType.id}`
    existing = offeringsByNameAndType.get(nk) || null
  }

  if (existing && opts.insertOnly) {
    return { action: "SKIPPED", reason: "insert-only mode", id: existing.id, slug: existing.slug }
  }

  if (!isCatalogV3() && existing && existing.category_id !== categoryId) {
    const instanceCount = await countInstancesForOffering(supabase, existing.id)
    if (instanceCount > 0) {
      throw new Error(
        `Cannot change Program (tag): offering has ${instanceCount} linked session(s)`
      )
    }
  }

  if (existing) {
    const diff = diffDbRow(existing, fullDbRow)
    if (Object.keys(diff).length === 0) {
      return { action: "UNCHANGED", id: existing.id, slug: existing.slug }
    }
    if (opts.dryRun) {
      return { action: "UPDATE", id: existing.id, slug: existing.slug, dbRow: fullDbRow }
    }
    const { data, error } = await supabase
      .from(tables().offering)
      .update(fullDbRow)
      .eq("id", existing.id)
      .select("id, name, slug, status")
      .single()
    if (error) throw new Error(`Update failed: ${error.message}`)
    Object.assign(existing, fullDbRow)
    return { action: "UPDATE", ...data }
  }

  const slug = payload.slug || (await allocateSlug(supabase, payload.name, null))
  const insertRow = { ...fullDbRow, slug }
  if (opts.dryRun) {
    return { action: "INSERT", slug, dbRow: insertRow }
  }
  const { data, error } = await supabase
    .from(tables().offering)
    .insert(insertRow)
    .select("id, name, slug, status")
    .single()
  if (error) {
    if (error.code === "23505") {
      throw new Error(`Insert conflict (name/slug): ${error.message}`)
    }
    throw new Error(`Insert failed: ${error.message}`)
  }
  offeringsById.set(data.id, { ...insertRow, id: data.id })
  const nk = `${payload.name.trim().toLowerCase()}|${offeringType.id}`
  offeringsByNameAndType.set(nk, { ...insertRow, id: data.id })
  return { action: "INSERT", ...data }
}

function scanFileDuplicates(rows, typeCode) {
  const seen = new Map()
  const dups = []
  for (const row of rows) {
    if (rowIsEmpty(row)) continue
    const id = String(row.id || "").trim()
    const title = rowTitle(row).toLowerCase()
    const key = id || `${title}|${typeCode}`
    if (seen.has(key)) {
      dups.push({ row: row._rowNum, key, firstRow: seen.get(key) })
    } else {
      seen.set(key, row._rowNum)
    }
  }
  return dups
}

function writeReport(prefix, typeCode, report) {
  const outDir = path.join(__dirname, "..", "output")
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  const logPath = path.join(outDir, `${prefix}-${typeCode}-${stamp}.json`)
  fs.writeFileSync(logPath, JSON.stringify(report, null, 2))
  return logPath
}

function buildExampleRow(schemaColumns, typeCode) {
  const row = {
    id: "",
    slug: "",
    Title: "Example Offering",
    "Offering Type": typeCode,
    "Program (tag)": "Explore",
    Status: "draft",
    "Description for admin": "",
    "Image Link": "",
  }
  for (const col of schemaColumns) {
    if (col.type === "boolean") row[col.header] = "No"
    else if (col.type === "number") row[col.header] = col.required ? "1" : ""
    else if (col.type === "select" && col.options?.length) row[col.header] = String(col.options[0])
    else row[col.header] = col.required ? `(required ${col.label})` : ""
  }
  return row
}

function templateCsvPath(typeCode) {
  return path.join(__dirname, "..", "templates", `offerings-${typeCode}-template.csv`)
}

async function loadActiveOfferingTypes(supabase) {
  const { data, error } = await supabase
    .from(tables().offeringType)
    .select("id, code, name, is_active, offering_schema, updated_at, display_order")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("code", { ascending: true })

  if (error) throw new Error(`Failed to load offering types: ${error.message}`)
  return data || []
}

async function countOfferingsForType(supabase, offeringTypeId) {
  const { count, error } = await supabase
    .from(tables().offering)
    .select("id", { count: "exact", head: true })
    .eq("offering_type_id", offeringTypeId)
  if (error) throw new Error(`Offering count failed: ${error.message}`)
  return count || 0
}

/**
 * Export offerings for one type to CSV + manifest.
 * @returns {{ csvPath, manifestPath, rowCount, schemaColumnCount, schemaHash, ctx }}
 */
async function exportOfferingsForType(supabase, typeCode, options = {}) {
  const writeTemplate = options.writeTemplate === true
  const status = options.status || null
  const out =
    options.out ||
    (writeTemplate ? templateCsvPath(typeCode) : defaultOfferingCsvPath(typeCode))

  const ctx = await preflight(supabase, typeCode)
  const headers = getAllHeaders(ctx.schemaColumns)
  const manifestPath = defaultManifestPath(out)

  let csvRows = []
  if (writeTemplate) {
    csvRows = [buildExampleRow(ctx.schemaColumns, typeCode)]
  } else {
    let query = supabase
      .from(tables().offering)
      .select(
        "id, name, slug, status, description, poster_url, type_config_data, category_id, offering_type_id"
      )
      .eq("offering_type_id", ctx.offeringType.id)
      .order("name", { ascending: true })

    if (status) query = query.eq("status", status)

    const { data: offerings, error } = await query
    if (error) throw new Error(`Failed to load offerings: ${error.message}`)

    csvRows = (offerings || []).map((o) => {
      const catLabel = getCategoryLabel(o.category_id, ctx.categoryById)
      return offeringToCsvRow(o, ctx.offeringType, catLabel, ctx.schemaColumns)
    })
  }

  writeCsv(out, headers, csvRows)
  fs.writeFileSync(manifestPath, JSON.stringify(ctx.manifest, null, 2) + "\n", "utf8")

  return {
    csvPath: out,
    manifestPath,
    rowCount: csvRows.length,
    schemaColumnCount: ctx.schemaColumns.length,
    schemaHash: ctx.manifest.schema_hash,
    ctx,
  }
}

/**
 * Dry-run import all rows from a CSV file for one offering type.
 */
async function dryRunImportFromFile(supabase, typeCode, filePath) {
  const ctx = await preflight(supabase, typeCode)
  const manifestPath = defaultManifestPath(filePath)
  const fileManifest = loadManifest(manifestPath)
  const driftWarnings = detectSchemaDrift(fileManifest, ctx.manifest)

  const tableRows = parseSpreadsheet(filePath)
  const allRows = rowsToObjects(tableRows).filter((r) => !rowIsEmpty(r))

  const fileDups = scanFileDuplicates(allRows, typeCode)
  if (fileDups.length) {
    throw new Error(
      `Duplicate rows in file: ${fileDups.map((d) => `row ${d.row}`).join(", ")}`
    )
  }

  const summary = { insert: 0, update: 0, unchanged: 0, skipped: 0, failed: 0 }
  const results = []
  const opts = { dryRun: true, insertOnly: false, includeArchived: true }

  for (const row of allRows) {
    try {
      const result = await processImportRow(supabase, ctx, row, opts)
      const action = result.action
      if (action === "INSERT") summary.insert++
      else if (action === "UPDATE") summary.update++
      else if (action === "UNCHANGED") summary.unchanged++
      else if (action === "SKIPPED") summary.skipped++
      results.push({ row: row._rowNum, name: row.Title, action, error: null })
    } catch (err) {
      summary.failed++
      results.push({ row: row._rowNum, name: row.Title || "(no title)", action: "FAILED", error: err.message })
    }
  }

  return { summary, results, driftWarnings, rowCount: allRows.length }
}

function resolveVerifyStatus(summary, offeringCount) {
  if (offeringCount === 0) return "skipped_no_data"
  if (summary.failed > 0) return "fail"
  if (summary.update > 0) return "warn"
  return "pass"
}

function buildInventoryMarkdownRows(entries) {
  const lines = [
    "| code | name | offerings | schema columns | verify | template |",
    "|------|------|-----------|----------------|--------|----------|",
  ]
  for (const e of entries) {
    lines.push(
      `| ${e.code} | ${e.name} | ${e.offering_count} | ${e.schema_column_count} | ${e.verify_status} | \`${e.template_path}\` |`
    )
  }
  return lines.join("\n")
}

function patchOfferingTypesDoc(docPath, tableMarkdown) {
  const start = "<!-- OFFERING_TYPES_START -->"
  const end = "<!-- OFFERING_TYPES_END -->"
  let content = fs.readFileSync(docPath, "utf8")
  if (!content.includes(start) || !content.includes(end)) {
    throw new Error(`Missing ${start} / ${end} markers in ${docPath}`)
  }
  const replacement = `${start}
<!-- 由 node scripts/bootstrap-offering-csv.js 自动生成，请勿手改 -->

${tableMarkdown}

<!-- schema_hash 与列数以当前 DB 为准；换环境后重新运行 bootstrap -->

${end}`
  content = content.replace(new RegExp(`${start}[\\s\\S]*?${end}`), replacement)
  fs.writeFileSync(docPath, content, "utf8")
}

module.exports = {
  FIXED_COLUMNS,
  ERROR_CODES,
  loadEnv,
  parseImportArgs,
  parseExportArgs,
  defaultOfferingCsvPath,
  defaultManifestPath,
  parseCsv,
  parseSpreadsheet,
  escapeCsv,
  writeCsv,
  rowsToObjects,
  rowIsEmpty,
  rowTitle,
  normalizeKey,
  decodeHtmlEntities,
  computeSchemaHash,
  buildSchemaColumns,
  buildManifest,
  getAllHeaders,
  offeringToCsvRow,
  flattenTypeConfigToRow,
  buildTypeConfigFromRow,
  flattenTypeConfigDataForTable,
  mergeConfig,
  buildDbRow,
  validateOfferingSchema,
  diffDbRow,
  preflight,
  resolveCategoryId,
  getCategoryLabel,
  mapRowToPayload,
  processImportRow,
  detectSchemaDrift,
  loadManifest,
  scanFileDuplicates,
  writeReport,
  buildExampleRow,
  templateCsvPath,
  loadActiveOfferingTypes,
  countOfferingsForType,
  exportOfferingsForType,
  dryRunImportFromFile,
  resolveVerifyStatus,
  buildInventoryMarkdownRows,
  patchOfferingTypesDoc,
  slugify,
  allocateSlug,
}
