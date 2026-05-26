/**
 * C-end programs catalog: merges category directory with instances-v2 data.
 * User terms: Location (franchise) → Program (category) → Activity (program) → Session (instance).
 */

export type CatalogCategory = {
  id: string
  name: string
  display_name: string
  description?: string | null
  poster_url?: string | null
  display_order?: number | null
}

export type CatalogSession = {
  id: string
  start_date: string
  end_date: string
  start_time?: string
  end_time?: string
  max_students?: number
  current_students: number
  status: string
  price_override?: number
  location?: {
    id: string
    name: string
    address?: string
    city?: string
    state?: string
  }
  course: {
    id: string
    name: string
    slug?: string
    description?: string
    grade_level?: string | null
    target_grades?: string[]
    age_min?: number
    age_max?: number
    base_price?: number
    poster_url?: string | null
  }
  offering?: {
    id: string
    name: string
    poster_url?: string | null
  }
  available_spots: number
  is_full: boolean
}

export type InstancesActivity = {
  id: string
  name: string
  display_name: string
  description?: string
  category: {
    id: string
    name: string
    display_name: string
  }
  instances: CatalogSession[]
}

export type InstancesLocation = {
  id: string
  code: string
  name: string
  programs: InstancesActivity[]
}

export type DisplayActivity = {
  id: string
  name: string
  display_name: string
  description?: string
  category: {
    id: string
    name: string
    display_name: string
  }
  sessions: CatalogSession[]
}

export type DisplayProgram = {
  id: string
  name: string
  display_name: string
  description?: string | null
  activities: DisplayActivity[]
}

export type DisplayLocation = {
  id: string
  code: string
  name: string
  programs: DisplayProgram[]
}

export type ProgramsFilterParams = {
  selectedProgramCategoryId: string
  searchQuery: string
  selectedAgeRange: string
  selectedFranchiseId: string
}

export type ProgramsViewMode = "global" | "location"

export function sortCatalogCategories(categories: CatalogCategory[]): CatalogCategory[] {
  return [...categories].sort((a, b) => {
    const orderA = a.display_order ?? 999
    const orderB = b.display_order ?? 999
    if (orderA !== orderB) return orderA - orderB
    return (a.display_name || a.name).localeCompare(b.display_name || b.name)
  })
}

function sessionMatchesAgeRange(session: CatalogSession, selectedAgeRange: string): boolean {
  if (selectedAgeRange === "all") return true
  const ageMin = session.course?.age_min ?? null
  const ageMax = session.course?.age_max ?? null
  const matchesUnder9 = ageMax != null && ageMax <= 9
  const matches9_15 = (ageMin ?? 0) <= 15 && (ageMax ?? 99) >= 9
  const matchesOver15 = ageMin != null && ageMin >= 15
  if (selectedAgeRange === "under_9") return matchesUnder9
  if (selectedAgeRange === "9_15") return matches9_15
  if (selectedAgeRange === "over_15") return matchesOver15
  return true
}

function sessionMatchesSearch(
  session: CatalogSession,
  activity: InstancesActivity,
  searchQuery: string
): boolean {
  if (!searchQuery.trim()) return true
  const query = searchQuery.toLowerCase()
  const matchesName = session.course?.name?.toLowerCase().includes(query) ?? false
  const matchesDescription = session.course?.description?.toLowerCase().includes(query) ?? false
  const matchesActivityName = activity.display_name?.toLowerCase().includes(query) ?? false
  const matchesActivityDesc = activity.description?.toLowerCase().includes(query) ?? false
  return matchesName || matchesDescription || matchesActivityName || matchesActivityDesc
}

export function filterSessionsForActivity(
  activity: InstancesActivity,
  filters: Pick<ProgramsFilterParams, "searchQuery" | "selectedAgeRange">
): CatalogSession[] {
  return (activity.instances || []).filter(
    (session) =>
      session.id &&
      sessionMatchesSearch(session, activity, filters.searchQuery) &&
      sessionMatchesAgeRange(session, filters.selectedAgeRange)
  )
}

export function countSessionsInLocation(location: DisplayLocation): number {
  return location.programs.reduce(
    (sum, program) =>
      sum + program.activities.reduce((aSum, act) => aSum + act.sessions.length, 0),
    0
  )
}

export function buildDisplayTree(
  catalog: CatalogCategory[],
  franchisesData: InstancesLocation[],
  filters: ProgramsFilterParams,
  viewMode: ProgramsViewMode,
  locationFranchise?: { id: string; code: string; name: string } | null
): DisplayLocation[] {
  const sortedCatalog = sortCatalogCategories(catalog)
  const hasSessionFilters =
    Boolean(filters.searchQuery.trim()) || filters.selectedAgeRange !== "all"

  let sourceFranchises = franchisesData
  if (filters.selectedFranchiseId !== "all") {
    sourceFranchises = franchisesData.filter((f) => f.id === filters.selectedFranchiseId)
  }

  if (viewMode === "location" && locationFranchise) {
    const match = sourceFranchises.find((f) => f.id === locationFranchise.id)
    sourceFranchises = [
      match ?? {
        id: locationFranchise.id,
        code: locationFranchise.code,
        name: locationFranchise.name,
        programs: [],
      },
    ]
  }

  const locations: DisplayLocation[] = []

  for (const franchise of sourceFranchises) {
    const programs: DisplayProgram[] = []

    for (const cat of sortedCatalog) {
      if (
        filters.selectedProgramCategoryId !== "all" &&
        cat.id !== filters.selectedProgramCategoryId
      ) {
        continue
      }

      const activitiesFromData = (franchise.programs || []).filter(
        (p) => p.category?.id === cat.id
      )

      const activities: DisplayActivity[] = []
      for (const activity of activitiesFromData) {
        const sessions = filterSessionsForActivity(activity, filters)
        if (sessions.length > 0) {
          activities.push({
            id: activity.id,
            name: activity.name,
            display_name: activity.display_name || activity.name,
            description: activity.description,
            category: activity.category,
            sessions,
          })
        }
      }

      if (activities.length > 0 || !hasSessionFilters) {
        programs.push({
          id: cat.id,
          name: cat.name,
          display_name: cat.display_name || cat.name,
          description: cat.description,
          activities,
        })
      }
    }

    if (programs.length > 0) {
      locations.push({
        id: franchise.id,
        code: franchise.code,
        name: franchise.name,
        programs,
      })
    }
  }

  return locations
}

export function buildProgramsPageHref(options: {
  locationCode?: string | null
  /** v2_category.id — used when no location is selected (global catalog) */
  categoryId?: string | null
  /** v2_category.name — used with location (franchise-scoped programs link) */
  programName?: string | null
}): string {
  const params = new URLSearchParams()
  if (options.locationCode) {
    params.set("location", options.locationCode.toLowerCase())
  }
  if (options.locationCode && options.programName) {
    params.set("program", options.programName)
  } else if (options.categoryId) {
    params.set("category", options.categoryId)
  }
  const qs = params.toString()
  return qs ? `/programs?${qs}` : "/programs"
}

export function resolveCategoryIdFromUrl(
  catalog: CatalogCategory[],
  options: { categoryId?: string | null; programName?: string | null }
): string {
  if (options.programName) {
    const normalized = options.programName.toLowerCase()
    const byName = catalog.find((c) => c.name.toLowerCase() === normalized)
    if (byName) return byName.id
    const slug = options.programName.replace(/-/g, "_").toLowerCase()
    const bySlug = catalog.find((c) => c.name.toLowerCase() === slug)
    if (bySlug) return bySlug.id
  }
  if (options.categoryId) {
    const exists = catalog.some((c) => c.id === options.categoryId)
    if (exists) return options.categoryId
  }
  return "all"
}
