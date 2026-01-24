'use client'

import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { AIChatButton } from "@/components/location/AIChatButton"
import { Download, FileText, Monitor, Book, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"

export default function ResourcesPage() {
  const resources = [
    {
      category: 'Software & Tools',
      items: [
        { title: 'VEXcode IQ', desc: 'Programming environment for IQ robots', icon: <Monitor className="w-6 h-6 text-blue-500" /> },
        { title: 'VEXcode V5', desc: 'Programming environment for V5 robots', icon: <Monitor className="w-6 h-6 text-red-500" /> },
        { title: 'Fusion 360', desc: 'CAD software for 3D modeling', icon: <Monitor className="w-6 h-6 text-orange-500" /> },
      ]
    },
    {
      category: 'Competition Manuals',
      items: [
        { title: 'Rapid Relay (IQ) Manual', desc: 'Official game rules 2025-2026', icon: <Book className="w-6 h-6 text-purple-500" /> },
        { title: 'High Stakes (V5) Manual', desc: 'Official game rules 2025-2026', icon: <Book className="w-6 h-6 text-green-500" /> },
      ]
    },
    {
      category: 'Parent Guides',
      items: [
        { title: 'New Parent Handbook', desc: 'Everything you need to know', icon: <FileText className="w-6 h-6 text-slate-500" /> },
        { title: 'Tournament Checklist', desc: 'What to bring on game day', icon: <FileText className="w-6 h-6 text-slate-500" /> },
      ]
    }
  ]

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-20">
        <div className="pb-24">
          <section className="bg-[#0f172a] py-20 text-white text-center relative">
            <div className="max-w-7xl mx-auto px-4">
              {/* Back Button */}
              <div className="absolute top-6 left-4 md:left-8">
                <Link href="/">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:text-[#38bdf8] hover:bg-white/10"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Home
                  </Button>
                </Link>
              </div>
              <h1 className="text-5xl font-extrabold mb-4">Resources</h1>
              <p className="text-[#38bdf8] text-xl">Tools and documentation for students and parents.</p>
            </div>
          </section>

          <div className="max-w-7xl mx-auto px-4 py-16">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {resources.map((cat, idx) => (
                <div key={idx} className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-lg transition-shadow">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">{cat.category}</h2>
                  <div className="space-y-6">
                    {cat.items.map((item, i) => (
                      <div key={i} className="flex items-start space-x-4 p-4 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer">
                        <div className="bg-slate-100 p-3 rounded-lg group-hover:bg-white group-hover:shadow-md transition-all shrink-0">
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{item.title}</h3>
                          <p className="text-sm text-slate-500 mb-2">{item.desc}</p>
                          <span className="text-xs font-bold text-blue-600 flex items-center">
                            <Download className="w-3 h-3 mr-1" /> Download
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <AIChatButton
        franchiseCode="general"
        franchiseName="Blaze Robotics Academy"
      />
    </>
  )
}
