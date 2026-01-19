import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { MapPin, ArrowRight, Mail, Phone, Clock, ExternalLink } from "lucide-react"
import { notFound } from "next/navigation"
import { getFranchiseDetailsByCode, getFranchiseLocations } from "@/lib/db"
import { LocationFeaturedCourses } from "@/components/location/LocationFeaturedCourses"
import { AIChatButton } from "@/components/location/AIChatButton"
import { ContactButton } from "@/components/location/ContactButton"
import type { Franchise, FranchiseBrandingConfig, CourseLocation } from "@/lib/db"

interface LocationPageProps {
  params: Promise<{ code: string }>
}

// 辅助函数：从 branding_config 获取值，带回退
function getHeroTitle(franchise: Franchise): string {
  // 优先使用 branding_config.hero.title
  if (franchise.branding_config?.hero?.title) {
    return franchise.branding_config.hero.title
  }
  // 回退到 franchise.name
  if (franchise.name) {
    return franchise.name
  }
  // 最后回退到默认值
  return 'Robotics Academy'
}

function getHeroDescription(franchise: Franchise): string {
  // 优先使用 branding_config.hero.description
  if (franchise.branding_config?.hero?.description) {
    return franchise.branding_config.hero.description
  }
  // 回退到默认描述
  const locationName = franchise.name || franchise.code || 'area'
  return `Local robotics, coding, and engineering programs for students in the ${locationName} area.`
}

function getHighlightPrograms(franchise: Franchise): string {
  return franchise.branding_config?.highlights?.programs || 
    'Age-appropriate robotics, coding, and STEM programs designed for local students.'
}

function getHighlightSchedule(franchise: Franchise): string {
  return franchise.branding_config?.highlights?.schedule || 
    'After-school and weekend offerings during the school year, plus camps during breaks.'
}

function getHighlightFocus(franchise: Franchise): string {
  return franchise.branding_config?.highlights?.focus || 
    'Hands-on learning, teamwork, and preparing students for real-world robotics challenges.'
}

function getContactEmail(franchise: Franchise, locations: CourseLocation[]): string | null {
  return franchise.branding_config?.contact?.email || 
    locations.find(l => l.email)?.email || 
    null
}

function getContactPhone(franchise: Franchise, locations: CourseLocation[]): string | null {
  return franchise.branding_config?.contact?.phone || 
    locations.find(l => l.phone)?.phone || 
    null
}

function getPrimaryAddress(franchise: Franchise, locations: CourseLocation[]): string {
  const configAddress = franchise.branding_config?.contact?.address
  if (configAddress) {
    const parts = [
      configAddress.street,
      configAddress.city,
      configAddress.state,
      configAddress.zip
    ].filter(Boolean)
    if (parts.length > 0) {
      return parts.join(', ')
    }
  }
  
  // 回退到第一个 location 的地址
  if (locations.length > 0) {
    const loc = locations[0]
    const parts = [
      loc.address,
      loc.city,
      loc.state,
      loc.zip_code
    ].filter(Boolean)
    if (parts.length > 0) {
      return parts.join(', ')
    }
  }
  
  return `${franchise.name || 'Campus'}`
}

export default async function GenericLocationPage({ params }: LocationPageProps) {
  const { code } = await params
  const normalizedCode = decodeURIComponent(code).toLowerCase()

  // 获取 franchise 详细信息（包含 branding_config）
  const franchise = await getFranchiseDetailsByCode(normalizedCode)

  if (!franchise) {
    notFound()
  }

  // 调试：检查 branding_config
  if (process.env.NODE_ENV === 'development') {
    console.log('[LocationPage] Franchise:', {
      code: franchise.code,
      name: franchise.name,
      hasBrandingConfig: !!franchise.branding_config,
      brandingConfigType: typeof franchise.branding_config,
      heroTitle: franchise.branding_config?.hero?.title,
      heroDescription: franchise.branding_config?.hero?.description,
    })
  }

  // 获取 franchise 的 locations
  const locations = await getFranchiseLocations(franchise.id)

  // 使用辅助函数获取显示内容
  // 确保 displayName 有值：优先使用 franchise.name，如果没有则使用 code（首字母大写）
  const displayName = franchise.name || 
    normalizedCode.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') ||
    normalizedCode
  const heroTitle = getHeroTitle(franchise)
  const heroDescription = getHeroDescription(franchise)
  const highlightPrograms = getHighlightPrograms(franchise)
  const highlightSchedule = getHighlightSchedule(franchise)
  const highlightFocus = getHighlightFocus(franchise)
  const contactEmail = getContactEmail(franchise, locations)
  const contactPhone = getContactPhone(franchise, locations)
  const primaryAddress = getPrimaryAddress(franchise, locations)
  const businessHours = franchise.branding_config?.contact?.businessHours

  // 调试：检查解析后的值
  if (process.env.NODE_ENV === 'development') {
    console.log('[LocationPage] Parsed values:', {
      heroTitle,
      heroDescription,
      highlightPrograms,
      contactEmail,
      contactPhone,
      primaryAddress,
      hasBusinessHours: !!businessHours,
    })
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-16 sm:py-20">
          {/* Hero */}
          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <div className="space-y-6">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold">
                {heroTitle}abc
              </h1>
              <p className="text-lg text-muted-foreground">
                {heroDescription}
              </p>
              {primaryAddress && (
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-5 w-5 mt-0.5 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{displayName} Campus123</p>
                      <div className="flex items-center gap-2">
                        <p>{primaryAddress}</p>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(primaryAddress)}`}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-primary hover:text-primary/80 transition-colors"
                          aria-label="Open location in Google Maps"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <a href={`/course-catalog?franchise=${encodeURIComponent(normalizedCode)}`}>
                    View Activities
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <ContactButton displayName={displayName} />
              </div>
            </div>

            {/* Highlights card */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>{displayName} Highlights</CardTitle>
                <CardDescription>
                  A quick overview of what students can expect at the {displayName} campus.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground mb-1">Programs</p>
                  <p>{highlightPrograms}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Schedule</p>
                  <p>{highlightSchedule}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Focus</p>
                  <p>{highlightFocus}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Featured courses for this franchise */}
          <LocationFeaturedCourses
            franchiseCode={normalizedCode}
            locationName={displayName}
          />

          {/* Contact / Info section */}
          <section
            id="contact"
            className="mt-16 grid md:grid-cols-2 gap-10 items-start"
          >
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">Campus Information</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                This campus serves families in and around {displayName}. 
                {locations.length > 1 && ` We have ${locations.length} locations in the area.`}
              </p>
              
              {/* Contact Information */}
              {(contactEmail || contactPhone || primaryAddress) && (
                <div className="space-y-3 mt-6">
                  {primaryAddress && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 mt-0.5 text-primary" />
                      <div className="flex-1">
                        <p className="font-medium text-foreground">Address</p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground">{primaryAddress}</p>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(primaryAddress)}`}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-primary hover:text-primary/80 transition-colors"
                            aria-label="Open location in Google Maps"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                  {contactPhone && (
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 mt-0.5 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">Phone</p>
                        <a href={`tel:${contactPhone}`} className="text-sm text-muted-foreground hover:text-primary">
                          {contactPhone}
                        </a>
                      </div>
                    </div>
                  )}
                  {contactEmail && (
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 mt-0.5 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">Email</p>
                        <a href={`mailto:${contactEmail}`} className="text-sm text-muted-foreground hover:text-primary">
                          {contactEmail}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                For specific class schedules and availability at {displayName}, please view the program
                catalog or reach out to the local campus team.
              </p>
              {locations.length > 1 && (
                <div className="mt-6">
                  <p className="font-medium text-foreground mb-2">Our Locations</p>
                  <ul className="space-y-2">
                    {locations.map((location) => {
                      const locationAddress = [
                        location.address,
                        location.city,
                        location.state,
                        location.zip_code
                      ].filter(Boolean).join(', ')
                      
                      return (
                        <li key={location.id} className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-0.5 text-primary" />
                          <div className="flex-1">
                            <p className="font-medium">{location.name}</p>
                            {locationAddress && (
                              <div className="flex items-center gap-2">
                                <p className="text-xs">{locationAddress}</p>
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationAddress)}`}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  className="text-primary hover:text-primary/80 transition-colors"
                                  aria-label={`Open ${location.name} in Google Maps`}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
          </section>
        </section>
      </main>
      <Footer />
      <AIChatButton
        franchiseCode={normalizedCode}
        franchiseName={displayName}
      />
    </>
  )
}


