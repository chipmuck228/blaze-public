'use client'

import { useState, useEffect } from "react"
import { Button } from "./ui/button"
import { ArrowRight, Loader2, BookOpen, GraduationCap, Sparkles, Trophy } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface Category {
  id: string
  name: string
  display_name: string
  description?: string | null
  is_active: boolean
  poster_url?: string | null
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

export const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch('/api/public/categories')
        if (!response.ok) {
          throw new Error('Failed to fetch categories')
        }
        const data = await response.json()
        setCategories(data.categories || [])
      } catch (err) {
        console.error('Error fetching categories:', err)
        setError(err instanceof Error ? err.message : 'Failed to load categories')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCategories()
  }, [])

  if (isLoading) {
    return (
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-16 md:py-24">
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-16 md:py-24">
        <div className="text-center py-12">
          <p className="text-destructive">{error}</p>
        </div>
      </section>
    )
  }

  if (categories.length === 0) {
    return null
  }

  return (
    <section className="bg-[#0f172a] text-white pt-16 pb-8">
      <div className="text-center mb-12 md:mb-16">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
          Our Programs
        </h2>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Explore our diverse range of educational programs designed to inspire and empower learners
        </p>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl flex flex-wrap justify-center gap-6 md:gap-8">
        {categories.map((category, index) => {
          const gradient = getCategoryGradient(category.name)
          const icon = getCategoryIcon(category.name)
          
          return (
            <div
              key={category.id}
              onClick={() => window.location.href = `/programs?category=${category.id}`}
              className="w-full md:w-[calc(50%-1rem)] lg:w-[calc(25%-1.5rem)] max-w-sm bg-white rounded-3xl overflow-hidden shadow-xl cursor-pointer group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 h-full flex flex-col"
            >
              {/* Image/Gradient Header */}
              <div className="h-48 relative overflow-hidden shrink-0">
                {category.poster_url ? (
                  <>
                    <Image
                      src={category.poster_url}
                      alt={category.display_name}
                      fill
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      priority={index < 2}
                      sizes="(max-width: 768px) 100%, (max-width: 1024px) 50%, 25%"
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
                </div>
              </div>
              
              {/* Content */}
              <div className="p-6 flex flex-col flex-grow">
                <h4 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">
                  {category.display_name}
                </h4>
                {category.description && (
                  <p className="text-slate-500 text-sm mb-4 line-clamp-2">{category.description}</p>
                )}
                {!category.description && (
                  <p className="text-slate-500 text-sm mb-4 line-clamp-2">
                    Explore our {category.display_name.toLowerCase()} programs designed for all skill levels.
                  </p>
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

      {/* Call to Action */}
      <div className="mt-12 md:mt-16 text-center">
        <Button asChild variant={"default"}>
          <Link href="/programs">
            View All Programs
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
      </div>
    </section>
  )
}

