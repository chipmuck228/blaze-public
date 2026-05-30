#!/usr/bin/env node

/**
 * Audit v2_instance rows where offering.category_id != program.category_id.
 *
 * Usage:
 *   node scripts/audit-instances-integrity.js
 */

const { loadEnv, auditInstancesIntegrity } = require("./lib/import-instances-common")

async function main() {
  loadEnv()

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

  const audit = await auditInstancesIntegrity(supabase)

  console.log("v2_instance integrity audit")
  console.log("=".repeat(60))
  console.log(`Supabase: ${supabaseUrl}`)
  console.log(`Total instances: ${audit.total_instances}`)
  console.log(`Category mismatches: ${audit.mismatch_count}`)
  console.log("")

  if (audit.mismatch_count > 0) {
    console.log("Mismatches:")
    for (const m of audit.mismatches) {
      console.log(
        `  ${m.instance_id}\n    program: ${m.program_category} (${m.program_category_id})\n    offering: ${m.offering_category} (${m.offering_category_id}) — ${m.offering_name}`
      )
    }
    process.exit(1)
  }

  console.log("OK — all instances have matching program/offering categories.")
}

main().catch((err) => {
  console.error("Fatal:", err.message)
  process.exit(1)
})
