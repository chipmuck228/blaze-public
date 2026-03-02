import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { notFound } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase"
import { LocationProgramsByCategory } from "@/components/location/LocationProgramsByCategory"
import type { CategoryGroup } from "@/components/location/LocationProgramsByCategory"
import { LocationHero } from "@/components/location/LocationHero"
import { LocationCampuses } from "@/components/location/LocationCampuses"
import { LocationFeatures } from "@/components/location/LocationFeatures"
import { RoboticsJourney } from "@/components/RoboticsJourney"
import { Advantages } from "@/components/Advantages"
import { Testimonials } from "@/components/Testimonials"
import { Newsletter } from "@/components/Newsletter"
import { AIChatButton } from "@/components/location/AIChatButton"
import type { LocationHeroProgram } from "@/components/location/LocationHero"

interface LocationPageProps {
  params: Promise<{ code: string }>
}

type BrandingConfig = {
  hero?: { title?: string; description?: string }
  contact?: { address?: { street?: string; city?: string; state?: string; zip?: string } }
}

type V2Franchise = {
  id: string
  code: string
  name: string | null
  branding_config?: BrandingConfig | null
}

type V2Campus = {
  id: string
  name?: string | null
  display_name?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
}

/** 页面标题统一为 [location] Robotics Academy；locationLabel 建议用 code 格式化的名称（如 Bellevue），避免 DB 中 franchise.name 为旧文案（如 Blaze Robotics Academy - San Jose） */
function getHeroTitle(_franchise: V2Franchise, locationLabel: string): string {
  const loc = locationLabel?.trim()
  return loc ? `${loc} Robotics Academy` : "Robotics Academy"
}

function getHeroDescription(franchise: V2Franchise): string {
  if (franchise.branding_config?.hero?.description) {
    return franchise.branding_config.hero.description
  }
  const locationName = franchise.name || franchise.code || "area"
  return `Local robotics, coding, and engineering programs for students in the ${locationName} area.`
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
  const locationLabel = formatLocationLabel(normalizedCode)
  const title = locationLabel ? `${locationLabel} Robotics Academy` : "Robotics Academy"
  return { title }
}

export default async function GenericLocationPage({ params }: LocationPageProps) {
  const { code } = await params
  const normalizedCode = decodeURIComponent(code).toLowerCase()

  // v2_franchise
  const { data: franchise, error: franchiseError } = await supabaseAdmin
    .from("v2_franchise")
    .select("id, code, name, branding_config")
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
    .select("id, name, display_name, address, city, state, zip_code")
    .eq("franchise_id", v2Franchise.id)
    .eq("is_active", true)
    .order("name", { ascending: true })

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

  const programs: LocationHeroProgram[] = (programsData || []).map(
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

  // 方案 A：按 v2_category 分组，仅展示该 franchise 下有 program 的 category；用于「按兴趣探索」区块
  const programsGroupedByCategory: CategoryGroup[] = (() => {
    const map = new Map<string, { category: CategoryGroup["category"]; programIds: string[] }>()
    const programById = new Map(programs.map((p) => [p.id, p]))
    for (const row of programsData || []) {
      const rawCat = row.category
      const cat = Array.isArray(rawCat) ? rawCat[0] : rawCat
      if (!cat?.id) continue
      if (!map.has(cat.id)) {
        map.set(cat.id, {
          category: {
            id: cat.id,
            name: cat.name,
            display_name: cat.display_name,
            description: cat.description ?? null,
            poster_url: cat.poster_url ?? null,
            display_order: cat.display_order ?? null,
          },
          programIds: [],
        })
      }
      map.get(cat.id)!.programIds.push(row.id)
    }
    return Array.from(map.entries())
      .map(([, v]) => ({
        category: v.category,
        programs: v.programIds.map((id) => programById.get(id)!).filter(Boolean),
      }))
      .filter((g) => g.programs.length > 0)
      .sort((a, b) => {
        const orderA = a.category.display_order ?? 999
        const orderB = b.category.display_order ?? 999
        if (orderA !== orderB) return orderA - orderB
        return (a.category.display_name || "").localeCompare(b.category.display_name || "")
      })
  })()

  const displayName =
    v2Franchise.name ||
    normalizedCode
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ") ||
    normalizedCode
  const locationLabel = formatLocationLabel(normalizedCode) || displayName
  const heroTitle = getHeroTitle(v2Franchise, locationLabel)
  const heroDescription = getHeroDescription(v2Franchise)
  const primaryAddress = getPrimaryAddress(v2Franchise, firstCampus)

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        <LocationHero
          heroTitle={heroTitle}
          heroDescription={heroDescription}
          displayName={displayName}
          primaryAddress={primaryAddress}
          normalizedCode={normalizedCode}
          programs={programs}
        />

        {allCampuses.length > 0 && (
          <LocationCampuses campuses={allCampuses} displayName={displayName} />
        )}

        <LocationFeatures franchiseCode={normalizedCode} primaryAddressFromCampus={primaryAddress} />

        <section className="bg-[#0f172a] dark:bg-slate-900">
          <LocationProgramsByCategory
            programsGroupedByCategory={programsGroupedByCategory}
            franchiseCode={normalizedCode}
            locationName={displayName}
          />
        </section>

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
