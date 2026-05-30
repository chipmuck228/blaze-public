#!/usr/bin/env node
/**
 * Apply newsletter Resend columns via Supabase service role (PostgREST cannot run DDL).
 * Run the SQL in Supabase Dashboard → SQL Editor if this script cannot apply DDL:
 *   sql/root-migrations/migrate-newsletter-resend.sql
 */

const fs = require("fs")
const path = require("path")
const { createClient } = require("@supabase/supabase-js")

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local")
  if (!fs.existsSync(envPath)) return
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .forEach((line) => {
      const match = line.match(/^([^=:#]+)=(.*)$/)
      if (!match) return
      let value = match[2].trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      process.env[match[1].trim()] = value
    })
}

loadEnv()

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error("Missing Supabase env vars")
    process.exit(1)
  }

  const supabase = createClient(url, key)
  const { error } = await supabase
    .from("newsletter_subscribers")
    .select("resend_contact_id")
    .limit(1)

  if (!error) {
    console.log("Migration already applied (resend_contact_id exists).")
    return
  }

  if (!error.message.includes("resend_contact_id")) {
    console.error("Unexpected error:", error.message)
    process.exit(1)
  }

  console.log(
    "Column missing. Apply manually in Supabase SQL Editor:\n  sql/root-migrations/migrate-newsletter-resend.sql"
  )
  process.exit(1)
}

main()
