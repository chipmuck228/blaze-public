#!/usr/bin/env node

/**
 * Import camp instances from Excel/CSV into v2_instance.
 *
 * C-end vs Admin mapping:
 *   Location Code     → v2_franchise.code
 *   Program (optional)→ v2_category — omit from CSV; resolved via offering + Activity
 *   Activity          → v2_program (e.g. 2026 Summer Camps)
 *   Session Title     → v2_offering.name (C-end session card title)
 *   (session row)     → v2_instance
 *
 * Template columns (header row, any order):
 *   Location Code, Activity, Session Title, Campus,
 *   Start Date, End Date, Start Time, End Time,
 *   Min Age, Max Age, Max Campers, Price Override,
 *   Meal Provided, Camp Shirt Provided, After Care Available,
 *   Status, Is Active, Featured, Amilia Link, Notes
 *
 * Legacy headers: Program Name (= Activity), Offering Title (= Session Title)
 *
 * Usage:
 *   node scripts/import-instances-camp.js --write-template [<path.csv>]
 *   node scripts/import-instances-camp.js --generate-starter [<path.csv>]
 *   node scripts/import-instances-camp.js --dry-run [--file <path>]
 *   node scripts/import-instances-camp.js --dry-run --allow-draft-offering   # include draft offerings
 *   node scripts/import-instances-camp.js --execute --publish-referenced-offerings [--file <path>]
 *   node scripts/import-instances-camp.js --execute --allow-draft-offering [--file <path>]
 *
 * Dry-run blocks draft offerings unless --allow-draft-offering. On execute, use
 * --publish-referenced-offerings to set referenced offerings to published before insert.
 *
 * Default file: ../Blaze/instances-camp.csv (repo-adjacent) or Blaze OneDrive path if exists.
 */

const fs = require("fs")
const path = require("path")
const { execFileSync } = require("child_process")

const BLAZE_INSTANCES_CSV =
  "/Users/zhen/Library/CloudStorage/OneDrive-个人/Blaze/instances-camp.csv"
const BLAZE_INSTANCES_XLSX =
  "/Users/zhen/Library/CloudStorage/OneDrive-个人/Blaze/Blaze-Instances-Camps.xlsx"
const REPO_TEMPLATE_CSV = path.join(__dirname, "templates", "instances-camp-template.csv")

const HEADERS = [
  "Location Code",
  "Activity",
  "Session Title",
  "Campus",
  "Start Date",
  "End Date",
  "Start Time",
  "End Time",
  "Min Age",
  "Max Age",
  "Max Campers",
  "Price Override",
  "Meal Provided",
  "Camp Shirt Provided",
  "After Care Available",
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
  /** @deprecated use Activity */
  "program name": "Program Name",
  /** @deprecated use Session Title */
  "offering title": "Offering Title",
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
  status: "Status",
  "is active": "Is Active",
  featured: "Featured",
  "amilia link": "Amilia Link",
  notes: "Notes",
}

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local")
  if (!fs.existsSync(envPath)) return
  const envContent = fs.readFileSync(envPath, "utf8")
  envContent.split("\n").forEach((line) => {
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

function defaultInputFile() {
  if (fs.existsSync(BLAZE_INSTANCES_CSV)) return BLAZE_INSTANCES_CSV
  if (fs.existsSync(BLAZE_INSTANCES_XLSX)) return BLAZE_INSTANCES_XLSX
  return BLAZE_INSTANCES_CSV
}

function parseArgs(argv) {
  const args = {
    dryRun: true,
    execute: false,
    file: defaultInputFile(),
    writeTemplate: null,
    generateStarter: null,
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
    } else if (argv[i] === "--write-template") {
      args.writeTemplate = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : REPO_TEMPLATE_CSV
    } else if (argv[i] === "--generate-starter") {
      args.generateStarter = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : BLAZE_INSTANCES_CSV
    } else if (argv[i] === "--publish-referenced-offerings") {
      args.publishReferencedOfferings = true
    } else if (argv[i] === "--allow-draft-offering") {
      args.allowDraftOffering = true
    }
  }
  return args
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
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  return lines.map(parseCsvLine)
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

function rowsToObjects(tableRows) {
  if (!tableRows.length) return []
  const headers = tableRows[0].map(normalizeHeader)
  const hasNewFormat = headers.includes("Activity") && headers.includes("Session Title")
  const hasLegacyFormat =
    headers.includes("Program Name") && headers.includes("Offering Title")
  if (!hasNewFormat && !hasLegacyFormat) {
    throw new Error(
      "Missing required columns. Use: Location Code, Activity, Session Title, Start Date, End Date " +
        "(legacy: Program Name + Offering Title; optional Program column for v2_category override)"
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

function rowHasIdentity(row) {
  return Boolean(row["Location Code"] && getActivityLabel(row) && getSessionTitle(row))
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
  throw new Error(`Invalid time: ${val}`)
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

function derivePortalFields(offering) {
  const typeConfig = offering.type_config_data || {}
  const isCourseType = !!typeConfig?.portal_config?.is_course_type
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

function buildInstanceDataExt(row) {
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

function deriveRowFields(mergedExt, parsed) {
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

function validateInstanceSchema(instanceSchemaFields, mergedExt) {
  if (!instanceSchemaFields) return
  const errors = []
  const validateField = (val, fieldConfig, fieldLabel) => {
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
          validateField(obj[propKey], propConfig, propConfig?.label || propKey)
        }
      }
    } else {
      validateField(mergedExt[fieldName], fieldConfig, fieldLabel)
    }
  }

  if (errors.length) throw new Error(errors.join("; "))
}

async function generateStarterCsv(supabase, outPath) {
  const ctx = await preflight(supabase)
  const escape = (v) => {
    const s = String(v ?? "")
    return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [HEADERS.map(escape).join(",")]
  const franchises = [...ctx.franchiseByCode.values()]
  const allOfferings = [...ctx.offeringsByName.values()].flat()

  for (const franchise of franchises) {
    const programs = ctx.programsByFranchise.get(franchise.id) || []

    for (const offering of allOfferings) {
      const matching = programs.filter((p) => p.category_id === offering.category_id)
      if (!matching.length) continue

      const program =
        matching.find((p) => normalizeKey(p.display_name || p.name).includes("camp")) ||
        matching[0]

      const row = [
        franchise.code,
        program.display_name || program.name,
        offering.name,
        "",
        "2026-07-07",
        "2026-07-11",
        "09:00",
        "16:00",
        "6",
        "14",
        "15",
        "",
        "Yes",
        "No",
        "No",
        "scheduled",
        "Yes",
        "No",
        "",
        "",
      ]
      lines.push(row.map(escape).join(","))
    }
  }

  const dir = path.dirname(outPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf8")
  console.log(`Wrote ${lines.length - 1} starter rows to ${outPath}`)
}

function writeTemplate(outPath) {
  const example = [
    "mill_creek",
    "2026 Summer Camps",
    "Introduction to Robotics Programming via VEX IQ (Rising Grades 3-5)",
    "",
    "2026-07-07",
    "2026-07-11",
    "09:00",
    "16:00",
    "8",
    "10",
    "15",
    "",
    "Yes",
    "No",
    "No",
    "scheduled",
    "Yes",
    "No",
    "",
    "",
  ]
  const dir = path.dirname(outPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const escape = (v) => {
    const s = String(v)
    return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [HEADERS.map(escape).join(","), example.map(escape).join(",")]
  fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf8")
  console.log(`Wrote template: ${outPath}`)
  console.log(`Columns: ${HEADERS.join(" | ")}`)
}

async function preflight(supabase) {
  const { data: offeringType, error: typeErr } = await supabase
    .from("v2_offering_type")
    .select("id, code, is_active, instance_schema")
    .eq("code", "camp")
    .maybeSingle()

  if (typeErr || !offeringType) {
    throw new Error(`Camp offering type not found: ${typeErr?.message || "no row"}`)
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
    supabase.from("v2_category").select("id, name, display_name, is_active"),
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
    const keys = [normalizeKey(c.name), normalizeKey(c.display_name)].filter(Boolean)
    for (const k of keys) {
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
  const n = normalizeKey(label)
  if (!n) {
    throw new Error("Program column (v2_category: Learn / Explore / Compete) is required")
  }
  const cat = categoriesByKey.get(n)
  if (!cat) {
    const available = [...categoriesByKey.values()]
      .map((c) => c.display_name || c.name)
      .filter((v, i, a) => a.indexOf(v) === i)
      .join(", ")
    throw new Error(`Unknown Program (category): "${label}". Available: ${available || "none"}`)
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
  found = programs.find((p) => normalizeKey(p.display_name).includes(n) || n.includes(normalizeKey(p.display_name)))
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
  // Street address in CSV: match when campus name/display_name appears in the address
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
    throw new Error(`Multiple offerings named "${offeringTitle}" in category ${categoryId}`)
  }
  return null
}

function resolveRow(row, ctx) {
  if (row._legacyHeaders) {
    console.warn(
      `[${row._rowNum}] Legacy columns Program Name / Offering Title — use Program (category), Activity, Session Title`
    )
  }

  const locationCode = row["Location Code"]
  const franchise = ctx.franchiseByCode.get(normalizeKey(locationCode))
  if (!franchise) throw new Error(`Unknown Location Code: ${locationCode}`)

  const activityLabel = getActivityLabel(row)
  const sessionTitle = getSessionTitle(row)
  if (!activityLabel) throw new Error("Activity is required (v2_program, e.g. 2026 Summer Camps)")
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
    if (!program && scoped.length === 1) {
      program = scoped[0]
      console.warn(
        `[${row._rowNum}] Activity "${activityLabel}" not found under Program "${categoryLabelInput}" at ${locationCode}; using sole program "${program.display_name || program.name}"`
      )
    }
    if (!program) {
      throw new Error(
        `Activity not found: "${activityLabel}" under Program "${categoryLabelInput}" at ${locationCode}. ` +
          `Available: ${scoped.map((p) => p.display_name || p.name).join(", ") || "none"}`
      )
    }
  } else {
    const activityMatches = programsMatchingActivity(programs, activityLabel)
    if (!activityMatches.length) {
      throw new Error(
        `Activity not found: "${activityLabel}" at ${locationCode}. Available: ${programs.map((p) => p.display_name || p.name).join(", ") || "none"}`
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
          `Ambiguous row: Session Title "${sessionTitle}" with Activity "${activityLabel}" at ${locationCode} matches multiple programs/categories`
        )
      }
      program = p
      offeringCandidate = off
      category = catRow
    }
    if (!program || !offeringCandidate) {
      throw new Error(`Session Title not found: ${sessionTitle} (with Activity "${activityLabel}" at ${locationCode})`)
    }
    offering = offeringCandidate
  }

  if (!offering) {
    offering = resolveOffering(ctx.offeringsByName, sessionTitle, category.id)
    if (!offering) throw new Error(`Session Title not found: ${sessionTitle}`)
  }

  if (program.category_id !== category.id) {
    throw new Error(
      `Activity "${activityLabel}" category does not match Program column "${categoryLabelInput || category.display_name}"`
    )
  }

  const campuses = ctx.campusesByFranchise.get(franchise.id) || []
  const campus = findCampus(campuses, row.Campus)
  if (row.Campus && !campus) {
    throw new Error(`Campus not found: "${row.Campus}" at ${locationCode}`)
  }

  const parsed = buildInstanceDataExt(row)
  const categoryConfigBase =
    category?.config_base && typeof category.config_base === "object" ? category.config_base : {}

  const nestedFromExcel = parsed.ext
  const mergedExt = {
    ...categoryConfigBase,
    ...nestedFromExcel,
  }

  const schemaFields = ctx.offeringType.instance_schema?.fields
  validateInstanceSchema(schemaFields, mergedExt)

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
    price_override: derived.finalPriceOverride,
    start_date: derived.finalStartDate,
    end_date: derived.finalEndDate,
    start_time: derived.finalStartTime,
    end_time: derived.finalEndTime,
    max_students: derived.finalMaxStudents,
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

  if (derived.finalMaxStudents != null && derived.finalMaxStudents < 1) {
    throw new Error("Max Campers must be at least 1 when set")
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
  }
}

async function publishOffering(supabase, offeringId, dryRun) {
  if (dryRun) return
  const { error } = await supabase.from("v2_offering").update({ status: "published" }).eq("id", offeringId)
  if (error) throw new Error(`Failed to publish offering ${offeringId}: ${error.message}`)
}

async function main() {
  loadEnv()
  const args = parseArgs(process.argv)

  if (args.writeTemplate) {
    writeTemplate(args.writeTemplate)
    return
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (args.generateStarter) {
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase env in .env.local")
      process.exit(1)
    }
    const { createClient } = require("@supabase/supabase-js")
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    await generateStarterCsv(supabase, args.generateStarter)
    return
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
    process.exit(1)
  }

  if (!fs.existsSync(args.file)) {
    console.error(`File not found: ${args.file}`)
    console.error(`Run: node scripts/import-instances-camp.js --write-template`)
    process.exit(1)
  }

  const { createClient } = require("@supabase/supabase-js")
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log("Import camp instances → v2_instance")
  console.log("=".repeat(60))
  console.log(`Mode: ${args.dryRun ? "DRY RUN" : "EXECUTE"}`)
  console.log(`File: ${args.file}`)
  console.log(`Supabase: ${supabaseUrl}`)
  if (args.publishReferencedOfferings) console.log("Will publish draft offerings referenced in file")
  console.log("")

  const ctx = await preflight(supabase)
  console.log(`Camp offering_type_id: ${ctx.offeringType.id}`)
  console.log("")

  const tableRows = parseSpreadsheet(args.file)
  const dataRows = rowsToObjects(tableRows).filter((r) => rowHasIdentity(r))

  if (!dataRows.length) {
    console.error("No data rows in file")
    process.exit(1)
  }

  const report = {
    mode: args.dryRun ? "dry-run" : "execute",
    file: args.file,
    summary: { insert: 0, update: 0, published_offerings: 0, failed: 0, draft_blocked: 0 },
    results: [],
  }

  const publishedOfferingIds = new Set()
  const draftWarnings = []

  for (const row of dataRows) {
    try {
      const resolved = resolveRow(row, ctx)
      const { offering, dbRow, existing, naturalKey: nk } = resolved

      if (offering.status !== "published") {
        if (args.publishReferencedOfferings && args.execute) {
          if (!publishedOfferingIds.has(offering.id)) {
            await publishOffering(supabase, offering.id, false)
            publishedOfferingIds.add(offering.id)
            report.summary.published_offerings++
            offering.status = "published"
          }
        } else if (!args.allowDraftOffering) {
          report.summary.draft_blocked++
          draftWarnings.push(`[${row._rowNum}] ${offering.name} (${offering.status})`)
          throw new Error(
            `Offering is "${offering.status}"; use --publish-referenced-offerings on execute or --allow-draft-offering`
          )
        }
      }

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
          sessionTitle: getSessionTitle(row),
        })
        console.log(
          `[${row._rowNum}] UPDATE ${getSessionTitle(row)} (${getCategoryLabel(row) || "?"}/${getActivityLabel(row)}) (${dbRow.start_date}) id=${existing.id}`
        )
      } else {
        if (!args.dryRun) {
          const { data, error } = await supabase.from("v2_instance").insert(dbRow).select("id").single()
          if (error) throw new Error(`Insert failed: ${error.message}`)
          ctx.instanceByNaturalKey.set(nk, { id: data.id })
          report.results.push({
            row: row._rowNum,
            action: "INSERT",
            id: data.id,
            naturalKey: nk,
            sessionTitle: getSessionTitle(row),
          })
          console.log(
            `[${row._rowNum}] INSERT ${getSessionTitle(row)} (${getCategoryLabel(row)}/${getActivityLabel(row)}) (${dbRow.start_date}) id=${data.id}`
          )
        } else {
          report.results.push({
            row: row._rowNum,
            action: "INSERT",
            naturalKey: nk,
            sessionTitle: getSessionTitle(row),
          })
          console.log(
            `[${row._rowNum}] INSERT ${getSessionTitle(row)} (${getCategoryLabel(row) || "?"}/${getActivityLabel(row)}) (${dbRow.start_date})`
          )
        }
        report.summary.insert++
      }
    } catch (err) {
      report.summary.failed++
      report.results.push({ row: row._rowNum, error: err.message })
      console.error(`[${row._rowNum}] FAILED: ${err.message}`)
    }
  }

  console.log("")
  console.log("Summary:", report.summary)
  if (draftWarnings.length && args.dryRun) {
    console.log("\nDraft offerings (would block without flags):")
    draftWarnings.forEach((w) => console.log(" ", w))
  }

  const outDir = path.join(__dirname, "output")
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  const logPath = path.join(outDir, `import-instances-camp-${stamp}.json`)
  fs.writeFileSync(logPath, JSON.stringify(report, null, 2))
  console.log(`Report: ${logPath}`)

  if (report.summary.failed > 0 || (report.summary.draft_blocked > 0 && !args.allowDraftOffering)) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error("Fatal:", err.message)
  process.exit(1)
})
