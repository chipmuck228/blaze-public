'use client'

import { useState, useEffect, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, MapPin, Calendar, Users, Search, Filter, X } from "lucide-react"
import Link from "next/link"
import { useSession } from "next-auth/react"

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

export default function ProgramsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [franchises, setFranchises] = useState<Franchise[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<Array<{ id: string; name: string; display_name: string }>>([])

  // 筛选状态
  const [selectedFranchise, setSelectedFranchise] = useState<string>("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedGrade, setSelectedGrade] = useState<string>("all")

  // 从 URL query parameter 获取 category
  const categoryFromUrl = searchParams.get("category")

  useEffect(() => {
    // 从 URL query parameter 读取 category，并设置到筛选状态
    if (categoryFromUrl) {
      setSelectedCategory(categoryFromUrl)
    }
  }, [categoryFromUrl])

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    fetchInstances()
  }, [selectedCategory])

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/public/categories")
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      }
    } catch (err) {
      console.error("Error fetching categories:", err)
    }
  }

  const fetchInstances = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // 根据 selectedCategory 构建 API URL
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
      
      console.log("[Programs Page] API Response:", {
        hasError: !!data.error,
        error: data.error,
        franchisesCount: data.franchises?.length || 0,
        franchises: data.franchises,
      })
      
      // 即使没有 instances，也设置 franchises 和 programs 数据
      if (data.error) {
        console.warn("API returned error but continuing:", data.error)
        setFranchises([])
      } else {
        const franchises = data.franchises || []
        console.log("[Programs Page] Setting franchises:", {
          count: franchises.length,
          franchises: franchises.map((f: any) => ({
            id: f.id,
            name: f.name,
            programsCount: f.programs?.length || 0,
          })),
        })
        setFranchises(franchises)
      }
    } catch (err) {
      console.error("Error fetching instances:", err)
      // 即使出错，也尝试显示空结构，而不是完全失败
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

  // 获取所有唯一的 category 列表（从实际数据中提取）
  const allCategoriesFromData = useMemo(() => {
    const categoryMap = new Map<string, { id: string; name: string; display_name: string }>()
    franchises.forEach((franchise) => {
      franchise.programs.forEach((program) => {
        if (program.category && !categoryMap.has(program.category.id)) {
          categoryMap.set(program.category.id, {
            id: program.category.id,
            name: program.category.name,
            display_name: program.category.display_name,
          })
        }
      })
    })
    return Array.from(categoryMap.values())
  }, [franchises])

  // 获取所有唯一的 grade 列表
  const allGrades = useMemo(() => {
    const gradeSet = new Set<string>()
    franchises.forEach((franchise) => {
      franchise.programs.forEach((program) => {
        program.instances.forEach((instance) => {
          // 支持 grade_level 或 target_grades
          if (instance.course.grade_level) {
            gradeSet.add(instance.course.grade_level)
          } else if (instance.course.target_grades && Array.isArray(instance.course.target_grades)) {
            instance.course.target_grades.forEach((grade: string) => gradeSet.add(grade))
          }
        })
      })
    })
    return Array.from(gradeSet).sort()
  }, [franchises])

  // 过滤数据
  // 只显示有 instances 的 programs
  const filteredFranchises = useMemo(() => {
    return franchises
      .filter((franchise) => {
        // Franchise 筛选
        if (selectedFranchise !== "all" && franchise.id !== selectedFranchise) {
          return false
        }
        return true
      })
      .map((franchise) => ({
        ...franchise,
        programs: franchise.programs
          .filter((program) => {
            // Category 筛选
            if (selectedCategory !== "all" && program.category?.id !== selectedCategory) {
              return false
            }
            return true
          })
          .map((program) => ({
            ...program,
            instances: (program.instances || []).filter((instance) => {
              // 搜索过滤
              if (searchQuery) {
                const query = searchQuery.toLowerCase()
                const matchesName = instance.course?.name?.toLowerCase().includes(query) || false
                const matchesDescription = instance.course?.description?.toLowerCase().includes(query) || false
                if (!matchesName && !matchesDescription) {
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
            }),
          }))
          .filter((program) => {
            // 只返回有 instances 的 programs
            return program.instances && program.instances.length > 0
          }),
      }))
      .filter((franchise) => {
        // 只返回有 programs 的 franchises
        return franchise.programs.length > 0
      })
  }, [franchises, selectedFranchise, selectedCategory, searchQuery, selectedGrade])

  const handleEnroll = async (instanceId: string) => {
    if (!session?.user) {
      router.push("/login")
      return
    }

    // TODO: 实现加入购物车逻辑
    router.push(`/course-catalog?instance=${instanceId}`)
  }

  const clearFilters = () => {
    setSelectedFranchise("all")
    setSelectedCategory("all")
    setSearchQuery("")
    setSelectedGrade("all")
    // 清除 URL 中的 category 参数
    if (categoryFromUrl) {
      router.push("/programs")
    }
  }

  const hasActiveFilters =
    selectedFranchise !== "all" ||
    selectedCategory !== "all" ||
    searchQuery !== "" ||
    selectedGrade !== "all"

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
            <Button onClick={fetchInstances}>Retry</Button>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-8 md:py-12">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">All Programs</h1>
            <p className="text-muted-foreground">
              Browse all available course instances organized by franchise and program
            </p>
          </div>

          {/* Filters */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </CardTitle>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Franchise Filter */}
                <div className="space-y-2">
                  <Label htmlFor="franchise">Franchise</Label>
                  <Select value={selectedFranchise} onValueChange={setSelectedFranchise}>
                    <SelectTrigger id="franchise">
                      <SelectValue placeholder="All Franchises" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Franchises</SelectItem>
                      {allFranchises.map((franchise) => (
                        <SelectItem key={franchise.id} value={franchise.id}>
                          {franchise.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Category Filter */}
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={selectedCategory} onValueChange={(value) => {
                    setSelectedCategory(value)
                    // 更新 URL 参数
                    if (value === "all") {
                      router.push("/programs")
                    } else {
                      router.push(`/programs?category=${value}`)
                    }
                  }}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {allCategoriesFromData.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Grade Filter */}
                <div className="space-y-2">
                  <Label htmlFor="grade">Grade Level</Label>
                  <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                    <SelectTrigger id="grade">
                      <SelectValue placeholder="All Grades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Grades</SelectItem>
                      {allGrades.map((grade) => (
                        <SelectItem key={grade} value={grade}>
                          {grade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Search */}
                <div className="space-y-2">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Course name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {filteredFranchises.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-2">
                  {error ? (
                    <>
                      <span className="text-destructive">{error}</span>
                      <br />
                      <span className="text-sm">No programs or instances found.</span>
                    </>
                  ) : (
                    "No programs or instances found matching your filters."
                  )}
                </p>
                {error && (
                  <Button onClick={fetchInstances} variant="outline" className="mt-4">
                    Retry
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {filteredFranchises.map((franchise) => {
                const programsCount = franchise.programs?.length || 0
                
                return (
                <Card key={franchise.id} className="space-y-6">
                  {/* Franchise Header */}
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-2xl font-bold">{franchise.name}</CardTitle>
                        <CardDescription className="mt-1">Franchise Code: {franchise.code}</CardDescription>
                      </div>
                      <Badge variant="secondary" className="text-sm">
                        {programsCount} Program{programsCount !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* Programs */}
                    {franchise.programs && franchise.programs.length > 0 ? (
                      franchise.programs.map((program) => {
                        const instancesCount = program.instances?.length || 0
                        
                        return (
                          <Card
                            key={program.id}
                          >
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <CardTitle className="text-xl font-semibold mb-2">
                                    {program.display_name}
                                  </CardTitle>
                                  {program.description && (
                                    <CardDescription className="mb-2">{program.description}</CardDescription>
                                  )}
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">{program.category?.display_name || 'Unknown'}</Badge>
                                    <Badge variant="secondary" className="text-xs">
                                      {instancesCount} Instance{instancesCount !== 1 ? 's' : ''}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </CardHeader>

                            <CardContent>
                              {/* Instances */}
                              {instancesCount === 0 ? (
                                <div className="py-8 text-center">
                                  <p className="text-sm text-muted-foreground">No instances available for this program.</p>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {program.instances.map((instance) => (
                            <Card key={instance.id} className="hover:shadow-lg transition-shadow">
                              <CardHeader>
                                <CardTitle className="text-lg">{instance.course.name}</CardTitle>
                                <CardDescription className="line-clamp-2">
                                  {instance.course.description}
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                {/* Course Info */}
                                <div className="space-y-2 text-sm">
                                  {instance.course.grade_level && (
                                    <div className="flex items-center gap-2">
                                      <Badge variant="secondary">{instance.course.grade_level}</Badge>
                                    </div>
                                  )}
                                  {instance.course.age_min && instance.course.age_max && (
                                    <p className="text-muted-foreground">
                                      Ages {instance.course.age_min}-{instance.course.age_max}
                                    </p>
                                  )}
                                </div>

                                {/* Schedule */}
                                <div className="space-y-2 text-sm">
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Calendar className="h-4 w-4" />
                                    <span>
                                      {new Date(instance.start_date).toLocaleDateString()} -{" "}
                                      {new Date(instance.end_date).toLocaleDateString()}
                                    </span>
                                  </div>
                                  {instance.start_time && instance.end_time && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <span>
                                        {instance.start_time} - {instance.end_time}
                                      </span>
                                    </div>
                                  )}
                                  {instance.location && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <MapPin className="h-4 w-4" />
                                      <span>{instance.location.name}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Capacity */}
                                <div className="flex items-center gap-2 text-sm">
                                  <Users className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">
                                    {instance.current_students} / {instance.max_students || "N/A"} students
                                  </span>
                                  {instance.is_full && (
                                    <Badge variant="destructive" className="ml-auto">
                                      Full
                                    </Badge>
                                  )}
                                  {!instance.is_full && instance.available_spots > 0 && (
                                    <Badge variant="outline" className="ml-auto">
                                      {instance.available_spots} spots left
                                    </Badge>
                                  )}
                                </div>

                                {/* Price */}
                                {instance.price_override !== null && instance.price_override !== undefined ? (
                                  <div className="text-lg font-semibold">
                                    ${instance.price_override.toFixed(2)}
                                  </div>
                                ) : instance.course.base_price ? (
                                  <div className="text-lg font-semibold">
                                    ${instance.course.base_price.toFixed(2)}
                                  </div>
                                ) : null}

                                {/* Actions */}
                                <div className="flex gap-2 pt-2">
                                  <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                  >
                                    <Link href={`/course-catalog/${instance.course.slug || instance.course.id}`}>
                                      View Details
                                    </Link>
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => handleEnroll(instance.id)}
                                    disabled={instance.is_full || instance.status !== "scheduled"}
                                  >
                                    {instance.is_full ? "Full" : "Enroll"}
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )
                      })
                    ) : (
                      <div className="py-8 text-center">
                        <p className="text-sm text-muted-foreground">No programs available for this franchise.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}

