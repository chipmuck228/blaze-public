#!/usr/bin/env node

/**
 * Unified camp + course instance import into v2_instance.
 *
 * Default file: Blaze-Instances-Unified.csv (OneDrive Blaze directory)
 *
 * Usage:
 *   node scripts/import-instances.js --dry-run [--file <path>] [--type all|camp|course]
 *   node scripts/import-instances.js --execute [--file <path>] [--publish-referenced-offerings]
 *   node scripts/import-instances.js --execute --allow-draft-offering [--file <path>]
 *   node scripts/import-instances.js --dry-run --allow-file-duplicates [--file <path>]
 *   node scripts/import-instances.js --execute --replace-all --allow-file-duplicates [--file <path>]
 *   node scripts/import-instances.js --audit
 */

const fs = require("fs")
const path = require("path")

const {
  loadEnv,
  parseArgs,
  parseSpreadsheet,
  rowsToObjects,
  getCategoryLabel,
  getActivityLabel,
  getSessionTitle,
  rowHasIdentity,
  rowIsEmpty,
  preflight,
  resolveRow,
  buildUpdatePayload,
  diffDbRow,
  snapshotInstance,
  scanFileDuplicates,
  publishOffering,
  ensureProgramsForRows,
  classifyError,
  writeReport,
  auditInstancesIntegrity,
  deleteAllInstances,
  ERROR_CODES,
} = require("./lib/import-instances-common")

function normalizeKey(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

async function main() {
  loadEnv()
  const args = parseArgs(process.argv)
  const startedAt = new Date().toISOString()
  const consoleLines = []

  const log = (...parts) => {
    const line = parts.join(" ")
    console.log(...parts)
    consoleLines.push(line)
  }
  const logErr = (...parts) => {
    const line = parts.join(" ")
    console.error(...parts)
    consoleLines.push(line)
  }

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

  log("Import instances (unified camp + course) → v2_instance")
  log("=".repeat(60))
  log(`Mode: ${args.dryRun ? "DRY RUN" : "EXECUTE"}`)
  log(`File: ${args.file}`)
  log(`Type filter: ${args.typeFilter}`)
  log(`Supabase: ${supabaseUrl}`)
  if (args.publishReferencedOfferings) log("Will publish draft offerings referenced in file")
  if (args.replaceAll) log(`Replace all: ${args.dryRun ? "DRY RUN (would delete all instances first)" : "DELETE all v2_instance then INSERT"}`)
  if (args.insertOnly && !args.replaceAll) log("Insert-only mode (skip UPDATE)")
  log("")

  if (args.audit) {
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

  const auditBefore = await auditInstancesIntegrity(supabase)
  log(`Pre-import audit: ${auditBefore.total_instances} instances, ${auditBefore.mismatch_count} category mismatch(es)`)
  log("")

  const tableRows = parseSpreadsheet(args.file)
  const allRows = rowsToObjects(tableRows, { requireCategory: true })

  let ctx = await preflight(supabase)
  const programsCreated = await ensureProgramsForRows(supabase, allRows, ctx, {
    execute: args.execute,
    log,
  })
  if (programsCreated) {
    ctx = await preflight(supabase)
    log("Reloaded preflight after ensuring programs")
    log("")
  }
  log("Preflight loaded:")
  log(`  offering_types: ${ctx.preflightCounts.offering_types}`)
  log(`  franchises: ${ctx.preflightCounts.franchises}`)
  log(`  categories: ${ctx.preflightCounts.categories}`)
  log(`  programs: ${ctx.preflightCounts.programs}`)
  log(`  offerings: ${ctx.preflightCounts.offerings}`)
  log(`  campuses: ${ctx.preflightCounts.campuses}`)
  log(`  instances: ${ctx.preflightCounts.instances}`)
  log("")

  if (args.replaceAll) {
    if (args.execute) {
      const { deleted } = await deleteAllInstances(supabase)
      log(`Deleted ${deleted} instance(s) (--replace-all)`)
      ctx = await preflight(supabase)
      log(`Preflight reloaded: ${ctx.preflightCounts.instances} instances remaining`)
      log("")
    } else {
      log(`Would delete ${ctx.preflightCounts.instances} instance(s) (--replace-all on --execute)`)
      log("")
    }
  }

  const identityRows = allRows.filter((r) => rowHasIdentity(r))
  const emptySkipped = allRows.filter((r) => rowIsEmpty(r)).length
  const partialRows = allRows.filter((r) => !rowIsEmpty(r) && !rowHasIdentity(r))

  if (!identityRows.length && !partialRows.length) {
    console.error("No data rows in file")
    process.exit(1)
  }

  const dupScan = scanFileDuplicates(identityRows, ctx, {
    allowFileDuplicates: args.allowFileDuplicates,
  })

  const report = {
    meta: {
      started_at: startedAt,
      finished_at: null,
      mode: args.dryRun ? "dry-run" : "execute",
      file: args.file,
      supabase_url: supabaseUrl,
      cli: {
        type: args.typeFilter,
        publish_referenced_offerings: args.publishReferencedOfferings,
        allow_draft_offering: args.allowDraftOffering,
        allow_file_duplicates: args.allowFileDuplicates,
        fail_fast: args.failFast,
        replace_all: args.replaceAll,
        insert_only: args.insertOnly,
      },
      rows_total: allRows.length,
      rows_identity: identityRows.length,
      rows_empty_skipped: emptySkipped,
      rows_partial: partialRows.length,
    },
    preflight: ctx.preflightCounts,
    summary: {
      insert: 0,
      update: 0,
      unchanged: 0,
      skipped_empty: emptySkipped,
      skipped_duplicate: 0,
      skipped_type: 0,
      failed: 0,
      draft_blocked: 0,
      published_offerings: 0,
      duplicate_in_file: dupScan.duplicateInFile.length,
    },
    duplicate_in_file: dupScan.duplicateInFile,
    audit_before: {
      total_instances: auditBefore.total_instances,
      mismatch_count: auditBefore.mismatch_count,
    },
    results: [],
    _consoleLines: consoleLines,
  }

  for (const row of allRows.filter((r) => rowIsEmpty(r))) {
    report.results.push({
      row: row._rowNum,
      action: "SKIPPED_EMPTY",
    })
  }

  for (const row of partialRows) {
    report.summary.failed++
    const err = "Partial identity columns — Location Code, Activity (program), and Session Title are required"
    report.results.push({
      row: row._rowNum,
      action: "FAILED",
      error_code: ERROR_CODES.PARSE_ERROR,
      error: err,
    })
    logErr(`[${row._rowNum}] FAILED: ${err}`)
    if (args.failFast) break
  }

  if (dupScan.blocked) {
    logErr("")
    logErr("DUPLICATE_IN_FILE — aborting before row processing:")
    for (const d of dupScan.duplicateInFile) {
      logErr(`  key=${d.natural_key} rows=${d.rows.join(",")}`)
    }
    report.summary.failed += identityRows.length
    report.meta.finished_at = new Date().toISOString()
    const { jsonPath, logPath } = writeReport(path.join(__dirname, "output"), report)
    logErr(`\nReport: ${jsonPath}`)
    logErr(`Log: ${logPath}`)
    process.exit(1)
  }

  const publishedOfferingIds = new Set()
  const skippedDuplicateRows = new Set()

  if (args.allowFileDuplicates) {
    for (const d of dupScan.duplicateInFile) {
      const winner = d.rows[d.rows.length - 1]
      for (const rn of d.rows) {
        if (rn !== winner) skippedDuplicateRows.add(rn)
      }
    }
  }

  rowLoop: for (const row of identityRows) {
    if (skippedDuplicateRows.has(row._rowNum)) {
      report.summary.skipped_duplicate++
      report.results.push({
        row: row._rowNum,
        action: "SKIPPED_DUPLICATE",
        sessionTitle: getSessionTitle(row),
      })
      log(`[${row._rowNum}] SKIPPED_DUPLICATE ${getSessionTitle(row)}`)
      continue
    }

    try {
      const resolved = resolveRow(row, ctx, { requireCategory: true })
      const {
        offering,
        dbRow,
        existing,
        naturalKey: nk,
        offeringTypeCode,
        activityResolved,
        input,
        resolved: resolvedEntities,
      } = resolved

      if (args.typeFilter !== "all" && offeringTypeCode !== args.typeFilter) {
        report.summary.skipped_type++
        report.results.push({
          row: row._rowNum,
          action: "SKIPPED_TYPE",
          offering_type: offeringTypeCode,
          natural_key: nk,
          input,
        })
        continue
      }

      if (activityResolved) {
        logErr(
          `[${row._rowNum}] Activity normalized: "${getActivityLabel(row)}" → "${activityResolved}"`
        )
      }

      if (offering.status !== "published") {
        if (args.publishReferencedOfferings && args.execute) {
          if (!publishedOfferingIds.has(offering.id)) {
            await publishOffering(supabase, offering.id)
            publishedOfferingIds.add(offering.id)
            report.summary.published_offerings++
            offering.status = "published"
          }
        } else if (!args.allowDraftOffering) {
          report.summary.draft_blocked++
          const err = `Offering is "${offering.status}"; use --publish-referenced-offerings on execute or --allow-draft-offering`
          report.results.push({
            row: row._rowNum,
            action: "DRAFT_BLOCKED",
            offering_type: offeringTypeCode,
            natural_key: nk,
            input,
            resolved: resolvedEntities,
            error_code: ERROR_CODES.OFFERING_DRAFT,
            error: err,
          })
          logErr(`[${row._rowNum}] DRAFT_BLOCKED | ${offeringTypeCode} | ${getSessionTitle(row)} | ${err}`)
          if (args.failFast) break rowLoop
          continue
        }
      }

      const catLabel = resolvedEntities.category.name
      const progLabel = resolvedEntities.program.name
      const title = getSessionTitle(row)
      const locPath = `${resolvedEntities.franchise.code}/${catLabel}/${progLabel}`

      const effectiveExisting = args.insertOnly ? null : existing

      if (effectiveExisting) {
        const updatePayload = buildUpdatePayload(dbRow)
        const dbBefore = snapshotInstance(effectiveExisting)
        const changes = diffDbRow(dbBefore, updatePayload)
        const hasChanges = Object.keys(changes).length > 0

        if (!hasChanges) {
          report.summary.unchanged++
          report.results.push({
            row: row._rowNum,
            action: "UNCHANGED",
            offering_type: offeringTypeCode,
            natural_key: nk,
            input,
            resolved: resolvedEntities,
            instance_id: effectiveExisting.id,
            db_before: dbBefore,
          })
          log(
            `[${row._rowNum}] UNCHANGED | ${offeringTypeCode} | ${locPath} | ${title} | ${dbRow.start_date} | id=${effectiveExisting.id}`
          )
          continue
        }

        if (!args.dryRun) {
          const { error } = await supabase.from("v2_instance").update(updatePayload).eq("id", effectiveExisting.id)
          if (error) throw new Error(`Update failed: ${error.message}`)
        }

        report.summary.update++
        const changeSummary = Object.keys(changes).join(", ")
        report.results.push({
          row: row._rowNum,
          action: "UPDATE",
          offering_type: offeringTypeCode,
          natural_key: nk,
          input,
          resolved: resolvedEntities,
          instance_id: effectiveExisting.id,
          db_before: dbBefore,
          db_after: args.dryRun ? updatePayload : { ...dbBefore, ...updatePayload, id: effectiveExisting.id },
          changes,
        })
        log(
          `[${row._rowNum}] UPDATE | ${offeringTypeCode} | ${locPath} | ${title} | ${dbRow.start_date} | id=${effectiveExisting.id} | ${changeSummary}`
        )
      } else {
        if (!args.dryRun) {
          const { data, error } = await supabase.from("v2_instance").insert(dbRow).select("id").single()
          if (error) throw new Error(`Insert failed: ${error.message}`)
          ctx.instanceByNaturalKey.set(nk, { id: data.id, ...dbRow })
          report.results.push({
            row: row._rowNum,
            action: "INSERT",
            offering_type: offeringTypeCode,
            natural_key: nk,
            input,
            resolved: resolvedEntities,
            instance_id: data.id,
            db_after: dbRow,
          })
          log(
            `[${row._rowNum}] INSERT | ${offeringTypeCode} | ${locPath} | ${title} | ${dbRow.start_date} | id=${data.id}`
          )
        } else {
          report.results.push({
            row: row._rowNum,
            action: "INSERT",
            offering_type: offeringTypeCode,
            natural_key: nk,
            input,
            resolved: resolvedEntities,
            instance_id: null,
            db_after: dbRow,
          })
          log(
            `[${row._rowNum}] INSERT | ${offeringTypeCode} | ${locPath} | ${title} | ${dbRow.start_date}`
          )
        }
        report.summary.insert++
      }
    } catch (err) {
      report.summary.failed++
      const errorCode = classifyError(err)
      report.results.push({
        row: row._rowNum,
        action: "FAILED",
        offering_type: null,
        input: {
          locationCode: row["Location Code"],
          category: getCategoryLabel(row),
          activity: getActivityLabel(row),
          sessionTitle: getSessionTitle(row),
          campus: row.Campus,
          startDate: row["Start Date"],
        },
        error_code: errorCode,
        error: err.message,
        hint: err.hint,
      })
      logErr(
        `[${row._rowNum}] FAILED | ? | ${row["Location Code"]}/${getCategoryLabel(row)} | ${getSessionTitle(row)} | ${errorCode} | ${err.message}`
      )
      if (args.failFast) break
    }
  }

  const elapsed = ((Date.now() - new Date(startedAt).getTime()) / 1000).toFixed(1)
  report.meta.finished_at = new Date().toISOString()
  report.meta.elapsed_seconds = Number(elapsed)

  if (args.execute && report.summary.failed === 0) {
    const auditAfter = await auditInstancesIntegrity(supabase)
    report.audit_after = {
      total_instances: auditAfter.total_instances,
      mismatch_count: auditAfter.mismatch_count,
      mismatches: auditAfter.mismatches.slice(0, 50),
    }
    log("")
    log(
      `Post-import audit: ${auditAfter.total_instances} instances, ${auditAfter.mismatch_count} category mismatch(es)`
    )
    if (auditAfter.mismatch_count > 0) {
      for (const m of auditAfter.mismatches.slice(0, 10)) {
        logErr(
          `  MISMATCH ${m.instance_id} | program=${m.program_category} | offering=${m.offering_category} | ${m.offering_name}`
        )
      }
    }
  }

  log("")
  log("Summary:", JSON.stringify(report.summary))
  log(`Elapsed: ${elapsed}s`)

  const { jsonPath, logPath } = writeReport(path.join(__dirname, "output"), report)
  log(`Report: ${jsonPath}`)
  log(`Log: ${logPath}`)

  if (report.summary.failed > 0) {
    logErr("")
    logErr(`*** ${report.summary.failed} row(s) FAILED — see ${jsonPath}`)
  }
  if (report.summary.draft_blocked > 0 && !args.allowDraftOffering) {
    logErr(`*** ${report.summary.draft_blocked} row(s) DRAFT_BLOCKED — use --publish-referenced-offerings or --allow-draft-offering`)
  }

  if (
    report.summary.failed > 0 ||
    (report.summary.draft_blocked > 0 && !args.allowDraftOffering && args.dryRun) ||
    (report.audit_after && report.audit_after.mismatch_count > 0)
  ) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error("Fatal:", err.message)
  process.exit(1)
})
