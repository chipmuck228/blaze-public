'use client'

import dynamic from "next/dynamic"
import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { MobileLayout } from "@/app/mobile-layout"
import { usePlatform } from "@/hooks/usePlatform"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

const InstanceDetail = dynamic(
  () => import("@/components/category/InstanceDetail").then((m) => ({ default: m.InstanceDetail })),
  {
    loading: () => (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
      </div>
    ),
    ssr: false,
  }
)

export function InstanceDetailPageClient() {
  const { isNative, isReady } = usePlatform()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !isReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
      </div>
    )
  }

  if (isNative) {
    return (
      <MobileLayout>
        <InstanceDetail />
      </MobileLayout>
    )
  }

  return (
    <>
      <Navbar />
      <div className="pt-14">
        <InstanceDetail />
        <Footer />
      </div>
    </>
  )
}
