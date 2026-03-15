'use client'

import { useState, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  BookOpen,
  FolderTree,
  List,
  Calendar,
  ArrowRight,
  Info,
  MapPin,
  Package,
  Layers,
  Shapes,
  Building2,
  Link2,
  Code,
  Settings,
  Mail,
  KeyRound,
  Database,
  CloudCog,
  Loader2,
  Map,
  Sparkles,
  CreditCard,
  LayoutGrid,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface V2OfferingTypeSchema {
  id: string
  code: string
  name: string
  description?: string
  offering_schema: Record<string, unknown>
  instance_schema: Record<string, unknown>
  is_active: boolean
}

function jsonToMarkdownBlock(obj: Record<string, unknown>): string {
  try {
    const json = JSON.stringify(obj, null, 2)
    return "```json\n" + json + "\n```"
  } catch {
    return "```json\n{}\n```"
  }
}

// Table of contents: Overview, Operation Guide (collapsible), Deployment Guide (collapsible)
const overviewItem = { id: "overview", titleEn: "Overview", titleZh: "概述", icon: Info }
const operationItems = [
  { id: "hierarchy", titleEn: "System Hierarchy", titleZh: "系统层级", icon: Layers },
  { id: "workflow", titleEn: "Admin Workflow", titleZh: "管理流程", icon: List },
  { id: "offering-type", titleEn: "Offering Type", titleZh: "产品类型", icon: Shapes },
  { id: "schema-reference", titleEn: "Schema Reference", titleZh: "Schema 参考", icon: Code },
  { id: "schema-by-type", titleEn: "Schema by Offering Type", titleZh: "按类型的 Schema", icon: Shapes },
  { id: "portal-config", titleEn: "Portal config & service role (C-end)", titleZh: "Portal 配置与服务角色（C 端）", icon: Settings },
  { id: "category", titleEn: "Category", titleZh: "分类", icon: FolderTree },
  { id: "offering", titleEn: "Offering", titleZh: "产品", icon: Package },
  { id: "franchise", titleEn: "Franchise & Subscription", titleZh: "加盟与订阅", icon: MapPin },
  { id: "program", titleEn: "Program", titleZh: "项目", icon: List },
  { id: "instance", titleEn: "Instance", titleZh: "场次", icon: Calendar },
  { id: "design-example", titleEn: "Example: Categories & Programs", titleZh: "示例：分类与项目", icon: LayoutGrid },
  { id: "notes", titleEn: "Important Notes", titleZh: "重要说明", icon: BookOpen },
]
const deploymentItems = [
  { id: "deployment-vercel", titleEn: "Vercel Deployment", titleZh: "Vercel 部署", icon: CloudCog },
  { id: "deployment-google-auth", titleEn: "Google Auth", titleZh: "Google 登录", icon: KeyRound },
  { id: "deployment-google-map", titleEn: "Google Map", titleZh: "Google 地图", icon: Map },
  { id: "deployment-google-gemini", titleEn: "Google Gemini", titleZh: "Google Gemini", icon: Sparkles },
  { id: "deployment-stripe", titleEn: "Stripe", titleZh: "Stripe", icon: CreditCard },
]
const allSectionIds = [overviewItem.id, ...operationItems.map((i) => i.id), ...deploymentItems.map((i) => i.id)]

// Bilingual copy for page and main sections
const T = {
  en: {
    pageTitle: "Admin Guide",
    pageSubtitle: "V2 schema-driven design: Library vs. Local Shelf, and how to configure offerings and instances",
    tocTitle: "Table of Contents",
    operationGuideLabel: "Operation Guide",
    deploymentGuideLabel: "Deployment Guide",
    overviewTitle: "Overview",
    overviewDesc: "Configuration-driven (Schema-Driven) design with a global Library and local Shelf model",
    operationGuideTitle: "Operation Guide",
    operationGuideDesc: "Schema-driven workflow and entity reference; click a title to expand or collapse",
    deploymentGuideTitle: "Deployment Guide",
    deploymentGuideDesc: "Vercel, Google (Auth / Map / Gemini), Stripe, and environment setup",
    corePrinciples: "Core principles",
    threePhaseWorkflow: "Three-Phase Admin Workflow",
    phase1: "Phase 1: Global resource modeling",
    phase2: "Phase 2: Franchise initialization",
    phase3: "Phase 3: Scheduling and publishing",
    configLayer: "Config layer",
    library: "Library",
    whatUsersEnroll: "What users enroll in",
    schemaByTypeIntro: "Schemas below are loaded from v2_offering_type. Offering schema defines type_config_data on Offerings; instance schema defines instance_data_ext on Instances.",
    schemaByTypeLoading: "Loading offering types…",
    schemaByTypeEmpty: "No offering types found. Configure them in Admin → Blaze → Offering Types.",
    schemaByTypeOfferingLabel: "offering_schema → type_config_data",
    schemaByTypeInstanceLabel: "instance_schema → instance_data_ext",
    schemaByTypeFooter: "Full schema definitions, including all field properties (placeholder, description, display_scope), are in docs/design/Database_redesign_document_v2.md. The tables v2_offering.type_config_data and v2_instance.instance_data_ext store the actual values; they are validated against the Offering Type's offering_schema and instance_schema.",
    badgeInactive: "Inactive",
  },
  zh: {
    pageTitle: "管理后台指南",
    pageSubtitle: "V2 以 Schema 驱动的设计：图书馆与本地书架，以及如何配置产品与场次",
    tocTitle: "目录",
    operationGuideLabel: "操作指南",
    deploymentGuideLabel: "部署指南",
    overviewTitle: "概述",
    overviewDesc: "以配置驱动（Schema 驱动）的设计：全局图书馆与本地书架模型",
    operationGuideTitle: "操作指南",
    operationGuideDesc: "Schema 驱动的工作流与实体说明；点击标题展开或折叠",
    deploymentGuideTitle: "部署指南",
    deploymentGuideDesc: "Vercel、Google（登录 / 地图 / Gemini）、Stripe 与环境变量配置",
    corePrinciples: "核心原则",
    threePhaseWorkflow: "三阶段管理流程",
    phase1: "阶段一：全局资源建模",
    phase2: "阶段二：加盟初始化",
    phase3: "阶段三：排课与发布",
    configLayer: "配置层",
    library: "图书馆",
    whatUsersEnroll: "用户报名对象",
    schemaByTypeIntro: "以下 Schema 从 v2_offering_type 加载。产品 Schema 定义产品上的 type_config_data；场次 Schema 定义场次上的 instance_data_ext。",
    schemaByTypeLoading: "正在加载产品类型…",
    schemaByTypeEmpty: "未找到产品类型。请在 管理后台 → Blaze → 产品类型 中配置。",
    schemaByTypeOfferingLabel: "offering_schema → type_config_data",
    schemaByTypeInstanceLabel: "instance_schema → instance_data_ext",
    schemaByTypeFooter: "完整 Schema 定义（含 placeholder、description、display_scope 等）见 docs/design/Database_redesign_document_v2.md。v2_offering.type_config_data 与 v2_instance.instance_data_ext 存实际数据，会按产品类型的 offering_schema、instance_schema 校验。",
    badgeInactive: "未启用",
  },
} as const
type Lang = keyof typeof T

export default function AdminGuidePage() {
  const [lang, setLang] = useState<Lang>("en")
  const [activeSection, setActiveSection] = useState<string>("overview")
  const [operationOpen, setOperationOpen] = useState<string[]>(["hierarchy"])
  const [deploymentOpen, setDeploymentOpen] = useState<string[]>(["deployment-vercel"])
  const [offeringTypes, setOfferingTypes] = useState<V2OfferingTypeSchema[]>([])
  const [offeringTypesLoading, setOfferingTypesLoading] = useState(true)
  const [offeringTypesError, setOfferingTypesError] = useState<string | null>(null)
  const t = T[lang]
  const navTitle = (item: { titleEn: string; titleZh: string }) => (lang === "zh" ? item.titleZh : item.titleEn)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setOfferingTypesLoading(true)
      setOfferingTypesError(null)
      try {
        const res = await fetch("/api/admin/offering-types/v2?includeInactive=true")
        if (!res.ok) throw new Error("Failed to fetch offering types")
        const data = await res.json()
        if (!cancelled) setOfferingTypes(data)
      } catch (e) {
        if (!cancelled) setOfferingTypesError(e instanceof Error ? e.message : "Failed to load")
      } finally {
        if (!cancelled) setOfferingTypesLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200
      for (let i = allSectionIds.length - 1; i >= 0; i--) {
        const section = document.getElementById(allSectionIds[i])
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(allSectionIds[i])
          break
        }
      }
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      const offset = 100
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - offset

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      })
    }
    if (operationItems.some((i) => i.id === id)) {
      setOperationOpen((prev) => (prev.includes(id) ? prev : [...prev, id]))
    }
    if (deploymentItems.some((i) => i.id === id)) {
      setDeploymentOpen((prev) => (prev.includes(id) ? prev : [...prev, id]))
    }
  }

  return (
    <div className="flex gap-8 container mx-auto py-8 px-4 max-w-7xl">
      {/* Left Sidebar Navigation */}
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">{t.tocTitle}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <nav className="space-y-1 p-4">
              <button
                onClick={() => scrollToSection(overviewItem.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  activeSection === overviewItem.id
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground"
                )}
              >
                <Info className="h-4 w-4 shrink-0" />
                <span className="text-left">{navTitle(overviewItem)}</span>
              </button>
              <div className="pt-2">
                <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t.operationGuideLabel}</p>
                {operationItems.map((item) => {
                  const Icon = item.icon
                  const isActive = activeSection === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors pl-5",
                        "hover:bg-accent hover:text-accent-foreground",
                        isActive ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="text-left">{navTitle(item)}</span>
                    </button>
                  )
                })}
              </div>
              <div className="pt-2">
                <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t.deploymentGuideLabel}</p>
                {deploymentItems.map((item) => {
                  const Icon = item.icon
                  const isActive = activeSection === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors pl-5",
                        "hover:bg-accent hover:text-accent-foreground",
                        isActive ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="text-left">{navTitle(item)}</span>
                    </button>
                  )
                })}
              </div>
            </nav>
          </CardContent>
        </Card>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">{t.pageTitle}</h1>
            <p className="text-muted-foreground text-lg">
              {t.pageSubtitle}
            </p>
          </div>
          <div className="flex rounded-lg border border-input bg-muted/30 p-0.5">
            <button
              type="button"
              onClick={() => setLang("en")}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                lang === "en" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
              )}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang("zh")}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                lang === "zh" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
              )}
            >
              中文
            </button>
          </div>
        </div>

        {/* Overview */}
        <section id="overview" className="scroll-mt-24">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                {t.overviewTitle}
              </CardTitle>
              <CardDescription>
                {t.overviewDesc}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {lang === "zh" ? (
                    <>V2 数据模型采用<strong> Schema 驱动</strong>：<strong>分类</strong>与<strong>产品</strong>为全局「知识库」资源；<strong>加盟</strong>订阅分类后，在本地创建<strong>项目</strong>与<strong>场次</strong>（「本地书架」）。</>
                  ) : (
                    <>The V2 data model uses a <strong>Schema-Driven</strong> approach. <strong>Category</strong> and{" "}
                    <strong>Offering</strong> are global &quot;knowledge library&quot; resources;{" "}
                    <strong>Franchise</strong> subscribes to categories and turns them into local Programs and Instances
                    (&quot;local shelf&quot;).</>
                  )}
                </p>

                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">{t.corePrinciples}</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>
                      {lang === "zh" ? (
                        <><strong>Schema 驱动：</strong>产品类型定义 <code>offering_schema</code> 与 <code>instance_schema</code>；产品与场次将数据存入 JSONB（<code>type_config_data</code>、<code>instance_data_ext</code>），并按 schema 校验。</>
                      ) : (
                        <><strong>Schema-Driven:</strong> Offering Type defines <code>offering_schema</code> and{" "}
                        <code>instance_schema</code>; Offerings and Instances store data in JSONB (
                        <code>type_config_data</code>, <code>instance_data_ext</code>) validated against these schemas.</>
                      )}
                    </li>
                    <li>
                      {lang === "zh" ? (
                        <><strong>图书馆 vs 书架：</strong>分类与产品为全局且独立；加盟通过 <code>v2_franchise_category_map</code> 订阅分类，并在本地创建项目与场次。</>
                      ) : (
                        <><strong>Library vs. Shelf:</strong> Category and Offering are global and independent; Franchise
                        subscribes to Categories via <code>v2_franchise_category_map</code> and creates Programs and
                        Instances locally.</>
                      )}
                    </li>
                    <li>
                      {lang === "zh" ? (
                        <><strong>可扩展：</strong>新增产品类型只需定义新的 Offering Type 与 schema，无需改表结构。</>
                      ) : (
                        <><strong>Extensibility:</strong> New product types can be added by defining new Offering Types
                        and schemas without changing table structure.</>
                      )}
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Operation Guide (collapsible) */}
        <section id="operation-guide" className="scroll-mt-24">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <List className="h-5 w-5" />
                {t.operationGuideTitle}
              </CardTitle>
              <CardDescription>{t.operationGuideDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" value={operationOpen} onValueChange={setOperationOpen} className="w-full">
                <AccordionItem value="hierarchy" id="hierarchy" className="scroll-mt-24 border rounded-lg px-4 mb-2">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      {navTitle(operationItems[0])}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
              <div className="space-y-4">
                <div className="flex flex-col items-center space-y-3">
                  {/* Config layer */}
                  <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg w-full max-w-md">
                    <Shapes className="h-6 w-6 text-amber-600" />
                    <div className="flex-1">
                      <div className="font-semibold text-lg">Offering Type</div>
                      <div className="text-sm text-muted-foreground">
                        Defines product structure (course, camp, workshop, giftcard…) via offering_schema &amp;
                        instance_schema
                      </div>
                      <Badge variant="outline" className="mt-1">{t.configLayer}</Badge>
                    </div>
                  </div>

                  <ArrowRight className="h-5 w-5 text-muted-foreground" />

                  {/* Library layer */}
                  <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg w-full max-w-md">
                    <FolderTree className="h-6 w-6 text-blue-600" />
                    <div className="flex-1">
                      <div className="font-semibold text-lg">Category</div>
                      <div className="text-sm text-muted-foreground">Global categories (e.g. Beginner Robotics, VEX IQ)</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg w-full max-w-md">
                    <Package className="h-6 w-6 text-blue-600" />
                    <div className="flex-1">
                      <div className="font-semibold text-lg">Offering</div>
                      <div className="text-sm text-muted-foreground">Global product definitions (name, price, type_config_data)</div>
                      <Badge variant="outline" className="mt-1">{t.library}</Badge>
                    </div>
                  </div>

                  <ArrowRight className="h-5 w-5 text-muted-foreground" />

                  {/* Franchise layer */}
                  <div className="flex items-center gap-3 bg-green-50 dark:bg-green-950/20 p-4 rounded-lg w-full max-w-md">
                    <MapPin className="h-6 w-6 text-green-600" />
                    <div className="flex-1">
                      <div className="font-semibold text-lg">Franchise</div>
                      <div className="text-sm text-muted-foreground">Tenant: branding, domain, subscription to Categories</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-green-50 dark:bg-green-950/20 p-4 rounded-lg w-full max-w-md">
                    <Link2 className="h-6 w-6 text-green-600" />
                    <div className="flex-1">
                      <div className="font-semibold text-lg">Franchise–Category Map</div>
                      <div className="text-sm text-muted-foreground">Which categories this franchise subscribes to; is_visible for nav</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-green-50 dark:bg-green-950/20 p-4 rounded-lg w-full max-w-md">
                    <Building2 className="h-6 w-6 text-green-600" />
                    <div className="flex-1">
                      <div className="font-semibold text-lg">Campus</div>
                      <div className="text-sm text-muted-foreground">Locations under a Franchise</div>
                    </div>
                  </div>

                  <ArrowRight className="h-5 w-5 text-muted-foreground" />

                  {/* Operation layer */}
                  <div className="flex items-center gap-3 bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg w-full max-w-md">
                    <List className="h-6 w-6 text-purple-600" />
                    <div className="flex-1">
                      <div className="font-semibold text-lg">Program</div>
                      <div className="text-sm text-muted-foreground">Term/session under Franchise + Category (e.g. Spring 2026)</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg w-full max-w-md">
                    <Calendar className="h-6 w-6 text-purple-600" />
                    <div className="flex-1">
                      <div className="font-semibold text-lg">Instance</div>
                      <div className="text-sm text-muted-foreground">Concrete run: dates, times, capacity, instance_data_ext</div>
                      <Badge variant="outline" className="mt-1">{t.whatUsersEnroll}</Badge>
                    </div>
                  </div>
                </div>
              </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="workflow" id="workflow" className="scroll-mt-24 border rounded-lg px-4 mb-2">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2">
                      <List className="h-4 w-4" />
                      {navTitle(operationItems[1])}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">{t.phase1}</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Define <strong>Offering Types</strong> (offering_schema, instance_schema)</li>
                      <li>Create global <strong>Categories</strong> and optional config_base</li>
                      <li>Create global <strong>Offerings</strong> under categories; fill type_config_data from schema</li>
                    </ul>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">{t.phase2}</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Configure <strong>Franchise</strong> (branding, marketing, domain)</li>
                      <li>Subscribe to <strong>Categories</strong> via Franchise–Category map; set is_visible</li>
                      <li>Add <strong>Campuses</strong> if needed</li>
                    </ul>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">{t.phase3}</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Create <strong>Programs</strong> (Franchise + Category, start/end dates)</li>
                      <li>Create <strong>Instances</strong> under a Program: pick Offering (from that Category), set core fields and instance_data_ext from instance_schema</li>
                    </ul>
                  </div>
                </div>
              </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="offering-type" id="offering-type" className="scroll-mt-24 border rounded-lg px-4 mb-2">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2">
                      <Shapes className="h-4 w-4" />
                      {navTitle(operationItems[2])}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                <strong>Offering Type</strong> is the config brain: it defines what fields an Offering and an Instance
                of that type have. Examples: <code>course</code>, <code>camp</code>, <code>workshop</code>,{" "}
                <code>giftcard</code>, <code>competition</code>, <code>free_trial</code>.
              </p>
              <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                <p><strong>Key fields:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><code>offering_schema</code> (JSONB): structure for Offering <code>type_config_data</code></li>
                  <li><code>instance_schema</code> (JSONB): structure for Instance <code>instance_data_ext</code></li>
                  <li><code>code</code>, <code>name</code>, <code>display_order</code>, <code>is_active</code></li>
                </ul>
                <p className="mt-2">For full schema writing rules, field types, and properties, see <strong>Schema Reference</strong> below.</p>
              </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="schema-reference" id="schema-reference" className="scroll-mt-24 border rounded-lg px-4 mb-2">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      {navTitle(operationItems[3])}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-6">
              {lang === "en" && (
                <>
              <div>
                <h3 className="font-semibold mb-2">Schema structure</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Both <code>offering_schema</code> and <code>instance_schema</code> are JSONB objects with a top-level{" "}
                  <code>fields</code> object. Each key in <code>fields</code> is the field name (stored in{" "}
                  <code>type_config_data</code> or <code>instance_data_ext</code>); the value is the field definition.
                </p>
                <div className="bg-muted p-4 rounded-lg font-mono text-xs overflow-x-auto">
                  <pre>{`{
  "fields": {
    "field_name": {
      "type": "text",
      "label": "Display Label",
      "required": true,
      "display_scope": "both"
    }
  }
}`}</pre>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Data storage:</strong> Offering data defined by <code>offering_schema</code> is stored in{" "}
                  <code>v2_offering.type_config_data</code>. Instance data defined by <code>instance_schema</code> is
                  stored in <code>v2_instance.instance_data_ext</code>. The app validates these JSONB values against
                  the corresponding schema on create/update.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Field types</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Each field must have a <code>type</code>. Supported types and typical use:
                </p>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">Type</th>
                        <th className="text-left p-3 font-medium">Description</th>
                        <th className="text-left p-3 font-medium">Example</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b">
                        <td className="p-3"><code>text</code></td>
                        <td className="p-3">Single-line or multi-line text</td>
                        <td className="p-3"><code>&quot;type&quot;: &quot;text&quot;</code>, use <code>multiline: true</code> for long text</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3"><code>number</code></td>
                        <td className="p-3">Numeric value; supports min, max, step, default</td>
                        <td className="p-3"><code>min: 0, max: 100, step: 0.01</code></td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3"><code>boolean</code></td>
                        <td className="p-3">Checkbox; true/false</td>
                        <td className="p-3"><code>&quot;default&quot;: false</code></td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3"><code>select</code></td>
                        <td className="p-3">Single choice from options</td>
                        <td className="p-3"><code>&quot;options&quot;: [&quot;a&quot;, &quot;b&quot;]</code></td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3"><code>multiselect</code></td>
                        <td className="p-3">Multiple choices from options</td>
                        <td className="p-3"><code>&quot;options&quot;: [&quot;K&quot;, &quot;1&quot;, &quot;2&quot;]</code></td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3"><code>array</code></td>
                        <td className="p-3">List of items (e.g. strings)</td>
                        <td className="p-3"><code>{'"items": { "type": "string" }'}</code></td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3"><code>object</code></td>
                        <td className="p-3">Nested group of fields; stored as a JSON object</td>
                        <td className="p-3"><code>{'"properties": { "sub_field": { "type": "text" } }'}</code></td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3"><code>date</code></td>
                        <td className="p-3">Date picker</td>
                        <td className="p-3"><code>&quot;type&quot;: &quot;date&quot;</code></td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3"><code>time</code></td>
                        <td className="p-3">Time picker</td>
                        <td className="p-3"><code>&quot;type&quot;: &quot;time&quot;</code></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Markdown (rich text):</strong> When <code>type</code> is <code>text</code> and <code>multiline: true</code>, and the field name is <code>target_audience</code>, <code>learning_outcomes</code>, or <code>prerequisites</code>, the admin shows an Edit/Preview Markdown editor and the frontend renders Markdown. See &quot;Markdown editing&quot; in the Offering section above.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">type: object (nested group)</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  A field with <code>type: &quot;object&quot;</code> represents a nested group of fields. The stored value is a JSON object; each key is a sub-field name and the value is whatever the sub-field type defines. Use <code>properties</code> to define the nested schema: keys are property names, values are field definitions (with <code>type</code>, <code>label</code>, <code>default</code>, etc.). Nested properties support the same types as top-level fields (text, number, boolean, select, etc.); <code>text</code> with <code>multiline: true</code> uses the same Markdown/rich-text editor as prerequisites.
                </p>
                <div className="bg-muted p-4 rounded-lg font-mono text-xs overflow-x-auto">
                  <pre>{`"portal_config": {
  "type": "object",
  "label": "C-end display options",
  "display_scope": "admin",
  "default": { "is_course_type": true, "show_meal_service": false },
  "properties": {
    "is_course_type": { "type": "boolean", "label": "Count as course in Portal", "default": true },
    "show_meal_service": { "type": "boolean", "label": "Show Meal Service block", "default": false },
    "notes": { "type": "text", "label": "Internal notes", "multiline": true }
  }
}`}</pre>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  In the admin Configuration tab, object fields render as a bordered group with one control per property (checkbox, input, select, or rich-text editor for multiline text). The whole object is stored in <code>type_config_data</code> or <code>instance_data_ext</code> under the field name (e.g. <code>type_config_data.portal_config</code>).
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Field properties (data items)</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Optional attributes that control label, validation, defaults, and visibility:
                </p>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">Property</th>
                        <th className="text-left p-3 font-medium">Description</th>
                        <th className="text-left p-3 font-medium">Example</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b">
                        <td className="p-3"><code>label</code></td>
                        <td className="p-3">Display label in admin and (if scope allows) on web</td>
                        <td className="p-3"><code>&quot;label&quot;: &quot;Course description&quot;</code></td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3"><code>required</code></td>
                        <td className="p-3">Whether the field must be filled</td>
                        <td className="p-3"><code>&quot;required&quot;: true</code></td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3"><code>default</code></td>
                        <td className="p-3">Default value when creating new Offering/Instance</td>
                        <td className="p-3"><code>&quot;default&quot;: 0</code> or <code>&quot;default&quot;: false</code></td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3"><code>min</code> / <code>max</code></td>
                        <td className="p-3">Numeric or length bounds</td>
                        <td className="p-3"><code>&quot;min&quot;: 0, &quot;max&quot;: 18</code></td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3"><code>step</code></td>
                        <td className="p-3">Step for number input (e.g. 0.01 for currency)</td>
                        <td className="p-3"><code>&quot;step&quot;: 0.01</code></td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3"><code>placeholder</code></td>
                        <td className="p-3">Placeholder text in input</td>
                        <td className="p-3"><code>&quot;placeholder&quot;: &quot;Enter description...&quot;</code></td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3"><code>description</code></td>
                        <td className="p-3">Help text for the field</td>
                        <td className="p-3"><code>&quot;description&quot;: &quot;Max class size&quot;</code></td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3"><code>multiline</code></td>
                        <td className="p-3">Use textarea for text fields</td>
                        <td className="p-3"><code>&quot;multiline&quot;: true</code></td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3"><code>maxLength</code></td>
                        <td className="p-3">Max length for text (optional)</td>
                        <td className="p-3"><code>&quot;maxLength&quot;: 500</code></td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3"><code>options</code></td>
                        <td className="p-3">For select / multiselect: array of choices</td>
                        <td className="p-3"><code>&quot;options&quot;: [&quot;standard&quot;, &quot;vegetarian&quot;]</code></td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3"><code>items</code></td>
                        <td className="p-3">For array: schema of each item</td>
                        <td className="p-3"><code>{'"items": { "type": "string" }'}</code></td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3"><code>properties</code></td>
                        <td className="p-3">For object: nested field definitions (name → field config)</td>
                        <td className="p-3"><code>{'"properties": { "x": { "type": "boolean" } }'}</code></td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3"><code>condition</code></td>
                        <td className="p-3">Show/require this field only when another field matches (see below)</td>
                        <td className="p-3"><code>{'"condition": { "field": "x", "equals": true }'}</code></td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3"><code>display_scope</code></td>
                        <td className="p-3">Who can see this field: admin, web, or both (default: admin)</td>
                        <td className="p-3"><code>&quot;display_scope&quot;: &quot;both&quot;</code></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">display_scope rules</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Controls which side can see the field value. Web-facing APIs should only return fields with{" "}
                  <code>display_scope</code> <code>web</code> or <code>both</code>; admin can see all schema-defined
                  fields.
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li><code>admin</code> — Only admin backend/UI; not returned in public Offering/Instance APIs.</li>
                  <li><code>web</code> — Only shown on web (e.g. product page); admin still has full access.</li>
                  <li><code>both</code> — Visible in admin and in web APIs.</li>
                  <li>If omitted, treated as <code>admin</code> (safe default).</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">condition (conditional display)</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  A field can be shown or required only when another field has a given value. Use <code>condition</code> with:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mb-2">
                  <li><code>field</code> — Name of the other field (same schema). For instance_schema you can reference offering with <code>offering.field_name</code> (e.g. <code>offering.is_multidrop</code>).</li>
                  <li><code>equals</code> — Value that the other field must equal for this field to apply.</li>
                  <li><code>in</code> — Array of values; the other field must be one of these.</li>
                </ul>
                <div className="bg-muted p-4 rounded-lg font-mono text-xs overflow-x-auto">
                  <pre>{`"drop_in_price": {
  "type": "number",
  "label": "Drop-in price",
  "condition": { "field": "is_multidrop", "equals": true }
}
"trial_sessions_count": {
  "type": "number",
  "label": "Trial sessions",
  "condition": { "field": "trial_type", "in": ["multi_session"] }
}`}</pre>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Example: minimal offering_schema</h3>
                <div className="bg-muted p-4 rounded-lg font-mono text-xs overflow-x-auto">
                  <pre>{`{
  "fields": {
    "description": {
      "type": "text",
      "label": "Description",
      "required": true,
      "multiline": true,
      "display_scope": "both"
    },
    "base_price": {
      "type": "number",
      "label": "Base price",
      "required": true,
      "min": 0,
      "step": 0.01,
      "default": 0,
      "display_scope": "both"
    },
    "base_capacity": {
      "type": "number",
      "label": "Default capacity",
      "required": true,
      "min": 1,
      "default": 20,
      "display_scope": "both"
    }
  }
}`}</pre>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg">
                <p className="text-sm">
                  <strong>Validation:</strong> On create/update, the application layer validates <code>type_config_data</code> and{" "}
                  <code>instance_data_ext</code> against the corresponding schema (field names, types, required, min/max, etc.).
                  Invalid payloads are rejected. Optional: DB triggers can perform the same checks.
                </p>
              </div>
                </>
              )}
              {lang === "zh" && (
                <>
              <div>
                <h3 className="font-semibold mb-2">Schema 结构</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  <code>offering_schema</code> 与 <code>instance_schema</code> 均为顶层带 <code>fields</code> 对象的 JSONB。<code>fields</code> 的键为字段名（存入 <code>type_config_data</code> 或 <code>instance_data_ext</code>），值为字段定义。
                </p>
                <div className="bg-muted p-4 rounded-lg font-mono text-xs overflow-x-auto">
                  <pre>{`{
  "fields": {
    "field_name": {
      "type": "text",
      "label": "Display Label",
      "required": true,
      "display_scope": "both"
    }
  }
}`}</pre>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>数据存储：</strong> offering_schema 定义的数据存入 <code>v2_offering.type_config_data</code>；instance_schema 定义的数据存入 <code>v2_instance.instance_data_ext</code>。创建/更新时应用层会按对应 schema 校验这些 JSONB。
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">字段类型</h3>
                <p className="text-sm text-muted-foreground mb-3">每个字段必须有 <code>type</code>。支持的类型及用途：</p>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">类型</th>
                        <th className="text-left p-3 font-medium">说明</th>
                        <th className="text-left p-3 font-medium">示例</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b"><td className="p-3"><code>text</code></td><td className="p-3">单行/多行文本</td><td className="p-3"><code>multiline: true</code> 表示长文本</td></tr>
                      <tr className="border-b"><td className="p-3"><code>number</code></td><td className="p-3">数值；支持 min、max、step、default</td><td className="p-3"><code>min: 0, max: 100, step: 0.01</code></td></tr>
                      <tr className="border-b"><td className="p-3"><code>boolean</code></td><td className="p-3">复选框 true/false</td><td className="p-3"><code>&quot;default&quot;: false</code></td></tr>
                      <tr className="border-b"><td className="p-3"><code>select</code></td><td className="p-3">单选</td><td className="p-3"><code>&quot;options&quot;: [&quot;a&quot;, &quot;b&quot;]</code></td></tr>
                      <tr className="border-b"><td className="p-3"><code>multiselect</code></td><td className="p-3">多选</td><td className="p-3"><code>&quot;options&quot;: [&quot;K&quot;, &quot;1&quot;, &quot;2&quot;]</code></td></tr>
                      <tr className="border-b"><td className="p-3"><code>array</code></td><td className="p-3">列表（如字符串数组）</td><td className="p-3"><code>{'"items": { "type": "string" }'}</code></td></tr>
                      <tr className="border-b"><td className="p-3"><code>object</code></td><td className="p-3">嵌套字段组，存为 JSON 对象</td><td className="p-3"><code>{'"properties": { "sub_field": { "type": "text" } }'}</code></td></tr>
                      <tr className="border-b"><td className="p-3"><code>date</code></td><td className="p-3">日期</td><td className="p-3"><code>&quot;type&quot;: &quot;date&quot;</code></td></tr>
                      <tr className="border-b"><td className="p-3"><code>time</code></td><td className="p-3">时间</td><td className="p-3"><code>&quot;type&quot;: &quot;time&quot;</code></td></tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Markdown（富文本）：</strong> 当 <code>type</code> 为 <code>text</code> 且 <code>multiline: true</code>，且字段名为 <code>target_audience</code>、<code>learning_outcomes</code> 或 <code>prerequisites</code> 时，后台显示 Markdown 编辑/预览，前台按 Markdown 渲染。见上方「产品」中的「Markdown 编辑」。
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">type: object（嵌套组）</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  <code>type: &quot;object&quot;</code> 表示一组嵌套字段，存值为 JSON 对象。用 <code>properties</code> 定义子字段；子字段支持与顶层相同的类型；<code>text</code> 且 <code>multiline: true</code> 时使用与 prerequisites 相同的 Markdown 编辑器。
                </p>
                <div className="bg-muted p-4 rounded-lg font-mono text-xs overflow-x-auto">
                  <pre>{`"portal_config": {
  "type": "object",
  "label": "C-end display options",
  "display_scope": "admin",
  "default": { "is_course_type": true, "show_meal_service": false },
  "properties": {
    "is_course_type": { "type": "boolean", "label": "Count as course in Portal", "default": true },
    "show_meal_service": { "type": "boolean", "label": "Show Meal Service block", "default": false },
    "notes": { "type": "text", "label": "Internal notes", "multiline": true }
  }
}`}</pre>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  在后台配置页中，object 字段以带边框的控件组展示（复选框、输入框、下拉或富文本）。整对象存于 <code>type_config_data</code> / <code>instance_data_ext</code> 下对应字段名（如 <code>type_config_data.portal_config</code>）。
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">字段属性（数据项）</h3>
                <p className="text-sm text-muted-foreground mb-3">用于控制标签、校验、默认值与可见性的可选属性：</p>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">属性</th>
                        <th className="text-left p-3 font-medium">说明</th>
                        <th className="text-left p-3 font-medium">示例</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b"><td className="p-3"><code>label</code></td><td className="p-3">后台及（若 scope 允许）前台的显示标签</td><td className="p-3"><code>&quot;label&quot;: &quot;课程描述&quot;</code></td></tr>
                      <tr className="border-b"><td className="p-3"><code>required</code></td><td className="p-3">是否必填</td><td className="p-3"><code>&quot;required&quot;: true</code></td></tr>
                      <tr className="border-b"><td className="p-3"><code>default</code></td><td className="p-3">新建产品/场次时的默认值</td><td className="p-3"><code>&quot;default&quot;: 0</code> 或 <code>&quot;default&quot;: false</code></td></tr>
                      <tr className="border-b"><td className="p-3"><code>min</code> / <code>max</code></td><td className="p-3">数值或长度范围</td><td className="p-3"><code>&quot;min&quot;: 0, &quot;max&quot;: 18</code></td></tr>
                      <tr className="border-b"><td className="p-3"><code>step</code></td><td className="p-3">数字步长（如 0.01 表示金额）</td><td className="p-3"><code>&quot;step&quot;: 0.01</code></td></tr>
                      <tr className="border-b"><td className="p-3"><code>placeholder</code></td><td className="p-3">输入框占位文案</td><td className="p-3"><code>&quot;placeholder&quot;: &quot;输入描述...&quot;</code></td></tr>
                      <tr className="border-b"><td className="p-3"><code>description</code></td><td className="p-3">字段说明/帮助文案</td><td className="p-3"><code>&quot;description&quot;: &quot;班级最大人数&quot;</code></td></tr>
                      <tr className="border-b"><td className="p-3"><code>multiline</code></td><td className="p-3">文本使用多行输入</td><td className="p-3"><code>&quot;multiline&quot;: true</code></td></tr>
                      <tr className="border-b"><td className="p-3"><code>maxLength</code></td><td className="p-3">文本最大长度（可选）</td><td className="p-3"><code>&quot;maxLength&quot;: 500</code></td></tr>
                      <tr className="border-b"><td className="p-3"><code>options</code></td><td className="p-3">select / multiselect 的选项数组</td><td className="p-3"><code>&quot;options&quot;: [&quot;standard&quot;, &quot;vegetarian&quot;]</code></td></tr>
                      <tr className="border-b"><td className="p-3"><code>items</code></td><td className="p-3">array 的元素 schema</td><td className="p-3"><code>{'"items": { "type": "string" }'}</code></td></tr>
                      <tr className="border-b"><td className="p-3"><code>properties</code></td><td className="p-3">object 的嵌套字段定义</td><td className="p-3"><code>{'"properties": { "x": { "type": "boolean" } }'}</code></td></tr>
                      <tr className="border-b"><td className="p-3"><code>condition</code></td><td className="p-3">仅当某字段满足条件时显示/必填（见下）</td><td className="p-3"><code>{'"condition": { "field": "x", "equals": true }'}</code></td></tr>
                      <tr className="border-b"><td className="p-3"><code>display_scope</code></td><td className="p-3">谁可见：admin、web 或 both（默认 admin）</td><td className="p-3"><code>&quot;display_scope&quot;: &quot;both&quot;</code></td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">display_scope 规则</h3>
                <p className="text-sm text-muted-foreground mb-2">控制字段值对哪端可见。对外 Web API 应只返回 <code>display_scope</code> 为 <code>web</code> 或 <code>both</code> 的字段；后台可查看 schema 定义的全部字段。</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li><code>admin</code> — 仅后台；不出现在公开产品/场次 API 中。</li>
                  <li><code>web</code> — 仅前台（如产品页）；后台仍可查看。</li>
                  <li><code>both</code> — 后台与 Web API 均可见。</li>
                  <li>未写时视为 <code>admin</code>（安全默认）。</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">condition（条件显示）</h3>
                <p className="text-sm text-muted-foreground mb-2">仅当某字段等于某值时才显示或必填该字段。使用 <code>condition</code>：</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mb-2">
                  <li><code>field</code> — 另一字段名（同 schema）。instance_schema 中可用 <code>offering.field_name</code> 引用产品字段（如 <code>offering.is_multidrop</code>）。</li>
                  <li><code>equals</code> — 该字段须等于的值。</li>
                  <li><code>in</code> — 值数组；该字段须为其中之一。</li>
                </ul>
                <div className="bg-muted p-4 rounded-lg font-mono text-xs overflow-x-auto">
                  <pre>{`"drop_in_price": {
  "type": "number",
  "label": "Drop-in price",
  "condition": { "field": "is_multidrop", "equals": true }
}
"trial_sessions_count": {
  "type": "number",
  "label": "Trial sessions",
  "condition": { "field": "trial_type", "in": ["multi_session"] }
}`}</pre>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">示例：最简 offering_schema</h3>
                <div className="bg-muted p-4 rounded-lg font-mono text-xs overflow-x-auto">
                  <pre>{`{
  "fields": {
    "description": {
      "type": "text",
      "label": "Description",
      "required": true,
      "multiline": true,
      "display_scope": "both"
    },
    "base_price": {
      "type": "number",
      "label": "Base price",
      "required": true,
      "min": 0,
      "step": 0.01,
      "default": 0,
      "display_scope": "both"
    },
    "base_capacity": {
      "type": "number",
      "label": "Default capacity",
      "required": true,
      "min": 1,
      "default": 20,
      "display_scope": "both"
    }
  }
}`}</pre>
                </div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg">
                <p className="text-sm">
                  <strong>校验：</strong> 创建/更新时应用层会按 schema 校验 <code>type_config_data</code> 与 <code>instance_data_ext</code>（字段名、类型、必填、min/max 等）。不合法请求会被拒绝。可选：在 DB 层用触发器做相同校验。
                </p>
              </div>
                </>
              )}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="schema-by-type" id="schema-by-type" className="scroll-mt-24 border rounded-lg px-4 mb-2">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2">
                      <Shapes className="h-4 w-4" />
                      {navTitle(operationItems[4])}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-8">
              <p className="text-sm text-muted-foreground mb-4">
                {lang === "en" ? (
                  <>Schemas below are loaded from <code>v2_offering_type</code>. Offering schema defines <code>type_config_data</code> on Offerings; instance schema defines <code>instance_data_ext</code> on Instances.</>
                ) : (
                  <>以下 Schema 从 <code>v2_offering_type</code> 加载。产品 Schema 定义产品上的 <code>type_config_data</code>；场次 Schema 定义场次上的 <code>instance_data_ext</code>。</>
                )}
              </p>
              {offeringTypesLoading && (
                <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>{t.schemaByTypeLoading}</span>
                </div>
              )}
              {offeringTypesError && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                  {offeringTypesError}
                </div>
              )}
              {!offeringTypesLoading && !offeringTypesError && offeringTypes.length === 0 && (
                <p className="text-sm text-muted-foreground">{t.schemaByTypeEmpty}</p>
              )}
              {!offeringTypesLoading && !offeringTypesError && offeringTypes.map((type, index) => (
                <div key={type.id}>
                  <h3 className="text-lg font-semibold mb-1">
                    {index + 1}. {type.name} <span className="font-mono text-sm font-normal text-muted-foreground">({type.code})</span>
                    {!type.is_active && <Badge variant="secondary" className="ml-2">{t.badgeInactive}</Badge>}
                  </h3>
                  {type.description && (
                    <p className="text-sm text-muted-foreground mb-3">{type.description}</p>
                  )}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">{t.schemaByTypeOfferingLabel}</p>
                      <div className="overflow-x-auto max-h-64 overflow-y-auto bg-background p-3 rounded border text-xs font-mono">
                        <ReactMarkdown
                          components={{
                            pre: ({ children }) => <pre className="m-0 whitespace-pre-wrap break-words">{children}</pre>,
                            code: ({ className, children }) => (
                              <code className={cn(className, "text-[11px]")}>{children}</code>
                            ),
                          }}
                        >
                          {jsonToMarkdownBlock((type.offering_schema || {}) as Record<string, unknown>)}
                        </ReactMarkdown>
                      </div>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">{t.schemaByTypeInstanceLabel}</p>
                      <div className="overflow-x-auto max-h-64 overflow-y-auto bg-background p-3 rounded border text-xs font-mono">
                        <ReactMarkdown
                          components={{
                            pre: ({ children }) => <pre className="m-0 whitespace-pre-wrap break-words">{children}</pre>,
                            code: ({ className, children }) => (
                              <code className={cn(className, "text-[11px]")}>{children}</code>
                            ),
                          }}
                        >
                          {jsonToMarkdownBlock((type.instance_schema || {}) as Record<string, unknown>)}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <p className="text-sm text-muted-foreground border-t pt-4">
                {lang === "en" ? (
                  <>Full schema definitions, including all field properties (placeholder, description, display_scope), are in <strong>docs/design/Database_redesign_document_v2.md</strong>. The tables <code>v2_offering.type_config_data</code> and <code>v2_instance.instance_data_ext</code> store the actual values; they are validated against the Offering Type&apos;s <code>offering_schema</code> and <code>instance_schema</code>.</>
                ) : (
                  <>完整 Schema 定义（含 placeholder、description、display_scope 等）见 <strong>docs/design/Database_redesign_document_v2.md</strong>。<code>v2_offering.type_config_data</code> 与 <code>v2_instance.instance_data_ext</code> 存实际数据，会按产品类型的 <code>offering_schema</code>、<code>instance_schema</code> 校验。</>
                )}
              </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="portal-config" id="portal-config" className="scroll-mt-24 border rounded-lg px-4 mb-2">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      {navTitle(operationItems[5])}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-6">
              {lang === "en" && (
                <>
              <p className="text-sm text-muted-foreground">
                Two schema-driven settings control C-end behavior: <strong>portal_config</strong> (whether an offering&apos;s instance detail page shows Meal/Care blocks and whether the instance counts as &quot;course&quot; in Portal) and <strong>portal_service_role</strong> (whether this offering&apos;s instances are listed as Meal Service or Care Service in those blocks). Both live in <code>offering_schema.fields</code> and are stored in <code>v2_offering.type_config_data</code>; <code>portal_service_role</code> is also flattened to <code>v2_instance.portal_service_role</code>.
              </p>

              <div>
                <h3 className="font-semibold mb-2">1. portal_config (C-end display)</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Add a field <code>portal_config</code> of type <code>object</code> with <code>properties</code>: <code>is_course_type</code>, <code>show_meal_service</code>, <code>show_care_service</code>. Stored in <code>type_config_data.portal_config</code>. Used when creating/editing an instance to set <code>v2_instance.is_course_type</code>; C-end uses the booleans to show or hide Meal/Care blocks on the instance detail page.
                </p>
                <div className="bg-muted p-4 rounded-lg font-mono text-xs overflow-x-auto">
                  <pre>{`"portal_config": {
  "type": "object",
  "label": "C 端展示行为",
  "required": false,
  "display_scope": "admin",
  "default": { "is_course_type": true, "show_meal_service": false, "show_care_service": false },
  "properties": {
    "is_course_type": { "type": "boolean", "label": "在 C 端 Portal 中视为课程类", "default": true },
    "show_meal_service": { "type": "boolean", "label": "Instance 详情页推荐/展示 Meal Service", "default": false },
    "show_care_service": { "type": "boolean", "label": "Instance 详情页推荐/展示 Care Service", "default": false }
  }
}`}</pre>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Recommended defaults by type:</strong> camp → show_meal_service true; workshop, competition → show_meal_service + show_care_service true; course, free_trial → both false; care_service, lunch_service → is_course_type false, both false.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">2. portal_service_role (Meal/Care listing)</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Add a field <code>portal_service_role</code> of type <code>select</code> with <code>options: ["", "meal_service", "care_service"]</code>. Stored in <code>type_config_data.portal_service_role</code> and flattened to <code>v2_instance.portal_service_role</code>. C-end filters instances by this column to show &quot;Meal Service&quot; / &quot;Care Service&quot; lists on course-type instance detail pages. You can also set <strong>Offering Type</strong> → &quot;Instance 详情页角色&quot; (v2_offering_type.portal_service_role) so new offerings of that type get this value by default even if the schema field is not in the form.
                </p>
                <div className="bg-muted p-4 rounded-lg font-mono text-xs overflow-x-auto">
                  <pre>{`"portal_service_role": {
  "type": "select",
  "label": "Instance 详情页服务角色",
  "options": ["", "meal_service", "care_service"],
  "display_scope": "admin",
  "default": "care_service"
}`}</pre>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Use <code>default: "meal_service"</code> for lunch_service type; <code>default: "care_service"</code> for care_service type. Empty string means no role (not listed in Meal/Care blocks).
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Schema examples by offering type</h3>
                <div className="overflow-x-auto rounded-md border text-sm">
                  <table className="w-full text-muted-foreground">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">Type (code)</th>
                        <th className="text-left p-3 font-medium">portal_config.default</th>
                        <th className="text-left p-3 font-medium">portal_service_role</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b"><td className="p-3">camp</td><td className="p-3">is_course_type: true, show_meal_service: true, show_care_service: false</td><td className="p-3">— (omit or default &quot;&quot;)</td></tr>
                      <tr className="border-b"><td className="p-3">workshop</td><td className="p-3">is_course_type: true, show_meal_service: true, show_care_service: true</td><td className="p-3">—</td></tr>
                      <tr className="border-b"><td className="p-3">competition</td><td className="p-3">is_course_type: true, show_meal_service: true, show_care_service: true</td><td className="p-3">—</td></tr>
                      <tr className="border-b"><td className="p-3">course, free_trial</td><td className="p-3">is_course_type: true, show_meal_service: false, show_care_service: false</td><td className="p-3">—</td></tr>
                      <tr className="border-b"><td className="p-3">gift_card, care_service, lunch_service</td><td className="p-3">is_course_type: false, show_meal_service: false, show_care_service: false</td><td className="p-3">lunch_service → default &quot;meal_service&quot;; care_service → default &quot;care_service&quot;</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">How these configs are used in Create/Edit flows</h3>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                  <li><strong>Create Offering:</strong> When you pick an Offering Type, the form pre-fills <code>type_config_data</code> from the type&apos;s schema defaults. If the type has <code>portal_config</code> in schema, you get the default object (e.g. show_meal_service/show_care_service). If the type has <code>portal_service_role</code> in schema, the default can come from the type&apos;s &quot;Instance 详情页角色&quot; or from the field&apos;s <code>default</code>. You can change any of these in the Configuration tab before saving.</li>
                  <li><strong>Edit Offering:</strong> The Configuration tab shows all fields from the type&apos;s <code>offering_schema</code>, including <code>portal_config</code> (object with checkboxes) and <code>portal_service_role</code> (select). Saving updates <code>v2_offering.type_config_data</code>. If <code>portal_config.is_course_type</code> or <code>portal_service_role</code> is present in the saved payload, the backend syncs <code>is_course_type</code> and <code>portal_service_role</code> to all <code>v2_instance</code> rows for that offering.</li>
                  <li><strong>Create Instance:</strong> When you create an instance for an offering, the backend reads that offering&apos;s <code>type_config_data.portal_config.is_course_type</code> and <code>type_config_data.portal_service_role</code> (or, if missing, the offering type&apos;s <code>portal_service_role</code> column). It sets <code>v2_instance.is_course_type</code> and <code>v2_instance.portal_service_role</code> on the new row accordingly.</li>
                  <li><strong>Edit Instance:</strong> When you update an instance, the backend again reads the linked offering&apos;s <code>type_config_data</code> (and type&apos;s <code>portal_service_role</code> as fallback) and rewrites <code>is_course_type</code> and <code>portal_service_role</code> on that instance so they stay in sync with the offering.</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-3">
                  Summary: <code>portal_config</code> and <code>portal_service_role</code> are edited only on the <strong>Offering</strong> (or defaulted from Offering Type). Instance create/edit and Offering edit then propagate them to <code>v2_instance</code> so the C-end can filter and display correctly without joining to the offering every time.
                </p>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg text-sm">
                <p><strong>Design doc:</strong> <code>docs/design/INSTANCE_DETAIL_MEAL_CARE_SERVICES_DESIGN.md</code> and <code>docs/design/PORTAL_OFFERING_TYPE_DESIGN.md</code>.</p>
              </div>
                </>
              )}
              {lang === "zh" && (
                <>
              <p className="text-sm text-muted-foreground">
                两项由 Schema 驱动的配置控制 C 端行为：<strong>portal_config</strong>（产品场次详情页是否展示 Meal/Care 区块、是否在 Portal 中计为「课程」）和 <strong>portal_service_role</strong>（该产品场次是否在这些区块中列为 Meal Service / Care Service）。二者均在 <code>offering_schema.fields</code> 中定义，并存入 <code>v2_offering.type_config_data</code>；<code>portal_service_role</code> 还会同步到 <code>v2_instance.portal_service_role</code>。
              </p>
              <div>
                <h3 className="font-semibold mb-2">1. portal_config（C 端展示）</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  在 schema 中新增 <code>portal_config</code> 字段，类型 <code>object</code>，<code>properties</code> 含 <code>is_course_type</code>、<code>show_meal_service</code>、<code>show_care_service</code>。存于 <code>type_config_data.portal_config</code>。创建/编辑场次时用于设置 <code>v2_instance.is_course_type</code>；C 端根据这些布尔值在场次详情页显示或隐藏 Meal/Care 区块。
                </p>
                <div className="bg-muted p-4 rounded-lg font-mono text-xs overflow-x-auto">
                  <pre>{`"portal_config": {
  "type": "object",
  "label": "C 端展示行为",
  "required": false,
  "display_scope": "admin",
  "default": { "is_course_type": true, "show_meal_service": false, "show_care_service": false },
  "properties": {
    "is_course_type": { "type": "boolean", "label": "在 C 端 Portal 中视为课程类", "default": true },
    "show_meal_service": { "type": "boolean", "label": "Instance 详情页推荐/展示 Meal Service", "default": false },
    "show_care_service": { "type": "boolean", "label": "Instance 详情页推荐/展示 Care Service", "default": false }
  }
}`}</pre>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>按类型推荐默认：</strong> camp → show_meal_service true；workshop、competition → show_meal_service + show_care_service true；course、free_trial → 两者 false；care_service、lunch_service → is_course_type false，两者 false。
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">2. portal_service_role（Meal/Care 列表）</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  在 schema 中新增 <code>portal_service_role</code>，类型 <code>select</code>，<code>options: ["", "meal_service", "care_service"]</code>。存于 <code>type_config_data.portal_service_role</code> 并同步到 <code>v2_instance.portal_service_role</code>。C 端按该列筛选场次，在课程类场次详情页展示「Meal Service」/「Care Service」列表。也可在<strong>产品类型</strong>中设置「Instance 详情页角色」（v2_offering_type.portal_service_role），使该类型的新产品默认带该值。
                </p>
                <div className="bg-muted p-4 rounded-lg font-mono text-xs overflow-x-auto">
                  <pre>{`"portal_service_role": {
  "type": "select",
  "label": "Instance 详情页服务角色",
  "options": ["", "meal_service", "care_service"],
  "display_scope": "admin",
  "default": "care_service"
}`}</pre>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  lunch_service 类型建议 <code>default: "meal_service"</code>；care_service 类型建议 <code>default: "care_service"</code>。空字符串表示无角色（不出现在 Meal/Care 区块）。
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">按产品类型的 Schema 示例</h3>
                <div className="overflow-x-auto rounded-md border text-sm">
                  <table className="w-full text-muted-foreground">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">类型 (code)</th>
                        <th className="text-left p-3 font-medium">portal_config.default</th>
                        <th className="text-left p-3 font-medium">portal_service_role</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b"><td className="p-3">camp</td><td className="p-3">is_course_type: true, show_meal_service: true, show_care_service: false</td><td className="p-3">—（省略或默认 &quot;&quot;）</td></tr>
                      <tr className="border-b"><td className="p-3">workshop</td><td className="p-3">is_course_type: true, show_meal_service: true, show_care_service: true</td><td className="p-3">—</td></tr>
                      <tr className="border-b"><td className="p-3">competition</td><td className="p-3">is_course_type: true, show_meal_service: true, show_care_service: true</td><td className="p-3">—</td></tr>
                      <tr className="border-b"><td className="p-3">course, free_trial</td><td className="p-3">is_course_type: true, show_meal_service: false, show_care_service: false</td><td className="p-3">—</td></tr>
                      <tr className="border-b"><td className="p-3">gift_card, care_service, lunch_service</td><td className="p-3">is_course_type: false, show_meal_service: false, show_care_service: false</td><td className="p-3">lunch_service → default &quot;meal_service&quot;；care_service → default &quot;care_service&quot;</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">创建/编辑流程中如何使用</h3>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                  <li><strong>创建产品：</strong>选择产品类型后，表单按该类型 schema 默认值预填 <code>type_config_data</code>。若类型 schema 含 <code>portal_config</code>，会得到默认对象；若含 <code>portal_service_role</code>，默认可来自类型的「Instance 详情页角色」或字段 <code>default</code>。保存前可在配置页修改。</li>
                  <li><strong>编辑产品：</strong>配置页展示该类型 <code>offering_schema</code> 的全部字段（含 <code>portal_config</code>、<code>portal_service_role</code>）。保存后更新 <code>v2_offering.type_config_data</code>；若 payload 中含 <code>portal_config.is_course_type</code> 或 <code>portal_service_role</code>，后端会将该产品的所有 <code>v2_instance</code> 的 <code>is_course_type</code>、<code>portal_service_role</code> 同步更新。</li>
                  <li><strong>创建场次：</strong>创建场次时后端读取该产品的 <code>type_config_data.portal_config.is_course_type</code> 与 <code>type_config_data.portal_service_role</code>（缺失时用产品类型的 <code>portal_service_role</code> 列），并写入新场次的 <code>v2_instance.is_course_type</code>、<code>v2_instance.portal_service_role</code>。</li>
                  <li><strong>编辑场次：</strong>更新场次时后端再次从关联产品读取 <code>type_config_data</code>（及类型的 <code>portal_service_role</code> 兜底），重写该场次的 <code>is_course_type</code>、<code>portal_service_role</code>，与产品保持一致。</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-3">
                  小结：<code>portal_config</code> 与 <code>portal_service_role</code> 仅在<strong>产品</strong>（或产品类型默认）上编辑；场次创建/编辑与产品编辑会将它们同步到 <code>v2_instance</code>，C 端即可按列筛选展示而无需每次 join 产品。
                </p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg text-sm">
                <p><strong>设计文档：</strong> <code>docs/design/INSTANCE_DETAIL_MEAL_CARE_SERVICES_DESIGN.md</code> 与 <code>docs/design/PORTAL_OFFERING_TYPE_DESIGN.md</code>。</p>
              </div>
                </>
              )}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="category" id="category" className="scroll-mt-24 border rounded-lg px-4 mb-2">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2">
                      <FolderTree className="h-4 w-4" />
                      {navTitle(operationItems[6])}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
              {lang === "en" && (
                <>
              <p className="text-sm text-muted-foreground">
                <strong>Category</strong> is global and independent. It represents a theme/domain (e.g. Beginner
                Robotics, VEX IQ, Competition Robotics). Offerings belong to one Category and one Offering Type.
              </p>
              <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                <p><strong>Key points:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Categories are not &quot;Courses / Camps / Workshops&quot;—those are Offering Types.</li>
                  <li>One Category can have many Offering Types (e.g. Course + Camp + Workshop under &quot;Beginner Robotics&quot;).</li>
                  <li>Franchise subscribes to Categories via <code>v2_franchise_category_map</code>; only subscribed categories can have Programs.</li>
                </ul>
              </div>
                </>
              )}
              {lang === "zh" && (
                <>
              <p className="text-sm text-muted-foreground">
                <strong>分类（Category）</strong>是全局且独立的，表示主题/领域（如入门机器人、VEX IQ、竞赛机器人）。产品归属于一个分类和一个产品类型。
              </p>
              <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                <p><strong>要点：</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>分类不是「课程/营地/工作坊」——后者是产品类型（Offering Type）。</li>
                  <li>一个分类下可有多种产品类型（如「入门机器人」下同时有课程、营地、工作坊）。</li>
                  <li>加盟通过 <code>v2_franchise_category_map</code> 订阅分类；只有已订阅的分类才能创建项目。</li>
                </ul>
              </div>
                </>
              )}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="offering" id="offering" className="scroll-mt-24 border rounded-lg px-4 mb-2">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      {navTitle(operationItems[7])}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
              {lang === "en" && (
                <>
              <p className="text-sm text-muted-foreground">
                <strong>Offering</strong> is a global product template: name, description, base_price, poster, and{" "}
                <code>type_config_data</code> (filled according to its Offering Type&apos;s <code>offering_schema</code>).
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Belongs to one <strong>Category</strong> and one <strong>Offering Type</strong>.</li>
                <li>Status: draft, published, suspended, archived. Only <strong>published</strong> Offerings can be used to create Instances.</li>
                <li>No Franchise reference—fully global and reusable across Franchises.</li>
              </ul>

              <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                <h4 className="font-semibold text-sm">Markdown editing (rich text)</h4>
                <p className="text-sm text-muted-foreground">
                  In the Add/Edit Offering dialog, the following fields support <strong>Markdown</strong> editing and preview; the frontend detail page renders them with formatting:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li><strong>Basic Info</strong>: Description (admin only)</li>
                  <li><strong>Configuration</strong> (per offering_schema): <code>target_audience</code>, <code>learning_outcomes</code>, <code>prerequisites</code> — when the schema defines multiline text, the admin shows an Edit/Preview Markdown editor.</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">Markdown syntax for rich-text editing (left: what you type; right: how it appears on the frontend):</p>
                <div className="overflow-x-auto rounded-md border text-sm mt-2">
                  <table className="w-full text-muted-foreground">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2 font-medium w-1/2">Input (Markdown source)</th>
                        <th className="text-left p-2 font-medium">Display effect</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono text-xs">
                      <tr className="border-b"><td className="p-2"><code># Heading</code></td><td className="p-2">Level 1 heading (largest)</td></tr>
                      <tr className="border-b"><td className="p-2"><code>## Subheading</code></td><td className="p-2">Level 2 heading</td></tr>
                      <tr className="border-b"><td className="p-2"><code>### Level 3</code></td><td className="p-2">Level 3 heading</td></tr>
                      <tr className="border-b"><td className="p-2"><code>**bold**</code> or <code>__bold__</code></td><td className="p-2">Bold</td></tr>
                      <tr className="border-b"><td className="p-2"><code>*italic*</code> or <code>_italic_</code></td><td className="p-2">Italic</td></tr>
                      <tr className="border-b"><td className="p-2"><code>***bold italic***</code></td><td className="p-2">Bold + italic</td></tr>
                      <tr className="border-b"><td className="p-2"><code>- item</code> or <code>* item</code></td><td className="p-2">Unordered list (bullets)</td></tr>
                      <tr className="border-b"><td className="p-2"><code>1. First</code> <code>2. Second</code></td><td className="p-2">Ordered list (numbers)</td></tr>
                      <tr className="border-b"><td className="p-2"><code>[link text](https://url)</code></td><td className="p-2">Clickable link (opens in new tab)</td></tr>
                      <tr className="border-b"><td className="p-2"><code>`inline code`</code></td><td className="p-2">Monospace highlight</td></tr>
                      <tr className="border-b"><td className="p-2"><code>&gt; quote</code></td><td className="p-2">Blockquote</td></tr>
                      <tr className="border-b"><td className="p-2">Blank line before next paragraph</td><td className="p-2">New paragraph</td></tr>
                      <tr className="border-b"><td className="p-2"><code>---</code> or <code>***</code> (alone on a line)</td><td className="p-2">Horizontal rule</td></tr>
                    </tbody>
                  </table>
                </div>
                <div className="rounded-md border bg-background p-3 font-mono text-xs overflow-x-auto mt-2">
                  <p className="text-muted-foreground mb-1">Example (learning outcomes):</p>
                  <pre className="whitespace-pre-wrap">{`After this course you will be able to:

- **Understand** basic robotics concepts
- *Build* simple structures hands-on
- Use the [official docs](https://example.com) for reference

> We recommend completing "Intro to Programming" before enrolling.`}</pre>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Content is stored as Markdown source; the frontend Instance detail page uses the same Markdown renderer for consistent display.
                </p>
              </div>
                </>
              )}
              {lang === "zh" && (
                <>
              <p className="text-sm text-muted-foreground">
                <strong>产品（Offering）</strong>是全局产品模板：名称、描述、base_price、海报及 <code>type_config_data</code>（按其产品类型的 <code>offering_schema</code> 填写）。
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>归属于一个<strong>分类</strong>和一个<strong>产品类型</strong>。</li>
                <li>状态：draft、published、suspended、archived。仅<strong>已发布</strong>的产品可用于创建场次。</li>
                <li>无加盟引用，完全全局，可在各加盟间复用。</li>
              </ul>

              <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                <h4 className="font-semibold text-sm">Markdown 编辑（富文本）</h4>
                <p className="text-sm text-muted-foreground">
                  在新增/编辑产品弹窗中，以下字段支持 <strong>Markdown</strong> 编辑与预览；前台详情页会按格式渲染：
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li><strong>基本信息</strong>：描述（仅后台）</li>
                  <li><strong>配置</strong>（按 offering_schema）：<code>target_audience</code>、<code>learning_outcomes</code>、<code>prerequisites</code> — 当 schema 定义为多行文本时，后台会显示编辑/预览 Markdown 编辑器。</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">富文本 Markdown 语法（左：输入；右：前台效果）：</p>
                <div className="overflow-x-auto rounded-md border text-sm mt-2">
                  <table className="w-full text-muted-foreground">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2 font-medium w-1/2">输入（Markdown 源码）</th>
                        <th className="text-left p-2 font-medium">展示效果</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono text-xs">
                      <tr className="border-b"><td className="p-2"><code># Heading</code></td><td className="p-2">一级标题</td></tr>
                      <tr className="border-b"><td className="p-2"><code>## Subheading</code></td><td className="p-2">二级标题</td></tr>
                      <tr className="border-b"><td className="p-2"><code>### Level 3</code></td><td className="p-2">三级标题</td></tr>
                      <tr className="border-b"><td className="p-2"><code>**bold**</code> / <code>__bold__</code></td><td className="p-2">粗体</td></tr>
                      <tr className="border-b"><td className="p-2"><code>*italic*</code> / <code>_italic_</code></td><td className="p-2">斜体</td></tr>
                      <tr className="border-b"><td className="p-2"><code>***bold italic***</code></td><td className="p-2">粗体+斜体</td></tr>
                      <tr className="border-b"><td className="p-2"><code>- item</code> / <code>* item</code></td><td className="p-2">无序列表</td></tr>
                      <tr className="border-b"><td className="p-2"><code>1. First</code> <code>2. Second</code></td><td className="p-2">有序列表</td></tr>
                      <tr className="border-b"><td className="p-2"><code>[link text](https://url)</code></td><td className="p-2">可点击链接（新标签打开）</td></tr>
                      <tr className="border-b"><td className="p-2"><code>`inline code`</code></td><td className="p-2">等宽高亮</td></tr>
                      <tr className="border-b"><td className="p-2"><code>&gt; quote</code></td><td className="p-2">引用块</td></tr>
                      <tr className="border-b"><td className="p-2">段前空行</td><td className="p-2">新段落</td></tr>
                      <tr className="border-b"><td className="p-2"><code>---</code> 或 <code>***</code>（单独一行）</td><td className="p-2">分隔线</td></tr>
                    </tbody>
                  </table>
                </div>
                <div className="rounded-md border bg-background p-3 font-mono text-xs overflow-x-auto mt-2">
                  <p className="text-muted-foreground mb-1">示例（学习成果）：</p>
                  <pre className="whitespace-pre-wrap">{`After this course you will be able to:

- **Understand** basic robotics concepts
- *Build* simple structures hands-on
- Use the [official docs](https://example.com) for reference

> We recommend completing "Intro to Programming" before enrolling.`}</pre>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  内容以 Markdown 源码存储；前台场次详情页使用同一 Markdown 渲染器以保持一致展示。
                </p>
              </div>
                </>
              )}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="franchise" id="franchise" className="scroll-mt-24 border rounded-lg px-4 mb-2">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {navTitle(operationItems[8])}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
              {lang === "en" && (
                <>
              <p className="text-sm text-muted-foreground">
                <strong>Franchise</strong> is the tenant: code, name, domain, branding_config, marketing_config,
                timezone, etc. <strong>Franchise–Category Map</strong> records which global Categories this Franchise
                subscribes to; <code>is_visible</code> controls whether the category appears in the default nav.
              </p>
              <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                <p><strong>Subscription vs visibility:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Subscription: required to create Programs and Instances under that Category.</li>
                  <li>Visibility: <code>is_visible = true</code> shows the category in default nav/list; <code>false</code> can still be used for direct URLs or special pages.</li>
                </ul>
                <p className="mt-2"><strong>Campus</strong> belongs to Franchise; Instances can optionally link to a Campus.</p>
              </div>
                </>
              )}
              {lang === "zh" && (
                <>
              <p className="text-sm text-muted-foreground">
                <strong>加盟（Franchise）</strong>即租户：code、name、domain、branding_config、marketing_config、timezone 等。<strong>加盟–分类映射</strong>记录该加盟订阅了哪些全局分类；<code>is_visible</code> 控制分类是否在默认导航中显示。
              </p>
              <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                <p><strong>订阅与可见性：</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>订阅：在该分类下创建项目和场次的前提。</li>
                  <li>可见性：<code>is_visible = true</code> 时分类出现在默认导航/列表中；<code>false</code> 仍可通过直接 URL 或特殊页面使用。</li>
                </ul>
                <p className="mt-2"><strong>校区（Campus）</strong>归属于加盟；场次可选择性关联到某一校区。</p>
              </div>
                </>
              )}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="program" id="program" className="scroll-mt-24 border rounded-lg px-4 mb-2">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2">
                      <List className="h-4 w-4" />
                      {navTitle(operationItems[9])}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
              {lang === "en" && (
                <>
              <p className="text-sm text-muted-foreground">
                <strong>Program</strong> is an operational unit: e.g. &quot;Spring 2026&quot; for a given Franchise and Category. It has
                <code>start_date</code> and <code>end_date</code>. The Category must be subscribed by the Franchise.
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Program → Franchise (required), Program → Category (required, must be in franchise_category_map).</li>
                <li>Instances belong to a Program and reference a global Offering that belongs to the same Category as the Program.</li>
              </ul>
                </>
              )}
              {lang === "zh" && (
                <>
              <p className="text-sm text-muted-foreground">
                <strong>项目（Program）</strong>是运营单元：例如某加盟某分类下的「2026 春季」。包含 <code>start_date</code> 与 <code>end_date</code>。分类必须已被该加盟订阅。
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>项目 → 加盟（必填）、项目 → 分类（必填，且须在 franchise_category_map 中）。</li>
                <li>场次归属于一个项目，并引用一个与该项目同分类的全局产品。</li>
              </ul>
                </>
              )}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="instance" id="instance" className="scroll-mt-24 border rounded-lg px-4 mb-2">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {navTitle(operationItems[10])}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
              {lang === "en" && (
                <>
              <p className="text-sm text-muted-foreground">
                <strong>Instance</strong> is the enrollable unit: it links a Program and an Offering (from the
                Program&apos;s Category), plus optional Campus. It has core fields (dates, times, session_count,
                days_of_week, max_students, price_override) and <code>instance_data_ext</code> (JSONB from Offering
                Type&apos;s <code>instance_schema</code>).
              </p>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="border rounded-lg p-3">
                  <Badge variant="outline" className="mb-2">scheduled</Badge>
                  <p className="text-sm text-muted-foreground">Enrollment open</p>
                </div>
                <div className="border rounded-lg p-3">
                  <Badge variant="outline" className="mb-2">ongoing</Badge>
                  <p className="text-sm text-muted-foreground">In progress, no new enrollment</p>
                </div>
                <div className="border rounded-lg p-3">
                  <Badge variant="outline" className="mb-2">completed</Badge>
                  <p className="text-sm text-muted-foreground">Ended</p>
                </div>
                <div className="border rounded-lg p-3">
                  <Badge variant="outline" className="mb-2">cancelled</Badge>
                  <p className="text-sm text-muted-foreground">Cancelled</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                <strong>Price:</strong> If <code>price_override</code> is null, effective price is the Offering&apos;s{" "}
                <code>base_price</code>.
              </p>
                </>
              )}
              {lang === "zh" && (
                <>
              <p className="text-sm text-muted-foreground">
                <strong>场次（Instance）</strong>是可报名单元：关联一个项目和一个产品（须属于该项目的分类），以及可选的校区。包含核心字段（日期、时间、session_count、days_of_week、max_students、price_override）和 <code>instance_data_ext</code>（由产品类型的 <code>instance_schema</code> 定义的 JSONB）。
              </p>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="border rounded-lg p-3">
                  <Badge variant="outline" className="mb-2">scheduled</Badge>
                  <p className="text-sm text-muted-foreground">开放报名</p>
                </div>
                <div className="border rounded-lg p-3">
                  <Badge variant="outline" className="mb-2">ongoing</Badge>
                  <p className="text-sm text-muted-foreground">进行中，不再接受新报名</p>
                </div>
                <div className="border rounded-lg p-3">
                  <Badge variant="outline" className="mb-2">completed</Badge>
                  <p className="text-sm text-muted-foreground">已结束</p>
                </div>
                <div className="border rounded-lg p-3">
                  <Badge variant="outline" className="mb-2">cancelled</Badge>
                  <p className="text-sm text-muted-foreground">已取消</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                <strong>价格：</strong>若 <code>price_override</code> 为空，实际价格为产品的 <code>base_price</code>。
              </p>
                </>
              )}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="design-example" id="design-example" className="scroll-mt-24 border rounded-lg px-4 mb-2">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2">
                      <LayoutGrid className="h-4 w-4" />
                      {navTitle(operationItems[11])}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
              {lang === "en" && (
                <>
              <p className="text-sm text-muted-foreground">
                The following example is from an <strong>operator’s perspective</strong>: your organization offers Offering Types such as <strong>Course, Camp, Competition, Workshop</strong>. You need to design Categories and Programs for the site and understand how they relate to Offerings and Instances. Full design details are in <code>docs/design/Database_redesign_document_v2.md</code>.
              </p>

              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <h4 className="font-semibold text-sm">Design principles (summary)</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li><strong>Category</strong> = theme/domain (e.g. Beginner Robotics, Competition Robotics), not product shape. One Category can have many Offering Types (course, camp, workshop, competition).</li>
                  <li><strong>Offering</strong> = global product definition; belongs to one Category + one Offering Type; reusable across Franchises and Programs.</li>
                  <li><strong>Program</strong> = a term/session for a Franchise and a Category (e.g. Spring 2026). Program links Franchise + Category (Franchise must have subscribed to that Category).</li>
                  <li><strong>Instance</strong> = an enrollable run; belongs to one Program and references one Offering (that Offering must belong to the Program’s Category).</li>
                </ul>
              </div>

              <div className="rounded-lg border p-4 space-y-4">
                <h4 className="font-semibold text-sm">Example: organization at a glance</h4>
                <p className="text-xs text-muted-foreground">
                  Assume one Franchise &quot;Blaze Beijing&quot; subscribes to two Categories: &quot;Beginner Robotics&quot; and &quot;Competition Robotics&quot;. Create one Spring 2026 Program per Category, then create several Instances under each Program, each referencing an Offering from that Category.
                </p>
                <div className="grid gap-4 md:grid-cols-2 text-sm">
                  <div className="space-y-2">
                    <p className="font-medium text-muted-foreground">Global layer (Library)</p>
                    <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                      <li><strong>Category</strong>: Beginner Robotics, Competition Robotics</li>
                      <li><strong>Offering</strong> (examples):
                        <ul className="list-disc list-inside ml-2 mt-1">
                          <li>Beginner Robotics → Course &quot;VEX IQ Intro&quot;, Camp &quot;Winter Experience&quot;, Workshop &quot;Weekend Creative Lab&quot;</li>
                          <li>Competition Robotics → Competition &quot;VEX School League&quot;, Course &quot;Competition Strategy&quot;</li>
                        </ul>
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium text-muted-foreground">Operations layer (Franchise + Program + Instance)</p>
                    <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                      <li><strong>Franchise</strong>: Blaze Beijing (subscribed to the two Categories above)</li>
                      <li><strong>Program</strong>: Beginner Robotics · Spring 2026, Competition Robotics · Spring 2026</li>
                      <li><strong>Instance</strong> (examples):
                        <ul className="list-disc list-inside ml-2 mt-1">
                          <li>Under &quot;Beginner Robotics · Spring 2026&quot;: run &quot;VEX IQ Intro&quot; in Jan, &quot;Weekend Creative Lab&quot; in Feb</li>
                          <li>Under &quot;Competition Robotics · Spring 2026&quot;: run &quot;VEX School League&quot; in Mar, &quot;Competition Strategy&quot; in Feb</li>
                        </ul>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="rounded-md border bg-background p-3 font-mono text-xs text-muted-foreground overflow-x-auto">
                  <pre className="whitespace-pre-wrap">{`Category (global)          Offering (global; Category + Offering Type)
─────────────────────────────────────────────────────────────
Beginner Robotics  ──┬── Course:      VEX IQ Intro
                    ├── Camp:        Winter Experience
                    └── Workshop:    Weekend Creative Lab

Competition Robotics ──┬── Competition: VEX School League
                      └── Course:      Competition Strategy

Franchise: Blaze Beijing (subscribed to Beginner Robotics, Competition Robotics)

Program (Franchise + Category + term)    Instance (enrollable runs)
─────────────────────────────────────────────────────────────
Beginner Robotics · Spring 2026   ──┬── Instance of "VEX IQ Intro" (Jan)
                                    └── Instance of "Weekend Creative Lab" (Feb)

Competition Robotics · Spring 2026 ──┬── Instance of "VEX School League" (Mar)
                                    └── Instance of "Competition Strategy" (Feb)`}</pre>
                </div>
                <p className="text-sm text-muted-foreground">
                  <strong>Summary:</strong> Category and Offering are global. Program fixes &quot;who (Franchise) runs which term for which theme (Category)&quot;. Instance is the concrete enrollable run (which product, when, where); the Offering referenced by an Instance must belong to that Program’s Category.
                </p>
              </div>
                </>
              )}
              {lang === "zh" && (
                <>
              <p className="text-sm text-muted-foreground">
                以下示例从<strong>运营者视角</strong>说明：机构提供<strong>课程、营地、竞赛、工作坊</strong>等产品类型，需要为站点设计分类与项目，并理解其与产品、场次的关系。完整设计见 <code>docs/design/Database_redesign_document_v2.md</code>。
              </p>

              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <h4 className="font-semibold text-sm">设计原则（摘要）</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li><strong>分类</strong> = 主题/领域（如入门机器人、竞赛机器人），不是产品形态。一个分类下可有多种产品类型。</li>
                  <li><strong>产品</strong> = 全局产品定义；归属于一个分类 + 一个产品类型；可在各加盟与项目间复用。</li>
                  <li><strong>项目</strong> = 某加盟某分类下的学期/期次（如 2026 春季）。项目关联加盟 + 分类（加盟须已订阅该分类）。</li>
                  <li><strong>场次</strong> = 可报名的一期；归属于一个项目并引用一个产品（该产品须属于项目的分类）。</li>
                </ul>
              </div>

              <div className="rounded-lg border p-4 space-y-4">
                <h4 className="font-semibold text-sm">示例：组织一览</h4>
                <p className="text-xs text-muted-foreground">
                  假设加盟「Blaze 北京」订阅两个分类：「入门机器人」「竞赛机器人」。为每个分类创建一个 2026 春季项目，再在每个项目下创建若干场次，每场次引用该分类下的一个产品。
                </p>
                <div className="grid gap-4 md:grid-cols-2 text-sm">
                  <div className="space-y-2">
                    <p className="font-medium text-muted-foreground">全局层（图书馆）</p>
                    <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                      <li><strong>分类</strong>：入门机器人、竞赛机器人</li>
                      <li><strong>产品</strong>（示例）：
                        <ul className="list-disc list-inside ml-2 mt-1">
                          <li>入门机器人 → 课程「VEX IQ 入门」、营地「冬令营」、工作坊「周末创意工坊」</li>
                          <li>竞赛机器人 → 竞赛「VEX 校际联赛」、课程「竞赛策略」</li>
                        </ul>
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium text-muted-foreground">运营层（加盟 + 项目 + 场次）</p>
                    <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                      <li><strong>加盟</strong>：Blaze 北京（已订阅上述两分类）</li>
                      <li><strong>项目</strong>：入门机器人 · 2026 春季，竞赛机器人 · 2026 春季</li>
                      <li><strong>场次</strong>（示例）：
                        <ul className="list-disc list-inside ml-2 mt-1">
                          <li>「入门机器人 · 2026 春季」下：1 月开「VEX IQ 入门」、2 月开「周末创意工坊」</li>
                          <li>「竞赛机器人 · 2026 春季」下：3 月开「VEX 校际联赛」、2 月开「竞赛策略」</li>
                        </ul>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="rounded-md border bg-background p-3 font-mono text-xs text-muted-foreground overflow-x-auto">
                  <pre className="whitespace-pre-wrap">{`Category (global)          Offering (global; Category + Offering Type)
─────────────────────────────────────────────────────────────
Beginner Robotics  ──┬── Course:      VEX IQ Intro
                    ├── Camp:        Winter Experience
                    └── Workshop:    Weekend Creative Lab

Competition Robotics ──┬── Competition: VEX School League
                      └── Course:      Competition Strategy

Franchise: Blaze Beijing (subscribed to Beginner Robotics, Competition Robotics)

Program (Franchise + Category + term)    Instance (enrollable runs)
─────────────────────────────────────────────────────────────
Beginner Robotics · Spring 2026   ──┬── Instance of "VEX IQ Intro" (Jan)
                                    └── Instance of "Weekend Creative Lab" (Feb)

Competition Robotics · Spring 2026 ──┬── Instance of "VEX School League" (Mar)
                                    └── Instance of "Competition Strategy" (Feb)`}</pre>
                </div>
                <p className="text-sm text-muted-foreground">
                  <strong>小结：</strong>分类与产品是全局的。项目确定「谁（加盟）在哪个主题（分类）下运营哪一期」。场次是具体的可报名期次（哪个产品、何时、何地）；场次引用的产品必须属于该项目的分类。
                </p>
              </div>
                </>
              )}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="notes" id="notes" className="scroll-mt-24 border rounded-lg px-4 mb-2">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      {navTitle(operationItems[12])}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
              {lang === "en" && (
              <div className="space-y-3 text-sm">
                <div className="flex gap-2">
                  <Badge variant="outline" className="shrink-0">1</Badge>
                  <p className="text-muted-foreground">
                    <strong>Category ≠ Offering Type.</strong> Category = theme/domain (e.g. VEX IQ). Offering Type =
                    product shape (course, camp, workshop). One Category can have many Offering Types; one Offering
                    Type appears in many Categories.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="shrink-0">2</Badge>
                  <p className="text-muted-foreground">
                    <strong>Only published Offerings</strong> can be used to create Instances. Draft/suspended/archived
                    cannot be used for new Instances; existing Instances stay active when an Offering is suspended or
                    archived.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="shrink-0">3</Badge>
                  <p className="text-muted-foreground">
                    <strong>Instance Offering must match Program Category.</strong> When creating an Instance, the
                    selected Offering must belong to the same Category as the Program.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="shrink-0">4</Badge>
                  <p className="text-muted-foreground">
                    <strong>Schema validation.</strong> <code>type_config_data</code> and <code>instance_data_ext</code> are
                    validated against the Offering Type&apos;s schemas (application layer; optional DB triggers).
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="shrink-0">5</Badge>
                  <p className="text-muted-foreground">
                    <strong>display_scope.</strong> In schemas, fields can have <code>display_scope</code>: admin, web, or
                    both. Web-facing APIs should only return fields with web or both; admin can see all.
                  </p>
                </div>
              </div>
              )}
              {lang === "zh" && (
              <div className="space-y-3 text-sm">
                <div className="flex gap-2">
                  <Badge variant="outline" className="shrink-0">1</Badge>
                  <p className="text-muted-foreground">
                    <strong>分类 ≠ 产品类型。</strong> 分类 = 主题/领域（如 VEX IQ）；产品类型 = 产品形态（课程、营地、工作坊）。一个分类可有多种产品类型；一种产品类型可出现在多个分类中。
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="shrink-0">2</Badge>
                  <p className="text-muted-foreground">
                    <strong>仅已发布的产品</strong>可用于创建场次。草稿/暂停/归档不能用于新建场次；产品被暂停或归档后，已有场次仍保持有效。
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="shrink-0">3</Badge>
                  <p className="text-muted-foreground">
                    <strong>场次的产品须与项目分类一致。</strong> 创建场次时，所选产品必须属于该项目的同一分类。
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="shrink-0">4</Badge>
                  <p className="text-muted-foreground">
                    <strong>Schema 校验。</strong> <code>type_config_data</code> 与 <code>instance_data_ext</code> 会按产品类型的 schema 校验（应用层；可选 DB 触发器）。
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="shrink-0">5</Badge>
                  <p className="text-muted-foreground">
                    <strong>display_scope。</strong> Schema 中字段可有 <code>display_scope</code>：admin、web 或 both。对外的 Web API 应只返回 web 或 both 的字段；后台可查看全部。
                  </p>
                </div>
              </div>
              )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </section>

        {/* Deployment Guide (collapsible) */}
        <section id="deployment-guide" className="scroll-mt-24">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                {t.deploymentGuideTitle}
              </CardTitle>
              <CardDescription>{t.deploymentGuideDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" value={deploymentOpen} onValueChange={setDeploymentOpen} className="w-full">
                <AccordionItem value="deployment-vercel" id="deployment-vercel" className="scroll-mt-24 border rounded-lg px-4 mb-2">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2">
                      <CloudCog className="h-4 w-4" />
                      {navTitle(deploymentItems[0])}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    {lang === "en" && (
                    <div className="space-y-6 text-sm">
                      <h3 className="font-semibold">1. Create project</h3>
                      <p className="text-muted-foreground">
                        Sign in at <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">vercel.com</a>, click <strong>Add New</strong> → <strong>Project</strong>. Choose your Git provider and authorize if needed.
                      </p>

                      <h3 className="font-semibold">2. Link GitHub repo</h3>
                      <p className="text-muted-foreground">
                        Import the repository that contains this app. Select the correct org/account, pick the repo, set root directory (leave as <code>./</code>), and choose framework <strong>Next.js</strong>. Do not override Build Command / Output unless required.
                      </p>
                      <p className="text-muted-foreground">
                        <strong>Result:</strong> Vercel creates a project and triggers the first build from the default branch.
                      </p>

                      <h3 className="font-semibold">3. Integrate Supabase and get keys</h3>
                      <p className="text-muted-foreground">
                        In <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-primary underline">Supabase Dashboard</a>: create a project (or use existing). Go to <strong>Settings → API</strong>. You need:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li><code>Project URL</code> → use as <code>NEXT_PUBLIC_SUPABASE_URL</code></li>
                        <li><code>anon</code> (public) key → <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code></li>
                        <li><code>service_role</code> key → <code>SUPABASE_SERVICE_ROLE_KEY</code> (server-only, never expose to client)</li>
                      </ul>
                      <p className="text-muted-foreground">
                        Run DB init scripts in Supabase <strong>SQL Editor</strong> (<code>sql/init/00-supabase-init.sql</code>, then <code>01-seed-offering-types.sql</code>) for a new project.
                      </p>

                      <h3 className="font-semibold">4. Integrate Blob Storage and get keys</h3>
                      <p className="text-muted-foreground">
                        This app can use <strong>Vercel Blob</strong> for uploads (e.g. posters). In Vercel: Project → <strong>Storage</strong> → create a Blob store. Then in <strong>Settings → Environment Variables</strong> you will see (or add):
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li><code>BLOB_READ_WRITE_TOKEN</code> — token for server-side uploads/downloads</li>
                      </ul>
                      <p className="text-muted-foreground">
                        Add the same variable in <code>.env.local</code> for local dev; use the token from the Vercel Blob dashboard for the store linked to the project.
                      </p>

                      <h3 className="font-semibold">5. Integrate AI Gateway and get API key</h3>
                      <p className="text-muted-foreground">
                        If the app uses an AI Gateway (e.g. for chat or AI features), create an API key in the gateway provider dashboard and set it as <code>AI_GATEWAY_API_KEY</code> or the variable name used in the codebase. Add it in Vercel Environment Variables and in <code>.env.local</code> for local runs.
                      </p>

                      <h3 className="font-semibold">6. Vercel environment variables</h3>
                      <p className="text-muted-foreground">
                        In Vercel: Project → <strong>Settings → Environment Variables</strong>. Add every variable your app needs (Production and optionally Preview):
                      </p>
                      <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="text-left p-3 font-medium">Variable</th>
                              <th className="text-left p-3 font-medium">Description</th>
                            </tr>
                          </thead>
                          <tbody className="text-muted-foreground">
                            <tr className="border-b"><td className="p-3"><code>AUTH_SECRET</code></td><td className="p-3">NextAuth secret (e.g. <code>openssl rand -base64 32</code>)</td></tr>
                            <tr className="border-b"><td className="p-3"><code>NEXTAUTH_URL</code></td><td className="p-3">Production URL, e.g. <code>https://your-app.vercel.app</code></td></tr>
                            <tr className="border-b"><td className="p-3"><code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, <code>SUPABASE_SERVICE_ROLE_KEY</code></td><td className="p-3">Supabase (step 3)</td></tr>
                            <tr className="border-b"><td className="p-3"><code>BLOB_READ_WRITE_TOKEN</code></td><td className="p-3">Vercel Blob (step 4)</td></tr>
                            <tr className="border-b"><td className="p-3"><code>GOOGLE_CLIENT_ID</code>, <code>GOOGLE_CLIENT_SECRET</code></td><td className="p-3">Google OAuth (see Google Auth)</td></tr>
                            <tr className="border-b"><td className="p-3"><code>SMTP_*</code>, <code>NEXT_PUBLIC_APP_URL</code></td><td className="p-3">Mail and app URL</td></tr>
                            <tr className="border-b"><td className="p-3"><code>STRIPE_*</code></td><td className="p-3">Stripe (see Stripe section)</td></tr>
                          </tbody>
                        </table>
                      </div>
                      <p className="text-muted-foreground">
                        After saving, redeploy so new variables take effect. Use <code>NEXTAUTH_URL</code> and <code>NEXT_PUBLIC_APP_URL</code> set to your production domain once you add a custom domain.
                      </p>
                    </div>
                    )}
                    {lang === "zh" && (
                    <div className="space-y-6 text-sm">
                      <h3 className="font-semibold">1. 创建项目</h3>
                      <p className="text-muted-foreground">
                        登录 <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">vercel.com</a>，点击 <strong>Add New</strong> → <strong>Project</strong>。选择 Git 提供商并按需授权。
                      </p>
                      <h3 className="font-semibold">2. 关联 GitHub 仓库</h3>
                      <p className="text-muted-foreground">
                        导入包含本应用的仓库。选择正确的组织/账号、仓库，根目录保持 <code>./</code>，框架选 <strong>Next.js</strong>。非必要不要改 Build Command / Output。
                      </p>
                      <p className="text-muted-foreground">
                        <strong>结果：</strong> Vercel 会创建项目并从默认分支触发首次构建。
                      </p>
                      <h3 className="font-semibold">3. 集成 Supabase 并获取密钥</h3>
                      <p className="text-muted-foreground">
                        在 <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-primary underline">Supabase Dashboard</a> 中创建或选择项目，进入 <strong>Settings → API</strong>。需要：
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li><code>Project URL</code> → 用作 <code>NEXT_PUBLIC_SUPABASE_URL</code></li>
                        <li><code>anon</code>（公开）key → <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code></li>
                        <li><code>service_role</code> key → <code>SUPABASE_SERVICE_ROLE_KEY</code>（仅服务端，勿暴露给前端）</li>
                      </ul>
                      <p className="text-muted-foreground">
                        新项目在 Supabase <strong>SQL Editor</strong> 中执行初始化脚本（<code>sql/init/00-supabase-init.sql</code>，再 <code>01-seed-offering-types.sql</code>）。
                      </p>
                      <h3 className="font-semibold">4. 集成 Blob 存储并获取密钥</h3>
                      <p className="text-muted-foreground">
                        本应用可使用 <strong>Vercel Blob</strong> 做上传（如海报）。在 Vercel：Project → <strong>Storage</strong> → 创建 Blob 存储。在 <strong>Settings → Environment Variables</strong> 中会看到（或需添加）<code>BLOB_READ_WRITE_TOKEN</code>（服务端上传/下载用）。本地开发在 <code>.env.local</code> 中添加同名变量，值从 Vercel Blob 控制台获取。
                      </p>
                      <h3 className="font-semibold">5. 集成 AI Gateway 并获取 API Key</h3>
                      <p className="text-muted-foreground">
                        若使用 AI Gateway（如聊天或 AI 功能），在网关提供方控制台创建 API Key，设为 <code>AI_GATEWAY_API_KEY</code> 或代码中使用的变量名，并在 Vercel 环境变量与 <code>.env.local</code> 中配置。
                      </p>
                      <h3 className="font-semibold">6. Vercel 环境变量</h3>
                      <p className="text-muted-foreground">
                        在 Vercel：Project → <strong>Settings → Environment Variables</strong>。添加应用所需的全部变量（Production 及可选 Preview）。保存后重新部署使变量生效。配置自定义域名后，将 <code>NEXTAUTH_URL</code> 与 <code>NEXT_PUBLIC_APP_URL</code> 设为生产域名。
                      </p>
                      <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="text-left p-3 font-medium">变量</th>
                              <th className="text-left p-3 font-medium">说明</th>
                            </tr>
                          </thead>
                          <tbody className="text-muted-foreground">
                            <tr className="border-b"><td className="p-3"><code>AUTH_SECRET</code></td><td className="p-3">NextAuth 密钥（如 <code>openssl rand -base64 32</code>）</td></tr>
                            <tr className="border-b"><td className="p-3"><code>NEXTAUTH_URL</code></td><td className="p-3">生产 URL，如 <code>https://your-app.vercel.app</code></td></tr>
                            <tr className="border-b"><td className="p-3"><code>NEXT_PUBLIC_SUPABASE_URL</code>、<code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>、<code>SUPABASE_SERVICE_ROLE_KEY</code></td><td className="p-3">Supabase（步骤 3）</td></tr>
                            <tr className="border-b"><td className="p-3"><code>BLOB_READ_WRITE_TOKEN</code></td><td className="p-3">Vercel Blob（步骤 4）</td></tr>
                            <tr className="border-b"><td className="p-3"><code>GOOGLE_CLIENT_ID</code>、<code>GOOGLE_CLIENT_SECRET</code></td><td className="p-3">Google OAuth（见 Google 登录）</td></tr>
                            <tr className="border-b"><td className="p-3"><code>SMTP_*</code>、<code>NEXT_PUBLIC_APP_URL</code></td><td className="p-3">邮件与应用 URL</td></tr>
                            <tr className="border-b"><td className="p-3"><code>STRIPE_*</code></td><td className="p-3">Stripe（见 Stripe 小节）</td></tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                    )}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="deployment-google-auth" id="deployment-google-auth" className="scroll-mt-24 border rounded-lg px-4 mb-2">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4" />
                      {navTitle(deploymentItems[1])}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    {lang === "en" && (
                    <div className="space-y-6 text-sm">
                      <h3 className="font-semibold">1. Get Client ID and Secret</h3>
                      <p className="text-muted-foreground">
                        In <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google Cloud Console</a>: create or select a project → <strong>APIs &amp; Services → Credentials</strong> → <strong>Create Credentials → OAuth client ID</strong>. Application type: <strong>Web application</strong>. You get:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li><strong>Client ID</strong> → <code>GOOGLE_CLIENT_ID</code></li>
                        <li><strong>Client Secret</strong> → <code>GOOGLE_CLIENT_SECRET</code></li>
                      </ul>

                      <h3 className="font-semibold">2. Configure in project and Google</h3>
                      <p className="text-muted-foreground">
                        <strong>In Google Console:</strong> In the same OAuth client, set <strong>Authorized JavaScript origins</strong> to your app URLs (e.g. <code>http://localhost:3000</code>, <code>https://your-app.vercel.app</code>, <code>https://yourdomain.com</code>). Add each environment you use.
                      </p>
                      <p className="text-muted-foreground">
                        <strong>In project:</strong> Put <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> in <code>.env.local</code> (local) and in Vercel Environment Variables (production). NextAuth uses these for the Google provider.
                      </p>

                      <h3 className="font-semibold">3. Callback and redirect URLs</h3>
                      <p className="text-muted-foreground">
                        <strong>Google Console:</strong> In the OAuth client, set <strong>Authorized redirect URIs</strong> to your NextAuth callback URL: <code>{"{NEXTAUTH_URL}/api/auth/callback/google"}</code>. Example: <code>https://your-app.vercel.app/api/auth/callback/google</code>.
                      </p>
                      <p className="text-muted-foreground">
                        <strong>In project:</strong> <code>NEXTAUTH_URL</code> must match the origin you use (e.g. <code>http://localhost:3000</code> locally, <code>https://your-app.vercel.app</code> on Vercel). NextAuth builds the callback URL from <code>NEXTAUTH_URL</code> + <code>/api/auth/callback/google</code>. No extra redirect config is needed in code if <code>NEXTAUTH_URL</code> is correct.
                      </p>
                      <p className="text-muted-foreground">
                        <strong>Result:</strong> Users can sign in with Google; after auth they are redirected back to your app.
                      </p>
                    </div>
                    )}
                    {lang === "zh" && (
                    <div className="space-y-6 text-sm">
                      <h3 className="font-semibold">1. 获取 Client ID 与 Secret</h3>
                      <p className="text-muted-foreground">
                        在 <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google Cloud Console</a>：创建或选择项目 → <strong>APIs &amp; Services → Credentials</strong> → <strong>Create Credentials → OAuth client ID</strong>。应用类型选 <strong>Web application</strong>。将 <strong>Client ID</strong> 设为 <code>GOOGLE_CLIENT_ID</code>，<strong>Client Secret</strong> 设为 <code>GOOGLE_CLIENT_SECRET</code>。
                      </p>
                      <h3 className="font-semibold">2. 在项目与 Google 中配置</h3>
                      <p className="text-muted-foreground">
                        <strong>Google 控制台：</strong>在同一 OAuth 客户端中，将 <strong>Authorized JavaScript origins</strong> 设为应用 URL（如 <code>http://localhost:3000</code>、<code>https://your-app.vercel.app</code>、<code>https://yourdomain.com</code>）。<strong>项目内：</strong>将 <code>GOOGLE_CLIENT_ID</code>、<code>GOOGLE_CLIENT_SECRET</code> 写入 <code>.env.local</code>（本地）和 Vercel 环境变量（生产）。NextAuth 用其作为 Google 提供商。
                      </p>
                      <h3 className="font-semibold">3. 回调与重定向 URL</h3>
                      <p className="text-muted-foreground">
                        <strong>Google 控制台：</strong>在 OAuth 客户端中设置 <strong>Authorized redirect URIs</strong> 为 NextAuth 回调 URL：<code>{"{NEXTAUTH_URL}/api/auth/callback/google"}</code>，例如 <code>https://your-app.vercel.app/api/auth/callback/google</code>。<strong>项目内：</strong><code>NEXTAUTH_URL</code> 须与当前环境一致（本地 <code>http://localhost:3000</code>，Vercel 上为 <code>https://your-app.vercel.app</code>）。<code>NEXTAUTH_URL</code> 正确时无需在代码中额外配置重定向。完成后用户可使用 Google 登录并回到应用。
                      </p>
                    </div>
                    )}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="deployment-google-map" id="deployment-google-map" className="scroll-mt-24 border rounded-lg px-4 mb-2">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2">
                      <Map className="h-4 w-4" />
                      {navTitle(deploymentItems[2])}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    {lang === "en" && (
                    <div className="space-y-6 text-sm">
                      <h3 className="font-semibold">1. How the project uses Google Maps</h3>
                      <p className="text-muted-foreground">
                        The app may use Google Maps (or Maps JavaScript API) for location pages, campus maps, or address display. The map is loaded via the Google Maps script and uses an API key restricted to your domains.
                      </p>

                      <h3 className="font-semibold">2. Get a Google Maps API key</h3>
                      <p className="text-muted-foreground">
                        In <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google Cloud Console</a>: same project as Auth (or a dedicated one) → <strong>APIs &amp; Services → Library</strong> → enable <strong>Maps JavaScript API</strong> (and optionally <strong>Geocoding API</strong>). Then <strong>Credentials → Create Credentials → API key</strong>. Restrict the key: <strong>Application restrictions</strong> → HTTP referrers → add your site URLs (e.g. <code>https://yourdomain.com/*</code>, <code>http://localhost:3000/*</code>); <strong>API restrictions</strong> → restrict to Maps JavaScript API (and Geocoding if used).
                      </p>

                      <h3 className="font-semibold">3. Configure the key in the project</h3>
                      <p className="text-muted-foreground">
                        Set <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> (or the env name used in the code) to the API key value. Add it in <code>.env.local</code> for local dev and in Vercel Environment Variables for production. The <code>NEXT_PUBLIC_</code> prefix exposes it to the browser; keep key restrictions tight so it is only valid on your domains.
                      </p>
                      <p className="text-muted-foreground">
                        <strong>Result:</strong> Maps and related APIs work on your app for the allowed referrers.
                      </p>
                    </div>
                    )}
                    {lang === "zh" && (
                    <div className="space-y-6 text-sm">
                      <h3 className="font-semibold">1. 项目中如何使用 Google 地图</h3>
                      <p className="text-muted-foreground">
                        应用可能使用 Google Maps（Maps JavaScript API）做地点页、校区图或地址展示。地图通过 Google Maps 脚本加载，使用限制在你方域名下的 API Key。
                      </p>
                      <h3 className="font-semibold">2. 获取 Google Maps API Key</h3>
                      <p className="text-muted-foreground">
                        在 <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google Cloud Console</a>：与 Auth 同项目（或单独项目）→ <strong>APIs &amp; Services → Library</strong> → 启用 <strong>Maps JavaScript API</strong>（可选 <strong>Geocoding API</strong>）。再 <strong>Credentials → Create Credentials → API key</strong>。限制该 Key：<strong>Application restrictions</strong> → HTTP referrers → 添加站点 URL（如 <code>https://yourdomain.com/*</code>、<code>http://localhost:3000/*</code>）；<strong>API restrictions</strong> → 仅允许 Maps JavaScript API（若用 Geocoding 也勾选）。
                      </p>
                      <h3 className="font-semibold">3. 在项目中配置 Key</h3>
                      <p className="text-muted-foreground">
                        将 <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>（或代码中使用的环境变量名）设为该 API Key。在 <code>.env.local</code> 与 Vercel 环境变量中配置。<code>NEXT_PUBLIC_</code> 会暴露到浏览器，请通过 Key 限制确保仅在你方域名有效。
                      </p>
                      <p className="text-muted-foreground"><strong>结果：</strong> 在允许的 referrer 下，地图及相关 API 在应用中可用。</p>
                    </div>
                    )}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="deployment-google-gemini" id="deployment-google-gemini" className="scroll-mt-24 border rounded-lg px-4 mb-2">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      {navTitle(deploymentItems[3])}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    {lang === "en" && (
                    <div className="space-y-6 text-sm">
                      <h3 className="font-semibold">1. How the project uses Google Gemini</h3>
                      <p className="text-muted-foreground">
                        The app may call Google Gemini (Generative AI) for features such as AI chat, content suggestions, or assistant flows. Requests are sent from the server using the Gemini API and the response is used in the UI or stored as needed.
                      </p>

                      <h3 className="font-semibold">2. Get a Gemini API key</h3>
                      <p className="text-muted-foreground">
                        In <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google AI Studio</a> (or Cloud Console with Gemini API enabled): create an API key for the Gemini / Generative AI API. Copy the key and store it securely.
                      </p>
                      <p className="text-muted-foreground">
                        In the project, set <code>GOOGLE_GEMINI_API_KEY</code> (or the variable name used in the code) to this key. Add it only in server-side env (e.g. <code>.env.local</code> and Vercel Environment Variables) and never expose it to the client. Do not use the <code>NEXT_PUBLIC_</code> prefix for this key.
                      </p>
                      <p className="text-muted-foreground">
                        <strong>Result:</strong> Server-side Gemini calls succeed and AI features work in the app.
                      </p>
                    </div>
                    )}
                    {lang === "zh" && (
                    <div className="space-y-6 text-sm">
                      <h3 className="font-semibold">1. 项目中如何使用 Google Gemini</h3>
                      <p className="text-muted-foreground">
                        应用可能调用 Google Gemini（生成式 AI）实现 AI 对话、内容建议或助手流程。请求由服务端通过 Gemini API 发送，响应在 UI 中使用或按需存储。
                      </p>
                      <h3 className="font-semibold">2. 获取 Gemini API Key</h3>
                      <p className="text-muted-foreground">
                        在 <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google AI Studio</a>（或已启用 Gemini API 的 Cloud Console）中创建 Gemini / Generative AI API 的 API Key，复制并妥善保存。
                      </p>
                      <p className="text-muted-foreground">
                        在项目中将 <code>GOOGLE_GEMINI_API_KEY</code>（或代码中使用的变量名）设为该 Key。仅写入服务端环境（如 <code>.env.local</code> 与 Vercel 环境变量），不要暴露给前端，不要使用 <code>NEXT_PUBLIC_</code> 前缀。
                      </p>
                      <p className="text-muted-foreground"><strong>结果：</strong> 服务端 Gemini 调用成功，AI 功能在应用中可用。</p>
                    </div>
                    )}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="deployment-stripe" id="deployment-stripe" className="scroll-mt-24 border rounded-lg px-4 mb-2">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      {navTitle(deploymentItems[4])}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    {lang === "en" && (
                    <div className="space-y-6 text-sm">
                      <h3 className="font-semibold">1. How the project integrates Stripe</h3>
                      <p className="text-muted-foreground">
                        The app uses Stripe for payments (e.g. enrollment checkout, refunds). The server creates Payment Intents or Checkout sessions and stores <code>stripe_customer_id</code> on users. Webhooks may be used for payment confirmation; the publishable key is used on the client for Stripe.js when needed.
                      </p>

                      <h3 className="font-semibold">2. Get Stripe keys</h3>
                      <p className="text-muted-foreground">
                        In <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">Stripe Dashboard</a>: <strong>Developers → API keys</strong>. You need:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li><strong>Publishable key</strong> (pk_…) → <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code></li>
                        <li><strong>Secret key</strong> (sk_…) → <code>STRIPE_SECRET_KEY</code> (server-only)</li>
                      </ul>
                      <p className="text-muted-foreground">
                        For webhooks: <strong>Developers → Webhooks</strong> → Add endpoint (e.g. <code>https://your-app.vercel.app/api/webhooks/stripe</code>) and select events (e.g. <code>payment_intent.succeeded</code>). Copy the <strong>Signing secret</strong> (whsec_…) → <code>STRIPE_WEBHOOK_SECRET</code>.
                      </p>

                      <h3 className="font-semibold">3. Local dev and Vercel production</h3>
                      <p className="text-muted-foreground">
                        <strong>Local:</strong> In <code>.env.local</code> set <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>, <code>STRIPE_SECRET_KEY</code>, and (if testing webhooks) <code>STRIPE_WEBHOOK_SECRET</code>. Use Stripe test keys (pk_test_…, sk_test_…) for development. For local webhook testing, use <a href="https://stripe.com/docs/stripe-cli" target="_blank" rel="noopener noreferrer" className="text-primary underline">Stripe CLI</a> to forward events: <code>stripe listen --forward-to localhost:3000/api/webhooks/stripe</code> and set <code>STRIPE_WEBHOOK_SECRET</code> to the CLI-provided secret.
                      </p>
                      <p className="text-muted-foreground">
                        <strong>Vercel:</strong> In Project → Settings → Environment Variables, add the same variable names with production values (pk_live_…, sk_live_…) for Production, and optionally test keys for Preview. Add the production webhook endpoint in Stripe and set <code>STRIPE_WEBHOOK_SECRET</code> to that endpoint’s signing secret.
                      </p>
                      <p className="text-muted-foreground">
                        <strong>Result:</strong> Payments work in dev (test mode) and in production (live mode) with webhooks for reliable confirmation.
                      </p>
                    </div>
                    )}
                    {lang === "zh" && (
                    <div className="space-y-6 text-sm">
                      <h3 className="font-semibold">1. 项目如何集成 Stripe</h3>
                      <p className="text-muted-foreground">
                        应用使用 Stripe 处理支付（如报名结账、退款）。服务端创建 Payment Intents 或 Checkout 会话，并在用户上存储 <code>stripe_customer_id</code>。可用 Webhook 确认支付；前端在需要时用 Publishable key 加载 Stripe.js。
                      </p>
                      <h3 className="font-semibold">2. 获取 Stripe 密钥</h3>
                      <p className="text-muted-foreground">
                        在 <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">Stripe Dashboard</a>：<strong>Developers → API keys</strong>。需要：<strong>Publishable key</strong> (pk_…) → <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>；<strong>Secret key</strong> (sk_…) → <code>STRIPE_SECRET_KEY</code>（仅服务端）。
                      </p>
                      <p className="text-muted-foreground">
                        Webhook：<strong>Developers → Webhooks</strong> → 添加端点（如 <code>https://your-app.vercel.app/api/webhooks/stripe</code>）并选择事件（如 <code>payment_intent.succeeded</code>）。将 <strong>Signing secret</strong> (whsec_…) 设为 <code>STRIPE_WEBHOOK_SECRET</code>。
                      </p>
                      <h3 className="font-semibold">3. 本地与 Vercel 生产环境</h3>
                      <p className="text-muted-foreground">
                        <strong>本地：</strong>在 <code>.env.local</code> 中设置 <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>、<code>STRIPE_SECRET_KEY</code>，若测 Webhook 再设 <code>STRIPE_WEBHOOK_SECRET</code>。开发用测试密钥 (pk_test_…, sk_test_…)。本地测 Webhook 可用 <a href="https://stripe.com/docs/stripe-cli" target="_blank" rel="noopener noreferrer" className="text-primary underline">Stripe CLI</a> 转发：<code>stripe listen --forward-to localhost:3000/api/webhooks/stripe</code>，并将 CLI 给出的 secret 设为 <code>STRIPE_WEBHOOK_SECRET</code>。
                      </p>
                      <p className="text-muted-foreground">
                        <strong>Vercel：</strong>在 Project → Settings → Environment Variables 中添加同名变量，Production 用生产值 (pk_live_…, sk_live_…)，Preview 可选测试密钥。在 Stripe 中添加生产 Webhook 端点，并将该端点的 signing secret 设为 <code>STRIPE_WEBHOOK_SECRET</code>。<strong>结果：</strong> 支付在开发（测试模式）与生产（live 模式）下均可工作，Webhook 用于可靠确认。
                      </p>
                    </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
