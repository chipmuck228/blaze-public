#!/usr/bin/env node

/**
 * Audit Blaze database table inventory:
 * 1. Scan src/ + scripts/ for supabase .from("table") references
 * 2. Fetch live PostgREST schema (service role) OR probe tables via anon key
 * 3. Diff code vs database; classify orphans and stale code references
 * 4. Emit bridge / coach migration assessments (plan todos)
 *
 * Usage:
 *   node scripts/audit-db-table-inventory.js
 *   node scripts/audit-db-table-inventory.js --json
 */

const fs = require("fs")
const path = require("path")
const { createClient } = require("@supabase/supabase-js")

const ROOT = path.join(__dirname, "..")
const SCAN_DIRS = ["src", "scripts"]
const PROBE_SCAN_DIRS = ["src", "scripts", "_archive"]
const SKIP_DIRS = new Set(["node_modules", ".next", "output", "_archive/scripts"])
const FROM_RE = /\.from\(\s*['"`]([a-zA-Z0-9_]+)['"`]\s*\)/g
const CODE_FALSE_POSITIVES = new Set(["table"])

/** Tables/views referenced in code (from plan + scan). */
const PLAN_CATEGORIES = {
  v2_core: [
    "v2_offering_type",
    "v2_category",
    "v2_franchise",
    "v2_offering",
    "v2_franchise_category_map",
    "v2_campus",
    "v2_program",
    "v2_instance",
  ],
  v3_core: [
    "v3_offering_type",
    "v3_stage",
    "v3_campus",
    "v3_offering",
    "v3_campus_stage_map",
    "v3_location",
    "v3_series",
    "v3_session",
  ],
  v2_resources: ["v2_resource_category", "v2_resource"],
  users: ["users", "password_reset_tokens", "students", "user_students", "student_invitations"],
  enrollments: [
    "instance_enrollments",
    "course_enrollments",
    "enrollment_status_history",
    "enrollment_config",
    "user_credits",
    "enrollments",
  ],
  bridge: ["offerings_v2", "instance_v2", "franchises_v2", "offering_types"],
  legacy_course: [
    "franchises",
    "campuses",
    "course_categories",
    "course_series",
    "courses",
    "course_subcategories",
    "course_subcategory_tags",
    "course_locations",
    "course_assignments",
    "course_instances",
    "course_prerequisites",
    "course_instance_coaches",
  ],
  legacy_offerings: ["offerings", "offerings_assignments"],
  blaze_api: [
    "blaze_franchise",
    "blaze_campus",
    "blaze_category",
    "blaze_program",
    "blaze_offering",
    "blaze_offering_type",
    "blaze_instance",
  ],
  prerequisites: [
    "prerequisite_groups",
    "prerequisite_group_items",
    "prerequisite_groups_offerings",
    "offering_prerequisites",
  ],
  learning_paths: [
    "learning_paths",
    "learning_path_courses",
    "user_learning_path_progress",
    "user_course_completions",
  ],
  content: ["teams", "team_social_networks", "testimonials", "admin_notifications"],
  newsletter: [
    "newsletter_templates",
    "newsletter_campaigns",
    "newsletter_subscribers",
    "newsletter_sends",
    "newsletter_retry_tasks",
  ],
  traffic: ["traffic_visits", "traffic_sessions", "traffic_pageviews"],
  misc: ["stripe_payment_events", "waitlist_notifications"],
}

const BRIDGE_TABLES = PLAN_CATEGORIES.bridge
const COACH_COURSE_TABLES = [
  "course_instances",
  "course_instance_coaches",
  "course_series",
  "course_categories",
  "course_assignments",
  "courses",
]

function loadEnv() {
  const envPath = path.join(ROOT, ".env.local")
  if (!fs.existsSync(envPath)) return
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .forEach((line) => {
      const match = line.match(/^([^=:#]+)=(.*)$/)
      if (!match) return
      const key = match[1].trim()
      let value = match[2].trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = value
    })
}

function walkFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walkFiles(full, files)
    } else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) {
      files.push(full)
    }
  }
  return files
}

function scanCodeReferences(scanDirs = SCAN_DIRS) {
  const refs = new Map()

  for (const rel of scanDirs) {
    const dir = path.join(ROOT, rel)
    for (const file of walkFiles(dir)) {
      const content = fs.readFileSync(file, "utf8")
      let m
      FROM_RE.lastIndex = 0
      while ((m = FROM_RE.exec(content)) !== null) {
        const table = m[1]
        if (CODE_FALSE_POSITIVES.has(table)) continue
        if (!refs.has(table)) refs.set(table, new Set())
        refs.get(table).add(path.relative(ROOT, file))
      }
    }
  }

  return refs
}

function allPlanTables() {
  const set = new Set()
  for (const list of Object.values(PLAN_CATEGORIES)) {
    for (const t of list) set.add(t)
  }
  return set
}

function buildProbeCandidates(codeRefs, extraRefs) {
  const candidates = new Set([...allPlanTables(), ...codeRefs.keys(), ...extraRefs.keys()])
  return [...candidates].sort()
}

async function fetchPostgrestTables(supabaseUrl, serviceKey) {
  const base = supabaseUrl.replace(/\/$/, "")
  const res = await fetch(`${base}/rest/v1/`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: "application/openapi+json",
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PostgREST schema fetch failed (${res.status}): ${text.slice(0, 200)}`)
  }

  const spec = await res.json()
  const paths = Object.keys(spec.paths || {})
  const tables = new Set()

  for (const p of paths) {
    const match = p.match(/^\/([^/?]+)/)
    if (!match) continue
    const name = match[1]
    if (name.startsWith("rpc/")) continue
    tables.add(name)
  }

  return tables
}

async function probeTables(supabaseUrl, anonKey, candidates) {
  const sb = createClient(supabaseUrl, anonKey)
  const existing = new Set()
  const missing = new Set()
  const permissionDenied = new Set()

  const batchSize = 8
  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize)
    await Promise.all(
      batch.map(async (name) => {
        const { error } = await sb.from(name).select("id").limit(1)
        if (!error) {
          existing.add(name)
          return
        }
        if (error.code === "PGRST205" || /Could not find the table/i.test(error.message || "")) {
          missing.add(name)
          return
        }
        // Table exists in schema cache but anon may lack SELECT (RLS) — still counts as present
        if (
          error.code === "42501" ||
          /permission denied/i.test(error.message || "") ||
          error.code === "PGRST301"
        ) {
          existing.add(name)
          permissionDenied.add(name)
          return
        }
        // Unknown error: treat as exists to avoid false negatives
        existing.add(name)
      })
    )
  }

  return { existing, missing, permissionDenied: [...permissionDenied].sort() }
}

function findCategory(table) {
  for (const [cat, list] of Object.entries(PLAN_CATEGORIES)) {
    if (list.includes(table)) return cat
  }
  return null
}

function classifyOrphans(orphans) {
  return orphans.map((table) => {
    const category = findCategory(table)
    let risk = "unknown"
    if (category === "blaze_api") risk = "low_api_only"
    else if (category === "legacy_offerings") risk = "low_legacy"
    else if (table.startsWith("newsletter_") || table.startsWith("traffic_")) risk = "medium_ops"
    else if (category === "bridge") risk = "blocked_bridge"
    else if (category === "legacy_course") risk = "blocked_coach_admin"
    else if (category === "v2_core" || category === "v3_core" || category === "v2_resources") risk = "high_core"
    else if (category === "users" || category === "enrollments") risk = "high_core"
    return { table, category, risk }
  })
}

function buildBridgeMigrationAssessment(codeRefs) {
  const filesByTable = Object.fromEntries(
    BRIDGE_TABLES.map((t) => [t, [...(codeRefs.get(t) || [])].sort()])
  )
  const criticalPaths = [
    {
      path: "src/app/api/enrollments/cart/route.ts",
      tables: ["instance_v2", "offerings_v2"],
      note: "Checkout cart reads bridge session/offering rows",
    },
    {
      path: "src/app/course-catalog/[slug]/page.tsx",
      tables: ["instance_v2"],
      note: "Public instance detail page",
    },
    {
      path: "src/app/api/public/instances/[id]/route.ts",
      tables: ["instance_v2", "course_instances"],
      note: "Legacy instance API with v2 fallback",
    },
    {
      path: "src/app/api/public/instances/route.ts",
      tables: ["instance_v2", "franchises_v2"],
      note: "Legacy public instances list",
    },
    {
      path: "src/lib/db-v2.ts",
      tables: BRIDGE_TABLES,
      note: "Deprecated module — do not extend; migrate callers to v2_*",
    },
    {
      path: "src/app/api/admin/offerings/route.ts",
      tables: ["offerings_v2", "offering_types"],
      note: "Legacy admin offerings (non-Blaze admin pages archived)",
    },
  ]

  return {
    status: "not_started",
    recommendation:
      "Migrate cart, instance detail, and public legacy instance routes to v2_instance/v2_offering before dropping bridge tables.",
    bridge_tables: BRIDGE_TABLES,
    v2_targets: {
      offerings_v2: "v2_offering",
      instance_v2: "v2_instance",
      franchises_v2: "v2_franchise",
      offering_types: "v2_offering_type",
    },
    code_files_by_table: filesByTable,
    critical_paths: criticalPaths,
    blockers: [
      "instance_enrollments may reference instance_v2 IDs — verify FK mapping during migration",
      "Cart checkout and Stripe webhook paths must stay consistent with enrollment instance_id",
      "Admin legacy offerings routes still write offerings_v2",
    ],
    suggested_order: [
      "1. Add v2_* reads to cart + public instance detail (feature flag or dual-read)",
      "2. Migrate admin offerings to /api/admin/offering/v2 only",
      "3. Remove db-v2.ts callers",
      "4. Drop bridge tables after row-count parity check",
    ],
  }
}

function buildCoachMigrationAssessment(codeRefs) {
  const learningTables = PLAN_CATEGORIES.learning_paths
  const filesByTable = Object.fromEntries(
    [...COACH_COURSE_TABLES, ...learningTables].map((t) => [
      t,
      [...(codeRefs.get(t) || [])].sort(),
    ])
  )

  return {
    status: "evaluation_only",
    recommendation:
      "Coach portal and learning paths depend on course_* hierarchy. Do not drop course_* until coach instances and learning-path progress are mapped to v2_program/v2_instance.",
    coach_tables: COACH_COURSE_TABLES,
    learning_path_tables: learningTables,
    code_files_by_table: filesByTable,
    key_entry_points: [
      { path: "src/lib/db.ts", symbols: ["getCoachInstances"], tables: ["course_instances", "course_instance_coaches"] },
      { path: "src/app/api/coach/instances/route.ts", tables: ["course_instances"] },
      { path: "src/app/api/learning-paths", tables: learningTables },
      { path: "src/lib/featured-sessions.ts", tables: ["course_instances", "v2_instance"], note: "Dual featured sources" },
    ],
    v2_mapping: {
      course_categories: "v2_category (Program)",
      course_series: "v2_program (Activity)",
      course_instances: "v2_instance (Session)",
      course_instance_coaches: "new v2_instance_coach join table (not in DDL yet)",
      learning_path_courses: "would reference v2_program or v2_category IDs",
    },
    blockers: [
      "No v2 coach assignment table in current v2/ DDL",
      "learning_path_courses links to courses.id not v2_program.id",
      "user_course_completions tied to legacy course catalog",
      "Admin /admin/instances (non-v2) and coach portal share course_instances",
    ],
    suggested_order: [
      "1. Product decision: unify featured + coach on v2_instance",
      "2. Design v2_instance_coaches (or reuse enrollments coach role)",
      "3. Migrate learning_paths to v2_program references",
      "4. Retire course_instances after data backfill",
    ],
  }
}

function printSection(title, items, formatter = (x) => x) {
  if (!items.length) return
  console.log(`\n${title} (${items.length})`)
  console.log("-".repeat(60))
  for (const item of items.sort()) {
    console.log(formatter(item))
  }
}

async function main() {
  loadEnv()

  const codeRefs = scanCodeReferences()
  const extraRefs = scanCodeReferences(PROBE_SCAN_DIRS)
  const codeTables = new Set(codeRefs.keys())

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  let dbTables = new Set()
  let dbFetchError = null
  let dbDiscoveryMethod = null
  let probeMeta = null

  if (supabaseUrl && serviceKey) {
    try {
      dbTables = await fetchPostgrestTables(supabaseUrl, serviceKey)
      dbDiscoveryMethod = "postgrest_openapi"
    } catch (err) {
      dbFetchError = err.message
    }
  } else {
    dbFetchError = "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  }

  if (!dbTables.size && supabaseUrl && anonKey) {
    const candidates = buildProbeCandidates(codeRefs, extraRefs)
    const probed = await probeTables(supabaseUrl, anonKey, candidates)
    dbTables = probed.existing
    dbDiscoveryMethod = "table_probe_anon"
    dbFetchError = dbFetchError
      ? `${dbFetchError}; fell back to table probe (${candidates.length} candidates)`
      : null
    probeMeta = {
      candidates_probed: candidates.length,
      confirmed_missing: [...probed.missing].sort(),
      rls_permission_denied_but_exists: probed.permissionDenied,
      limitation:
        "Probe only checks known candidate names. Set a valid SUPABASE_SERVICE_ROLE_KEY for full PostgREST schema export.",
    }
  }

  const inCodeNotDb = [...codeTables].filter((t) => dbTables.size && !dbTables.has(t))
  const inDbNotCode = [...dbTables].filter((t) => !codeTables.has(t))
  const inBoth = [...codeTables].filter((t) => dbTables.has(t))
  const classifiedOrphans = classifyOrphans(inDbNotCode)

  console.log("Blaze Database Table Inventory Audit")
  console.log("=".repeat(60))
  console.log(`Code scan roots: ${SCAN_DIRS.join(", ")}`)
  console.log(`Tables referenced in code: ${codeTables.size}`)
  if (dbDiscoveryMethod) {
    console.log(`Database discovery: ${dbDiscoveryMethod}`)
  }
  if (dbFetchError && !dbTables.size) {
    console.log(`Database schema: FAILED (${dbFetchError})`)
  } else if (dbFetchError) {
    console.log(`Schema note: ${dbFetchError}`)
  }
  if (dbTables.size) {
    console.log(`Supabase: ${supabaseUrl}`)
    console.log(`Tables/views found: ${dbTables.size}`)
    console.log(`In both code and DB: ${inBoth.length}`)
    console.log(`Orphans (DB only): ${inDbNotCode.length}`)
  }

  printSection(
    "Code references (table → file count)",
    [...codeRefs.entries()].sort((a, b) => a[0].localeCompare(b[0])),
    ([table, files]) => {
      const cat = findCategory(table)
      const tag = cat ? ` [${cat}]` : ""
      return `  ${table}${tag} — ${files.size} file(s)`
    }
  )

  if (dbTables.size) {
    printSection(
      "ORPHAN: in database but NOT referenced in code",
      inDbNotCode,
      (t) => {
        const o = classifiedOrphans.find((x) => x.table === t)
        return `  ${t}${o?.category ? ` [${o.category}]` : ""} risk=${o?.risk || "?"}`
      }
    )

    printSection(
      "STALE CODE?: referenced in code but NOT in database",
      inCodeNotDb,
      (t) => {
        const files = [...codeRefs.get(t)].slice(0, 3).join(", ")
        const more = codeRefs.get(t).size > 3 ? ` (+${codeRefs.get(t).size - 3})` : ""
        return `  ${t} — ${files}${more}`
      }
    )
  }

  const orphansByPrefix = {}
  for (const t of inDbNotCode) {
    const prefix = t.startsWith("v2_")
      ? "v2_*"
      : t.startsWith("blaze_")
        ? "blaze_*"
        : t.startsWith("course_")
          ? "course_*"
          : t.startsWith("newsletter_")
            ? "newsletter_*"
            : t.startsWith("traffic_")
              ? "traffic_*"
              : "other"
    orphansByPrefix[prefix] = (orphansByPrefix[prefix] || 0) + 1
  }

  if (Object.keys(orphansByPrefix).length) {
    console.log("\nOrphan prefix summary")
    console.log("-".repeat(60))
    for (const [prefix, count] of Object.entries(orphansByPrefix).sort()) {
      console.log(`  ${prefix}: ${count}`)
    }
  }

  const bridgeAssessment = buildBridgeMigrationAssessment(codeRefs)
  const coachAssessment = buildCoachMigrationAssessment(codeRefs)

  console.log("\nMigration assessments (optional plan todos)")
  console.log("-".repeat(60))
  console.log(`Bridge: ${bridgeAssessment.recommendation}`)
  console.log(`Coach/learning paths: ${coachAssessment.recommendation}`)

  const writeJson = process.argv.includes("--json")
  const outDir = path.join(ROOT, "scripts", "output")
  const payload = {
    generated_at: new Date().toISOString(),
    supabase_url: supabaseUrl || null,
    db_discovery_method: dbDiscoveryMethod,
    db_fetch_error: dbFetchError,
    probe_meta: probeMeta,
    code_table_count: codeTables.size,
    db_table_count: dbTables.size,
    code_tables: [...codeTables].sort(),
    db_tables: [...dbTables].sort(),
    in_both: inBoth.sort(),
    orphans_db_not_code: inDbNotCode.sort(),
    orphans_classified: classifiedOrphans.sort((a, b) => a.table.localeCompare(b.table)),
    stale_code_not_db: inCodeNotDb.sort(),
    code_refs: Object.fromEntries(
      [...codeRefs.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([k, v]) => [k, [...v].sort()])
    ),
    plan_categories: PLAN_CATEGORIES,
    migration_assessments: {
      bridge: bridgeAssessment,
      coach_learning_paths: coachAssessment,
    },
  }

  fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, "db-table-inventory.json")
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2))
  console.log(`\nWrote ${path.relative(ROOT, outPath)}`)

  if (!dbTables.size) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
