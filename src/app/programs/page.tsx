'use client'

import { useState, useEffect, useMemo, Suspense, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { Loader2, MapPin, Calendar, Search, ArrowRight, BookOpen, ExternalLink, ChevronDown, Users, Layers } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import Image from "next/image"
import {
  buildDisplayTree,
  collectOfferingTypesFromInstances,
  countSessionsInLocation,
  resolveCategoryIdFromUrl,
  sortCatalogCategories,
  sortOfferingTypeOptions,
  type CatalogCategory,
  type CatalogSession,
  type DisplayActivity,
  type DisplayLocation,
  type DisplayProgram,
  type InstancesLocation,
  type OfferingTypeOption,
} from "@/lib/programs-catalog-view"
import { normalizeRemoteImageUrl } from "@/lib/normalize-image-url"

type FranchiseListItem = { id: string; code: string; name: string }

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
      ? `${new Date(session.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${new Date(session.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
      : session.start_date
        ? `Starts ${new Date(session.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
        : "TBD"

  const basePrice = session.price_override ?? session.course.base_price ?? 0
  const image =
    normalizeRemoteImageUrl(session.offering?.poster_url) ||
    normalizeRemoteImageUrl(session.course.poster_url) ||
    `https://picsum.photos/400/300?random=${session.id}`
  const campusName = session.location?.name || franchise.name || "Multiple Locations"
  const detailHref = instanceDetailHref(activity, session.id, locationCode)
  const amiliaEnrollUrl =
    "https://app.amilia.com/store/en/blazeroboticsacademy/shop/programs"

  return (
    <div className="group bg-white rounded-[32px] overflow-hidden border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col h-full">
      <Link href={detailHref} className="flex flex-col flex-grow">
        <div className="h-64 relative overflow-hidden">
          <Image
            src={image}
            alt={session.course.name || activity.display_name || activity.name}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-700"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-80" />
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
            {activity.display_name && session.course.name !== activity.display_name && (
              <Badge variant="secondary" className="text-xs font-semibold">
                {activity.display_name}
              </Badge>
            )}
          </div>
          <p className="text-slate-500 text-sm mb-6 line-clamp-3 leading-relaxed">
            {session.course.description || ""}
          </p>
          <div className="mt-auto">
            <div className="flex items-center text-slate-600 text-sm mb-6 bg-slate-50 p-3 rounded-xl">
              <Calendar className="w-4 h-4 mr-2 text-blue-500" />
              <span className="font-medium">{dates}</span>
            </div>
          </div>
        </div>
      </Link>
      <div className="px-8 pb-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-6">
        <div>
          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Enrollment</p>
          <p className="text-2xl font-black text-slate-900">${basePrice.toFixed(2)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={detailHref}
            className="bg-[#0f172a] hover:bg-slate-800 text-white p-3 md:px-6 md:py-3 rounded-2xl font-bold text-sm transition-all inline-flex items-center justify-center"
          >
            <ArrowRight className="w-4 h-4 md:mr-2 transition-transform group-hover:translate-x-1" />
            <span className="hidden md:inline">Details</span>
          </Link>
          <a
            href={amiliaEnrollUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#2563eb] hover:bg-blue-600 text-white p-3 md:px-6 md:py-3 rounded-2xl font-bold text-sm transition-all inline-flex items-center justify-center"
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
      setError(err instanceof Error ? err.message : "Failed to load programs")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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

  const displayTree = useMemo(
    () =>
      buildDisplayTree(
        catalogCategories,
        instancesFranchises,
        {
          selectedProgramCategoryId,
          searchQuery,
          selectedAgeRange,
          selectedFranchiseId,
          selectedOfferingTypeCode: offeringTypeFromUrl,
        },
        "global",
        null
      ),
    [
      catalogCategories,
      instancesFranchises,
      selectedProgramCategoryId,
      searchQuery,
      selectedAgeRange,
      selectedFranchiseId,
      offeringTypeFromUrl,
    ]
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

  const showLocationHeaders = !locationFromUrl && displayTree.length > 1
  const totalSessions = displayTree.reduce((n, loc) => n + countSessionsInLocation(loc), 0)

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
              Discover robotics pathways by campus, program, activity, and bookable sessions.
            </p>
            <p className="text-slate-500 text-sm max-w-xl mx-auto">
              Browse by <strong className="text-slate-400">campus</strong>, then{" "}
              <strong className="text-slate-400">program</strong> (learning track),{" "}
              <strong className="text-slate-400">activity</strong> (term or season), and{" "}
              <strong className="text-slate-400">sessions</strong> you can enroll in below.
            </p>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 -mt-10 relative z-20">
          <div className="bg-white rounded-[32px] shadow-xl border border-slate-200 p-4 sm:p-6 flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch">
            <div className="relative w-full sm:flex-1 sm:min-w-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search programs, activities, or sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div className="relative group w-full sm:flex-1 sm:min-w-0">
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors w-full min-w-0"
              >
                <span className="flex-1 min-w-0 truncate text-left">
                  {locationFromUrl
                    ? allFranchiseList.find((f) => f.code === locationFromUrl)?.name ?? "All campuses"
                    : "All campuses"}
                </span>
                <ChevronDown className="w-4 h-4 shrink-0 transition-transform group-hover:rotate-180 text-slate-500" />
              </button>
              <div className="absolute top-full left-0 pt-2 w-[min(320px,calc(100vw-2rem))] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden">
                  <div className="max-h-[min(320px,50vh)] overflow-y-auto py-2">
                    <button
                      type="button"
                      onClick={() => handleLocationChange("all")}
                      className={`flex gap-3 px-3 py-2.5 text-sm transition-colors w-full text-left border-b border-slate-100 ${
                        !locationFromUrl ? "bg-slate-100 text-[#2563eb]" : "text-[#1e3a5f] hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0 font-medium">All campuses</div>
                    </button>
                    {allFranchiseList.map((franchise) => (
                      <button
                        key={franchise.id}
                        type="button"
                        onClick={() => handleLocationChange(franchise.code)}
                        className={`flex gap-3 px-3 py-2.5 text-sm transition-colors w-full text-left border-b border-slate-100 last:border-0 ${
                          locationFromUrl === franchise.code
                            ? "bg-slate-100 text-[#2563eb]"
                            : "text-[#1e3a5f] hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0 font-medium">{franchise.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="relative group w-full sm:flex-1 sm:min-w-0">
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors w-full min-w-0"
              >
                <span className="flex-1 min-w-0 truncate text-left">
                  {selectedProgramCategoryId === "all"
                    ? "All programs"
                    : sortedCatalog.find((c) => c.id === selectedProgramCategoryId)?.display_name ||
                      "All programs"}
                </span>
                <ChevronDown className="w-4 h-4 shrink-0 transition-transform group-hover:rotate-180 text-slate-500" />
              </button>
              <div className="absolute top-full left-0 pt-2 w-[min(320px,calc(100vw-2rem))] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden">
                  <div className="max-h-[min(400px,60vh)] overflow-y-auto py-2">
                    <button
                      type="button"
                      onClick={() => handleProgramCategoryChange("all")}
                      className={`flex gap-3 px-3 py-2.5 text-sm transition-colors w-full text-left border-b border-slate-100 ${
                        selectedProgramCategoryId === "all"
                          ? "bg-slate-100 text-[#2563eb]"
                          : "text-[#1e3a5f] hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0 font-medium">All programs</div>
                    </button>
                    {sortedCatalog.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleProgramCategoryChange(cat.id)}
                        className={`flex gap-3 px-3 py-2.5 text-sm transition-colors w-full text-left border-b border-slate-100 last:border-0 ${
                          selectedProgramCategoryId === cat.id
                            ? "bg-slate-100 text-[#2563eb]"
                            : "text-[#1e3a5f] hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                          <BookOpen className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0 font-medium">{cat.display_name || cat.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="relative group w-full sm:flex-1 sm:min-w-0">
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors w-full min-w-0"
              >
                <span className="flex-1 min-w-0 truncate text-left">
                  {offeringTypeFromUrl === "all"
                    ? "All types"
                    : visibleOfferingTypeOptions.find((t) => t.code === offeringTypeFromUrl)?.name ||
                      globalOfferingTypes.find((t) => t.code === offeringTypeFromUrl)?.name ||
                      offeringTypeFromUrl}
                </span>
                <ChevronDown className="w-4 h-4 shrink-0 transition-transform group-hover:rotate-180 text-slate-500" />
              </button>
              <div className="absolute top-full left-0 pt-2 w-[min(280px,calc(100vw-2rem))] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden">
                  <div className="max-h-[min(320px,50vh)] overflow-y-auto py-2">
                    <button
                      type="button"
                      onClick={() => handleOfferingTypeChange("all")}
                      className={`flex gap-3 px-3 py-2.5 text-sm transition-colors w-full text-left border-b border-slate-100 ${
                        offeringTypeFromUrl === "all"
                          ? "bg-slate-100 text-[#2563eb]"
                          : "text-[#1e3a5f] hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                        <Layers className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0 font-medium">All types</div>
                    </button>
                    {visibleOfferingTypeOptions.map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => handleOfferingTypeChange(type.code)}
                        className={`flex gap-3 px-3 py-2.5 text-sm transition-colors w-full text-left border-b border-slate-100 last:border-0 ${
                          offeringTypeFromUrl === type.code
                            ? "bg-slate-100 text-[#2563eb]"
                            : "text-[#1e3a5f] hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                          <Layers className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0 font-medium">{type.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="relative group w-full sm:flex-1 sm:min-w-0">
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors w-full min-w-0"
              >
                <span className="flex-1 min-w-0 truncate text-left">
                  {ageRangeOptions.find((o) => o.value === selectedAgeRange)?.label ?? "All Ages"}
                </span>
                <ChevronDown className="w-4 h-4 shrink-0 transition-transform group-hover:rotate-180 text-slate-500" />
              </button>
              <div className="absolute top-full left-0 pt-2 w-[min(280px,calc(100vw-2rem))] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden">
                  <div className="py-2">
                    {ageRangeOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSelectedAgeRange(opt.value)}
                        className={`flex gap-3 px-3 py-2.5 text-sm transition-colors w-full text-left border-b border-slate-100 last:border-0 ${
                          selectedAgeRange === opt.value
                            ? "bg-slate-100 text-[#2563eb]"
                            : "text-[#1e3a5f] hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                          <Users className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0 font-medium">{opt.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="py-16 px-4">
          <div className="max-w-7xl mx-auto">
            {displayTree.length > 0 && totalSessions > 0 && (
              <p className="text-slate-500 text-sm text-center mb-10 max-w-2xl mx-auto">
                Results are grouped by campus, program, and activity. Each card is a bookable session—tap for
                schedule, price, and enrollment.
              </p>
            )}
            {displayTree.length > 0 ? (
              <div className="space-y-12">
                {displayTree.map((location) => (
                  <div key={location.id} className="space-y-8">
                    {showLocationHeaders && (
                      <div className="flex items-center gap-4">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
                        <h2 className="text-3xl md:text-4xl font-black text-slate-900">{location.name}</h2>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
                      </div>
                    )}

                    {location.programs.map((program: DisplayProgram) => {
                      const activityCount = program.activities.length
                      const sessionCount = program.activities.reduce(
                        (n, a) => n + a.sessions.length,
                        0
                      )
                      const locCode = locationFromUrl || location.code

                      return (
                        <div key={program.id} className="space-y-6">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="bg-[#2563eb] text-white px-4 py-1.5 rounded-full text-sm font-black uppercase tracking-wider">
                              {program.display_name}
                            </span>
                            <span className="text-slate-500 text-sm font-medium">
                              {activityCount} activit{activityCount === 1 ? "y" : "ies"}
                              {sessionCount > 0 &&
                                ` · ${sessionCount} session${sessionCount !== 1 ? "s" : ""}`}
                            </span>
                          </div>

                          {program.activities.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-8 text-center">
                              <p className="text-slate-500 text-sm font-medium">Activities coming soon</p>
                            </div>
                          ) : (
                            program.activities.map((activity) => (
                              <div key={activity.id} className="space-y-4 pl-0 sm:pl-2">
                                <div>
                                  <h3 className="text-lg font-bold text-slate-800">
                                    {activity.display_name || activity.name}
                                  </h3>
                                  {activity.description ? (
                                    <p className="text-slate-500 text-sm mt-1 max-w-2xl">
                                      {activity.description}
                                    </p>
                                  ) : null}
                                  <p className="text-slate-400 text-xs mt-1">
                                    {activity.sessions.length} session
                                    {activity.sessions.length !== 1 ? "s" : ""} available
                                  </p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                  {activity.sessions.map((session) => (
                                    <SessionCard
                                      key={session.id}
                                      session={session}
                                      activity={activity}
                                      franchise={location}
                                      locationCode={locCode}
                                    />
                                  ))}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-32 bg-white rounded-[40px] border border-dashed border-slate-300">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="w-10 h-10 text-slate-300" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">No Matching Sessions</h2>
                <p className="text-slate-500 max-w-md mx-auto mb-4">
                  We couldn&apos;t find sessions matching your filters
                  {activeLocName ? ` at ${activeLocName}` : ""}. Try another program, offering type, age range, or clear
                  filters.
                </p>
                <p className="text-slate-400 text-sm max-w-sm mx-auto mb-8">
                  Programs are learning tracks; activities are terms or seasons; sessions are the classes you
                  can book. Pick a campus in the navbar or filter above to narrow results.
                </p>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold hover:bg-blue-700 transition-all"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        </section>

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
              <div
                className="bg-white/90 text-blue-600 px-12 py-5 rounded-full font-black text-xl shadow-xl whitespace-nowrap cursor-not-allowed opacity-90"
                aria-disabled="true"
              >
                Coming Soon
              </div>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
          </div>
        </section>
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
