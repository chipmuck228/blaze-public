/**
 * Shared logic for unified camp + course instance import into v2_instance.
 * Used by scripts/import-instances.js (and optionally legacy camp/course scripts).
 */

const fs = require("fs")
const path = require("path")
const { execFileSync } = require("child_process")

const DEFAULT_UNIFIED_CSV =
  "/Users/zhen/Library/CloudStorage/OneDrive-个人/Blaze/Blaze-Instances-Unified.csv"

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
  campus: "Campus",
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

const GRADE_OPTIONS = new Set(["K", ...Array.from({ length: 12 }, (_, i) => String(i + 1))])

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
  TYPE_FILTERED: "TYPE_FILTERED",
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
    file: DEFAULT_UNIFIED_CSV,
    typeFilter: "all",
    publishReferencedOfferings: false,
    allowDraftOffering: false,
    allowFileDuplicates: false,
    failFast: false,
    replaceAll: false,
    insertOnly: false,
    audit: false,
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
      const t = argv[++i].toLowerCase()
      if (!["all", "camp", "course"].includes(t)) {
        throw new Error(`Invalid --type: ${t} (use all|camp|course)`)
      }
      args.typeFilter = t
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
  throw new Error(`Unsupported file type: ${ext} (use .csv or .xlsx)`)
}

function normalizeHeader(h) {
  const key = String(h || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
  return HEADER_ALIASES[key] || h.trim()
}

function rowsToObjects(tableRows, { requireCategory = true } = {}) {
  if (!tableRows.length) return []
  const headers = tableRows[0].map(normalizeHeader)
  const hasNewFormat = headers.includes("Activity") && headers.includes("Session Title")
  const hasLegacyFormat =
    headers.includes("Program Name") && headers.includes("Offering Title")
  if (!hasNewFormat && !hasLegacyFormat) {
    throw new Error(
      "Missing required columns. Use: Location Code, Programs (category), Activity (program), Session Title, Start Date, End Date"
    )
  }
  if (requireCategory && !headers.includes("Program")) {
    throw new Error(
      'Missing required column: Programs (category) — unified import requires category on every row'
    )
  }
  const missingBase = ["Location Code", "Start Date", "End Date"].filter((h) => !headers.includes(h))
  if (missingBase.length) {
    throw new Error(`Missing required columns: ${missingBase.join(", ")}`)
  }
  return tableRows.slice(1).map((row, idx) => {
    const obj = { _rowNum: idx + 2, _legacyHeaders: hasLegacyFormat && !hasNewFormat }
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
  return !rowHasAnyIdentity(row)
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

function buildCampInstanceDataExt(row) {
  const startDate = parseDate(row["Start Date"], "Start Date")
  const endDate = parseDate(row["End Date"], "End Date")
  if (startDate > endDate) throw new Error("Start Date must be on or before End Date")

  const minAge = parseOptionalNumber(row["Min Age"])
  const maxAge = parseOptionalNumber(row["Max Age"])
  const maxStudents = parseOptionalNumber(row["Max Campers"])
  const priceOverride = parseOptionalNumber(row["Price Override"])

  const ext = {
    schedule: {
      start_date: startDate,
      end_date: endDate,
    },
    capacity_price: {},
  }

  if (minAge != null || maxAge != null) {
    ext.age_range = {}
    if (minAge != null) ext.age_range.age_min = minAge
    if (maxAge != null) ext.age_range.age_max = maxAge
  }

  if (maxStudents != null) ext.capacity_price.max_students = maxStudents
  if (priceOverride != null) ext.capacity_price.price_override = priceOverride

  const mealProvided = row["Meal Provided"]
  const shirtProvided = row["Camp Shirt Provided"]
  const afterCare = row["After Care Available"]
  if (mealProvided || shirtProvided || afterCare) {
    ext.camp_services = {
      meal_provided: parseYesNo(mealProvided, false),
      camp_shirt_provided: parseYesNo(shirtProvided, false),
      after_care_available: parseYesNo(afterCare, false),
    }
  }

  const notes = decodeHtmlEntities(row.Notes)
  if (notes) {
    ext.additional = { special_needs: notes }
  }

  return {
    ext,
    startDate,
    endDate,
    startTime: parseOptionalTime(row["Start Time"]),
    endTime: parseOptionalTime(row["End Time"]),
    maxStudents,
    priceOverride,
    notes: notes || null,
  }
}

function buildCourseInstanceDataExt(row, sessionTitle) {
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
  const priceOverride = parseOptionalNumber(row["Price Override"])

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

  if (priceOverride != null) {
    ext.capacity_price = { price_override: priceOverride }
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
    priceOverride,
    notes: notes || null,
  }
}

function deriveCampRowFields(mergedExt, parsed) {
  let finalStartDate = parsed.startDate
  let finalEndDate = parsed.endDate
  let finalStartTime = parsed.startTime
  let finalEndTime = parsed.endTime
  let finalMaxStudents = parsed.maxStudents
  let finalPriceOverride = parsed.priceOverride

  if (mergedExt.schedule && typeof mergedExt.schedule === "object") {
    const s = mergedExt.schedule
    if (s.start_date) finalStartDate = s.start_date
    if (s.end_date) finalEndDate = s.end_date
    if (s.start_time) finalStartTime = s.start_time
    if (s.end_time) finalEndTime = s.end_time
  }
  if (mergedExt.capacity_price && typeof mergedExt.capacity_price === "object") {
    const c = mergedExt.capacity_price
    if (c.max_students != null) finalMaxStudents = c.max_students
    if (c.price_override != null) finalPriceOverride = c.price_override
  }

  return {
    finalStartDate,
    finalEndDate,
    finalStartTime,
    finalEndTime,
    finalMaxStudents,
    finalPriceOverride,
  }
}

function deriveCourseRowFields(mergedExt, parsed) {
  let finalStartDate = parsed.startDate
  let finalEndDate = parsed.endDate
  let finalStartTime = parsed.startTime
  let finalEndTime = parsed.endTime
  let finalDaysOfWeek = parsed.daysOfWeek
  let finalPriceOverride = parsed.priceOverride

  if (mergedExt.schedule && typeof mergedExt.schedule === "object") {
    const s = mergedExt.schedule
    if (s.start_date) finalStartDate = s.start_date
    if (s.end_date) finalEndDate = s.end_date
    if (s.start_time) finalStartTime = s.start_time
    if (s.end_time) finalEndTime = s.end_time
    if (s.days_of_week) finalDaysOfWeek = s.days_of_week
  }
  if (mergedExt.capacity_price && typeof mergedExt.capacity_price === "object") {
    const c = mergedExt.capacity_price
    if (c.price_override != null) finalPriceOverride = c.price_override
  }

  return {
    finalStartDate,
    finalEndDate,
    finalStartTime,
    finalEndTime,
    finalDaysOfWeek,
    finalPriceOverride,
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
  const [
    { data: offeringTypes, error: typesErr },
    { data: franchises },
    { data: categories },
    { data: programs },
    { data: offerings },
    { data: campuses },
    { data: instances },
  ] = await Promise.all([
    supabase.from("v2_offering_type").select("id, code, is_active, instance_schema").in("code", ["camp", "course"]),
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
      ),
    supabase.from("v2_campus").select("id, name, display_name, franchise_id"),
    supabase
      .from("v2_instance")
      .select(
        `id, program_id, offering_id, campus_id, start_date, end_date, start_time, end_time,
        max_students, price_override, current_students, instance_data_ext, status, notes,
        is_active, featured, days_of_week, amilia_link,
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

  if (typesErr) throw new Error(`Failed to load offering types: ${typesErr.message}`)

  const offeringTypesByCode = new Map()
  for (const t of offeringTypes || []) {
    if (t.is_active === false) continue
    offeringTypesByCode.set(t.code, t)
  }
  if (!offeringTypesByCode.has("camp") || !offeringTypesByCode.has("course")) {
    throw new Error("Camp and/or course offering types not found in v2_offering_type")
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
  if (msg.includes("Campus not found")) return ERROR_CODES.CAMPUS_NOT_FOUND
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
    const err = new Error("Programs (category) is required for unified import")
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
  const campus = findCampus(campuses, row.Campus)
  if (row.Campus && !campus) {
    const err = new Error(`Campus not found: "${row.Campus}" at ${locationCode}`)
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

  if (offering.category_id !== program.category_id) {
    const err = new Error(
      `Offering category (${offering.category_id}) does not match program category (${program.category_id}) for "${sessionTitle}"`
    )
    err.errorCode = ERROR_CODES.INTEGRITY
    throw err
  }

  const offeringType = ctx.offeringTypesByCode.get(offeringTypeCode)
  const categoryConfigBase =
    category?.config_base && typeof category.config_base === "object" ? category.config_base : {}

  let parsed
  let derived
  let mergedExt

  if (offeringTypeCode === "camp") {
    parsed = buildCampInstanceDataExt(row)
    mergedExt = { ...categoryConfigBase, ...parsed.ext }
    validateInstanceSchema(offeringType.instance_schema?.fields, mergedExt)
    derived = deriveCampRowFields(mergedExt, parsed)
  } else if (offeringTypeCode === "course") {
    parsed = buildCourseInstanceDataExt(row, sessionTitle)
    mergedExt = { ...categoryConfigBase, ...parsed.ext }
    validateInstanceSchema(offeringType.instance_schema?.fields, mergedExt, { relaxAgeBounds: true })
    derived = deriveCourseRowFields(mergedExt, parsed)
  } else {
    const err = new Error(`Unsupported offering type: ${offeringTypeCode}`)
    err.errorCode = ERROR_CODES.UNKNOWN_OFFERING_TYPE
    throw err
  }

  const statusRaw = (row.Status || "scheduled").trim().toLowerCase()
  const validStatuses = ["scheduled", "ongoing", "completed", "cancelled"]
  if (!validStatuses.includes(statusRaw)) {
    throw new Error(`Invalid status: ${row.Status}`)
  }

  const { isCourseType, portalServiceRole } = derivePortalFields(offering, offeringTypeCode)
  const amilia = decodeHtmlEntities(row["Amilia Link"])

  const dbRow = {
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
  }

  if (offeringTypeCode === "camp") {
    dbRow.max_students = derived.finalMaxStudents
    if (derived.finalMaxStudents != null && derived.finalMaxStudents < 1) {
      throw new Error("Max Campers must be at least 1 when set")
    }
  } else {
    dbRow.max_students = null
    dbRow.days_of_week = derived.finalDaysOfWeek
  }

  const categoryLabel = category.display_name || category.name || categoryLabelInput
  const { instance: existing, naturalKey: nk } = findExistingInstance(ctx, {
    locationCode,
    categoryLabel,
    activityLabel,
    sessionTitle,
    startDate: derived.finalStartDate,
    csvCampus: row.Campus,
    resolvedCampus: campus,
  })

  return {
    dbRow,
    offering,
    program,
    category,
    franchise,
    offeringTypeCode,
    naturalKey: nk,
    existing,
    activityResolved,
    input: {
      locationCode,
      category: categoryLabelInput,
      activity: rawActivity,
      sessionTitle,
      campus: row.Campus,
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
    const aStr = JSON.stringify(a)
    const bStr = JSON.stringify(b)
    if (aStr !== bStr) {
      changes[k] = { before: b, after: a }
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

function scanFileDuplicates(rows, ctx, { allowFileDuplicates = false } = {}) {
  const keyToRows = new Map()
  const duplicateInFile = []

  for (const row of rows) {
    if (rowIsEmpty(row)) continue
    if (!rowHasIdentity(row)) continue
    try {
      const resolved = resolveRow(row, ctx)
      const nk = resolved.naturalKey
      const list = keyToRows.get(nk) || []
      list.push(row._rowNum)
      keyToRows.set(nk, list)
    } catch {
      // resolution errors handled per-row later
    }
  }

  for (const [nk, rowNums] of keyToRows) {
    if (rowNums.length > 1) {
      duplicateInFile.push({ natural_key: nk, rows: rowNums })
    }
  }

  if (duplicateInFile.length && !allowFileDuplicates) {
    return { blocked: true, duplicateInFile, winningRows: new Map() }
  }

  const winningRows = new Map()
  if (allowFileDuplicates) {
    for (const [nk, rowNums] of keyToRows) {
      if (rowNums.length > 1) {
        winningRows.set(nk, rowNums[rowNums.length - 1])
      }
    }
  }

  return { blocked: false, duplicateInFile, winningRows }
}

async function publishOffering(supabase, offeringId) {
  const { error } = await supabase.from("v2_offering").update({ status: "published" }).eq("id", offeringId)
  if (error) throw new Error(`Failed to publish offering ${offeringId}: ${error.message}`)
}

async function ensureSummerCoursesProgram(supabase, franchiseId, categoryId) {
  const { data: existing } = await supabase
    .from("v2_program")
    .select("id")
    .eq("franchise_id", franchiseId)
    .eq("category_id", categoryId)
    .eq("display_name", "2026 Summer Courses")
    .maybeSingle()
  if (existing) return existing.id

  const { data: ref } = await supabase
    .from("v2_program")
    .select("start_date, end_date, poster_url")
    .eq("franchise_id", franchiseId)
    .eq("display_name", "2026 Summer Courses")
    .maybeSingle()

  const { data: campsRef } = await supabase
    .from("v2_program")
    .select("start_date, end_date, poster_url")
    .eq("franchise_id", franchiseId)
    .eq("category_id", categoryId)
    .eq("display_name", "2026 Summer Camps")
    .maybeSingle()

  const { data, error } = await supabase
    .from("v2_program")
    .insert({
      franchise_id: franchiseId,
      category_id: categoryId,
      name: "summer_2026_courses",
      display_name: "2026 Summer Courses",
      description: "2026 Summer Courses",
      start_date: ref?.start_date || campsRef?.start_date || "2026-06-01",
      end_date: ref?.end_date || campsRef?.end_date || "2026-08-31",
      display_order: 0,
      is_active: true,
      featured: false,
      poster_url: ref?.poster_url || campsRef?.poster_url || null,
    })
    .select("id")
    .single()
  if (error) throw new Error(`Failed to create 2026 Summer Courses program: ${error.message}`)
  return data.id
}

async function ensureLearnSummerCoursesProgram(supabase, franchiseId) {
  return ensureSummerCoursesProgram(supabase, franchiseId, "e8d59bb7-77f6-4eb0-97dd-e6422614b937")
}

async function ensureCompeteSummerCampsProgram(supabase, franchiseId) {
  const { data: competeCat } = await supabase
    .from("v2_category")
    .select("id")
    .eq("name", "compete")
    .maybeSingle()
  if (!competeCat) throw new Error("Compete category not found in v2_category")

  const { data: existing } = await supabase
    .from("v2_program")
    .select("id")
    .eq("franchise_id", franchiseId)
    .eq("category_id", competeCat.id)
    .eq("display_name", "2026 Summer Camps")
    .maybeSingle()
  if (existing) return existing.id

  const { data: ref } = await supabase
    .from("v2_program")
    .select("start_date, end_date, poster_url")
    .eq("category_id", competeCat.id)
    .eq("display_name", "2026 Summer Camps")
    .limit(1)
    .maybeSingle()

  const { data, error } = await supabase
    .from("v2_program")
    .insert({
      franchise_id: franchiseId,
      category_id: competeCat.id,
      name: "summer_2026_camps_compete",
      display_name: "2026 Summer Camps",
      description: "2026 Summer Camps",
      start_date: ref?.start_date || "2026-06-01",
      end_date: ref?.end_date || "2026-08-31",
      display_order: 0,
      is_active: true,
      featured: false,
      poster_url: ref?.poster_url || null,
    })
    .select("id")
    .single()
  if (error) throw new Error(`Failed to create Compete 2026 Summer Camps: ${error.message}`)
  return data.id
}

function collectSummerCoursesProgramNeeds(rows) {
  const needs = new Map()
  for (const row of rows) {
    const activity = getActivityLabel(row)
    if (!/courses/i.test(activity)) continue
    const loc = normalizeKey(row["Location Code"])
    const cat = normalizeKey(getCategoryLabel(row))
    if (!loc || !cat) continue
    needs.set(`${loc}|${cat}`, { locationCode: row["Location Code"], categoryLabel: getCategoryLabel(row) })
  }
  return needs
}

function collectCompeteSummerCampsProgramNeeds(rows) {
  const needs = new Set()
  for (const row of rows) {
    const activity = getActivityLabel(row)
    if (!/camps/i.test(activity)) continue
    if (normalizeKey(getCategoryLabel(row)) !== "compete") continue
    const loc = normalizeKey(row["Location Code"])
    if (loc) needs.add(row["Location Code"])
  }
  return needs
}

async function ensureProgramsForRows(supabase, rows, ctx, { execute = false, log = console.log } = {}) {
  let created = false

  for (const locationCode of collectCompeteSummerCampsProgramNeeds(rows)) {
    const franchise =
      ctx.franchiseByCode.get(normalizeKey(locationCode)) ||
      ctx.franchiseByName.get(normalizeKey(locationCode))
    if (!franchise) continue

    const { data: competeCat } = await supabase
      .from("v2_category")
      .select("id")
      .eq("name", "compete")
      .maybeSingle()
    if (!competeCat) continue

    const programs = ctx.programsByFranchise.get(franchise.id) || []
    const exists = programs.some(
      (p) => p.category_id === competeCat.id && normalizeKey(p.display_name) === normalizeKey("2026 Summer Camps")
    )
    if (exists) continue

    if (!execute) {
      log(
        `Note: "${locationCode}" + Compete needs "2026 Summer Camps" program (auto-created on --execute)`
      )
      continue
    }

    const pid = await ensureCompeteSummerCampsProgram(supabase, franchise.id)
    log(`Created Compete "2026 Summer Camps" at ${locationCode}: ${pid}`)
    created = true
  }

  const courseNeeds = collectSummerCoursesProgramNeeds(rows)
  for (const { locationCode, categoryLabel } of courseNeeds.values()) {
    const franchise =
      ctx.franchiseByCode.get(normalizeKey(locationCode)) ||
      ctx.franchiseByName.get(normalizeKey(locationCode))
    const category = ctx.categoriesByKey.get(normalizeKey(categoryLabel))
    if (!franchise || !category) continue

    const programs = ctx.programsByFranchise.get(franchise.id) || []
    const exists = programs.some(
      (p) => p.category_id === category.id && normalizeKey(p.display_name) === normalizeKey("2026 Summer Courses")
    )
    if (exists) continue

    if (!execute) {
      log(
        `Note: "${locationCode}" + "${categoryLabel}" needs "2026 Summer Courses" program (auto-created on --execute)`
      )
      continue
    }

    const pid = await ensureSummerCoursesProgram(supabase, franchise.id, category.id)
    log(`Created "2026 Summer Courses" at ${locationCode}/${categoryLabel}: ${pid}`)
    created = true
  }
  return created
}

async function auditInstancesIntegrity(supabase) {
  const { data: instances, error } = await supabase
    .from("v2_instance")
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
    .from("v2_instance")
    .select("id", { count: "exact", head: true })
  if (countErr) throw new Error(`Count instances failed: ${countErr.message}`)

  if (!count) return { deleted: 0 }

  const { error } = await supabase
    .from("v2_instance")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000")
  if (error) throw new Error(`Delete all instances failed: ${error.message}`)

  return { deleted: count }
}

function writeReport(outDir, report) {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  const jsonPath = path.join(outDir, `import-instances-${stamp}.json`)
  const logPath = path.join(outDir, `import-instances-${stamp}.log`)
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2))

  const logLines = [...(report._consoleLines || [])]
  if (report.summary.failed > 0) {
    logLines.push("", "=== Failures by error_code ===")
    const byCode = {}
    for (const r of report.results) {
      if (r.action !== "FAILED" && r.action !== "DRAFT_BLOCKED") continue
      const code = r.error_code || "FAILED"
      if (!byCode[code]) byCode[code] = []
      byCode[code].push(r)
    }
    for (const [code, items] of Object.entries(byCode)) {
      logLines.push(`\n[${code}] (${items.length})`)
      for (const item of items) {
        logLines.push(`  row ${item.row}: ${item.error || item.error_code}`)
        if (item.hint) logLines.push(`    hint: ${item.hint}`)
      }
    }
  }
  fs.writeFileSync(logPath, logLines.join("\n") + "\n", "utf8")

  return { jsonPath, logPath, stamp }
}

module.exports = {
  DEFAULT_UNIFIED_CSV,
  HEADER_ALIASES,
  ERROR_CODES,
  loadEnv,
  parseArgs,
  parseSpreadsheet,
  rowsToObjects,
  getCategoryLabel,
  getActivityLabel,
  getSessionTitle,
  rowHasIdentity,
  rowIsEmpty,
  rowHasAnyIdentity,
  normalizeActivityForCourse,
  naturalKey,
  preflight,
  resolveRow,
  buildCampInstanceDataExt,
  buildCourseInstanceDataExt,
  findExistingInstance,
  buildUpdatePayload,
  diffDbRow,
  snapshotInstance,
  scanFileDuplicates,
  publishOffering,
  ensureLearnSummerCoursesProgram,
  ensureCompeteSummerCampsProgram,
  ensureProgramsForRows,
  ensureSummerCoursesProgram,
  collectSummerCoursesProgramNeeds,
  collectCompeteSummerCampsProgramNeeds,
  classifyError,
  writeReport,
  auditInstancesIntegrity,
  deleteAllInstances,
}
