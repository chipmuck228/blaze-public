'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Progress } from "./ui/progress"
import { Loader2, TrendingUp, BookOpen, Target, Calendar, Award } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts"

interface AnalyticsData {
  summary: {
    totalCompleted: number
    totalEnrolled: number
    totalInProgress: number
    totalPaths: number
    completedPaths: number
  }
  completionsByMonth: Record<string, number>
  topCategories: Array<{ id: string; name: string; count: number }>
  pathStats: Array<{
    pathId: string
    pathName: string
    progress: number
    completedCourses: number
    totalCourses: number
    startedAt: string
    completedAt: string | null
    isCompleted: boolean
  }>
  learningIntensity: {
    recentCompletions: number
    recentEnrollments: number
    totalActivity: number
  }
  averageCompletionDays: number | null
  lastUpdated: string
}

export function UserAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/user/analytics")
      if (response.ok) {
        const analyticsData = await response.json()
        setData(analyticsData)
      }
    } catch (error) {
      console.error("Error fetching analytics:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No analytics data available.</p>
      </div>
    )
  }

  // 准备图表数据
  const monthlyData = Object.entries(data.completionsByMonth)
    .map(([month, count]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      completions: count,
    }))
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Courses</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalCompleted}</div>
            <p className="text-xs text-muted-foreground">Total completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalInProgress}</div>
            <p className="text-xs text-muted-foreground">Currently learning</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learning Paths</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.completedPaths}/{data.summary.totalPaths}</div>
            <p className="text-xs text-muted-foreground">Paths completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.learningIntensity.totalActivity}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Completions Chart */}
      {monthlyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Course Completions Over Time</CardTitle>
            <CardDescription>Your learning progress by month</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="completions" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top Categories */}
      {data.topCategories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Categories</CardTitle>
            <CardDescription>Your most studied course categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topCategories.map((category) => (
                <div key={category.id} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{category.name}</span>
                  <Badge variant="secondary">{category.count} courses</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Learning Path Progress */}
      {data.pathStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Learning Path Progress</CardTitle>
            <CardDescription>Your progress through learning paths</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.pathStats.map((path) => (
                <div key={path.pathId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{path.pathName}</span>
                    <Badge variant={path.isCompleted ? "default" : "secondary"}>
                      {path.progress}%
                    </Badge>
                  </div>
                  <Progress value={path.progress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {path.completedCourses} of {path.totalCourses} courses completed
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

