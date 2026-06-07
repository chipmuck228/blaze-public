/**
 * Shared logic for schema-driven v2_instance CSV export/import.
 * Used by scripts/import-instances.js and scripts/export-instances.js.
 */

const fs = require("fs")
const path = require("path")
const {
  computeSchemaHash,
  buildSchemaColumns,
  flattenToRow,
  buildFromRow,
  normalizeConfigForCompare,
  stableStringify,
  parseXlsxSpreadsheet,
} = require("./csv-schema-utils")
const { tables, cols, isCatalogV3, normalizeSeriesRow, instancePreflightSelects, sessionInsertFromBody } = require("./catalog-db")

const INSTANCE_FIXED_COLUMNS = [
  "id",
  "Location Code",
  "Programs (category)",
  "Activity (program)",
  "Session Title",
  "Location Name",
  "Status",
  "Is Active",
  "Featured",
  "Amilia Link",
  "Notes",
]

const HEADER_ALIASES = {
  "location code": "Location Code",
  "location id": "Location Code",
  program: "Program",
  "programs (category)": "Program",
  "program (category)": "Program",
  activity: "Activity",
  "activity (program)": "Activity",
  title: "Session Title",
  "session title": "Session Title",
  "program name": "Program Name",
  "offering title": "Offering Title",
  "offering type (tag)": "Offering Type (tag)",
  "location name": "Location Name",
  campus: "Location Name",
  "start date": "Start Date",
  "end date": "End Date",
  "start time": "Start Time",
  "end time": "End Time",
  "min age": "Min Age",
  "max age": "Max Age",
  "max campers": "Max Campers",
  "price override": "Price Override",
  "meal provided": "Meal Provided",
  "camp shirt provided": "Camp Shirt Provided",
  "after care available": "After Care Available",
  "classes start on which days each week": "Classes start on which days each week",
  "target grade": "Target Grade",
  status: "Status",
  "is active": "Is Active",
  featured: "Featured",
  "amilia link": "Amilia Link",
  notes: "Notes",
  id: "id",
  compus_code: "Location Code",
  campus_code: "Location Code",
  stage: "Program",
  series_id: "Activity",
  offering_name: "Session Title",
  location_code: "Location Name",
}

const SERIES_DISPLAY_NAMES = {
  launchpad: "LaunchPad",
  robochamp: "RoboChamps",
  roboquest: "RoboQuests JR",
  freetrial: "Free Trial",
  workshops: "Workshops",
  daysummercamps: "Day & Summer Camps",
  competitionteams: "Competition Teams",
  competitionfundamentals: "Competition Fundamentals",
}

/** Human-readable v3_series.display_name from slug or raw label */
function formatSeriesDisplayName(seriesName) {
  const raw = String(seriesName || "").trim()
  if (!raw) return raw
  const key = raw.toLowerCase().replace(/[^a-z0-9_]/g, "_")
  if (SERIES_DISPLAY_NAMES[key]) return SERIES_DISPLAY_NAMES[key]
  if (SERIES_DISPLAY_NAMES[raw.toLowerCase()]) return SERIES_DISPLAY_NAMES[raw.toLowerCase()]
  // Title-case tokens split on _ or camelCase boundaries
  const spaced = raw
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
  return spaced.replace(/\b\w/g, (c) => c.toUpperCase())
}

const DAY_MAP = {
  sunday: "0",
  sun: "0",
  monday: "1",
  mon: "1",
  tuesday: "2",
  tue: "2",
  tues: "2",
  wednesday: "3",
  wed: "3",
  thursday: "4",
  thu: "4",
  thur: "4",
  thurs: "4",
  friday: "5",
  fri: "5",
  saturday: "6",
  sat: "6",
}

const ERROR_CODES = {
  UNKNOWN_LOCATION: "UNKNOWN_LOCATION",
  UNKNOWN_CATEGORY: "UNKNOWN_CATEGORY",
  PROGRAM_NOT_FOUND: "PROGRAM_NOT_FOUND",
  OFFERING_NOT_FOUND: "OFFERING_NOT_FOUND",
  OFFERING_AMBIGUOUS: "OFFERING_AMBIGUOUS",
  OFFERING_DRAFT: "OFFERING_DRAFT",
  CAMPUS_NOT_FOUND: "CAMPUS_NOT_FOUND",
  SCHEMA_VALIDATION: "SCHEMA_VALIDATION",
  DUPLICATE_IN_FILE: "DUPLICATE_IN_FILE",
  PARSE_ERROR: "PARSE_ERROR",
  INTEGRITY: "INTEGRITY",
  UNKNOWN_OFFERING_TYPE: "UNKNOWN_OFFERING_TYPE",
  SCHEMA_DRIFT: "SCHEMA_DRIFT",
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

function parseArgs(argv) {
  const args = {
    dryRun: true,
    execute: false,
    file: null,
    typeCode: null,
    publishReferencedOfferings: false,
    allowDraftOffering: false,
    allowFileDuplicates: false,
    failFast: false,
    replaceAll: false,
    insertOnly: false,
    audit: false,
    manifest: null,
  }
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--execute") {
      args.execute = true
      args.dryRun = false
    } else if (argv[i] === "--dry-run") {
      args.dryRun = true
      args.execute = false
    } else if (argv[i] === "--file" && argv[i + 1]) {
      args.file = argv[++i]
    } else if (argv[i] === "--type" && argv[i + 1]) {
      args.typeCode = argv[++i].toLowerCase()
    } else if (argv[i] === "--manifest" && argv[i + 1]) {
      args.manifest = argv[++i]
    } else if (argv[i] === "--publish-referenced-offerings") {
      args.publishReferencedOfferings = true
    } else if (argv[i] === "--allow-draft-offering") {
      args.allowDraftOffering = true
    } else if (argv[i] === "--allow-file-duplicates") {
      args.allowFileDuplicates = true
    } else if (argv[i] === "--fail-fast") {
      args.failFast = true
    } else if (argv[i] === "--replace-all") {
      args.replaceAll = true
    } else if (argv[i] === "--insert-only") {
      args.insertOnly = true
    } else if (argv[i] === "--audit") {
      args.audit = true
    }
  }
  if (args.replaceAll) args.insertOnly = true
  return args
}

function parseExportArgs(argv) {
  const args = {
    typeCode: null,
    out: null,
    status: null,
    location: null,
    writeTemplate: false,
  }
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--type" && argv[i + 1]) {
      args.typeCode = argv[++i].trim().toLowerCase()
    } else if (argv[i] === "--out" && argv[i + 1]) {
      args.out = argv[++i]
    } else if (argv[i] === "--status" && argv[i + 1]) {
      args.status = argv[++i].trim().toLowerCase()
    } else if (argv[i] === "--location" && argv[i + 1]) {
      args.location = argv[++i].trim().toLowerCase()
    } else if (argv[i] === "--write-template") {
      args.writeTemplate = true
    }
  }
  if (!args.typeCode) {
    throw new Error("--type is required (e.g. --type camp)")
  }
  if (!args.out) {
    args.out = args.writeTemplate
      ? templateInstanceCsvPath(args.typeCode)
      : defaultInstanceCsvPath(args.typeCode)
  }
  return args
}

function defaultInstanceCsvPath(typeCode) {
  return path.join(__dirname, "..", "output", `Blaze-Instances-${typeCode}.csv`)
}

function templateInstanceCsvPath(typeCode) {
  return path.join(__dirname, "..", "templates", `instances-${typeCode}-template.csv`)
}

function defaultInstanceManifestPath(csvPath) {
  const dir = path.dirname(csvPath)
  const base = path.basename(csvPath, path.extname(csvPath))
  return path.join(dir, `${base}-schema.json`)
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

function parseXlsx(filePath) {
  return parseXlsxSpreadsheet(filePath)
}

function parseSpreadsheet(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === ".csv") return parseCsv(filePath)
  if (ext === ".xlsx" || ext === ".xls") return parseXlsx(filePath)
  throw new Error(`Unsupported file type: ${ext} (use .csv or .xlsx)`)
}

function normalizeHeader(h) {
  const key = String(h || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
  return HEADER_ALIASES[key] || h.trim()
}

function getCategoryLabel(row) {
  return row.Program || row["Programs (category)"] || ""
}

function getActivityLabel(row) {
  return row.Activity || row["Activity (program)"] || row["Program Name"] || ""
}

function getSessionTitle(row) {
  return row["Session Title"] || row["Offering Title"] || ""
}

/** Web Location label → v2_campus (display_name or name). Legacy CSV header: Campus */
function getLocationName(row) {
  return row["Location Name"] || row.Campus || ""
}

function formatCampusLabelForCsv(campus) {
  if (!campus) return ""
  return campus.display_name || campus.name || ""
}

function rowHasAnyIdentity(row) {
  return Boolean(
    row["Location Code"] ||
      getCategoryLabel(row) ||
      getActivityLabel(row) ||
      getSessionTitle(row) ||
      row["Start Date"]
  )
}

function rowHasIdentity(row) {
  return Boolean(row["Location Code"] && getActivityLabel(row) && getSessionTitle(row))
}

function rowIsEmpty(row) {
  return !rowHasAnyIdentity(row) && !row.id
}

function normalizeActivityForCourse(label) {
  const raw = String(label || "").trim()
  if (!raw) return raw
  if (/2026\s+summer\s+camps/i.test(raw) && !/courses/i.test(raw)) {
    return raw.replace(/camps/i, "Courses")
  }
  return raw
}

function decodeHtmlEntities(text) {
  if (!text) return text
  return String(text)
    .replace(/&mdash;/g, "\u2014")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim()
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

function parseOptionalNumber(val) {
  const v = String(val ?? "").trim()
  if (!v) return null
  const n = Number(v)
  if (Number.isNaN(n)) throw new Error(`Invalid number: ${val}`)
  return n
}

function parseDate(val, label) {
  const v = String(val ?? "").trim()
  if (!v) throw new Error(`${label} is required`)
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const serial = Number(v)
  if (!Number.isNaN(serial) && serial > 20000 && serial < 80000) {
    const epoch = Date.UTC(1899, 11, 30)
    const d = new Date(epoch + serial * 86400000)
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }
  const mdy = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mdy) {
    const [, month, day, year] = mdy
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
  }
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date for ${label}: ${val}`)
  return d.toISOString().slice(0, 10)
}

function tryParseDate(val) {
  if (!String(val ?? "").trim()) return null
  try {
    return parseDate(val, "date")
  } catch {
    return null
  }
}

function looksLikeTime(val) {
  return /^\d{1,2}:\d{2}(:\d{2})?$/.test(String(val ?? "").trim())
}

function parseOptionalTime(val) {
  const v = String(val ?? "").trim()
  if (!v) return null
  if (/^\d{1,2}:\d{2}$/.test(v)) return `${v}:00`
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(v)) return v
  const serial = Number(v)
  if (!Number.isNaN(serial) && serial >= 0 && serial < 1) {
    const totalMinutes = Math.round(serial * 24 * 60)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`
  }
  if (looksLikeTime(v)) return null
  return null
}

function normalizeKey(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function campusKey(name) {
  const n = normalizeKey(name)
  return n || "__none__"
}

function naturalKey(locationCode, categoryLabel, activityLabel, sessionTitle, startDate, campusName) {
  return [
    normalizeKey(locationCode),
    normalizeKey(categoryLabel),
    normalizeKey(activityLabel),
    normalizeKey(sessionTitle),
    startDate,
    campusKey(campusName),
  ].join("|")
}

function validateInstanceSchema(instanceSchemaFields, mergedExt, opts = {}) {
  if (!instanceSchemaFields) return
  const relaxAgeBounds = opts.relaxAgeBounds === true
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
        const skipBounds =
          relaxAgeBounds &&
          (fieldPath === "age_range.age_min" || fieldPath === "age_range.age_max")
        if (!skipBounds) {
          if (fieldConfig.min !== undefined && value < fieldConfig.min) {
            errors.push(`${fieldLabel} must be at least ${fieldConfig.min}`)
          }
          if (fieldConfig.max !== undefined && value > fieldConfig.max) {
            errors.push(`${fieldLabel} must be at most ${fieldConfig.max}`)
          }
        }
      }
    }
    if (fieldConfig.type === "multiselect" && fieldConfig.options) {
      const values = Array.isArray(val) ? val : [val]
      const optSet = new Set(fieldConfig.options.map((o) => String(o)))
      const invalid = values.filter((v) => !optSet.has(String(v)))
      if (invalid.length) errors.push(`${fieldLabel} contains invalid values: ${invalid.join(", ")}`)
    }
  }

  for (const [fieldName, fieldConfig] of Object.entries(instanceSchemaFields)) {
    const fieldLabel = fieldConfig.label || fieldName
    if (fieldConfig.type === "object" && fieldConfig.properties) {
      const obj = mergedExt[fieldName]
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
      validateField(mergedExt[fieldName], fieldConfig, fieldLabel, fieldName)
    }
  }

  if (errors.length) throw new Error(errors.join("; "))
}

function derivePortalFields(offering, offeringTypeCode) {
  const typeConfig = offering.type_config_data || {}
  const isCourseType =
    offeringTypeCode === "course"
      ? typeConfig?.portal_config?.is_course_type !== false
      : !!typeConfig?.portal_config?.is_course_type
  const rawRole = typeConfig?.portal_service_role
  const ot = Array.isArray(offering.offering_type) ? offering.offering_type[0] : offering.offering_type
  const typeRole = ot?.portal_service_role
  const portalServiceRole =
    rawRole === "meal_service" || rawRole === "care_service"
      ? rawRole
      : typeRole === "meal_service" || typeRole === "care_service"
        ? typeRole
        : null
  return { isCourseType, portalServiceRole }
}

function getOfferingTypeCode(offering) {
  const ot = Array.isArray(offering.offering_type) ? offering.offering_type[0] : offering.offering_type
  return ot?.code || null
}

async function preflight(supabase) {
  const ct = tables()
  const sel = instancePreflightSelects()
  const [
    { data: offeringTypes, error: typesErr },
    { data: franchises },
    { data: categories },
    { data: programs },
    { data: offerings },
    { data: campuses },
    { data: instances },
  ] = await Promise.all([
    supabase.from(ct.offeringType).select(sel.offeringTypeFields),
    supabase.from(ct.campus).select(sel.campusFields),
    supabase.from(ct.stage).select(sel.stageFields),
    supabase.from(ct.series).select(sel.seriesFields),
    supabase.from(ct.offering).select(sel.offeringFields),
    supabase.from(ct.location).select(sel.locationFields),
    supabase.from(ct.session).select(sel.sessionFields),
  ])

  if (typesErr) throw new Error(`Failed to load offering types: ${typesErr.message}`)

  const offeringTypesByCode = new Map()
  for (const t of offeringTypes || []) {
    if (t.is_active === false) continue
    offeringTypesByCode.set(t.code, t)
  }
  if (!offeringTypesByCode.has("camp") || !offeringTypesByCode.has("course")) {
    console.warn("[v2_instance] Camp and/or course offering types not found in preflight")
  }

  const categoriesByKey = new Map()
  for (const c of categories || []) {
    if (c.is_active === false) continue
    for (const k of [normalizeKey(c.name), normalizeKey(c.display_name)].filter(Boolean)) {
      if (categoriesByKey.has(k) && categoriesByKey.get(k).id !== c.id) {
        throw new Error(`Ambiguous category key: ${k}`)
      }
      categoriesByKey.set(k, c)
    }
  }

  const franchiseByCode = new Map()
  const franchiseByName = new Map()
  for (const f of franchises || []) {
    if (f.is_active === false) continue
    franchiseByCode.set(normalizeKey(f.code), f)
    franchiseByName.set(normalizeKey(f.name), f)
  }

  const programsByFranchise = new Map()
  for (const p of programs || []) {
    if (p.is_active === false) continue
    const norm = normalizeSeriesRow(p)
    const campusKey = norm.franchise_id
    const list = programsByFranchise.get(campusKey) || []
    list.push(norm)
    programsByFranchise.set(campusKey, list)
  }

  const offeringsByName = new Map()
  for (const o of offerings || []) {
    const k = normalizeKey(o.name)
    if (!offeringsByName.has(k)) offeringsByName.set(k, [])
    offeringsByName.get(k).push(o)
  }

  const campusesByFranchise = new Map()
  for (const c of campuses || []) {
    const parentId = c.franchise_id ?? c.campus_id
    const list = campusesByFranchise.get(parentId) || []
    list.push(c)
    campusesByFranchise.set(parentId, list)
  }

  const instanceByNaturalKey = new Map()
  const instancesById = new Map()
  for (const inst of instances || []) {
    instancesById.set(inst.id, inst)
    const prog = Array.isArray(inst.program) ? inst.program[0] : inst.program
    const off = Array.isArray(inst.offering) ? inst.offering[0] : inst.offering
    const camp = isCatalogV3()
      ? inst.location_id
        ? Array.isArray(inst.campus)
          ? inst.campus[0]
          : inst.campus
        : null
      : inst.campus_id
        ? Array.isArray(inst.campus)
          ? inst.campus[0]
          : inst.campus
        : null
    const loc = prog?.franchise?.code || ""
    const cat = Array.isArray(prog?.category) ? prog.category[0] : prog?.category
    const categoryLabel = cat?.display_name || cat?.name || ""
    const activityLabel = prog?.display_name || prog?.name || ""
    const campusLabel = camp ? camp.display_name || camp.name || "" : ""

    const nkWithCampus = naturalKey(
      loc,
      categoryLabel,
      activityLabel,
      off?.name || "",
      inst.start_date,
      campusLabel
    )
    instanceByNaturalKey.set(nkWithCampus, inst)

    const nkEmpty = naturalKey(
      loc,
      categoryLabel,
      activityLabel,
      off?.name || "",
      inst.start_date,
      ""
    )
    if (!instanceByNaturalKey.has(nkEmpty)) {
      instanceByNaturalKey.set(nkEmpty, inst)
    }
  }

  return {
    offeringTypesByCode,
    categoriesByKey,
    franchiseByCode,
    franchiseByName,
    programsByFranchise,
    offeringsByName,
    campusesByFranchise,
    instanceByNaturalKey,
    instancesById,
    preflightCounts: {
      offering_types: offeringTypesByCode.size,
      franchises: franchiseByCode.size,
      categories: categoriesByKey.size,
      programs: (programs || []).filter((p) => p.is_active !== false).length,
      offerings: (offerings || []).length,
      campuses: (campuses || []).length,
      instances: (instances || []).length,
    },
  }
}

function findCategory(categoriesByKey, label) {
  const n = normalizeKey(label)
  if (!n) {
    const err = new Error("Programs (category) is required (Learn / Explore / Compete)")
    err.errorCode = ERROR_CODES.UNKNOWN_CATEGORY
    throw err
  }
  const cat = categoriesByKey.get(n)
  if (!cat) {
    const available = [...categoriesByKey.values()]
      .map((c) => c.display_name || c.name)
      .filter((v, i, a) => a.indexOf(v) === i)
      .join(", ")
    const err = new Error(`Unknown Programs (category): "${label}". Available: ${available || "none"}`)
    err.errorCode = ERROR_CODES.UNKNOWN_CATEGORY
    err.hint = available ? `Available: ${available}` : undefined
    throw err
  }
  return cat
}

function findProgram(programs, programName) {
  const n = normalizeKey(programName)
  if (!programs?.length) return null
  let found =
    programs.find((p) => normalizeKey(p.display_name) === n) ||
    programs.find((p) => normalizeKey(p.name) === n) ||
    programs.find((p) => normalizeKey(p.name) === n.replace(/\s+/g, "_"))
  if (found) return found
  found = programs.find(
    (p) => normalizeKey(p.display_name).includes(n) || n.includes(normalizeKey(p.display_name))
  )
  return found || null
}

function programsMatchingActivity(programs, activityLabel) {
  if (!programs?.length) return []
  return programs.filter((p) => findProgram([p], activityLabel))
}

function findCampus(campuses, campusName) {
  const n = campusKey(campusName)
  if (n === "__none__") return null
  const cn = normalizeKey(campusName)
  const exact =
    campuses.find((c) => normalizeKey(c.display_name) === cn) ||
    campuses.find((c) => normalizeKey(c.name) === cn)
  if (exact) return exact
  for (const c of campuses) {
    const dn = normalizeKey(c.display_name)
    const nm = normalizeKey(c.name)
    if (dn && cn.includes(dn)) return c
    if (nm && cn.includes(nm)) return c
    if (dn && dn.includes(cn)) return c
    if (nm && nm.includes(cn)) return c
  }
  if (campuses.length === 1) return campuses[0]
  return null
}

function resolveOffering(offeringsByName, offeringTitle, categoryId) {
  const list = offeringsByName.get(normalizeKey(offeringTitle)) || []
  if (!list.length) return null
  if (isCatalogV3()) {
    if (list.length === 1) return list[0]
    const err = new Error(`Multiple offerings named "${offeringTitle}"`)
    err.errorCode = ERROR_CODES.OFFERING_AMBIGUOUS
    throw err
  }
  const match = list.filter((o) => o.category_id === categoryId)
  if (match.length === 1) return match[0]
  if (match.length > 1) {
    const err = new Error(`Multiple offerings named "${offeringTitle}" in category ${categoryId}`)
    err.errorCode = ERROR_CODES.OFFERING_AMBIGUOUS
    throw err
  }
  return null
}

function findExistingInstance(ctx, params) {
  const { locationCode, categoryLabel, activityLabel, sessionTitle, startDate, csvCampus, resolvedCampus } =
    params
  const campusCandidates = [csvCampus, resolvedCampus ? resolvedCampus.display_name || resolvedCampus.name : "", ""]
  const seen = new Set()
  for (const campusName of campusCandidates) {
    const nk = naturalKey(locationCode, categoryLabel, activityLabel, sessionTitle, startDate, campusName)
    if (seen.has(nk)) continue
    seen.add(nk)
    const inst = ctx.instanceByNaturalKey.get(nk)
    if (inst) return { instance: inst, naturalKey: nk }
  }
  return { instance: null, naturalKey: naturalKey(locationCode, categoryLabel, activityLabel, sessionTitle, startDate, csvCampus) }
}

function classifyError(err) {
  if (err.errorCode) return err.errorCode
  const msg = err.message || ""
  if (msg.includes("Unknown Location")) return ERROR_CODES.UNKNOWN_LOCATION
  if (msg.includes("Programs (category)") || msg.includes("Unknown Program")) return ERROR_CODES.UNKNOWN_CATEGORY
  if (msg.includes("Activity not found")) return ERROR_CODES.PROGRAM_NOT_FOUND
  if (msg.includes("Session Title not found")) return ERROR_CODES.OFFERING_NOT_FOUND
  if (msg.includes("Location Name not found") || msg.includes("Campus not found")) return ERROR_CODES.CAMPUS_NOT_FOUND
  if (msg.includes("category does not match")) return ERROR_CODES.INTEGRITY
  if (msg.includes("Invalid date") || msg.includes("Invalid Yes/No") || msg.includes("Invalid number")) {
    return ERROR_CODES.PARSE_ERROR
  }
  if (msg.includes("is required") || msg.includes("must be")) return ERROR_CODES.SCHEMA_VALIDATION
  return "FAILED"
}

function resolveRow(row, ctx, { requireCategory = true } = {}) {
  if (row._legacyHeaders) {
    console.warn(
      `[${row._rowNum}] Legacy columns Program Name / Offering Title — use Programs (category), Activity (program), Session Title`
    )
  }

  const locationCode = row["Location Code"]
  let franchise = ctx.franchiseByCode.get(normalizeKey(locationCode))
  if (!franchise) franchise = ctx.franchiseByName.get(normalizeKey(locationCode))
  if (!franchise) {
    const err = new Error(`Unknown Location Code: ${locationCode}`)
    err.errorCode = ERROR_CODES.UNKNOWN_LOCATION
    throw err
  }

  const categoryLabelInput = getCategoryLabel(row)
  if (requireCategory && !categoryLabelInput) {
    const err = new Error("Programs (category) is required")
    err.errorCode = ERROR_CODES.UNKNOWN_CATEGORY
    throw err
  }

  const rawActivity = getActivityLabel(row)
  const sessionTitle = getSessionTitle(row)
  if (!rawActivity) throw new Error("Activity (program) is required (v2_program, e.g. 2026 Summer Camps)")
  if (!sessionTitle) throw new Error("Session Title is required (v2_offering.name)")

  const programs = ctx.programsByFranchise.get(franchise.id) || []

  let category
  let program
  let offering

  if (categoryLabelInput) {
    category = findCategory(ctx.categoriesByKey, categoryLabelInput)

    offering = resolveOffering(ctx.offeringsByName, sessionTitle, category.id)
    if (!offering) {
      const err = new Error(`Session Title not found: ${sessionTitle}`)
      err.errorCode = ERROR_CODES.OFFERING_NOT_FOUND
      throw err
    }

    const offeringTypeCodeEarly = getOfferingTypeCode(offering)
    let activityForLookup = rawActivity
    if (offeringTypeCodeEarly === "course") {
      const normalized = normalizeActivityForCourse(rawActivity)
      if (normalized !== rawActivity) activityForLookup = normalized
    }

    const scoped = programs.filter((p) => p.category_id === category.id)
    program = findProgram(scoped, activityForLookup)
    if (
      !program &&
      !isCatalogV3() &&
      scoped.length === 1 &&
      !/courses/i.test(activityForLookup) &&
      offeringTypeCodeEarly !== "course"
    ) {
      program = scoped[0]
      console.warn(
        `[${row._rowNum}] Activity "${activityForLookup}" not found under "${categoryLabelInput}" at ${locationCode}; using sole program "${program.display_name || program.name}"`
      )
    }
    if (!program) {
      const err = new Error(
        `Activity not found: "${activityForLookup}" under Programs (category) "${categoryLabelInput}" at ${locationCode}. ` +
          `Available: ${scoped.map((p) => p.display_name || p.name).join(", ") || "none"}`
      )
      err.errorCode = ERROR_CODES.PROGRAM_NOT_FOUND
      err.hint = `Available: ${scoped.map((p) => p.display_name || p.name).join(", ") || "none"}`
      throw err
    }
  } else {
    const activityMatches = programsMatchingActivity(programs, rawActivity)
    if (!activityMatches.length) {
      const err = new Error(
        `Activity not found: "${rawActivity}" at ${locationCode}. Available: ${programs.map((p) => p.display_name || p.name).join(", ") || "none"}`
      )
      err.errorCode = ERROR_CODES.PROGRAM_NOT_FOUND
      throw err
    }
    let offeringCandidate = null
    for (const p of activityMatches) {
      const catRow = Array.isArray(p.category) ? p.category[0] : p.category
      if (!catRow?.id) continue
      const off = resolveOffering(ctx.offeringsByName, sessionTitle, catRow.id)
      if (!off) continue
      if (program) {
        const err = new Error(
          `Ambiguous row: Session Title "${sessionTitle}" with Activity "${rawActivity}" at ${locationCode} matches multiple programs/categories`
        )
        err.errorCode = ERROR_CODES.OFFERING_AMBIGUOUS
        throw err
      }
      program = p
      offeringCandidate = off
      category = catRow
    }
    if (!program || !offeringCandidate) {
      const err = new Error(
        `Session Title not found: ${sessionTitle} (with Activity "${rawActivity}" at ${locationCode})`
      )
      err.errorCode = ERROR_CODES.OFFERING_NOT_FOUND
      throw err
    }
    offering = offeringCandidate
  }

  if (!offering) {
    offering = resolveOffering(ctx.offeringsByName, sessionTitle, category.id)
    if (!offering) {
      const err = new Error(`Session Title not found: ${sessionTitle}`)
      err.errorCode = ERROR_CODES.OFFERING_NOT_FOUND
      throw err
    }
  }

  if (program.category_id !== category.id) {
    const err = new Error(
      `Activity "${rawActivity}" category does not match Programs (category) "${categoryLabelInput || category.display_name}"`
    )
    err.errorCode = ERROR_CODES.INTEGRITY
    throw err
  }

  const offeringTypeCode = getOfferingTypeCode(offering)
  if (!offeringTypeCode || !ctx.offeringTypesByCode.has(offeringTypeCode)) {
    const err = new Error(`Unknown offering type for "${sessionTitle}": ${offeringTypeCode || "missing"}`)
    err.errorCode = ERROR_CODES.UNKNOWN_OFFERING_TYPE
    throw err
  }

  const tagType = row["Offering Type (tag)"]
  if (tagType && normalizeKey(tagType) !== normalizeKey(offeringTypeCode)) {
    console.warn(
      `[${row._rowNum}] Offering Type (tag) "${tagType}" does not match resolved type "${offeringTypeCode}"`
    )
  }

  const campuses = ctx.campusesByFranchise.get(franchise.id) || []
  const locationName = getLocationName(row)
  const campus = findCampus(campuses, locationName)
  if (locationName && !campus) {
    const err = new Error(`Location Name not found: "${locationName}" at ${locationCode}`)
    err.errorCode = ERROR_CODES.CAMPUS_NOT_FOUND
    throw err
  }

  let activityLabel = rawActivity
  let activityResolved = null
  if (offeringTypeCode === "course") {
    const normalized = normalizeActivityForCourse(rawActivity)
    if (normalized !== rawActivity) {
      activityLabel = normalized
      activityResolved = normalized
      if (!program || normalizeKey(program.display_name || program.name) !== normalizeKey(normalized)) {
        const scoped = programs.filter((p) => p.category_id === category.id)
        const reparsed = findProgram(scoped, normalized)
        if (reparsed) program = reparsed
      }
    }
  }

  if (!isCatalogV3() && offering.category_id !== program.category_id) {
    const err = new Error(
      `Offering category (${offering.category_id}) does not match program category (${program.category_id}) for "${sessionTitle}"`
    )
    err.errorCode = ERROR_CODES.INTEGRITY
    throw err
  }

  const offeringType = ctx.offeringTypesByCode.get(offeringTypeCode)
  const categoryConfigBase =
    category?.config_base && typeof category.config_base === "object" ? category.config_base : {}

  const schemaColumns = buildSchemaColumns(offeringType.instance_schema)
  const mergedExt = buildInstanceExtFromSchemaRow(row, schemaColumns, categoryConfigBase, offeringType)
  const parsed = { notes: decodeHtmlEntities(row.Notes) || mergedExt.notes || null }
  const derived = deriveFlatColumnsFromExt(mergedExt, offeringTypeCode, parsed)

  const statusRaw = (row.Status || "scheduled").trim().toLowerCase()
  const validStatuses = ["scheduled", "ongoing", "completed", "cancelled"]
  if (!validStatuses.includes(statusRaw)) {
    throw new Error(`Invalid status: ${row.Status}`)
  }

  const { isCourseType, portalServiceRole } = derivePortalFields(offering, offeringTypeCode)
  const amilia = decodeHtmlEntities(row["Amilia Link"])

  const dbRow = sessionInsertFromBody({
    program_id: program.id,
    offering_id: offering.id,
    campus_id: campus?.id || null,
    price_override: derived.finalPriceOverride,
    start_date: derived.finalStartDate,
    end_date: derived.finalEndDate,
    start_time: derived.finalStartTime,
    end_time: derived.finalEndTime,
    instance_data_ext: mergedExt,
    timezone: "UTC",
    status: statusRaw,
    notes: parsed.notes,
    is_active: parseYesNo(row["Is Active"], true),
    featured: parseYesNo(row.Featured, false),
    is_course_type: isCourseType,
    portal_service_role: portalServiceRole,
    amilia_link: amilia || null,
    current_students: 0,
  })

  dbRow.max_students = derived.finalMaxStudents
  dbRow.days_of_week = derived.finalDaysOfWeek

  const categoryLabel = category.display_name || category.name || categoryLabelInput
  let existing = null
  let nk = null

  if (row.id && ctx.instancesById) {
    existing = ctx.instancesById.get(row.id) || null
    if (!existing) {
      const err = new Error(`Instance id not found: ${row.id}`)
      err.errorCode = ERROR_CODES.NOT_FOUND
      throw err
    }
    nk = naturalKey(
      locationCode,
      categoryLabel,
      activityLabel,
      sessionTitle,
      derived.finalStartDate,
      locationName
    )
  } else {
    const found = findExistingInstance(ctx, {
      locationCode,
      categoryLabel,
      activityLabel,
      sessionTitle,
      startDate: derived.finalStartDate,
      csvCampus: locationName,
      resolvedCampus: campus,
    })
    existing = found.instance
    nk = found.naturalKey
  }

  return {
    dbRow,
    offering,
    program,
    category,
    franchise,
    offeringTypeCode,
    derived,
    naturalKey: nk,
    existing,
    activityResolved,
    input: {
      locationCode,
      category: categoryLabelInput,
      activity: rawActivity,
      sessionTitle,
      campus: locationName,
      startDate: row["Start Date"],
    },
    resolved: {
      franchise: { id: franchise.id, code: franchise.code, name: franchise.name },
      category: { id: category.id, name: category.display_name || category.name },
      program: { id: program.id, name: program.display_name || program.name },
      offering: { id: offering.id, name: offering.name, status: offering.status },
      campus: campus ? { id: campus.id, name: campus.display_name || campus.name } : null,
    },
  }
}

function buildUpdatePayload(dbRow) {
  const payload = { ...dbRow }
  delete payload.current_students
  return payload
}

function diffDbRow(before, after) {
  const changes = {}
  const keys = new Set([...Object.keys(after || {}), ...Object.keys(before || {})])
  for (const k of keys) {
    if (k === "current_students") continue
    const a = after?.[k]
    const b = before?.[k]
    if (k === "instance_data_ext") {
      const aStr = stableStringify(normalizeConfigForCompare(b || {}))
      const bStr = stableStringify(normalizeConfigForCompare(a || {}))
      if (aStr !== bStr) changes[k] = { before: b, after: a }
    } else if (k === "days_of_week") {
      const aArr = JSON.stringify(b ?? null)
      const bArr = JSON.stringify(a ?? null)
      if (aArr !== bArr) changes[k] = { before: b, after: a }
    } else {
      const aStr = JSON.stringify(a)
      const bStr = JSON.stringify(b)
      if (aStr !== bStr) changes[k] = { before: b, after: a }
    }
  }
  return changes
}

function snapshotInstance(inst) {
  if (!inst) return null
  return {
    id: inst.id,
    program_id: inst.program_id,
    offering_id: inst.offering_id,
    campus_id: inst.campus_id,
    start_date: inst.start_date,
    end_date: inst.end_date,
    start_time: inst.start_time,
    end_time: inst.end_time,
    max_students: inst.max_students,
    price_override: inst.price_override,
    current_students: inst.current_students,
    status: inst.status,
    notes: inst.notes,
    is_active: inst.is_active,
    featured: inst.featured,
    days_of_week: inst.days_of_week,
    amilia_link: inst.amilia_link,
    instance_data_ext: inst.instance_data_ext,
  }
}

async function publishOffering(supabase, offeringId) {
  const { error } = await supabase.from(tables().offering).update({ status: "published" }).eq("id", offeringId)
  if (error) throw new Error(`Failed to publish offering ${offeringId}: ${error.message}`)
}

async function auditInstancesIntegrity(supabase) {
  const { data: instances, error } = await supabase
    .from(tables().session)
    .select(
      `id, program_id, offering_id,
      program:v2_program(id, category_id, display_name, name,
        category:v2_category(id, name, display_name)),
      offering:v2_offering(id, category_id, name,
        category:v2_category(id, name, display_name))`
    )

  if (error) throw new Error(`Audit query failed: ${error.message}`)

  const rows = instances || []
  const mismatches = []

  for (const inst of rows) {
    const prog = Array.isArray(inst.program) ? inst.program[0] : inst.program
    const off = Array.isArray(inst.offering) ? inst.offering[0] : inst.offering
    if (!prog || !off) continue
    if (prog.category_id === off.category_id) continue

    const progCat = Array.isArray(prog.category) ? prog.category[0] : prog.category
    const offCat = Array.isArray(off.category) ? off.category[0] : off.category

    mismatches.push({
      instance_id: inst.id,
      program_id: prog.id,
      program_category_id: prog.category_id,
      program_category: progCat?.display_name || progCat?.name || prog.category_id,
      offering_id: off.id,
      offering_category_id: off.category_id,
      offering_category: offCat?.display_name || offCat?.name || off.category_id,
      offering_name: off.name,
    })
  }

  return {
    total_instances: rows.length,
    mismatch_count: mismatches.length,
    mismatches,
  }
}

async function deleteAllInstances(supabase) {
  const { count, error: countErr } = await supabase
    .from(tables().session)
    .select("id", { count: "exact", head: true })
  if (countErr) throw new Error(`Count instances failed: ${countErr.message}`)

  if (!count) return { deleted: 0 }

  const { error } = await supabase
    .from(tables().session)
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000")
  if (error) throw new Error(`Delete all instances failed: ${error.message}`)

  return { deleted: count }
}

function deriveFlatColumnsFromExt(mergedExt, offeringTypeCode, parsed = {}) {
  const schedule = mergedExt.schedule && typeof mergedExt.schedule === "object" ? mergedExt.schedule : {}
  const capacity =
    mergedExt.capacity_price && typeof mergedExt.capacity_price === "object" ? mergedExt.capacity_price : {}

  let finalStartDate = schedule.start_date || parsed.startDate
  let finalEndDate = schedule.end_date || parsed.endDate
  let finalStartTime = schedule.start_time || parsed.startTime || null
  let finalEndTime = schedule.end_time || parsed.endTime || null
  let finalDaysOfWeek = schedule.days_of_week || parsed.daysOfWeek || null
  let finalMaxStudents =
    capacity.max_students != null ? capacity.max_students : parsed.maxStudents != null ? parsed.maxStudents : null
  let finalPriceOverride =
    capacity.price_override != null
      ? capacity.price_override
      : parsed.priceOverride != null
        ? parsed.priceOverride
        : null

  if (!finalStartDate || !finalEndDate) {
    throw new Error("schedule.start_date and schedule.end_date are required in instance_data_ext")
  }
  if (finalStartDate > finalEndDate) {
    throw new Error("schedule.start_date must be on or before schedule.end_date")
  }

  if (offeringTypeCode === "camp" && finalMaxStudents != null && finalMaxStudents < 1) {
    throw new Error("capacity_price.max_students must be at least 1 when set")
  }

  const notes =
    parsed.notes ||
    mergedExt.notes ||
    mergedExt.additional?.special_needs ||
    null

  return {
    finalStartDate,
    finalEndDate,
    finalStartTime,
    finalEndTime,
    finalDaysOfWeek,
    finalMaxStudents,
    finalPriceOverride,
    notes,
  }
}

function buildInstanceExtFromSchemaRow(row, schemaColumns, categoryConfigBase, offeringType) {
  const userExt = buildFromRow(row, schemaColumns)
  const mergedExt = {
    ...(categoryConfigBase && typeof categoryConfigBase === "object" ? categoryConfigBase : {}),
    ...userExt,
  }
  validateInstanceSchema(offeringType.instance_schema?.fields, mergedExt, {
    relaxAgeBounds: offeringType.code === "course",
  })
  return mergedExt
}

function buildInstanceManifest(offeringType, schemaColumns) {
  return {
    offering_type_code: offeringType.code,
    offering_type_id: offeringType.id,
    schema_updated_at: offeringType.updated_at || null,
    schema_hash: computeSchemaHash(offeringType.instance_schema),
    fixed_columns: INSTANCE_FIXED_COLUMNS,
    columns: schemaColumns.map((c) => ({
      header: c.header,
      path: c.path,
      type: c.type,
      required: c.required,
      label: c.label,
    })),
  }
}

function getInstanceSchemaHeaders(schemaColumns) {
  return [...INSTANCE_FIXED_COLUMNS, ...schemaColumns.map((c) => c.header)]
}

const OPERATOR_FIXED_HEADERS = [
  "id",
  "compus_code",
  "stage",
  "series_id",
  "offering_name",
  "location_code",
  "status",
  "is_Active",
  "Featured",
  "Amilia Link",
  "Notes",
]

function exportOperatorHeaders(schemaColumns) {
  return [...OPERATOR_FIXED_HEADERS, ...schemaColumns.map((c) => c.header)]
}

function normalizeSchemaHeader(h) {
  const raw = String(h || "")
    .trim()
    .replace(/\uFF08/g, "(")
    .replace(/\uFF09/g, ")")
    .replace(/\s+/g, " ")
  const key = raw.toLowerCase()
  return HEADER_ALIASES[key] || raw
}

function rowsToSchemaObjects(tableRows) {
  if (!tableRows.length) return []
  const headers = tableRows[0].map(normalizeSchemaHeader)
  const missing = []
  if (!headers.includes("Location Code")) missing.push("Location Code")
  if (!headers.includes("Program") && !headers.includes("Programs (category)")) {
    missing.push("Programs (category)")
  }
  if (!headers.includes("Activity") && !headers.includes("Activity (program)")) {
    missing.push("Activity (program)")
  }
  if (!headers.includes("Session Title")) missing.push("Session Title")
  if (missing.length) {
    throw new Error(`Missing required columns: ${missing.join(", ")}`)
  }
  return tableRows.slice(1).map((row, idx) => {
    const obj = { _rowNum: idx + 2 }
    headers.forEach((h, i) => {
      obj[h] = row[i] != null ? String(row[i]).trim() : ""
    })
    if (obj.Program && !obj["Programs (category)"]) obj["Programs (category)"] = obj.Program
    if (obj["Programs (category)"] && !obj.Program) obj.Program = obj["Programs (category)"]
    if (obj.Activity && !obj["Activity (program)"]) obj["Activity (program)"] = obj.Activity
    if (obj["Location Name"] && !obj.Campus) obj.Campus = obj["Location Name"]
    if (obj.Campus && !obj["Location Name"]) obj["Location Name"] = obj.Campus
    return obj
  })
}

function schemaRowIsEmpty(row) {
  return !row.id && !row["Location Code"] && !row["Session Title"] && !row.offering_name
}

/** Create missing v3_series rows required by operator Excel (campus + stage + series name). */
async function bootstrapMissingSeries(supabase, ctx, rows, { dryRun = true } = {}) {
  if (!isCatalogV3()) return { created: 0, skipped: 0 }

  const needed = new Map()
  for (const row of rows) {
    if (schemaRowIsEmpty(row)) continue
    const campusCode = row["Location Code"]
    const stageName = getCategoryLabel(row)
    const seriesName = getActivityLabel(row)
    if (!campusCode || !stageName || !seriesName) continue

    let franchise = ctx.franchiseByCode.get(normalizeKey(campusCode))
    if (!franchise) franchise = ctx.franchiseByName.get(normalizeKey(campusCode))
    const category = ctx.categoriesByKey.get(normalizeKey(stageName))
    if (!franchise || !category) continue

    const key = `${franchise.id}|${category.id}|${normalizeKey(seriesName)}`
    if (!needed.has(key)) {
      needed.set(key, { franchise, category, seriesName, row })
    }
  }

  let created = 0
  let skipped = 0

  for (const { franchise, category, seriesName, row } of needed.values()) {
    const scoped = (ctx.programsByFranchise.get(franchise.id) || []).filter((p) => {
      const norm = normalizeSeriesRow(p)
      return norm.category_id === category.id && normalizeKey(norm.name) === normalizeKey(seriesName)
    })
    if (scoped.length) {
      skipped++
      continue
    }

    const startDate = row["schedule|start_date"] || row["Start Date"] || "2026-06-01"
    const endDate = row["schedule|end_date"] || row["End Date"] || "2026-08-31"
    const seriesKey = String(seriesName).trim().toLowerCase().replace(/[^a-z0-9_]/g, "_")
    const insertRow = {
      campus_id: franchise.id,
      stage_id: category.id,
      name: seriesKey,
      display_name: formatSeriesDisplayName(seriesName),
      start_date: startDate,
      end_date: endDate,
      is_active: true,
    }

    if (dryRun) {
      const pending = normalizeSeriesRow({
        id: `dry-run:${franchise.id}:${category.id}:${seriesKey}`,
        ...insertRow,
        category,
        franchise: { id: franchise.id, code: franchise.code },
      })
      const list = ctx.programsByFranchise.get(franchise.id) || []
      list.push(pending)
      ctx.programsByFranchise.set(franchise.id, list)
      created++
      continue
    }

    const { data, error } = await supabase
      .from(tables().series)
      .insert(insertRow)
      .select("id, name, display_name, campus_id, stage_id, is_active")
      .single()

    if (error) {
      throw new Error(
        `Failed to create series "${seriesName}" for ${franchise.code}/${category.name}: ${error.message}`
      )
    }

    const norm = normalizeSeriesRow({
      ...data,
      category,
      franchise: { id: franchise.id, code: franchise.code },
    })
    const list = ctx.programsByFranchise.get(franchise.id) || []
    list.push(norm)
    ctx.programsByFranchise.set(franchise.id, list)
    created++
    console.log(`[v3_series] Created ${seriesKey} (${franchise.code} / ${category.name})`)
  }

  return { created, skipped }
}

function loadManifest(manifestPath) {
  if (!manifestPath || !fs.existsSync(manifestPath)) return null
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"))
}

function detectSchemaDrift(fileManifest, dbManifest) {
  const warnings = []
  if (!fileManifest) return warnings
  if (fileManifest.schema_hash && dbManifest.schema_hash && fileManifest.schema_hash !== dbManifest.schema_hash) {
    warnings.push({
      code: ERROR_CODES.SCHEMA_DRIFT,
      message: `Schema hash mismatch: file=${fileManifest.schema_hash} db=${dbManifest.schema_hash}`,
    })
  }
  const fileHeaders = new Set([
    ...(fileManifest.fixed_columns || []),
    ...(fileManifest.columns || []).map((c) => c.header),
  ])
  const dbHeaders = new Set([
    ...(dbManifest.fixed_columns || []),
    ...(dbManifest.columns || []).map((c) => c.header),
  ])
  const missingInFile = [...dbHeaders].filter((h) => !fileHeaders.has(h))
  if (missingInFile.length) {
    warnings.push({
      code: ERROR_CODES.SCHEMA_DRIFT,
      message: `Missing columns in file (will import as empty): ${missingInFile.join(", ")}`,
    })
  }
  return warnings
}

function unwrapJoin(val) {
  return Array.isArray(val) ? val[0] : val
}

function enrichInstanceExtForExport(instance) {
  const ext =
    instance.instance_data_ext && typeof instance.instance_data_ext === "object"
      ? JSON.parse(JSON.stringify(instance.instance_data_ext))
      : {}
  if (!ext.schedule || typeof ext.schedule !== "object") ext.schedule = {}
  const s = ext.schedule
  if (!s.start_date && instance.start_date) s.start_date = instance.start_date
  if (!s.end_date && instance.end_date) s.end_date = instance.end_date
  if (!s.start_time && instance.start_time) s.start_time = instance.start_time
  if (!s.end_time && instance.end_time) s.end_time = instance.end_time
  if (!s.days_of_week && instance.days_of_week) s.days_of_week = instance.days_of_week
  if (!ext.capacity_price || typeof ext.capacity_price !== "object") ext.capacity_price = {}
  const c = ext.capacity_price
  if (c.max_students == null && instance.max_students != null) c.max_students = instance.max_students
  if (c.price_override == null && instance.price_override != null) c.price_override = instance.price_override
  return ext
}

function instanceToCsvRow(instance, schemaColumns) {
  const prog = unwrapJoin(instance.program)
  const off = unwrapJoin(instance.offering)
  const campus = isCatalogV3()
    ? instance.location_id
      ? unwrapJoin(instance.campus)
      : null
    : instance.campus_id
      ? unwrapJoin(instance.campus)
      : null
  const franchise = unwrapJoin(prog?.franchise)
  const category = unwrapJoin(prog?.category)
  const ext = enrichInstanceExtForExport(instance)
  const dynamic = flattenToRow(ext, schemaColumns)
  return {
    id: instance.id || "",
    "Location Code": franchise?.code || "",
    "Programs (category)": category?.display_name || category?.name || "",
    "Activity (program)": prog?.display_name || prog?.name || "",
    "Session Title": off?.name || "",
    "Location Name": formatCampusLabelForCsv(campus),
    Status: instance.status || "scheduled",
    "Is Active": instance.is_active === false ? "No" : "Yes",
    Featured: instance.featured ? "Yes" : "No",
    "Amilia Link": instance.amilia_link || "",
    Notes: instance.notes || "",
    ...dynamic,
  }
}

const REV_DAY_MAP = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
}

function formatDateForCsv(isoDate) {
  if (!isoDate) return ""
  const parts = String(isoDate).slice(0, 10).split("-")
  if (parts.length !== 3) return isoDate
  return `${Number(parts[1])}/${Number(parts[2])}/${parts[0]}`
}

function formatTimeForCsv(time) {
  if (!time) return ""
  const s = String(time)
  return s.length >= 5 ? s.slice(0, 5) : s
}

function formatDaysForCsv(days) {
  if (!days || !days.length) return ""
  return days.map((d) => REV_DAY_MAP[String(d)] || String(d)).join("|")
}

async function loadActiveOfferingTypes(supabase) {
  const { data, error } = await supabase
    .from(tables().offeringType)
    .select("id, code, name, is_active, instance_schema, updated_at, display_order")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
  if (error) throw new Error(`Failed to load offering types: ${error.message}`)
  return data || []
}

async function countInstancesForType(supabase, offeringTypeId) {
  const { data: offerings, error: offErr } = await supabase
    .from(tables().offering)
    .select("id")
    .eq("offering_type_id", offeringTypeId)
  if (offErr) throw new Error(`Failed to count offerings: ${offErr.message}`)
  const offeringIds = (offerings || []).map((o) => o.id)
  if (!offeringIds.length) return 0
  const { count, error } = await supabase
    .from(tables().session)
    .select("id", { count: "exact", head: true })
    .in("offering_id", offeringIds)
  if (error) throw new Error(`Failed to count instances: ${error.message}`)
  return count || 0
}

async function preflightForType(supabase, typeCode) {
  const typeFields = isCatalogV3()
    ? "id, code, name, is_active, instance_schema, updated_at"
    : "id, code, name, is_active, instance_schema, portal_service_role, updated_at"
  const { data: offeringType, error: typeErr } = await supabase
    .from(tables().offeringType)
    .select(typeFields)
    .eq("code", typeCode)
    .maybeSingle()

  if (typeErr || !offeringType) {
    throw new Error(`Offering type "${typeCode}" not found: ${typeErr?.message || "no row"}`)
  }
  if (!offeringType.is_active) {
    throw new Error(`Offering type "${typeCode}" exists but is not active`)
  }

  const baseCtx = await preflight(supabase)
  const schemaColumns = buildSchemaColumns(offeringType.instance_schema)
  const manifest = buildInstanceManifest(offeringType, schemaColumns)

  const { data: typeOfferings } = await supabase
    .from(tables().offering)
    .select("id")
    .eq("offering_type_id", offeringType.id)
  const offeringIds = new Set((typeOfferings || []).map((o) => o.id))

  const instancesForType = []
  for (const inst of baseCtx.instancesById.values()) {
    if (offeringIds.has(inst.offering_id)) instancesForType.push(inst)
  }

  const instancesByIdForType = new Map()
  const instanceByNaturalKeyForType = new Map()
  for (const inst of instancesForType) {
    instancesByIdForType.set(inst.id, inst)
    const prog = unwrapJoin(inst.program)
    const off = unwrapJoin(inst.offering)
    const camp = isCatalogV3()
      ? inst.location_id
        ? unwrapJoin(inst.campus)
        : null
      : inst.campus_id
        ? unwrapJoin(inst.campus)
        : null
    const franchise = unwrapJoin(prog?.franchise)
    const loc = franchise?.code || ""
    const cat = unwrapJoin(prog?.category)
    const categoryLabel = cat?.display_name || cat?.name || ""
    const activityLabel = prog?.display_name || prog?.name || ""
    const campusLabel = camp ? camp.display_name || camp.name || "" : ""
    const nk = naturalKey(loc, categoryLabel, activityLabel, off?.name || "", inst.start_date, campusLabel)
    instanceByNaturalKeyForType.set(nk, inst)
  }

  return {
    ...baseCtx,
    offeringType,
    schemaColumns,
    manifest,
    instancesById: instancesByIdForType,
    instanceByNaturalKey: instanceByNaturalKeyForType,
    offeringIdsForType: offeringIds,
  }
}

function buildSchemaDbRowFromResolved(resolved, row) {
  const { dbRow, offeringTypeCode, derived } = resolved
  const notesCol = decodeHtmlEntities(row.Notes)
  if (notesCol) dbRow.notes = notesCol
  else if (derived.notes) dbRow.notes = derived.notes
  return dbRow
}

async function processSchemaImportRow(supabase, ctx, row, opts) {
  const resolved = resolveRow(row, ctx, { requireCategory: true })
  const { offering, offeringTypeCode, existing, naturalKey: nk } = resolved

  if (offeringTypeCode !== ctx.offeringType.code) {
    throw new Error(
      `Offering type mismatch: row resolves to "${offeringTypeCode}" but file is for "${ctx.offeringType.code}"`
    )
  }

  if (offering.status !== "published" && !opts.allowDraftOffering) {
    if (opts.publishReferencedOfferings && !opts.dryRun) {
      await publishOffering(supabase, offering.id)
      offering.status = "published"
    } else if (!opts.allowDraftOffering) {
      return { action: "DRAFT_BLOCKED", reason: "offering not published", naturalKey: nk }
    }
  }

  const dbRow = buildSchemaDbRowFromResolved(resolved, row)

  if (existing && opts.insertOnly) {
    return { action: "SKIPPED", reason: "insert-only mode", id: existing.id, naturalKey: nk }
  }

  if (existing) {
    const updatePayload = buildUpdatePayload(dbRow)
    const dbBefore = snapshotInstance(existing)
    const changes = diffDbRow(dbBefore, updatePayload)
    if (Object.keys(changes).length === 0) {
      return { action: "UNCHANGED", id: existing.id, naturalKey: nk }
    }
    if (opts.dryRun) {
      return { action: "UPDATE", id: existing.id, naturalKey: nk, dbRow: updatePayload, changes }
    }
    const { error } = await supabase.from(tables().session).update(updatePayload).eq("id", existing.id)
    if (error) throw new Error(`Update failed: ${error.message}`)
    Object.assign(existing, updatePayload)
    ctx.instanceByNaturalKey.set(nk, existing)
    ctx.instancesById.set(existing.id, existing)
    return { action: "UPDATE", id: existing.id, naturalKey: nk, changes }
  }

  if (opts.dryRun) {
    return { action: "INSERT", naturalKey: nk, dbRow }
  }
  const { data, error } = await supabase.from(tables().session).insert(dbRow).select("id").single()
  if (error) throw new Error(`Insert failed: ${error.message}`)
  const inserted = { id: data.id, ...dbRow }
  ctx.instanceByNaturalKey.set(nk, inserted)
  ctx.instancesById.set(data.id, inserted)
  return { action: "INSERT", id: data.id, naturalKey: nk }
}

function scanSchemaFileDuplicates(rows, ctx) {
  const keyToRows = new Map()
  const duplicateInFile = []
  for (const row of rows) {
    if (schemaRowIsEmpty(row)) continue
    try {
      const resolved = resolveRow(row, ctx, { requireCategory: true })
      const keys = []
      if (row.id) keys.push(`id:${row.id}`)
      keys.push(resolved.naturalKey)
      for (const key of keys) {
        const list = keyToRows.get(key) || []
        list.push(row._rowNum)
        keyToRows.set(key, list)
      }
    } catch {
      // per-row later
    }
  }
  for (const [key, rowNums] of keyToRows) {
    const unique = [...new Set(rowNums)]
    if (unique.length > 1) duplicateInFile.push({ key, rows: unique })
  }
  return duplicateInFile
}

function buildInstanceExampleRow(schemaColumns, typeCode) {
  const row = {
    id: "",
    "Location Code": "bellevue",
    "Programs (category)": "learn",
    "Activity (program)": "2026 Summer Camps",
    "Session Title": `CSV Import Test Instance (${typeCode})`,
    "Location Name": "Bellevue, WA",
    Status: "scheduled",
    "Is Active": "Yes",
    Featured: "No",
    "Amilia Link": "",
    Notes: "",
  }
  for (const col of schemaColumns) {
    if (row[col.header] !== undefined) continue
    if (col.type === "boolean") row[col.header] = "No"
    else if (col.type === "number") row[col.header] = ""
    else if (col.path.includes("start_date")) row[col.header] = "2026-07-06"
    else if (col.path.includes("end_date")) row[col.header] = "2026-07-10"
    else row[col.header] = ""
  }
  return row
}

async function loadSessionsForExport(supabase, ctx, options = {}) {
  const status = options.status || null
  const locationFilter = options.location ? normalizeKey(options.location) : null
  const offeringIds = [...ctx.offeringIdsForType]
  if (!offeringIds.length) return []

  const sel = instancePreflightSelects()
  let query = supabase
    .from(tables().session)
    .select(sel.sessionFields)
    .in("offering_id", offeringIds)
    .order("start_date", { ascending: true })

  if (status) query = query.eq("status", status)

  const { data: instances, error } = await query
  if (error) throw new Error(`Failed to load instances: ${error.message}`)

  return (instances || []).filter((inst) => {
    if (!locationFilter) return true
    const prog = unwrapJoin(inst.program)
    const franchise = unwrapJoin(prog?.franchise)
    return normalizeKey(franchise?.code) === locationFilter
  })
}

async function exportInstancesForType(supabase, typeCode, options = {}) {
  const writeTemplate = options.writeTemplate === true
  const status = options.status || null
  const locationFilter = options.location ? normalizeKey(options.location) : null
  const out =
    options.out ||
    (writeTemplate ? templateInstanceCsvPath(typeCode) : defaultInstanceCsvPath(typeCode))

  const ctx = await preflightForType(supabase, typeCode)
  const headers = getInstanceSchemaHeaders(ctx.schemaColumns)
  const manifestPath = defaultInstanceManifestPath(out)

  let csvRows = []
  if (writeTemplate) {
    csvRows = [buildInstanceExampleRow(ctx.schemaColumns, typeCode)]
  } else {
    const instances = await loadSessionsForExport(supabase, ctx, {
      status,
      location: locationFilter,
    })
    csvRows = instances.map((inst) => instanceToCsvRow(inst, ctx.schemaColumns))
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

async function dryRunSchemaImportFromFile(supabase, typeCode, filePath) {
  const ctx = await preflightForType(supabase, typeCode)
  const manifestPath = defaultInstanceManifestPath(filePath)
  const fileManifest = loadManifest(manifestPath)
  const driftWarnings = detectSchemaDrift(fileManifest, ctx.manifest)

  const tableRows = parseSpreadsheet(filePath)
  const allRows = rowsToSchemaObjects(tableRows).filter((r) => !schemaRowIsEmpty(r))

  const fileDups = scanSchemaFileDuplicates(allRows, ctx)
  if (fileDups.length) {
    throw new Error(
      `Duplicate rows in file: ${fileDups.map((d) => d.key).join(", ")}`
    )
  }

  const summary = { insert: 0, update: 0, unchanged: 0, skipped: 0, failed: 0, draft_blocked: 0 }
  const results = []
  const opts = {
    dryRun: true,
    insertOnly: false,
    allowDraftOffering: true,
    publishReferencedOfferings: false,
  }

  for (const row of allRows) {
    try {
      const result = await processSchemaImportRow(supabase, ctx, row, opts)
      const action = result.action
      if (action === "INSERT") summary.insert++
      else if (action === "UPDATE") summary.update++
      else if (action === "UNCHANGED") summary.unchanged++
      else if (action === "SKIPPED") summary.skipped++
      else if (action === "DRAFT_BLOCKED") summary.draft_blocked++
      results.push({
        row: row._rowNum,
        sessionTitle: row["Session Title"],
        action,
        error: null,
      })
    } catch (err) {
      summary.failed++
      results.push({
        row: row._rowNum,
        sessionTitle: row["Session Title"] || "(no title)",
        action: "FAILED",
        error: err.message,
      })
    }
  }

  return { summary, results, driftWarnings, rowCount: allRows.length, ctx }
}

function resolveInstanceVerifyStatus(summary, instanceCount) {
  if (instanceCount === 0) return "skipped_no_data"
  if (summary.failed > 0) return "fail"
  if (summary.update > 0) return "warn"
  return "pass"
}

function buildInstanceInventoryMarkdownRows(entries) {
  const lines = [
    "| code | name | instances | schema columns | verify | template |",
    "|------|------|-----------|----------------|--------|----------|",
  ]
  for (const e of entries) {
    lines.push(
      `| ${e.code} | ${e.name} | ${e.instance_count} | ${e.schema_column_count} | ${e.verify_status} | \`${e.template_path}\` |`
    )
  }
  return lines.join("\n")
}

function patchInstanceTypesDoc(docPath, tableMarkdown) {
  const start = "<!-- INSTANCE_TYPES_START -->"
  const end = "<!-- INSTANCE_TYPES_END -->"
  let content = fs.readFileSync(docPath, "utf8")
  if (!content.includes(start) || !content.includes(end)) {
    throw new Error(`Missing ${start} / ${end} markers in ${docPath}`)
  }
  const replacement = `${start}
<!-- 由 node scripts/bootstrap-instance-csv.js 自动生成，请勿手改 -->

${tableMarkdown}

<!-- schema_hash 与列数以当前 DB 为准；换环境后重新运行 bootstrap -->

${end}`
  content = content.replace(new RegExp(`${start}[\\s\\S]*?${end}`), replacement)
  fs.writeFileSync(docPath, content, "utf8")
}

function writeSchemaReport(outDir, typeCode, report) {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  const jsonPath = path.join(outDir, `import-instances-${typeCode}-${stamp}.json`)
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2))
  return jsonPath
}

module.exports = {
  INSTANCE_FIXED_COLUMNS,
  HEADER_ALIASES,
  ERROR_CODES,
  loadEnv,
  parseArgs,
  parseExportArgs,
  defaultInstanceCsvPath,
  templateInstanceCsvPath,
  defaultInstanceManifestPath,
  parseSpreadsheet,
  rowsToSchemaObjects,
  schemaRowIsEmpty,
  getCategoryLabel,
  getActivityLabel,
  getSessionTitle,
  getLocationName,
  rowHasIdentity,
  rowIsEmpty,
  rowHasAnyIdentity,
  normalizeActivityForCourse,
  naturalKey,
  preflight,
  preflightForType,
  resolveRow,
  deriveFlatColumnsFromExt,
  buildInstanceExtFromSchemaRow,
  findExistingInstance,
  buildUpdatePayload,
  diffDbRow,
  snapshotInstance,
  scanSchemaFileDuplicates,
  publishOffering,
  classifyError,
  writeSchemaReport,
  auditInstancesIntegrity,
  deleteAllInstances,
  bootstrapMissingSeries,
  loadSessionsForExport,
  exportInstancesForType,
  processSchemaImportRow,
  dryRunSchemaImportFromFile,
  instanceToCsvRow,
  loadManifest,
  detectSchemaDrift,
  loadActiveOfferingTypes,
  countInstancesForType,
  buildInstanceManifest,
  getInstanceSchemaHeaders,
  exportOperatorHeaders,
  OPERATOR_FIXED_HEADERS,
  buildInstanceExampleRow,
  resolveInstanceVerifyStatus,
  buildInstanceInventoryMarkdownRows,
  patchInstanceTypesDoc,
  writeCsv,
}
