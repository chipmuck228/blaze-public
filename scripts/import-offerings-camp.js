#!/usr/bin/env node

/**
 * Import camp offerings from Excel into v2_offering.
 *
 * Usage:
 *   node scripts/import-offerings-camp.js [--dry-run] [--execute] [--file <path>]
 *
 * Default: --dry-run (no writes).
 */

const fs = require("fs")
const path = require("path")
const { execFileSync } = require("child_process")

const DEFAULT_XLSX =
  "/Users/zhen/Library/CloudStorage/OneDrive-个人/Blaze/offerings-camp.xlsx"

const COL = {
  TITLE: 0,
  DESC_ADMIN: 1,
  IMAGE: 2,
  OVERVIEW: 3,
  TARGET: 4,
  OUTCOMES: 5,
  ACTIVITY: 6,
  PROGRAM: 7,
  PREREQ: 8,
  OFFERING_TYPE: 9,
  STATUS: 10,
  CURRENCY: 11,
  BASE_PRICE: 12,
  MEAL: 13,
  CAPACITY: 14,
  TREAT_COURSE: 15,
  SHOW_CARE: 16,
  SHOW_MEAL: 17,
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

function parseArgs(argv) {
  const args = { dryRun: true, execute: false, file: DEFAULT_XLSX }
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--execute") {
      args.execute = true
      args.dryRun = false
    } else if (argv[i] === "--dry-run") {
      args.dryRun = true
      args.execute = false
    } else if (argv[i] === "--file" && argv[i + 1]) {
      args.file = argv[++i]
    }
  }
  return args
}

/** Parse first sheet of xlsx to array of row arrays (via python3 zip+xml). */
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

function decodeHtmlEntities(text) {
  if (!text) return text
  return String(text)
    .replace(/&mdash;/g, "\u2014")
    .replace(/&ndash;/g, "\u2013")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&lsquo;/g, "\u2018")
    .replace(/&rdquo;/g, "\u201D")
    .replace(/&ldquo;/g, "\u201C")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
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

function cell(row, idx) {
  return decodeHtmlEntities(row[idx] != null ? String(row[idx]).trim() : "")
}

function parseYesNo(val) {
  const v = String(val || "").trim().toLowerCase()
  if (v === "yes" || v === "true" || v === "1") return true
  if (v === "no" || v === "false" || v === "0") return false
  throw new Error(`Invalid Yes/No value: ${val}`)
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
  const overview = cell(row, COL.OVERVIEW)
  if (!overview) {
    throw new Error("Overview is required (content.description)")
  }
  const basePrice = Number(cell(row, COL.BASE_PRICE))
  if (Number.isNaN(basePrice)) {
    throw new Error(`Invalid Base Price: ${row[COL.BASE_PRICE]}`)
  }
  const capacity = Number(cell(row, COL.CAPACITY))
  if (Number.isNaN(capacity) || capacity < 1) {
    throw new Error(`Invalid Default Capacity: ${row[COL.CAPACITY]}`)
  }
  const activity = cell(row, COL.ACTIVITY)
  const meal = cell(row, COL.MEAL).toLowerCase() || "standard"

  return {
    content: {
      description: overview,
      target_audience: cell(row, COL.TARGET) || null,
      learning_outcomes: cell(row, COL.OUTCOMES) || null,
      prerequisites: parsePrerequisites(row[COL.PREREQ]),
    },
    pricing: {
      currency: cell(row, COL.CURRENCY) || "USD",
      base_price: basePrice,
    },
    capacity_meal: {
      meal_option: meal,
      base_capacity: capacity,
    },
    portal_config: {
      is_course_type: parseYesNo(row[COL.TREAT_COURSE]),
      show_care_service: parseYesNo(row[COL.SHOW_CARE]),
      show_meal_service: parseYesNo(row[COL.SHOW_MEAL]),
    },
    program_lists: {
      activities: activity ? [activity] : [],
      equipment_list: [],
    },
  }
}

function mapRowToPayload(row, offeringTypeId, categoryId) {
  const name = cell(row, COL.TITLE)
  if (!name) throw new Error("Title is required")

  const offeringTypeTag = cell(row, COL.OFFERING_TYPE).toLowerCase()
  if (offeringTypeTag && offeringTypeTag !== "camp") {
    throw new Error(`Expected Offering Type Camp, got: ${row[COL.OFFERING_TYPE]}`)
  }

  const statusRaw = cell(row, COL.STATUS).toLowerCase()
  const validStatuses = ["draft", "published", "suspended", "archived"]
  if (!validStatuses.includes(statusRaw)) {
    throw new Error(`Invalid status: ${row[COL.STATUS]}`)
  }

  const typeConfigData = buildTypeConfigData(row)
  const adminDesc = cell(row, COL.DESC_ADMIN)
  const posterUrl = normalizePosterUrl(cell(row, COL.IMAGE))

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
    .eq("code", "camp")
    .maybeSingle()

  if (typeErr || !offeringType) {
    throw new Error(
      `Camp offering type not found: ${typeErr?.message || "no row"}`
    )
  }
  if (!offeringType.is_active) {
    throw new Error("Camp offering type exists but is not active")
  }

  const { data: categories, error: catErr } = await supabase
    .from("v2_category")
    .select("id, name, display_name, config_base, is_active")

  if (catErr) throw new Error(`Failed to load categories: ${catErr.message}`)

  const active = (categories || []).filter((c) => c.is_active !== false)
  const byKey = {}
  for (const c of active) {
    const keys = [
      (c.name || "").trim().toLowerCase(),
      (c.display_name || "").trim().toLowerCase(),
    ].filter(Boolean)
    for (const k of keys) {
      if (byKey[k] && byKey[k].id !== c.id) {
        throw new Error(`Ambiguous category key: ${k}`)
      }
      byKey[k] = c
    }
  }

  const learn = byKey.learn
  const explore = byKey.explore
  if (!learn || !explore) {
    const available = active
      .map((c) => `${c.display_name || c.name} (${c.id})`)
      .join(", ")
    throw new Error(
      `Missing Learn or Explore category. Available: ${available || "none"}`
    )
  }

  return { offeringType, categories: { learn, explore } }
}

function resolveCategoryId(programTag, categories) {
  const key = String(programTag || "").trim().toLowerCase()
  if (key === "learn") return categories.learn.id
  if (key === "explore") return categories.explore.id
  throw new Error(`Unknown Program tag: ${programTag}`)
}

async function findExistingByName(supabase, name) {
  const { data, error } = await supabase
    .from("v2_offering")
    .select("id, name, slug")
    .eq("name", name)

  if (error) throw new Error(`Lookup failed for "${name}": ${error.message}`)
  if (!data || data.length === 0) return null
  if (data.length > 1) {
    throw new Error(`Multiple offerings named "${name}" (${data.length} rows)`)
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
  const configData = mergeConfig(
    categoryConfigBase,
    payload.type_config_data
  )
  const dbRow = buildDbRow(payload, configData)

  if (existing) {
    const action = "UPDATE"
    if (dryRun) {
      return { action, id: existing.id, slug: existing.slug, dbRow }
    }
    const { data, error } = await supabase
      .from("v2_offering")
      .update(dbRow)
      .eq("id", existing.id)
      .select("id, name, slug, status")
      .single()
    if (error) throw new Error(`Update failed: ${error.message}`)
    return { action, ...data }
  }

  const slug = await allocateSlug(supabase, payload.name, null)
  const action = "INSERT"
  if (dryRun) {
    return { action, slug, dbRow: { ...dbRow, slug } }
  }
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
  return { action, ...data }
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

  console.log("Import camp offerings → v2_offering")
  console.log("=".repeat(60))
  console.log(`Mode: ${args.dryRun ? "DRY RUN" : "EXECUTE"}`)
  console.log(`File: ${args.file}`)
  console.log(`Supabase: ${supabaseUrl}`)
  console.log("")

  const { offeringType, categories } = await preflight(supabase)
  console.log(`Camp offering_type_id: ${offeringType.id}`)
  console.log(`Learn category_id: ${categories.learn.id}`)
  console.log(`Explore category_id: ${categories.explore.id}`)
  console.log("")

  const allRows = parseXlsx(args.file)
  if (allRows.length < 2) {
    console.error("No data rows in spreadsheet")
    process.exit(1)
  }

  const dataRows = allRows.slice(1)
  const report = {
    mode: args.dryRun ? "dry-run" : "execute",
    file: args.file,
    supabaseUrl,
    offeringTypeId: offeringType.id,
    summary: { insert: 0, update: 0, failed: 0 },
    results: [],
  }

  const categoryConfigById = {
    [categories.learn.id]: categories.learn.config_base,
    [categories.explore.id]: categories.explore.config_base,
  }

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    const rowNum = i + 2
    try {
      const programTag = cell(row, COL.PROGRAM)
      const categoryId = resolveCategoryId(programTag, categories)
      const payload = mapRowToPayload(row, offeringType.id, categoryId)
      const existing = await findExistingByName(supabase, payload.name)
      const categoryConfigBase = categoryConfigById[categoryId]
      const result = await upsertOffering(
        supabase,
        payload,
        categoryConfigBase,
        existing,
        args.dryRun
      )

      if (result.action === "INSERT") report.summary.insert++
      else report.summary.update++

      report.results.push({
        row: rowNum,
        name: payload.name,
        program: programTag,
        status: payload.status,
        action: result.action,
        id: result.id || null,
        slug: result.slug || null,
      })

      console.log(
        `[${rowNum}] ${result.action} ${payload.name} (${programTag}, ${payload.status})` +
          (result.id ? ` id=${result.id}` : "") +
          (result.slug ? ` slug=${result.slug}` : "")
      )
    } catch (err) {
      report.summary.failed++
      report.results.push({
        row: rowNum,
        name: cell(row, COL.TITLE) || "(no title)",
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
  const logPath = path.join(outDir, `import-offerings-camp-${stamp}.json`)
  fs.writeFileSync(logPath, JSON.stringify(report, null, 2))
  console.log(`Report: ${logPath}`)

  if (report.summary.failed > 0) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error("Fatal:", err.message)
  process.exit(1)
})
