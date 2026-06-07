#!/usr/bin/env node

/**
 * @deprecated Use `node scripts/import-offerings.js --type course` instead.
 *
 * Thin wrapper — forwards all CLI flags to the unified schema-driven importer.
 * Note: legacy `--category-only` is no longer supported; use full row import or Admin UI.
 *
 * Usage:
 *   node scripts/import-offerings-course.js [--dry-run] [--execute] [--file <path.csv>]
 */

const path = require("path")
const { spawnSync } = require("child_process")

const forwarded = process.argv.slice(2)
if (forwarded.includes("--category-only")) {
  console.error(
    "[import-offerings-course] --category-only was removed. Use import-offerings.js with full CSV rows or patch category in Admin."
  )
  process.exit(1)
}

console.warn("[deprecated] import-offerings-course.js → use import-offerings.js --type course")

const args = [path.join(__dirname, "import-offerings.js"), "--type", "course", ...forwarded]

const result = spawnSync(process.execPath, args, { stdio: "inherit" })
process.exit(result.status === null ? 1 : result.status)
