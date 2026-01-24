'use client'

import { useEffect, useState } from "react"
import { Loader2, MapPin, Mail, Phone, Clock, BookOpen, Calendar, Target } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { BusinessHours } from "./BusinessHours"

interface LocationFeaturesProps {
  franchiseCode: string
}

interface FranchiseV2 {
  id: string
  code: string
  name: string
  branding_config: {
    highlights?: {
      programs?: string
      schedule?: string
      focus?: string
    }
    contact?: {
      email?: string | null
      phone?: string | null
      address?: {
        street?: string
        city?: string
        state?: string
        zip?: string
      } | null
      businessHours?: {
        monday?: string
        tuesday?: string
        wednesday?: string
        thursday?: string
        friday?: string
        saturday?: string
        sunday?: string
      }
    }
    social?: {
      facebook?: string | null
      instagram?: string | null
      twitter?: string | null
      youtube?: string | null
    }
  } | null
}

export function LocationFeatures({ franchiseCode }: LocationFeaturesProps) {
  const [franchise, setFranchise] = useState<FranchiseV2 | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchFranchise = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch(`/api/public/franchises-v2/${encodeURIComponent(franchiseCode.toLowerCase())}`)
        if (!response.ok) {
          if (response.status === 404) {
            setError("Franchise not found")
            return
          }
          throw new Error(`Failed to fetch franchise: ${response.statusText}`)
        }
        const franchiseData = await response.json()
        setFranchise(franchiseData)
      } catch (err: any) {
        console.error("Error fetching franchise:", err)
        setError(err.message || "Failed to load franchise data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchFranchise()
  }, [franchiseCode])

  if (isLoading) {
    return (
      <section className="py-16 sm:py-20 lg:py-24 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </div>
      </section>
    )
  }

  if (error || !franchise || !franchise.branding_config) {
    return null // 如果出错或没有数据，不显示组件
  }

  const brandingConfig = franchise.branding_config
  const highlights = brandingConfig.highlights
  const contact = brandingConfig.contact
  const hasHighlights = highlights && (highlights.programs || highlights.schedule || highlights.focus)
  const hasContact = contact && (contact.email || contact.phone || contact.address)

  // 如果没有要显示的内容，不渲染组件
  if (!hasHighlights && !hasContact) {
    return null
  }

  // 格式化地址
  const formatAddress = () => {
    if (!contact?.address) return null
    const parts = [
      contact.address.street,
      contact.address.city,
      contact.address.state,
      contact.address.zip
    ].filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : null
  }

  const address = formatAddress()

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-10 items-start">
          {/* Left Column: Highlights */}
          {hasHighlights && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Campus Highlights</h2>
              <p className="text-muted-foreground dark:text-slate-300 text-sm leading-relaxed">
                Discover what makes our {franchise.name} campus special.
              </p>
              
              <div className="space-y-6 mt-6">
                {highlights.programs && (
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground dark:text-white mb-1">Programs</h3>
                      <p className="text-sm text-muted-foreground dark:text-slate-300 leading-relaxed">
                        {highlights.programs}
                      </p>
                    </div>
                  </div>
                )}

                {highlights.schedule && (
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground dark:text-white mb-1">Schedule</h3>
                      <p className="text-sm text-muted-foreground dark:text-slate-300 leading-relaxed">
                        {highlights.schedule}
                      </p>
                    </div>
                  </div>
                )}

                {highlights.focus && (
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Target className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground dark:text-white mb-1">Focus</h3>
                      <p className="text-sm text-muted-foreground dark:text-slate-300 leading-relaxed">
                        {highlights.focus}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Right Column: Contact Information */}
          {hasContact && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Campus Information</h2>
              <p className="text-muted-foreground dark:text-slate-300 text-sm leading-relaxed">
                Get in touch with our {franchise.name} campus team.
              </p>
              
              <div className="space-y-3 mt-6">
                {address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 mt-0.5 text-primary flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground dark:text-white">Address</p>
                      <p className="text-sm text-muted-foreground dark:text-slate-300">{address}</p>
                    </div>
                  </div>
                )}

                {contact.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 mt-0.5 text-primary flex-shrink-0" />
                    <div>
                      <p className="font-medium text-foreground dark:text-white">Phone</p>
                      <a href={`tel:${contact.phone}`} className="text-sm text-muted-foreground dark:text-slate-300 hover:text-primary">
                        {contact.phone}
                      </a>
                    </div>
                  </div>
                )}

                {contact.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 mt-0.5 text-primary flex-shrink-0" />
                    <div>
                      <p className="font-medium text-foreground dark:text-white">Email</p>
                      <a href={`mailto:${contact.email}`} className="text-sm text-muted-foreground dark:text-slate-300 hover:text-primary">
                        {contact.email}
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {contact.businessHours && (
                <div className="mt-6">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="business-hours" className="border border-slate-200 dark:border-slate-700 rounded-lg">
                      <AccordionTrigger className="px-4 hover:no-underline">
                        <div className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-primary" />
                          <h3 className="font-semibold text-foreground dark:text-white">Business Hours</h3>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <BusinessHours businessHours={contact.businessHours} />
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
