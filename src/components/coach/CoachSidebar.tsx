'use client'

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  LogOut,
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

const menuItems = [
  {
    title: "Dashboard",
    href: "/coach",
    icon: LayoutDashboard,
  },
  {
    title: "My Classes",
    href: "/coach/classes",
    icon: BookOpen,
  },
  {
    title: "Schedule",
    href: "/coach/schedule",
    icon: Calendar,
  },
]

export function CoachSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    router.push("/")
    router.refresh()
  }

  return (
    <aside className={cn(
      "border-r bg-card min-h-screen flex flex-col transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <div className="p-6 border-b relative">
        <div className={cn(
          "flex items-center gap-2 transition-opacity",
          isCollapsed && "justify-center"
        )}>
          <GraduationCap className="h-6 w-6 text-primary shrink-0" />
          {!isCollapsed && <h1 className="text-xl font-bold">Coach Portal</h1>}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute top-4 right-2 h-8 w-8",
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
            <Link key={item.href} href={item.href} title={isCollapsed ? item.title : undefined}>
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

