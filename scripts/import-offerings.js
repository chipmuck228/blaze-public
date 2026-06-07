#!/usr/bin/env node

/**
 * Import v2_offering rows from schema-driven CSV.
 *
 * Usage:
 *   node scripts/import-offerings.js --type camp --file Blaze-Offerings-camp.csv [--dry-run]
 *   node scripts/import-offerings.js --type camp --file ... --execute
 *   node scripts/import-offerings.js --type camp --file ... --execute --insert-only
 */

const fs = require("fs")
const path = require("path")
const {
  loadEnv,
  parseImportArgs,
  defaultManifestPath,
  parseSpreadsheet,
  rowsToObjects,
  rowIsEmpty,
  rowTitle,
  preflight,
  processImportRow,
  detectSchemaDrift,
  loadManifest,
  scanFileDuplicates,
  writeReport,
  ERROR_CODES,
} = require("./lib/import-offerings-common")
const { tables } = require("./lib/catalog-db")

async function main() {
  loadEnv()
  const args = parseImportArgs(process.argv)

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

  console.log(`Import offerings → ${tables().offering}`)
  console.log("=".repeat(60))
  console.log(`Mode: ${args.dryRun ? "DRY RUN" : "EXECUTE"}`)
  console.log(`Type: ${args.typeCode}`)
  console.log(`File: ${args.file}`)
  if (args.insertOnly) console.log("Scope: insert-only")
  console.log("")

  const ctx = await preflight(supabase, args.typeCode)
  console.log(`offering_type_id: ${ctx.offeringType.id}`)
  console.log(`Schema columns: ${ctx.schemaColumns.length}`)
  console.log(`Schema hash (DB): ${ctx.manifest.schema_hash}`)
  console.log("")

  const manifestPath = args.manifest || defaultManifestPath(args.file)
  const fileManifest = loadManifest(manifestPath)
  const driftWarnings = detectSchemaDrift(fileManifest, ctx.manifest)
  if (driftWarnings.length) {
    console.warn("Schema drift warnings:")
    for (const w of driftWarnings) {
      console.warn(`  [${w.code}] ${w.message}`)
    }
    console.warn("")
  }

  const tableRows = parseSpreadsheet(args.file)
  const allRows = rowsToObjects(tableRows).filter((r) => !rowIsEmpty(r))

  if (!allRows.length) {
    console.error("No data rows in file")
    process.exit(1)
  }

  const fileDups = scanFileDuplicates(allRows, args.typeCode)
  if (fileDups.length) {
    console.error("Duplicate rows in file:")
    for (const d of fileDups) {
      console.error(`  Row ${d.row} duplicates row ${d.firstRow} (${d.key})`)
    }
    process.exit(1)
  }

  const report = {
    mode: args.dryRun ? "dry-run" : "execute",
    type: args.typeCode,
    file: args.file,
    manifest: manifestPath,
    offering_type_id: ctx.offeringType.id,
    schema_hash: ctx.manifest.schema_hash,
    drift_warnings: driftWarnings,
    summary: { insert: 0, update: 0, unchanged: 0, skipped: 0, failed: 0 },
    results: [],
  }

  const opts = {
    dryRun: args.dryRun,
    insertOnly: args.insertOnly,
    includeArchived: args.includeArchived,
  }

  for (const row of allRows) {
    const rowNum = row._rowNum
    try {
      const result = await processImportRow(supabase, ctx, row, opts)
      const action = result.action
      if (action === "INSERT") report.summary.insert++
      else if (action === "UPDATE") report.summary.update++
      else if (action === "UNCHANGED") report.summary.unchanged++
      else if (action === "SKIPPED") report.summary.skipped++

      const programTag = row["Program (tag)"] || ""
      const displayTitle = rowTitle(row)
      report.results.push({
        row: rowNum,
        name: displayTitle,
        program: programTag || null,
        action,
        id: result.id || null,
        slug: result.slug || null,
        reason: result.reason || null,
      })

      const suffix =
        result.id ? ` id=${result.id}` : result.slug ? ` slug=${result.slug}` : ""
      const programSuffix = programTag ? ` (${programTag})` : ""
      console.log(
        `[${rowNum}] ${action} ${displayTitle}${programSuffix}${suffix}` +
          (result.reason ? ` — ${result.reason}` : "")
      )
    } catch (err) {
      report.summary.failed++
      report.results.push({
        row: rowNum,
        name: row.Title || "(no title)",
        action: "FAILED",
        error: err.message,
        code: err.code || ERROR_CODES.PARSE_ERROR,
      })
      console.error(`[${rowNum}] FAILED: ${err.message}`)
    }
  }

  console.log("")
  console.log("Summary:", report.summary)

  const logPath = writeReport("import-offerings", args.typeCode, report)
  console.log(`Report: ${logPath}`)

  if (report.summary.failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error("Fatal:", err.message)
  process.exit(1)
})
