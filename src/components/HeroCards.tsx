'use client'
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ArrowRight, Loader2, BookOpen, GraduationCap, Sparkles, Trophy, ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface FeaturedCategory {
  id: string
  name: string
  display_name: string
  description?: string | null
  poster_url?: string | null
  featured_slogan?: string | null
  featured_subtitle?: string | null
  featured_display_order: number
}

const categoryIcons: Record<string, React.ReactNode> = {
  courses: <BookOpen className="h-8 w-8 stroke-1" />,
  camps: <GraduationCap className="h-8 w-8 stroke-1" />,
  workshops: <Sparkles className="h-8 w-8 stroke-1" />,
  competition: <Trophy className="h-8 w-8 stroke-1" />,
}

const getCategoryIcon = (categoryName: string) => {
  const normalizedName = categoryName.toLowerCase()
  if (normalizedName.includes('course')) {
    return categoryIcons.courses
  } else if (normalizedName.includes('camp')) {
    return categoryIcons.camps
  } else if (normalizedName.includes('workshop')) {
    return categoryIcons.workshops
  } else if (normalizedName.includes('competition')) {
    return categoryIcons.competition
  }
  return categoryIcons.courses // default
}

const getCategoryGradient = (categoryName: string) => {
  const normalizedName = categoryName.toLowerCase()
  if (normalizedName.includes('course')) {
    return { from: '#3B82F6', to: '#1E40AF' }
  } else if (normalizedName.includes('camp')) {
    return { from: '#10B981', to: '#047857' }
  } else if (normalizedName.includes('workshop')) {
    return { from: '#8B5CF6', to: '#6D28D9' }
  } else if (normalizedName.includes('competition')) {
    return { from: '#F59E0B', to: '#D97706' }
  }
  return { from: '#6B7280', to: '#4B5563' } // default
}

export const HeroCards = () => {
  const [featuredCategories, setFeaturedCategories] = useState<FeaturedCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchFeaturedCategories = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch('/api/public/featured-categories')
        
        if (!response.ok) {
          throw new Error('Failed to fetch featured categories')
        }

        const data = await response.json()
        setFeaturedCategories(data.categories || [])
      } catch (err) {
        console.error('Error fetching featured categories:', err)
        setError(err instanceof Error ? err.message : 'Failed to load featured categories')
      } finally {
        setIsLoading(false)
      }
    }

    fetchFeaturedCategories()
  }, [])

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    
    const scrollAmount = 320 // 卡片宽度 + gap
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

  // 如果没有 featured categories，返回 null（或显示默认内容）
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12 w-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    console.error('HeroCards error:', error)
    return null // 静默失败，不显示错误
  }

  if (featuredCategories.length === 0) {
    return null // 没有 featured categories 时隐藏组件
  }

  return (
    <div className="relative z-10 w-full lg:w-1/2 flex flex-col justify-center bg-slate-900/30 backdrop-blur-sm border-l border-white/5">
      <div className="p-8 lg:p-12 w-full">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h3 className="text-white text-2xl font-bold">Featured Categories</h3>
            <p className="text-slate-400 text-sm">Swipe to explore active courses & camps</p>
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
        <div 
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory scrollbar-hide -mr-4 lg:-mr-0 pr-4 lg:pr-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {featuredCategories.map((category, index) => {
            const gradient = getCategoryGradient(category.name)
            const icon = getCategoryIcon(category.name)
            
            return (
              <div 
                key={category.id}
                onClick={() => window.location.href = `/programs?category=${category.id}`}
                className="min-w-[300px] w-[300px] md:min-w-[340px] md:w-[340px] snap-start bg-white rounded-3xl overflow-hidden shadow-xl cursor-pointer group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 h-full flex flex-col"
              >
                <div className="h-48 relative overflow-hidden shrink-0">
                  {category.poster_url ? (
                    <>
                      <Image
                        src={category.poster_url}
                        alt={category.display_name}
                        fill
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        priority={index < 2}
                        sizes="(max-width: 768px) 300px, 340px"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
                    </>
                  ) : (
                    <div 
                      className="w-full h-full flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`
                      }}
                    >
                      <div className="w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg bg-white/20 backdrop-blur-sm">
                        {icon}
                      </div>
                    </div>
                  )}
                  
                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex flex-col gap-2 items-start">
                    <span 
                      className="bg-[#2563eb] text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm uppercase tracking-wide"
                      style={{
                        background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`
                      }}
                    >
                      {category.name}
                    </span>
                    {category.featured_subtitle && (
                      <span className="bg-white/90 backdrop-blur text-slate-900 px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-white/20">
                        {category.featured_subtitle}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="p-6 flex flex-col flex-grow">
                  <h4 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {category.display_name}
                  </h4>
                  {category.description && (
                    <p className="text-slate-500 text-sm mb-4 line-clamp-2">{category.description}</p>
                  )}
                  {category.featured_slogan && (
                    <p className="text-slate-500 text-sm mb-4 line-clamp-2">{category.featured_slogan}</p>
                  )}
                  
                  <div className="mt-auto">
                    <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                      <span className="text-blue-600 font-bold text-sm flex items-center group-hover:translate-x-1 transition-transform">
                        Explore <ArrowRight className="w-4 h-4 ml-1" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
