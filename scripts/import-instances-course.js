#!/usr/bin/env node

/**
 * Import course instances from CSV/XLSX into v2_instance.
 *
 * C-end vs Admin mapping:
 *   Location Code     → v2_franchise.code
 *   Program (optional)→ v2_category — omit from CSV; resolved via offering + Activity
 *   Activity          → v2_program (e.g. 2026 Summer Courses)
 *   Session Title     → v2_offering.name (course offering)
 *   (session row)     → v2_instance
 *
 * Course-specific columns (optional):
 *   Classes start on which days each week → instance_data_ext.schedule.days_of_week
 *   Target Grade                          → instance_data_ext.audience.target_grades
 *
 * Schedule note: if Start Time contains a date (not HH:MM), it is treated as an extra
 * date bound together with Start Date / End Date; earliest → start_date, latest → end_date.
 *
 * Usage:
 *   node scripts/import-instances-course.js --dry-run [--file <path>]
 *   node scripts/import-instances-course.js --execute --publish-referenced-offerings [--file <path>]
 *
 * Default file: ../Blaze/instances-course-bellevue.csv
 */

const fs = require("fs")
const path = require("path")
const { execFileSync } = require("child_process")

const DEFAULT_CSV =
  "/Users/zhen/Library/CloudStorage/OneDrive-个人/Blaze/instances-course-bellevue.csv"

const HEADER_ALIASES = {
  "location code": "Location Code",
  program: "Program",
  activity: "Activity",
  "session title": "Session Title",
  "program name": "Program Name",
  "offering title": "Offering Title",
  campus: "Campus",
  "start date": "Start Date",
  "end date": "End Date",
  "start time": "Start Time",
  "end time": "End Time",
  "min age": "Min Age",
  "max age": "Max Age",
  "classes start on which days each week": "Classes start on which days each week",
  "target grade": "Target Grade",
  status: "Status",
  "is active": "Is Active",
  featured: "Featured",
  "amilia link": "Amilia Link",
  notes: "Notes",
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

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local")
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
    file: DEFAULT_CSV,
    publishReferencedOfferings: false,
    allowDraftOffering: false,
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
    } else if (argv[i] === "--publish-referenced-offerings") {
      args.publishReferencedOfferings = true
    } else if (argv[i] === "--allow-draft-offering") {
      args.allowDraftOffering = true
    }
  }
  return args
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
  throw new Error(`Unsupported file type: ${ext}`)
}

function normalizeHeader(h) {
  const key = String(h || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
  return HEADER_ALIASES[key] || h.trim()
}

function rowsToObjects(tableRows) {
  if (!tableRows.length) return []
  const headers = tableRows[0].map(normalizeHeader)
  const hasNew = headers.includes("Activity") && headers.includes("Session Title")
  const hasLegacy = headers.includes("Program Name") && headers.includes("Offering Title")
  if (!hasNew && !hasLegacy) {
    throw new Error(
      "Missing required columns: Location Code, Activity, Session Title, Start Date"
    )
  }
  return tableRows.slice(1).map((row, idx) => {
    const obj = { _rowNum: idx + 2, _legacyHeaders: hasLegacy && !hasNew }
    headers.forEach((h, i) => {
      obj[h] = row[i] != null ? String(row[i]).trim() : ""
    })
    return obj
  })
}

function getCategoryLabel(row) {
  return row.Program || ""
}

function getActivityLabel(row) {
  return row.Activity || row["Program Name"] || ""
}

function getSessionTitle(row) {
  return row["Session Title"] || row["Offering Title"] || ""
}

function rowHasIdentity(row) {
  return Boolean(row["Location Code"] && getActivityLabel(row) && getSessionTitle(row))
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

function parseDaysOfWeek(val) {
  const v = String(val ?? "").trim()
  if (!v) return null
  const parts = v.split(/[,;/|]+|\s+/).filter(Boolean)
  const out = []
  for (const p of parts) {
    if (/^[0-6]$/.test(p)) {
      out.push(p)
      continue
    }
    const key = p.toLowerCase().replace(/\./g, "")
    if (DAY_MAP[key]) out.push(DAY_MAP[key])
    else throw new Error(`Unknown day in "Classes start on which days each week": ${p}`)
  }
  return out.length ? [...new Set(out)] : null
}

const GRADE_OPTIONS = new Set(["K", ...Array.from({ length: 12 }, (_, i) => String(i + 1))])

function expandGradeToken(token) {
  const t = String(token).trim().toUpperCase()
  if (t === "K") return ["K"]
  const range = t.match(/^(\d+|K)\s*-\s*(\d+|K)$/i)
  if (range) {
    const start = range[1].toUpperCase() === "K" ? 0 : Number(range[1])
    const end = range[2].toUpperCase() === "K" ? 0 : Number(range[2])
    const lo = Math.min(start, end)
    const hi = Math.max(start, end)
    const grades = []
    for (let g = lo; g <= hi; g++) grades.push(g === 0 ? "K" : String(g))
    return grades
  }
  if (/^\d+$/.test(t)) return [String(Number(t))]
  if (t === "K") return ["K"]
  return []
}

function parseTargetGrades(val) {
  const v = String(val ?? "").trim()
  if (!v) return null
  const out = []
  for (const chunk of v.split(/[,;/|]+/)) {
    for (const g of expandGradeToken(chunk.trim())) {
      if (GRADE_OPTIONS.has(g)) out.push(g)
    }
  }
  return out.length ? [...new Set(out)] : null
}

function inferAgeRangeFromTitle(title) {
  const m =
    String(title).match(/rising grades?\s+([\d\s,\-]+)/i) ||
    String(title).match(/ages?\s+(\d+[\d\s,\-]*\d*)/i)
  if (!m) return null
  const nums = m[1].match(/\d+/g)?.map(Number)
  if (!nums?.length) return null
  const minG = Math.min(...nums)
  const maxG = Math.max(...nums)
  return { age_min: minG + 5, age_max: maxG + 6 }
}

function fitsAgeSchema(ageMin, ageMax) {
  if (ageMin == null || ageMax == null) return false
  if (ageMin < 6 || ageMin > 18) return false
  if (ageMax < 6 || ageMax > 18) return false
  if (ageMin > ageMax) return false
  return true
}

function parseCourseSchedule(row) {
  const dates = []
  for (const field of ["Start Date", "End Date"]) {
    const d = tryParseDate(row[field])
    if (d) dates.push(d)
  }

  const startTimeRaw = row["Start Time"]
  let startTime = null
  if (looksLikeTime(startTimeRaw)) {
    startTime = parseOptionalTime(startTimeRaw)
  } else {
    const d = tryParseDate(startTimeRaw)
    if (d) dates.push(d)
  }

  let endTime = looksLikeTime(row["End Time"]) ? parseOptionalTime(row["End Time"]) : null

  if (!dates.length) throw new Error("Start Date is required")
  dates.sort()
  const startDate = dates[0]
  const endDate = dates.length >= 2 ? dates[dates.length - 1] : dates[0]
  if (startDate > endDate) throw new Error("Start Date must be on or before End Date")

  return { startDate, endDate, startTime, endTime }
}

function buildInstanceDataExt(row, sessionTitle) {
  const { startDate, endDate, startTime, endTime } = parseCourseSchedule(row)

  let ageMin = parseOptionalNumber(row["Min Age"])
  let ageMax = parseOptionalNumber(row["Max Age"])
  if (!fitsAgeSchema(ageMin, ageMax)) {
    const inferred = inferAgeRangeFromTitle(sessionTitle)
    if (inferred) {
      ageMin = inferred.age_min
      ageMax = inferred.age_max
    }
  }
  if (!fitsAgeSchema(ageMin, ageMax)) {
    throw new Error(
      `Invalid Min Age / Max Age (${row["Min Age"]}, ${row["Max Age"]}); could not infer from session title`
    )
  }

  const daysOfWeek = parseDaysOfWeek(row["Classes start on which days each week"])
  const targetGrades = parseTargetGrades(row["Target Grade"])

  const schedule = {
    start_date: startDate,
    end_date: endDate,
  }
  if (startTime) schedule.start_time = startTime
  if (endTime) schedule.end_time = endTime
  if (daysOfWeek) schedule.days_of_week = daysOfWeek

  const ext = {
    schedule,
    age_range: {
      age_min: ageMin,
      age_max: ageMax,
    },
  }

  if (targetGrades) {
    ext.audience = { target_grades: targetGrades }
  }

  const notes = decodeHtmlEntities(row.Notes)
  if (notes) ext.notes = notes

  return {
    ext,
    startDate,
    endDate,
    startTime,
    endTime,
    daysOfWeek,
    ageMin,
    ageMax,
    notes: notes || null,
  }
}

function deriveRowFields(mergedExt, parsed) {
  let finalStartDate = parsed.startDate
  let finalEndDate = parsed.endDate
  let finalStartTime = parsed.startTime
  let finalEndTime = parsed.endTime
  let finalDaysOfWeek = parsed.daysOfWeek

  if (mergedExt.schedule && typeof mergedExt.schedule === "object") {
    const s = mergedExt.schedule
    if (s.start_date) finalStartDate = s.start_date
    if (s.end_date) finalEndDate = s.end_date
    if (s.start_time) finalStartTime = s.start_time
    if (s.end_time) finalEndTime = s.end_time
    if (s.days_of_week) finalDaysOfWeek = s.days_of_week
  }

  return {
    finalStartDate,
    finalEndDate,
    finalStartTime,
    finalEndTime,
    finalDaysOfWeek,
  }
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

function derivePortalFields(offering) {
  const typeConfig = offering.type_config_data || {}
  const isCourseType = typeConfig?.portal_config?.is_course_type !== false
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

async function preflight(supabase) {
  const { data: offeringType, error: typeErr } = await supabase
    .from("v2_offering_type")
    .select("id, code, is_active, instance_schema")
    .eq("code", "course")
    .maybeSingle()

  if (typeErr || !offeringType) {
    throw new Error(`Course offering type not found: ${typeErr?.message || "no row"}`)
  }

  const [
    { data: franchises },
    { data: categories },
    { data: programs },
    { data: offerings },
    { data: campuses },
    { data: instances },
  ] = await Promise.all([
    supabase.from("v2_franchise").select("id, code, name, is_active"),
    supabase.from("v2_category").select("id, name, display_name, is_active, config_base"),
    supabase
      .from("v2_program")
      .select(
        `id, name, display_name, franchise_id, category_id, is_active,
        category:v2_category(id, name, display_name, config_base),
        franchise:v2_franchise(id, code)`
      ),
    supabase
      .from("v2_offering")
      .select(
        `id, name, status, category_id, offering_type_id, type_config_data,
        offering_type:v2_offering_type(id, code, instance_schema, portal_service_role)`
      )
      .eq("offering_type_id", offeringType.id),
    supabase.from("v2_campus").select("id, name, display_name, franchise_id"),
    supabase
      .from("v2_instance")
      .select(
        `id, program_id, offering_id, campus_id, start_date,
        program:v2_program(
          franchise:v2_franchise(code),
          display_name,
          name,
          category:v2_category(display_name, name)
        ),
        offering:v2_offering(name),
        campus:v2_campus(name, display_name)`
      ),
  ])

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
  for (const f of franchises || []) {
    if (f.is_active === false) continue
    franchiseByCode.set(normalizeKey(f.code), f)
  }

  const programsByFranchise = new Map()
  for (const p of programs || []) {
    if (p.is_active === false) continue
    const list = programsByFranchise.get(p.franchise_id) || []
    list.push(p)
    programsByFranchise.set(p.franchise_id, list)
  }

  const offeringsByName = new Map()
  for (const o of offerings || []) {
    const k = normalizeKey(o.name)
    if (!offeringsByName.has(k)) offeringsByName.set(k, [])
    offeringsByName.get(k).push(o)
  }

  const campusesByFranchise = new Map()
  for (const c of campuses || []) {
    const list = campusesByFranchise.get(c.franchise_id) || []
    list.push(c)
    campusesByFranchise.set(c.franchise_id, list)
  }

  const instanceByNaturalKey = new Map()
  for (const inst of instances || []) {
    const prog = Array.isArray(inst.program) ? inst.program[0] : inst.program
    const off = Array.isArray(inst.offering) ? inst.offering[0] : inst.offering
    const camp = inst.campus_id
      ? Array.isArray(inst.campus)
        ? inst.campus[0]
        : inst.campus
      : null
    const loc = prog?.franchise?.code || ""
    const cat = Array.isArray(prog?.category) ? prog.category[0] : prog?.category
    const categoryLabel = cat?.display_name || cat?.name || ""
    const activityLabel = prog?.display_name || prog?.name || ""
    const campusLabel = camp ? camp.display_name || camp.name || "" : ""
    const nk = naturalKey(
      loc,
      categoryLabel,
      activityLabel,
      off?.name || "",
      inst.start_date,
      campusLabel
    )
    instanceByNaturalKey.set(nk, inst)
  }

  return {
    offeringType,
    categoriesByKey,
    franchiseByCode,
    programsByFranchise,
    offeringsByName,
    campusesByFranchise,
    instanceByNaturalKey,
  }
}

function findCategory(categoriesByKey, label) {
  const cat = categoriesByKey.get(normalizeKey(label))
  if (!cat) {
    throw new Error(`Unknown Program (category): "${label}"`)
  }
  return cat
}

function findProgram(programs, programName) {
  const n = normalizeKey(programName)
  if (!programs?.length) return null
  return (
    programs.find((p) => normalizeKey(p.display_name) === n) ||
    programs.find((p) => normalizeKey(p.name) === n) ||
    programs.find((p) => normalizeKey(p.name) === n.replace(/\s+/g, "_")) ||
    programs.find(
      (p) =>
        normalizeKey(p.display_name).includes(n) || n.includes(normalizeKey(p.display_name))
    ) ||
    null
  )
}

function programsMatchingActivity(programs, activityLabel) {
  if (!programs?.length) return []
  return programs.filter((p) => findProgram([p], activityLabel))
}

function findCampus(campuses, campusName) {
  const cn = normalizeKey(campusName)
  if (!cn) return null
  const exact =
    campuses.find((c) => normalizeKey(c.display_name) === cn) ||
    campuses.find((c) => normalizeKey(c.name) === cn)
  if (exact) return exact
  for (const c of campuses) {
    const dn = normalizeKey(c.display_name)
    const nm = normalizeKey(c.name)
    if (dn && cn.includes(dn)) return c
    if (nm && cn.includes(nm)) return c
  }
  if (campuses.length === 1) return campuses[0]
  return null
}

function resolveOffering(offeringsByName, offeringTitle, categoryId) {
  const list = offeringsByName.get(normalizeKey(offeringTitle)) || []
  if (!list.length) return null
  const match = list.filter((o) => o.category_id === categoryId)
  if (match.length === 1) return match[0]
  if (match.length > 1) {
    throw new Error(`Multiple course offerings named "${offeringTitle}" in category ${categoryId}`)
  }
  return null
}

function resolveRow(row, ctx) {
  const locationCode = row["Location Code"]
  const franchise = ctx.franchiseByCode.get(normalizeKey(locationCode))
  if (!franchise) throw new Error(`Unknown Location Code: ${locationCode}`)

  const rawActivity = getActivityLabel(row)
  const activityLabel = normalizeActivityForCourse(rawActivity)
  const sessionTitle = getSessionTitle(row)
  if (!activityLabel) throw new Error("Activity is required (v2_program, e.g. 2026 Summer Courses)")
  if (!sessionTitle) throw new Error("Session Title is required (v2_offering.name)")

  const programs = ctx.programsByFranchise.get(franchise.id) || []
  const categoryLabelInput = getCategoryLabel(row)

  let category
  let program
  let offering

  if (categoryLabelInput) {
    category = findCategory(ctx.categoriesByKey, categoryLabelInput)
    const scoped = programs.filter((p) => p.category_id === category.id)
    program = findProgram(scoped, activityLabel)
    if (!program) {
      throw new Error(
        `Activity not found: "${activityLabel}" under Program "${categoryLabelInput}" at ${locationCode}`
      )
    }
  } else {
    const activityMatches = programsMatchingActivity(programs, activityLabel)
    if (!activityMatches.length) {
      throw new Error(
        `Activity not found: "${activityLabel}" at ${locationCode}. ` +
          `Available: ${programs.map((p) => p.display_name || p.name).join(", ") || "none"}`
      )
    }
    let offeringCandidate = null
    for (const p of activityMatches) {
      const catRow = Array.isArray(p.category) ? p.category[0] : p.category
      if (!catRow?.id) continue
      const off = resolveOffering(ctx.offeringsByName, sessionTitle, catRow.id)
      if (!off) continue
      if (program) {
        throw new Error(
          `Ambiguous row: Session Title "${sessionTitle}" with Activity "${activityLabel}" at ${locationCode}`
        )
      }
      program = p
      offeringCandidate = off
      category = catRow
    }
    if (!program || !offeringCandidate) {
      throw new Error(
        `Session Title not found: ${sessionTitle} (course offering with Activity "${activityLabel}" at ${locationCode})`
      )
    }
    offering = offeringCandidate
  }

  if (!offering) {
    offering = resolveOffering(ctx.offeringsByName, sessionTitle, category.id)
    if (!offering) throw new Error(`Session Title not found (course): ${sessionTitle}`)
  }

  if (program.category_id !== category.id) {
    throw new Error(`Activity category does not match offering category for "${sessionTitle}"`)
  }

  const campuses = ctx.campusesByFranchise.get(franchise.id) || []
  const campus = findCampus(campuses, row.Campus)
  if (row.Campus && !campus) {
    throw new Error(`Campus not found: "${row.Campus}" at ${locationCode}`)
  }

  const parsed = buildInstanceDataExt(row, sessionTitle)
  const categoryConfigBase =
    category?.config_base && typeof category.config_base === "object" ? category.config_base : {}

  const mergedExt = { ...categoryConfigBase, ...parsed.ext }
  validateInstanceSchema(ctx.offeringType.instance_schema?.fields, mergedExt, {
    relaxAgeBounds: true,
  })

  const derived = deriveRowFields(mergedExt, parsed)
  const statusRaw = (row.Status || "scheduled").trim().toLowerCase()
  const validStatuses = ["scheduled", "ongoing", "completed", "cancelled"]
  if (!validStatuses.includes(statusRaw)) {
    throw new Error(`Invalid status: ${row.Status}`)
  }

  const { isCourseType, portalServiceRole } = derivePortalFields(offering)
  const amilia = decodeHtmlEntities(row["Amilia Link"])

  const dbRow = {
    program_id: program.id,
    offering_id: offering.id,
    campus_id: campus?.id || null,
    price_override: null,
    start_date: derived.finalStartDate,
    end_date: derived.finalEndDate,
    start_time: derived.finalStartTime,
    end_time: derived.finalEndTime,
    days_of_week: derived.finalDaysOfWeek,
    max_students: null,
    current_students: 0,
    instance_data_ext: mergedExt,
    timezone: "UTC",
    status: statusRaw,
    notes: parsed.notes,
    is_active: parseYesNo(row["Is Active"], true),
    featured: parseYesNo(row.Featured, false),
    is_course_type: isCourseType,
    portal_service_role: portalServiceRole,
    amilia_link: amilia || null,
  }

  const categoryLabel = category.display_name || category.name || categoryLabelInput
  const nk = naturalKey(
    locationCode,
    categoryLabel,
    activityLabel,
    sessionTitle,
    derived.finalStartDate,
    row.Campus
  )

  return {
    dbRow,
    offering,
    program,
    category,
    franchise,
    naturalKey: nk,
    existing: ctx.instanceByNaturalKey.get(nk) || null,
    activityResolved: activityLabel !== rawActivity ? activityLabel : null,
  }
}

async function publishOffering(supabase, offeringId) {
  const { error } = await supabase.from("v2_offering").update({ status: "published" }).eq("id", offeringId)
  if (error) throw new Error(`Failed to publish offering ${offeringId}: ${error.message}`)
}

async function ensureLearnSummerCoursesProgram(supabase, franchiseId) {
  const learnCat = "e8d59bb7-77f6-4eb0-97dd-e6422614b937"
  const { data: existing } = await supabase
    .from("v2_program")
    .select("id")
    .eq("franchise_id", franchiseId)
    .eq("category_id", learnCat)
    .eq("display_name", "2026 Summer Courses")
    .maybeSingle()
  if (existing) return existing.id

  const { data: exploreRef } = await supabase
    .from("v2_program")
    .select("start_date, end_date, poster_url")
    .eq("franchise_id", franchiseId)
    .eq("display_name", "2026 Summer Courses")
    .maybeSingle()

  const { data, error } = await supabase
    .from("v2_program")
    .insert({
      franchise_id: franchiseId,
      category_id: learnCat,
      name: "summer_2026_courses",
      display_name: "2026 Summer Courses",
      description: "2026 Summer Courses",
      start_date: exploreRef?.start_date || "2026-06-01",
      end_date: exploreRef?.end_date || "2026-08-31",
      display_order: 0,
      is_active: true,
      featured: false,
      poster_url: exploreRef?.poster_url || null,
    })
    .select("id")
    .single()
  if (error) throw new Error(`Failed to create Learn 2026 Summer Courses: ${error.message}`)
  return data.id
}

async function main() {
  loadEnv()
  const args = parseArgs(process.argv)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
    process.exit(1)
  }

  if (!fs.existsSync(args.file)) {
    console.error(`File not found: ${args.file}`)
    process.exit(1)
  }

  const { createClient } = require("@supabase/supabase-js")
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log("Import course instances → v2_instance")
  console.log("=".repeat(60))
  console.log(`Mode: ${args.dryRun ? "DRY RUN" : "EXECUTE"}`)
  console.log(`File: ${args.file}`)
  console.log(`Supabase: ${supabaseUrl}`)
  if (args.publishReferencedOfferings) console.log("Will publish draft offerings referenced in file")
  console.log("")

  const tableRows = parseSpreadsheet(args.file)
  const dataRows = rowsToObjects(tableRows).filter((r) => rowHasIdentity(r))
  if (!dataRows.length) {
    console.error("No data rows in file")
    process.exit(1)
  }

  const needsBellevueLearn = dataRows.some(
    (r) => normalizeKey(r["Location Code"]) === "bellevue"
  )
  if (needsBellevueLearn) {
    const { data: bellevue } = await supabase.from("v2_franchise").select("id").eq("code", "bellevue").maybeSingle()
    if (bellevue) {
      const pid = await ensureLearnSummerCoursesProgram(supabase, bellevue.id)
      console.log(`Ensured Learn "2026 Summer Courses" at bellevue: ${pid}`)
    }
  }

  const ctx = await preflight(supabase)
  console.log(`Course offering_type_id: ${ctx.offeringType.id}`)
  console.log("")

  const report = {
    mode: args.dryRun ? "dry-run" : "execute",
    file: args.file,
    summary: { insert: 0, update: 0, published_offerings: 0, failed: 0, draft_blocked: 0 },
    results: [],
  }

  const publishedOfferingIds = new Set()

  for (const row of dataRows) {
    try {
      const resolved = resolveRow(row, ctx)
      const { offering, dbRow, existing, naturalKey: nk, activityResolved } = resolved

      if (activityResolved) {
        console.warn(
          `[${row._rowNum}] Activity normalized: "${getActivityLabel(row)}" → "${activityResolved}"`
        )
      }

      if (offering.status !== "published") {
        if (args.publishReferencedOfferings && args.execute) {
          if (!publishedOfferingIds.has(offering.id)) {
            await publishOffering(supabase, offering.id)
            publishedOfferingIds.add(offering.id)
            report.summary.published_offerings++
            offering.status = "published"
          }
        } else if (!args.allowDraftOffering) {
          report.summary.draft_blocked++
          throw new Error(
            `Offering is "${offering.status}"; use --publish-referenced-offerings on execute or --allow-draft-offering`
          )
        }
      }

      const catLabel = resolved.category.display_name || resolved.category.name
      const progLabel = resolved.program.display_name || resolved.program.name
      const title = getSessionTitle(row)

      if (existing) {
        if (!args.dryRun) {
          const { error } = await supabase.from("v2_instance").update(dbRow).eq("id", existing.id)
          if (error) throw new Error(`Update failed: ${error.message}`)
        }
        report.summary.update++
        report.results.push({
          row: row._rowNum,
          action: "UPDATE",
          id: existing.id,
          naturalKey: nk,
          sessionTitle: title,
        })
        console.log(
          `[${row._rowNum}] UPDATE ${title} (${catLabel}/${progLabel}) (${dbRow.start_date}) id=${existing.id}`
        )
      } else {
        if (!args.dryRun) {
          const { data, error } = await supabase
            .from("v2_instance")
            .insert(dbRow)
            .select("id")
            .single()
          if (error) throw new Error(`Insert failed: ${error.message}`)
          report.results.push({
            row: row._rowNum,
            action: "INSERT",
            id: data.id,
            naturalKey: nk,
            sessionTitle: title,
          })
          console.log(
            `[${row._rowNum}] INSERT ${title} (${catLabel}/${progLabel}) (${dbRow.start_date}) id=${data.id}`
          )
        } else {
          report.results.push({
            row: row._rowNum,
            action: "INSERT",
            naturalKey: nk,
            sessionTitle: title,
          })
          console.log(
            `[${row._rowNum}] INSERT ${title} (${catLabel}/${progLabel}) (${dbRow.start_date})`
          )
        }
        report.summary.insert++
      }
    } catch (err) {
      report.summary.failed++
      report.results.push({
        row: row._rowNum,
        name: getSessionTitle(row) || "(no title)",
        error: err.message,
      })
      console.error(`[${row._rowNum}] FAILED: ${err.message}`)
    }
  }

  console.log("")
  console.log("Summary:", report.summary)

  const outDir = path.join(__dirname, "output")
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  const logPath = path.join(outDir, `import-instances-course-${stamp}.json`)
  fs.writeFileSync(logPath, JSON.stringify(report, null, 2))
  console.log(`Report: ${logPath}`)

  if (report.summary.failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error("Fatal:", err.message)
  process.exit(1)
})
