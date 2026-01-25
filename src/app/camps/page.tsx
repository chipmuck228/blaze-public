'use client'

import { useState, useEffect, useMemo, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { Calendar, MapPin, Loader2, ArrowRight, Home, Clock, UtensilsCrossed, Building2 } from "lucide-react"
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

function CampsPageContent() {
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
    const fetchCamps = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // 获取所有 instances，然后过滤出 camps
        const response = await fetch('/api/public/instances')
        if (!response.ok) {
          throw new Error("Failed to load camps")
        }
        const data = await response.json()
        
        // 过滤出 camps（根据 offering_type 或 category）
        const franchisesData = (data.franchises || []).map((franchise: Franchise) => ({
          ...franchise,
          programs: franchise.programs
            .map((program: Program) => ({
              ...program,
              instances: program.instances.filter((instance: Instance) => {
                // 过滤 camps：category name 包含 "camp" 或 offering_type 是 "camp"
                const categoryName = program.category?.name?.toLowerCase() || ''
                return categoryName.includes('camp')
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
        console.error("Error fetching camps:", err)
        setError(err.message || "Failed to load camps")
        setFranchises([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchCamps()
  }, [locationSlug])

  // 组织 camps 数据
  const sections = useMemo(() => {
    const allInstances: Instance[] = []
    franchises.forEach((franchise) => {
      franchise.programs.forEach((program) => {
        allInstances.push(...program.instances)
      })
    })

    // 按日期分组
    const summerCamps = allInstances.filter((inst) => {
      const startDate = new Date(inst.start_date)
      const month = startDate.getMonth()
      return month >= 5 && month <= 7 // June, July, August
    })

    const midWinterSpringCamps = allInstances.filter((inst) => {
      const startDate = new Date(inst.start_date)
      const month = startDate.getMonth()
      return month === 0 || month === 1 || month === 2 || month === 3 // Jan, Feb, Mar, Apr
    })

    return [
      { 
        title: 'Summer 2026', 
        subtitle: 'Robotics, Math, Programming, 3D Design & Printing', 
        instances: summerCamps 
      },
      { 
        title: 'Mid-Winter & Spring Break', 
        subtitle: 'Intensive week-long skill builders', 
        instances: midWinterSpringCamps 
      }
    ]
  }, [franchises])

  const filteredCamps = useMemo(() => {
    const allInstances: Instance[] = []
    franchises.forEach((franchise) => {
      franchise.programs.forEach((program) => {
        program.instances.forEach((inst) => {
          allInstances.push({
            ...inst,
            program: program.display_name || program.name,
            category: program.category?.display_name || program.category?.name || '',
          } as any)
        })
      })
    })
    return allInstances
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
                Blaze Robotics Camps
              </h1>
              <p className="text-lg md:text-xl text-gray-300 mb-2">
                Breakthrough innovations {activeLocName ? `at our ${activeLocName} location` : 'across our franchise network'}.
              </p>
              <p className="text-base text-gray-400 max-w-xl leading-relaxed mb-8">
                Summer camps, mid-winter breaks, and spring intensives. Build robots, code solutions, and compete with peers in week-long immersive experiences.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button 
                  size="lg"
                  className="bg-[#2563eb] hover:bg-blue-600 text-white px-8 py-6 text-lg font-bold rounded-full"
                  asChild
                >
                  <Link href="#main-content">
                    View All Camps
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
            <div className="md:w-2/5 grid grid-cols-1 gap-4">
              <div className="bg-[#38bdf8]/10 backdrop-blur p-6 rounded-3xl border border-white/10">
                <Clock className="text-[#38bdf8] w-10 h-10 mb-4" />
                <h3 className="text-white font-bold text-lg mb-1">Extended Care</h3>
                <p className="text-gray-400 text-xs">8:30 AM – 9:00 AM or 4:00 PM – 5:00 PM</p>
              </div>
              <div className="bg-[#38bdf8]/10 backdrop-blur p-6 rounded-3xl border border-white/10">
                <UtensilsCrossed className="text-[#38bdf8] w-10 h-10 mb-4" />
                <h3 className="text-white font-bold text-lg mb-1">Camp Lunch</h3>
                <p className="text-gray-400 text-xs">Pizza & Drink option available daily</p>
              </div>
              <div className="bg-[#38bdf8]/10 backdrop-blur p-6 rounded-3xl border border-white/10">
                <Building2 className="text-[#38bdf8] w-10 h-10 mb-4" />
                <h3 className="text-white font-bold text-lg mb-1">{activeLocName || 'All'} Locations</h3>
                <p className="text-gray-400 text-xs">Certified Instructors & 1:1 Kits</p>
              </div>
            </div>
          </div>
        </section>

        {/* Main Camp Content */}
        <div id="main-content" className="max-w-7xl mx-auto px-4 mt-20">
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
              {sections.map((section) => {
                if (section.instances.length === 0) return null

                return (
                  <div key={section.title} className="mb-24">
                    <div className="mb-12">
                      <h2 className="text-4xl font-bold text-slate-900 mb-2">{section.title}</h2>
                      <p className="text-slate-500 text-lg">{section.subtitle}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {section.instances.map((instance: any) => {
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
                            className="bg-white rounded-3xl overflow-hidden shadow-lg border border-slate-100 flex flex-col hover:shadow-2xl hover:-translate-y-1 transition-all group cursor-pointer h-full"
                          >
                            <div className="h-64 relative overflow-hidden">
                              <Image
                                src={posterUrl}
                                alt={instance.offering?.name || instance.program}
                                fill
                                className="object-cover group-hover:scale-110 transition-transform duration-700"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60"></div>
                              
                              <div className="absolute top-4 left-4 flex flex-col gap-2 items-start">
                                <span className="bg-[#2563eb] text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm uppercase tracking-wide">
                                  {instance.category || 'Camp'}
                                </span>
                              </div>
                            </div>
                            
                            <div className="p-8 flex flex-col flex-grow">
                              <h3 className="text-2xl font-bold text-slate-900 mb-3 leading-tight group-hover:text-blue-700 transition-colors">
                                {instance.offering?.name || instance.program}
                              </h3>
                              
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

                              <div className="pt-6 border-t border-slate-100 flex items-center justify-between mt-auto">
                                <div>
                                  <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Tuition</p>
                                  <p className="text-2xl font-black text-slate-900">${basePrice.toFixed(2)}</p>
                                </div>
                                <button className="bg-[#0f172a] text-white px-6 py-2 rounded-xl font-bold text-sm group-hover:bg-[#2563eb] transition-colors">
                                  Book Now
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {filteredCamps.length === 0 && (
                <div className="text-center py-24 mb-24">
                  <Calendar className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">No Seasonal Camps Available</h2>
                  <p className="text-slate-500">There are currently no camps scheduled. Stay tuned for updates!</p>
                </div>
              )}

              {/* Single-Day Explorer Camps */}
              <section className="bg-slate-100 p-12 rounded-[40px] mt-20">
                <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">Single-Day "Explorer" Camps</h2>
                    <p className="text-slate-600">Perfect for busy schedules and trial experiences.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['Dec 22', 'Dec 23', 'Dec 26', 'Jan 19', 'Jan 26'].map(date => (
                      <span key={date} className="bg-white px-4 py-2 rounded-xl text-sm font-bold text-slate-900 shadow-sm border border-slate-200">{date}</span>
                    ))}
                  </div>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-slate-200">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex-grow">
                      <h3 className="text-xl font-bold text-slate-900 mb-2">The One-Day Robotics Immersion</h3>
                      <p className="text-slate-500 text-sm">A full day of building, testing, and competing at one of our locations. Includes foundational coding and hands-on hardware assembly.</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-3xl font-black text-slate-900 mb-2">$145</p>
                      <button className="bg-[#2563eb] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#0f172a] transition-colors">Register for Day</button>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}

export default function CampsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    }>
      <CampsPageContent />
    </Suspense>
  )
}
