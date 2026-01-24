'use client'

import { useEffect, useState, useRef } from "react"
import { Loader2, ArrowRight, BookOpen, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface Category {
  id: string
  name: string
  display_name: string
  description?: string | null
  poster_url?: string | null
  is_active: boolean
}

interface LocationFeaturedCoursesProps {
  franchiseCode: string
  locationName: string
}

export function LocationFeaturedCourses({ franchiseCode, locationName }: LocationFeaturedCoursesProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchCategoriesWithInstances = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // 1. 获取 franchise v2 信息（确保使用 franchise v2 表）
        const franchiseResponse = await fetch(`/api/public/franchises-v2/${encodeURIComponent(franchiseCode)}`)
        if (!franchiseResponse.ok) {
          throw new Error("Failed to load franchise")
        }
        const franchiseV2 = await franchiseResponse.json()
        
        if (!franchiseV2 || !franchiseV2.id) {
          throw new Error("Franchise not found")
        }
        
        // 2. 使用 franchise code 查询 programs（/api/programs 内部使用 getFranchiseByCode，会优先查询 franchises_v2）
        // 该 API 返回的数据结构：programs 数组，每个 program 有 category 和 courses（包含 instances）
        const programsResponse = await fetch(`/api/programs?franchise=${encodeURIComponent(franchiseCode)}`)
        if (!programsResponse.ok) {
          throw new Error("Failed to load programs")
        }
        const programsData = await programsResponse.json()
        
        // 3. 提取所有有 instances 的 category IDs
        // programs 数据结构：每个 program 有 category 和 courses，每个 course 有 instances 数组
        const categoryIdsWithInstances = new Set<string>()
        if (Array.isArray(programsData)) {
          programsData.forEach((program: any) => {
            // 检查 program 是否有 courses，且 courses 中有 instances
            if (program.courses && Array.isArray(program.courses)) {
              const hasInstances = program.courses.some((course: any) => 
                course.instances && Array.isArray(course.instances) && course.instances.length > 0
              )
              if (hasInstances && program.category?.id) {
                categoryIdsWithInstances.add(program.category.id)
              }
            }
          })
        }
        
        console.log('[LocationFeaturedCourses] Category IDs with instances:', Array.from(categoryIdsWithInstances))
        
        // 4. 获取所有 categories
        const categoriesResponse = await fetch('/api/public/categories')
        if (!categoriesResponse.ok) {
          throw new Error("Failed to load categories")
        }
        const categoriesData = await categoriesResponse.json()
        
        // 5. 过滤只保留有 instances 的 categories
        const categoriesWithInstances = (categoriesData.categories || []).filter((category: Category) => 
          categoryIdsWithInstances.has(category.id)
        )
        
        console.log('[LocationFeaturedCourses] Filtered categories:', {
          franchiseCode,
          franchiseV2Id: franchiseV2.id,
          totalCategories: categoriesData.categories?.length || 0,
          categoriesWithInstances: categoriesWithInstances.length,
          categories: categoriesWithInstances
        })
        
        setCategories(categoriesWithInstances)
      } catch (err: any) {
        console.error("Error fetching categories with instances:", err)
        setError(err.message || "Failed to load categories")
      } finally {
        setIsLoading(false)
      }
    }

    fetchCategoriesWithInstances()
  }, [franchiseCode])

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    
    const scrollAmount = 320
    const currentScroll = scrollRef.current.scrollLeft
    
    if (direction === 'left') {
      scrollRef.current.scrollTo({
        left: currentScroll - scrollAmount,
        behavior: 'smooth'
      })
    } else {
      scrollRef.current.scrollTo({
        left: currentScroll + scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  return (
    <section className="bg-[#0f172a] dark:bg-slate-900 py-16 sm:py-20 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white dark:text-slate-100">
              Categories at {locationName}
            </h2>
            <p className="text-sm text-slate-300 dark:text-slate-400 mt-1">
              Explore our diverse range of robotics and coding categories available at this campus.
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => scroll('left')} 
              className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => scroll('right')} 
              className="p-3 rounded-full bg-[#2563eb] hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Container */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-400">
            <p className="text-sm">{error}</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <p className="text-sm">No categories available at this location</p>
          </div>
        ) : (
          <div 
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory scrollbar-hide -mr-4 lg:-mr-0 pr-4 lg:pr-0"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {categories.map((category) => {
              const posterUrl = category.poster_url || `https://picsum.photos/400/300?random=${category.id}`

              return (
                <Link
                  key={category.id}
                  href={`/course-catalog?franchise=${encodeURIComponent(franchiseCode)}&category=${encodeURIComponent(category.id)}`}
                  className="min-w-[300px] w-[300px] md:min-w-[340px] md:w-[340px] snap-start bg-white rounded-3xl overflow-hidden shadow-xl cursor-pointer group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 h-full flex flex-col"
                >
                  <div className="h-48 relative overflow-hidden shrink-0">
                    <Image
                      src={posterUrl}
                      alt={category.display_name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 300px, 340px"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="bg-[#2563eb] text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                        {category.name}
                      </span>
                    </div>
                  </div>
                  <div className="p-6 flex flex-col flex-grow">
                    <h4 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {category.display_name}
                    </h4>
                    <p className="text-slate-600 text-sm leading-relaxed flex-grow line-clamp-3 mb-4">
                      {category.description || `Explore ${category.display_name} with hands-on robotics and coding experiences.`}
                    </p>
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4" />
                          <span>View Courses</span>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-[#2563eb] group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
