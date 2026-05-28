'use client'

import { useState, useEffect } from "react"
import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { Download, FileText, Monitor, Book, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface ResourceItem {
  id: string
  title: string
  description?: string
  icon?: string
  icon_color?: string
  document_url?: string
  document_label: string
  open_in_new_tab: boolean
}

interface ResourceCategory {
  id: string
  display_name: string
  display_order: number
  resources: ResourceItem[]
}

const iconMap = {
  monitor: Monitor,
  book: Book,
  "file-text": FileText,
} as const

const colorClassMap: Record<string, string> = {
  "blue-500": "text-blue-500",
  "red-500": "text-red-500",
  "orange-500": "text-orange-500",
  "purple-500": "text-purple-500",
  "green-500": "text-green-500",
  "slate-500": "text-slate-500",
}

function ResourceIcon({ icon, iconColor }: { icon?: string; iconColor?: string }) {
  const IconComponent = icon && icon in iconMap ? iconMap[icon as keyof typeof iconMap] : FileText
  const colorClass = iconColor && colorClassMap[iconColor] ? colorClassMap[iconColor] : "text-slate-500"
  const style = iconColor?.startsWith("#") ? { color: iconColor } : undefined
  return <IconComponent className={`w-6 h-6 ${colorClass}`} style={style} />
}

export default function ResourcesPage() {
  const [categories, setCategories] = useState<ResourceCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/public/resources/v2")
        if (!res.ok) throw new Error("Failed to load resources")
        const data = await res.json()
        if (!cancelled) setCategories(data.categories ?? [])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-20">
        <div className="pb-24">
          <section className="bg-[#0f172a] py-20 text-white text-center relative">
            <div className="max-w-7xl mx-auto px-4">
              
              <h1 className="text-5xl font-extrabold mb-4">Resources</h1>
              <p className="text-[#38bdf8] text-xl">
                Tools and documentation for students and parents.
              </p>
            </div>
          </section>

          <div className="max-w-7xl mx-auto px-4 py-16">
            {loading ? (
              <div className="text-center py-16 text-slate-500">
                Loading resources...
              </div>
            ) : error ? (
              <div className="text-center py-16 text-slate-600">
                <p>{error}</p>
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                No resources available at the moment.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-lg transition-shadow"
                  >
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">
                      {cat.display_name}
                    </h2>
                    <div className="space-y-6">
                      {cat.resources.length === 0 ? (
                        <p className="text-sm text-slate-500">No resources in this category.</p>
                      ) : (
                        cat.resources.map((item) => {
                          const content = (
                            <>
                              <div className="bg-slate-100 p-3 rounded-lg group-hover:bg-white group-hover:shadow-md transition-all shrink-0">
                                <ResourceIcon
                                  icon={item.icon}
                                  iconColor={item.icon_color}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                                  {item.title}
                                </h3>
                                {item.description && (
                                  <p className="text-sm text-slate-500 mb-2">
                                    {item.description}
                                  </p>
                                )}
                                <span className="text-xs font-bold text-blue-600 flex items-center">
                                  <Download className="w-3 h-3 mr-1" />
                                  {item.document_label}
                                </span>
                              </div>
                            </>
                          )
                          const className =
                            "flex items-start space-x-4 p-4 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer w-full text-left"
                          return item.document_url ? (
                            <a
                              key={item.id}
                              href={item.document_url}
                              target={item.open_in_new_tab ? "_blank" : undefined}
                              rel={item.open_in_new_tab ? "noopener noreferrer" : undefined}
                              className={className}
                            >
                              {content}
                            </a>
                          ) : (
                            <div key={item.id} className={className}>
                              {content}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
