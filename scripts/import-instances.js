#!/usr/bin/env node

/**
 * Import v2_instance from schema-driven per-type CSV (+ companion -schema.json manifest).
 *
 * Usage:
 *   node scripts/import-instances.js --type camp --file scripts/output/Blaze-Instances-camp.csv
 *   node scripts/import-instances.js --type camp --file ... --execute
 *   node scripts/import-instances.js --audit
 */

const fs = require("fs")
const path = require("path")

const {
  loadEnv,
  parseArgs,
  parseSpreadsheet,
  processSchemaImportRow,
  rowsToSchemaObjects,
  schemaRowIsEmpty,
  defaultInstanceManifestPath,
  loadManifest,
  detectSchemaDrift,
  scanSchemaFileDuplicates,
  preflightForType,
  resolveRow,
  publishOffering,
  classifyError,
  writeSchemaReport,
  auditInstancesIntegrity,
  bootstrapMissingSeries,
  deleteAllInstances,
} = require("./lib/import-instances-common")
const { tables } = require("./lib/catalog-db")

const DEPRECATED_TYPES = new Set(["unified", "all"])

async function runAudit(supabase, { log, logErr }) {
  const audit = await auditInstancesIntegrity(supabase)
  log("Instance integrity audit")
  log("=".repeat(60))
  log(`Total instances: ${audit.total_instances}`)
  log(`Category mismatches: ${audit.mismatch_count}`)
  if (audit.mismatch_count > 0) {
    log("")
    for (const m of audit.mismatches.slice(0, 20)) {
      log(
        `  ${m.instance_id} | program=${m.program_category} | offering=${m.offering_category} | ${m.offering_name}`
      )
    }
    if (audit.mismatch_count > 20) log(`  ... and ${audit.mismatch_count - 20} more`)
  }
  process.exit(audit.mismatch_count > 0 ? 1 : 0)
}

async function runSchemaImport(supabase, args, { log, logErr }) {
  const typeCode = args.typeCode
  const startedAt = new Date().toISOString()

  log(`Import instances (schema) → ${tables().session}`)
  log("=".repeat(60))
  log(`Mode: ${args.dryRun ? "DRY RUN" : "EXECUTE"}`)
  log(`Type: ${typeCode}`)
  log(`File: ${args.file}`)
  log(`Supabase: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`)
  if (args.publishReferencedOfferings) log("Will publish draft offerings referenced in file")
  if (args.replaceAll) {
    log(
      `Replace all: ${args.dryRun ? "DRY RUN (would delete all instances first)" : "DELETE all v2_instance then INSERT"}`
    )
  }
  if (args.insertOnly && !args.replaceAll) log("Insert-only mode (skip UPDATE)")
  log("")

  let ctx = await preflightForType(supabase, typeCode)
  log(`offering_type_id: ${ctx.offeringType.id}`)
  log(`Schema columns: ${ctx.schemaColumns.length}`)
  log(`Schema hash (DB): ${ctx.manifest.schema_hash}`)
  log(`Instances (type): ${ctx.instancesById.size}`)
  log("")

  if (args.replaceAll) {
    if (args.execute) {
      const { deleted } = await deleteAllInstances(supabase)
      log(`Deleted ${deleted} instance(s) (--replace-all)`)
      ctx = await preflightForType(supabase, typeCode)
      log(`Preflight reloaded: ${ctx.instancesById.size} instances for type`)
      log("")
    } else {
      log(`Would delete all v2_instance rows (--replace-all on --execute)`)
      log("")
    }
  }

  const manifestPath = args.manifest || defaultInstanceManifestPath(args.file)
  if (!fs.existsSync(manifestPath)) {
    console.error(`Schema manifest not found: ${manifestPath}`)
    console.error("Export with export-instances.js --type <code> or copy *-schema.json beside the CSV.")
    process.exit(1)
  }

  const fileManifest = loadManifest(manifestPath)
  const driftWarnings = detectSchemaDrift(fileManifest, ctx.manifest)
  if (driftWarnings.length) {
    logErr("Schema drift warnings:")
    for (const w of driftWarnings) {
      logErr(`  [${w.code}] ${w.message}`)
    }
    log("")
  }

  const tableRows = parseSpreadsheet(args.file)
  const allRows = rowsToSchemaObjects(tableRows).filter((r) => !schemaRowIsEmpty(r))

  if (!allRows.length) {
    console.error("No data rows in file")
    process.exit(1)
  }

  const seriesBootstrap = await bootstrapMissingSeries(supabase, ctx, allRows, {
    dryRun: args.dryRun,
  })
  if (seriesBootstrap.created) {
    log(
      `Series bootstrap: ${seriesBootstrap.created} missing v3_series ${args.dryRun ? "staged (dry-run)" : "created"}, ${seriesBootstrap.skipped} already existed`
    )
    log("")
  }

  const fileDups = scanSchemaFileDuplicates(allRows, ctx)
  if (fileDups.length && !args.allowFileDuplicates) {
    logErr("Duplicate rows in file:")
    for (const d of fileDups) {
      logErr(`  key=${d.key} rows=${d.rows.join(",")}`)
    }
    process.exit(1)
  }

  const report = {
    mode: args.dryRun ? "dry-run" : "execute",
    type: typeCode,
    file: args.file,
    manifest: manifestPath,
    offering_type_id: ctx.offeringType.id,
    schema_hash: ctx.manifest.schema_hash,
    drift_warnings: driftWarnings,
    summary: {
      insert: 0,
      update: 0,
      unchanged: 0,
      skipped: 0,
      failed: 0,
      draft_blocked: 0,
      published_offerings: 0,
    },
    results: [],
  }

  const opts = {
    dryRun: args.dryRun,
    insertOnly: args.insertOnly || args.replaceAll,
    allowDraftOffering: args.allowDraftOffering,
    publishReferencedOfferings: args.publishReferencedOfferings,
  }

  const publishedOfferingIds = new Set()

  for (const row of allRows) {
    try {
      if (opts.publishReferencedOfferings && args.execute) {
        const resolved = resolveRow(row, ctx, { requireCategory: true })
        const { offering } = resolved
        if (offering.status !== "published" && !publishedOfferingIds.has(offering.id)) {
          await publishOffering(supabase, offering.id)
          publishedOfferingIds.add(offering.id)
          report.summary.published_offerings++
          offering.status = "published"
        }
      }

      const result = await processSchemaImportRow(supabase, ctx, row, opts)
      const action = result.action
      if (action === "INSERT") report.summary.insert++
      else if (action === "UPDATE") report.summary.update++
      else if (action === "UNCHANGED") report.summary.unchanged++
      else if (action === "SKIPPED") report.summary.skipped++
      else if (action === "DRAFT_BLOCKED") report.summary.draft_blocked++

      report.results.push({
        row: row._rowNum,
        sessionTitle: row["Session Title"],
        action,
        id: result.id || null,
        natural_key: result.naturalKey || null,
        error: result.reason || null,
      })

      const suffix = result.id ? ` id=${result.id}` : ""
      log(
        `[${row._rowNum}] ${action} ${row["Session Title"]} (${row["Programs (category)"]})${suffix}` +
          (result.reason ? ` — ${result.reason}` : "")
      )
    } catch (err) {
      report.summary.failed++
      report.results.push({
        row: row._rowNum,
        sessionTitle: row["Session Title"] || "(no title)",
        action: "FAILED",
        error: err.message,
        error_code: classifyError(err),
      })
      logErr(`[${row._rowNum}] FAILED: ${err.message}`)
      if (args.failFast) break
    }
  }

  report.started_at = startedAt
  report.finished_at = new Date().toISOString()

  log("")
  log("Summary:", JSON.stringify(report.summary))

  const jsonPath = writeSchemaReport(path.join(__dirname, "output"), typeCode, report)
  log(`Report: ${jsonPath}`)

  if (report.summary.failed > 0 || (report.summary.draft_blocked > 0 && !args.allowDraftOffering)) {
    process.exit(1)
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

  const { createClient } = require("@supabase/supabase-js")
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const log = (...parts) => console.log(...parts)
  const logErr = (...parts) => console.error(...parts)

  if (args.audit) {
    await runAudit(supabase, { log, logErr })
    return
  }

  if (!args.typeCode) {
    console.error("--type is required (e.g. --type camp). Use --audit for integrity check only.")
    process.exit(1)
  }

  if (DEPRECATED_TYPES.has(args.typeCode)) {
    console.error(
      `Unified wide-table import (--type ${args.typeCode}) has been removed. Use schema mode per offering type.`
    )
    console.error("See scripts/design/instance-csv-import.md")
    process.exit(1)
  }

  if (!args.file) {
    console.error("--file is required")
    process.exit(1)
  }

  if (!fs.existsSync(args.file)) {
    console.error(`File not found: ${args.file}`)
    process.exit(1)
  }

  await runSchemaImport(supabase, args, { log, logErr })
}

main().catch((err) => {
  console.error("Fatal:", err.message)
  process.exit(1)
})
