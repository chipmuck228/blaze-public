#!/usr/bin/env node

/**
 * Export v2_instance rows to schema-driven CSV (+ companion manifest).
 *
 * Usage:
 *   node scripts/export-instances.js --type camp [--out path.csv] [--status scheduled] [--location bellevue]
 *   node scripts/export-instances.js --type camp --write-template
 */

const {
  loadEnv,
  parseExportArgs,
  exportInstancesForType,
} = require("./lib/import-instances-common")

async function main() {
  loadEnv()
  const args = parseExportArgs(process.argv)

  if (args.typeCode === "unified" || args.typeCode === "all") {
    console.error(
      "Unified wide-table export has been removed. Export each offering type separately, e.g. --type camp, --type course."
    )
    console.error("See scripts/design/instance-csv-import.md")
    process.exit(1)
  }

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

  console.log("Export instances → CSV (schema)")
  console.log("=".repeat(60))
  console.log(`Type: ${args.typeCode}`)
  console.log(`Output: ${args.out}`)
  if (args.status) console.log(`Status filter: ${args.status}`)
  if (args.location) console.log(`Location filter: ${args.location}`)
  console.log(`Mode: ${args.writeTemplate ? "write-template" : "export"}`)
  console.log("")

  const result = await exportInstancesForType(supabase, args.typeCode, {
    out: args.out,
    writeTemplate: args.writeTemplate,
    status: args.status,
    location: args.location,
  })

  if (!args.writeTemplate) {
    console.log(`Exported ${result.rowCount} instance(s)`)
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
