#!/usr/bin/env node
/**
 * DEPRECATED — archived 2026-06. Unified wide-table Raw extract removed.
 * Use schema-mode per type: export-offerings.js → import-offerings.js → export-instances.js → import-instances.js
 * Archived: _archive/scripts/extract-instances-from-raw.js
 */
console.error(`
DEPRECATED: extract-instances-from-raw.js (unified wide table) has been archived.

Use schema-mode CSV per offering type instead:
  node scripts/export-offerings.js --type camp
  node scripts/import-offerings.js --type camp --file scripts/output/Blaze-Offerings-camp.csv --execute
  node scripts/export-instances.js --type camp
  node scripts/import-instances.js --type camp --file scripts/output/Blaze-Instances-camp.csv --execute

Spec: scripts/design/instance-csv-import.md
Archived script: _archive/scripts/extract-instances-from-raw.js
`)
process.exit(1)
