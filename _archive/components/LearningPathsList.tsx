'use client'

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Loader2, ArrowRight, BookOpen, Clock, Target, Users } from "lucide-react"
import { Input } from "./ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"

import type { LearningPathWithDetails } from "../lib/learning-paths-db"

type LearningPath = LearningPathWithDetails

export function LearningPathsList() {
  const [paths, setPaths] = useState<LearningPath[]>([])
  const [filteredPaths, setFilteredPaths] = useState<LearningPath[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [categories, setCategories] = useState<Array<{ id: string; name: string; display_name: string }>>([])

  useEffect(() => {
    fetchPaths()
    fetchCategories()
  }, [])

  const fetchPaths = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/learning-paths")
      if (response.ok) {
        const data = await response.json()
        setPaths(data.paths || [])
        setFilteredPaths(data.paths || [])
      }
    } catch (error) {
      console.error("Error fetching learning paths:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/admin/categories")
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  useEffect(() => {
    let filtered = [...paths]

    // 搜索过滤
    if (searchQuery) {
      filtered = filtered.filter(
        (path) =>
          path.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          path.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // 难度过滤
    if (selectedDifficulty !== "all") {
      filtered = filtered.filter((path) => path.difficulty_level === selectedDifficulty)
    }

    // 分类过滤
    if (selectedCategory !== "all") {
      filtered = filtered.filter((path) => path.category?.id === selectedCategory)
    }

    setFilteredPaths(filtered)
  }, [searchQuery, selectedDifficulty, selectedCategory, paths])

  const getDifficultyBadge = (level?: string) => {
    if (!level) return null
    const variants = {
      beginner: 'default',
      intermediate: 'secondary',
      advanced: 'destructive',
    } as const

    return (
      <Badge variant={variants[level as keyof typeof variants] || 'outline'}>
        {level.charAt(0).toUpperCase() + level.slice(1)}
      </Badge>
    )
  }

  const getTotalCourses = (path: LearningPath) => {
    return path.courses?.length || 0
  }

  const getRequiredCourses = (path: LearningPath) => {
    return path.courses?.filter(c => c.is_required).length || 0
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-12 md:py-20">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Learning Paths
          </h1>
          <p className="text-xl text-muted-foreground">
            Structured learning sequences to guide your robotics journey
          </p>
        </div>

        {/* Filters */}
        <div className="max-w-4xl mx-auto mb-8 space-y-4 md:space-y-0 md:flex md:gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search learning paths..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Difficulties</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.display_name || category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Learning Paths Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredPaths.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No learning paths found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {filteredPaths.map((path) => (
              <Card key={path.id} className="flex flex-col hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <CardTitle className="text-xl line-clamp-2">{path.name}</CardTitle>
                    {getDifficultyBadge(path.difficulty_level)}
                  </div>
                  {path.category && (
                    <Badge variant="outline" className="w-fit">
                      {path.category.display_name || path.category.name}
                    </Badge>
                  )}
                  {path.description && (
                    <CardDescription className="line-clamp-3 mt-2">
                      {path.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <BookOpen className="h-4 w-4" />
                      <span>{getRequiredCourses(path)} required courses</span>
                      {getTotalCourses(path) > getRequiredCourses(path) && (
                        <span className="text-xs">
                          ({getTotalCourses(path)} total)
                        </span>
                      )}
                    </div>
                    {path.estimated_duration_weeks && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{path.estimated_duration_weeks} weeks</span>
                      </div>
                    )}
                    {path.target_audience && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span className="line-clamp-1">{path.target_audience}</span>
                      </div>
                    )}
                  </div>
                  <Button
                    asChild
                    className="w-full mt-auto"
                    variant={path.slug ? "default" : "outline"}
                  >
                    <Link href={path.slug ? `/learning-paths/${path.slug}` : `#`}>
                      View Path
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

