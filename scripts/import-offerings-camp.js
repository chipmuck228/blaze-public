#!/usr/bin/env node

/**
 * @deprecated Use `node scripts/import-offerings.js --type camp` instead.
 *
 * Thin wrapper — forwards all CLI flags to the unified schema-driven importer.
 *
 * Usage:
 *   node scripts/import-offerings-camp.js [--dry-run] [--execute] [--file <path.csv>]
 */

const path = require("path")
const { spawnSync } = require("child_process")

console.warn("[deprecated] import-offerings-camp.js → use import-offerings.js --type camp")

const forwarded = process.argv.slice(2)
const args = [path.join(__dirname, "import-offerings.js"), "--type", "camp", ...forwarded]

const result = spawnSync(process.execPath, args, { stdio: "inherit" })
process.exit(result.status === null ? 1 : result.status)
