'use client'

import { useEffect, useState, useMemo } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LayoutDashboard, BookOpen, Calendar, CheckCircle2, Clock, MapPin, Users, ArrowRight } from "lucide-react"
import Link from "next/link"
import { CourseInstanceWithDetails } from "@/lib/db"

interface CoachStats {
  totalClasses: number
  upcomingClasses: number
  ongoingClasses: number
  completedClasses: number
}

export default function CoachDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<CoachStats | null>(null)
  const [instances, setInstances] = useState<CourseInstanceWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/coach/login")
      return
    }

    if (status === "authenticated" && session?.user?.role !== "coach") {
      router.push("/")
      return
    }

    if (status === "authenticated") {
      fetchStats()
      fetchInstances()
    }
  }, [status, session, router])

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/coach/stats")
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchInstances = async () => {
    try {
      const response = await fetch("/api/coach/instances")
      if (response.ok) {
        const data = await response.json()
        setInstances(data)
      }
    } catch (error) {
      console.error("Error fetching instances:", error)
    }
  }

  // 获取即将开始的课程（最近 7 天内）
  const upcomingInstances = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)

    return instances
      .filter(inst => {
        const startDate = new Date(inst.start_date)
        return startDate >= today && 
               startDate <= nextWeek && 
               (inst.status === 'scheduled' || inst.status === 'ongoing')
      })
      .sort((a, b) => {
        const dateA = new Date(a.start_date)
        const dateB = new Date(b.start_date)
        return dateA.getTime() - dateB.getTime()
      })
      .slice(0, 5) // 只显示最近 5 个
  }, [instances])

  // 获取今日课程
  const todayInstances = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return instances.filter(inst => {
      const startDate = new Date(inst.start_date)
      return startDate >= today && startDate < tomorrow && inst.status !== 'completed' && inst.status !== 'cancelled'
    })
  }, [instances])

  // 获取最近完成的课程
  const recentCompletedInstances = useMemo(() => {
    return instances
      .filter(inst => inst.status === 'completed')
      .sort((a, b) => {
        const dateA = new Date(a.end_date)
        const dateB = new Date(b.end_date)
        return dateB.getTime() - dateA.getTime() // 最新的在前
      })
      .slice(0, 3) // 只显示最近 3 个
  }, [instances])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatTime = (timeString?: string) => {
    if (!timeString) return ""
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "default"
      case "ongoing":
        return "default"
      case "completed":
        return "secondary"
      case "cancelled":
        return "destructive"
      default:
        return "outline"
    }
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back, {session?.user?.name || "Coach"}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalClasses || 0}</div>
            <p className="text-xs text-muted-foreground">All assigned classes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Classes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.upcomingClasses || 0}</div>
            <p className="text-xs text-muted-foreground">Scheduled classes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ongoing Classes</CardTitle>
            <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.ongoingClasses || 0}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Classes</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.completedClasses || 0}</div>
            <p className="text-xs text-muted-foreground">Finished classes</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Classes Alert */}
      {todayInstances.length > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Today's Classes ({todayInstances.length})
            </CardTitle>
            <CardDescription>
              You have {todayInstances.length} class{todayInstances.length > 1 ? 'es' : ''} scheduled for today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todayInstances.map((instance) => (
                <Link key={instance.id} href={`/coach/classes/${instance.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">
                              {instance.assignment?.course?.name || "Unnamed Course"}
                            </h3>
                            <Badge variant={getStatusColor(instance.status)}>
                              {instance.status}
                            </Badge>
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {instance.start_time && (
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {formatTime(instance.start_time)}
                                  {instance.end_time && ` - ${formatTime(instance.end_time)}`}
                                </span>
                              </div>
                            )}
                            {instance.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3" />
                                <span>{instance.location.name}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Users className="h-3 w-3" />
                              <span>
                                {instance.current_students} / {instance.max_students || "∞"} students
                              </span>
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Classes */}
      {upcomingInstances.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upcoming Classes (Next 7 Days)</CardTitle>
                <CardDescription>
                  Your classes scheduled for the next week
                </CardDescription>
              </div>
              <Link href="/coach/classes">
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingInstances.map((instance) => (
                <Link key={instance.id} href={`/coach/classes/${instance.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">
                              {instance.assignment?.course?.name || "Unnamed Course"}
                            </h3>
                            <Badge variant={getStatusColor(instance.status)}>
                              {instance.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {instance.assignment?.category?.display_name || instance.assignment?.category?.name} &gt; {instance.assignment?.series?.display_name || instance.assignment?.series?.name}
                          </p>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(instance.start_date)}</span>
                            </div>
                            {instance.start_time && (
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {formatTime(instance.start_time)}
                                  {instance.end_time && ` - ${formatTime(instance.end_time)}`}
                                </span>
                              </div>
                            )}
                            {instance.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3" />
                                <span>{instance.location.name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Completed Classes */}
      {recentCompletedInstances.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Completed Classes</CardTitle>
                <CardDescription>
                  Your recently finished classes
                </CardDescription>
              </div>
              <Link href="/coach/classes?status=completed">
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentCompletedInstances.map((instance) => (
                <Link key={instance.id} href={`/coach/classes/${instance.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer opacity-75">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">
                              {instance.assignment?.course?.name || "Unnamed Course"}
                            </h3>
                            <Badge variant="secondary">Completed</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Completed on {formatDate(instance.end_date)}
                          </p>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>My Classes</CardTitle>
            <CardDescription>View and manage all your assigned classes</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/coach/classes">
              <Button className="w-full">View All Classes</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
            <CardDescription>View your classes in calendar format</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/coach/schedule">
              <Button className="w-full" variant="outline">View Schedule</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

