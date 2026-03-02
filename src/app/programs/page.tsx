'use client'

import { useState, useEffect, useMemo, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { Loader2, MapPin, Calendar, Search, ArrowRight, Sparkles, BookOpen, ExternalLink, ChevronDown, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { AIAssessmentDialog } from "@/components/location/AIAssessmentDialog"

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
  category: {
    id: string
    name: string
    display_name: string
  }
  instances: Instance[]
}

interface Franchise {
  id: string
  code: string
  name: string
  programs: Program[]
}

function ProgramsPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [franchises, setFranchises] = useState<Franchise[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 筛选状态
  const [selectedFranchise, setSelectedFranchise] = useState<string>("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedAgeRange, setSelectedAgeRange] = useState<string>("all")
  const [activeFilter, setActiveFilter] = useState<string>('all') // 改为动态的 category id
  const [locationSlug, setLocationSlug] = useState<string | null>(null)
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false)

  // 从 URL query parameter 获取 category 和 location/franchise
  const categoryFromUrl = searchParams.get("category")
  const locationFromUrl = searchParams.get("location") || searchParams.get("franchise")

  // Sync URL params to filter state once data is loaded (no refetch)
  useEffect(() => {
    if (categoryFromUrl) {
      setSelectedCategory(categoryFromUrl)
    }
    if (locationFromUrl) {
      setLocationSlug(locationFromUrl)
      const franchise = franchises.find(f => f.code === locationFromUrl)
      if (franchise) {
        setSelectedFranchise(franchise.id)
      }
    } else {
      setLocationSlug(null)
      setSelectedFranchise("all")
    }
  }, [categoryFromUrl, locationFromUrl, franchises])

  // Fetch all data once; Location and Program filters are client-side only (no refresh)
  useEffect(() => {
    fetchInstances()
  }, [])

  const fetchInstances = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // No category/location params: load everything, filter client-side like Search
      const url = "/api/public/instances-v2"
      const response = await fetch(url)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to fetch instances")
      }

      const data = await response.json()

      if (data.error) {
        console.warn("API returned error but continuing:", data.error)
        setFranchises([])
      } else {
        const list = data.franchises || []
        setFranchises(list)
      }
    } catch (err) {
      console.error("Error fetching instances:", err)
      setFranchises([])
      setError(err instanceof Error ? err.message : "Failed to load programs")
    } finally {
      setIsLoading(false)
    }
  }

  // 获取所有唯一的 franchise 列表
  const allFranchises = useMemo(() => {
    return franchises.map((f) => ({ id: f.id, code: f.code, name: f.name }))
  }, [franchises])

  // 年龄区间选项（固定）：All Ages, 9岁以下, 9-15岁, 15岁以上
  const ageRangeOptions = [
    { value: 'all', label: 'All Ages' },
    { value: 'under_9', label: '9岁以下' },
    { value: '9_15', label: '9-15 岁' },
    { value: 'over_15', label: '15岁以上' },
  ]

  // 当前 franchise(s) 下的所有 programs（学期/期，用于 “All programs” 下拉）
  const availablePrograms = useMemo(() => {
    const programSet = new Map<string, { id: string; name: string; display_name: string }>()
    const sourceFranchises =
      selectedFranchise === "all"
        ? franchises
        : franchises.filter((f) => f.id === selectedFranchise)
    sourceFranchises.forEach((franchise) => {
      franchise.programs.forEach((program) => {
        if (program.id && (program.instances?.length ?? 0) > 0) {
          programSet.set(program.id, {
            id: program.id,
            name: program.name,
            display_name: program.display_name || program.name,
          })
        }
      })
    })
    return Array.from(programSet.values())
  }, [franchises, selectedFranchise])

  // 按 category 聚合 program，用于下拉分组显示（All locations 时选项很多）
  const programsGroupedByCategory = useMemo(() => {
    const sourceFranchises =
      selectedFranchise === "all"
        ? franchises
        : franchises.filter((f) => f.id === selectedFranchise)
    const byCategory = new Map<
      string,
      { categoryId: string; categoryDisplayName: string; programs: { id: string; name: string; display_name: string }[] }
    >()
    sourceFranchises.forEach((franchise) => {
      franchise.programs.forEach((program) => {
        if (!program.id || (program.instances?.length ?? 0) === 0 || !program.category) return
        const cid = program.category.id
        const cname = program.category.display_name || program.category.name || 'Uncategorized'
        if (!byCategory.has(cid)) {
          byCategory.set(cid, { categoryId: cid, categoryDisplayName: cname, programs: [] })
        }
        const group = byCategory.get(cid)!
        const exists = group.programs.some((p) => p.id === program.id)
        if (!exists) {
          group.programs.push({
            id: program.id,
            name: program.name,
            display_name: program.display_name || program.name,
          })
        }
      })
    })
    return Array.from(byCategory.values()).sort((a, b) =>
      a.categoryDisplayName.localeCompare(b.categoryDisplayName)
    )
  }, [franchises, selectedFranchise])

  // 按层级结构组织数据：franchise -> category -> programs -> instances
  const hierarchicalData = useMemo(() => {
    return franchises
      .filter((franchise) => {
        // Franchise 筛选
        if (selectedFranchise !== "all" && franchise.id !== selectedFranchise) {
          return false
        }
        return true
      })
      .map((franchise) => {
        // 按 category 分组 programs
        const categoryMap = new Map<string, Program[]>()
        
        franchise.programs.forEach((program) => {
          // Category 筛选（来自 URL）
          if (selectedCategory !== "all" && program.category?.id !== selectedCategory) {
            return
          }

          // Program 筛选（学期/期下拉）
          if (activeFilter !== 'all' && program.id !== activeFilter) {
            return
          }

          // 过滤 instances
          const filteredInstances = (program.instances || []).filter((instance) => {
            // 搜索过滤
            if (searchQuery) {
              const query = searchQuery.toLowerCase()
              const matchesName = instance.course?.name?.toLowerCase().includes(query) || false
              const matchesDescription = instance.course?.description?.toLowerCase().includes(query) || false
              const matchesProgramName = program.display_name?.toLowerCase().includes(query) || false
              const matchesProgramDesc = program.description?.toLowerCase().includes(query) || false
              if (!matchesName && !matchesDescription && !matchesProgramName && !matchesProgramDesc) {
                return false
              }
            }

            // 年龄区间过滤（基于 course.age_min / age_max）
            if (selectedAgeRange !== "all") {
              const ageMin = instance.course?.age_min ?? null
              const ageMax = instance.course?.age_max ?? null
              const matchesUnder9 = ageMax != null && ageMax <= 9
              const matches9_15 = (ageMin ?? 0) <= 15 && (ageMax ?? 99) >= 9
              const matchesOver15 = ageMin != null && ageMin >= 15
              const matches =
                selectedAgeRange === 'under_9' ? matchesUnder9
                : selectedAgeRange === '9_15' ? matches9_15
                : selectedAgeRange === 'over_15' ? matchesOver15
                : true
              if (!matches) return false
            }

            return true
          })

          if (filteredInstances.length === 0) {
            return
          }

          const categoryId = program.category?.id || 'uncategorized'
          const categoryName = program.category?.display_name || program.category?.name || 'Uncategorized'
          
          if (!categoryMap.has(categoryId)) {
            categoryMap.set(categoryId, [])
          }
          
          categoryMap.get(categoryId)!.push({
            ...program,
            instances: filteredInstances,
          })
        })

        const categories = Array.from(categoryMap.entries()).map(([categoryId, programs]) => {
          const firstProgram = programs[0]
          return {
            id: categoryId,
            name: firstProgram.category?.display_name || firstProgram.category?.name || 'Uncategorized',
            display_name: firstProgram.category?.display_name || firstProgram.category?.name || 'Uncategorized',
            programs: programs.filter((p) => p.id && typeof p.id === 'string' && p.id.trim() !== ''),
          }
        }).filter((cat) => cat.programs.length > 0)

        return {
          ...franchise,
          categories: categories.filter((cat) => cat.programs.length > 0),
        }
      })
      .filter((franchise) => franchise.categories.length > 0)
  }, [franchises, selectedFranchise, selectedCategory, searchQuery, selectedAgeRange, activeFilter])

  // Location is a filter only: update state and refetch; no URL navigation
  const handleLocationChange = (value: string) => {
    if (value === 'all') {
      setSelectedFranchise('all')
      setLocationSlug(null)
    } else {
      const franchise = allFranchises.find(f => f.code === value)
      if (franchise) {
        setSelectedFranchise(franchise.id)
        setLocationSlug(value)
      }
    }
  }

  const activeLocName = useMemo(() => {
    if (locationSlug) {
      const franchise = allFranchises.find(f => f.code === locationSlug)
      return franchise?.name || null
    }
    return null
  }, [locationSlug, allFranchises])

  const navigate = (path: string) => {
    router.push(path)
  }

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
            <button onClick={fetchInstances} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Retry</button>
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
        {/* Hero Section */}
        <section className="bg-[#0f172a] pt-32 pb-20 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-500 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2"></div>
          </div>
          
          <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
            
            <h1 className="text-4xl md:text-6xl font-black text-white mb-6">
              Programs {activeLocName ? `in ${activeLocName}` : 'Across Blaze'}
            </h1>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-4">
              Discover our full range of engineering pathways, from foundational logic to world-class competitive robotics.
            </p>
            <p className="text-slate-500 text-sm max-w-xl mx-auto">
              We organize by <strong className="text-slate-400">location</strong> and <strong className="text-slate-400">learning category</strong>. Each program is a session or term (e.g. Spring 2026); the cards below are <strong className="text-slate-400">bookable classes</strong>—click for schedule, price, and enrollment.
            </p>
          </div>
        </section>

        {/* Filter & Search Bar - equal-width sections; Location filter only when no location in URL */}
        <div className="max-w-7xl mx-auto px-4 -mt-10 relative z-20">
          <div className="bg-white rounded-[32px] shadow-xl border border-slate-200 p-4 sm:p-6 flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch">
            {/* Search */}
            <div className="relative w-full sm:flex-1 sm:min-w-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              <input 
                type="text"
                placeholder="Search programs or classes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            {/* Location filter - only when no location specified in URL */}
            {!locationFromUrl && (
              <div className="relative group w-full sm:flex-1 sm:min-w-0">
                <button
                  type="button"
                  className="flex items-center gap-2 px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors w-full min-w-0"
                >
                  <span className="flex-1 min-w-0 truncate text-left">
                    {selectedFranchise === 'all'
                      ? 'All locations'
                      : (allFranchises.find((f) => f.id === selectedFranchise)?.name ?? 'All locations')}
                  </span>
                  <ChevronDown className="w-4 h-4 shrink-0 transition-transform group-hover:rotate-180 text-slate-500" />
                </button>
                <div className="absolute top-full left-0 pt-2 w-[min(320px,calc(100vw-2rem))] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden">
                    <div className="max-h-[min(320px,50vh)] overflow-y-auto py-2">
                      <button
                        type="button"
                        onClick={() => handleLocationChange('all')}
                        className={`flex gap-3 px-3 py-2.5 text-sm transition-colors w-full text-left border-b border-slate-100 ${
                          selectedFranchise === 'all'
                            ? 'bg-slate-100 text-[#2563eb]'
                            : 'text-[#1e3a5f] hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0 font-medium">All locations</div>
                      </button>
                      {allFranchises.map((franchise) => (
                        <button
                          key={franchise.id}
                          type="button"
                          onClick={() => handleLocationChange(franchise.code)}
                          className={`flex gap-3 px-3 py-2.5 text-sm transition-colors w-full text-left border-b border-slate-100 last:border-0 ${
                            selectedFranchise === franchise.id
                              ? 'bg-slate-100 text-[#2563eb]'
                              : 'text-[#1e3a5f] hover:bg-slate-100'
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
            )}

            {/* Programs (category) filter - Navbar Categories style dropdown */}
            <div className="relative group w-full sm:flex-1 sm:min-w-0">
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors w-full min-w-0"
              >
                  <span className="flex-1 min-w-0 truncate text-left">
                    {activeFilter === 'all'
                      ? 'All programs'
                      : (availablePrograms.find((p) => p.id === activeFilter)?.display_name ||
                         availablePrograms.find((p) => p.id === activeFilter)?.name ||
                         'All programs')}
                  </span>
                  <ChevronDown className="w-4 h-4 shrink-0 transition-transform group-hover:rotate-180 text-slate-500" />
                </button>
                <div className="absolute top-full left-0 pt-2 w-[min(320px,calc(100vw-2rem))] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden">
                    <div className="max-h-[min(400px,60vh)] overflow-y-auto py-2">
                      <button
                        type="button"
                        onClick={() => setActiveFilter('all')}
                        className={`flex gap-3 px-3 py-2.5 text-sm transition-colors w-full text-left border-b border-slate-100 ${
                          activeFilter === 'all'
                            ? 'bg-slate-100 text-[#2563eb]'
                            : 'text-[#1e3a5f] hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                          <BookOpen className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0 font-medium">All programs</div>
                      </button>
                      {programsGroupedByCategory.map((group) => (
                        <div key={group.categoryId} className="border-b border-slate-100 last:border-b-0">
                          <div className="px-3 py-2 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 sticky top-0">
                            {group.categoryDisplayName}
                          </div>
                          {group.programs.map((program) => (
                            <button
                              key={program.id}
                              type="button"
                              onClick={() => setActiveFilter(program.id)}
                              className={`flex gap-3 px-3 py-2 pl-5 text-sm transition-colors w-full text-left border-b border-slate-50 last:border-b-0 ${
                                activeFilter === program.id
                                  ? 'bg-slate-100 text-[#2563eb]'
                                  : 'text-[#1e3a5f] hover:bg-slate-100'
                              }`}
                            >
                              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                                <BookOpen className="h-3.5 w-3.5" />
                              </div>
                              <div className="flex-1 min-w-0 font-medium">
                                {program.display_name || program.name}
                              </div>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            {/* Age Range Selector - same style as All Programs dropdown */}
            <div className="relative group w-full sm:flex-1 sm:min-w-0">
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors w-full min-w-0"
              >
                <span className="flex-1 min-w-0 truncate text-left">
                  {ageRangeOptions.find((o) => o.value === selectedAgeRange)?.label ?? 'All Ages'}
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
                        className={`flex gap-3 px-3 py-2.5 text-sm transition-colors w-full text-left border-b border-slate-100 last:border-b-0 ${
                          selectedAgeRange === opt.value
                            ? 'bg-slate-100 text-[#2563eb]'
                            : 'text-[#1e3a5f] hover:bg-slate-100'
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

        {/* Results - Hierarchical Display */}
        <section className="py-16 px-4">
          <div className="max-w-7xl mx-auto">
            {hierarchicalData.length > 0 && (
              <p className="text-slate-500 text-sm text-center mb-10 max-w-2xl mx-auto">
                Classes are grouped by location and learning category. Each card is a specific class (date, time, campus). Tap a card for full details and to enroll.
              </p>
            )}
            {hierarchicalData.length > 0 ? (
              <div className="space-y-12">
                {hierarchicalData
                  .filter((f) => f.id && typeof f.id === 'string' && f.id.trim() !== '')
                  .map((franchise) => (
                  <div key={franchise.id} className="space-y-8">
                    {/* Franchise Header */}
                    <div className="flex items-center gap-4">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
                      <h2 className="text-3xl md:text-4xl font-black text-slate-900">{franchise.name}</h2>
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
                    </div>

                    {/* Categories */}
                    {franchise.categories.map((category) => (
                      <div key={category.id} className="space-y-6">
                        {/* Category Header */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="bg-[#2563eb] text-white px-4 py-1.5 rounded-full text-sm font-black uppercase tracking-wider">
                            {category.display_name}
                          </span>
                          <span className="text-slate-500 text-sm font-medium">
                            {category.programs.length} session{category.programs.length !== 1 ? 's' : ''}
                          </span>
                          <span className="text-slate-400 text-xs hidden sm:inline">
                            — classes you can enroll in below
                          </span>
                        </div>

                        {/* Instances Grid - 显示每个 program 的所有 instances */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                          {category.programs.flatMap((program) => 
                            program.instances
                              .filter((inst) => inst.id && typeof inst.id === 'string' && inst.id.trim() !== '')
                              .map((instance) => {
                                // 格式化年龄组
                                const ageGroup = instance.course.age_min && instance.course.age_max
                                  ? `Ages ${instance.course.age_min}-${instance.course.age_max}`
                                  : instance.course.age_min
                                  ? `Ages ${instance.course.age_min}+`
                                  : instance.course.age_max
                                  ? `Up to Age ${instance.course.age_max}`
                                  : instance.course.grade_level
                                  ? `Grade ${instance.course.grade_level}`
                                  : 'All Ages'

                                // 格式化日期
                                const dates = instance.start_date && instance.end_date
                                  ? `${new Date(instance.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(instance.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                                  : instance.start_date
                                  ? `Starts ${new Date(instance.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                                  : 'TBD'

                                // 获取价格
                                const basePrice = instance.price_override ?? instance.course.base_price ?? 0

                                // 获取图片 - 优先使用 offering 的 poster，然后是 course 的 poster
                                const image = instance.offering?.poster_url || instance.course.poster_url || `https://picsum.photos/400/300?random=${instance.id}`

                                // 获取位置
                                const locationName = instance.location?.name || franchise.name || 'Multiple Locations'
                                const categorySlug = (program.category?.name || '').replace(/_/g, '-')
                                const instanceDetailHref = categorySlug
                                  ? `/category/${categorySlug}/instance/${instance.id}`
                                  : `/category/explore/instance/${instance.id}`
                                const amiliaEnrollUrl = 'https://app.amilia.com/store/en/blazeroboticsacademy/shop/programs'

                                return (
                                  <div
                                    key={instance.id}
                                    className="group bg-white rounded-[32px] overflow-hidden border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col h-full"
                                  >
                                    <Link href={instanceDetailHref} className="flex flex-col flex-grow">
                                      <div className="h-64 relative overflow-hidden">
                                        <Image
                                          src={image}
                                          alt={instance.course.name || program.display_name || program.name}
                                          fill
                                          className="object-cover group-hover:scale-110 transition-transform duration-700"
                                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-80"></div>

                                        <div className="absolute top-4 left-4 flex flex-col gap-2">
                                          <span className="bg-white/90 backdrop-blur-md text-slate-900 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                                            {ageGroup}
                                          </span>
                                        </div>

                                        <div className="absolute bottom-4 left-4 right-4">
                                          <p className="text-white text-sm font-bold flex items-center">
                                            <MapPin className="w-3.5 h-3.5 mr-1 text-blue-400" />
                                            {locationName}
                                          </p>
                                          {instance.available_spots !== undefined && (
                                            <p className="text-white/90 text-xs mt-1">
                                              {instance.is_full ? 'Full' : `${instance.available_spots} spots available`}
                                            </p>
                                          )}
                                        </div>
                                      </div>

                                      <div className="p-8 flex flex-col flex-grow">
                                        <div className="flex justify-between items-start mb-3">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap mb-2">
                                              <h3 className="text-2xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
                                                {instance.course.name || program.name}
                                              </h3>
                                              {program.display_name && instance.course.name !== program.display_name && (
                                                <Badge variant="secondary" className="text-xs font-semibold">
                                                  {program.display_name}
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        <p className="text-slate-500 text-sm mb-6 line-clamp-3 leading-relaxed">
                                          {instance.course.description || ''}
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
                                          href={instanceDetailHref}
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
                  <Search className="w-10 h-10 text-slate-300" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">No Matching Classes</h2>
                <p className="text-slate-500 max-w-md mx-auto mb-4">
                  We couldn&apos;t find any classes matching your filters {activeLocName ? `at ${activeLocName}` : ''}. Try another location, category, or age—or clear filters to see everything we offer.
                </p>
                <p className="text-slate-400 text-sm max-w-sm mx-auto mb-8">
                  Programs are sessions (e.g. Spring 2026) under each learning category; the classes listed here are the bookable options. If you have a campus in mind, select it in the navbar and browse again.
                </p>
                <button 
                  onClick={() => { 
                    setActiveFilter('all'); 
                    setSelectedAgeRange('all'); 
                    setSearchQuery(''); 
                    setSelectedCategory('all');
                    if (locationSlug) {
                    handleLocationChange('all'); 
                    }
                  }}
                  className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold hover:bg-blue-700 transition-all"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        </section>

        {/* AI Assessment Promo */}
        <section className="max-w-7xl mx-auto px-4">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[40px] p-12 text-white relative overflow-hidden shadow-2xl">
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
              <div className="text-center lg:text-left">
                <h2 className="text-4xl font-black mb-4">Unsure about your child's level?</h2>
                <p className="text-blue-100 text-lg max-w-xl">
                  Chat with our AI assistant to get personalized recommendations. Our AI will evaluate your student's experience and suggest the perfect program path based on their age, grade, and interests.
                </p>
              </div>
              <button 
                onClick={() => setIsAIDialogOpen(true)}
                className="bg-white text-blue-600 px-12 py-5 rounded-full font-black text-xl hover:scale-105 transition-all shadow-xl whitespace-nowrap"
              >
                Get AI Assessment
              </button>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 blur-3xl"></div>
          </div>
        </section>
      </div>
      <Footer />
      
      {/* AI Assessment Dialog */}
      <AIAssessmentDialog
        franchiseCode={locationSlug || 'general'}
        franchiseName={activeLocName || 'Blaze Robotics Academy'}
        isOpen={isAIDialogOpen}
        onOpenChange={setIsAIDialogOpen}
      />
    </>
  )
}

export default function ProgramsPage() {
  return (
    <Suspense fallback={
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
        <Footer />
      </>
    }>
      <ProgramsPageContent />
    </Suspense>
  )
}
