'use client'

import { usePathname, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/contexts/SidebarContext"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Users,
  Settings,
  LogOut,
  LayoutDashboard,
  Shield,
  UserCircle,
  FolderTree,
  Layers,
  CalendarDays,
  History,
  ShoppingCart,
  Package,
  Building2,
  Mail,
  Send,
  FileText,
  BarChart3,
  AlertCircle,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Shapes,
  LayoutGrid,
  MessageSquareQuote,
  Bell,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getAdminUiLabels } from "@/lib/admin-ui-labels"
import { ADMIN_ENROLLMENTS_ENABLED } from "@/lib/admin-features"
import type { LucideIcon } from "lucide-react"

interface MenuItem {
  title: string
  href: string
  icon: LucideIcon
  badge?: string
}

const menuItems: MenuItem[] = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { title: "User Management", href: "/admin/users", icon: Users },
  ...(ADMIN_ENROLLMENTS_ENABLED
    ? [{ title: "Enrollments", href: "/admin/enrollments", icon: ShoppingCart }]
    : []),
  { title: "Team Management", href: "/admin/teams", icon: UserCircle },
  { title: "Traffic", href: "/admin/traffic", icon: BarChart3 },
  { title: "Notifications", href: "/admin/notifications", icon: Bell },
  { title: "Admin Guide", href: "/admin/guide", icon: Settings },
]

const newsletterMenuItems: MenuItem[] = [
  { title: "Subscribers", href: "/admin/newsletter/subscribers", icon: Mail },
  { title: "Templates", href: "/admin/newsletter/templates", icon: FileText },
  { title: "Send Newsletter", href: "/admin/newsletter/send", icon: Send },
  { title: "Campaigns", href: "/admin/newsletter/campaigns", icon: History },
  { title: "Failed Sends", href: "/admin/newsletter/failed-sends", icon: AlertCircle },
]

const blazeContentMenuItems = (labels: ReturnType<typeof getAdminUiLabels>): MenuItem[] => [
  {
    title: labels.campus.plural,
    href: "/admin/blaze/campuses",
    icon: MapPin,
  },
  {
    title: labels.program.plural,
    href: "/admin/blaze/programs",
    icon: Layers,
  },
  {
    title: labels.instance.plural,
    href: "/admin/blaze/instance",
    icon: CalendarDays,
  },
  {
    title: labels.offering.plural,
    href: "/admin/blaze/offerings",
    icon: Package,
  },
  {
    title: "Testimonials",
    href: "/admin/testimonials",
    icon: MessageSquareQuote,
  },
  {
    title: "Resources",
    href: "/admin/blaze/resources",
    icon: FileText,
  },
]

const blazeSettingsMenuItems = (labels: ReturnType<typeof getAdminUiLabels>): MenuItem[] => [
  {
    title: labels.franchise.plural,
    href: "/admin/blaze/franchises",
    icon: Building2,
  },
  {
    title: labels.category.plural,
    href: "/admin/blaze/categories",
    icon: FolderTree,
  },
  {
    title: labels.offeringType.plural,
    href: "/admin/blaze/offering-types",
    icon: Shapes,
  },
]

function isPathActive(pathname: string | null, href: string): boolean {
  if (href === "/admin") return pathname === href
  return pathname === href || (pathname?.startsWith(href + "/") ?? false)
}

function navButtonClass(isActive: boolean, collapsed: boolean) {
  return cn(
    "w-full text-sm font-medium text-foreground",
    collapsed ? "justify-center px-0" : "justify-start",
    isActive ? "bg-secondary text-foreground" : "hover:bg-muted"
  )
}

interface AdminSidebarProps {
  onNavigate?: () => void
}

export function AdminSidebar({ onNavigate }: AdminSidebarProps = {}) {
  const pathname = usePathname()
  const router = useRouter()
  const { isCollapsed, setIsCollapsed } = useSidebar()
  const labels = getAdminUiLabels()
  const contentMenuItems = blazeContentMenuItems(labels)
  const settingsMenuItems = blazeSettingsMenuItems(labels)

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    router.push("/")
    router.refresh()
  }

  const isAnyNewsletterPageActive = newsletterMenuItems.some((item) =>
    isPathActive(pathname, item.href)
  )
  const isAnyBlazeContentPageActive = contentMenuItems.some((item) =>
    isPathActive(pathname, item.href)
  )
  const isAnyBlazeSettingsPageActive = settingsMenuItems.some((item) =>
    isPathActive(pathname, item.href)
  )

  const renderNavItem = (item: MenuItem, collapsed: boolean) => {
    const Icon = item.icon
    const isActive = isPathActive(pathname, item.href)

    return (
      <Link
        key={item.href}
        href={item.href}
        title={collapsed ? item.title : undefined}
        onClick={onNavigate}
      >
        <Button variant="ghost" className={navButtonClass(isActive, collapsed)}>
          <Icon className={cn("h-4 w-4 shrink-0 text-muted-foreground", !collapsed && "mr-2")} />
          {!collapsed && <span className="truncate">{item.title}</span>}
          {!collapsed && item.badge ? (
            <Badge variant="secondary" className="ml-auto text-xs">
              {item.badge}
            </Badge>
          ) : null}
        </Button>
      </Link>
    )
  }

  const renderAccordionSection = (
    value: string,
    title: string,
    icon: LucideIcon,
    items: MenuItem[],
    defaultOpen: boolean
  ) => {
    const SectionIcon = icon

    if (isCollapsed) {
      return <div className="space-y-1">{items.map((item) => renderNavItem(item, true))}</div>
    }

    return (
      <Accordion type="single" collapsible defaultValue={defaultOpen ? value : undefined} className="w-full">
        <AccordionItem value={value} className="border-none">
          <AccordionTrigger className="rounded-md px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted hover:no-underline [&[data-state=open]>svg]:rotate-180">
            <div className="flex items-center gap-2">
              <SectionIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span>{title}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-0 pt-1">
            <div className="space-y-1 border-l border-border/60 pl-3 ml-2">
              {items.map((item) => renderNavItem(item, false))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    )
  }

  return (
    <aside
      className={cn(
        "border-r bg-card h-screen flex flex-col transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="p-6 border-b relative">
        <div className={cn("flex items-center gap-2 transition-opacity", isCollapsed && "justify-center")}>
          <Shield className="h-6 w-6 text-primary shrink-0" />
          {!isCollapsed && <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className={cn("absolute top-4 right-2 h-8 w-8 hidden md:flex", isCollapsed && "right-1")}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => renderNavItem(item, isCollapsed))}

        {renderAccordionSection(
          "newsletter",
          "Newsletter Admin",
          Mail,
          newsletterMenuItems,
          isAnyNewsletterPageActive
        )}

        {renderAccordionSection(
          "blaze-content",
          "Blaze Content Admin",
          LayoutGrid,
          contentMenuItems,
          isAnyBlazeContentPageActive
        )}

        {settingsMenuItems.length > 0
          ? renderAccordionSection(
              "blaze-settings",
              "Blaze Settings",
              Settings,
              settingsMenuItems,
              isAnyBlazeSettingsPageActive
            )
          : null}
      </nav>

      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className={cn(
            "w-full text-sm font-medium text-destructive hover:text-destructive hover:bg-destructive/10",
            isCollapsed ? "justify-center px-0" : "justify-start"
          )}
          onClick={handleSignOut}
          title={isCollapsed ? "Sign Out" : undefined}
        >
          <LogOut className={cn("h-4 w-4 shrink-0", !isCollapsed && "mr-2")} />
          {!isCollapsed && "Sign Out"}
        </Button>
      </div>
    </aside>
  )
}
