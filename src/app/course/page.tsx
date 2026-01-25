'use client'

import { useState, useEffect, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { Calendar, MapPin, Loader2, ArrowRight, Home, BookOpen, GraduationCap, Award } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface Instance {
  id: string
  start_date: string
  end_date: string
  location?: {
    name: string
  }
  offering?: {
    id: string
    name: string
    poster_url?: string | null
    base_price?: number
  }
  price_override?: number
}

interface Program {
  id: string
  name: string
  display_name: string
  category?: {
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

export default function CoursePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const locationSlug = searchParams.get('location')
  
  const [franchises, setFranchises] = useState<Franchise[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 获取当前 location 的名称
  const activeLocName = useMemo(() => {
    if (locationSlug) {
      const franchise = franchises.find(f => f.code === locationSlug)
      return franchise?.name || null
    }
    return null
  }, [locationSlug, franchises])

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // 获取所有 instances，然后过滤出 courses（非 camps）
        const response = await fetch('/api/public/instances')
        if (!response.ok) {
          throw new Error("Failed to load courses")
        }
        const data = await response.json()
        
        // 过滤出 courses（排除 camps）
        const franchisesData = (data.franchises || []).map((franchise: Franchise) => ({
          ...franchise,
          programs: franchise.programs
            .map((program: Program) => ({
              ...program,
              instances: program.instances.filter((instance: Instance) => {
                // 排除 camps：category name 不包含 "camp"
                const categoryName = program.category?.name?.toLowerCase() || ''
                return !categoryName.includes('camp')
              })
            }))
            .filter((program: Program) => program.instances.length > 0)
        })).filter((franchise: Franchise) => franchise.programs.length > 0)

        // 如果指定了 location，只保留该 location
        if (locationSlug) {
          const filtered = franchisesData.filter((f: Franchise) => f.code === locationSlug)
          setFranchises(filtered)
        } else {
          setFranchises(franchisesData)
        }
      } catch (err: any) {
        console.error("Error fetching courses:", err)
        setError(err.message || "Failed to load courses")
        setFranchises([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchCourses()
  }, [locationSlug])

  // 静态的 Course Pathways 数据
  const pathwayCategories = [
    { name: 'RoboQuests', age: 'Grades K-2', color: 'bg-cyan-600', desc: 'Laying the foundations of logic and building.' },
    { name: 'LaunchPad', age: 'Grades 3-5', color: 'bg-blue-600', desc: 'Stepping into complex mechanics and coding.' },
    { name: 'RoboChamps', age: 'Grades 6-8', color: 'bg-indigo-600', desc: 'Professional tools and competitive mastery.' }
  ]

  // 按 category 分组（用于显示实际的 programs）
  const categories = useMemo(() => {
    const categoryMap = new Map<string, { name: string; display_name: string; programs: Program[] }>()
    
    franchises.forEach((franchise) => {
      franchise.programs.forEach((program) => {
        if (program.category) {
          const catId = program.category.id
          if (!categoryMap.has(catId)) {
            categoryMap.set(catId, {
              name: program.category.name,
              display_name: program.category.display_name,
              programs: []
            })
          }
          categoryMap.get(catId)!.programs.push(program)
        }
      })
    })

    return Array.from(categoryMap.values())
  }, [franchises])

  const filteredPrograms = useMemo(() => {
    const allPrograms: Program[] = []
    franchises.forEach((franchise) => {
      allPrograms.push(...franchise.programs)
    })
    return allPrograms
  }, [franchises])

  return (
    <>
      <Navbar />
      <div className="pb-24 pt-14">
        {/* Hero */}
        <section className="bg-[#0f172a] py-24 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-[#38bdf8]/5 -skew-x-12 translate-x-20"></div>
          <div className="max-w-7xl mx-auto px-4 relative z-10 flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-3/5 text-white">
              <h1 className="text-5xl md:text-6xl font-black mb-6 leading-none">
                Blaze Robotics Courses
              </h1>
              <p className="text-lg md:text-xl text-gray-300 mb-2">
                Year-Round Learning | Structured Pathways | Skill Development
              </p>
              <p className="text-base text-gray-400 max-w-xl leading-relaxed mb-8">
                Empowering students through STEM mastery {activeLocName ? `in ${activeLocName}` : 'across our all locations'}. Build foundational skills, advance through structured pathways, and prepare for competitive robotics.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button 
                  size="lg"
                  className="bg-[#2563eb] hover:bg-blue-600 text-white px-8 py-6 text-lg font-bold rounded-full"
                  asChild
                >
                  <Link href="#main-content">
                    View All Courses
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
                <Button 
                  variant="default"
                  size="icon"
                  className="h-12 w-12 rounded-full"
                  asChild
                  title="Back to Home"
                >
                  <Link href="/#journey">
                    <Home className="w-5 h-5" />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="md:w-2/5 grid grid-cols-2 gap-4">
              <div className="bg-[#38bdf8]/10 backdrop-blur p-6 rounded-3xl border border-white/10">
                <BookOpen className="text-[#38bdf8] w-10 h-10 mb-4" />
                <h3 className="text-white font-bold text-lg">{filteredPrograms.length}+ Courses</h3>
                <p className="text-gray-400 text-xs">Comprehensive curriculum</p>
              </div>
              <div className="bg-[#38bdf8]/10 backdrop-blur p-6 rounded-3xl border border-white/10 mt-8">
                <GraduationCap className="text-[#38bdf8] w-10 h-10 mb-4" />
                <h3 className="text-white font-bold text-lg">3 Pathways</h3>
                <p className="text-gray-400 text-xs">K-2, 3-5, 6-8</p>
              </div>
              <div className="bg-[#38bdf8]/10 backdrop-blur p-6 rounded-3xl border border-white/10">
                <Award className="text-[#38bdf8] w-10 h-10 mb-4" />
                <h3 className="text-white font-bold text-lg">Certified</h3>
                <p className="text-gray-400 text-xs">Industry recognized</p>
              </div>
              <div className="bg-[#38bdf8]/10 backdrop-blur p-6 rounded-3xl border border-white/10 mt-8">
                <Calendar className="text-[#38bdf8] w-10 h-10 mb-4" />
                <h3 className="text-white font-bold text-lg">Year-Round</h3>
                <p className="text-gray-400 text-xs">Continuous learning</p>
              </div>
            </div>
          </div>
        </section>

        {/* Course Pathways Map */}
        <section id="main-content" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-slate-50 rounded-[40px] p-8 md:p-16 border border-slate-200">
              <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">Your Robotics Pathway</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                {pathwayCategories.map((cat, idx) => (
                  <div key={cat.name} className="relative z-10 text-center">
                    <div className={`${cat.color} w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-slate-300`}>
                      {idx + 1}
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">{cat.name}</h3>
                    <span className="text-sm font-bold uppercase tracking-wider text-blue-600">{cat.age}</span>
                    <p className="mt-4 text-slate-500">{cat.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Program Grid */}
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : error ? (
              <div className="text-center py-20 text-red-600">
                <p>{error}</p>
              </div>
            ) : (
              <>
                {categories.map((cat) => {
                  if (cat.programs.length === 0) return null

                  return (
                    <div key={cat.name} className="mb-20 last:mb-0">
                      <div className="flex items-center space-x-4 mb-10">
                        <h2 className="text-4xl font-extrabold text-slate-900">{cat.display_name}</h2>
                        <div className="h-px bg-slate-200 grow"></div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {cat.programs.flatMap((program) =>
                          program.instances.map((instance) => {
                            const posterUrl = instance.offering?.poster_url || `https://picsum.photos/400/300?random=${instance.id}`
                            const basePrice = instance.price_override ?? instance.offering?.base_price ?? 0
                            const dates = instance.start_date && instance.end_date
                              ? `${new Date(instance.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(instance.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                              : 'TBD'
                            const locationName = instance.location?.name || 'Multiple Locations'

                            return (
                              <div
                                key={instance.id}
                                onClick={() => router.push(`/course-catalog?instance=${instance.id}`)}
                                className="bg-white rounded-3xl overflow-hidden shadow-lg border border-slate-100 hover:shadow-2xl hover:-translate-y-1 transition-all flex flex-col group cursor-pointer h-full"
                              >
                                <div className="h-64 relative overflow-hidden">
                                  <Image
                                    src={posterUrl}
                                    alt={instance.offering?.name || program.display_name}
                                    fill
                                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60"></div>
                                  
                                  <div className="absolute top-4 left-4 flex flex-col gap-2 items-start">
                                    <span className="bg-[#2563eb] text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm uppercase tracking-wide">
                                      {cat.display_name}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="p-8 flex-grow flex flex-col">
                                  <h3 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-blue-700 transition-colors">
                                    {instance.offering?.name || program.display_name}
                                  </h3>
                                  <p className="text-slate-500 text-sm mb-6 flex-grow">{program.display_name}</p>
                                  
                                  <div className="space-y-3 mb-8 text-sm text-slate-600">
                                    <div className="flex items-center">
                                      <Calendar className="w-4 h-4 mr-3 text-blue-500 shrink-0" />
                                      <span className="font-medium">{dates}</span>
                                    </div>
                                    <div className="flex items-center">
                                      <MapPin className="w-4 h-4 mr-3 text-blue-500 shrink-0" />
                                      <span className="font-medium truncate">{locationName}</span>
                                    </div>
                                  </div>

                                  <div className="mt-auto flex items-center justify-between border-t border-slate-50 pt-6">
                                    <div>
                                      <span className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Tuition</span>
                                      <p className="text-2xl font-black text-slate-900">${basePrice.toFixed(2)}</p>
                                    </div>
                                    <button className="bg-[#0f172a] text-white px-6 py-2 rounded-xl font-bold text-sm group-hover:bg-[#2563eb] transition-all">
                                      Enroll Now
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )
                })}
                
                {filteredPrograms.length === 0 && (
                  <div className="text-center py-24">
                    <MapPin className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">No Courses Scheduled</h2>
                    <p className="text-slate-500">There are currently no regular courses scheduled {activeLocName ? `for the ${activeLocName} location` : 'at any of our locations'}. Try checking another location!</p>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
      <Footer />
    </>
  )
}
