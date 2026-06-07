#!/usr/bin/env node

/**
 * Export v2_offering rows to schema-driven CSV (+ companion manifest).
 *
 * Usage:
 *   node scripts/export-offerings.js --type camp [--out path.csv] [--status published]
 *   node scripts/export-offerings.js --type camp --write-template
 */

const {
  loadEnv,
  parseExportArgs,
  exportOfferingsForType,
} = require("./lib/import-offerings-common")

async function main() {
  loadEnv()
  const args = parseExportArgs(process.argv)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
    process.exit(1)
  }

  const { createClient } = require("@supabase/supabase-js")
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log("Export offerings → CSV")
  console.log("=".repeat(60))
  console.log(`Type: ${args.typeCode}`)
  console.log(`Output: ${args.out}`)
  if (args.status) console.log(`Status filter: ${args.status}`)
  console.log(`Mode: ${args.writeTemplate ? "write-template" : "export"}`)
  console.log("")

  const result = await exportOfferingsForType(supabase, args.typeCode, {
    out: args.out,
    writeTemplate: args.writeTemplate,
    status: args.status,
  })

  if (!args.writeTemplate) {
    console.log(`Exported ${result.rowCount} offering(s)`)
  }

  console.log(`CSV: ${result.csvPath}`)
  console.log(`Manifest: ${result.manifestPath}`)
  console.log(`Schema hash: ${result.schemaHash}`)
  console.log(`Dynamic columns: ${result.schemaColumnCount}`)
}

main().catch((err) => {
  console.error("Fatal:", err.message)
  process.exit(1)
})
