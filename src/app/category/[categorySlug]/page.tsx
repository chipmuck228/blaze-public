'use client'

import { useState, useEffect, useMemo, Suspense } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import {
  Loader2,
  MapPin,
  Calendar,
  Search,
  ArrowRight,
  BookOpen,
  ChevronRight,
  Home,
  ExternalLink,
  ChevronDown,
  Check,
  GraduationCap,
  Users,
} from "lucide-react"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { AIAssessmentDialog } from "@/components/location/AIAssessmentDialog"

/** Slug to v2_category name: "beginner-robotics" -> "beginner_robotics" */
function slugToName(slug: string): string {
  return slug.replace(/-/g, "_")
}

interface Instance {
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

interface Program {
  id: string
  name: string
  display_name: string
  description?: string
  category: { id: string; name: string; display_name: string }
  instances: Instance[]
}

interface Franchise {
  id: string
  code: string
  name: string
  programs: Program[]
}

interface CategoryInfo {
  id: string
  name: string
  display_name: string
  description?: string | null
  poster_url?: string | null
}

function CategoryPageContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const categorySlug = typeof params.categorySlug === "string" ? params.categorySlug : ""
  const locationFromUrl = searchParams.get("location") || searchParams.get("franchise")

  const [category, setCategory] = useState<CategoryInfo | null>(null)
  const [franchises, setFranchises] = useState<Franchise[]>([])
  const [isLoadingCategory, setIsLoadingCategory] = useState(true)
  const [isLoadingInstances, setIsLoadingInstances] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedAgeRange, setSelectedAgeRange] = useState("all")
  const [selectedFranchise, setSelectedFranchise] = useState("all")
  const [locationSlug, setLocationSlug] = useState<string | null>(null)
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false)

  // Resolve slug -> category by name
  useEffect(() => {
    if (!categorySlug) {
      setIsLoadingCategory(false)
      return
    }
    const name = slugToName(categorySlug)
    let cancelled = false
    setIsLoadingCategory(true)
    setError(null)
    fetch(`/api/public/categories/by-name?name=${encodeURIComponent(name)}`)
      .then((res) => {
        if (cancelled) return
        if (res.status === 404) {
          setCategory(null)
          return
        }
        if (!res.ok) throw new Error("Failed to fetch category")
        return res.json()
      })
      .then((data) => {
        if (!cancelled && data) {
          console.log("[Category page] Category resolved:", { id: data.id, name: data.name, display_name: data.display_name })
          setCategory(data)
          if (typeof document !== 'undefined') {
            document.title = `${data.display_name || data.name} | Blaze Robotics`
          }
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load category")
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCategory(false)
      })
    return () => {
      cancelled = true
    }
  }, [categorySlug])

  // When coming from URL, set location filter
  useEffect(() => {
    if (locationFromUrl) {
      setLocationSlug(locationFromUrl)
    } else {
      setLocationSlug(null)
    }
  }, [locationFromUrl])

  // Fetch instances for this category from v2 (v2_program + v2_instance); optional location = franchise code
  useEffect(() => {
    if (!category?.id) {
      setFranchises([])
      setIsLoadingInstances(false)
      return
    }
    let cancelled = false
    setIsLoadingInstances(true)
    const params = new URLSearchParams()
    params.set("category", category.id)
    if (locationFromUrl) params.set("location", locationFromUrl)
    const apiUrl = `/api/public/instances-v2?${params.toString()}`
    console.log("[Category page] Fetching instances-v2:", apiUrl, { categoryId: category.id, locationFromUrl })
    fetch(apiUrl)
      .then((res) => {
        if (cancelled) return res.json()
        console.log("[Category page] instances-v2 response:", { ok: res.ok, status: res.status })
        if (!res.ok) throw new Error("Failed to fetch programs")
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        const list = data?.franchises ?? []
        console.log("[Category page] instances-v2 data:", {
          franchisesCount: list.length,
          franchises: list.map((f: Franchise) => ({ code: f.code, name: f.name, programsCount: f.programs?.length ?? 0, instancesCount: f.programs?.reduce((s, p) => s + (p.instances?.length ?? 0), 0) ?? 0 })),
          rawKeys: data ? Object.keys(data) : [],
        })
        setFranchises(list)
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("[Category page] instances-v2 fetch error:", err)
          setFranchises([])
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingInstances(false)
      })
    return () => {
      cancelled = true
    }
  }, [category?.id, locationFromUrl])

  const allFranchises = useMemo(
    () => franchises.map((f) => ({ id: f.id, code: f.code, name: f.name })),
    [franchises]
  )

  useEffect(() => {
    if (locationSlug && allFranchises.length) {
      const franchise = allFranchises.find((f) => f.code === locationSlug)
      if (franchise) setSelectedFranchise(franchise.id)
    } else {
      setSelectedFranchise("all")
    }
  }, [locationSlug, allFranchises])

  const ageRangeOptions = [
    { value: "all", label: "All Ages" },
    { value: "under_9", label: "Under 9" },
    { value: "9_15", label: "9-15" },
    { value: "over_15", label: "Over 15" },
  ]

  const hierarchicalData = useMemo(() => {
    return franchises
      .filter((f) => selectedFranchise === "all" || f.id === selectedFranchise)
      .map((franchise) => {
        const categoryMap = new Map<string, Program[]>()
        franchise.programs.forEach((program) => {
          const filteredInstances = (program.instances || []).filter((inst) => {
            if (searchQuery) {
              const q = searchQuery.toLowerCase()
              const match =
                inst.course?.name?.toLowerCase().includes(q) ||
                inst.course?.description?.toLowerCase().includes(q) ||
                program.display_name?.toLowerCase().includes(q) ||
                program.description?.toLowerCase().includes(q)
              if (!match) return false
            }
            if (selectedAgeRange !== "all") {
              const ageMin = inst.course?.age_min ?? null
              const ageMax = inst.course?.age_max ?? null
              const matchesUnder9 = ageMax != null && ageMax <= 9
              const matches9_15 = (ageMin ?? 0) <= 15 && (ageMax ?? 99) >= 9
              const matchesOver15 = ageMin != null && ageMin >= 15
              const matches =
                selectedAgeRange === "under_9"
                  ? matchesUnder9
                  : selectedAgeRange === "9_15"
                    ? matches9_15
                    : selectedAgeRange === "over_15"
                      ? matchesOver15
                      : true
              if (!matches) return false
            }
            return true
          })
          if (filteredInstances.length === 0) return
          const catId = program.category?.id ?? "uncategorized"
          const catName =
            program.category?.display_name || program.category?.name || "Uncategorized"
          if (!categoryMap.has(catId))
            categoryMap.set(catId, [])
          categoryMap.get(catId)!.push({ ...program, instances: filteredInstances })
        })
        const categories = Array.from(categoryMap.entries()).map(([categoryId, programs]) => {
          const first = programs[0]
          return {
            id: categoryId,
            name:
              first?.category?.display_name || first?.category?.name || "Uncategorized",
            display_name:
              first?.category?.display_name || first?.category?.name || "Uncategorized",
            programs: programs.filter((p) => p.id?.trim()),
          }
        })
        return { ...franchise, categories: categories.filter((c) => c.programs.length > 0) }
      })
      .filter((f) => f.categories.length > 0)
  }, [franchises, selectedFranchise, searchQuery, selectedAgeRange])

  const activeLocName = useMemo(() => {
    if (!locationSlug) return null
    const f = allFranchises.find((x) => x.code === locationSlug)
    return f?.name ?? null
  }, [locationSlug, allFranchises])

  const handleLocationChange = (value: string) => {
    if (value === "all") {
      setSelectedFranchise("all")
      setLocationSlug(null)
      if (categorySlug) {
        const u = new URLSearchParams(searchParams.toString())
        u.delete("location")
        u.delete("franchise")
        router.push(`/category/${categorySlug}${u.toString() ? `?${u}` : ""}`)
      }
    } else {
      const f = allFranchises.find((x) => x.code === value)
      if (f) {
        setSelectedFranchise(f.id)
        setLocationSlug(value)
        const u = new URLSearchParams(searchParams.toString())
        u.set("location", value)
        router.push(`/category/${categorySlug}?${u.toString()}`)
      }
    }
  }

  const navigate = (path: string) => router.push(path)

  const isLoading = isLoadingCategory || (!!category && isLoadingInstances)

  if (isLoadingCategory && !category) {
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

  if (!categorySlug || (!isLoadingCategory && !category)) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Category not found</h1>
            <p className="text-slate-600 mb-6">
              We couldn’t find a category for “{categorySlug}”. It may have been removed or the link is incorrect.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-[#2563eb] text-white px-6 py-3 rounded-full font-semibold hover:bg-blue-700"
            >
              <Home className="w-4 h-4" />
              Back to home
            </Link>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center">
            <p className="text-destructive mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
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
        {/* Hero */}
        <section className="bg-[#0f172a] pt-32 pb-20 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-500 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/4" />
          </div>
          <div className="max-w-7xl mx-auto px-4 relative z-10">
            <nav className="flex items-center gap-2 text-sm text-slate-400 mb-6" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <ChevronRight className="w-4 h-4 flex-shrink-0" />
              <Link href="/#programs" className="hover:text-white transition-colors">Categories</Link>
              <ChevronRight className="w-4 h-4 flex-shrink-0" />
              <span className="text-white font-medium">{category?.display_name ?? categorySlug}</span>
            </nav>
            <div className="flex flex-col md:flex-row md:items-center gap-8">
              <div className="flex-1 text-white">
                <h1 className="text-4xl md:text-6xl font-black mb-4">
                  {category?.display_name ?? categorySlug}
                </h1>
                {category?.description && (
                  <p className="text-slate-400 text-lg max-w-2xl leading-relaxed">
                    {category.description}
                  </p>
                )}
              </div>
              {category?.poster_url && (
                <div className="md:w-80 h-48 md:h-56 relative rounded-2xl overflow-hidden border border-white/10 flex-shrink-0">
                  <Image
                    src={category.poster_url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="320px"
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Filters: Search, All campuses, All Ages — equal width on sm+, stacked on small screens */}
        <div className="max-w-7xl mx-auto px-4 -mt-10 relative z-20">
          <div className="bg-white rounded-[32px] shadow-xl border border-slate-200 p-4 sm:p-6 flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch min-w-0">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search programs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full min-w-0 pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            {allFranchises.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full sm:flex-1 min-w-0 px-4 py-3.5 h-auto bg-slate-50 border-slate-200 rounded-2xl text-sm font-bold text-slate-700 hover:bg-slate-100 justify-between"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <MapPin className="w-4 h-4 shrink-0 text-slate-500" />
                      {locationSlug
                        ? allFranchises.find((f) => f.code === locationSlug)?.name ?? "All campuses"
                        : "All campuses"}
                    </span>
                    <ChevronDown className="w-4 h-4 shrink-0 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[200px] max-h-[min(320px,60vh)] overflow-y-auto rounded-xl border border-slate-200 shadow-xl bg-white"
                >
                  <DropdownMenuItem
                    onClick={() => handleLocationChange("all")}
                    className="flex items-center gap-2 rounded-lg py-2.5 cursor-pointer"
                  >
                    {!locationSlug && <Check className="w-4 h-4 text-[#2563eb]" />}
                    {locationSlug && <span className="w-4" />}
                    <span>All campuses</span>
                  </DropdownMenuItem>
                  {allFranchises.map((f) => (
                    <DropdownMenuItem
                      key={f.id}
                      onClick={() => handleLocationChange(f.code)}
                      className="flex items-center gap-2 rounded-lg py-2.5 cursor-pointer"
                    >
                      {locationSlug === f.code ? (
                        <Check className="w-4 h-4 text-[#2563eb]" />
                      ) : (
                        <span className="w-4" />
                      )}
                      <span className="truncate">{f.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full sm:flex-1 min-w-0 px-4 py-3.5 h-auto bg-slate-50 border-slate-200 rounded-2xl text-sm font-bold text-slate-700 hover:bg-slate-100 justify-between"
                >
                  <span className="flex items-center gap-2 truncate">
                    <Users className="w-4 h-4 shrink-0 text-slate-500" />
                    {ageRangeOptions.find((o) => o.value === selectedAgeRange)?.label ?? "All Ages"}
                  </span>
                  <ChevronDown className="w-4 h-4 shrink-0 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[10rem] max-h-[min(320px,60vh)] overflow-y-auto rounded-xl border border-slate-200 shadow-xl bg-white"
              >
                {ageRangeOptions.map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => setSelectedAgeRange(opt.value)}
                    className="flex items-center gap-2 rounded-lg py-2.5 cursor-pointer"
                  >
                    {selectedAgeRange === opt.value ? (
                      <Check className="w-4 h-4 text-[#2563eb]" />
                    ) : (
                      <span className="w-4" />
                    )}
                    <span>{opt.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Results */}
        <section className="py-16 px-4">
          <div className="max-w-7xl mx-auto">
            {isLoadingInstances ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : hierarchicalData.length > 0 ? (
              <div className="space-y-12">
                {hierarchicalData.map((franchise) => (
                  <div key={franchise.id} className="space-y-8">
                    <div className="flex items-center gap-4">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
                      <h2 className="text-3xl md:text-4xl font-black text-slate-900">{franchise.name}</h2>
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
                    </div>
                    {franchise.categories.map((cat) => (
                      <div key={cat.id} className="space-y-6">
                        <div className="flex items-center gap-3">
                          <span className="bg-[#2563eb] text-white px-4 py-1.5 rounded-full text-sm font-black uppercase tracking-wider">
                            {cat.display_name}
                          </span>
                          <span className="text-slate-500 text-sm font-medium">
                            {cat.programs.length} Program{cat.programs.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                          {cat.programs.flatMap((program) =>
                            program.instances
                              .filter((inst) => inst.id?.trim())
                              .map((instance) => {
                                const ageGroup =
                                  instance.course?.age_min != null && instance.course?.age_max != null
                                    ? `Ages ${instance.course.age_min}-${instance.course.age_max}`
                                    : instance.course?.age_min
                                    ? `Ages ${instance.course.age_min}+`
                                    : instance.course?.grade_level
                                    ? `Grade ${instance.course.grade_level}`
                                    : "All Ages"
                                const dates =
                                  instance.start_date && instance.end_date
                                    ? `${new Date(instance.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${new Date(instance.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                                    : instance.start_date
                                    ? `Starts ${new Date(instance.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                                    : "TBD"
                                const basePrice =
                                  instance.price_override ?? instance.course?.base_price ?? 0
                                const image =
                                  instance.offering?.poster_url ||
                                  instance.course?.poster_url ||
                                  `https://picsum.photos/400/300?random=${instance.id}`
                                const locationName =
                                  instance.location?.name || franchise.name || "Multiple Locations"

                                const amiliaEnrollUrl = "https://app.amilia.com/store/en/blazeroboticsacademy/shop/programs"
                                return (
                                  <div
                                    key={instance.id}
                                    className="group bg-white rounded-[32px] overflow-hidden border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col h-full"
                                  >
                                    <Link href={`/category/${categorySlug}/instance/${instance.id}${locationSlug ? `?location=${encodeURIComponent(locationSlug)}` : ""}`} className="block flex flex-col flex-grow">
                                      <div className="h-64 relative overflow-hidden">
                                        <Image
                                          src={image}
                                          alt={instance.course?.name || program.display_name || program.name}
                                          fill
                                          className="object-cover group-hover:scale-110 transition-transform duration-700"
                                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-80" />
                                        <div className="absolute top-4 left-4">
                                          <span className="bg-white/90 backdrop-blur-md text-slate-900 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                                            {ageGroup}
                                          </span>
                                        </div>
                                        <div className="absolute bottom-4 left-4 right-4">
                                          <p className="text-white text-sm font-bold flex items-center">
                                            <MapPin className="w-3.5 h-3.5 mr-1 text-blue-400" />
                                            {locationName}
                                          </p>
                                          {instance.available_spots != null && (
                                            <p className="text-white/90 text-xs mt-1">
                                              {instance.is_full
                                                ? "Full"
                                                : `${instance.available_spots} spots available`}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      <div className="p-8 flex flex-col flex-grow">
                                        <div className="flex justify-between items-start mb-3">
                                          <h3 className="text-2xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
                                            {instance.course?.name || program.name}
                                          </h3>
                                        </div>
                                        <p className="text-slate-500 text-sm mb-6 line-clamp-3 leading-relaxed">
                                          {instance.course?.description ?? ""}
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
                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">
                                          Enrollment
                                        </p>
                                        <p className="text-2xl font-black text-slate-900">
                                          ${basePrice.toFixed(2)}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Link
                                          href={`/category/${categorySlug}/instance/${instance.id}${locationSlug ? `?location=${encodeURIComponent(locationSlug)}` : ""}`}
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
                              })
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-32 bg-white rounded-[40px] border border-dashed border-slate-300">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <BookOpen className="w-10 h-10 text-slate-300" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">No programs in this category yet</h2>
                <p className="text-slate-500 max-w-md mx-auto mb-8">
                  {activeLocName
                    ? `There are no open sessions for this category at ${activeLocName} right now.`
                    : "There are no open sessions for this category right now. Try another category or check back later."}
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Link
                    href="/#programs"
                    className="inline-flex items-center gap-2 bg-[#2563eb] text-white px-6 py-3 rounded-full font-bold hover:bg-blue-700"
                  >
                    Browse categories
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/#locations"
                    className="inline-flex items-center gap-2 border-2 border-slate-300 text-slate-700 px-6 py-3 rounded-full font-bold hover:bg-slate-50"
                  >
                    View campuses
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* AI Assessment CTA */}
        <section className="max-w-7xl mx-auto px-4">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[40px] p-12 text-white relative overflow-hidden shadow-2xl">
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
              <div className="text-center lg:text-left">
                <h2 className="text-4xl font-black mb-4">Unsure about your child&apos;s level?</h2>
                <p className="text-blue-100 text-lg max-w-xl">
                  Chat with our AI assistant for personalized recommendations based on age, grade, and interests.
                </p>
              </div>
              <button
                onClick={() => setIsAIDialogOpen(true)}
                className="bg-white text-blue-600 px-12 py-5 rounded-full font-black text-xl hover:scale-105 transition-all shadow-xl whitespace-nowrap"
              >
                Get AI Assessment
              </button>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
          </div>
        </section>
      </div>
      <Footer />

      <AIAssessmentDialog
        franchiseCode={locationSlug || "general"}
        franchiseName={activeLocName || "Blaze Robotics Academy"}
        isOpen={isAIDialogOpen}
        onOpenChange={setIsAIDialogOpen}
      />
    </>
  )
}

export default function CategorySlugPage() {
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
      <CategoryPageContent />
    </Suspense>
  )
}
