import { adminUiLabels } from "@/lib/admin-ui-labels"

export type GuideLang = "en" | "zh"

export const overviewItem = { id: "overview", titleEn: "Overview", titleZh: "概述" }
export const operationItems = [
  { id: "hierarchy", titleEn: "Product Hierarchy", titleZh: "产品层级" },
  { id: "configuration", titleEn: "Configuration Process", titleZh: "配置流程" },
  { id: "example", titleEn: "Example Walkthrough", titleZh: "配置示例" },
  { id: "templates", titleEn: "Offerings & Templates", titleZh: "产品与模板" },
  { id: "data-import", titleEn: "Bulk Data Import", titleZh: "批量数据导入" },
  { id: "notes", titleEn: "Important Notes", titleZh: "重要说明" },
] as const
export const deploymentItems = [
  { id: "deployment-vercel", titleEn: "Vercel Deployment", titleZh: "Vercel 部署" },
  { id: "deployment-google-map", titleEn: "Google Map", titleZh: "Google 地图" },
  { id: "deployment-google-gemini", titleEn: "Google Gemini", titleZh: "Google Gemini" },
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
    deploymentGuideDesc: "Vercel hosting, Google Maps embeds, and Gemini AI chat",
    overviewTitle: "Overview",
    overviewDesc: "A practical guide for operators — written in the same terms parents see on the website",
    overviewBody: [
      "Blaze Robotics Academy organizes content in five levels that visitors browse on the website. Only Sessions can be enrolled in (or linked to an external enrollment URL).",
      "This guide explains that hierarchy, the recommended setup order in the admin panel, a complete Bellevue summer-camp example, and how to bulk-import sessions from spreadsheets. Deployment steps for Vercel, Google Maps, and AI chat are at the end.",
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
    importTitle: "Bulk data import (unified pipeline)",
    importIntro:
      "For large term rollouts, operators maintain a Raw Data spreadsheet, convert it to import files, then run CLI scripts locally (not from the admin UI). Full specification: scripts/design/unified-instance-import.md.",
    importPrerequisites: [
      "Campuses, Program subscriptions, Activities, and Locations are already configured in the admin panel (or will be auto-created where the import script supports it).",
      ".env.local contains NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY pointing at the target database.",
      "Run commands from the project root on a trusted machine — service role bypasses row-level security.",
    ],
    importPipeline: [
      {
        title: "Step 1 — Extract offerings from Raw (optional if offerings already exist)",
        body: "From Blaze-Data-Raw-*.xlsx, produce Blaze-Offerings-Camp.xlsx / Blaze-Offerings-Course.xlsx (includes Image Link → poster). Use existing import-offerings scripts or your extraction workflow.",
      },
      {
        title: "Step 2 — Import offerings",
        body: "Load product templates (Session card titles, posters, descriptions) before sessions. Session import matches rows by Session Title + Program.",
      },
      {
        title: "Step 3 — Extract unified session sheet from Raw",
        body: "Convert Raw rows into the wide unified CSV (camp + course columns). One Raw row → one Session row. Image Link is not included on the session sheet.",
      },
      {
        title: "Step 4 — Dry-run session import",
        body: "Validate every row without writing. Fix errors using the JSON/log output, then re-run dry-run until failed = 0.",
      },
      {
        title: "Step 5 — Execute session import",
        body: "Write to the database. Default mode upserts by natural key (update existing, insert new). Use --replace-all only when you intend to wipe all sessions first (see warnings).",
      },
    ],
    importCommands: [
      {
        label: "Extract unified session CSV from Raw",
        cmd: "node scripts/extract-instances-from-raw.js --file <Blaze-Data-Raw.xlsx> --out <Blaze-Instances-Unified.csv>",
      },
      {
        label: "Import offerings (dry-run, then execute)",
        cmd: "node scripts/import-offerings-camp.js --dry-run --file <Blaze-Offerings-Camp.xlsx>\nnode scripts/import-offerings-camp.js --execute --file <Blaze-Offerings-Camp.xlsx>",
      },
      {
        label: "Import sessions — dry-run (default, recommended first)",
        cmd: "node scripts/import-instances.js --dry-run --file <Blaze-Instances-Unified.csv>",
      },
      {
        label: "Import sessions — upsert execute",
        cmd: "node scripts/import-instances.js --execute --file <Blaze-Instances-Unified.csv>",
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
      "node scripts/import-instances.js --execute --replace-all --allow-file-duplicates --file <Blaze-Instances-Unified.csv>",
    importClearNotes: [
      "--replace-all deletes every row in the sessions table, then inserts from the file (insert-only).",
      "Enrollment records and any data pointing at deleted session IDs may break. Only use when there are no live enrollments, or after a planned maintenance window.",
      "There is no undo. Take a Supabase backup or export before running destructive imports on production.",
      "Do not run manual SQL DELETE or TRUNCATE on catalog tables (campuses, programs, activities, offerings) unless you fully understand foreign-key dependencies.",
    ],
    importWideTableCols: [
      "Location Code — campus code (e.g. bellevue)",
      "Programs (category) — Explore / Learn / Compete",
      "Activity (program) — e.g. 2026 Summer Camps",
      "Session Title — must match an existing offering name",
      "Campus, Start/End Date, Price Override, Status, Featured, Amilia Link, …",
      "Camp-only or course-only columns — leave irrelevant columns empty per row",
    ],
    importLogs:
      "Each run writes scripts/output/import-instances-<timestamp>.json and .log with per-row actions (INSERT / UPDATE / FAILED), error codes, and field diffs. failed > 0 exits with code 1.",
    importWarnings: [
      {
        title: "Destructive: --replace-all",
        body: "Deletes ALL sessions in the database before import. Irreversible without a backup. Never run on production with active enrollments unless explicitly planned.",
      },
      {
        title: "Production database access",
        body: "Import scripts use SUPABASE_SERVICE_ROLE_KEY and write directly to the database. Double-check .env.local targets the intended environment before --execute.",
      },
      {
        title: "Always dry-run first",
        body: "Default --dry-run performs full validation and produces logs without writing. Only proceed to --execute when the dry-run summary shows zero failures.",
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
    wideTableLabel: "Unified session sheet (key columns)",
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
    deploymentGuideDesc: "Vercel 托管、Google 地图嵌入与 Gemini AI 对话",
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
    importTitle: "批量数据导入（统一流程）",
    importIntro:
      "大批量开学期时，运营维护 Raw Data 表格，转换为导入文件后在本机运行 CLI 脚本（非管理后台上传）。完整规格见 scripts/design/unified-instance-import.md。",
    importPrerequisites: [
      "管理后台中已配置校区、项目订阅、活动与地点（部分可由导入脚本自动补齐）。",
      ".env.local 已配置 NEXT_PUBLIC_SUPABASE_URL 与 SUPABASE_SERVICE_ROLE_KEY，且指向目标库。",
      "在项目根目录、受信任环境执行 — service role 可绕过行级安全策略。",
    ],
    importPipeline: [
      {
        title: "步骤 1 — 从 Raw 提取产品（若产品已存在可跳过）",
        body: "由 Blaze-Data-Raw-*.xlsx 生成 Blaze-Offerings-Camp.xlsx / Blaze-Offerings-Course.xlsx（含 Image Link → 海报）。使用现有 import-offerings 脚本或自有提取流程。",
      },
      {
        title: "步骤 2 — 导入产品（Offerings）",
        body: "先入库产品模板（场次卡片标题、海报、描述），再导入场次。场次导入按 Session Title + 项目匹配产品。",
      },
      {
        title: "步骤 3 — 从 Raw 提取统一场次宽表",
        body: "将 Raw 行转为统一 CSV（camp + course 列并存）。一行 Raw → 一行场次。场次表不含 Image Link。",
      },
      {
        title: "步骤 4 — Dry-run 场次导入",
        body: "校验全部行但不写库。根据 JSON/log 修正错误，直至 failed = 0。",
      },
      {
        title: "步骤 5 — Execute 场次导入",
        body: "写入数据库。默认按 natural key  upsert（有则更新、无则插入）。仅在有明确清空意图时使用 --replace-all（见警告）。",
      },
    ],
    importCommands: [
      {
        label: "从 Raw 提取统一场次 CSV",
        cmd: "node scripts/extract-instances-from-raw.js --file <Blaze-Data-Raw.xlsx> --out <Blaze-Instances-Unified.csv>",
      },
      {
        label: "导入产品（先 dry-run，再 execute）",
        cmd: "node scripts/import-offerings-camp.js --dry-run --file <Blaze-Offerings-Camp.xlsx>\nnode scripts/import-offerings-camp.js --execute --file <Blaze-Offerings-Camp.xlsx>",
      },
      {
        label: "导入场次 — dry-run（默认，建议先执行）",
        cmd: "node scripts/import-instances.js --dry-run --file <Blaze-Instances-Unified.csv>",
      },
      {
        label: "导入场次 — upsert 写入",
        cmd: "node scripts/import-instances.js --execute --file <Blaze-Instances-Unified.csv>",
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
      "node scripts/import-instances.js --execute --replace-all --allow-file-duplicates --file <Blaze-Instances-Unified.csv>",
    importClearNotes: [
      "--replace-all 会先删除场次表中的全部行，再仅按文件 INSERT。",
      "报名记录及引用已删场次 ID 的数据可能失效。仅在没有线上报名，或已安排维护窗口时使用。",
      "操作不可撤销。生产环境执行前请备份 Supabase 或导出数据。",
      "勿在 SQL Editor 中对目录表（校区、项目、活动、产品）随意 DELETE / TRUNCATE，除非完全理解外键依赖。",
    ],
    importWideTableCols: [
      "Location Code — 校区代码（如 bellevue）",
      "Programs (category) — Explore / Learn / Compete",
      "Activity (program) — 如 2026 Summer Camps",
      "Session Title — 须与已有产品名称一致",
      "Campus、起止日期、Price Override、Status、Featured、Amilia Link 等",
      "Camp / Course 专用列 — 每行只填对应类型列，其余留空",
    ],
    importLogs:
      "每次运行生成 scripts/output/import-instances-<timestamp>.json 与 .log，含逐行 INSERT / UPDATE / FAILED、错误码与字段 diff。failed > 0 时进程退出码为 1。",
    importWarnings: [
      {
        title: "破坏性操作：--replace-all",
        body: "导入前删除数据库中全部场次，无备份则无法恢复。有活跃报名的生产环境切勿擅自执行。",
      },
      {
        title: "生产库写入",
        body: "脚本使用 SUPABASE_SERVICE_ROLE_KEY 直接写库。执行 --execute 前务必确认 .env.local 指向正确环境。",
      },
      {
        title: "务必先 dry-run",
        body: "默认 --dry-run 做完整校验并生成日志但不写库。仅当 dry-run 失败数为 0 时再 --execute。",
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
    wideTableLabel: "统一场次宽表（关键列）",
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
} as const
