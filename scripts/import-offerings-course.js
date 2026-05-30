#!/usr/bin/env node

/**
 * Import course offerings from Excel/CSV into v2_offering.
 *
 * Column mapping (offerings-course.xlsx):
 *   Title              → v2_offering.name
 *   Program (tag)      → v2_category (Learn / Explore / Compete)
 *   Offering Type      → v2_offering_type.code = course
 *   Activity           → ignored (camp/program activity; not used on course offerings)
 *
 * Usage:
 *   node scripts/import-offerings-course.js [--dry-run] [--execute] [--category-only] [--file <path>]
 *
 * Default file: ../Blaze/offerings-course.xlsx
 */

const fs = require("fs")
const path = require("path")
const { execFileSync } = require("child_process")

const DEFAULT_XLSX =
  "/Users/zhen/Library/CloudStorage/OneDrive-个人/Blaze/Blaze-Offerings-Course.xlsx"

const HEADER_ALIASES = {
  title: "Title",
  "description for admin": "Description for admin",
  "image link": "Image Link",
  overview: "Overview",
  "target students": "Target Students",
  "learning outcome": "Learning Outcome",
  activity: "Activity",
  program: "Program",
  "program (tag)": "Program",
  "program （tag）": "Program",
  prerequisites: "prerequisites",
  "offering type": "Offering Type",
  "offering type (tag)": "Offering Type",
  "offering type （tag）": "Offering Type",
  status: "Status",
  currency: "Currency",
  "base price": "Base Price",
  materials: "Materials",
  certificate: "Certificate",
  "default capacity": "Default Capacity",
  "default occurrences": "Default Occurrences",
  "treat as course": "Treat as course",
  "show care service": "Show care service",
  "show meal service": "Show Meal Service",
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
  const args = { dryRun: true, execute: false, categoryOnly: false, file: DEFAULT_XLSX }
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--execute") {
      args.execute = true
      args.dryRun = false
    } else if (argv[i] === "--dry-run") {
      args.dryRun = true
      args.execute = false
    } else if (argv[i] === "--category-only") {
      args.categoryOnly = true
    } else if (argv[i] === "--file" && argv[i + 1]) {
      args.file = argv[++i]
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

function normalizeHeader(h) {
  const raw = String(h || "")
    .trim()
    .replace(/\uFF08/g, "(")
    .replace(/\uFF09/g, ")")
    .replace(/\s+/g, " ")
  const key = raw.toLowerCase()
  return HEADER_ALIASES[key] || raw
}

function rowsToObjects(tableRows) {
  if (!tableRows.length) return []
  const headers = tableRows[0].map(normalizeHeader)
  const required = ["Title", "Program", "Offering Type", "Overview", "Base Price"]
  const missing = required.filter((h) => !headers.includes(h))
  if (missing.length) {
    throw new Error(`Missing required columns: ${missing.join(", ")}`)
  }
  return tableRows.slice(1).map((row, idx) => {
    const obj = { _rowNum: idx + 2 }
    headers.forEach((h, i) => {
      obj[h] = row[i] != null ? String(row[i]).trim() : ""
    })
    return obj
  })
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

function parsePrerequisites(val) {
  const v = String(val || "").trim().toLowerCase()
  if (!v || v === "no" || v === "none" || v === "n/a") return null
  return decodeHtmlEntities(val)
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
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
          ? String(config.target_audience)
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

function buildTypeConfigData(row) {
  const overview = decodeHtmlEntities(row.Overview)
  if (!overview) throw new Error("Overview is required (content.description)")

  const basePrice = Number(row["Base Price"])
  if (Number.isNaN(basePrice)) {
    throw new Error(`Invalid Base Price: ${row["Base Price"]}`)
  }

  const capacity = Number(row["Default Capacity"])
  if (Number.isNaN(capacity) || capacity < 1) {
    throw new Error(`Invalid Default Capacity: ${row["Default Capacity"]}`)
  }

  const sessions = Number(row["Default Occurrences"])
  if (Number.isNaN(sessions) || sessions < 1) {
    throw new Error(`Invalid Default Occurrences: ${row["Default Occurrences"]}`)
  }

  return {
    content: {
      description: overview,
      target_audience: decodeHtmlEntities(row["Target Students"]) || null,
      learning_outcomes: decodeHtmlEntities(row["Learning Outcome"]) || null,
      prerequisites: parsePrerequisites(row.prerequisites),
    },
    pricing: {
      currency: row.Currency || "USD",
      base_price: basePrice,
    },
    options: {
      materials_included: parseYesNo(row.Materials, false),
      certificate_available: parseYesNo(row.Certificate, false),
    },
    capacity_sessions: {
      base_capacity: capacity,
      base_sessions_count: sessions,
    },
    portal_config: {
      is_course_type: parseYesNo(row["Treat as course"], true),
      show_care_service: parseYesNo(row["Show care service"], true),
      show_meal_service: parseYesNo(row["Show Meal Service"], true),
    },
  }
}

function mapRowToPayload(row, offeringTypeId, categoryId) {
  const name = decodeHtmlEntities(row.Title)
  if (!name) throw new Error("Title is required")

  const offeringTypeTag = String(row["Offering Type"] || "")
    .trim()
    .toLowerCase()
  if (offeringTypeTag && offeringTypeTag !== "course") {
    throw new Error(`Expected Offering Type Course, got: ${row["Offering Type"]}`)
  }

  const statusRaw = String(row.Status || "draft").trim().toLowerCase()
  const validStatuses = ["draft", "published", "suspended", "archived"]
  if (!validStatuses.includes(statusRaw)) {
    throw new Error(`Invalid status: ${row.Status}`)
  }

  const typeConfigData = buildTypeConfigData(row)
  const adminDesc = decodeHtmlEntities(row["Description for admin"])
  const posterUrl = normalizePosterUrl(row["Image Link"])

  return {
    name,
    description: adminDesc || null,
    poster_url: posterUrl || null,
    offering_type_id: offeringTypeId,
    category_id: categoryId,
    status: statusRaw,
    type_config_data: typeConfigData,
  }
}

function mergeConfig(categoryConfigBase, userConfigData) {
  return {
    ...(categoryConfigBase && typeof categoryConfigBase === "object"
      ? categoryConfigBase
      : {}),
    ...userConfigData,
  }
}

function buildDbRow(payload, configData) {
  const flattened = flattenTypeConfigDataForTable(configData)
  return {
    name: payload.name,
    description: payload.description ?? flattened.description ?? null,
    target_audience: flattened.target_audience ?? null,
    learning_outcomes: flattened.learning_outcomes ?? null,
    prerequisites: flattened.prerequisites ?? null,
    base_price: flattened.base_price ?? null,
    currency: flattened.currency ?? "USD",
    poster_url: payload.poster_url,
    category_id: payload.category_id,
    offering_type_id: payload.offering_type_id,
    type_config_data: configData,
    status: payload.status,
  }
}

async function preflight(supabase) {
  const { data: offeringType, error: typeErr } = await supabase
    .from("v2_offering_type")
    .select("id, code, is_active, offering_schema")
    .eq("code", "course")
    .maybeSingle()

  if (typeErr || !offeringType) {
    throw new Error(`Course offering type not found: ${typeErr?.message || "no row"}`)
  }
  if (!offeringType.is_active) {
    throw new Error("Course offering type exists but is not active")
  }

  const { data: categories, error: catErr } = await supabase
    .from("v2_category")
    .select("id, name, display_name, config_base, is_active")

  if (catErr) throw new Error(`Failed to load categories: ${catErr.message}`)

  const byKey = new Map()
  for (const c of categories || []) {
    if (c.is_active === false) continue
    for (const k of [c.name, c.display_name].filter(Boolean)) {
      const key = String(k).trim().toLowerCase()
      if (byKey.has(key) && byKey.get(key).id !== c.id) {
        throw new Error(`Ambiguous category key: ${key}`)
      }
      byKey.set(key, c)
    }
  }

  return { offeringType, categoriesByKey: byKey }
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

async function findExistingByName(supabase, name, offeringTypeId) {
  const { data, error } = await supabase
    .from("v2_offering")
    .select("id, name, slug, category_id")
    .eq("name", name)
    .eq("offering_type_id", offeringTypeId)

  if (error) throw new Error(`Lookup failed for "${name}": ${error.message}`)
  if (!data || data.length === 0) return null
  if (data.length > 1) {
    throw new Error(`Multiple course offerings named "${name}" (${data.length} rows)`)
  }
  return data[0]
}

async function slugExists(supabase, slug, excludeId) {
  let q = supabase.from("v2_offering").select("id").eq("slug", slug)
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

async function upsertOffering(
  supabase,
  payload,
  categoryConfigBase,
  existing,
  dryRun
) {
  const configData = mergeConfig(categoryConfigBase, payload.type_config_data)
  const dbRow = buildDbRow(payload, configData)

  if (existing) {
    if (dryRun) return { action: "UPDATE", id: existing.id, slug: existing.slug, dbRow }
    const { data, error } = await supabase
      .from("v2_offering")
      .update(dbRow)
      .eq("id", existing.id)
      .select("id, name, slug, status")
      .single()
    if (error) throw new Error(`Update failed: ${error.message}`)
    return { action: "UPDATE", ...data }
  }

  const slug = await allocateSlug(supabase, payload.name, null)
  if (dryRun) return { action: "INSERT", slug, dbRow: { ...dbRow, slug } }

  const { data, error } = await supabase
    .from("v2_offering")
    .insert({ ...dbRow, slug })
    .select("id, name, slug, status")
    .single()
  if (error) {
    if (error.code === "23505") {
      throw new Error(`Insert conflict (name/slug): ${error.message}`)
    }
    throw new Error(`Insert failed: ${error.message}`)
  }
  return { action: "INSERT", ...data }
}

async function updateCategoryOnly(
  supabase,
  existing,
  categoryId,
  programTag,
  categoriesByKey,
  dryRun
) {
  if (!existing) {
    throw new Error(`Offering not found in v2_offering (course type): update skipped`)
  }
  if (existing.category_id === categoryId) {
    return { action: "UNCHANGED", id: existing.id, slug: existing.slug, categoryId, programTag }
  }
  const cat = [...categoriesByKey.values()].find((c) => c.id === categoryId)
  const catLabel = cat ? cat.display_name || cat.name : categoryId
  if (dryRun) {
    return {
      action: "UPDATE",
      id: existing.id,
      slug: existing.slug,
      categoryId,
      programTag,
      catLabel,
      previousCategoryId: existing.category_id,
    }
  }
  const { data, error } = await supabase
    .from("v2_offering")
    .update({ category_id: categoryId })
    .eq("id", existing.id)
    .select("id, name, slug, category_id")
    .single()
  if (error) throw new Error(`Update failed: ${error.message}`)
  return {
    action: "UPDATE",
    ...data,
    programTag,
    catLabel,
    previousCategoryId: existing.category_id,
  }
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

  console.log("Import course offerings → v2_offering")
  console.log("=".repeat(60))
  console.log(`Mode: ${args.dryRun ? "DRY RUN" : "EXECUTE"}`)
  console.log(`Scope: ${args.categoryOnly ? "category_id only" : "full upsert"}`)
  console.log(`File: ${args.file}`)
  console.log(`Supabase: ${supabaseUrl}`)
  console.log("Note: Activity column is ignored for course offerings.")
  console.log("")

  const { offeringType, categoriesByKey } = await preflight(supabase)
  console.log(`Course offering_type_id: ${offeringType.id}`)
  console.log("")

  const allRows = parseXlsx(args.file)
  const dataRows = rowsToObjects(allRows).filter((r) => r.Title)

  if (!dataRows.length) {
    console.error("No data rows in spreadsheet")
    process.exit(1)
  }

  const categoryConfigById = new Map()
  for (const c of categoriesByKey.values()) {
    categoryConfigById.set(
      c.id,
      c.config_base && typeof c.config_base === "object" ? c.config_base : {}
    )
  }

  const report = {
    mode: args.dryRun ? "dry-run" : "execute",
    file: args.file,
    offeringTypeId: offeringType.id,
    summary: { insert: 0, update: 0, unchanged: 0, failed: 0 },
    results: [],
  }

  for (const row of dataRows) {
    const rowNum = row._rowNum
    try {
      const programTag = row.Program
      const categoryId = resolveCategoryId(programTag, categoriesByKey)
      const name = decodeHtmlEntities(row.Title)
      const existing = await findExistingByName(supabase, name, offeringType.id)

      let result
      if (args.categoryOnly) {
        result = await updateCategoryOnly(
          supabase,
          existing,
          categoryId,
          programTag,
          categoriesByKey,
          args.dryRun
        )
      } else {
        const payload = mapRowToPayload(row, offeringType.id, categoryId)
        result = await upsertOffering(
          supabase,
          payload,
          categoryConfigById.get(categoryId),
          existing,
          args.dryRun
        )
      }

      if (result.action === "INSERT") report.summary.insert++
      else if (result.action === "UPDATE") report.summary.update++
      else if (result.action === "UNCHANGED") report.summary.unchanged++

      report.results.push({
        row: rowNum,
        name,
        program: programTag,
        category_id: result.categoryId || result.category_id || categoryId,
        action: result.action,
        id: result.id || null,
        slug: result.slug || null,
        previous_category_id: result.previousCategoryId || null,
      })

      const catNote =
        args.categoryOnly && result.catLabel
          ? ` → ${result.catLabel}${result.previousCategoryId ? ` (was ${result.previousCategoryId})` : ""}`
          : ""
      console.log(
        `[${rowNum}] ${result.action} ${name} (${programTag}${catNote})` +
          (result.id ? ` id=${result.id}` : "")
      )
    } catch (err) {
      report.summary.failed++
      report.results.push({
        row: rowNum,
        name: row.Title || "(no title)",
        error: err.message,
      })
      console.error(`[${rowNum}] FAILED: ${err.message}`)
    }
  }

  console.log("")
  console.log("Summary:", report.summary)

  const outDir = path.join(__dirname, "output")
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  const logPath = path.join(outDir, `import-offerings-course-${stamp}.json`)
  fs.writeFileSync(logPath, JSON.stringify(report, null, 2))
  console.log(`Report: ${logPath}`)

  if (report.summary.failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error("Fatal:", err.message)
  process.exit(1)
})
