'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { ArrowRight, Loader2, BookOpen, GraduationCap, Sparkles, Trophy } from "lucide-react"
import Link from "next/link"

interface Category {
  id: string
  name: string
  display_name: string
  description?: string | null
  is_active: boolean
}

const categoryIcons: Record<string, React.ReactNode> = {
  courses: <BookOpen className="h-8 w-8 stroke-1" />,
  camps: <GraduationCap className="h-8 w-8 stroke-1" />,
  workshops: <Sparkles className="h-8 w-8 stroke-1" />,
  competition: <Trophy className="h-8 w-8 stroke-1" />,
}

const categoryColors: Record<string, { bg: string; text: string; border: string; hover: string }> = {
  courses: {
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    hover: 'hover:bg-blue-100 dark:hover:bg-blue-950/40',
  },
  camps: {
    bg: 'bg-green-50 dark:bg-green-950/20',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
    hover: 'hover:bg-green-100 dark:hover:bg-green-950/40',
  },
  workshops: {
    bg: 'bg-purple-50 dark:bg-purple-950/20',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
    hover: 'hover:bg-purple-100 dark:hover:bg-purple-950/40',
  },
  competition: {
    bg: 'bg-red-50 dark:bg-red-950/20',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
    hover: 'hover:bg-red-100 dark:hover:bg-red-950/40',
  },
}

const getCategoryStyle = (categoryName: string) => {
  const normalizedName = categoryName.toLowerCase()
  if (normalizedName.includes('course')) {
    return categoryColors.courses
  } else if (normalizedName.includes('camp')) {
    return categoryColors.camps
  } else if (normalizedName.includes('workshop')) {
    return categoryColors.workshops
  } else if (normalizedName.includes('competition')) {
    return categoryColors.competition
  }
  // Default style
  return {
    bg: 'bg-gray-50 dark:bg-gray-950/20',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-800',
    hover: 'hover:bg-gray-100 dark:hover:bg-gray-950/40',
  }
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
  return <BookOpen className="h-8 w-8" />
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
    <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-16 md:py-24">
      <div className="text-center mb-12 md:mb-16">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
          Our Programs
        </h2>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Explore our diverse range of educational programs designed to inspire and empower learners
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-6 md:gap-8">
        {categories.map((category) => {
          const styles = getCategoryStyle(category.name)
          const icon = getCategoryIcon(category.name)
          
          return (
            <Card
              key={category.id}
              className={`group relative overflow-hidden transition-all duration-300 shadow-md hover:shadow-2xl hover:-translate-y-1 ${styles.bg} ${styles.border} border-0 w-full md:w-[calc(50%-1rem)] lg:w-[calc(25%-1.5rem)] max-w-sm`}
            >
              {/* Decorative background pattern */}
              <div className="absolute top-0 right-0 w-40 h-40 opacity-5 group-hover:opacity-10 transition-opacity">
                <div className={`w-full h-full ${styles.text} flex items-center justify-center`}>
                  {icon}
                </div>
              </div>
              
              <CardHeader className="relative z-10 pb-4">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${styles.bg} ${styles.border} border-0 mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm`}>
                  <div className={styles.text}>
                    {icon}
                  </div>
                </div>
                <CardTitle className="text-2xl md:text-3xl font-bold mb-3">
                  {category.display_name}
                </CardTitle>
                <CardDescription className="text-base leading-relaxed min-h-[3rem]">
                  {category.description || `Explore our ${category.display_name.toLowerCase()} programs designed for all skill levels.`}
                </CardDescription>
              </CardHeader>

              <CardContent className="relative z-10 pt-0">
                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                  <Badge variant="outline" className="text-xs font-medium">
                    Active Programs
                  </Badge>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className={`${styles.text} ${styles.hover} group-hover:translate-x-1 transition-all duration-300 font-medium`}
                  >
                    <Link href={`/programs#${category.name.toLowerCase()}`}>
                      Explore
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                </div>
              </CardContent>

              {/* Decorative gradient overlay on hover */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent pointer-events-none`} />
            </Card>
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

