#!/usr/bin/env node

/**
 * Bootstrap CSV templates and dry-run verification for all active offering types.
 *
 * Usage:
 *   node scripts/bootstrap-offering-csv.js
 *   node scripts/bootstrap-offering-csv.js --templates-only
 *   node scripts/bootstrap-offering-csv.js --verify-only
 *   node scripts/bootstrap-offering-csv.js --list
 */

const fs = require("fs")
const path = require("path")
const {
  loadEnv,
  loadActiveOfferingTypes,
  countOfferingsForType,
  exportOfferingsForType,
  dryRunImportFromFile,
  resolveVerifyStatus,
  buildInventoryMarkdownRows,
  patchOfferingTypesDoc,
  templateCsvPath,
  computeSchemaHash,
} = require("./lib/import-offerings-common")

const DESIGN_DOC = path.join(__dirname, "design", "offering-csv-import.md")
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
    console.log("Active offering types:")
    for (const t of types) {
      const count = await countOfferingsForType(supabase, t.id)
      console.log(`  ${t.code}\t${t.name}\t(${count} offerings)`)
    }
    return
  }

  console.log("Bootstrap offering CSV templates & verification")
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

    const offeringCount = await countOfferingsForType(supabase, offeringType.id)
    const templatePath = templateCsvPath(code)
    let exportPath = path.join(BOOTSTRAP_DIR, `Blaze-Offerings-${code}.csv`)
    let verifyResult = null
    let verifyStatus = "skipped_no_data"

    try {
      if (!args.verifyOnly) {
        const templateResult = await exportOfferingsForType(supabase, code, {
          out: templatePath,
          writeTemplate: true,
        })
        console.log(`  Template: ${templateResult.csvPath} (${templateResult.schemaColumnCount} dynamic cols)`)
      }

      if (!args.templatesOnly && offeringCount > 0) {
        const exportResult = await exportOfferingsForType(supabase, code, {
          out: exportPath,
          writeTemplate: false,
        })
        console.log(`  Export: ${exportResult.rowCount} row(s) → ${exportResult.csvPath}`)

        verifyResult = await dryRunImportFromFile(supabase, code, exportPath)
        verifyStatus = resolveVerifyStatus(verifyResult.summary, offeringCount)
        console.log(
          `  Dry-run: unchanged=${verifyResult.summary.unchanged} update=${verifyResult.summary.update} failed=${verifyResult.summary.failed} → ${verifyStatus}`
        )
        if (verifyResult.driftWarnings?.length) {
          for (const w of verifyResult.driftWarnings) {
            console.warn(`  [drift] ${w.message}`)
          }
        }
        if (verifyStatus === "fail") hasFailure = true
      } else if (!args.templatesOnly && offeringCount === 0) {
        console.log("  Verify: skipped (no offerings)")
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
      offering_count: offeringCount,
      schema_column_count: offeringType.offering_schema?.fields
        ? Object.keys(offeringType.offering_schema.fields).length
        : 0,
      schema_hash: offeringType.offering_schema
        ? computeSchemaHash(offeringType.offering_schema)
        : null,
      verify_status: verifyStatus,
      template_path: relTemplate,
      export_path: offeringCount > 0 && !args.templatesOnly ? path.relative(path.join(__dirname, ".."), exportPath) : null,
      verify_summary: verifyResult?.summary || null,
    })

    if (!typeReports.find((r) => r.code === code)) {
      typeReports.push({
        code,
        offering_count: offeringCount,
        verify_status: verifyStatus,
        verify_summary: verifyResult?.summary || null,
      })
    }
    console.log("")
  }

  // Recompute schema_column_count from export if we ran templates
  for (const entry of inventory) {
    if (!args.verifyOnly) {
      try {
        const manifestPath = path.join(
          path.dirname(templateCsvPath(entry.code)),
          `${path.basename(templateCsvPath(entry.code), ".csv")}-schema.json`
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

  const inventoryJsonPath = path.join(OUTPUT_DIR, "offering-types-inventory.json")
  const inventoryMdPath = path.join(OUTPUT_DIR, "offering-types-inventory.md")
  const tableMd = buildInventoryMarkdownRows(inventory)

  fs.writeFileSync(
    inventoryJsonPath,
    JSON.stringify({ generated_at: new Date().toISOString(), types: inventory }, null, 2) + "\n",
    "utf8"
  )
  fs.writeFileSync(
    inventoryMdPath,
    `# Active offering types inventory\n\nGenerated: ${new Date().toISOString()}\n\n${tableMd}\n`,
    "utf8"
  )

  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  const reportPath = path.join(OUTPUT_DIR, `bootstrap-offering-csv-${stamp}.json`)
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
    patchOfferingTypesDoc(DESIGN_DOC, tableMd)
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
