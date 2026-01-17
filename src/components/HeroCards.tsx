'use client'
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ArrowRight, Loader2, BookOpen, GraduationCap, Sparkles, Trophy } from "lucide-react"
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

  // 如果没有 featured categories，返回 null（或显示默认内容）
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12 w-full max-w-[700px] mx-auto">
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
    <>
      {/* Mobile: Vertical stack layout (< 1024px) */}
      <div className="flex lg:hidden flex-col gap-4 sm:gap-6 w-full max-w-[700px] mx-auto px-4">
        {featuredCategories.map((category, index) => {
          const gradient = getCategoryGradient(category.name)
          const icon = getCategoryIcon(category.name)
          
          return (
            <Card
              key={category.id}
              className="w-full drop-shadow-xl shadow-black/10 dark:shadow-white/10 border-0 transition-all duration-300 hover:shadow-2xl"
            >
              {/* Icon for mobile (instead of poster) */}
              <CardHeader className="flex flex-col items-center pb-2 pt-6">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg mb-4"
                  style={{
                    background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`
                  }}
                >
                  {icon}
                </div>
                {category.featured_subtitle ? (
                  <h3 className="text-center text-lg sm:text-xl font-bold mt-2" style={{
                    background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    letterSpacing: '0.02em',
                  }}>
                    {category.featured_subtitle}
                  </h3>
                ) : (
                  <CardTitle className="text-center text-lg sm:text-xl">
                    {category.display_name}
                  </CardTitle>
                )}
                {category.featured_slogan && (
                  <p className="text-center text-sm sm:text-base text-muted-foreground mt-2">
                    {category.featured_slogan}
                  </p>
                )}
              </CardHeader>

              <CardContent className="text-center pb-4">
            <Button
              asChild
                  className="w-full"
                  style={{
                    background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`
                  }}
                >
                  <Link href={`/programs?category=${category.id}`}>
                    Explore
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
            </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Desktop Portrait: Vertical stack layout (>= 1024px, portrait) */}
      <div className="hidden lg:flex hero-cards-desktop-portrait flex-col gap-6 lg:gap-8 w-full max-w-[700px] lg:max-w-[800px] mx-auto px-4">
        {featuredCategories.map((category, index) => {
          const gradient = getCategoryGradient(category.name)
          const icon = getCategoryIcon(category.name)
          
          return (
            <Card
              key={category.id}
              className="w-full drop-shadow-xl shadow-black/10 dark:shadow-white/10 border-0 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]"
            >
              {/* Poster Image - Desktop Portrait */}
              {category.poster_url ? (
                <div className="relative w-full h-64 lg:h-72 overflow-hidden rounded-t-lg group/poster">
                  <Image
                    src={category.poster_url}
                    alt={category.display_name}
                    fill
                    className="object-cover"
                    priority={index < 2}
                    sizes="(max-width: 1024px) 100vw, 800px"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                  {/* Overlay with description - 蒙版效果，hover 时显示 */}
                  {category.description && (
                    <>
                      {/* 移动设备：始终显示 */}
                      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/80 to-black/60 lg:hidden">
                        <p className="text-white text-sm drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] line-clamp-2">
                          {category.description}
                        </p>
                      </div>
                      {/* 桌面设备：hover 时显示 */}
                      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/80 to-black/60 hidden lg:block opacity-0 group-hover/poster:opacity-100 transition-opacity duration-300">
                        <p className="text-white text-sm lg:text-base drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                          {category.description}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="w-full h-48 lg:h-56 flex items-center justify-center bg-gradient-to-br from-muted to-muted/50 rounded-t-lg">
                  <div
                    className="w-24 h-24 rounded-full flex items-center justify-center text-white shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`
                    }}
                  >
                    {icon}
                  </div>
                </div>
              )}

              <CardHeader className="pb-2">
                {category.featured_subtitle ? (
                  <h3 className="text-xl lg:text-2xl font-bold" style={{
                    background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    letterSpacing: '0.02em',
                  }}>
                    {category.featured_subtitle}
                  </h3>
                ) : (
                  <CardTitle className="text-xl lg:text-2xl">
                    {category.display_name}
                  </CardTitle>
                )}
                {category.featured_slogan && (
                  <p className="text-sm lg:text-base text-muted-foreground mt-2">
                    {category.featured_slogan}
                  </p>
                )}
              </CardHeader>

              <CardContent className="pb-4">
            <Button
              asChild
                  className="w-full"
                  style={{
                    background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`
                  }}
                >
                  <Link href={`/programs?category=${category.id}`}>
                    Explore
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
            </Button>
              </CardContent>
      </Card>
          )
        })}
          </div>

      {/* Desktop Landscape: Masonry/Photo Wall layout (>= 1024px, landscape) */}
      <div className="hidden lg:grid hero-cards-desktop-landscape grid-cols-2 gap-4 lg:gap-6 w-full max-w-[700px] lg:max-w-[900px] mx-auto auto-rows-max">
        {featuredCategories.map((category, index) => {
          const gradient = getCategoryGradient(category.name)
          const icon = getCategoryIcon(category.name)
          
          // 照片墙布局：让某些卡片跨越多行，创造错落有致的效果
          // 策略：根据索引和总数智能分配跨行效果
          // - 如果有2个：第1个跨行
          // - 如果有3个：第1个和第3个跨行
          // - 如果有4个：第1个和第3个跨行
          // - 如果有更多：交替跨行
          const totalCategories = featuredCategories.length
          let shouldSpanRows = false
          
          if (totalCategories === 2) {
            shouldSpanRows = index === 0
          } else if (totalCategories === 3) {
            shouldSpanRows = index === 0 || index === 2
          } else if (totalCategories === 4) {
            shouldSpanRows = index === 0 || index === 2
          } else {
            // 5个或更多：每3个中第1个跨行
            shouldSpanRows = index % 3 === 0
          }
          
          const rowSpanClass = shouldSpanRows ? 'row-span-2' : ''
          
          // 根据位置调整图片高度，创造层次感
          // 跨行的卡片使用更大的图片，其他卡片使用不同高度创造变化
          const imageHeightClass = shouldSpanRows 
            ? 'h-64 lg:h-80 xl:h-96' // 跨行的卡片使用更大的图片
            : index % 2 === 0
              ? 'h-52 lg:h-64' // 偶数索引中等高度
              : 'h-48 lg:h-56' // 奇数索引较小高度
          
          return (
            <Card
              key={category.id}
              className={`group w-full drop-shadow-xl shadow-black/10 dark:shadow-white/10 border-0 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 ${rowSpanClass}`}
            >
              {/* Poster Image - Desktop Landscape with varying heights */}
              {category.poster_url ? (
                <div className={`relative w-full ${imageHeightClass} overflow-hidden rounded-t-lg group/poster`}>
                  <Image
                    src={category.poster_url}
                    alt={category.display_name}
                    fill
                    className="object-cover transition-transform duration-300 hover:scale-110"
                    priority={index < 2}
                    sizes="(max-width: 1024px) 50vw, 450px"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                  {/* Overlay with description - 蒙版效果，hover 时显示 */}
                  {category.description && (
                    <>
                      {/* 移动设备：始终显示 */}
                      <div className={`absolute bottom-0 left-0 right-0 p-3 lg:p-4 bg-gradient-to-t from-black/90 via-black/80 to-black/60 lg:hidden`}>
                        <p className={`text-white text-xs lg:text-sm drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] line-clamp-2 ${shouldSpanRows ? '' : ''}`}>
                          {category.description}
                        </p>
                      </div>
                      {/* 桌面设备：hover 时显示 */}
                      <div className={`absolute bottom-0 left-0 right-0 p-3 lg:p-4 bg-gradient-to-t from-black/90 via-black/80 to-black/60 hidden lg:block opacity-0 group-hover/poster:opacity-100 transition-opacity duration-300`}>
                        <p className={`text-white text-xs lg:text-sm drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] ${shouldSpanRows ? '' : ''}`}>
                          {category.description}
                        </p>
                      </div>
                    </>
                  )}
                  {/* Overlay gradient for better text readability (only if no description) */}
                  {!category.description && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
            )}
          </div>
              ) : (
                <div className={`w-full ${imageHeightClass} flex items-center justify-center bg-gradient-to-br from-muted to-muted/50 rounded-t-lg`}>
                  <div
                    className="w-20 h-20 lg:w-24 lg:h-24 rounded-full flex items-center justify-center text-white shadow-lg transition-transform duration-300 hover:scale-110"
                    style={{
                      background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`
                    }}
                  >
                    {icon}
          </div>
          </div>
              )}

              <CardHeader className="pb-2">
                {category.featured_subtitle ? (
                  <h3 className={`font-bold ${shouldSpanRows ? 'text-xl lg:text-2xl' : 'text-lg lg:text-xl'}`} style={{
                    background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    letterSpacing: '0.02em',
                  }}>
                    {category.featured_subtitle}
                  </h3>
                ) : (
                  <CardTitle className={`${shouldSpanRows ? 'text-xl lg:text-2xl' : 'text-lg lg:text-xl'}`}>
                    {category.display_name}
                  </CardTitle>
                )}
                {category.featured_slogan && (
                  <p className={`text-sm mt-2 text-muted-foreground ${shouldSpanRows ? '' : 'line-clamp-2'}`}>
                    {category.featured_slogan}
                  </p>
                )}
        </CardHeader>

              <CardContent className="pb-4">
                <Button
                  asChild
                  className="w-full transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`
                  }}
                >
                  <Link href={`/programs?category=${category.id}`} className="group/button">
                    Explore
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover/button:translate-x-1" />
                  </Link>
                </Button>
              </CardContent>
      </Card>
          )
        })}
    </div>
    </>
  )
}
