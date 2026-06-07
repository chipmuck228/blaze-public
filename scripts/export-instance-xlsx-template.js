#!/usr/bin/env node

/**
 * Export v3_session rows to schema-driven xlsx with lookup dropdowns and column protection.
 *
 * Usage:
 *   CATALOG_SCHEMA=v3 node scripts/export-instance-xlsx-template.js --type camp
 *   CATALOG_SCHEMA=v3 node scripts/export-instance-xlsx-template.js --type camp --out path.xlsx
 *   CATALOG_SCHEMA=v3 node scripts/export-instance-xlsx-template.js --type camp --campus bellevue
 */

const fs = require("fs")
const path = require("path")
const { isCatalogV3 } = require("./lib/catalog-db")
const {
  loadEnv,
  preflightForType,
  loadSessionsForExport,
  defaultInstanceManifestPath,
} = require("./lib/import-instances-common")
const {
  exportOperatorHeaders,
  fetchLookupLists,
  getDropdownConfig,
  instanceToOperatorRow,
  writeInstanceXlsxTemplate,
} = require("./lib/instance-xlsx-template")

function defaultInstanceXlsxPath(typeCode) {
  return path.join(__dirname, "output", `Blaze-Instances-${typeCode}.xlsx`)
}

function parseXlsxExportArgs(argv) {
  const args = {
    typeCode: null,
    out: null,
    status: null,
    location: null,
  }

  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--type" && argv[i + 1]) {
      args.typeCode = argv[++i].trim().toLowerCase()
    } else if (argv[i] === "--out" && argv[i + 1]) {
      args.out = argv[++i]
    } else if (argv[i] === "--status" && argv[i + 1]) {
      args.status = argv[++i].trim().toLowerCase()
    } else if ((argv[i] === "--location" || argv[i] === "--campus") && argv[i + 1]) {
      args.location = argv[++i].trim().toLowerCase()
    }
  }

  if (!args.typeCode) {
    throw new Error("--type is required (e.g. --type camp)")
  }
  if (!args.out) {
    args.out = defaultInstanceXlsxPath(args.typeCode)
  }
  return args
}

function ensureDirForFile(filePath) {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

async function main() {
  loadEnv()
  const args = parseXlsxExportArgs(process.argv)

  if (!isCatalogV3()) {
    console.warn("[export-instance-xlsx-template] CATALOG_SCHEMA is not v3; xlsx template is intended for v3 catalog.")
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

  console.log("Export instances → XLSX template")
  console.log("=".repeat(60))
  console.log(`Type: ${args.typeCode}`)
  console.log(`Output: ${args.out}`)
  if (args.status) console.log(`Status filter: ${args.status}`)
  if (args.location) console.log(`Campus filter: ${args.location}`)
  console.log("")

  const ctx = await preflightForType(supabase, args.typeCode)
  const headers = exportOperatorHeaders(ctx.schemaColumns)
  const lookups = fetchLookupLists(ctx)
  const dropdownConfig = getDropdownConfig(args.typeCode, ctx.schemaColumns)

  const instances = await loadSessionsForExport(supabase, ctx, {
    status: args.status,
    location: args.location,
  })
  const rows = instances.map((inst) => instanceToOperatorRow(inst, ctx.schemaColumns))

  ensureDirForFile(args.out)
  await writeInstanceXlsxTemplate({
    headers,
    rows,
    lookups,
    dropdownConfig,
    outPath: args.out,
  })

  const manifestPath = defaultInstanceManifestPath(args.out)
  ensureDirForFile(manifestPath)
  fs.writeFileSync(manifestPath, JSON.stringify(ctx.manifest, null, 2) + "\n", "utf8")

  console.log(`Exported ${rows.length} instance row(s)`)
  console.log(`XLSX: ${args.out}`)
  console.log(`Manifest: ${manifestPath}`)
  console.log(`Schema hash: ${ctx.manifest.schema_hash}`)
  console.log(`Dynamic columns: ${ctx.schemaColumns.length}`)
  console.log(
    `Lookups: campus=${lookups.campus_codes.length}, stage=${lookups.stage_names.length}, series=${lookups.series_names.length}, location=${lookups.location_names.length}`
  )
}

main().catch((err) => {
  console.error("Fatal:", err.message)
  process.exit(1)
})
