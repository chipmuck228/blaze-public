/** C-end /programs catalog tree — stage → series → offering (no sessions). */

export type ProgramsCatalogOfferingType = {
  code: string
  name: string
}

export type ProgramsCatalogLocationRef = {
  id: string
  name: string
}

export type ProgramsCatalogOffering = {
  id: string
  name: string
  slug: string | null
  description: string | null
  poster_url: string | null
  target_audience: string | null
  offering_type: ProgramsCatalogOfferingType | null
  locations: ProgramsCatalogLocationRef[]
  age_min: number | null
  age_max: number | null
}

export type ProgramsCatalogCampusRef = {
  code: string
  name: string
}

export type ProgramsCatalogSeries = {
  id: string
  name: string
  display_name: string
  description: string | null
  poster_url: string | null
  featured: boolean
  campuses: ProgramsCatalogCampusRef[]
  offerings: ProgramsCatalogOffering[]
}

export type ProgramsCatalogStage = {
  id: string
  name: string
  display_name: string
  description: string | null
  poster_url: string | null
  display_order: number
  series: ProgramsCatalogSeries[]
}

export type ProgramsCatalogStats = {
  stages: number
  series: number
  offerings: number
  /** Distinct physical locations (v3_location / v2_campus) with open catalog sessions. */
  locations: number
}

export type ProgramsCatalogResponse = {
  campus: ProgramsCatalogCampusRef | null
  stats: ProgramsCatalogStats
  /** Physical locations (v3_location) present in the catalog — for filter UI. */
  filterLocations: ProgramsCatalogLocationRef[]
  stages: ProgramsCatalogStage[]
}

export type ProgramsCatalogGradeRange = "all" | "under_9" | "9_15" | "over_15"

export const PROGRAMS_CATALOG_GRADE_OPTIONS: {
  value: ProgramsCatalogGradeRange
  label: string
}[] = [
  { value: "all", label: "All Grades" },
  { value: "under_9", label: "Under 9" },
  { value: "9_15", label: "9–15" },
  { value: "over_15", label: "Over 15" },
]

export type ProgramsCatalogFilterState = {
  searchQuery: string
  locationId: string
  gradeRange: ProgramsCatalogGradeRange
  offeringTypeCode: string
}

export function buildProgramsCatalogHref(campusCode?: string | null): string {
  const code = campusCode?.trim().toLowerCase()
  if (!code) return "/programs"
  return `/programs?location=${encodeURIComponent(code)}`
}

/** Case-insensitive key for deduping offerings that share the same display name. */
export function normalizeOfferingNameKey(name: string): string {
  return (name || "").trim().toLowerCase()
}

export function dedupeOfferingsByName(
  offerings: ProgramsCatalogOffering[]
): ProgramsCatalogOffering[] {
  const seen = new Map<string, ProgramsCatalogOffering>()
  for (const offering of offerings) {
    const key = normalizeOfferingNameKey(offering.name)
    if (!key) continue
    const existing = seen.get(key)
    if (!existing) {
      seen.set(key, {
        ...offering,
        locations: [...offering.locations],
      })
      continue
    }
    seen.set(key, mergeOfferingMetadata(existing, offering))
  }
  return Array.from(seen.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  )
}

export function countUniqueOfferingNames(stages: ProgramsCatalogStage[]): number {
  const seen = new Set<string>()
  for (const stage of stages) {
    for (const series of stage.series) {
      for (const offering of series.offerings) {
        const key = normalizeOfferingNameKey(offering.name)
        if (key) seen.add(key)
      }
    }
  }
  return seen.size
}

export function countUniqueOfferingNamesInStage(stage: ProgramsCatalogStage): number {
  const seen = new Set<string>()
  for (const series of stage.series) {
    for (const offering of series.offerings) {
      const key = normalizeOfferingNameKey(offering.name)
      if (key) seen.add(key)
    }
  }
  return seen.size
}

/** Canonical key for grouping series with the same catalog name across campuses. */
export function normalizeSeriesNameKey(name: string): string {
  return (name || "").trim().toLowerCase()
}

function mergeCampusLists(
  target: ProgramsCatalogCampusRef[],
  incoming: ProgramsCatalogCampusRef[]
): ProgramsCatalogCampusRef[] {
  const merged = [...target]
  for (const campus of incoming) {
    if (!merged.some((c) => c.code.toLowerCase() === campus.code.toLowerCase())) {
      merged.push(campus)
    }
  }
  return merged.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
}

/** Merge series rows that share the same name within a stage (cross-campus). */
export function aggregateSeriesByName(seriesList: ProgramsCatalogSeries[]): ProgramsCatalogSeries[] {
  const groups = new Map<string, ProgramsCatalogSeries>()

  for (const series of seriesList) {
    const key = normalizeSeriesNameKey(series.name)
    if (!key) continue

    const existing = groups.get(key)
    if (!existing) {
      groups.set(key, {
        ...series,
        campuses: mergeCampusLists([], series.campuses),
        offerings: dedupeOfferingsByName(series.offerings),
      })
      continue
    }

    existing.campuses = mergeCampusLists(existing.campuses, series.campuses)
    existing.offerings = dedupeOfferingsByName([...existing.offerings, ...series.offerings])
    if (!existing.poster_url && series.poster_url) existing.poster_url = series.poster_url
    if (!existing.description && series.description) existing.description = series.description
    if (series.featured) existing.featured = true
  }

  return Array.from(groups.values()).sort((a, b) =>
    a.display_name.localeCompare(b.display_name, undefined, { sensitivity: "base" })
  )
}

export function countSeriesGroups(stages: ProgramsCatalogStage[]): number {
  return stages.reduce((n, stage) => n + stage.series.length, 0)
}

function mergeLocationRefs(
  target: ProgramsCatalogLocationRef[],
  incoming: ProgramsCatalogLocationRef[]
): ProgramsCatalogLocationRef[] {
  const merged = [...target]
  for (const loc of incoming) {
    if (!merged.some((l) => l.id === loc.id)) merged.push(loc)
  }
  return merged.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
}

function mergeAgeMin(a: number | null, b: number | null): number | null {
  if (a == null) return b
  if (b == null) return a
  return Math.min(a, b)
}

function mergeAgeMax(a: number | null, b: number | null): number | null {
  if (a == null) return b
  if (b == null) return a
  return Math.max(a, b)
}

export function mergeOfferingMetadata(
  base: ProgramsCatalogOffering,
  incoming: ProgramsCatalogOffering
): ProgramsCatalogOffering {
  return {
    ...base,
    locations: mergeLocationRefs(base.locations, incoming.locations),
    age_min: mergeAgeMin(base.age_min, incoming.age_min),
    age_max: mergeAgeMax(base.age_max, incoming.age_max),
  }
}

export function offeringMatchesSearch(
  offering: ProgramsCatalogOffering,
  query: string
): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = [
    offering.name,
    offering.description,
    offering.target_audience,
    offering.offering_type?.name,
    offering.slug,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  return haystack.includes(q)
}

export function offeringMatchesGradeRange(
  offering: ProgramsCatalogOffering,
  gradeRange: ProgramsCatalogGradeRange
): boolean {
  if (gradeRange === "all") return true
  const ageMin = offering.age_min
  const ageMax = offering.age_max
  const matchesUnder9 = ageMax != null && ageMax <= 9
  const matches9_15 = (ageMin ?? 0) <= 15 && (ageMax ?? 99) >= 9
  const matchesOver15 = ageMin != null && ageMin >= 15
  if (gradeRange === "under_9") return matchesUnder9
  if (gradeRange === "9_15") return matches9_15
  if (gradeRange === "over_15") return matchesOver15
  return true
}

export function offeringMatchesLocation(
  offering: ProgramsCatalogOffering,
  locationId: string
): boolean {
  if (!locationId || locationId === "all") return true
  return offering.locations.some((loc) => loc.id === locationId)
}

export function offeringMatchesOfferingType(
  offering: ProgramsCatalogOffering,
  offeringTypeCode: string
): boolean {
  if (!offeringTypeCode || offeringTypeCode === "all") return true
  return offering.offering_type?.code?.toLowerCase() === offeringTypeCode.toLowerCase()
}

/** Distinct offering types present in catalog tree (for filter chips). */
export function collectCatalogOfferingTypes(
  stages: ProgramsCatalogStage[]
): ProgramsCatalogOfferingType[] {
  const map = new Map<string, ProgramsCatalogOfferingType>()
  for (const stage of stages) {
    for (const series of stage.series) {
      for (const offering of series.offerings) {
        const ot = offering.offering_type
        if (!ot?.code) continue
        const code = ot.code.toLowerCase()
        if (!map.has(code)) map.set(code, { code, name: ot.name || code })
      }
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  )
}

/** Distinct offering type codes under one series or stage. */
export function collectOfferingTypeCodesFromOfferings(
  offerings: ProgramsCatalogOffering[]
): string[] {
  const codes = new Set<string>()
  for (const offering of offerings) {
    const code = offering.offering_type?.code?.toLowerCase()
    if (code) codes.add(code)
  }
  return Array.from(codes)
}

export function collectOfferingTypeCodesForSeries(series: ProgramsCatalogSeries): string[] {
  return collectOfferingTypeCodesFromOfferings(series.offerings)
}

export function collectOfferingTypeCodesForStage(stage: ProgramsCatalogStage): string[] {
  const codes = new Set<string>()
  for (const series of stage.series) {
    for (const code of collectOfferingTypeCodesForSeries(series)) {
      codes.add(code)
    }
  }
  return Array.from(codes)
}

export function filterProgramsCatalogStages(
  stages: ProgramsCatalogStage[],
  filters: ProgramsCatalogFilterState
): ProgramsCatalogStage[] {
  const hasSearch = filters.searchQuery.trim().length > 0
  const hasLocation = filters.locationId !== "all"
  const hasGrade = filters.gradeRange !== "all"
  const hasOfferingType = filters.offeringTypeCode !== "all"
  if (!hasSearch && !hasLocation && !hasGrade && !hasOfferingType) return stages

  return stages
    .map((stage) => {
      const series = stage.series
        .map((item) => {
          const offerings = item.offerings.filter(
            (offering) =>
              offeringMatchesSearch(offering, filters.searchQuery) &&
              offeringMatchesLocation(offering, filters.locationId) &&
              offeringMatchesGradeRange(offering, filters.gradeRange) &&
              offeringMatchesOfferingType(offering, filters.offeringTypeCode)
          )
          if (offerings.length === 0) return null
          return { ...item, offerings }
        })
        .filter((item): item is ProgramsCatalogSeries => item != null)

      if (series.length === 0) return null
      return { ...stage, series }
    })
    .filter((stage): stage is ProgramsCatalogStage => stage != null)
}

/** Stage accent colors for catalog UI (index-based). */
export const STAGE_ACCENT_CLASSES = [
  "stageAccentBlue",
  "stageAccentRed",
  "stageAccentGold",
  "stageAccentNavy",
  "stageAccentTeal",
] as const

export function stageAccentClass(index: number): string {
  return STAGE_ACCENT_CLASSES[index % STAGE_ACCENT_CLASSES.length]
}

/** Emoji hints for Jump To — fallback when stage has no poster. */
export function stageJumpIcon(stageName: string): string {
  const n = stageName.toLowerCase()
  if (n.includes("camp")) return "🏕️"
  if (n.includes("course") || n.includes("learn") || n.includes("build")) return "📚"
  if (n.includes("after") || n.includes("club") || n.includes("drop")) return "🔑"
  if (n.includes("compet") || n.includes("team")) return "🏆"
  if (n.includes("innov") || n.includes("ignite") || n.includes("explore")) return "💡"
  return "⚡"
}
