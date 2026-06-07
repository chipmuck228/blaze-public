/**
 * C-end programs catalog: merges v2_category directory with v2_instance data (GET /api/public/instances-v2).
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

export const AMILIA_ENROLL_URL =
  "https://app.amilia.com/store/en/blazeroboticsacademy/shop/programs"

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
  days_of_week?: number[]
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
    description?: string | null
    poster_url?: string | null
    offering_type?: {
      id: string
      code: string
      name: string
    }
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

export type OfferingTypeOption = {
  id: string
  code: string
  name: string
}

export type ProgramsFilterParams = {
  selectedProgramCategoryId: string
  searchQuery: string
  selectedAgeRange: string
  selectedFranchiseId: string
  selectedOfferingTypeCode: string
}

export type ProgramsViewMode = "global" | "location"

export type SessionListItem = {
  session: CatalogSession
  activity: DisplayActivity
  program: DisplayProgram
  location: DisplayLocation
}

export type OfferingTypeSessionGroup = {
  offeringType: OfferingTypeOption
  sessions: SessionListItem[]
}

/** Sessions sharing the same offering template within one offering type bucket. */
export type OfferingNameGroup = {
  offeringId: string | null
  offeringName: string
  description: string
  posterUrl: string | null
  offeringTypeCode: string
  sessions: SessionListItem[]
}

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

function sessionMatchesOfferingType(session: CatalogSession, selectedOfferingTypeCode: string): boolean {
  if (selectedOfferingTypeCode === "all") return true
  const code = session.offering?.offering_type?.code?.toLowerCase()
  return code === selectedOfferingTypeCode
}

function sessionMatchesSearch(
  session: CatalogSession,
  activity: InstancesActivity,
  searchQuery: string
): boolean {
  if (!searchQuery.trim()) return true
  const query = searchQuery.toLowerCase()
  const matchesName = session.course?.name?.toLowerCase().includes(query) ?? false
  const matchesOfferingName = session.offering?.name?.toLowerCase().includes(query) ?? false
  const matchesDescription = session.course?.description?.toLowerCase().includes(query) ?? false
  const matchesOfferingDescription = session.offering?.description?.toLowerCase().includes(query) ?? false
  const matchesActivityName = activity.display_name?.toLowerCase().includes(query) ?? false
  const matchesActivityDesc = activity.description?.toLowerCase().includes(query) ?? false
  return (
    matchesName ||
    matchesOfferingName ||
    matchesDescription ||
    matchesOfferingDescription ||
    matchesActivityName ||
    matchesActivityDesc
  )
}

export function filterSessionsForActivity(
  activity: InstancesActivity,
  filters: Pick<ProgramsFilterParams, "searchQuery" | "selectedAgeRange" | "selectedOfferingTypeCode">
): CatalogSession[] {
  return (activity.instances || []).filter(
    (session) =>
      session.id &&
      sessionMatchesSearch(session, activity, filters.searchQuery) &&
      sessionMatchesAgeRange(session, filters.selectedAgeRange) &&
      sessionMatchesOfferingType(session, filters.selectedOfferingTypeCode)
  )
}

/** Offering types present in loaded instances, optionally scoped to one franchise. */
export function collectOfferingTypesFromInstances(
  franchisesData: InstancesLocation[],
  selectedFranchiseId: string
): OfferingTypeOption[] {
  const typeMap = new Map<string, OfferingTypeOption>()
  const franchises =
    selectedFranchiseId === "all"
      ? franchisesData
      : franchisesData.filter((f) => f.id === selectedFranchiseId)

  for (const franchise of franchises) {
    for (const activity of franchise.programs || []) {
      for (const session of activity.instances || []) {
        const ot = session.offering?.offering_type
        const code = ot?.code?.toLowerCase()
        if (!code || typeMap.has(code)) continue
        typeMap.set(code, {
          id: ot!.id,
          code,
          name: ot!.name || ot!.code,
        })
      }
    }
  }

  return Array.from(typeMap.values())
}

export function sortOfferingTypeOptions(
  derived: OfferingTypeOption[],
  globalTypes: OfferingTypeOption[]
): OfferingTypeOption[] {
  const orderMap = new Map(globalTypes.map((t, index) => [t.code, index]))
  return [...derived].sort((a, b) => {
    const orderA = orderMap.get(a.code) ?? 999
    const orderB = orderMap.get(b.code) ?? 999
    if (orderA !== orderB) return orderA - orderB
    return a.name.localeCompare(b.name)
  })
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
    const locCode = locationFranchise?.code?.toLowerCase()
    sourceFranchises = franchisesData.filter(
      (f) =>
        f.id === filters.selectedFranchiseId ||
        (locCode && (f.code || "").toLowerCase() === locCode)
    )
  }

  if (viewMode === "location" && locationFranchise) {
    const codeKey = (locationFranchise.code || "").toLowerCase()
    const match =
      sourceFranchises.find((f) => f.id === locationFranchise.id) ||
      (codeKey ? sourceFranchises.find((f) => (f.code || "").toLowerCase() === codeKey) : undefined)
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

/** Group filtered sessions by offering type for List view (all type buckets shown, including empty). */
export function buildOfferingTypeSessionGroups(
  locations: DisplayLocation[],
  offeringTypeOptions: OfferingTypeOption[]
): OfferingTypeSessionGroup[] {
  const groupMap = new Map<string, OfferingTypeSessionGroup>()

  for (const ot of offeringTypeOptions) {
    groupMap.set(ot.code, { offeringType: ot, sessions: [] })
  }

  for (const location of locations) {
    for (const program of location.programs) {
      for (const activity of program.activities) {
        for (const session of activity.sessions) {
          const ot = session.offering?.offering_type
          const code = (ot?.code || "other").toLowerCase()
          if (!groupMap.has(code)) {
            groupMap.set(code, {
              offeringType: {
                id: ot?.id || code,
                code,
                name: ot?.name || code,
              },
              sessions: [],
            })
          }
          groupMap.get(code)!.sessions.push({
            session,
            activity,
            program,
            location,
          })
        }
      }
    }
  }

  const ordered: OfferingTypeSessionGroup[] = []
  const seen = new Set<string>()

  for (const ot of offeringTypeOptions) {
    ordered.push(groupMap.get(ot.code) ?? { offeringType: ot, sessions: [] })
    seen.add(ot.code)
  }

  for (const [code, group] of groupMap) {
    if (!seen.has(code)) {
      ordered.push(group)
    }
  }

  return ordered
}

export function countSessionsInGroups(groups: OfferingTypeSessionGroup[]): number {
  return groups.reduce((sum, g) => sum + g.sessions.length, 0)
}

function offeringGroupKey(item: SessionListItem): string {
  const offeringId = item.session.offering?.id
  if (offeringId) return offeringId
  const name = item.session.offering?.name || item.session.course?.name || item.activity.display_name
  return name.toLowerCase().trim()
}

/** Group filtered sessions by offering name (same v2_offering) within one offering type. */
export function groupSessionsByOfferingName(sessions: SessionListItem[]): OfferingNameGroup[] {
  const map = new Map<string, OfferingNameGroup>()

  for (const item of sessions) {
    const key = offeringGroupKey(item)
    const offeringName =
      item.session.offering?.name || item.session.course?.name || item.activity.display_name
    const existing = map.get(key)
    if (existing) {
      existing.sessions.push(item)
      continue
    }
    map.set(key, {
      offeringId: item.session.offering?.id ?? null,
      offeringName,
      description: getOfferingDescription(item.session),
      posterUrl: getSessionPosterUrl(item.session),
      offeringTypeCode: item.session.offering?.offering_type?.code?.toLowerCase() ?? "",
      sessions: [item],
    })
  }

  return Array.from(map.values()).sort((a, b) =>
    a.offeringName.localeCompare(b.offeringName, undefined, { sensitivity: "base" })
  )
}

function normalizeDaysOfWeek(values: unknown[]): number[] {
  return [...values]
    .map((d) => (typeof d === "string" ? parseInt(d, 10) : Number(d)))
    .filter((d) => !Number.isNaN(d))
    .sort((a, b) => a - b)
}

export function getSessionDaysOfWeek(session: CatalogSession): number[] {
  if (Array.isArray(session.days_of_week) && session.days_of_week.length > 0) {
    return normalizeDaysOfWeek(session.days_of_week)
  }
  return []
}

export function isCourseOfferingSession(session: CatalogSession): boolean {
  return session.offering?.offering_type?.code?.toLowerCase() === "course"
}

export function getOfferingDescription(session: CatalogSession): string {
  return (
    session.offering?.description?.trim() ||
    session.course?.description?.trim() ||
    ""
  )
}

export function getSessionPosterUrl(session: CatalogSession): string | null {
  return session.offering?.poster_url || session.course?.poster_url || null
}

export function buildProgramsPageHref(options: {
  locationCode?: string | null
  /** v2_category.id — used when no location is selected (global catalog) */
  categoryId?: string | null
  /** v2_category.name — used with location (franchise-scoped programs link) */
  programName?: string | null
  /** v2_offering_type.code, or "all" */
  offeringType?: string | null
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
  if (options.offeringType && options.offeringType !== "all") {
    params.set("offering_type", options.offeringType.toLowerCase())
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
