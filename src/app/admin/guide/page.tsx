"use client"

import { useState, useEffect, type ComponentType } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Info,
  Layers,
  ListOrdered,
  MapPin,
  BookOpen,
  CloudCog,
  Map,
  Sparkles,
  BarChart3,
  Settings,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  AlertTriangle,
  Database,
  ClipboardList,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  T,
  deploymentContent,
  overviewItem,
  operationItems,
  deploymentItems,
  allSectionIds,
  type GuideLang,
} from "./guide-content"

const operationIcons = {
  hierarchy: Layers,
  configuration: ListOrdered,
  example: MapPin,
  templates: BookOpen,
  "data-ops": Database,
  "data-reference": ClipboardList,
  "data-import": FileSpreadsheet,
  notes: CheckCircle2,
} as const

const deploymentIcons = {
  "deployment-vercel": CloudCog,
  "deployment-google-map": Map,
  "deployment-google-gemini": Sparkles,
  "deployment-traffic-analytics": BarChart3,
} as const

export default function AdminGuidePage() {
  const [lang, setLang] = useState<GuideLang>("en")
  const [activeSection, setActiveSection] = useState<string>("overview")
  const [operationOpen, setOperationOpen] = useState<string[]>(["hierarchy"])
  const [deploymentOpen, setDeploymentOpen] = useState<string[]>(["deployment-vercel"])

  const t = T[lang]
  const navTitle = (item: { titleEn: string; titleZh: string }) =>
    lang === "zh" ? item.titleZh : item.titleEn

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
      window.scrollTo({ top: elementPosition + window.pageYOffset - offset, behavior: "smooth" })
    }
    if (operationItems.some((i) => i.id === id)) {
      setOperationOpen((prev) => (prev.includes(id) ? prev : [...prev, id]))
    }
    if (deploymentItems.some((i) => i.id === id)) {
      setDeploymentOpen((prev) => (prev.includes(id) ? prev : [...prev, id]))
    }
  }

  const renderNavButton = (
    id: string,
    title: string,
    Icon: ComponentType<{ className?: string }>,
    indented?: boolean
  ) => (
    <button
      key={id}
      type="button"
      onClick={() => scrollToSection(id)}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
        indented && "pl-5",
        "hover:bg-accent hover:text-accent-foreground",
        activeSection === id ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="text-left">{title}</span>
    </button>
  )

  const renderSteps = (steps: ReadonlyArray<{ title: string; body: string }>) => (
    <div className="space-y-5 text-sm">
      {steps.map((step) => (
        <div key={step.title}>
          <h3 className="font-semibold mb-1">{step.title}</h3>
          <p className="text-muted-foreground">{step.body}</p>
        </div>
      ))}
    </div>
  )

  const renderImportWarnings = () => (
    <div className="space-y-3">
      {t.importWarnings.map((w) => (
        <Alert key={w.title} variant="destructive" className="bg-destructive/5 border-destructive/40">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-sm font-semibold">
            {t.warningLabel}: {w.title}
          </AlertTitle>
          <AlertDescription className="text-sm">{w.body}</AlertDescription>
        </Alert>
      ))}
    </div>
  )

  return (
    <div className="flex gap-8 container mx-auto py-8 px-4 max-w-7xl">
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">{t.tocTitle}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <nav className="space-y-1 p-4">
              {renderNavButton(overviewItem.id, navTitle(overviewItem), Info)}
              <div className="pt-2">
                <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t.operationGuideLabel}
                </p>
                {operationItems.map((item) => {
                  const Icon = operationIcons[item.id]
                  return renderNavButton(item.id, navTitle(item), Icon, true)
                })}
              </div>
              <div className="pt-2">
                <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t.deploymentGuideLabel}
                </p>
                {deploymentItems.map((item) => {
                  const Icon = deploymentIcons[item.id]
                  return renderNavButton(item.id, navTitle(item), Icon, true)
                })}
              </div>
            </nav>
          </CardContent>
        </Card>
      </aside>

      <div className="flex-1 min-w-0">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">{t.pageTitle}</h1>
            <p className="text-muted-foreground text-lg">{t.pageSubtitle}</p>
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

        <section id="overview" className="scroll-mt-24">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                {t.overviewTitle}
              </CardTitle>
              <CardDescription>{t.overviewDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              {t.overviewBody.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </CardContent>
          </Card>
        </section>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
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
                  <div className="space-y-4 text-sm">
                    <p className="text-muted-foreground">{t.hierarchyIntro}</p>
                    <div className="overflow-x-auto rounded-md border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left p-3 font-medium">{lang === "zh" ? "层级" : "Level"}</th>
                            <th className="text-left p-3 font-medium">{t.meaningCol}</th>
                            <th className="text-left p-3 font-medium hidden md:table-cell">{t.adminMenuCol}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {t.hierarchyLevels.map((row) => (
                            <tr key={row.label} className="border-b last:border-0">
                              <td className="p-3 align-top">
                                <div className="font-medium">{row.label}</div>
                                <Badge variant={row.bookable ? "default" : "secondary"} className="mt-1 text-xs">
                                  {row.bookable ? t.bookableYes : t.bookableNo}
                                </Badge>
                              </td>
                              <td className="p-3 text-muted-foreground align-top">{row.meaning}</td>
                              <td className="p-3 text-muted-foreground align-top hidden md:table-cell text-xs">
                                {row.adminMenu}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 font-mono text-xs break-words">
                      {t.hierarchyDiagram}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="configuration" id="configuration" className="scroll-mt-24 border rounded-lg px-4 mb-2">
                <AccordionTrigger className="hover:no-underline">
                  <span className="flex items-center gap-2">
                    <ListOrdered className="h-4 w-4" />
                    {navTitle(operationItems[1])}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-6 text-sm">
                    <p className="text-muted-foreground">{t.configIntro}</p>
                    {t.configPhases.map((phase) => (
                      <div key={phase.title}>
                        <h3 className="font-semibold mb-2">{phase.title}</h3>
                        <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                          {phase.steps.map((step) => (
                            <li key={step}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="example" id="example" className="scroll-mt-24 border rounded-lg px-4 mb-2">
                <AccordionTrigger className="hover:no-underline">
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {navTitle(operationItems[2])}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 text-sm">
                    <p className="text-muted-foreground">{t.exampleIntro}</p>
                    <div className="space-y-3">
                      {t.exampleSteps.map((item, index) => (
                        <div
                          key={item.step}
                          className="flex gap-3 rounded-lg border p-4 bg-muted/20"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{item.step}</p>
                            <p className="text-muted-foreground mt-1">{item.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="templates" id="templates" className="scroll-mt-24 border rounded-lg px-4 mb-2">
                <AccordionTrigger className="hover:no-underline">
                  <span className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    {navTitle(operationItems[3])}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                    {t.templatesBody.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="data-ops" id="data-ops" className="scroll-mt-24 border rounded-lg px-4 mb-2">
                <AccordionTrigger className="hover:no-underline">
                  <span className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    {navTitle(operationItems[4])}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-8 text-sm">
                    <div>
                      <p className="font-medium">{t.dataOpsDesc}</p>
                      <div className="mt-3 space-y-2 text-muted-foreground">
                        {t.dataOpsIntro.map((p) => (
                          <p key={p}>{p}</p>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      {t.dataOpsPhases.map((phase) => (
                        <div key={phase.title} className="rounded-lg border p-4 bg-muted/20">
                          <h3 className="font-semibold">{phase.title}</h3>
                          <p className="text-muted-foreground mt-1">{phase.summary}</p>
                          <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                            {phase.items.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">{t.dataOpsMappingTitle}</h3>
                      <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-xs md:text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="text-left p-2 font-medium">Admin</th>
                              <th className="text-left p-2 font-medium hidden sm:table-cell">DB</th>
                              <th className="text-left p-2 font-medium">{lang === "zh" ? "官网" : "Website"}</th>
                              <th className="text-left p-2 font-medium">CSV</th>
                              <th className="text-left p-2 font-medium hidden md:table-cell">
                                {lang === "zh" ? "维护方式" : "How"}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {t.dataOpsMappingRows.map((row) => (
                              <tr key={row.admin} className="border-b last:border-0">
                                <td className="p-2 align-top font-medium">{row.admin}</td>
                                <td className="p-2 align-top font-mono text-xs hidden sm:table-cell">{row.db}</td>
                                <td className="p-2 align-top text-muted-foreground">{row.web}</td>
                                <td className="p-2 align-top text-muted-foreground">{row.csv}</td>
                                <td className="p-2 align-top text-muted-foreground hidden md:table-cell">{row.how}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                      <div className="rounded-lg border p-4 space-y-3">
                        <h3 className="font-semibold">{t.dataOpsOfferingTitle}</h3>
                        {t.dataOpsOfferingBody.map((p) => (
                          <p key={p} className="text-muted-foreground">
                            {p}
                          </p>
                        ))}
                        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                          {t.dataOpsOfferingSteps.map((step) => (
                            <li key={step}>{step}</li>
                          ))}
                        </ol>
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground border-t pt-3">
                          {t.dataOpsOfferingCols.map((col) => (
                            <li key={col}>{col}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-lg border p-4 space-y-3">
                        <h3 className="font-semibold">{t.dataOpsInstanceTitle}</h3>
                        {t.dataOpsInstanceBody.map((p) => (
                          <p key={p} className="text-muted-foreground">
                            {p}
                          </p>
                        ))}
                        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                          {t.dataOpsInstanceSteps.map((step) => (
                            <li key={step}>{step}</li>
                          ))}
                        </ol>
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground border-t pt-3">
                          {t.dataOpsInstanceCols.map((col) => (
                            <li key={col}>{col}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3">{t.dataOpsTermSopTitle}</h3>
                      <div className="space-y-3">
                        {t.dataOpsTermSop.map((item, index) => (
                          <div key={item.step} className="flex gap-3 rounded-lg border p-4 bg-muted/20">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{item.step}</p>
                              <p className="text-muted-foreground mt-1">{item.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">{t.dataOpsOpsTitle}</h3>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        {t.dataOpsOpsItems.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">{t.dataOpsTroubleTitle}</h3>
                      <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="text-left p-3 font-medium">{lang === "zh" ? "现象" : "Issue"}</th>
                              <th className="text-left p-3 font-medium">{lang === "zh" ? "处理" : "Fix"}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {t.dataOpsTroubleRows.map((row) => (
                              <tr key={row.issue} className="border-b last:border-0">
                                <td className="p-3 align-top font-medium">{row.issue}</td>
                                <td className="p-3 align-top text-muted-foreground">{row.fix}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <p className="text-muted-foreground text-xs">{t.dataOpsDocRefs}</p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="data-reference" id="data-reference" className="scroll-mt-24 border rounded-lg px-4 mb-2">
                <AccordionTrigger className="hover:no-underline">
                  <span className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    {navTitle(operationItems[5])}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-8 text-sm">
                    <div>
                      <p className="font-medium">{t.dataRefDesc}</p>
                      <ul className="list-disc list-inside mt-3 space-y-1 text-muted-foreground">
                        {t.dataRefPrereqs.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">{t.dataRefScriptsTitle}</h3>
                      <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-xs md:text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="text-left p-2 font-medium">{lang === "zh" ? "脚本" : "Script"}</th>
                              <th className="text-left p-2 font-medium">{lang === "zh" ? "作用" : "Purpose"}</th>
                              <th className="text-left p-2 font-medium hidden lg:table-cell">
                                {lang === "zh" ? "何时使用" : "When"}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {t.dataRefScripts.map((row) => (
                              <tr key={row.script} className="border-b last:border-0">
                                <td className="p-2 align-top font-mono text-xs whitespace-nowrap">{row.script}</td>
                                <td className="p-2 align-top text-muted-foreground">{row.purpose}</td>
                                <td className="p-2 align-top text-muted-foreground hidden lg:table-cell">{row.when}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">{t.dataRefFilesTitle}</h3>
                      <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-xs md:text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="text-left p-2 font-medium">{lang === "zh" ? "路径" : "Path"}</th>
                              <th className="text-left p-2 font-medium">{lang === "zh" ? "用途" : "Role"}</th>
                              <th className="text-left p-2 font-medium hidden md:table-cell">
                                {lang === "zh" ? "示例" : "Example"}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {t.dataRefFiles.map((row) => (
                              <tr key={row.path} className="border-b last:border-0">
                                <td className="p-2 align-top font-mono text-xs">{row.path}</td>
                                <td className="p-2 align-top text-muted-foreground">{row.role}</td>
                                <td className="p-2 align-top font-mono text-xs text-muted-foreground hidden md:table-cell">
                                  {row.example}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">{t.dataRefModeTitle}</h3>
                      <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="text-left p-3 font-medium">{lang === "zh" ? "场景" : "Scenario"}</th>
                              <th className="text-left p-3 font-medium">{lang === "zh" ? "工作流" : "Workflow"}</th>
                              <th className="text-left p-3 font-medium hidden lg:table-cell">
                                {lang === "zh" ? "涉及文件" : "Files"}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {t.dataRefModes.map((row) => (
                              <tr key={row.scenario} className="border-b last:border-0">
                                <td className="p-3 align-top">{row.scenario}</td>
                                <td className="p-3 align-top font-medium">{row.workflow}</td>
                                <td className="p-3 align-top font-mono text-xs text-muted-foreground hidden lg:table-cell">
                                  {row.files}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">{t.dataRefOrderTitle}</h3>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        {t.dataRefOrderSteps.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="data-import" id="data-import" className="scroll-mt-24 border rounded-lg px-4 mb-2">
                <AccordionTrigger className="hover:no-underline">
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    {navTitle(operationItems[6])}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-6 text-sm">
                    <p className="text-muted-foreground">{t.importIntro}</p>

                    {renderImportWarnings()}

                    <div>
                      <h3 className="font-semibold mb-2">{t.prerequisitesLabel}</h3>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        {t.importPrerequisites.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3">{t.pipelineLabel}</h3>
                      <div className="space-y-3">
                        {t.importPipeline.map((phase, index) => (
                          <div key={phase.title} className="flex gap-3 rounded-lg border p-4 bg-muted/20">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{phase.title}</p>
                              <p className="text-muted-foreground mt-1">{phase.body}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">{t.wideTableLabel}</h3>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        {t.importWideTableCols.map((col) => (
                          <li key={col}>{col}</li>
                        ))}
                      </ul>
                      <p className="text-xs text-muted-foreground mt-2">
                        {lang === "zh" ? "模板参考：" : "Template: "}
                        <code className="text-xs">scripts/templates/instances-camp-template.csv</code>
                      </p>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3">{t.commandLabel}</h3>
                      <div className="space-y-4">
                        {t.importCommands.map((block) => (
                          <div key={block.label}>
                            <p className="font-medium mb-1">{block.label}</p>
                            <pre className="overflow-x-auto rounded-md border bg-muted/50 p-3 text-xs font-mono whitespace-pre-wrap">
                              {block.cmd}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                      <h3 className="font-semibold flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-4 w-4" />
                        {t.importClearTitle}
                      </h3>
                      {t.importClearBody.map((p) => (
                        <p key={p} className="text-muted-foreground">
                          {p}
                        </p>
                      ))}
                      <pre className="overflow-x-auto rounded-md border border-destructive/20 bg-background p-3 text-xs font-mono whitespace-pre-wrap">
                        {t.importClearCommand}
                      </pre>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        {t.importClearNotes.map((note) => (
                          <li key={note}>{note}</li>
                        ))}
                      </ul>
                    </div>

                    <p className="text-muted-foreground">{t.importLogs}</p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="notes" id="notes" className="scroll-mt-24 border rounded-lg px-4 mb-2">
                <AccordionTrigger className="hover:no-underline">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    {navTitle(operationItems[7])}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                    {t.notesItems.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CloudCog className="h-5 w-5" />
              {t.deploymentGuideTitle}
            </CardTitle>
            <CardDescription>{t.deploymentGuideDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" value={deploymentOpen} onValueChange={setDeploymentOpen} className="w-full">
              <AccordionItem
                value="deployment-vercel"
                id="deployment-vercel"
                className="scroll-mt-24 border rounded-lg px-4 mb-2"
              >
                <AccordionTrigger className="hover:no-underline">
                  <span className="flex items-center gap-2">
                    <CloudCog className="h-4 w-4" />
                    {navTitle(deploymentItems[0])}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-6">
                    {renderSteps(deploymentContent.vercel[lang].steps)}
                    <div className="overflow-x-auto rounded-md border text-sm">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left p-3 font-medium">
                              {lang === "zh" ? "变量" : "Variable"}
                            </th>
                            <th className="text-left p-3 font-medium">
                              {lang === "zh" ? "说明" : "Description"}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="text-muted-foreground">
                          {deploymentContent.vercel[lang].envTable.map((row) => (
                            <tr key={row.key} className="border-b last:border-0">
                              <td className="p-3 font-mono text-xs">{row.key}</td>
                              <td className="p-3">{row.desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="deployment-google-map"
                id="deployment-google-map"
                className="scroll-mt-24 border rounded-lg px-4 mb-2"
              >
                <AccordionTrigger className="hover:no-underline">
                  <span className="flex items-center gap-2">
                    <Map className="h-4 w-4" />
                    {navTitle(deploymentItems[1])}
                  </span>
                </AccordionTrigger>
                <AccordionContent>{renderSteps(deploymentContent.map[lang].steps)}</AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="deployment-google-gemini"
                id="deployment-google-gemini"
                className="scroll-mt-24 border rounded-lg px-4 mb-2"
              >
                <AccordionTrigger className="hover:no-underline">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    {navTitle(deploymentItems[2])}
                  </span>
                </AccordionTrigger>
                <AccordionContent>{renderSteps(deploymentContent.gemini[lang].steps)}</AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="deployment-traffic-analytics"
                id="deployment-traffic-analytics"
                className="scroll-mt-24 border rounded-lg px-4 mb-2"
              >
                <AccordionTrigger className="hover:no-underline">
                  <span className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    {navTitle(deploymentItems[3])}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-6">
                    <p className="text-sm text-muted-foreground">{deploymentContent.traffic[lang].intro}</p>
                    {renderSteps(deploymentContent.traffic[lang].steps)}
                    <div className="overflow-x-auto rounded-md border text-sm">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left p-3 font-medium">
                              {lang === "zh" ? "变量" : "Variable"}
                            </th>
                            <th className="text-left p-3 font-medium">
                              {lang === "zh" ? "说明" : "Description"}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="text-muted-foreground">
                          {deploymentContent.traffic[lang].envTable.map((row) => (
                            <tr key={row.key} className="border-b last:border-0">
                              <td className="p-3 font-mono text-xs whitespace-pre-wrap">{row.key}</td>
                              <td className="p-3">{row.desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                      {deploymentContent.traffic[lang].notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <ArrowRight className="h-3 w-3" />
          {lang === "zh"
            ? "旧版 Schema 技术文档已存档至 _archive/admin-pages/guide/"
            : "Legacy schema-heavy guide archived at _archive/admin-pages/guide/"}
        </p>
      </div>
    </div>
  )
}
