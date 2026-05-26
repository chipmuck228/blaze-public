import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { notFound } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase"
import { LocationProgramsByCategory } from "@/components/location/LocationProgramsByCategory"
import type { CategoryGroup, LocationProgram } from "@/components/location/LocationProgramsByCategory"
import { LocationHero } from "@/components/location/LocationHero"
import { LocationCampuses } from "@/components/location/LocationCampuses"
import { LocationFeatures } from "@/components/location/LocationFeatures"
import { RoboticsJourney } from "@/components/RoboticsJourney"
import { Advantages } from "@/components/Advantages"
import { Testimonials } from "@/components/Testimonials"
import { Newsletter } from "@/components/Newsletter"
import { AIChatButton } from "@/components/location/AIChatButton"
import { LocationCta } from "@/components/location/LocationCta"
import {
  FEATURED_INSTANCE_SELECT,
  mapInstanceRowToFeaturedSession,
  sortFeaturedInstanceRows,
  type FeaturedSession,
} from "@/lib/featured-sessions"

interface LocationPageProps {
  params: Promise<{ code: string }>
}

type BrandingConfig = {
  hero?: {
    title?: string
    subtitle?: string
    description?: string
    backgroundImage?: string
    ctaText?: string
    ctaLink?: string
  }
  contact?: { address?: { street?: string; city?: string; state?: string; zip?: string } }
}

type MarketingCtaItem = { text?: string; link?: string; style?: string }
type MarketingConfig = {
  seo?: { title?: string; description?: string; keywords?: string; ogImage?: string; ogTitle?: string; ogDescription?: string; canonicalUrl?: string }
  slogan?: { main?: string; subtitle?: string; tagline?: string }
  cta?: { primary?: MarketingCtaItem; secondary?: MarketingCtaItem }
}

type V2Franchise = {
  id: string
  code: string
  name: string | null
  branding_config?: BrandingConfig | null
  marketing_config?: MarketingConfig | null
  poster_url?: string | null
}

type V2Campus = {
  id: string
  name?: string | null
  display_name?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
  country?: string | null
  phone?: string | null
  email?: string | null
  latitude?: number | null
  longitude?: number | null
}

/** 优先 branding_config.hero.title，否则使用 v2_franchise.name，如 "Mill Creek Robotics Academy" */
function getHeroTitle(franchise: V2Franchise): string {
  if (franchise.branding_config?.hero?.title?.trim()) {
    return franchise.branding_config.hero.title.trim()
  }
  const loc = franchise.name?.trim()
  return loc ? `${loc} Robotics Academy` : "Robotics Academy"
}

function getHeroDescription(franchise: V2Franchise): string {
  if (franchise.branding_config?.hero?.description) {
    return franchise.branding_config.hero.description
  }
  const locationName = franchise.name || franchise.code || "area"
  return `Local robotics, coding, and engineering programs for students in the ${locationName} area.`
}

function getHeroSubtitle(franchise: V2Franchise): string | null {
  const s = franchise.branding_config?.hero?.subtitle?.trim()
  return s || null
}

function getHeroBackgroundUrl(franchise: V2Franchise): string | null {
  const url = franchise.branding_config?.hero?.backgroundImage?.trim() || franchise.poster_url?.trim()
  return url || null
}

function getHeroCta(franchise: V2Franchise, normalizedCode: string): { text: string; link: string; external: boolean } {
  const text = franchise.branding_config?.hero?.ctaText?.trim()
  const link = franchise.branding_config?.hero?.ctaLink?.trim()
  const defaultLink = `/programs?location=${encodeURIComponent(normalizedCode.toLowerCase())}`
  const href = link || defaultLink
  const external = href.startsWith("http://") || href.startsWith("https://")
  return { text: text || "View Programs", link: href, external }
}

function getPrimaryAddress(
  franchise: V2Franchise,
  firstCampus: V2Campus | null
): string {
  // 优先使用 v2_campus 的地址（该 franchise 下的真实校区），避免 branding_config 误填其他地区如 CA
  if (firstCampus) {
    const parts = [
      firstCampus.address,
      firstCampus.city,
      firstCampus.state,
      firstCampus.zip_code,
    ].filter(Boolean)
    if (parts.length > 0) {
      return parts.join(", ")
    }
  }
  const configAddress = franchise.branding_config?.contact?.address
  if (configAddress) {
    const parts = [
      configAddress.street,
      configAddress.city,
      configAddress.state,
      configAddress.zip,
    ].filter(Boolean)
    if (parts.length > 0) {
      return parts.join(", ")
    }
  }
  return franchise.name || "Campus"
}

function formatLocationLabel(code: string): string {
  return code
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export async function generateMetadata({ params }: LocationPageProps) {
  const { code } = await params
  const normalizedCode = decodeURIComponent(code).toLowerCase()

  const { data: franchise } = await supabaseAdmin
    .from("v2_franchise")
    .select("name, marketing_config")
    .eq("code", normalizedCode)
    .eq("is_active", true)
    .single()

  const franchiseName = (franchise as { name?: string | null } | null)?.name?.trim()
  const locationLabel = formatLocationLabel(normalizedCode)
  const defaultTitle = franchiseName
    ? `${franchiseName} Robotics Academy`
    : locationLabel
      ? `${locationLabel} Robotics Academy`
      : "Robotics Academy"

  const marketing = (franchise as { marketing_config?: MarketingConfig } | null)?.marketing_config
  const title = marketing?.seo?.title?.trim() || defaultTitle
  const description = marketing?.seo?.description?.trim() || undefined
  const openGraph = marketing?.seo?.ogTitle || marketing?.seo?.ogDescription || marketing?.seo?.ogImage
    ? {
        title: marketing.seo.ogTitle?.trim() || title,
        description: marketing.seo.ogDescription?.trim() || description,
        images: marketing.seo.ogImage ? [marketing.seo.ogImage] : undefined,
      }
    : undefined

  return {
    title,
    description,
    openGraph,
    alternates: marketing?.seo?.canonicalUrl ? { canonical: marketing.seo.canonicalUrl } : undefined,
  }
}

export default async function GenericLocationPage({ params }: LocationPageProps) {
  const { code } = await params
  const normalizedCode = decodeURIComponent(code).toLowerCase()

  // v2_franchise（含 branding_config、marketing_config、poster_url 供 Hero/CTA/SEO）
  const { data: franchise, error: franchiseError } = await supabaseAdmin
    .from("v2_franchise")
    .select("id, code, name, branding_config, marketing_config, poster_url")
    .eq("code", normalizedCode)
    .eq("is_active", true)
    .single()

  if (franchiseError || !franchise) {
    notFound()
  }

  const v2Franchise = franchise as V2Franchise

  // v2_campus：该 franchise 下全部 active campuses（用于主地址 + 多地点列表）
  const { data: campusesData } = await supabaseAdmin
    .from("v2_campus")
    .select(
      "id, name, display_name, address, city, state, zip_code, country, phone, email, latitude, longitude"
    )
    .eq("franchise_id", v2Franchise.id)
    .eq("is_active", true)
    .order("name", { ascending: true })

  const { data: categoryMapsData, error: categoryMapsError } = await supabaseAdmin
    .from("v2_franchise_category_map")
    .select(
      `
      display_order,
      category:v2_category!inner(
        id,
        name,
        display_name,
        description,
        poster_url,
        display_order,
        is_active
      )
    `
    )
    .eq("franchise_id", v2Franchise.id)
    .eq("is_visible", true)
    .order("display_order", { ascending: true })

  if (categoryMapsError) {
    console.error("[LocationPage] Error fetching franchise category subscriptions:", categoryMapsError)
  }

  const allCampuses = (campusesData || []) as V2Campus[]
  const firstCampus = allCampuses[0] ?? null

  // v2_program：该 franchise 下所有 active programs（含 featured、category，category 含 display_order/description/poster 用于按兴趣分组展示）
  const { data: programsData, error: programsError } = await supabaseAdmin
    .from("v2_program")
    .select(
      `
      id,
      name,
      display_name,
      description,
      poster_url,
      featured,
      category:v2_category(
        id,
        name,
        display_name,
        description,
        poster_url,
        display_order
      )
    `
    )
    .eq("franchise_id", v2Franchise.id)
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("featured", { ascending: false })
    .order("name", { ascending: true })

  if (programsError) {
    console.error("[LocationPage] Error fetching v2_program:", programsError)
  }

  const programs: LocationProgram[] = (programsData || []).map(
    (row: any) => ({
      id: row.id,
      name: row.name,
      display_name: row.display_name,
      description: row.description ?? null,
      poster_url: row.poster_url ?? null,
      featured: row.featured === true,
      category: row.category
        ? {
            id: row.category.id,
            name: row.category.name,
            display_name: row.category.display_name,
          }
        : null,
    })
  )

  // 该 franchise 订阅的全部 category（含无 program 的），用于「按兴趣探索」区块
  const programsGroupedByCategory: CategoryGroup[] = (() => {
    const programsByCategoryId = new Map<string, LocationProgram[]>()
    for (const program of programs) {
      if (!program.category?.id) continue
      const list = programsByCategoryId.get(program.category.id) ?? []
      list.push(program)
      programsByCategoryId.set(program.category.id, list)
    }

    const subscribed = (categoryMapsData || [])
      .map((row: { display_order?: number | null; category: unknown }) => {
        const rawCat = row.category
        const cat = Array.isArray(rawCat) ? rawCat[0] : rawCat
        if (!cat || typeof cat !== "object" || !("id" in cat)) return null
        const c = cat as {
          id: string
          name: string
          display_name: string
          description?: string | null
          poster_url?: string | null
          display_order?: number | null
          is_active?: boolean
        }
        if (c.is_active === false) return null
        return {
          mapOrder: row.display_order ?? null,
          category: {
            id: c.id,
            name: c.name,
            display_name: c.display_name,
            description: c.description ?? null,
            poster_url: c.poster_url ?? null,
            display_order: c.display_order ?? null,
          },
          programs: programsByCategoryId.get(c.id) ?? [],
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)

    return subscribed.sort((a, b) => {
      const orderA = a.mapOrder ?? a.category.display_order ?? 999
      const orderB = b.mapOrder ?? b.category.display_order ?? 999
      if (orderA !== orderB) return orderA - orderB
      return (a.category.display_name || "").localeCompare(b.category.display_name || "")
    })
  })()

  const { data: featuredInstancesData, error: featuredInstancesError } = await supabaseAdmin
    .from("v2_instance")
    .select(FEATURED_INSTANCE_SELECT)
    .eq("is_active", true)
    .eq("featured", true)
    .in("status", ["scheduled", "ongoing"])
    .eq("program.franchise_id", v2Franchise.id)

  if (featuredInstancesError) {
    console.error("[LocationPage] Error fetching featured instances:", featuredInstancesError)
  }

  const featuredSessions: FeaturedSession[] = sortFeaturedInstanceRows(featuredInstancesData || [])
    .map(mapInstanceRowToFeaturedSession)
    .filter((item): item is FeaturedSession => item !== null)
    .slice(0, 6)

  const displayName =
    v2Franchise.name ||
    normalizedCode
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ") ||
    normalizedCode
  const heroTitle = getHeroTitle(v2Franchise)
  const heroSubtitle = getHeroSubtitle(v2Franchise)
  const heroDescription = getHeroDescription(v2Franchise)
  const heroBackgroundUrl = getHeroBackgroundUrl(v2Franchise)
  const heroCta = getHeroCta(v2Franchise, normalizedCode)
  const primaryAddress = getPrimaryAddress(v2Franchise, firstCampus)

  const marketingCta = v2Franchise.marketing_config?.cta
  const hasCta =
    (marketingCta?.primary?.text || marketingCta?.primary?.link) ||
    (marketingCta?.secondary?.text || marketingCta?.secondary?.link)

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        <LocationHero
          heroTitle={heroTitle}
          heroSubtitle={heroSubtitle}
          heroDescription={heroDescription}
          heroBackgroundUrl={heroBackgroundUrl}
          heroCtaText={heroCta.text}
          heroCtaLink={heroCta.link}
          heroCtaExternal={heroCta.external}
          displayName={displayName}
          primaryAddress={primaryAddress}
          normalizedCode={normalizedCode}
          sessions={featuredSessions}
        />

        <section className="bg-slate-50 dark:bg-slate-900/50">
          <LocationProgramsByCategory
            programsGroupedByCategory={programsGroupedByCategory}
            franchiseCode={normalizedCode}
            locationName={displayName}
          />
        </section>

        <LocationFeatures franchiseCode={normalizedCode} primaryAddressFromCampus={primaryAddress} />

        {allCampuses.length > 0 && (
          <LocationCampuses campuses={allCampuses} displayName={displayName} />
        )}

        {hasCta && (
          <LocationCta
            cta={marketingCta!}
            slogan={v2Franchise.marketing_config?.slogan}
          />
        )}

        <RoboticsJourney />
        <Advantages />
        <Testimonials franchiseCode={normalizedCode} locationName={displayName} />
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
