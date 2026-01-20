import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { MapPin, Mail, Phone, ExternalLink } from "lucide-react"
import { notFound } from "next/navigation"
import { getFranchiseDetailsByCode, getFranchiseLocations } from "@/lib/db"
import { LocationFeaturedCourses } from "@/components/location/LocationFeaturedCourses"
import { LocationHero } from "@/components/location/LocationHero"
import { AIChatButton } from "@/components/location/AIChatButton"
import { BusinessHours } from "@/components/location/BusinessHours"
import type { Franchise, CourseLocation } from "@/lib/db"

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
        {/* Hero Section */}
        <LocationHero
          heroTitle={heroTitle}
          heroDescription={heroDescription}
          displayName={displayName}
          primaryAddress={primaryAddress}
          normalizedCode={normalizedCode}
          highlights={{
            programs: highlightPrograms,
            schedule: highlightSchedule,
            focus: highlightFocus,
          }}
        />

        <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-16 sm:py-20">
          {/* Featured courses for this franchise */}
          <div id="programs">
            <LocationFeaturedCourses
              franchiseCode={normalizedCode}
              locationName={displayName}
            />
          </div>

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
              <BusinessHours businessHours={businessHours} />
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


