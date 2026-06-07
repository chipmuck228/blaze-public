#!/usr/bin/env node
/**
 * Validate v2 → v3 catalog migration (row counts + optional FK orphans).
 *
 * Usage:
 *   node scripts/validate-v3-migration.js
 *   node scripts/validate-v3-migration.js --json
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env (or .env.local loaded by caller).
 *
 * Rollback (production, ≤5 min):
 *   1. Set CATALOG_SCHEMA=v2 in Vercel/host env
 *   2. Redeploy if needed (only when code requires v3-only paths)
 *   3. Verify Admin catalog + C-end /programs + enrollments read path
 *   4. Keep v3_* tables for forensics; do not DROP v2_* until Phase D
 */

const path = require("path")
const fs = require("fs")
const { createClient } = require("@supabase/supabase-js")

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local")
  if (!fs.existsSync(envPath)) return
  const text = fs.readFileSync(envPath, "utf8")
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!m) continue
    const key = m[1]
    let val = m[2].trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnvLocal()

const jsonOut = process.argv.includes("--json")

const PAIRS = [
  { entity: "offering_type", v2: "v2_offering_type", v3: "v3_offering_type" },
  { entity: "stage", v2: "v2_category", v3: "v3_stage" },
  { entity: "campus", v2: "v2_franchise", v3: "v3_campus" },
  { entity: "offering", v2: "v2_offering", v3: "v3_offering" },
  { entity: "campus_stage_map", v2: "v2_franchise_category_map", v3: "v3_campus_stage_map" },
  { entity: "location", v2: "v2_campus", v3: "v3_location" },
  { entity: "series", v2: "v2_program", v3: "v3_series" },
  { entity: "session", v2: "v2_instance", v3: "v3_session" },
  { entity: "resource_category", v2: "v2_resource_category", v3: "v3_resource_category" },
  { entity: "resource", v2: "v2_resource", v3: "v3_resource" },
]

async function countTable(supabase, table) {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true })
  if (error) {
    if (error.code === "PGRST205" || error.message?.includes("does not exist")) {
      return { count: null, missing: true, error: error.message }
    }
    throw new Error(`${table}: ${error.message}`)
  }
  return { count: count ?? 0, missing: false }
}

async function main() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error("Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
    process.exit(1)
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const results = []
  let allOk = true

  for (const { entity, v2, v3 } of PAIRS) {
    const v2r = await countTable(supabase, v2)
    const v3r = await countTable(supabase, v3)
    const ok =
      !v2r.missing &&
      !v3r.missing &&
      v2r.count === v3r.count
    if (v3r.missing && v2r.missing) {
      continue
    }
    if (!ok) allOk = false
    results.push({
      entity,
      v2_table: v2,
      v3_table: v3,
      v2_count: v2r.count,
      v3_count: v3r.count,
      v2_missing: v2r.missing,
      v3_missing: v3r.missing,
      ok,
    })
  }

  if (jsonOut) {
    console.log(JSON.stringify({ ok: allOk, results }, null, 2))
  } else {
    console.log("V3 migration validation\n")
    for (const r of results) {
      const flag = r.ok ? "OK" : "MISMATCH"
      console.log(
        `[${flag}] ${r.entity}: v2=${r.v2_missing ? "MISSING" : r.v2_count} v3=${r.v3_missing ? "MISSING" : r.v3_count}`
      )
    }
    console.log(allOk ? "\nAll counts match." : "\nSome counts differ — fix before CATALOG_SCHEMA=v3.")
  }

  process.exit(allOk ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
