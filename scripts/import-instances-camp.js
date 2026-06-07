#!/usr/bin/env node

/**
 * @deprecated Use `node scripts/import-instances.js --type camp` instead.
 *
 * Thin wrapper — forwards all CLI flags to the unified schema-driven importer.
 *
 * Usage:
 *   node scripts/import-instances-camp.js [--dry-run] [--execute] [--file <path.xlsx>]
 */

const path = require("path")
const { spawnSync } = require("child_process")

console.warn("[deprecated] import-instances-camp.js → use import-instances.js --type camp")

const forwarded = process.argv.slice(2)
const args = [path.join(__dirname, "import-instances.js"), "--type", "camp", ...forwarded]

const result = spawnSync(process.execPath, args, { stdio: "inherit" })
process.exit(result.status === null ? 1 : result.status)
