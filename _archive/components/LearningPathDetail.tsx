'use client'

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Progress } from "./ui/progress"
import { CheckCircle2, BookOpen, Clock, Users, Target, ArrowRight, Lock } from "lucide-react"
import type { LearningPathWithDetails } from "../lib/learning-paths-db"
import { checkUserPrerequisites } from "@/lib/db"

interface LearningPathDetailProps {
  path: LearningPathWithDetails
}

export function LearningPathDetail({ path }: LearningPathDetailProps) {
  const { data: session } = useSession()
  const [userProgress, setUserProgress] = useState<{
    progress: number
    completedCourses: string[]
    canStart: boolean
    nextCourses: Array<{ id: string; name: string }>
  } | null>(null)
  const [isLoadingProgress, setIsLoadingProgress] = useState(false)

  useEffect(() => {
    if (session?.user?.id && path.id) {
      calculateProgress()
    }
  }, [session, path.id])

  const calculateProgress = async () => {
    if (!session?.user?.id || !path.id || !path.courses) return

    setIsLoadingProgress(true)
    try {
      // 使用新的 API 获取路径进度
      const response = await fetch(`/api/user/learning-paths/${path.id}/progress`)
      if (response.ok) {
        const data = await response.json()
        const calculatedProgress = data.progress

        // 获取已完成的课程ID（用于显示完成状态）
        const completionsResponse = await fetch(`/api/user/completions`)
        const completionsData = completionsResponse.ok ? await completionsResponse.json() : { completions: [] }
        const completedCourseIds = new Set<string>(
          (completionsData.completions || []).map((c: any) => c.course_id).filter(Boolean)
        )

        setUserProgress({
          progress: calculatedProgress.progress,
          completedCourses: Array.from(completedCourseIds),
          canStart: calculatedProgress.completedStages === 0,
          nextCourses: calculatedProgress.nextCourses.map((c: any) => ({
            id: c.id,
            name: c.name,
          })),
        })
      }
    } catch (error) {
      console.error('Error calculating progress:', error)
    } finally {
      setIsLoadingProgress(false)
    }
  }

  // 按阶段分组课程
  const coursesByStage = path.courses?.reduce((acc, course) => {
    if (!acc[course.stage]) {
      acc[course.stage] = []
    }
    acc[course.stage].push(course)
    return acc
  }, {} as Record<number, typeof path.courses>) || {}

  const stages = Object.keys(coursesByStage).map(Number).sort((a, b) => a - b)

  const isCourseCompleted = (courseId?: string) => {
    return courseId ? userProgress?.completedCourses.includes(courseId) : false
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-12 md:py-20">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <nav className="text-sm text-muted-foreground mb-6">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/learning-paths" className="hover:text-primary transition-colors">Learning Paths</Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">{path.name}</span>
          </nav>

          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {path.category && (
                <Badge variant="outline">
                  {path.category.display_name || path.category.name}
                </Badge>
              )}
              {path.difficulty_level && (
                <Badge
                  variant={
                    path.difficulty_level === 'beginner' ? 'default' :
                    path.difficulty_level === 'intermediate' ? 'secondary' :
                    'destructive'
                  }
                >
                  {path.difficulty_level.charAt(0).toUpperCase() + path.difficulty_level.slice(1)}
                </Badge>
              )}
              {path.estimated_duration_weeks && (
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1 inline" />
                  {path.estimated_duration_weeks} weeks
                </Badge>
              )}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {path.name}
            </h1>
            {path.description && (
              <p className="text-xl text-muted-foreground leading-relaxed">
                {path.description}
              </p>
            )}
          </div>

          {/* User Progress (if logged in) */}
          {session?.user && userProgress !== null && (
            <Card className="mb-12">
              <CardHeader>
                <CardTitle>Your Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Overall Progress</span>
                    <span className="text-sm text-muted-foreground">{userProgress.progress}%</span>
                  </div>
                  <Progress value={userProgress.progress} className="h-2" />
                </div>
                {userProgress.nextCourses.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Next Courses to Enroll:</p>
                    <div className="space-y-2">
                      {userProgress.nextCourses.map((course) => (
                        <Link
                          key={course.id}
                          href={`/course-catalog/${course.id}`}
                          className="flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <ArrowRight className="h-4 w-4" />
                          {course.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Learning Path Stages */}
          <div className="space-y-8">
            {stages.map((stage) => {
              const stageCourses = coursesByStage[stage] || []
              const stageName = stageCourses[0]?.stage_name || `Stage ${stage}`
              const requiredCourses = stageCourses.filter(c => c.is_required)
              const optionalCourses = stageCourses.filter(c => !c.is_required)

              return (
                <Card key={stage}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span>{stageName}</span>
                      {requiredCourses.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {requiredCourses.length} required
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {requiredCourses.map((course) => {
                        const completed = isCourseCompleted(course.course_id)
                        return (
                          <div
                            key={course.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border ${
                              completed ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
                              'bg-card'
                            }`}
                          >
                            {completed ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                            ) : (
                              <BookOpen className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <Link
                                href={`/course-catalog/${course.course_id}`}
                                className={`font-medium hover:text-primary transition-colors ${
                                  completed ? 'text-green-700 dark:text-green-300' : ''
                                }`}
                              >
                                {course.course?.name || 'Unknown Course'}
                              </Link>
                              {course.estimated_weeks && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {course.estimated_weeks} weeks
                                </p>
                              )}
                            </div>
                            {completed && (
                              <Badge variant="outline" className="bg-green-100 dark:bg-green-900/30">
                                Completed
                              </Badge>
                            )}
                          </div>
                        )
                      })}
                      {optionalCourses.length > 0 && (
                        <div className="pt-3 border-t">
                          <p className="text-sm font-medium text-muted-foreground mb-2">Optional Courses:</p>
                          {optionalCourses.map((course) => (
                            <div
                              key={course.id}
                              className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                            >
                              <BookOpen className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                              <Link
                                href={`/course-catalog/${course.course_id}`}
                                className="font-medium hover:text-primary transition-colors"
                              >
                                {course.course?.name || 'Unknown Course'}
                              </Link>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}

