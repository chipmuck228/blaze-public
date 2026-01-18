'use client'

import { useState } from "react"
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
  BookOpen,
  FolderTree,
  List,
  Tag,
  Link as LinkIcon,
  Calendar,
  MapPin,
  ChevronLeft,
  ChevronRight,
  History,
  ShoppingCart,
  Package,
  Network,
  Mail,
  Send,
  FileText,
  BarChart3,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

const menuItems = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "User Management",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Enrollments",
    href: "/admin/enrollments",
    icon: ShoppingCart,
  },
  {
    title: "Team Management",
    href: "/admin/teams",
    icon: UserCircle,
  },
  {
    title: "Traffic",
    href: "/admin/traffic",
    icon: BarChart3,
  },
  {
    title: "Admin Guide",
    href: "/admin/guide",
    icon: Settings,
  },
]

const courseMenuItems = [
  {
    title: "Offerings",
    href: "/admin/courses",
    icon: BookOpen,
  },
  {
    title: "Assignments",
    href: "/admin/assignments",
    icon: LinkIcon,
  },
  {
    title: "Instances",
    href: "/admin/instances",
    icon: Calendar,
  },
  {
    title: "New Offerings",
    href: "/admin/offerings",
    icon: Package,
  },
  {
    title: "New Assignments",
    href: "/admin/offerings-assignments",
    icon: Network,
  },
]

const settingsMenuItems = [
  {
    title: "Programs",
    href: "/admin/series",
    icon: List,
  },
  {
    title: "Categories",
    href: "/admin/categories",
    icon: FolderTree,
  },
  {
    title: "Campuses",
    href: "/admin/locations",
    icon: MapPin,
  },
  {
    title: "Franchises",
    href: "/admin/franchises",
    icon: Network,
  },
  {
    title: "Subcategories",
    href: "/admin/subcategories",
    icon: Tag,
  },
  {
    title: "Learning Paths",
    href: "/admin/learning-paths",
    icon: FolderTree,
  },
  {
    title: "Offering Types",
    href: "/admin/offering-types",
    icon: Package,
  },
]

const newsletterMenuItems = [
  {
    title: "Subscribers",
    href: "/admin/newsletter/subscribers",
    icon: Mail,
  },
  {
    title: "Templates",
    href: "/admin/newsletter/templates",
    icon: FileText,
  },
  {
    title: "Send Newsletter",
    href: "/admin/newsletter/send",
    icon: Send,
  },
  {
    title: "Campaigns",
    href: "/admin/newsletter/campaigns",
    icon: History,
  },
  {
    title: "Failed Sends",
    href: "/admin/newsletter/failed-sends",
    icon: AlertCircle,
  },
]

interface AdminSidebarProps {
  onNavigate?: () => void
}

export function AdminSidebar({ onNavigate }: AdminSidebarProps = {}) {
  const pathname = usePathname()
  const router = useRouter()
  const { isCollapsed, setIsCollapsed } = useSidebar()

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    router.push("/")
    router.refresh()
  }

  // 检查是否有任何课程相关的页面是活动的
  const isAnyCoursePageActive = courseMenuItems.some(
    (item) => pathname === item.href || pathname?.startsWith(item.href + "/")
  )

  // 检查是否有任何设置相关的页面是活动的
  const isAnySettingsPageActive = settingsMenuItems.some(
    (item) => pathname === item.href || pathname?.startsWith(item.href + "/")
  )

  // 检查是否有任何 Newsletter 相关的页面是活动的
  const isAnyNewsletterPageActive = newsletterMenuItems.some(
    (item) => pathname === item.href || pathname?.startsWith(item.href + "/")
  )

  return (
    <aside className={cn(
      "border-r bg-card h-screen flex flex-col transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <div className="p-6 border-b relative">
        <div className={cn(
          "flex items-center gap-2 transition-opacity",
          isCollapsed && "justify-center"
        )}>
          <Shield className="h-6 w-6 text-primary shrink-0" />
          {!isCollapsed && <h1 className="text-xl font-bold">Admin Panel</h1>}
        </div>
        {/* 只在非移动端显示折叠按钮 */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute top-4 right-2 h-8 w-8 hidden md:flex",
            isCollapsed && "right-1"
          )}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
          
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              title={isCollapsed ? item.title : undefined}
              onClick={onNavigate}
            >
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full font-medium",
                  isCollapsed ? "justify-center px-0" : "justify-start",
                  isActive && "bg-secondary"
                )}
              >
                <Icon className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
                {!isCollapsed && item.title}
              </Button>
            </Link>
          )
        })}

        {/* Content Admin 可展开菜单 */}
        {!isCollapsed ? (
          <Accordion type="single" collapsible defaultValue={isAnyCoursePageActive ? "courses" : undefined} className="w-full">
            <AccordionItem value="courses" className="border-none">
              <AccordionTrigger className="px-3 py-2 hover:no-underline">
                <div className="flex items-center gap-2 w-full">
                  <BookOpen className="h-4 w-4" />
                  <span className="text-sm font-medium pl-2">Content Admin</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-0 pt-2">
                <div className="space-y-1 pl-6">
                  {courseMenuItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
                    
                    return (
                      <Link 
                        key={item.href} 
                        href={item.href}
                        onClick={onNavigate}
                      >
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          className={cn(
                            "w-full justify-start text-sm",
                            isActive && "bg-secondary"
                          )}
                        >
                          <Icon className="mr-2 h-4 w-4" />
                          {item.title}
                        </Button>
                      </Link>
                    )
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ) : (
          <div className="space-y-1">
            {courseMenuItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
              
              return (
                <Link 
                  key={item.href} 
                  href={item.href} 
                  title={item.title}
                  onClick={onNavigate}
                >
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-center px-0",
                      isActive && "bg-secondary"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                </Link>
              )
            })}
          </div>
        )}

        {/* Settings 可展开菜单 */}
        {!isCollapsed ? (
          <Accordion type="single" collapsible defaultValue={isAnySettingsPageActive ? "settings" : undefined} className="w-full">
            <AccordionItem value="settings" className="border-none">
              <AccordionTrigger className="px-3 py-2 hover:no-underline">
                <div className="flex items-center gap-2 w-full">
                  <Settings className="h-4 w-4" />
                  <span className="text-sm font-medium pl-2">Settings</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-0 pt-2">
                <div className="space-y-1 pl-6">
                  {settingsMenuItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
                    
                    return (
                      <Link 
                        key={item.href} 
                        href={item.href}
                        onClick={onNavigate}
                      >
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          className={cn(
                            "w-full justify-start text-sm",
                            isActive && "bg-secondary"
                          )}
                        >
                          <Icon className="mr-2 h-4 w-4" />
                          {item.title}
                        </Button>
                      </Link>
                    )
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ) : (
          <div className="space-y-1">
            {settingsMenuItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
              
              return (
                <Link 
                  key={item.href} 
                  href={item.href} 
                  title={item.title}
                  onClick={onNavigate}
                >
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-center px-0",
                      isActive && "bg-secondary"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                </Link>
              )
            })}
          </div>
        )}

        {/* Newsletter 可展开菜单 */}
        {!isCollapsed ? (
          <Accordion type="single" collapsible defaultValue={isAnyNewsletterPageActive ? "newsletter" : undefined} className="w-full">
            <AccordionItem value="newsletter" className="border-none">
              <AccordionTrigger className="px-3 py-2 hover:no-underline">
                <div className="flex items-center gap-2 w-full">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm font-medium pl-2">Newsletter Admin</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-0 pt-2">
                <div className="space-y-1 pl-6">
                  {newsletterMenuItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
                    
                    return (
                      <Link 
                        key={item.href} 
                        href={item.href}
                        onClick={onNavigate}
                      >
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          className={cn(
                            "w-full justify-start text-sm",
                            isActive && "bg-secondary"
                          )}
                        >
                          <Icon className="mr-2 h-4 w-4" />
                          {item.title}
                        </Button>
                      </Link>
                    )
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ) : (
          <div className="space-y-1">
            {newsletterMenuItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
              
              return (
                <Link 
                  key={item.href} 
                  href={item.href} 
                  title={item.title}
                  onClick={onNavigate}
                >
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-center px-0",
                      isActive && "bg-secondary"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className={cn(
            "w-full text-destructive hover:text-destructive",
            isCollapsed ? "justify-center px-0" : "justify-start"
          )}
          onClick={handleSignOut}
          title={isCollapsed ? "Sign Out" : undefined}
        >
          <LogOut className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
          {!isCollapsed && "Sign Out"}
        </Button>
      </div>
    </aside>
  )
}

