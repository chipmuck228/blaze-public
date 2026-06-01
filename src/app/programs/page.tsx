'use client'

import { getErrorMessage } from "@/lib/typed-error"
import { useState, useEffect, useMemo, Suspense, useCallback, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import {
  Loader2,
  MapPin,
  Calendar,
  Search,
  ArrowRight,
  ExternalLink,
  LayoutList,
  LayoutGrid,
  X,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import {
  AMILIA_ENROLL_URL,
  buildDisplayTree,
  buildOfferingTypeSessionGroups,
  collectOfferingTypesFromInstances,
  countSessionsInGroups,
  getOfferingDescription,
  resolveCategoryIdFromUrl,
  sortCatalogCategories,
  sortOfferingTypeOptions,
  type CatalogCategory,
  type CatalogSession,
  type DisplayActivity,
  type DisplayLocation,
  type InstancesLocation,
  type OfferingTypeOption,
  type SessionListItem,
} from "@/lib/programs-catalog-view"
import { SessionListRow } from "@/components/programs/SessionListRow"
import { CourseDaysOfWeekBadges } from "@/components/programs/CourseDaysOfWeekBadges"
import {
  OfferingTypeIcon,
  SessionStatusIcon,
} from "@/components/programs/SessionCatalogMetaIcons"
import { LazySessionPoster } from "@/components/programs/LazySessionPoster"
import { normalizeRemoteImageUrl } from "@/lib/normalize-image-url"
import { cn } from "@/lib/utils"
import { OpenProgramsAIChatButton } from "@/components/programs-ai/OpenProgramsAIChatButton"
import { PROGRAMS_AI_ASSISTANT_ENABLED } from "@/lib/programs-ai-config"
import { formatCalendarDate, formatCalendarDateRange } from "@/lib/format-calendar-date"

type FranchiseListItem = { id: string; code: string; name: string }

const NAVBAR_HEIGHT_PX = 80

function getCategorySlug(categoryName: string): string {
  return (categoryName || "").replace(/_/g, "-")
}

function instanceDetailHref(
  activity: DisplayActivity,
  sessionId: string,
  locationCode: string | null
): string {
  const slug = getCategorySlug(activity.category?.name || "")
  const base = slug
    ? `/category/${slug}/instance/${sessionId}`
    : `/category/explore/instance/${sessionId}`
  if (!locationCode) return base
  return `${base}?location=${encodeURIComponent(locationCode)}`
}

/** Overrides globals.css mobile `button { min-height: 44px }` for compact filter chips. */
const FILTER_BADGE_CLASS =
  "programs-filter-badge max-md:!min-h-0 max-md:!min-w-0 max-md:py-[2px] max-md:leading-none max-md:h-auto"

/** Mobile Filters row + List/Details toggles — 4px vertical padding (see globals.css). */
const MOBILE_FILTER_BAR_CONTROL_CLASS =
  "programs-filter-bar-control max-lg:py-[4px] max-lg:leading-none max-lg:!min-h-0 max-lg:!min-w-0"

function FilterTag({
  label,
  active,
  onClick,
  compact,
}: {
  label: string
  active: boolean
  onClick: () => void
  compact?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        FILTER_BADGE_CLASS,
        "inline-flex items-center justify-center rounded-full font-medium border transition-colors whitespace-nowrap",
        compact ? "px-2 py-[2px] text-[10px] leading-none" : "px-2.5 py-[2px] text-[11px] leading-none",
        active
          ? "bg-[#2563eb] text-white border-[#2563eb] shadow-sm"
          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
      )}
    >
      {label}
    </button>
  )
}

function FilterTagGroup({
  children,
  inline,
}: {
  children: React.ReactNode
  inline?: boolean
}) {
  return (
    <div className={cn("flex flex-wrap gap-1", inline ? "min-w-0 flex-1" : "w-full")}>
      {children}
    </div>
  )
}

function SessionCard({
  session,
  activity,
  franchise,
  locationCode,
}: {
  session: CatalogSession
  activity: DisplayActivity
  franchise: DisplayLocation
  locationCode: string | null
}) {
  const ageGroup =
    session.course.age_min && session.course.age_max
      ? `Ages ${session.course.age_min}-${session.course.age_max}`
      : session.course.age_min
        ? `Ages ${session.course.age_min}+`
        : session.course.age_max
          ? `Up to Age ${session.course.age_max}`
          : session.course.grade_level
            ? `Grade ${session.course.grade_level}`
            : "All Ages"

  const dates =
    session.start_date && session.end_date
      ? formatCalendarDateRange(session.start_date, session.end_date)
      : session.start_date
        ? `Starts ${formatCalendarDate(session.start_date)}`
        : "TBD"

  const basePrice = session.price_override ?? session.course.base_price ?? 0
  const image =
    normalizeRemoteImageUrl(session.offering?.poster_url) ||
    normalizeRemoteImageUrl(session.course.poster_url) ||
    `https://picsum.photos/400/300?random=${session.id}`
  const campusName = session.location?.name || franchise.name || "Multiple Locations"
  const detailHref = instanceDetailHref(activity, session.id, locationCode)
  const offeringTypeCode = session.offering?.offering_type?.code?.toLowerCase() ?? ""
  const cardHoverClass =
    offeringTypeCode === "camp"
      ? "hover:border-orange-300 hover:shadow-orange-100/60 hover:ring-orange-100"
      : offeringTypeCode === "course"
        ? "hover:border-indigo-300 hover:shadow-indigo-100/60 hover:ring-indigo-100"
        : offeringTypeCode === "workshop"
          ? "hover:border-rose-300 hover:shadow-rose-100/60 hover:ring-rose-100"
          : offeringTypeCode === "competition"
            ? "hover:border-teal-300 hover:shadow-teal-100/60 hover:ring-teal-100"
            : "hover:border-blue-300 hover:shadow-blue-100/60 hover:ring-blue-100"

  return (
    <div
      className={cn(
        "group bg-white rounded-[32px] overflow-hidden border border-slate-200 shadow-sm",
        "transition-all duration-300 ease-out flex flex-col h-full",
        "hover:-translate-y-2 hover:shadow-2xl hover:ring-2 hover:ring-offset-0",
        cardHoverClass
      )}
    >
      <Link href={detailHref} className="flex flex-col flex-grow">
        <div className="h-64 relative overflow-hidden">
          <LazySessionPoster
            src={image}
            alt={session.course.name || activity.display_name || activity.name}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            containerClassName="absolute inset-0"
            className="transition-transform duration-700 ease-out group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-90" />
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            <span className="bg-white/90 backdrop-blur-md text-slate-900 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
              {ageGroup}
            </span>
          </div>
          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-white text-sm font-bold flex items-center">
              <MapPin className="w-3.5 h-3.5 mr-1 text-blue-400" />
              {campusName}
            </p>
            {session.available_spots !== undefined && (
              <p className="text-white/90 text-xs mt-1">
                {session.is_full ? "Full" : `${session.available_spots} spots available`}
              </p>
            )}
          </div>
        </div>
        <div className="p-8 flex flex-col flex-grow">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h3 className="text-2xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
              {session.course.name || activity.name}
            </h3>
            <SessionStatusIcon status={session.status} />
            <OfferingTypeIcon code={offeringTypeCode} />
            <CourseDaysOfWeekBadges session={session} />
          </div>
          <p className="text-slate-500 text-sm mb-6 line-clamp-3 leading-relaxed">
            {getOfferingDescription(session)}
          </p>
          <div className="mt-auto">
            <div className="flex items-center text-slate-600 text-sm mb-6 bg-slate-50 p-3 rounded-xl transition-colors duration-300 group-hover:bg-blue-50/60">
              <Calendar className="w-4 h-4 mr-2 text-blue-500" />
              <span className="font-medium">{dates}</span>
            </div>
          </div>
        </div>
      </Link>
      <div className="px-8 pb-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-6 transition-colors duration-300 group-hover:border-blue-100">
        <div>
          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Enrollment</p>
          <p className="text-2xl font-black text-slate-900 transition-colors duration-300 group-hover:text-[#2563eb]">
            ${basePrice.toFixed(2)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={detailHref}
            className="bg-[#0f172a] hover:bg-slate-800 text-white p-3 md:px-6 md:py-3 rounded-2xl font-bold text-sm transition-all duration-300 inline-flex items-center justify-center group-hover:shadow-md"
          >
            <ArrowRight className="w-4 h-4 md:mr-2 transition-transform duration-300 group-hover:translate-x-1" />
            <span className="hidden md:inline">Details</span>
          </Link>
          <a
            href={AMILIA_ENROLL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#2563eb] hover:bg-blue-600 text-white p-3 md:px-6 md:py-3 rounded-2xl font-bold text-sm transition-all duration-300 inline-flex items-center justify-center group-hover:shadow-md group-hover:scale-[1.02]"
          >
            <ExternalLink className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Enroll</span>
          </a>
        </div>
      </div>
    </div>
  )
}

function ProgramsPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const categoryIdFromUrl = searchParams.get("category")
  const programNameFromUrl = searchParams.get("program")
  const offeringTypeFromUrl = searchParams.get("offering_type")?.toLowerCase() ?? "all"
  const locationFromUrl = (
    searchParams.get("location") || searchParams.get("franchise")
  )?.toLowerCase() ?? null

  const [catalogCategories, setCatalogCategories] = useState<CatalogCategory[]>([])
  const [instancesFranchises, setInstancesFranchises] = useState<InstancesLocation[]>([])
  const [allFranchiseList, setAllFranchiseList] = useState<FranchiseListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedProgramCategoryId, setSelectedProgramCategoryId] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedAgeRange, setSelectedAgeRange] = useState<string>("all")
  const [globalOfferingTypes, setGlobalOfferingTypes] = useState<OfferingTypeOption[]>([])
  const [catalogViewMode, setCatalogViewMode] = useState<"list" | "details">("list")
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const filterAnchorRef = useRef<HTMLDivElement>(null)
  const filterBarRef = useRef<HTMLDivElement>(null)
  const [isFilterPinned, setIsFilterPinned] = useState(false)
  const [filterBarHeight, setFilterBarHeight] = useState(0)
  useEffect(() => {
    if (catalogCategories.length === 0 && !categoryIdFromUrl && !programNameFromUrl) return
    const resolved = resolveCategoryIdFromUrl(catalogCategories, {
      categoryId: categoryIdFromUrl,
      programName: programNameFromUrl,
    })
    setSelectedProgramCategoryId(resolved)
  }, [categoryIdFromUrl, programNameFromUrl, catalogCategories])

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const instancesUrl = "/api/public/instances-v2?offering_type=all"

      const [instancesRes, catalogRes, franchisesListRes, offeringTypesRes] = await Promise.all([
        fetch(instancesUrl),
        fetch("/api/public/categories"),
        fetch("/api/public/franchises-v2"),
        fetch("/api/public/offering-types"),
      ])

      if (!instancesRes.ok) {
        const errorData = await instancesRes.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to fetch sessions")
      }
      if (!catalogRes.ok) {
        const errorData = await catalogRes.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to fetch programs catalog")
      }

      const instancesData = await instancesRes.json()
      const catalogData = await catalogRes.json()

      if (offeringTypesRes.ok) {
        const offeringTypesData = await offeringTypesRes.json()
        const types = offeringTypesData.offering_types || offeringTypesData || []
        if (Array.isArray(types)) {
          setGlobalOfferingTypes(
            types.map((t: { id: string; code: string; name: string }) => ({
              id: t.id,
              code: (t.code || "").toLowerCase(),
              name: t.name || t.code,
            }))
          )
        }
      }

      setInstancesFranchises(instancesData.franchises || [])

      const categories: CatalogCategory[] = catalogData.categories || catalogData || []
      setCatalogCategories(Array.isArray(categories) ? categories : [])

      if (franchisesListRes.ok) {
        const list = await franchisesListRes.json()
        if (Array.isArray(list)) {
          setAllFranchiseList(
            list.map((f: { id: string; code: string; name: string }) => ({
              id: f.id,
              code: (f.code || "").toLowerCase(),
              name: f.name || f.code,
            }))
          )
        }
      }
    } catch (err) {
      console.error("Error loading programs page:", err)
      setInstancesFranchises([])
      setCatalogCategories([])
      setError(err instanceof Error ? getErrorMessage(err) : "Failed to load programs")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const anchor = filterAnchorRef.current
    const bar = filterBarRef.current
    if (!anchor || !bar || isLoading || error) return

    const syncHeight = () => setFilterBarHeight(bar.offsetHeight)
    syncHeight()

    const resizeObserver = new ResizeObserver(syncHeight)
    resizeObserver.observe(bar)

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => setIsFilterPinned(!entry.isIntersecting),
      { threshold: 0, rootMargin: `-${NAVBAR_HEIGHT_PX}px 0px 0px 0px` }
    )
    intersectionObserver.observe(anchor)

    return () => {
      intersectionObserver.disconnect()
      resizeObserver.disconnect()
    }
  }, [isLoading, error, locationFromUrl, selectedProgramCategoryId, offeringTypeFromUrl, selectedAgeRange, searchQuery, catalogViewMode])

  const selectedFranchiseId = useMemo(() => {
    if (!locationFromUrl) return "all"
    const f = allFranchiseList.find((x) => x.code === locationFromUrl)
    if (f) return f.id
    const fromData = instancesFranchises.find((x) => x.code === locationFromUrl)
    if (fromData) return fromData.id
    return "all"
  }, [locationFromUrl, allFranchiseList, instancesFranchises])

  const sortedCatalog = useMemo(
    () => sortCatalogCategories(catalogCategories),
    [catalogCategories]
  )

  const visibleOfferingTypeOptions = useMemo(
    () =>
      sortOfferingTypeOptions(
        collectOfferingTypesFromInstances(instancesFranchises, selectedFranchiseId),
        globalOfferingTypes
      ),
    [instancesFranchises, selectedFranchiseId, globalOfferingTypes]
  )

  useEffect(() => {
    if (offeringTypeFromUrl === "all") return
    if (visibleOfferingTypeOptions.some((t) => t.code === offeringTypeFromUrl)) return
    const params = new URLSearchParams()
    if (locationFromUrl) params.set("location", locationFromUrl)
    if (selectedProgramCategoryId !== "all") {
      params.set("category", selectedProgramCategoryId)
    }
    const qs = params.toString()
    router.replace(qs ? `/programs?${qs}` : "/programs")
  }, [
    offeringTypeFromUrl,
    visibleOfferingTypeOptions,
    locationFromUrl,
    selectedProgramCategoryId,
    router,
  ])

  const sessionFilters = useMemo(
    () => ({
      selectedProgramCategoryId,
      searchQuery,
      selectedAgeRange,
      selectedFranchiseId,
      selectedOfferingTypeCode: offeringTypeFromUrl,
    }),
    [
      selectedProgramCategoryId,
      searchQuery,
      selectedAgeRange,
      selectedFranchiseId,
      offeringTypeFromUrl,
    ]
  )

  const displayTree = useMemo(
    () =>
      buildDisplayTree(
        catalogCategories,
        instancesFranchises,
        sessionFilters,
        "global",
        null
      ),
    [catalogCategories, instancesFranchises, sessionFilters]
  )

  const offeringTypesForGroups = useMemo(() => {
    if (visibleOfferingTypeOptions.length > 0) return visibleOfferingTypeOptions
    if (globalOfferingTypes.length > 0) return globalOfferingTypes
    return collectOfferingTypesFromInstances(instancesFranchises, selectedFranchiseId)
  }, [
    visibleOfferingTypeOptions,
    globalOfferingTypes,
    instancesFranchises,
    selectedFranchiseId,
  ])

  const offeringTypeGroups = useMemo(
    () => buildOfferingTypeSessionGroups(displayTree, offeringTypesForGroups),
    [displayTree, offeringTypesForGroups]
  )

  const nonEmptyOfferingTypeGroups = useMemo(
    () => offeringTypeGroups.filter((group) => group.sessions.length > 0),
    [offeringTypeGroups]
  )

  const activeLocName = useMemo(() => {
    if (!locationFromUrl) return null
    return (
      allFranchiseList.find((f) => f.code === locationFromUrl)?.name ||
      instancesFranchises.find((f) => f.code === locationFromUrl)?.name ||
      null
    )
  }, [locationFromUrl, allFranchiseList, instancesFranchises])

  const ageRangeOptions = [
    { value: "all", label: "All Ages" },
    { value: "under_9", label: "Under 9" },
    { value: "9_15", label: "9-15" },
    { value: "over_15", label: "Over 15" },
  ]

  const updateUrl = (next: {
    location?: string | null
    programCategoryId?: string | null
    offeringType?: string | null
  }) => {
    const params = new URLSearchParams()
    const loc = next.location !== undefined ? next.location : locationFromUrl
    const catId =
      next.programCategoryId !== undefined
        ? next.programCategoryId
        : selectedProgramCategoryId !== "all"
          ? selectedProgramCategoryId
          : null
    const offeringType =
      next.offeringType !== undefined ? next.offeringType : offeringTypeFromUrl
    if (loc) params.set("location", loc.toLowerCase())
    if (catId && catId !== "all") {
      params.set("category", catId)
    }
    if (offeringType && offeringType !== "all") {
      params.set("offering_type", offeringType.toLowerCase())
    }
    const qs = params.toString()
    router.replace(qs ? `/programs?${qs}` : "/programs")
  }

  const handleLocationChange = (code: string) => {
    if (code === "all") {
      updateUrl({ location: null })
    } else {
      updateUrl({ location: code.toLowerCase() })
    }
  }

  const handleProgramCategoryChange = (categoryId: string) => {
    setSelectedProgramCategoryId(categoryId)
    updateUrl({
      programCategoryId: categoryId === "all" ? null : categoryId,
    })
  }

  const handleOfferingTypeChange = (typeCode: string) => {
    updateUrl({
      offeringType: typeCode === "all" ? null : typeCode,
    })
  }

  const clearAllFilters = () => {
    setSearchQuery("")
    setSelectedAgeRange("all")
    setSelectedProgramCategoryId("all")
    updateUrl({ programCategoryId: null, location: null, offeringType: null })
  }

  const totalSessions = countSessionsInGroups(nonEmptyOfferingTypeGroups)

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (locationFromUrl) n += 1
    if (selectedProgramCategoryId !== "all") n += 1
    if (offeringTypeFromUrl !== "all") n += 1
    if (selectedAgeRange !== "all") n += 1
    if (searchQuery.trim()) n += 1
    return n
  }, [
    locationFromUrl,
    selectedProgramCategoryId,
    offeringTypeFromUrl,
    selectedAgeRange,
    searchQuery,
  ])

  const renderNoSessionsMessage = () => (
    <div className="text-center py-32 bg-white rounded-[40px] border border-dashed border-slate-300">
      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Search className="w-10 h-10 text-slate-300" />
      </div>
      <p className="text-slate-500 text-sm font-medium max-w-md mx-auto mb-8">
        We couldn&apos;t find the session you&apos;re looking for.
      </p>
      <button
        type="button"
        onClick={clearAllFilters}
        className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold hover:bg-blue-700 transition-all"
      >
        Clear All Filters
      </button>
    </div>
  )

  const renderOfferingTypeGroupSections = (
    renderSession: (item: SessionListItem, locCode: string | null) => React.ReactNode
  ) => (
    <div className="space-y-12">
      {nonEmptyOfferingTypeGroups.map((group) => {
        const count = group.sessions.length
        const locCode = locationFromUrl || null

        return (
          <div key={group.offeringType.code} className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl md:text-3xl font-black text-slate-900">
                {group.offeringType.name}
              </h2>
              <Badge variant="secondary" className="text-sm font-semibold px-3 py-1">
                {count} session{count !== 1 ? "s" : ""}
              </Badge>
            </div>

            <div className={catalogViewMode === "list" ? "space-y-3" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"}>
              {group.sessions.map((item: SessionListItem) =>
                renderSession(item, locCode || item.location.code)
              )}
            </div>
          </div>
        )
      })}
    </div>
  )

  const renderListView = () =>
    renderOfferingTypeGroupSections((item, locCode) => (
      <SessionListRow
        key={item.session.id}
        item={item}
        detailHref={instanceDetailHref(item.activity, item.session.id, locCode)}
      />
    ))

  const renderDetailsView = () =>
    renderOfferingTypeGroupSections((item, locCode) => (
      <SessionCard
        key={item.session.id}
        session={item.session}
        activity={item.activity}
        franchise={item.location}
        locationCode={locCode}
      />
    ))

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
        <Footer />
      </>
    )
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-destructive mb-4">{error}</p>
            <button onClick={fetchData} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
              Retry
            </button>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="pb-24 bg-slate-50 min-h-screen">
        <section className="bg-[#0f172a] pt-32 pb-20 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-500 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2" />
          </div>
          <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
            <h1 className="text-4xl md:text-6xl font-black text-white mb-6">
              Programs {activeLocName ? `in ${activeLocName}` : "Across Blaze"}
            </h1>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-4">
              Find the right camp or class for your child—browse by campus, season, and schedule, then
              enroll in a few clicks.
            </p>
            <p className="text-slate-500 text-sm max-w-xl mx-auto">
              From summer camps to year-round courses, explore what&apos;s open at Blaze and secure a
              spot while seats are available.
            </p>
          </div>
        </section>

        <div className="relative z-10 max-w-7xl mx-auto px-4 -mt-10">
          <div ref={filterAnchorRef} className="h-px w-full" aria-hidden />
          {isFilterPinned ? <div style={{ height: filterBarHeight }} aria-hidden /> : null}
          <div
            ref={filterBarRef}
            className={cn(
              "pb-4",
              isFilterPinned
                ? "fixed top-20 left-0 right-0 z-40 bg-slate-50/55 backdrop-blur-lg border-b border-slate-200/80 shadow-md"
                : "relative"
            )}
          >
            <div className="max-w-7xl mx-auto px-4 pt-2">
              <div className="bg-white/60 backdrop-blur-lg rounded-[28px] shadow-xl border border-slate-200/80 p-3 sm:p-4 flex flex-col gap-2.5">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search programs, activities, or sessions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-9 py-2 text-sm bg-white/50 border border-slate-200/80 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                  {searchQuery.trim() ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 transition-colors"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  ) : null}
                </div>

                {/* Mobile: collapsible filters */}
                <div className="lg:hidden border-t border-slate-100 pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMobileFiltersOpen((o) => !o)}
                      className={cn(
                        MOBILE_FILTER_BAR_CONTROL_CLASS,
                        "inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                      )}
                    >
                      <SlidersHorizontal className="h-4 w-4" strokeWidth={1.5} />
                      Filters
                      {activeFilterCount > 0 ? (
                        <span className="bg-[#2563eb] text-white text-[10px] font-bold min-w-[1.25rem] h-5 px-1.5 rounded-full inline-flex items-center justify-center">
                          {activeFilterCount}
                        </span>
                      ) : null}
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform",
                          mobileFiltersOpen && "rotate-180"
                        )}
                        strokeWidth={1.5}
                      />
                    </button>
                    <div className="flex items-center gap-0.5 shrink-0 bg-slate-100 p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setCatalogViewMode("list")}
                        className={cn(
                          MOBILE_FILTER_BAR_CONTROL_CLASS,
                          "inline-flex items-center justify-center gap-1 px-2 rounded-md text-xs font-medium transition-colors",
                          catalogViewMode === "list"
                            ? "bg-white text-[#2563eb] shadow-sm"
                            : "text-slate-600"
                        )}
                        aria-label="List view"
                      >
                        <LayoutList className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCatalogViewMode("details")}
                        className={cn(
                          MOBILE_FILTER_BAR_CONTROL_CLASS,
                          "inline-flex items-center justify-center gap-1 px-2 rounded-md text-xs font-medium transition-colors",
                          catalogViewMode === "details"
                            ? "bg-white text-[#2563eb] shadow-sm"
                            : "text-slate-600"
                        )}
                        aria-label="Details view"
                      >
                        <LayoutGrid className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {mobileFiltersOpen ? (
                    <div className="mt-2 space-y-1.5 max-h-[min(50vh,320px)] overflow-y-auto pr-0.5">
                      <FilterTagGroup>
                        <FilterTag
                          label="All campuses"
                          active={!locationFromUrl}
                          onClick={() => handleLocationChange("all")}
                          compact
                        />
                        {allFranchiseList.map((franchise) => (
                          <FilterTag
                            key={franchise.id}
                            label={franchise.name}
                            active={locationFromUrl === franchise.code}
                            onClick={() => handleLocationChange(franchise.code)}
                            compact
                          />
                        ))}
                      </FilterTagGroup>
                      <FilterTagGroup>
                        <FilterTag
                          label="All programs"
                          active={selectedProgramCategoryId === "all"}
                          onClick={() => handleProgramCategoryChange("all")}
                          compact
                        />
                        {sortedCatalog.map((cat) => (
                          <FilterTag
                            key={cat.id}
                            label={cat.display_name || cat.name}
                            active={selectedProgramCategoryId === cat.id}
                            onClick={() => handleProgramCategoryChange(cat.id)}
                            compact
                          />
                        ))}
                      </FilterTagGroup>
                      <FilterTagGroup>
                        <FilterTag
                          label="All types"
                          active={offeringTypeFromUrl === "all"}
                          onClick={() => handleOfferingTypeChange("all")}
                          compact
                        />
                        {visibleOfferingTypeOptions.map((type) => (
                          <FilterTag
                            key={type.id}
                            label={type.name}
                            active={offeringTypeFromUrl === type.code}
                            onClick={() => handleOfferingTypeChange(type.code)}
                            compact
                          />
                        ))}
                      </FilterTagGroup>
                      <FilterTagGroup>
                        {ageRangeOptions.map((opt) => (
                          <FilterTag
                            key={opt.value}
                            label={opt.label}
                            active={selectedAgeRange === opt.value}
                            onClick={() => setSelectedAgeRange(opt.value)}
                            compact
                          />
                        ))}
                      </FilterTagGroup>
                    </div>
                  ) : null}
                </div>

                {/* Desktop: campus row + compact Program / Type / Age row */}
                <div className="hidden lg:flex flex-col gap-1.5 border-t border-slate-100/80 pt-2">
                  <FilterTagGroup>
                    <FilterTag
                      label="All campuses"
                      active={!locationFromUrl}
                      onClick={() => handleLocationChange("all")}
                      compact
                    />
                    {allFranchiseList.map((franchise) => (
                      <FilterTag
                        key={franchise.id}
                        label={franchise.name}
                        active={locationFromUrl === franchise.code}
                        onClick={() => handleLocationChange(franchise.code)}
                        compact
                      />
                    ))}
                  </FilterTagGroup>
                  <div className="grid grid-cols-3 gap-2 items-start">
                    <FilterTagGroup inline>
                      <FilterTag
                        label="All programs"
                        active={selectedProgramCategoryId === "all"}
                        onClick={() => handleProgramCategoryChange("all")}
                        compact
                      />
                      {sortedCatalog.map((cat) => (
                        <FilterTag
                          key={cat.id}
                          label={cat.display_name || cat.name}
                          active={selectedProgramCategoryId === cat.id}
                          onClick={() => handleProgramCategoryChange(cat.id)}
                          compact
                        />
                      ))}
                    </FilterTagGroup>
                    <FilterTagGroup inline>
                      <FilterTag
                        label="All types"
                        active={offeringTypeFromUrl === "all"}
                        onClick={() => handleOfferingTypeChange("all")}
                        compact
                      />
                      {visibleOfferingTypeOptions.map((type) => (
                        <FilterTag
                          key={type.id}
                          label={type.name}
                          active={offeringTypeFromUrl === type.code}
                          onClick={() => handleOfferingTypeChange(type.code)}
                          compact
                        />
                      ))}
                    </FilterTagGroup>
                    <FilterTagGroup inline>
                      {ageRangeOptions.map((opt) => (
                        <FilterTag
                          key={opt.value}
                          label={opt.label}
                          active={selectedAgeRange === opt.value}
                          onClick={() => setSelectedAgeRange(opt.value)}
                          compact
                        />
                      ))}
                    </FilterTagGroup>
                  </div>
                </div>

                <div className="hidden lg:flex items-center justify-between gap-3 border-t border-slate-100 pt-2">
                  <p className="text-[11px] text-slate-500">
                    {catalogViewMode === "list"
                      ? "Camps and courses at a glance"
                      : "Rich cards with photos and full details"}
                  </p>
                  <div className="flex items-center gap-1 ml-auto bg-slate-100 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setCatalogViewMode("list")}
                      className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                        catalogViewMode === "list"
                          ? "bg-white text-[#2563eb] shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      <LayoutList className="h-3.5 w-3.5" />
                      List
                    </button>
                    <button
                      type="button"
                      onClick={() => setCatalogViewMode("details")}
                      className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                        catalogViewMode === "details"
                          ? "bg-white text-[#2563eb] shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                      Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="py-16 px-4">
          <div className="max-w-7xl mx-auto">
            {nonEmptyOfferingTypeGroups.length > 0 ? (
              catalogViewMode === "list" ? renderListView() : renderDetailsView()
            ) : (
              renderNoSessionsMessage()
            )}
          </div>
        </section>

        {PROGRAMS_AI_ASSISTANT_ENABLED && (
          <section className="max-w-7xl mx-auto px-4">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[40px] p-12 text-white relative overflow-hidden shadow-2xl">
              <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
                <div className="text-center lg:text-left">
                  <h2 className="text-4xl font-black mb-4">Unsure about your child&apos;s level?</h2>
                  <p className="text-blue-100 text-lg max-w-xl">
                    Chat with our AI assistant for personalized program recommendations by age, grade, and
                    interests.
                  </p>
                </div>
                <OpenProgramsAIChatButton>Get AI Assessment</OpenProgramsAIChatButton>
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
            </div>
          </section>
        )}
      </div>
      <Footer />

    </>
  )
}

export default function ProgramsPage() {
  return (
    <Suspense
      fallback={
        <>
          <Navbar />
          <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
          <Footer />
        </>
      }
    >
      <ProgramsPageContent />
    </Suspense>
  )
}
