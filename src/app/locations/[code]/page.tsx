import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { notFound } from "next/navigation"
import { getFranchiseDetailsByCode, getFranchiseLocations } from "@/lib/db"
import { LocationFeaturedCourses } from "@/components/location/LocationFeaturedCourses"
import { LocationHero } from "@/components/location/LocationHero"
import { LocationFeatures } from "@/components/location/LocationFeatures"
import { RoboticsJourney } from "@/components/RoboticsJourney"
import { Advantages } from "@/components/Advantages"
import { Testimonials } from "@/components/Testimonials"
import { Newsletter } from "@/components/Newsletter"
import { AIChatButton } from "@/components/location/AIChatButton"
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
  const primaryAddress = getPrimaryAddress(franchise, locations)

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
        />

        {/* Features Section */}
        <LocationFeatures franchiseCode={normalizedCode} />

        {/* Featured Courses Section */}
        <section className="bg-[#0f172a] dark:bg-slate-900 py-16 sm:py-20 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div id="programs">
              <LocationFeaturedCourses
                franchiseCode={normalizedCode}
                locationName={displayName}
              />
            </div>
          </div>
        </section>

        {/* Robotics Journey Section */}
        <RoboticsJourney />

        {/* Advantages Section */}
        <Advantages />

        {/* Testimonials Section */}
        <Testimonials franchiseCode={normalizedCode} locationName={displayName} />

        {/* Newsletter Section */}
        <Newsletter />
      </main>
      <Footer />
      <AIChatButton
        franchiseCode={normalizedCode}
        franchiseName={displayName}
      />
    </>
  )
}


