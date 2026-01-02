'use client'

import { useSession } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const isLoginPage = pathname === "/admin/login"
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    // 如果是登录页面，不需要检查认证
    if (isLoginPage) {
      return
    }

    if (status === "unauthenticated") {
      router.push("/admin/login")
    } else if (status === "authenticated" && session?.user?.role !== "admin") {
      router.push("/")
    }
  }, [status, session, router, isLoginPage])

  // 如果是登录页面，直接渲染子组件（不显示 sidebar）
  if (isLoginPage) {
    return <>{children}</>
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (status === "unauthenticated" || session?.user?.role !== "admin") {
    return null
  }

  return (
    <div className="min-h-screen flex">
      {/* 大屏幕：固定侧边栏 */}
      <aside className="hidden md:block fixed top-0 left-0 h-screen z-30">
        <AdminSidebar />
      </aside>
      
      {/* 小屏幕：抽屉式侧边栏 */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Admin Navigation Menu</SheetTitle>
          <AdminSidebar onNavigate={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      <main className="flex-1 md:ml-64 overflow-auto relative">
        {/* 小屏幕：汉堡菜单按钮 */}
        <div className="md:hidden fixed top-4 left-4 z-40">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
          </Sheet>
        </div>
        <div className="md:pt-0 pt-16">
          {children}
        </div>
      </main>
    </div>
  )
}

