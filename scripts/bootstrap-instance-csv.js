#!/usr/bin/env node

/**
 * Bootstrap CSV templates and dry-run verification for all active offering types (instances).
 *
 * Usage:
 *   node scripts/bootstrap-instance-csv.js
 *   node scripts/bootstrap-instance-csv.js --templates-only
 *   node scripts/bootstrap-instance-csv.js --verify-only
 *   node scripts/bootstrap-instance-csv.js --list
 */

const fs = require("fs")
const path = require("path")
const {
  computeSchemaHash,
} = require("./lib/csv-schema-utils")
const {
  loadEnv,
  loadActiveOfferingTypes,
  countInstancesForType,
  exportInstancesForType,
  dryRunSchemaImportFromFile,
  resolveInstanceVerifyStatus,
  buildInstanceInventoryMarkdownRows,
  patchInstanceTypesDoc,
  templateInstanceCsvPath,
} = require("./lib/import-instances-common")

const DESIGN_DOC = path.join(__dirname, "design", "instance-csv-import.md")
const OUTPUT_DIR = path.join(__dirname, "output")
const BOOTSTRAP_DIR = path.join(OUTPUT_DIR, "bootstrap")

function parseBootstrapArgs(argv) {
  const args = {
    templatesOnly: false,
    verifyOnly: false,
    list: false,
    patchDoc: true,
  }
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--templates-only") args.templatesOnly = true
    else if (argv[i] === "--verify-only") args.verifyOnly = true
    else if (argv[i] === "--list") args.list = true
    else if (argv[i] === "--no-patch-doc") args.patchDoc = false
  }
  return args
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

async function main() {
  loadEnv()
  const args = parseBootstrapArgs(process.argv)

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

  const types = await loadActiveOfferingTypes(supabase)

  if (args.list) {
    console.log("Active offering types (instance CSV):")
    for (const t of types) {
      const count = await countInstancesForType(supabase, t.id)
      console.log(`  ${t.code}\t${t.name}\t(${count} instances)`)
    }
    return
  }

  console.log("Bootstrap instance CSV templates & verification")
  console.log("=".repeat(60))
  console.log(`Active types: ${types.length}`)
  console.log(`Mode: ${args.templatesOnly ? "templates-only" : args.verifyOnly ? "verify-only" : "full"}`)
  console.log("")

  ensureDir(OUTPUT_DIR)
  ensureDir(BOOTSTRAP_DIR)

  const inventory = []
  const typeReports = []
  let hasFailure = false

  for (const offeringType of types) {
    const code = offeringType.code
    console.log(`--- ${code} (${offeringType.name}) ---`)

    const instanceCount = await countInstancesForType(supabase, offeringType.id)
    const templatePath = templateInstanceCsvPath(code)
    const exportPath = path.join(BOOTSTRAP_DIR, `Blaze-Instances-${code}.csv`)
    let verifyResult = null
    let verifyStatus = "skipped_no_data"

    try {
      if (!args.verifyOnly) {
        const templateResult = await exportInstancesForType(supabase, code, {
          out: templatePath,
          writeTemplate: true,
        })
        console.log(`  Template: ${templateResult.csvPath} (${templateResult.schemaColumnCount} dynamic cols)`)
      }

      if (!args.templatesOnly && instanceCount > 0) {
        const exportResult = await exportInstancesForType(supabase, code, {
          out: exportPath,
          writeTemplate: false,
        })
        console.log(`  Export: ${exportResult.rowCount} row(s) → ${exportResult.csvPath}`)

        verifyResult = await dryRunSchemaImportFromFile(supabase, code, exportPath)
        verifyStatus = resolveInstanceVerifyStatus(verifyResult.summary, instanceCount)
        console.log(
          `  Dry-run: unchanged=${verifyResult.summary.unchanged} update=${verifyResult.summary.update} failed=${verifyResult.summary.failed} → ${verifyStatus}`
        )
        if (verifyResult.driftWarnings?.length) {
          for (const w of verifyResult.driftWarnings) {
            console.warn(`  [drift] ${w.message}`)
          }
        }
        if (verifyStatus === "fail") hasFailure = true
      } else if (!args.templatesOnly && instanceCount === 0) {
        console.log("  Verify: skipped (no instances)")
      }
    } catch (err) {
      verifyStatus = "fail"
      hasFailure = true
      console.error(`  ERROR: ${err.message}`)
      typeReports.push({ code, error: err.message })
    }

    const relTemplate = path.relative(path.join(__dirname, ".."), templatePath)
    inventory.push({
      code,
      name: offeringType.name,
      offering_type_id: offeringType.id,
      instance_count: instanceCount,
      schema_column_count: offeringType.instance_schema?.fields
        ? Object.keys(offeringType.instance_schema.fields).length
        : 0,
      schema_hash: offeringType.instance_schema
        ? computeSchemaHash(offeringType.instance_schema)
        : null,
      verify_status: verifyStatus,
      template_path: relTemplate,
      export_path: instanceCount > 0 && !args.templatesOnly ? path.relative(path.join(__dirname, ".."), exportPath) : null,
      verify_summary: verifyResult?.summary || null,
    })

    if (!typeReports.find((r) => r.code === code)) {
      typeReports.push({
        code,
        instance_count: instanceCount,
        verify_status: verifyStatus,
        verify_summary: verifyResult?.summary || null,
      })
    }
    console.log("")
  }

  for (const entry of inventory) {
    if (!args.verifyOnly) {
      try {
        const manifestPath = path.join(
          path.dirname(templateInstanceCsvPath(entry.code)),
          `${path.basename(templateInstanceCsvPath(entry.code), ".csv")}-schema.json`
        )
        if (fs.existsSync(manifestPath)) {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))
          entry.schema_column_count = (manifest.columns || []).length
          entry.schema_hash = manifest.schema_hash
        }
      } catch {
        // keep fallback
      }
    }
  }

  const inventoryJsonPath = path.join(OUTPUT_DIR, "instance-types-inventory.json")
  const inventoryMdPath = path.join(OUTPUT_DIR, "instance-types-inventory.md")
  const tableMd = buildInstanceInventoryMarkdownRows(inventory)

  fs.writeFileSync(
    inventoryJsonPath,
    JSON.stringify({ generated_at: new Date().toISOString(), types: inventory }, null, 2) + "\n",
    "utf8"
  )
  fs.writeFileSync(
    inventoryMdPath,
    `# Active instance types inventory\n\nGenerated: ${new Date().toISOString()}\n\n${tableMd}\n`,
    "utf8"
  )

  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  const reportPath = path.join(OUTPUT_DIR, `bootstrap-instance-csv-${stamp}.json`)
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        mode: args.templatesOnly ? "templates-only" : args.verifyOnly ? "verify-only" : "full",
        types: typeReports,
        inventory_path: inventoryJsonPath,
      },
      null,
      2
    ) + "\n",
    "utf8"
  )

  if (args.patchDoc && !args.verifyOnly && fs.existsSync(DESIGN_DOC)) {
    patchInstanceTypesDoc(DESIGN_DOC, tableMd)
    console.log(`Patched design doc: ${DESIGN_DOC}`)
  }

  console.log("Summary")
  console.log(`  Inventory JSON: ${inventoryJsonPath}`)
  console.log(`  Inventory MD:   ${inventoryMdPath}`)
  console.log(`  Report:         ${reportPath}`)
  console.log(
    `  Verify: pass=${inventory.filter((e) => e.verify_status === "pass").length} warn=${inventory.filter((e) => e.verify_status === "warn").length} fail=${inventory.filter((e) => e.verify_status === "fail").length} skipped=${inventory.filter((e) => e.verify_status === "skipped_no_data").length}`
  )

  if (hasFailure) process.exit(1)
}

main().catch((err) => {
  console.error("Fatal:", err.message)
  process.exit(1)
})
