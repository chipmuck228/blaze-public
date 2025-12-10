'use client'

import { usePathname, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
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
    title: "Team Management",
    href: "/admin/teams",
    icon: UserCircle,
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
]

const courseMenuItems = [
  {
    title: "Courses",
    href: "/admin/courses",
    icon: BookOpen,
  },
  {
    title: "Categories",
    href: "/admin/categories",
    icon: FolderTree,
  },
  {
    title: "Series",
    href: "/admin/series",
    icon: List,
  },
  {
    title: "Subcategories",
    href: "/admin/subcategories",
    icon: Tag,
  },
  {
    title: "Assignments",
    href: "/admin/assignments",
    icon: LinkIcon,
  },
  {
    title: "Locations",
    href: "/admin/locations",
    icon: MapPin,
  },
  {
    title: "Instances",
    href: "/admin/instances",
    icon: Calendar,
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    router.push("/")
    router.refresh()
  }

  // 检查是否有任何课程相关的页面是活动的
  const isAnyCoursePageActive = courseMenuItems.some(
    (item) => pathname === item.href || pathname?.startsWith(item.href + "/")
  )

  return (
    <aside className="w-64 border-r bg-card min-h-screen flex flex-col">
      <div className="p-6 border-b">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Admin Panel</h1>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
          
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start font-medium",
                  isActive && "bg-secondary"
                )}
              >
                <Icon className="mr-2 h-4 w-4" />
                {item.title}
              </Button>
            </Link>
          )
        })}

        {/* Courses 可展开菜单 */}
        <Accordion type="single" collapsible defaultValue={isAnyCoursePageActive ? "courses" : undefined} className="w-full">
          <AccordionItem value="courses" className="border-none">
            <AccordionTrigger className="px-3 py-2 hover:no-underline">
              <div className="flex items-center gap-2 w-full">
                <BookOpen className="h-4 w-4" />
                <span className="font-medium">Courses Admin</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-0 pt-2">
              <div className="space-y-1 pl-6">
                {courseMenuItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
                  
                  return (
                    <Link key={item.href} href={item.href}>
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
      </nav>

      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  )
}

