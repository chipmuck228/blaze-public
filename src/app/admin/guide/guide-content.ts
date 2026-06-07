import { adminUiLabels } from "@/lib/admin-ui-labels"

export type GuideLang = "en" | "zh"

export const overviewItem = { id: "overview", titleEn: "Overview", titleZh: "概述" }
export const operationItems = [
  { id: "hierarchy", titleEn: "Product Hierarchy", titleZh: "产品层级" },
  { id: "configuration", titleEn: "Configuration Process", titleZh: "配置流程" },
  { id: "example", titleEn: "Example Walkthrough", titleZh: "配置示例" },
  { id: "templates", titleEn: "Offerings & Templates", titleZh: "产品与模板" },
  { id: "data-ops", titleEn: "Catalog Data Operations", titleZh: "目录数据运维" },
  { id: "data-reference", titleEn: "Scripts & Files Reference", titleZh: "脚本与文件速查" },
  { id: "data-import", titleEn: "Bulk Data Import", titleZh: "批量数据导入" },
  { id: "notes", titleEn: "Important Notes", titleZh: "重要说明" },
] as const
export const deploymentItems = [
  { id: "deployment-vercel", titleEn: "Vercel Deployment", titleZh: "Vercel 部署" },
  { id: "deployment-google-map", titleEn: "Google Map", titleZh: "Google 地图" },
  { id: "deployment-google-gemini", titleEn: "Google Gemini", titleZh: "Google Gemini" },
  {
    id: "deployment-traffic-analytics",
    titleEn: "Traffic Analytics (GSC & Geography)",
    titleZh: "流量分析（GSC 与 Geography）",
  },
] as const

export const allSectionIds = [
  overviewItem.id,
  ...operationItems.map((i) => i.id),
  ...deploymentItems.map((i) => i.id),
]

const L = adminUiLabels

export const T = {
  en: {
    pageTitle: "Admin Guide",
    pageSubtitle: "How the public website is structured and how to configure campuses, programs, activities, and sessions",
    tocTitle: "Table of Contents",
    operationGuideLabel: "Operation Guide",
    deploymentGuideLabel: "Deployment Guide",
    operationGuideTitle: "Operation Guide",
    operationGuideDesc: "Web-facing hierarchy, setup steps, and a full example",
    deploymentGuideTitle: "Deployment Guide",
    deploymentGuideDesc:
      "Vercel hosting, Google Maps, Gemini AI chat, and Admin Traffic (Search Console keywords + visitor geography)",
    overviewTitle: "Overview",
    overviewDesc: "A practical guide for operators — written in the same terms parents see on the website",
    overviewBody: [
      "Blaze Robotics Academy organizes content in five levels that visitors browse on the website. Only Sessions can be enrolled in (or linked to an external enrollment URL).",
      "This guide explains that hierarchy, the recommended setup order in the admin panel, a complete Bellevue summer-camp example, and how to bulk-import sessions from spreadsheets. Deployment steps for Vercel, Google Maps, AI chat, and Traffic analytics (GSC keywords + geography) are at the end.",
    ],
    hierarchyTitle: "Product Hierarchy (website view)",
    hierarchyIntro:
      "Parents navigate Campus → Location → Program → Activity → Session. The first four levels organize content; Session is the bookable unit.",
    hierarchyLevels: [
      {
        label: "Campus",
        meaning: "A regional branch (e.g. Bellevue). One website Campus per franchise.",
        bookable: false,
        adminMenu: `Blaze Settings → ${L.franchise.plural}`,
      },
      {
        label: "Location",
        meaning: "A physical site under that Campus — name, address, phone, map.",
        bookable: false,
        adminMenu: `Blaze Content → ${L.campus.plural}`,
      },
      {
        label: "Program",
        meaning: "A learning track within the Campus (e.g. Explore, Learn, Compete).",
        bookable: false,
        adminMenu: `Blaze Settings → ${L.category.plural} (global) + Campus subscriptions`,
      },
      {
        label: "Activity",
        meaning: "A season or catalog group (e.g. “2026 Summer Camps”) under one Campus and one Program.",
        bookable: false,
        adminMenu: `Blaze Content → ${L.program.plural}`,
      },
      {
        label: "Session",
        meaning: "A concrete class: dates, times, price, capacity, and location. What parents enroll in.",
        bookable: true,
        adminMenu: `Blaze Content → ${L.instance.plural}`,
      },
    ],
    hierarchyDiagram:
      "Campus (Bellevue) → Location (Main Center) → Program (Explore) → Activity (2026 Summer Camps) → Session (Week of July 6…)",
    configTitle: "Configuration Process",
    configIntro: "Follow these phases when standing up a new Campus or term. Each step maps to a menu in the admin sidebar (labels match the website).",
    configPhases: [
      {
        title: "Phase 1 — Global catalog (usually once per platform)",
        steps: [
          `Review ${L.offeringType.plural} under Blaze Settings (camp, course, etc.). These define form fields for offerings and sessions — operators rarely change them.`,
          `Create global ${L.category.plural} under Blaze Settings → ${L.category.plural} (e.g. Explore, Learn, Compete).`,
          `Create ${L.offering.plural} under Blaze Content → ${L.offering.plural}. Each offering is a reusable template (title, poster, type) tied to one Program.`,
        ],
      },
      {
        title: "Phase 2 — Campus setup",
        steps: [
          `Create the Campus under Blaze Settings → ${L.franchise.plural} (code, name, branding, domain).`,
          `On Blaze Settings → ${L.category.plural}, open “${L.franchise.singular} Subscriptions” and subscribe the Campus to the Programs it should run.`,
          `Add ${L.campus.plural} under Blaze Content → ${L.campus.plural} (address, contact, coordinates for maps).`,
        ],
      },
      {
        title: "Phase 3 — Activities and sessions",
        steps: [
          `Create an ${L.program.singular} under Blaze Content → ${L.program.plural} for each Campus + Program + term (e.g. “2026 Summer Camps”, with start/end dates).`,
          `Add ${L.instance.plural} under that activity (or Blaze Content → ${L.instance.plural}). Pick an offering, schedule, optional Location, capacity, and price.`,
          `Set status to scheduled/published and mark featured if the session should appear in recommended carousels.`,
        ],
      },
    ],
    exampleTitle: "Example: Bellevue summer camp",
    exampleIntro:
      "Below is one complete path from empty catalog to a bookable Session on the Bellevue Campus Explore program.",
    exampleSteps: [
      {
        step: "1. Global Program",
        detail: "Program “Explore” exists globally (Blaze Settings → Programs).",
      },
      {
        step: "2. Offering template",
        detail: "Offering “VEX IQ Summer Camp — Full Day” is created under Explore, type Camp (Blaze Content → Offerings).",
      },
      {
        step: "3. Campus",
        detail: "Campus “Bellevue” exists with code bellevue (Blaze Settings → Campuses). Bellevue is subscribed to Explore.",
      },
      {
        step: "4. Location",
        detail: "Location “Bellevue Main Center” is added with address and map coordinates (Blaze Content → Locations).",
      },
      {
        step: "5. Activity",
        detail: "Activity “2026 Summer Camps” is created for Campus Bellevue + Program Explore, dates Jun 1 – Aug 31 (Blaze Content → Activities).",
      },
      {
        step: "6. Session",
        detail:
          "Session “Week of July 6” is added under that activity: offering “VEX IQ Summer Camp — Full Day”, Mon–Fri 9:00–15:00, Location Bellevue Main Center, max 12 students, price from offering or override (Blaze Content → Activities → Add Session).",
      },
      {
        step: "7. On the website",
        detail:
          "Visitors open Campus Bellevue → see Location(s) → browse Explore → 2026 Summer Camps → enroll in the July 6 week Session.",
      },
    ],
    templatesTitle: "Offerings & offering types (operator view)",
    templatesBody: [
      "Offering Types and Offerings are admin-only building blocks — they do not appear as separate levels on the public website.",
      "An Offering Type (e.g. Camp, Course) controls which extra fields appear when you create offerings and sessions.",
      "An Offering is a reusable template: card title, poster, and product defaults. When you create a Session, you choose an Offering; the Session row holds schedule, price, capacity, and enrollment link.",
      "Rule of thumb: Offering defines what the class is called; Session defines when and where it runs.",
    ],
    dataOpsTitle: "Catalog data operations — model setup & distribution",
    dataOpsDesc:
      "How operators turn raw term spreadsheets into a live website catalog: build the skeleton in Admin, then distribute Offerings and Sessions via CSV.",
    dataOpsIntro: [
      "This section assumes you already have raw operational data (Excel / Google Sheets / Amilia exports): camp names, weeks, prices, locations, etc.",
      "Blaze splits the work into two phases: (1) establish the data model — franchise, locations, programs, activities; (2) distribute catalog rows — Offerings first, then Sessions (instances).",
      "Phase 1 is mostly Admin UI (or one-time setup). Phase 2 is CSV export → edit → dry-run → execute on a trusted machine with service-role access.",
    ],
    dataOpsPhases: [
      {
        title: "Phase 1 — Data model (skeleton)",
        summary: "What must exist before any offering or session CSV can succeed.",
        items: [
          "Global Programs (Explore / Learn / Compete) and Offering Types (camp, course, …) — usually stable.",
          "Campus (franchise): code, branding, domain — Blaze Settings → Campuses.",
          "Campus subscribed to Programs it will run — Blaze Settings → Programs → Campus Subscriptions.",
          "Locations (physical sites): name, address, map — Blaze Content → Locations.",
          "Activities (terms): e.g. “2026 Summer Camps” per Campus + Program — Blaze Content → Activities (must exist before session import).",
        ],
      },
      {
        title: "Phase 2 — Data distribution (Offerings → Sessions)",
        summary: "Bulk rows that parents eventually book.",
        items: [
          "Offerings (`v2_offering`) — product templates: Title, Program, poster, defaults. One row per distinct class name.",
          "Sessions (`v2_instance`) — schedulable rows: dates, times, capacity, optional Location, Amilia link. Many sessions can share one offering.",
          "Order is fixed: offerings import must complete (and be published) before sessions import.",
        ],
      },
    ],
    dataOpsMappingTitle: "Admin ↔ database ↔ website ↔ CSV",
    dataOpsMappingRows: [
      {
        admin: "Campus",
        db: "v2_franchise",
        web: "Campus",
        csv: "Location Code (e.g. bellevue)",
        how: "Admin UI — Phase 1",
      },
      {
        admin: "Location",
        db: "v2_campus",
        web: "Location",
        csv: "Location Name (e.g. Bellevue, WA)",
        how: "Admin UI — Phase 1; optional on session rows",
      },
      {
        admin: "Program",
        db: "v2_category",
        web: "Program",
        csv: "Programs (category) / Program (tag)",
        how: "Admin UI — Phase 1",
      },
      {
        admin: "Activity",
        db: "v2_program",
        web: "Activity",
        csv: "Activity (program)",
        how: "Admin UI — Phase 1 (required before session import)",
      },
      {
        admin: "Offering",
        db: "v2_offering",
        web: "(card title only)",
        csv: "Title / Session Title (must match)",
        how: "CSV — Phase 2 step 1",
      },
      {
        admin: "Session",
        db: "v2_instance",
        web: "Session",
        csv: "Session row + schedule columns",
        how: "CSV — Phase 2 step 2",
      },
    ],
    dataOpsOfferingTitle: "Organizing Offerings (product templates)",
    dataOpsOfferingBody: [
      "An Offering answers: “What is this class called, which Program does it belong to, and what are the product defaults (price, capacity, description, poster)?”",
      "Offerings do not have start dates. They are reused across many Sessions.",
      "Each active offering type (camp, course, workshop, …) has its own CSV file and schema-driven columns from `offering_schema`.",
      "Status must be published before sessions referencing that Title can import (draft offerings → DRAFT_BLOCKED).",
    ],
    dataOpsOfferingSteps: [
      "Bootstrap or export: `node scripts/bootstrap-offering-csv.js` or `export-offerings.js --type camp`.",
      "Edit CSV: new rows → empty id; updates → keep id. Title + Program (tag) must be correct.",
      "Dry-run: `import-offerings.js --type camp --file …` until failed = 0.",
      "Execute: append `--execute`. Review JSON report under scripts/output/.",
    ],
    dataOpsOfferingCols: [
      "id — empty for INSERT; keep for UPDATE",
      "Title — becomes offering name; Session import matches Session Title to this",
      "Program (tag) — Explore / Learn / Compete",
      "Status — draft / published / suspended / archived",
      "Image Link — session card poster",
      "Dynamic columns — e.g. content|description, pricing|base_price (type-specific)",
    ],
    dataOpsInstanceTitle: "Organizing Sessions (instances)",
    dataOpsInstanceBody: [
      "A Session answers: “When does this class run, at which Location, for how much, with what capacity, and where do parents enroll?”",
      "Each row links to an existing Offering via Session Title (= offering Title) and the same Program.",
      "Activity (program) scopes the term (e.g. 2026 Summer Camps). Location Code scopes the Campus (franchise).",
      "Location Name is optional but recommended — ties the session to a physical site (v2_campus).",
    ],
    dataOpsInstanceSteps: [
      "After offerings are in DB: `export-instances.js --type camp` (repeat per offering type: course, workshop, …).",
      "Edit CSV: one row per schedulable week/section. Empty id = new session.",
      "Dry-run: `import-instances.js --type camp --file …` until failed = 0.",
      "Execute: `--execute`. UPDATE never resets current_students (enrollment count).",
    ],
    dataOpsInstanceCols: [
      "Location Code — franchise code (Campus)",
      "Programs (category) + Activity (program) — must resolve to existing activity",
      "Session Title — must match a published offering Title",
      "Location Name — physical site under that campus",
      "schedule|start_date, schedule|end_date, … — dynamic columns from instance_schema for that type",
      "Status, Is Active, Featured, Amilia Link, Notes",
    ],
    dataOpsTermSopTitle: "Term rollout SOP (assuming raw data exists)",
    dataOpsTermSop: [
      {
        step: "Prepare skeleton",
        detail:
          "In Admin: confirm Campus, subscriptions, Locations, and create Activities for the new term (e.g. 2026 Summer Camps under Explore + Compete).",
      },
      {
        step: "Normalize raw → offering list",
        detail:
          "From raw sheets, deduplicate class names → one offering row per Title. Assign Program (tag) and offering type (camp vs course). Fill schema columns (description, base price, default capacity).",
      },
      {
        step: "Import offerings",
        detail: "Per type CSV → dry-run → execute. Verify published status for anything that will have sessions.",
      },
      {
        step: "Normalize raw → session rows",
        detail:
          "Each dated row becomes a session: Session Title = offering Title, Activity = term name, dates/times/capacity/Location Name from raw. Split camp vs course (and other types) into separate type CSV files.",
      },
      {
        step: "Import sessions",
        detail: "Per type → dry-run → execute. Run integrity audit if available.",
      },
      {
        step: "Verify on website",
        detail:
          "Browse Campus → Program → Activity on the public site. Check featured sessions, dates (calendar display), Location, and Amilia links.",
      },
    ],
    dataOpsOpsTitle: "Ongoing operations",
    dataOpsOpsItems: [
      "Add a new class name → INSERT offering row, then INSERT session row(s).",
      "Change poster or description → UPDATE offering CSV (keep id).",
      "Change dates or price for one week → UPDATE session CSV (keep id or natural key match).",
      "New term → new Activity in Admin + new session rows; offerings often reused with same Title.",
      "Schema change in Admin (offering/instance type fields) → re-export CSV, migrate columns, dry-run again.",
      "Never use --replace-all on production with live enrollments unless planned maintenance + backup.",
    ],
    dataOpsTroubleTitle: "Common issues",
    dataOpsTroubleRows: [
      {
        issue: "OFFERING_NOT_FOUND / Session Title not found",
        fix: "Import offerings first; Title must match exactly. Check Program (category) alignment.",
      },
      {
        issue: "OFFERING_DRAFT / DRAFT_BLOCKED",
        fix: "Set offering Status to published in CSV or Admin, re-import offering, then sessions.",
      },
      {
        issue: "PROGRAM_NOT_FOUND / Activity not found",
        fix: "Create Activity in Admin or ensure Activity (program) text matches v2_program.display_name for that campus + category.",
      },
      {
        issue: "CAMPUS_NOT_FOUND / Location Name not found",
        fix: "Add Location under Blaze Content → Locations; use display name or address as in CSV.",
      },
      {
        issue: "Schema manifest not found",
        fix: "Run export-instances.js --type <code> or bootstrap-instance-csv.js so {basename}-schema.json is written beside the CSV.",
      },
      {
        issue: "Instance id not found (many rows on fresh DB)",
        fix: "Clear id column for new inserts, or export from your own database — do not import another project's CSV snapshot.",
      },
      {
        issue: "UPDATE instead of INSERT for new rows",
        fix: "Clear id column; ensure natural key (dates + title + activity) is unique.",
      },
    ],
    dataOpsDocRefs:
      "Detailed CLI specs: scripts/design/offering-csv-import.md, instance-csv-import.md. Legacy unified wide-table spec archived at _archive/scripts/design/unified-instance-import.md. Script and file quick reference in the next section; command examples in Bulk Data Import below.",
    dataRefTitle: "Scripts & files quick reference",
    dataRefDesc: "One-page checklist: which CLI to run, which CSV/manifest to edit, and where outputs land.",
    dataRefPrereqs: [
      "Run all commands from the project root: node scripts/<script>.js …",
      ".env.local must contain NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for the target database (not committed — each clone uses its own Supabase project).",
      "Schema-mode import requires a companion manifest next to the CSV: {basename}-schema.json (auto-written on export).",
      "New clone or empty DB: run bootstrap-instance-csv.js or export-instances.js against your database first. Do not import committed scripts/output/Blaze-*.csv snapshots — they may lack a sibling manifest and contain UUIDs from another database.",
      "Active offering types: node scripts/bootstrap-offering-csv.js --list — full inventory in scripts/output/offering-types-inventory.md and instance-types-inventory.md.",
    ],
    dataRefScriptsTitle: "CLI scripts",
    dataRefScripts: [
      {
        script: "scripts/bootstrap-offering-csv.js",
        purpose: "Generate offering templates for all active types; optional round-trip verify",
        when: "First time or after offering_schema changes",
      },
      {
        script: "scripts/export-offerings.js --type <code>",
        purpose: "DB → Blaze-Offerings-<code>.csv + manifest",
        when: "Start from live data or refresh columns after schema change",
      },
      {
        script: "scripts/import-offerings.js --type <code> --file …",
        purpose: "CSV → v2_offering (dry-run default; --execute to write)",
        when: "After editing offering CSV",
      },
      {
        script: "scripts/bootstrap-instance-csv.js",
        purpose: "Generate session templates for all active types; optional verify",
        when: "First time or after instance_schema changes",
      },
      {
        script: "scripts/export-instances.js --type <code>",
        purpose: "DB → Blaze-Instances-<code>.csv + manifest",
        when: "Per-type session export (camp, course, workshop, …)",
      },
      {
        script: "scripts/import-instances.js --type <code> --file …",
        purpose: "Schema CSV → v2_instance (needs -schema.json beside file)",
        when: "Session import (one CSV per offering type)",
      },
      {
        script: "scripts/import-instances.js --audit",
        purpose: "Integrity check on v2_instance FKs and orphans",
        when: "Before/after large session imports",
      },
    ],
    dataRefFilesTitle: "Data files & paths",
    dataRefFiles: [
      {
        path: "scripts/templates/offerings-{code}-template.csv",
        role: "Empty offering template (one per active type)",
        example: "scripts/templates/offerings-camp-template.csv",
      },
      {
        path: "scripts/templates/offerings-{code}-template-schema.json",
        role: "Template manifest (column snapshot)",
        example: "scripts/templates/offerings-camp-template-schema.json",
      },
      {
        path: "scripts/output/Blaze-Offerings-{code}.csv",
        role: "Default offering export / working file",
        example: "scripts/output/Blaze-Offerings-camp.csv",
      },
      {
        path: "scripts/output/Blaze-Offerings-{code}-schema.json",
        role: "Offering import manifest (required for schema import)",
        example: "scripts/output/Blaze-Offerings-camp-schema.json",
      },
      {
        path: "scripts/templates/instances-{code}-template.csv",
        role: "Empty session template (schema mode)",
        example: "scripts/templates/instances-camp-template.csv",
      },
      {
        path: "scripts/output/Blaze-Instances-{code}.csv",
        role: "Session export working file (export from your DB; committed snapshots may lack sibling manifest)",
        example: "scripts/output/Blaze-Instances-camp.csv",
      },
      {
        path: "scripts/output/Blaze-Instances-{code}-schema.json",
        role: "Session import manifest (required for schema import)",
        example: "scripts/output/Blaze-Instances-camp-schema.json",
      },
      {
        path: "scripts/output/import-offerings-{code}-*.json",
        role: "Offering import report (per row INSERT/UPDATE/FAILED)",
        example: "Timestamped after each import run",
      },
      {
        path: "scripts/output/import-instances-{type}-*.json",
        role: "Session import report (per type)",
        example: "Timestamped after each import run",
      },
      {
        path: "scripts/output/offering-types-inventory.md",
        role: "Active offering types, counts, template paths",
        example: "Regenerate via bootstrap-offering-csv.js",
      },
      {
        path: "scripts/output/instance-types-inventory.md",
        role: "Active instance types, counts, template paths",
        example: "Regenerate via bootstrap-instance-csv.js",
      },
    ],
    dataRefModeTitle: "Workflow overview",
    dataRefModes: [
      {
        scenario: "Ongoing ops; one CSV per offering type",
        workflow: "Schema mode (standard)",
        files: "Blaze-Offerings-{code}.csv + manifest → Blaze-Instances-{code}.csv + manifest",
      },
      {
        scenario: "Workshop / competition / gift card / other types",
        workflow: "Schema mode (same as camp/course)",
        files: "Separate CSV per type; bootstrap-instance-csv.js lists all active types",
      },
      {
        scenario: "Update existing rows from DB",
        workflow: "Export → edit → import",
        files: "Keep id column; re-export refreshes ids and manifest schema_hash",
      },
    ],
    dataRefOrderTitle: "Mandatory order",
    dataRefOrderSteps: [
      "Phase 1 (Admin UI): Campus → subscriptions → Locations → Activities",
      "Phase 2a: offerings CSV dry-run → --execute (Status = published for rows with sessions)",
      "Phase 2b: instances CSV dry-run → --execute",
      "Phase 3: Verify on public site; run --audit if counts look wrong",
    ],
    importTitle: "Bulk data import (schema CSV pipeline)",
    importIntro:
      "For large term rollouts, operators maintain spreadsheets, export/edit/import offerings via CSV, then export/edit/import sessions (one CSV per offering type). Full specs: scripts/design/offering-csv-import.md (offerings) and scripts/design/instance-csv-import.md (sessions).",
    importPrerequisites: [
      "Campuses, Program subscriptions, Activities, and Locations are already configured in the admin panel (Activities must exist — session import does not create them).",
      ".env.local contains NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY pointing at your target database (create this file locally; keys are not in the repo).",
      "First-time setup on a new database: run v2 DDL + offering-type seeds, complete Phase 1 in Admin, then bootstrap or export CSV from your DB — not from committed scripts/output/Blaze-*.csv snapshots.",
      "Run commands from the project root on a trusted machine — service role bypasses row-level security.",
    ],
    importPipeline: [
      {
        title: "Step 1 — Export offerings to CSV (or bootstrap all types)",
        body: "Export per offering type with --type <code> (see scripts/design/offering-csv-import.md §10 for active codes), or run bootstrap-offering-csv.js to generate templates for every active type and refresh the inventory.",
      },
      {
        title: "Step 2 — Edit & import offerings",
        body: "Add or edit rows in the CSV (keep id for updates; leave id empty for new offerings). Dry-run import, then execute. Session import matches by Session Title + Program.",
      },
      {
        title: "Step 3 — Export & edit sessions",
        body: "Per offering type: export-instances.js --type <code> (camp, course, workshop, …). Keep id for updates; leave id empty for new rows. Companion {basename}-schema.json is required for import.",
      },
      {
        title: "Step 4 — Dry-run session import",
        body: "import-instances.js --type <code> --file …. Validate without writing; fix errors until failed = 0.",
      },
      {
        title: "Step 5 — Execute session import",
        body: "Append --execute. Default upserts by id (if present) or natural key. Use --replace-all only when wiping all sessions first.",
      },
    ],
    importCommands: [
      {
        label: "Bootstrap all active offering types (templates + verify + inventory)",
        cmd: "node scripts/bootstrap-offering-csv.js\n# List types: node scripts/bootstrap-offering-csv.js --list\n# Inventory: scripts/output/offering-types-inventory.md",
      },
      {
        label: "Export offerings to CSV (+ schema manifest)",
        cmd: "node scripts/export-offerings.js --type <code>\nnode scripts/export-offerings.js --type <code> --write-template",
      },
      {
        label: "Import offerings (dry-run, then execute)",
        cmd: "node scripts/import-offerings.js --type <code> --dry-run --file <Blaze-Offerings-<code>.csv>\nnode scripts/import-offerings.js --type <code> --execute --file <Blaze-Offerings-<code>.csv>",
      },
      {
        label: "Bootstrap all active instance types (templates + verify + inventory)",
        cmd: "node scripts/bootstrap-instance-csv.js\n# List: node scripts/bootstrap-instance-csv.js --list\n# Inventory: scripts/output/instance-types-inventory.md",
      },
      {
        label: "Export sessions to CSV (one file per offering type)",
        cmd: "node scripts/export-instances.js --type <code>\nnode scripts/export-instances.js --type <code> --write-template",
      },
      {
        label: "Import sessions — schema mode (dry-run, then execute)",
        cmd: "node scripts/import-instances.js --type <code> --dry-run --file <Blaze-Instances-<code>.csv>\nnode scripts/import-instances.js --type <code> --execute --file <Blaze-Instances-<code>.csv>",
      },
      {
        label: "Integrity audit (before/after import)",
        cmd: "node scripts/import-instances.js --audit\n# or: node scripts/audit-instances-integrity.js",
      },
    ],
    importClearTitle: "Clearing existing session data",
    importClearBody: [
      "Default import (without --replace-all) only inserts or updates rows that match the spreadsheet. Sessions already in the database but missing from the file are left untouched — they become orphans and can cause count mismatches or integrity errors.",
      "To make the database contain only what is in the CSV, use a full rebuild:",
    ],
    importClearCommand:
      "node scripts/import-instances.js --type <code> --execute --replace-all --file <Blaze-Instances-<code>.csv>",
    importClearNotes: [
      "--replace-all deletes every row in v2_instance (all offering types — camp, course, workshop, …), then insert-only from the current CSV file. The --type flag does not scope the delete.",
      "Enrollment records and any data pointing at deleted session IDs may break. Only use when there are no live enrollments, or after a planned maintenance window.",
      "There is no undo. Take a Supabase backup or export before running destructive imports on production.",
      "Do not run manual SQL DELETE or TRUNCATE on catalog tables (campuses, programs, activities, offerings) unless you fully understand foreign-key dependencies.",
    ],
    importWideTableCols: [
      "Location Code — campus code (e.g. bellevue)",
      "id — keep for updates; empty for new rows",
      "Programs (category) — Explore / Learn / Compete",
      "Activity (program) — e.g. 2026 Summer Camps",
      "Session Title — must match an existing offering name",
      "Location Name — physical site under the campus (v2_campus); legacy CSV header Campus still works",
      "schedule|start_date, schedule|end_date, pricing|price_override, … — from instance_schema",
      "Status, Is Active, Featured, Amilia Link, Notes",
    ],
    importLogs:
      "Each run writes scripts/output/import-instances-{type}-{timestamp}.json with per-row actions (INSERT / UPDATE / FAILED), error codes, and field diffs. failed > 0 exits with code 1.",
    importWarnings: [
      {
        title: "Destructive: --replace-all",
        body: "Deletes ALL rows in v2_instance across every offering type, then inserts only from the current CSV. Not scoped to --type. Irreversible without a backup. Never run on production with active enrollments unless explicitly planned.",
      },
      {
        title: "Production database access",
        body: "Import scripts use SUPABASE_SERVICE_ROLE_KEY and write directly to the database. Double-check .env.local targets the intended environment before --execute.",
      },
      {
        title: "Always dry-run first",
        body: "Default --dry-run performs full validation and produces logs without writing. Omit --execute for offerings and instances unless you intend to write. Only proceed when the dry-run summary shows zero failures.",
      },
      {
        title: "Schema drift (manifest vs DB)",
        body: "If {basename}-schema.json schema_hash differs from the live instance_schema, import logs drift warnings but still runs. Re-export after Admin changes offering/instance type fields.",
      },
      {
        title: "Optional import flags",
        body: "Session import: --publish-referenced-offerings (publish draft offerings referenced in file), --allow-draft-offering (allow draft without auto-publish), --allow-file-duplicates (keep last duplicate row). See scripts/design/instance-csv-import.md.",
      },
      {
        title: "Manual DDL / SQL deletes",
        body: "Avoid ad-hoc DELETE, TRUNCATE, or DROP on v2_* tables in the Supabase SQL Editor. Cascading constraints and orphaned enrollments are hard to recover. Prefer import audit + targeted admin edits.",
      },
      {
        title: "UPDATE preserves enrollment count",
        body: "Normal upsert does not reset current_students on existing sessions. Full replace-all wipes enrollment-linked session rows entirely.",
      },
    ],
    warningLabel: "Warning",
    commandLabel: "Commands",
    prerequisitesLabel: "Before you start",
    pipelineLabel: "Recommended pipeline",
    wideTableLabel: "Schema session CSV (key columns)",
    notesTitle: "Important notes",
    notesItems: [
      "A Campus can only run Programs it has subscribed to. Subscribe first, then create Activities for that Program.",
      "Every Session must use an Offering that belongs to the same Program as its parent Activity.",
      "A Session may optionally link to a Location; that Location must belong to the same Campus as the Activity.",
      "Session card titles on the website usually come from the linked Offering name; dates and price come from the Session.",
      "Use an external Amilia link on a Session when enrollment happens outside Blaze.",
    ],
    bookableYes: "Bookable",
    bookableNo: "Not bookable",
    adminMenuCol: "Admin menu",
    meaningCol: "What it means",
  },
  zh: {
    pageTitle: "管理后台指南",
    pageSubtitle: "官网层级说明，以及如何配置校区、项目、活动与场次",
    tocTitle: "目录",
    operationGuideLabel: "操作指南",
    deploymentGuideLabel: "部署指南",
    operationGuideTitle: "操作指南",
    operationGuideDesc: "面向官网的层级、配置步骤与完整示例",
    deploymentGuideTitle: "部署指南",
    deploymentGuideDesc:
      "Vercel 托管、Google 地图、Gemini AI 对话，以及管理端流量分析（GSC 关键词与 Geography）",
    overviewTitle: "概述",
    overviewDesc: "面向运营人员 — 使用与官网一致的用语",
    overviewBody: [
      "Blaze Robotics Academy 在官网上用五个层级组织内容。只有「场次」可供报名（或跳转外部报名链接）。",
      "本指南说明该层级、管理后台推荐配置顺序、Bellevue 夏令营完整示例，以及如何从表格批量导入场次。文末提供 Vercel、Google 地图与 AI 对话的部署说明。",
    ],
    hierarchyTitle: "产品层级（官网视角）",
    hierarchyIntro:
      "家长浏览路径为：校区 → 地点 → 项目 → 活动 → 场次。前四级用于组织内容；场次为可报名单元。",
    hierarchyLevels: [
      {
        label: "校区 Campus",
        meaning: "区域分支（如 Bellevue）。每个加盟对应一个官网校区。",
        bookable: false,
        adminMenu: `Blaze 设置 → ${L.franchise.plural}`,
      },
      {
        label: "地点 Location",
        meaning: "校区下的实体场所 — 名称、地址、电话、地图。",
        bookable: false,
        adminMenu: `Blaze 内容 → ${L.campus.plural}`,
      },
      {
        label: "项目 Program",
        meaning: "校区内的学习方向（如 Explore、Learn、Compete）。",
        bookable: false,
        adminMenu: `Blaze 设置 → ${L.category.plural}（全局）+ 校区订阅`,
      },
      {
        label: "活动 Activity",
        meaning: "某一校区 + 某一项目下的学期或目录（如「2026 Summer Camps」）。",
        bookable: false,
        adminMenu: `Blaze 内容 → ${L.program.plural}`,
      },
      {
        label: "场次 Session",
        meaning: "具体班级：日期、时间、价格、容量、地点。家长报名对象。",
        bookable: true,
        adminMenu: `Blaze 内容 → ${L.instance.plural}`,
      },
    ],
    hierarchyDiagram:
      "校区（Bellevue）→ 地点（Main Center）→ 项目（Explore）→ 活动（2026 Summer Camps）→ 场次（7 月 6 日那一周…）",
    configTitle: "配置流程",
    configIntro: "新开校区或新学期时建议按以下阶段操作。每步对应管理后台侧栏菜单（名称与官网一致）。",
    configPhases: [
      {
        title: "阶段一 — 全局目录（通常只需配置一次）",
        steps: [
          `在 Blaze 设置中查看${L.offeringType.plural}（camp、course 等），用于定义产品与场次表单字段，一般无需频繁修改。`,
          `在 Blaze 设置 → ${L.category.plural} 创建全局项目（如 Explore、Learn、Compete）。`,
          `在 Blaze 内容 → ${L.offering.plural} 创建产品模板（标题、海报、类型），每个产品归属一个项目。`,
        ],
      },
      {
        title: "阶段二 — 校区设置",
        steps: [
          `在 Blaze 设置 → ${L.franchise.plural} 创建校区（代码、名称、品牌、域名）。`,
          `在 Blaze 设置 → ${L.category.plural} 的「${L.franchise.singular} 订阅」中，为校区订阅要运营的项目。`,
          `在 Blaze 内容 → ${L.campus.plural} 添加地点（地址、联系方式、地图坐标）。`,
        ],
      },
      {
        title: "阶段三 — 活动与场次",
        steps: [
          `在 Blaze 内容 → ${L.program.plural} 为每个「校区 + 项目 + 学期」创建活动（如「2026 Summer Camps」及起止日期）。`,
          `在该活动下（或 Blaze 内容 → ${L.instance.plural}）添加场次：选择产品、排期、可选地点、容量与价格。`,
          `将状态设为已排期/已发布；若需在推荐位展示，可标记为精选。`,
        ],
      },
    ],
    exampleTitle: "示例：Bellevue 夏令营",
    exampleIntro: "以下是从空目录到 Bellevue 校区 Explore 项目可报名场次的完整路径。",
    exampleSteps: [
      { step: "1. 全局项目", detail: "项目「Explore」已存在（Blaze 设置 → Programs）。" },
      { step: "2. 产品模板", detail: "产品「VEX IQ Summer Camp — Full Day」创建于 Explore 下，类型为 Camp（Blaze 内容 → Offerings）。" },
      { step: "3. 校区", detail: "校区「Bellevue」已创建，代码 bellevue（Blaze 设置 → Campuses），并已订阅 Explore。" },
      { step: "4. 地点", detail: "地点「Bellevue Main Center」已添加地址与地图坐标（Blaze 内容 → Locations）。" },
      { step: "5. 活动", detail: "活动「2026 Summer Camps」创建于 Bellevue + Explore，日期 6/1–8/31（Blaze 内容 → Activities）。" },
      {
        step: "6. 场次",
        detail:
          "场次「Week of July 6」：产品「VEX IQ Summer Camp — Full Day」，周一至五 9:00–15:00，地点 Bellevue Main Center，最多 12 人（Blaze 内容 → Activities → 添加场次）。",
      },
      { step: "7. 官网上", detail: "访客进入 Bellevue 校区 → 查看地点 → Explore → 2026 Summer Camps → 报名 7 月 6 日场次。" },
    ],
    templatesTitle: "产品与产品类型（运营视角）",
    templatesBody: [
      "产品类型与产品是后台构建模块，不会在官网上单独作为导航层级展示。",
      "产品类型（如 Camp、Course）决定创建产品与场次时出现哪些扩展字段。",
      "产品是 reusable 模板：卡片标题、海报与默认值。创建场次时选择产品；场次记录排期、价格、容量与报名链接。",
      "简要记法：产品定义「叫什么课」；场次定义「何时何地开课」。",
    ],
    dataOpsTitle: "目录数据运维 — 模型建立与数据分发",
    dataOpsDesc:
      "运营如何将原始学期表格变成官网上线目录：先在 Admin 建立骨架，再通过 CSV 分发产品与场次。",
    dataOpsIntro: [
      "本节假设你已拥有原始运营数据（Excel / Google Sheets / Amilia 导出等）：营名、周次、价格、地点等。",
      "Blaze 将工作分为两阶段：（1）数据模型建立 — 校区、地点、项目、活动等骨架；（2）数据分发 — 先 Offering（产品），再 Instance（场次）。",
      "阶段一主要在 Admin 后台完成（或一次性配置）。阶段二为 CSV 导出 → 编辑 → dry-run → execute，需在配置了 service role 的本机执行。",
    ],
    dataOpsPhases: [
      {
        title: "阶段一 — 数据模型（骨架）",
        summary: "任何产品/场次 CSV 成功导入前必须存在的内容。",
        items: [
          "全局项目（Explore / Learn / Compete）与产品类型（camp、course 等）— 通常较稳定。",
          "校区（franchise）：代码、品牌、域名 — Blaze 设置 → Campuses。",
          "校区订阅要运营的项目 — Blaze 设置 → Programs → 校区订阅。",
          "地点（物理场地）：名称、地址、地图 — Blaze Content → Locations。",
          "活动（学期/目录）：如「2026 Summer Camps」，按校区 + 项目 — Blaze Content → Activities（场次导入前须已存在，不会自动创建）。",
        ],
      },
      {
        title: "阶段二 — 数据分发（产品 → 场次）",
        summary: "家长最终可浏览、报名的批量行。",
        items: [
          "Offering（`v2_offering`）— 产品模板：Title、项目、海报、默认值。每个不重复的课名一行。",
          "Session / Instance（`v2_instance`）— 可排期行：日期、时间、容量、可选地点、Amilia 链接。多个场次可共用同一产品。",
          "顺序固定：产品导入完成且 published 后，才能导入场次。",
        ],
      },
    ],
    dataOpsMappingTitle: "Admin ↔ 数据库 ↔ 官网 ↔ CSV 对照",
    dataOpsMappingRows: [
      {
        admin: "校区 Campus",
        db: "v2_franchise",
        web: "Campus",
        csv: "Location Code（如 bellevue）",
        how: "Admin 后台 — 阶段一",
      },
      {
        admin: "地点 Location",
        db: "v2_campus",
        web: "Location",
        csv: "Location Name（如 Bellevue, WA）",
        how: "Admin 后台 — 阶段一；场次行可选填",
      },
      {
        admin: "项目 Program",
        db: "v2_category",
        web: "Program",
        csv: "Programs (category) / Program (tag)",
        how: "Admin 后台 — 阶段一",
      },
      {
        admin: "活动 Activity",
        db: "v2_program",
        web: "Activity",
        csv: "Activity (program)",
        how: "Admin 后台 — 阶段一（场次导入前必须存在）",
      },
      {
        admin: "产品 Offering",
        db: "v2_offering",
        web: "（仅卡片标题）",
        csv: "Title / Session Title（须一致）",
        how: "CSV — 阶段二步骤 1",
      },
      {
        admin: "场次 Session",
        db: "v2_instance",
        web: "Session",
        csv: "场次行 + 排期列",
        how: "CSV — 阶段二步骤 2",
      },
    ],
    dataOpsOfferingTitle: "组织 Offering（产品模板）",
    dataOpsOfferingBody: [
      "Offering 回答：「这门课叫什么、属于哪个项目、产品默认值（价格、容量、描述、海报）是什么？」",
      "Offering 没有开课日期，可被多个场次复用。",
      "每个 active 产品类型（camp、course、workshop 等）有独立 CSV 文件，动态列来自 `offering_schema`。",
      "引用该 Title 的场次导入前，产品 Status 须为 published（draft → DRAFT_BLOCKED）。",
    ],
    dataOpsOfferingSteps: [
      "Bootstrap 或导出：`node scripts/bootstrap-offering-csv.js` 或 `export-offerings.js --type camp`。",
      "编辑 CSV：新行 id 留空；更新保留 id。Title 与 Program (tag) 须正确。",
      "Dry-run：`import-offerings.js --type camp --file …` 直至 failed = 0。",
      "Execute：加 `--execute`。查看 scripts/output/ 下 JSON 报告。",
    ],
    dataOpsOfferingCols: [
      "id — 新增留空；更新保留",
      "Title — 产品名称；场次 Session Title 须与此匹配",
      "Program (tag) — Explore / Learn / Compete",
      "Status — draft / published / suspended / archived",
      "Image Link — 场次卡片海报",
      "动态列 — 如 content|description、pricing|base_price（因 type 而异）",
    ],
    dataOpsInstanceTitle: "组织 Session / Instance（场次）",
    dataOpsInstanceBody: [
      "场次回答：「这门课何时开、在哪个地点、多少钱、多少容量、家长去哪报名？」",
      "每行通过 Session Title（= 产品 Title）+ 同一项目，关联已有 Offering。",
      "Activity (program) 限定学期（如 2026 Summer Camps）；Location Code 限定校区（franchise）。",
      "Location Name 可选但建议填写 — 关联物理地点（v2_campus）。",
    ],
    dataOpsInstanceSteps: [
      "产品入库后：按 offering type 分别 `export-instances.js --type camp`、`--type course` 等。",
      "编辑 CSV：每个可排期周/班次一行。id 留空 = 新场次。",
      "Dry-run：`import-instances.js --type camp --file …` 直至 failed = 0。",
      "Execute：`--execute`。UPDATE 不会重置 current_students（已报名人数）。",
    ],
    dataOpsInstanceCols: [
      "Location Code — franchise 代码（校区）",
      "Programs (category) + Activity (program) — 须能解析到已有活动",
      "Session Title — 须匹配已 published 的产品 Title",
      "Location Name — 该校区下的物理地点",
      "schedule|start_date、schedule|end_date 等 — 来自该 type 的 instance_schema 动态列",
      "Status、Is Active、Featured、Amilia Link、Notes",
    ],
    dataOpsTermSopTitle: "学期上线 SOP（假设已有原始数据）",
    dataOpsTermSop: [
      {
        step: "准备骨架",
        detail:
          "Admin 中确认校区、订阅、地点，并为新学期创建 Activity（如 Explore / Compete 下的 2026 Summer Camps）。",
      },
      {
        step: "原始数据 → 产品清单",
        detail:
          "从原始表去重课名 → 每个 Title 一行 Offering。指定 Program (tag) 与类型（camp / course）。填写 schema 列（描述、基准价、默认容量）。",
      },
      {
        step: "导入产品",
        detail: "按 type 分文件 → dry-run → execute。需有场次的行确保 Status = published。",
      },
      {
        step: "原始数据 → 场次行",
        detail:
          "每条带日期的记录变成场次：Session Title = 产品 Title，Activity = 学期名，日期/时间/容量/Location Name 来自原始列。Camp、Course 等分到各自 type 的 CSV 文件。",
      },
      {
        step: "导入场次",
        detail: "按 type 分别 dry-run → execute。可用 integrity audit 做导入后检查。",
      },
      {
        step: "官网验收",
        detail: "在官网浏览 校区 → 项目 → 活动，检查精选场次、日历日期、地点与 Amilia 链接。",
      },
    ],
    dataOpsOpsTitle: "日常运维",
    dataOpsOpsItems: [
      "新增课名 → 先 INSERT 产品行，再 INSERT 场次行。",
      "改海报或描述 → UPDATE 产品 CSV（保留 id）。",
      "改某周日期或价格 → UPDATE 场次 CSV（保留 id 或 natural key 匹配）。",
      "新学期 → Admin 新建 Activity + 新场次行；产品 Title 常可复用。",
      "Admin 修改了 offering/instance 类型字段 → 重新 export CSV、迁移列、再 dry-run。",
      "有活跃报名的生产环境勿擅自 --replace-all，须维护窗口 + 备份。",
    ],
    dataOpsTroubleTitle: "常见问题",
    dataOpsTroubleRows: [
      {
        issue: "OFFERING_NOT_FOUND / Session Title 找不到",
        fix: "先导入产品；Title 须完全一致；检查 Programs (category) 是否对齐。",
      },
      {
        issue: "OFFERING_DRAFT / DRAFT_BLOCKED",
        fix: "在 CSV 或 Admin 将产品 Status 设为 published，重新导入产品后再导场次。",
      },
      {
        issue: "PROGRAM_NOT_FOUND / Activity 找不到",
        fix: "在 Admin 创建 Activity，或确保 Activity (program) 与该校区 + 项目下的 v2_program.display_name 一致。",
      },
      {
        issue: "CAMPUS_NOT_FOUND / Location Name 找不到",
        fix: "在 Blaze Content → Locations 添加地点；CSV 使用与后台一致的 display name 或地址。",
      },
      {
        issue: "Schema manifest not found / 找不到 manifest",
        fix: "运行 export-instances.js --type <code> 或 bootstrap-instance-csv.js，使 {basename}-schema.json 与 CSV 同目录。",
      },
      {
        issue: "Instance id not found（空库上大量失败）",
        fix: "新增行清空 id 列，或从自己的库 export — 勿 import 其它项目的 CSV 快照。",
      },
      {
        issue: "新行却变成 UPDATE",
        fix: "清空 id 列；确保 natural key（日期 + 标题 + 活动）唯一。",
      },
    ],
    dataOpsDocRefs:
      "CLI 详细规格：scripts/design/offering-csv-import.md、instance-csv-import.md。Legacy unified 宽表规格已归档至 _archive/scripts/design/unified-instance-import.md。脚本与文件速查见下一节；命令示例见下方「批量数据导入」。",
    dataRefTitle: "脚本与文件速查",
    dataRefDesc: "一页清单：跑哪个 CLI、编辑哪个 CSV/manifest、产出落在哪。",
    dataRefPrereqs: [
      "所有命令在项目根目录执行：node scripts/<script>.js …",
      ".env.local 须含 NEXT_PUBLIC_SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY，且指向目标库（不入库 — 每个 clone 使用自己的 Supabase 项目）。",
      "Schema 模式导入要求 CSV 旁有 companion manifest：{basename}-schema.json（export 时自动写出）。",
      "新 clone 或空库：先对「自己的库」运行 bootstrap-instance-csv.js 或 export-instances.js。勿直接 import 仓库内 scripts/output/Blaze-*.csv 快照 — 可能缺 sibling manifest，且含其它库的 UUID。",
      "Active offering type 列表：node scripts/bootstrap-offering-csv.js --list；完整清单见 scripts/output/offering-types-inventory.md 与 instance-types-inventory.md。",
    ],
    dataRefScriptsTitle: "CLI 脚本",
    dataRefScripts: [
      {
        script: "scripts/bootstrap-offering-csv.js",
        purpose: "为全部 active type 生成产品模板；可选 round-trip 验证",
        when: "首次使用或 offering_schema 变更后",
      },
      {
        script: "scripts/export-offerings.js --type <code>",
        purpose: "DB → Blaze-Offerings-<code>.csv + manifest",
        when: "从现网数据起步，或 schema 变更后刷新列",
      },
      {
        script: "scripts/import-offerings.js --type <code> --file …",
        purpose: "CSV → v2_offering（默认 dry-run；--execute 写入）",
        when: "编辑完产品 CSV 后",
      },
      {
        script: "scripts/bootstrap-instance-csv.js",
        purpose: "为全部 active type 生成场次模板；可选验证",
        when: "首次使用或 instance_schema 变更后",
      },
      {
        script: "scripts/export-instances.js --type <code>",
        purpose: "DB → Blaze-Instances-<code>.csv + manifest",
        when: "按 type 导出场次（camp、course、workshop 等）",
      },
      {
        script: "scripts/import-instances.js --type <code> --file …",
        purpose: "Schema CSV → v2_instance（需文件旁 -schema.json）",
        when: "场次导入（每个 offering type 一份 CSV）",
      },
      {
        script: "scripts/import-instances.js --audit",
        purpose: "v2_instance 外键与孤儿数据完整性检查",
        when: "大批量场次导入前后",
      },
    ],
    dataRefFilesTitle: "数据文件与路径",
    dataRefFiles: [
      {
        path: "scripts/templates/offerings-{code}-template.csv",
        role: "空产品模板（每个 active type 一份）",
        example: "scripts/templates/offerings-camp-template.csv",
      },
      {
        path: "scripts/templates/offerings-{code}-template-schema.json",
        role: "模板 manifest（列快照）",
        example: "scripts/templates/offerings-camp-template-schema.json",
      },
      {
        path: "scripts/output/Blaze-Offerings-{code}.csv",
        role: "默认产品导出 / 工作文件",
        example: "scripts/output/Blaze-Offerings-camp.csv",
      },
      {
        path: "scripts/output/Blaze-Offerings-{code}-schema.json",
        role: "产品导入 manifest（schema 导入必需）",
        example: "scripts/output/Blaze-Offerings-camp-schema.json",
      },
      {
        path: "scripts/templates/instances-{code}-template.csv",
        role: "空场次模板（schema 模式）",
        example: "scripts/templates/instances-camp-template.csv",
      },
      {
        path: "scripts/output/Blaze-Instances-{code}.csv",
        role: "场次导出工作文件（须从自己的库 export；仓库内快照可能缺 sibling manifest）",
        example: "scripts/output/Blaze-Instances-camp.csv",
      },
      {
        path: "scripts/output/Blaze-Instances-{code}-schema.json",
        role: "场次导入 manifest（schema 导入必需）",
        example: "scripts/output/Blaze-Instances-camp-schema.json",
      },
      {
        path: "scripts/output/import-offerings-{code}-*.json",
        role: "产品导入报告（逐行 INSERT/UPDATE/FAILED）",
        example: "每次 import 运行后带时间戳",
      },
      {
        path: "scripts/output/import-instances-{type}-*.json",
        role: "场次导入报告（按 type）",
        example: "每次 import 运行后带时间戳",
      },
      {
        path: "scripts/output/offering-types-inventory.md",
        role: "Active offering type、数量、模板路径",
        example: "bootstrap-offering-csv.js 重新生成",
      },
      {
        path: "scripts/output/instance-types-inventory.md",
        role: "Active instance type、数量、模板路径",
        example: "bootstrap-instance-csv.js 重新生成",
      },
    ],
    dataRefModeTitle: "工作流概览",
    dataRefModes: [
      {
        scenario: "日常运维；每个 offering type 一份 CSV",
        workflow: "Schema 模式（标准）",
        files: "Blaze-Offerings-{code}.csv + manifest → Blaze-Instances-{code}.csv + manifest",
      },
      {
        scenario: "workshop / competition / gift card 等其它类型",
        workflow: "Schema 模式（与 camp/course 相同）",
        files: "每个 type 独立 CSV；bootstrap-instance-csv.js 列出全部 active type",
      },
      {
        scenario: "从 DB 更新已有行",
        workflow: "Export → 编辑 → Import",
        files: "保留 id 列；重新 export 会刷新 id 与 manifest 的 schema_hash",
      },
    ],
    dataRefOrderTitle: "强制顺序",
    dataRefOrderSteps: [
      "阶段一（Admin UI）：校区 → 订阅 → 地点 → 活动",
      "阶段 2a：产品 CSV dry-run → --execute（有场次的行 Status = published）",
      "阶段 2b：场次 CSV dry-run → --execute",
      "阶段三：官网验收；数量异常时运行 --audit",
    ],
    importTitle: "批量数据导入（Schema CSV 流程）",
    importIntro:
      "大批量开学期时，运营通过 CSV 导出/编辑/导入产品，再按 offering type 分别导出/编辑/导入场次。完整规格见 scripts/design/offering-csv-import.md（产品）与 scripts/design/instance-csv-import.md（场次）。",
    importPrerequisites: [
      "管理后台中已配置校区、项目订阅、活动与地点（Activity 须预先存在 — 场次导入不会自动创建）。",
      ".env.local 已配置 NEXT_PUBLIC_SUPABASE_URL 与 SUPABASE_SERVICE_ROLE_KEY，指向你的目标库（本地创建，仓库不含 key）。",
      "新库首次使用：执行 v2 DDL + offering type 种子、完成阶段一 Admin 配置，再从自己的库 bootstrap 或 export — 勿用仓库内 scripts/output/Blaze-*.csv 快照。",
      "在项目根目录、受信任环境执行 — service role 可绕过行级安全策略。",
    ],
    importPipeline: [
      {
        title: "步骤 1 — 导出产品 CSV（或 bootstrap 全部 type）",
        body: "按 --type <code> 导出（active type 清单见 scripts/design/offering-csv-import.md §10），或运行 bootstrap-offering-csv.js 为全部 active type 生成模板并刷新清单。",
      },
      {
        title: "步骤 2 — 编辑并导入产品",
        body: "在 CSV 中增改行（更新保留 id，新增留空 id）。先 dry-run 再 execute。场次导入按 Session Title + 项目匹配产品。",
      },
      {
        title: "步骤 3 — 导出场次并编辑",
        body: "按 offering type：export-instances.js --type <code>（camp、course、workshop 等）。更新保留 id，新增留空 id。导入须配套 {basename}-schema.json。",
      },
      {
        title: "步骤 4 — Dry-run 场次导入",
        body: "import-instances.js --type <code> --file …。校验不写库，failed = 0 后再 execute。",
      },
      {
        title: "步骤 5 — Execute 场次导入",
        body: "追加 --execute。默认按 id（若有）或 natural key upsert。仅明确清空时使用 --replace-all。",
      },
    ],
    importCommands: [
      {
        label: "Bootstrap 全部 active offering type（模板 + 验证 + 清单）",
        cmd: "node scripts/bootstrap-offering-csv.js\n# 列出 type：node scripts/bootstrap-offering-csv.js --list\n# 清单：scripts/output/offering-types-inventory.md",
      },
      {
        label: "导出产品 CSV（含 schema manifest）",
        cmd: "node scripts/export-offerings.js --type <code>\nnode scripts/export-offerings.js --type <code> --write-template",
      },
      {
        label: "导入产品（先 dry-run，再 execute）",
        cmd: "node scripts/import-offerings.js --type <code> --dry-run --file <Blaze-Offerings-<code>.csv>\nnode scripts/import-offerings.js --type <code> --execute --file <Blaze-Offerings-<code>.csv>",
      },
      {
        label: "Bootstrap 全部 active instance type（模板 + 验证 + 清单）",
        cmd: "node scripts/bootstrap-instance-csv.js\n# 列出：node scripts/bootstrap-instance-csv.js --list\n# 清单：scripts/output/instance-types-inventory.md",
      },
      {
        label: "导出场次 CSV（每个 offering type 一份）",
        cmd: "node scripts/export-instances.js --type <code>\nnode scripts/export-instances.js --type <code> --write-template",
      },
      {
        label: "导入场次 — schema 模式（先 dry-run，再 execute）",
        cmd: "node scripts/import-instances.js --type <code> --dry-run --file <Blaze-Instances-<code>.csv>\nnode scripts/import-instances.js --type <code> --execute --file <Blaze-Instances-<code>.csv>",
      },
      {
        label: "完整性审计（导入前后）",
        cmd: "node scripts/import-instances.js --audit\n# 或: node scripts/audit-instances-integrity.js",
      },
    ],
    importClearTitle: "清除已有场次数据",
    importClearBody: [
      "默认导入（不加 --replace-all）只会插入或更新表格中匹配的行。库中已有但不在文件里的场次会保留，可能造成数量不一致或完整性报错。",
      "若要让库内场次与 CSV 完全一致，使用全量重建：",
    ],
    importClearCommand:
      "node scripts/import-instances.js --type <code> --execute --replace-all --file <Blaze-Instances-<code>.csv>",
    importClearNotes: [
      "--replace-all 会先删除 v2_instance 中的全部行（所有 offering type：camp、course、workshop 等），再仅按当前 CSV INSERT。--type 不会限定删除范围。",
      "报名记录及引用已删场次 ID 的数据可能失效。仅在没有线上报名，或已安排维护窗口时使用。",
      "操作不可撤销。生产环境执行前请备份 Supabase 或导出数据。",
      "勿在 SQL Editor 中对目录表（校区、项目、活动、产品）随意 DELETE / TRUNCATE，除非完全理解外键依赖。",
    ],
    importWideTableCols: [
      "Location Code — 校区代码（如 bellevue）",
      "id — 更新保留；新增留空",
      "Programs (category) — Explore / Learn / Compete",
      "Activity (program) — 如 2026 Summer Camps",
      "Session Title — 须与已有产品名称一致",
      "Location Name — 物理地点（v2_campus）；旧 CSV 列名 Campus 仍兼容",
      "schedule|start_date、schedule|end_date、pricing|price_override 等 — 来自 instance_schema",
      "Status、Is Active、Featured、Amilia Link、Notes",
    ],
    importLogs:
      "每次运行生成 scripts/output/import-instances-{type}-<timestamp>.json，含逐行 INSERT / UPDATE / FAILED、错误码与字段 diff。failed > 0 时进程退出码为 1。",
    importWarnings: [
      {
        title: "破坏性操作：--replace-all",
        body: "删除 v2_instance 中全部 type 的行，再仅 INSERT 当前 CSV 中的行；非按 --type 限定。无备份不可恢复。有活跃报名的生产环境切勿擅自执行。",
      },
      {
        title: "生产库写入",
        body: "脚本使用 SUPABASE_SERVICE_ROLE_KEY 直接写库。执行 --execute 前务必确认 .env.local 指向正确环境。",
      },
      {
        title: "务必先 dry-run",
        body: "默认 --dry-run 做完整校验并生成日志但不写库。产品与场次导入均省略 --execute 即为 dry-run。仅当 failed = 0 时再 --execute。",
      },
      {
        title: "Schema drift（manifest 与 DB）",
        body: "若 {basename}-schema.json 的 schema_hash 与现网 instance_schema 不一致，导入会记录 drift 警告但仍继续。Admin 修改类型字段后请重新 export。",
      },
      {
        title: "可选导入参数",
        body: "场次：--publish-referenced-offerings（发布文件中引用的 draft 产品）、--allow-draft-offering（允许 draft 且不自动发布）、--allow-file-duplicates（重复行保留最后一行）。见 scripts/design/instance-csv-import.md。",
      },
      {
        title: "手动 DDL / SQL 删除",
        body: "避免在 Supabase SQL Editor 对 v2_* 表随意 DELETE、TRUNCATE 或 DROP。级联约束与孤儿报名难以恢复。优先使用导入审计 + 后台定点修改。",
      },
      {
        title: "UPDATE 保留报名人数",
        body: "普通 upsert 不会重置已有场次的 current_students。--replace-all 会整表清空场次及相关引用。",
      },
    ],
    warningLabel: "警告",
    commandLabel: "命令示例",
    prerequisitesLabel: "开始前",
    pipelineLabel: "推荐流程",
    wideTableLabel: "Schema 场次 CSV（关键列）",
    notesTitle: "重要说明",
    notesItems: [
      "校区只能运营已订阅的项目；请先订阅，再创建对应活动。",
      "每个场次必须使用与父活动同一项目下的产品。",
      "场次可关联地点；该地点须属于同一校区。",
      "官网场次卡片标题通常来自产品名称；日期与价格来自场次。",
      "若在外部 Amilia 报名，可在场次上填写 Amilia 链接。",
    ],
    bookableYes: "可报名",
    bookableNo: "不可报名",
    adminMenuCol: "后台菜单",
    meaningCol: "含义",
  },
} as const

export const deploymentContent = {
  vercel: {
    en: {
      steps: [
        {
          title: "1. Create project",
          body: 'Sign in at vercel.com → Add New → Project. Import this repository, keep root as ./, framework Next.js.',
        },
        {
          title: "2. Database (Supabase)",
          body: "Create a Supabase project. In SQL Editor, run the v2 DDL scripts in order: 00_helpers.sql through 08_v2_instance.sql (see v2/README.md in the repo). Seed offering types if your environment provides a seed script.",
        },
        {
          title: "3. Supabase keys",
          body: "Settings → API: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (server-only).",
        },
        {
          title: "4. Vercel Blob (uploads)",
          body: "Project → Storage → Blob store. Set BLOB_READ_WRITE_TOKEN in Vercel and .env.local for poster uploads.",
        },
        {
          title: "5. Auth & app URL",
          body: "AUTH_SECRET (openssl rand -base64 32), NEXTAUTH_URL (production URL), NEXT_PUBLIC_APP_URL (same as public site URL for emails and links).",
        },
        {
          title: "6. Email (optional)",
          body: "SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM for verification and newsletter.",
        },
        {
          title: "7. Redeploy",
          body: "Save environment variables and redeploy. After adding a custom domain, update NEXTAUTH_URL and NEXT_PUBLIC_APP_URL.",
        },
      ],
      envTable: [
        { key: "AUTH_SECRET, NEXTAUTH_URL", desc: "Admin/staff authentication (NextAuth)" },
        { key: "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY", desc: "Database" },
        { key: "BLOB_READ_WRITE_TOKEN", desc: "Image uploads (Vercel Blob)" },
        { key: "NEXT_PUBLIC_APP_URL", desc: "Public site URL for emails and absolute links" },
        { key: "SMTP_*", desc: "Outbound email" },
        { key: "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", desc: "Maps embed on location pages (see Google Map)" },
        { key: "GOOGLE_GENERATIVE_AI_API_KEY", desc: "Campus AI chat via Gemini (see Google Gemini)" },
        {
          key: "GSC_SITE_URL, GSC_SERVICE_ACCOUNT_JSON, CRON_SECRET",
          desc: "Search Keywords tab — Google Search Console sync (see Traffic Analytics)",
        },
      ],
    },
    zh: {
      steps: [
        { title: "1. 创建项目", body: "登录 vercel.com → Add New → Project，导入本仓库，根目录 ./，框架 Next.js。" },
        {
          title: "2. 数据库（Supabase）",
          body: "创建 Supabase 项目，在 SQL Editor 按顺序执行 v2 目录下脚本：00_helpers.sql 至 08_v2_instance.sql（见仓库 v2/README.md）。按需执行 offering type 种子数据。",
        },
        { title: "3. Supabase 密钥", body: "Settings → API：NEXT_PUBLIC_SUPABASE_URL、NEXT_PUBLIC_SUPABASE_ANON_KEY、SUPABASE_SERVICE_ROLE_KEY（仅服务端）。" },
        { title: "4. Vercel Blob（上传）", body: "Project → Storage → 创建 Blob，在 Vercel 与 .env.local 配置 BLOB_READ_WRITE_TOKEN。" },
        { title: "5. 认证与应用 URL", body: "AUTH_SECRET、NEXTAUTH_URL（生产 URL）、NEXT_PUBLIC_APP_URL（与对外站点一致，用于邮件与链接）。" },
        { title: "6. 邮件（可选）", body: "SMTP_HOST、SMTP_PORT、SMTP_USER、SMTP_PASSWORD、SMTP_FROM。" },
        { title: "7. 重新部署", body: "保存环境变量后重新部署。绑定自定义域名后更新 NEXTAUTH_URL 与 NEXT_PUBLIC_APP_URL。" },
      ],
      envTable: [
        { key: "AUTH_SECRET、NEXTAUTH_URL", desc: "管理端/员工登录（NextAuth）" },
        { key: "NEXT_PUBLIC_SUPABASE_URL、NEXT_PUBLIC_SUPABASE_ANON_KEY、SUPABASE_SERVICE_ROLE_KEY", desc: "数据库" },
        { key: "BLOB_READ_WRITE_TOKEN", desc: "图片上传（Vercel Blob）" },
        { key: "NEXT_PUBLIC_APP_URL", desc: "对外站点 URL（邮件与绝对链接）" },
        { key: "SMTP_*", desc: "发信" },
        { key: "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", desc: "地点页地图嵌入（见 Google 地图）" },
        { key: "GOOGLE_GENERATIVE_AI_API_KEY", desc: "校区 AI 对话 Gemini（见 Google Gemini）" },
        {
          key: "GSC_SITE_URL、GSC_SERVICE_ACCOUNT_JSON、CRON_SECRET",
          desc: "Search Keywords 标签页 — GSC 同步（见流量分析）",
        },
      ],
    },
  },
  map: {
    en: {
      steps: [
        {
          title: "1. Where maps appear",
          body: "The home page and location pages embed Google Maps when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set. LocationCampuses uses the Maps Embed API with address or latitude/longitude.",
        },
        {
          title: "2. Enable APIs & create key",
          body: "Google Cloud Console → APIs & Services → Library → enable Maps Embed API (and Geocoding API if you geocode addresses). Credentials → Create API key. Restrict: HTTP referrers (your domains + localhost:3000/*); API restrictions → Maps Embed API.",
        },
        {
          title: "3. Configure in the project",
          body: "Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local and Vercel. The NEXT_PUBLIC_ prefix exposes it to the browser — keep referrer restrictions tight.",
        },
      ],
    },
    zh: {
      steps: [
        { title: "1. 地图展示位置", body: "配置 NEXT_PUBLIC_GOOGLE_MAPS_API_KEY 后，首页与地点页会嵌入 Google 地图。LocationCampuses 使用 Maps Embed API，支持地址或经纬度。" },
        { title: "2. 启用 API 并创建 Key", body: "Google Cloud Console → 启用 Maps Embed API（若需地理编码可启用 Geocoding API）→ 创建 API Key → 限制 HTTP referrer 与 API 范围。" },
        { title: "3. 项目配置", body: "在 .env.local 与 Vercel 设置 NEXT_PUBLIC_GOOGLE_MAPS_API_KEY。NEXT_PUBLIC_ 会暴露到浏览器，务必限制 referrer。" },
      ],
    },
  },
  gemini: {
    en: {
      steps: [
        {
          title: "1. Where Gemini is used",
          body: "The campus AI chat button calls /api/ai/chat, which streams responses from Google Gemini (gemini-2.5-flash) via @ai-sdk/google.",
        },
        {
          title: "2. Get an API key",
          body: "Create a key in Google AI Studio (aistudio.google.com/apikey) or enable the Generative Language API in Cloud Console.",
        },
        {
          title: "3. Configure in the project",
          body: "Set GOOGLE_GENERATIVE_AI_API_KEY in .env.local and Vercel (server-only — no NEXT_PUBLIC_ prefix). If you develop behind a proxy, HTTP_PROXY / HTTPS_PROXY are respected by Node.",
        },
      ],
    },
    zh: {
      steps: [
        { title: "1. Gemini 用途", body: "校区页 AI 对话按钮调用 /api/ai/chat，通过 @ai-sdk/google 使用 Gemini（gemini-2.5-flash）流式回复。" },
        { title: "2. 获取 API Key", body: "在 Google AI Studio 或 Cloud Console 启用 Generative Language API 并创建 Key。" },
        { title: "3. 项目配置", body: "在 .env.local 与 Vercel 设置 GOOGLE_GENERATIVE_AI_API_KEY（仅服务端，勿用 NEXT_PUBLIC_）。开发环境若走代理可配置 HTTP_PROXY / HTTPS_PROXY。" },
      ],
    },
  },
  traffic: {
    en: {
      intro:
        "Admin → Traffic (/admin/traffic) shows visits, sources, devices, Search Keywords (Google Search Console), and Geography (country from edge headers). Sources use referrers; keywords must come from GSC — not from referrer URLs.",
      steps: [
        {
          title: "1. Run database migrations (Supabase)",
          body: "In SQL Editor, after backup, run v2/13_traffic_visits_geo.sql (adds country_code, region, city on traffic_visits) and v2/14_traffic_gsc_queries.sql (creates traffic_gsc_queries). When prompted for RLS, prefer Run and enable RLS — the app uses SUPABASE_SERVICE_ROLE_KEY on the server, which bypasses RLS.",
        },
        {
          title: "2. Geography (visitor countries)",
          body: "No extra API key. On Vercel, each new visit stores country/region/city from headers (x-vercel-ip-country, etc.) when POST /api/public/traffic/track runs. Local dev often shows no geo until production. View results under Traffic → Geography.",
        },
        {
          title: "3. Google Cloud — enable Search Console API",
          body: "console.cloud.google.com → pick or create a project → APIs & Services → Library → enable Google Search Console API.",
        },
        {
          title: "4. Create a service account & download JSON key",
          body: "IAM & Admin → Service Accounts → Create → Keys → Add key → JSON. The downloaded file contains client_email (e.g. name@project.iam.gserviceaccount.com) and private_key. Treat the file like a password — never commit it to git.",
        },
        {
          title: "5. Add the service account to Search Console",
          body: "search.google.com/search-console → select the same property as production (domain or URL prefix) → Settings → Users and permissions → Add user → paste client_email from the JSON → Restricted (read performance) or Full access is fine for API read.",
        },
        {
          title: "6. Set GSC_SITE_URL",
          body: "Must match the property identifier exactly. Domain property: sc-domain:example.com (no https). URL-prefix property: https://www.example.com/ (trailing slash as shown in GSC).",
        },
        {
          title: "7. Set GSC_SERVICE_ACCOUNT_JSON",
          body: "In .env.local and Vercel: paste the entire service account JSON on one line, wrapped in single quotes if needed. Or base64-encode the file (macOS: base64 -i key.json | tr -d '\\n') and paste that string — the app accepts either format. Do not use NEXT_PUBLIC_ — server-only.",
        },
        {
          title: "8. Set CRON_SECRET and schedule sync",
          body: "Use the same CRON_SECRET as other cron routes (e.g. newsletter). Trigger sync: GET /api/cron/traffic-gsc-sync with header Authorization: Bearer <CRON_SECRET>. Default pull is the last 3 completed days. Schedule daily on Vercel Cron or an external scheduler. GSC data is usually 2–3 days behind — pick a date range in Admin that includes older dates when verifying.",
        },
        {
          title: "9. Verify in Admin",
          body: "Open /admin/traffic → Search Keywords. If env vars are missing, the tab explains configuration. After a successful cron, queries and top landing pages appear. Compare a single day’s clicks with the GSC UI as a sanity check — do not expect them to match Traffic Sources or Direct visits.",
        },
      ],
      envTable: [
        { key: "GSC_SITE_URL", desc: "Search Console property URL (sc-domain:… or https://…/)" },
        {
          key: "GSC_SERVICE_ACCOUNT_JSON",
          desc: "Service account key JSON (one line) or base64 of that file — server-only",
        },
        { key: "CRON_SECRET", desc: "Protects GET /api/cron/traffic-gsc-sync (Bearer token)" },
        {
          key: "SUPABASE_SERVICE_ROLE_KEY",
          desc: "Required for cron upsert and admin keyword queries (already on Vercel)",
        },
      ],
      notes: [
        "Search Keywords ≠ referrer stats: Google organic often has no referrer and appears as Direct in Traffic Sources.",
        "Use UTM-tagged campaign links for social attribution; GSC does not replace UTM reporting.",
      ],
    },
    zh: {
      intro:
        "管理后台 → Traffic（/admin/traffic）可查看访问、来源、设备、Search Keywords（Google Search Console）与 Geography（访客国家）。来源依赖 referrer；搜索关键词必须用 GSC，不能从 referrer 推导。",
      steps: [
        {
          title: "1. 执行数据库迁移（Supabase）",
          body: "在 SQL Editor 备份后依次执行 v2/13_traffic_visits_geo.sql（为 traffic_visits 增加 country_code、region、city）与 v2/14_traffic_gsc_queries.sql（创建 traffic_gsc_queries）。若询问 RLS，建议选择 Run and enable RLS；服务端使用 SUPABASE_SERVICE_ROLE_KEY，会绕过 RLS。",
        },
        {
          title: "2. Geography（访客国家）",
          body: "无需额外 API Key。部署在 Vercel 后，每次新 visit 在 POST /api/public/traffic/track 时会从边缘头（如 x-vercel-ip-country）写入国家/地区。本地开发通常无 geo 数据，需生产环境。在 Traffic → Geography 查看。",
        },
        {
          title: "3. Google Cloud — 启用 Search Console API",
          body: "打开 console.cloud.google.com → 选择或新建项目 → API 和服务 → 库 → 启用 Google Search Console API。",
        },
        {
          title: "4. 创建服务账号并下载 JSON 密钥",
          body: "IAM 和管理 → 服务账号 → 创建 → 密钥 → 添加密钥 → JSON。下载文件含 client_email（如 xxx@project.iam.gserviceaccount.com）与 private_key。视为密码，勿提交到 Git。",
        },
        {
          title: "5. 在 Search Console 添加服务账号",
          body: "打开 search.google.com/search-console → 选择与生产一致的属性（网域或网址前缀）→ 设置 → 用户和权限 → 添加用户 → 粘贴 JSON 中的 client_email → 权限选「受限」即可（能读搜索效果数据）。",
        },
        {
          title: "6. 配置 GSC_SITE_URL",
          body: "必须与 GSC 属性标识完全一致。网域属性：sc-domain:example.com（不要 https）。网址前缀属性：https://www.example.com/（斜杠与 GSC 显示一致）。",
        },
        {
          title: "7. 配置 GSC_SERVICE_ACCOUNT_JSON",
          body: "在 .env.local 与 Vercel：整份服务账号 JSON 压成一行（可用单引号包裹），或将 JSON 文件 base64 后粘贴一行（macOS：base64 -i key.json | tr -d '\\n'）。勿使用 NEXT_PUBLIC_，仅服务端。",
        },
        {
          title: "8. 配置 CRON_SECRET 并定时同步",
          body: "与 newsletter 等 cron 共用 CRON_SECRET。手动同步：GET /api/cron/traffic-gsc-sync，请求头 Authorization: Bearer <CRON_SECRET>。默认拉取最近 3 个完整日。在 Vercel Cron 或外部调度每日执行。GSC 数据通常滞后 2～3 天，验证时日期范围要覆盖有数据的日期。",
        },
        {
          title: "9. 在管理后台验证",
          body: "打开 /admin/traffic → Search Keywords。未配置环境变量时页面会提示。cron 成功后显示查询词与 Top 落地页。可与 GSC 控制台单日点击抽样对比，不要与 Traffic Sources 或 Direct 访问混为一谈。",
        },
      ],
      envTable: [
        { key: "GSC_SITE_URL", desc: "Search Console 属性 URL（sc-domain:… 或 https://…/）" },
        { key: "GSC_SERVICE_ACCOUNT_JSON", desc: "服务账号密钥 JSON（一行）或该文件的 base64 — 仅服务端" },
        { key: "CRON_SECRET", desc: "保护 GET /api/cron/traffic-gsc-sync（Bearer）" },
        { key: "SUPABASE_SERVICE_ROLE_KEY", desc: "cron 写入与 Admin 关键词查询所需（Vercel 通常已配置）" },
      ],
      notes: [
        "Search Keywords ≠ referrer 统计：Google 自然搜索常无 referrer，在 Traffic Sources 中显示为 Direct。",
        "社交投放请用 UTM 链接；GSC 不能替代 UTM 报表。",
      ],
    },
  },
} as const
