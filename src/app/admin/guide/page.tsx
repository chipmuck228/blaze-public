'use client'

import { useState, useEffect } from "react"
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
} from "lucide-react"
import { cn } from "@/lib/utils"

// Table of contents: Overview, Operation Guide (collapsible), Deployment Guide (collapsible)
const overviewItem = { id: "overview", title: "Overview", icon: Info }
const operationItems = [
  { id: "hierarchy", title: "System Hierarchy", icon: Layers },
  { id: "workflow", title: "Admin Workflow", icon: List },
  { id: "offering-type", title: "Offering Type", icon: Shapes },
  { id: "schema-reference", title: "Schema Reference", icon: Code },
  { id: "schema-by-type", title: "Schema by Offering Type", icon: Shapes },
  { id: "category", title: "Category", icon: FolderTree },
  { id: "offering", title: "Offering", icon: Package },
  { id: "franchise", title: "Franchise & Subscription", icon: MapPin },
  { id: "program", title: "Program", icon: List },
  { id: "instance", title: "Instance", icon: Calendar },
  { id: "notes", title: "Important Notes", icon: BookOpen },
]
const deploymentItems = [
  { id: "deployment-auth", title: "Auth Configuration", icon: KeyRound },
  { id: "deployment-mail", title: "Mail Subscription Configuration", icon: Mail },
  { id: "deployment-supabase", title: "Supabase Data Connection", icon: Database },
  { id: "deployment-db-init", title: "Database Initialization", icon: Database },
  { id: "deployment-vercel", title: "GitHub + Vercel Deployment", icon: CloudCog },
]
const allSectionIds = [overviewItem.id, ...operationItems.map((i) => i.id), ...deploymentItems.map((i) => i.id)]

export default function AdminGuidePage() {
  const [activeSection, setActiveSection] = useState<string>("overview")
  const [operationOpen, setOperationOpen] = useState<string[]>(["hierarchy"])
  const [deploymentOpen, setDeploymentOpen] = useState<string[]>(["deployment-auth"])

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
            <CardTitle className="text-sm font-semibold">Table of Contents</CardTitle>
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
                <span className="text-left">{overviewItem.title}</span>
              </button>
              <div className="pt-2">
                <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Operation Guide</p>
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
                      <span className="text-left">{item.title}</span>
                    </button>
                  )
                })}
              </div>
              <div className="pt-2">
                <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deployment Guide</p>
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
                      <span className="text-left">{item.title}</span>
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Admin Guide</h1>
          <p className="text-muted-foreground text-lg">
            V2 schema-driven design: Library vs. Local Shelf, and how to configure offerings and instances
          </p>
        </div>

        {/* Overview */}
        <section id="overview" className="scroll-mt-24">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Overview
              </CardTitle>
              <CardDescription>
                Configuration-driven (Schema-Driven) design with a global Library and local Shelf model
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  The V2 data model uses a <strong>Schema-Driven</strong> approach. <strong>Category</strong> and{" "}
                  <strong>Offering</strong> are global &quot;knowledge library&quot; resources;{" "}
                  <strong>Franchise</strong> subscribes to categories and turns them into local Programs and Instances
                  (&quot;local shelf&quot;).
                </p>

                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Core principles</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>
                      <strong>Schema-Driven:</strong> Offering Type defines <code>offering_schema</code> and{" "}
                      <code>instance_schema</code>; Offerings and Instances store data in JSONB (
                      <code>type_config_data</code>, <code>instance_data_ext</code>) validated against these schemas.
                    </li>
                    <li>
                      <strong>Library vs. Shelf:</strong> Category and Offering are global and independent; Franchise
                      subscribes to Categories via <code>v2_franchise_category_map</code> and creates Programs and
                      Instances locally.
                    </li>
                    <li>
                      <strong>Extensibility:</strong> New product types can be added by defining new Offering Types
                      and schemas without changing table structure.
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
                Operation Guide
              </CardTitle>
              <CardDescription>Schema-driven workflow and entity reference; click a title to expand or collapse</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" value={operationOpen} onValueChange={setOperationOpen} className="w-full">
                <AccordionItem value="hierarchy" id="hierarchy" className="scroll-mt-24 border rounded-lg px-4 mb-2">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      System Hierarchy
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
                      <Badge variant="outline" className="mt-1">Config layer</Badge>
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
                      <Badge variant="outline" className="mt-1">Library</Badge>
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
                      <Badge variant="outline" className="mt-1">What users enroll in</Badge>
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
                      Three-Phase Admin Workflow
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">Phase 1: Global resource modeling</h3>
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
                    <h3 className="font-semibold mb-2">Phase 2: Franchise initialization</h3>
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
                    <h3 className="font-semibold mb-2">Phase 3: Scheduling and publishing</h3>
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
                      Offering Type
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
                      Offering Schema &amp; Instance Schema
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-6">
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
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="schema-by-type" id="schema-by-type" className="scroll-mt-24 border rounded-lg px-4 mb-2">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2">
                      <Shapes className="h-4 w-4" />
                      Schema by Offering Type
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-8">
              {/* 1. Course */}
              <div>
                <h3 className="text-lg font-semibold mb-1">1. Course</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Recurring class: description, base price, capacity, session count, curriculum outline; per-instance age range, target grades, instructor, classroom.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">offering_schema → type_config_data</p>
                    <p className="text-xs text-muted-foreground mb-2">Key fields: description, base_price, currency, target_audience, learning_outcomes, prerequisites, base_capacity, base_sessions_count, curriculum_outline, materials_included, certificate_available.</p>
                    <pre className="text-[10px] overflow-x-auto max-h-48 overflow-y-auto bg-background p-2 rounded border">{`{
  "fields": {
    "description": { "type": "text", "label": "Course description", "required": true, "display_scope": "both" },
    "base_price": { "type": "number", "label": "Base price", "required": true, "min": 0, "step": 0.01, "display_scope": "both" },
    "currency": { "type": "text", "label": "Currency", "default": "USD", "display_scope": "both" },
    "base_capacity": { "type": "number", "label": "Base capacity", "min": 1, "default": 20, "display_scope": "both" },
    "base_sessions_count": { "type": "number", "label": "Session count", "min": 1, "default": 8, "display_scope": "both" },
    "materials_included": { "type": "boolean", "label": "Materials included", "default": false, "display_scope": "both" },
    "certificate_available": { "type": "boolean", "label": "Certificate available", "default": false, "display_scope": "both" }
  }
}`}</pre>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">instance_schema → instance_data_ext</p>
                    <p className="text-xs text-muted-foreground mb-2">Key fields: age_min, age_max, target_grades (multiselect), instructor_name, classroom_number, special_equipment (array).</p>
                    <pre className="text-[10px] overflow-x-auto max-h-48 overflow-y-auto bg-background p-2 rounded border">{`{
  "fields": {
    "age_min": { "type": "number", "label": "Min age", "required": true, "min": 0, "max": 18, "display_scope": "both" },
    "age_max": { "type": "number", "label": "Max age", "required": true, "min": 0, "max": 18, "display_scope": "both" },
    "target_grades": { "type": "multiselect", "label": "Target grades", "options": ["K","1","2","3","4","5","6","7","8","9","10","11","12"], "display_scope": "both" },
    "instructor_name": { "type": "text", "label": "Instructor name", "display_scope": "both" },
    "classroom_number": { "type": "text", "label": "Classroom number", "display_scope": "both" },
    "special_equipment": { "type": "array", "label": "Special equipment", "items": { "type": "string" }, "display_scope": "admin" }
  }
}`}</pre>
                  </div>
                </div>
              </div>

              {/* 2. Camp */}
              <div>
                <h3 className="text-lg font-semibold mb-1">2. Camp</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Multi-day camp: description, price, meal_option (standard/vegetarian/vegan/no_meal), equipment_list, activities; per-instance age range, after_care_available, camp_shirt_provided, meal_provided.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">offering_schema</p>
                    <p className="text-xs text-muted-foreground mb-2">description, base_price, currency, target_audience, learning_outcomes, prerequisites, base_capacity, meal_option (select), equipment_list (array), activities (array).</p>
                    <pre className="text-[10px] overflow-x-auto max-h-40 overflow-y-auto bg-background p-2 rounded border">{`{
  "fields": {
    "description": { "type": "text", "label": "Camp description", "required": true, "display_scope": "both" },
    "base_price": { "type": "number", "label": "Base price", "required": true, "min": 0, "step": 0.01, "display_scope": "both" },
    "meal_option": { "type": "select", "label": "Meal option", "options": ["standard","vegetarian","vegan","no_meal"], "default": "standard", "display_scope": "both" },
    "base_capacity": { "type": "number", "label": "Base capacity", "min": 1, "default": 30, "display_scope": "both" },
    "equipment_list": { "type": "array", "label": "Equipment list", "items": { "type": "string" }, "display_scope": "both" },
    "activities": { "type": "array", "label": "Activities", "items": { "type": "string" }, "display_scope": "both" }
  }
}`}</pre>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">instance_schema</p>
                    <p className="text-xs text-muted-foreground mb-2">age_min, age_max, after_care_available, camp_shirt_provided, meal_provided, special_needs (admin).</p>
                    <pre className="text-[10px] overflow-x-auto max-h-40 overflow-y-auto bg-background p-2 rounded border">{`{
  "fields": {
    "age_min": { "type": "number", "label": "Min age", "required": true, "min": 0, "max": 18, "display_scope": "both" },
    "age_max": { "type": "number", "label": "Max age", "required": true, "min": 0, "max": 18, "display_scope": "both" },
    "after_care_available": { "type": "boolean", "label": "After care available", "default": false, "display_scope": "both" },
    "camp_shirt_provided": { "type": "boolean", "label": "Camp shirt provided", "default": false, "display_scope": "both" },
    "meal_provided": { "type": "boolean", "label": "Meal provided", "default": false, "display_scope": "both" },
    "special_needs": { "type": "text", "label": "Special needs", "multiline": true, "display_scope": "admin" }
  }
}`}</pre>
                  </div>
                </div>
              </div>

              {/* 3. Gift Card */}
              <div>
                <h3 className="text-lg font-semibold mb-1">3. Gift Card</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Gift card product: description, base_price, valid_through (months), denomination_options; per-instance denomination, expiry_date, delivery_method (email/sms/print), recipient_name, message (admin).
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">offering_schema</p>
                    <p className="text-xs text-muted-foreground mb-2">description, base_price, currency, valid_through (1–24 months), denomination_options (array of numbers), usage_restrictions.</p>
                    <pre className="text-[10px] overflow-x-auto max-h-36 overflow-y-auto bg-background p-2 rounded border">{`{
  "fields": {
    "description": { "type": "text", "label": "Gift card description", "required": true, "display_scope": "both" },
    "base_price": { "type": "number", "label": "Base price", "required": true, "min": 0, "step": 0.01, "display_scope": "both" },
    "valid_through": { "type": "number", "label": "Valid through (months)", "required": true, "min": 1, "max": 24, "default": 12, "display_scope": "both" },
    "denomination_options": { "type": "array", "label": "Denomination options", "items": { "type": "number", "min": 0, "step": 0.01 }, "display_scope": "both" }
  }
}`}</pre>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">instance_schema</p>
                    <p className="text-xs text-muted-foreground mb-2">denomination, expiry_date, recipient_name (admin), message (admin), delivery_method (select: email/sms/print).</p>
                    <pre className="text-[10px] overflow-x-auto max-h-36 overflow-y-auto bg-background p-2 rounded border">{`{
  "fields": {
    "denomination": { "type": "number", "label": "Denomination", "required": true, "min": 0, "step": 0.01, "display_scope": "both" },
    "expiry_date": { "type": "date", "label": "Expiry date", "display_scope": "both" },
    "delivery_method": { "type": "select", "label": "Delivery method", "options": ["email","sms","print"], "default": "email", "display_scope": "admin" }
  }
}`}</pre>
                  </div>
                </div>
              </div>

              {/* 4. Workshop */}
              <div>
                <h3 className="text-lg font-semibold mb-1">4. Workshop</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Single or multi-session workshop: is_multidrop, drop_in_price (conditional), workshop_duration (hours), materials_provided, skill_level; per-instance age range, max_students, instructor_name, workshop_topic, available_drop_ins (when offering.is_multidrop).
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">offering_schema</p>
                    <p className="text-xs text-muted-foreground mb-2">description, is_multidrop (boolean), base_price, drop_in_price (condition: is_multidrop), workshop_duration (0.5–8h), materials_provided, skill_level (beginner/intermediate/advanced).</p>
                    <pre className="text-[10px] overflow-x-auto max-h-40 overflow-y-auto bg-background p-2 rounded border">{`{
  "fields": {
    "description": { "type": "text", "label": "Workshop description", "required": true, "display_scope": "both" },
    "is_multidrop": { "type": "boolean", "label": "Multi-drop supported", "default": false, "display_scope": "both" },
    "base_price": { "type": "number", "label": "Base price", "required": true, "min": 0, "step": 0.01, "display_scope": "both" },
    "drop_in_price": { "type": "number", "label": "Drop-in price", "min": 0, "condition": { "field": "is_multidrop", "equals": true }, "display_scope": "both" },
    "workshop_duration": { "type": "number", "label": "Duration (hours)", "required": true, "min": 0.5, "max": 8, "step": 0.5, "default": 2, "display_scope": "both" },
    "skill_level": { "type": "select", "label": "Skill level", "options": ["beginner","intermediate","advanced"], "display_scope": "both" }
  }
}`}</pre>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">instance_schema</p>
                    <p className="text-xs text-muted-foreground mb-2">age_min, age_max, max_students, instructor_name, workshop_topic, special_requirements, available_drop_ins (condition: offering.is_multidrop).</p>
                    <pre className="text-[10px] overflow-x-auto max-h-40 overflow-y-auto bg-background p-2 rounded border">{`{
  "fields": {
    "age_min": { "type": "number", "label": "Min age", "min": 0, "max": 18, "display_scope": "both" },
    "age_max": { "type": "number", "label": "Max age", "min": 0, "max": 18, "display_scope": "both" },
    "max_students": { "type": "number", "label": "Max students", "required": true, "min": 1, "default": 15, "display_scope": "both" },
    "workshop_topic": { "type": "text", "label": "Workshop topic", "display_scope": "both" },
    "available_drop_ins": { "type": "number", "label": "Available drop-in slots", "min": 0, "condition": { "field": "offering.is_multidrop", "equals": true }, "display_scope": "both" }
  }
}`}</pre>
                  </div>
                </div>
              </div>

              {/* 5. Competition */}
              <div>
                <h3 className="text-lg font-semibold mb-1">5. Competition</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Competition event: description, base_price, base_capacity, competition_format (team/individual/both), min_team_size / max_team_size (conditional), rules_url, equipment_required; per-instance start_date, end_date, start_time, end_time, max_students, venue, round_name, registration_deadline.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">offering_schema</p>
                    <p className="text-xs text-muted-foreground mb-2">description, base_price, currency, target_audience, learning_outcomes, prerequisites, base_capacity, competition_format (team/individual/both), min_team_size/max_team_size (when format=team), rules_url, equipment_required (array).</p>
                    <pre className="text-[10px] overflow-x-auto max-h-44 overflow-y-auto bg-background p-2 rounded border">{`{
  "fields": {
    "description": { "type": "text", "label": "Competition description", "required": true, "display_scope": "both" },
    "base_price": { "type": "number", "label": "Registration fee", "required": true, "min": 0, "step": 0.01, "display_scope": "both" },
    "base_capacity": { "type": "number", "label": "Base capacity", "min": 1, "default": 50, "display_scope": "both" },
    "competition_format": { "type": "select", "label": "Competition format", "options": ["team","individual","both"], "default": "team", "display_scope": "both" },
    "min_team_size": { "type": "number", "label": "Min team size", "min": 1, "max": 10, "condition": { "field": "competition_format", "equals": "team" }, "display_scope": "both" },
    "max_team_size": { "type": "number", "label": "Max team size", "min": 1, "max": 10, "condition": { "field": "competition_format", "equals": "team" }, "display_scope": "both" },
    "rules_url": { "type": "text", "label": "Rules URL", "display_scope": "both" },
    "equipment_required": { "type": "array", "label": "Equipment required", "items": { "type": "string" }, "display_scope": "both" }
  }
}`}</pre>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">instance_schema</p>
                    <p className="text-xs text-muted-foreground mb-2">start_date, end_date, start_time, end_time, max_students, venue, round_name, registration_deadline, notes (admin).</p>
                    <pre className="text-[10px] overflow-x-auto max-h-44 overflow-y-auto bg-background p-2 rounded border">{`{
  "fields": {
    "start_date": { "type": "date", "label": "Start date", "required": true, "display_scope": "both" },
    "end_date": { "type": "date", "label": "End date", "required": true, "display_scope": "both" },
    "start_time": { "type": "time", "label": "Start time", "display_scope": "both" },
    "end_time": { "type": "time", "label": "End time", "display_scope": "both" },
    "max_students": { "type": "number", "label": "Max students/teams", "required": true, "min": 1, "display_scope": "both" },
    "venue": { "type": "text", "label": "Venue", "display_scope": "both" },
    "round_name": { "type": "text", "label": "Round name", "display_scope": "both" },
    "registration_deadline": { "type": "date", "label": "Registration deadline", "display_scope": "both" },
    "notes": { "type": "text", "label": "Notes", "multiline": true, "display_scope": "admin" }
  }
}`}</pre>
                  </div>
                </div>
              </div>

              {/* 6. Free Trial */}
              <div>
                <h3 className="text-lg font-semibold mb-1">6. Free Trial</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Trial session(s): description, base_price (often 0), trial_type (single_session / multi_session / time_limited), trial_sessions_count (when multi_session), trial_days (when time_limited), base_capacity; per-instance start_date, end_date, start_time, end_time, max_students, notes (admin).
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">offering_schema</p>
                    <p className="text-xs text-muted-foreground mb-2">description, base_price, currency, target_audience, learning_outcomes, prerequisites, trial_type (single_session/multi_session/time_limited), trial_sessions_count (condition: multi_session), trial_days (condition: time_limited), base_capacity, eligibility_notes.</p>
                    <pre className="text-[10px] overflow-x-auto max-h-44 overflow-y-auto bg-background p-2 rounded border">{`{
  "fields": {
    "description": { "type": "text", "label": "Trial description", "required": true, "display_scope": "both" },
    "base_price": { "type": "number", "label": "Trial price", "required": true, "min": 0, "step": 0.01, "default": 0, "display_scope": "both" },
    "trial_type": { "type": "select", "label": "Trial type", "options": ["single_session","multi_session","time_limited"], "default": "single_session", "display_scope": "both" },
    "trial_sessions_count": { "type": "number", "label": "Trial sessions count", "min": 1, "max": 10, "condition": { "field": "trial_type", "in": ["multi_session"] }, "display_scope": "both" },
    "trial_days": { "type": "number", "label": "Trial validity (days)", "min": 1, "max": 30, "condition": { "field": "trial_type", "equals": "time_limited" }, "display_scope": "both" },
    "base_capacity": { "type": "number", "label": "Trial capacity per session", "min": 1, "default": 10, "display_scope": "both" }
  }
}`}</pre>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">instance_schema</p>
                    <p className="text-xs text-muted-foreground mb-2">start_date, end_date (optional for multi-session), start_time, end_time, max_students, notes (admin).</p>
                    <pre className="text-[10px] overflow-x-auto max-h-44 overflow-y-auto bg-background p-2 rounded border">{`{
  "fields": {
    "start_date": { "type": "date", "label": "Start date", "required": true, "display_scope": "both" },
    "end_date": { "type": "date", "label": "End date", "display_scope": "both" },
    "start_time": { "type": "time", "label": "Start time", "display_scope": "both" },
    "end_time": { "type": "time", "label": "End time", "display_scope": "both" },
    "max_students": { "type": "number", "label": "Max students", "required": true, "min": 1, "display_scope": "both" },
    "notes": { "type": "text", "label": "Notes", "multiline": true, "display_scope": "admin" }
  }
}`}</pre>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground border-t pt-4">
                Full schema definitions, including all field properties (placeholder, description, display_scope), are in <strong>docs/design/Database_redesign_document_v2.md</strong>. The tables <code>v2_offering.type_config_data</code> and <code>v2_instance.instance_data_ext</code> store the actual values; they are validated against the Offering Type&apos;s <code>offering_schema</code> and <code>instance_schema</code>.
              </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="category" id="category" className="scroll-mt-24 border rounded-lg px-4 mb-2">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2">
                      <FolderTree className="h-4 w-4" />
                      Category
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
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
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="offering" id="offering" className="scroll-mt-24 border rounded-lg px-4 mb-2">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Offering
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                <strong>Offering</strong> is a global product template: name, description, base_price, poster, and{" "}
                <code>type_config_data</code> (filled according to its Offering Type&apos;s <code>offering_schema</code>).
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Belongs to one <strong>Category</strong> and one <strong>Offering Type</strong>.</li>
                <li>Status: draft, published, suspended, archived. Only <strong>published</strong> Offerings can be used to create Instances.</li>
                <li>No Franchise reference—fully global and reusable across Franchises.</li>
              </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="franchise" id="franchise" className="scroll-mt-24 border rounded-lg px-4 mb-2">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Franchise &amp; Subscription
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
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
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="program" id="program" className="scroll-mt-24 border rounded-lg px-4 mb-2">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2">
                      <List className="h-4 w-4" />
                      Program
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                <strong>Program</strong> is an operational unit: e.g. &quot;Spring 2026&quot; for a given Franchise and Category. It has
                <code>start_date</code> and <code>end_date</code>. The Category must be subscribed by the Franchise.
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Program → Franchise (required), Program → Category (required, must be in franchise_category_map).</li>
                <li>Instances belong to a Program and reference a global Offering that belongs to the same Category as the Program.</li>
              </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="instance" id="instance" className="scroll-mt-24 border rounded-lg px-4 mb-2">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Instance
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
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
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="notes" id="notes" className="scroll-mt-24 border rounded-lg px-4 mb-2">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Important Notes
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
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
                Deployment Guide
              </CardTitle>
              <CardDescription>Environment and configuration for deployment: Auth, mail, Supabase, GitHub + Vercel</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" value={deploymentOpen} onValueChange={setDeploymentOpen} className="w-full">
                <AccordionItem value="deployment-auth" id="deployment-auth" className="scroll-mt-24 border rounded-lg px-4 mb-2">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4" />
                      Auth Configuration
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 text-sm">
                      <p className="text-muted-foreground">
                        This project uses <strong>NextAuth.js</strong> with Credentials (email + password) and Google OAuth. Configure the following in <code>.env.local</code> (or production environment variables):
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
                            <tr className="border-b">
                              <td className="p-3"><code>AUTH_SECRET</code></td>
                              <td className="p-3">NextAuth.js encryption secret; at least 32 characters. Generate with <code>openssl rand -base64 32</code></td>
                            </tr>
                            <tr className="border-b">
                              <td className="p-3"><code>NEXTAUTH_URL</code></td>
                              <td className="p-3">Full app URL, e.g. <code>https://yourdomain.com</code>; use <code>http://localhost:3000</code> for local dev</td>
                            </tr>
                            <tr className="border-b">
                              <td className="p-3"><code>GOOGLE_CLIENT_ID</code></td>
                              <td className="p-3">Google OAuth 2.0 Client ID (create in Google Cloud Console)</td>
                            </tr>
                            <tr className="border-b">
                              <td className="p-3"><code>GOOGLE_CLIENT_SECRET</code></td>
                              <td className="p-3">Google OAuth 2.0 Client Secret</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <p className="text-muted-foreground">
                        For proxy in restricted networks, set <code>HTTP_PROXY</code> / <code>HTTPS_PROXY</code>. Run <code>node scripts/check/check-env-vars.js</code> to verify required variables.
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="deployment-mail" id="deployment-mail" className="scroll-mt-24 border rounded-lg px-4 mb-2">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Mail Subscription Configuration
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 text-sm">
                      <p className="text-muted-foreground">
                        Verification, password reset, invite emails, and <strong>Newsletter</strong> (welcome, unsubscribe link) are sent via SMTP. Configure in <code>.env.local</code>:
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
                            <tr className="border-b">
                              <td className="p-3"><code>SMTP_HOST</code></td>
                              <td className="p-3">SMTP server; default <code>smtp.gmail.com</code></td>
                            </tr>
                            <tr className="border-b">
                              <td className="p-3"><code>SMTP_PORT</code></td>
                              <td className="p-3">Port; typically 587 (TLS) or 465 (SSL)</td>
                            </tr>
                            <tr className="border-b">
                              <td className="p-3"><code>SMTP_USER</code></td>
                              <td className="p-3">Sender email account</td>
                            </tr>
                            <tr className="border-b">
                              <td className="p-3"><code>SMTP_PASSWORD</code></td>
                              <td className="p-3">Sender password or app password (use Gmail App Password if needed)</td>
                            </tr>
                            <tr className="border-b">
                              <td className="p-3"><code>SMTP_FROM</code></td>
                              <td className="p-3">Optional; From address; falls back to <code>SMTP_USER</code> if unset</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <p className="text-muted-foreground">
                        Newsletter subscribe/unsubscribe links use the site base URL: set <code>NEXT_PUBLIC_APP_URL</code> (or rely on <code>VERCEL_URL</code> on Vercel) so unsubscribe links are correct.
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="deployment-supabase" id="deployment-supabase" className="scroll-mt-24 border rounded-lg px-4 mb-2">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Supabase Data Connection
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 text-sm">
                      <p className="text-muted-foreground">
                        The project uses <strong>Supabase</strong> as the backend database and auth data source. Set these in <code>.env.local</code> or Vercel environment variables:
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
                            <tr className="border-b">
                              <td className="p-3"><code>NEXT_PUBLIC_SUPABASE_URL</code></td>
                              <td className="p-3">Supabase project URL; from Dashboard → Settings → API</td>
                            </tr>
                            <tr className="border-b">
                              <td className="p-3"><code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code></td>
                              <td className="p-3">Anonymous (public) key for browser; subject to RLS</td>
                            </tr>
                            <tr className="border-b">
                              <td className="p-3"><code>SUPABASE_SERVICE_ROLE_KEY</code></td>
                              <td className="p-3">Service role key for server only; bypasses RLS; never expose to client</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <p className="text-muted-foreground">
                        For local or script access (migrations, seeding), use <code>NEXT_PUBLIC_SUPABASE_URL</code> + <code>SUPABASE_SERVICE_ROLE_KEY</code>. Server API uses the same key via <code>supabaseAdmin</code>.
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="deployment-db-init" id="deployment-db-init" className="scroll-mt-24 border rounded-lg px-4 mb-2">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Database Initialization
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 text-sm">
                      <p className="text-muted-foreground">
                        For a <strong>new Supabase project</strong>, run the SQL initialization scripts to create all required tables. Scripts are in <code>sql/init/</code> and must be executed in order.
                      </p>
                      <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="text-left p-3 font-medium">File</th>
                              <th className="text-left p-3 font-medium">Purpose</th>
                            </tr>
                          </thead>
                          <tbody className="text-muted-foreground">
                            <tr className="border-b">
                              <td className="p-3"><code>00-supabase-init.sql</code></td>
                              <td className="p-3">Creates all tables: users, password_reset_tokens, v2_offering_type, v2_category, v2_franchise, v2_franchise_category_map, v2_campus, v2_offering, v2_program, v2_instance, students, user_students, instance_enrollments; indexes; triggers; RLS policies.</td>
                            </tr>
                            <tr className="border-b">
                              <td className="p-3"><code>01-seed-offering-types.sql</code></td>
                              <td className="p-3">Inserts default offering types (course, camp, workshop, free_trial, gift_card, competition) and example categories. Safe to run multiple times (ON CONFLICT DO NOTHING).</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">How to run on Supabase</h3>
                        <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                          <li>Open Supabase Dashboard → your project → <strong>SQL Editor</strong>.</li>
                          <li>Copy the contents of <code>sql/init/00-supabase-init.sql</code> into a new query and run it.</li>
                          <li>Copy the contents of <code>sql/init/01-seed-offering-types.sql</code> into a new query and run it.</li>
                          <li>Optionally use <strong>Supabase CLI</strong>: <code>supabase db push</code> if you have migrations linked; or run the SQL files via <code>psql</code> against your project connection string.</li>
                        </ol>
                      </div>
                      <p className="text-muted-foreground">
                        After initialization, configure at least one <strong>Franchise</strong> and subscribe it to <strong>Categories</strong> via the admin UI; then create <strong>Programs</strong> and <strong>Instances</strong> to enable enrollments.
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="deployment-vercel" id="deployment-vercel" className="scroll-mt-24 border rounded-lg px-4 mb-2">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2">
                      <CloudCog className="h-4 w-4" />
                      GitHub + Vercel Deployment
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 text-sm">
                      <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                        <li>
                          <strong>Code hosting:</strong> Push the project to a GitHub repository (if needed, create a repo then <code>git remote add origin &lt;url&gt;</code> and push).
                        </li>
                        <li>
                          <strong>Connect Vercel:</strong> Log in at <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">vercel.com</a>, click Import Project, select the GitHub repo; choose Next.js as framework and keep the root directory as-is.
                        </li>
                        <li>
                          <strong>Environment variables:</strong> In Vercel project Settings → Environment Variables, add all deployment variables from <code>.env.local</code> (Auth, SMTP, Supabase, etc.) and select the right environments (Production / Preview).
                        </li>
                        <li>
                          <strong>Deploy:</strong> Save to trigger the first deploy; each push to the main (or configured) branch will trigger new deployments. Check the Deployments page for build logs and the live URL.
                        </li>
                        <li>
                          <strong>Custom domain (optional):</strong> In Settings → Domains, add your domain and configure CNAME at your DNS provider. After going live, set <code>NEXTAUTH_URL</code> and <code>NEXT_PUBLIC_APP_URL</code> to the final domain.
                        </li>
                      </ol>
                      <p className="text-muted-foreground">
                        If the project uses crons in <code>vercel.json</code> (e.g. enrollment processing, newsletter send), Vercel will register them for production automatically.
                      </p>
                    </div>
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
