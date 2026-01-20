'use client'

import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { Faq } from "@/components/Faq"
import { AIChatButton } from "@/components/location/AIChatButton"
import { Button } from "@/components/ui/button"
import { MessageCircle } from "lucide-react"
import { useState, useEffect } from "react"

export default function FAQPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleContactSupport = () => {
    // 触发 AI Chat Dialog 打开
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('openAIChat')
      window.dispatchEvent(event)
    }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-20">
        

        {/* FAQ Component */}
        <Faq />
        {/* Support Button Section */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-8 flex justify-center">
          <Button
            onClick={handleContactSupport}
            className="bg-[#2563eb] text-white px-6 py-3 rounded-full font-bold hover:bg-blue-600 transition-all transform hover:scale-105 shadow-md hover:shadow-blue-500/20 flex items-center gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            Contact Support
          </Button>
        </div>
      </main>
      <Footer />
      {mounted && (
        <AIChatButton
          franchiseCode="general"
          franchiseName="Blaze Robotics Academy"
        />
      )}
    </>
  )
}
