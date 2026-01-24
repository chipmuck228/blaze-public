'use client'

import { useState, useEffect, useMemo, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { Loader2, MapPin, Calendar, Search, Filter, ArrowRight, Sparkles, BookOpen, Tent } from "lucide-react"
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
  const [selectedGrade, setSelectedGrade] = useState<string>("all")
  const [activeFilter, setActiveFilter] = useState<'all' | 'courses' | 'camps'>('all')
  const [locationSlug, setLocationSlug] = useState<string | null>(null)
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false)

  // 从 URL query parameter 获取 category
  const categoryFromUrl = searchParams.get("category")
  const locationFromUrl = searchParams.get("location")

  useEffect(() => {
    if (categoryFromUrl) {
      setSelectedCategory(categoryFromUrl)
    }
    if (locationFromUrl) {
      setLocationSlug(locationFromUrl)
      // 找到对应的 franchise
      const franchise = franchises.find(f => f.code === locationFromUrl)
      if (franchise) {
        setSelectedFranchise(franchise.id)
      }
    }
  }, [categoryFromUrl, locationFromUrl, franchises])

  useEffect(() => {
    fetchInstances()
  }, [selectedCategory])

  const fetchInstances = async () => {
    try {
      setIsLoading(true)
      setError(null)

      let url = "/api/public/instances"
      if (selectedCategory && selectedCategory !== "all") {
        url += `?category=${selectedCategory}`
      }

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
        const franchises = data.franchises || []
        setFranchises(franchises)
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

  // 获取所有唯一的 grade 列表
  const allGrades = useMemo(() => {
    const gradeSet = new Set<string>()
    franchises.forEach((franchise) => {
      franchise.programs.forEach((program) => {
        program.instances.forEach((instance) => {
          if (instance.course.grade_level && typeof instance.course.grade_level === 'string') {
            const grade = instance.course.grade_level.trim()
            if (grade !== '') {
              gradeSet.add(grade)
            }
          } else if (instance.course.target_grades && Array.isArray(instance.course.target_grades)) {
            instance.course.target_grades.forEach((grade: any) => {
              if (typeof grade === 'string' && grade.trim() !== '') {
                gradeSet.add(grade.trim())
              }
            })
          }
        })
      })
    })
    return Array.from(gradeSet).sort()
  }, [franchises])


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
          // Category 筛选
          if (selectedCategory !== "all" && program.category?.id !== selectedCategory) {
            return
          }

          // Type 筛选 (courses vs camps)
          if (activeFilter !== 'all') {
            const categoryName = program.category?.name?.toLowerCase() || ''
            if (activeFilter === 'courses' && !categoryName.includes('course')) {
              return
            }
            if (activeFilter === 'camps' && !categoryName.includes('camp')) {
              return
            }
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

            // Grade 过滤
            if (selectedGrade !== "all") {
              const instanceGrade = instance.course?.grade_level || 
                (instance.course?.target_grades && Array.isArray(instance.course.target_grades) 
                  ? instance.course.target_grades[0] 
                  : null)
              if (instanceGrade !== selectedGrade) {
                return false
              }
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
  }, [franchises, selectedFranchise, selectedCategory, searchQuery, selectedGrade, activeFilter])

  const handleLocationChange = (value: string) => {
    if (value === 'all') {
      setSelectedFranchise('all')
      setLocationSlug(null)
      router.push('/programs')
    } else {
      const franchise = allFranchises.find(f => f.code === value)
      if (franchise) {
        setSelectedFranchise(franchise.id)
        setLocationSlug(value)
        router.push(`/programs?location=${value}`)
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
            <span className="inline-flex items-center space-x-2 bg-blue-500/10 text-blue-400 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-6 border border-blue-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Academic Catalog 2026</span>
            </span>
            <h1 className="text-4xl md:text-6xl font-black text-white mb-6">
              Programs {activeLocName ? `in ${activeLocName}` : 'Across Blaze'}
            </h1>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Discover our full range of engineering pathways, from foundational logic to world-class competitive robotics.
            </p>
          </div>
        </section>

        {/* Filter & Search Bar */}
        <div className="max-w-7xl mx-auto px-4 -mt-10 relative z-20">
          <div className="bg-white rounded-[32px] shadow-xl border border-slate-200 p-6 flex flex-col xl:flex-row gap-4 items-center">
            
            {/* Search */}
            <div className="relative w-full xl:w-1/4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text"
                placeholder="Search programs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div className="flex flex-col md:flex-row gap-4 w-full xl:w-3/4">
              {/* Type Filters */}
              <div className="flex bg-slate-100 p-1.5 rounded-2xl overflow-x-auto grow">
                {[
                  { id: 'all', label: 'All Types', icon: <Filter className="w-4 h-4" /> },
                  { id: 'courses', label: 'Courses', icon: <BookOpen className="w-4 h-4" /> },
                  { id: 'camps', label: 'Camps', icon: <Tent className="w-4 h-4" /> },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveFilter(tab.id as any)}
                    className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex-1 justify-center ${
                      activeFilter === tab.id 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Location Selector */}
              <div className="relative md:w-56 shrink-0">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 pointer-events-none" />
                <select 
                  value={locationSlug || 'all'}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer appearance-none shadow-sm"
                >
                  <option value="all">All Locations</option>
                  {allFranchises
                    .filter((f) => f.id && typeof f.id === 'string' && f.id.trim() !== '')
                    .map((franchise) => (
                    <option key={franchise.id} value={franchise.code}>{franchise.name}</option>
                  ))}
                </select>
              </div>

              {/* Grade Level Selector */}
              <div className="md:w-48 shrink-0">
                <select 
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer appearance-none shadow-sm"
                >
                  <option value="all">All Grades</option>
                  {allGrades
                    .filter((g) => g && typeof g === 'string' && g.trim() !== '')
                    .map((grade) => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Results - Hierarchical Display */}
        <section className="py-16 px-4">
          <div className="max-w-7xl mx-auto">
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
                        <div className="flex items-center gap-3">
                          <span className="bg-[#2563eb] text-white px-4 py-1.5 rounded-full text-sm font-black uppercase tracking-wider">
                            {category.display_name}
                          </span>
                          <span className="text-slate-500 text-sm font-medium">
                            {category.programs.length} Program{category.programs.length !== 1 ? 's' : ''}
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

                                return (
                                  <div 
                                    key={instance.id} 
                                    onClick={() => {
                                      if (instance.course.slug) {
                                        const params = new URLSearchParams()
                                        params.set('instance', instance.id)
                                        params.set('franchise', franchise.code)
                                        navigate(`/course-catalog/${encodeURIComponent(instance.course.slug)}?${params.toString()}`)
                                      } else {
                                        const params = new URLSearchParams()
                                        params.set('instance', instance.id)
                                        params.set('franchise', franchise.code)
                                        navigate(`/course-catalog?${params.toString()}`)
                                      }
                                    }}
                                    className="group bg-white rounded-[32px] overflow-hidden border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer flex flex-col h-full"
                                  >
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

                                        <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                                          <div>
                                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Enrollment</p>
                                            <p className="text-2xl font-black text-slate-900">${basePrice.toFixed(2)}</p>
                                          </div>
                                          <button className="bg-[#0f172a] group-hover:bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold text-sm transition-all flex items-center">
                                            Details
                                            <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                                          </button>
                                        </div>
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
                <h2 className="text-3xl font-bold text-slate-900 mb-2">No Matching Programs</h2>
                <p className="text-slate-500 max-w-md mx-auto mb-8">
                  We couldn't find any programs matching your filters {activeLocName ? `at the ${activeLocName} campus` : ''}.
                </p>
                <button 
                  onClick={() => { 
                    setActiveFilter('all'); 
                    setSelectedGrade('all'); 
                    setSearchQuery(''); 
                    handleLocationChange('all'); 
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
