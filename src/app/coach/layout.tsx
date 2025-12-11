'use client'

import { useSession } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import { CoachSidebar } from "@/components/coach/CoachSidebar"

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const isLoginPage = pathname === "/coach/login"

  useEffect(() => {
    // 如果是登录页面，不需要检查认证
    if (isLoginPage) {
      return
    }

    if (status === "unauthenticated") {
      router.push("/coach/login")
    } else if (status === "authenticated" && session?.user?.role !== "coach") {
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

  if (status === "unauthenticated" || session?.user?.role !== "coach") {
    return null
  }

  return (
    <div className="min-h-screen flex">
      <CoachSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}

