#!/usr/bin/env node
/**
 * Probe v3_campus / v3_series for poster_url columns (PostgREST).
 * If missing, prints v3/16_v3_poster_url_columns.sql for Supabase SQL Editor.
 *
 * Usage: node scripts/check-v3-poster-columns.js
 */

const path = require("path")
const fs = require("fs")
const { createClient } = require("@supabase/supabase-js")

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local")
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!m) continue
    let val = m[2].trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[m[1]]) process.env[m[1]] = val
  }
}

loadEnvLocal()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(url, key)

async function probe(table, column) {
  const { error } = await supabase.from(table).select(column).limit(1)
  if (!error) return { ok: true }
  const msg = error.message || String(error)
  if (/does not exist/i.test(msg)) return { ok: false, message: msg }
  return { ok: true, message: msg }
}

async function main() {
  const checks = [
    ["v3_campus", "poster_url"],
    ["v3_series", "poster_url"],
    ["v3_series", "featured"],
    ["v3_session", "is_course_type"],
    ["v3_session", "portal_service_role"],
  ]

  let allOk = true
  for (const [table, col] of checks) {
    const r = await probe(table, col)
    const status = r.ok ? "OK" : "MISSING"
    console.log(`${status}  ${table}.${col}${r.message && !r.ok ? ` — ${r.message}` : ""}`)
    if (!r.ok) allOk = false
  }

  if (allOk) {
    console.log("\nAll v3 poster columns present.")
    process.exit(0)
  }

  const sqlPaths = [
    path.join(__dirname, "..", "v3", "16_v3_poster_url_columns.sql"),
    path.join(__dirname, "..", "v3", "17_v3_session_portal_columns.sql"),
  ]
  console.log("\nRun these files in Supabase Dashboard → SQL Editor:\n")
  for (const sqlPath of sqlPaths) {
    console.log(`  ${sqlPath}`)
    if (fs.existsSync(sqlPath)) {
      console.log("--- copy below ---")
      console.log(fs.readFileSync(sqlPath, "utf8"))
      console.log("--- end ---")
    }
  }
  process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
