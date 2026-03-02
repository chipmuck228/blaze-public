'use client'

import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { MobileLayout } from "@/app/mobile-layout"
import { usePlatform } from "@/hooks/usePlatform"
import { useEffect, useState } from "react"
import { InstanceDetail } from "@/components/category/InstanceDetail"

export function InstanceDetailPageClient() {
  const { isNative, isReady } = usePlatform()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !isReady) {
    return <InstanceDetail />
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
