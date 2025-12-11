'use client'

import { useEffect, useState, useMemo } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react"
import Link from "next/link"
import { CourseInstanceWithDetails } from "@/lib/db"
import { getActualClassDates } from "@/lib/icalendar"

export default function SchedulePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [instances, setInstances] = useState<CourseInstanceWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())

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
      fetchInstances()
    }
  }, [status, session, router])

  const fetchInstances = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/coach/instances")
      if (response.ok) {
        const data = await response.json()
        setInstances(data)
      }
    } catch (error) {
      console.error("Error fetching instances:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // 获取当前月份的所有课程日期
  const monthClasses = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const classes: Array<{
      date: Date
      instance: CourseInstanceWithDetails
    }> = []

    instances.forEach((instance) => {
      try {
        const classDates = getActualClassDates(instance)
        classDates.forEach((date) => {
          if (date.getFullYear() === year && date.getMonth() === month) {
            classes.push({ date, instance })
          }
        })
      } catch (error) {
        console.error("Error processing instance dates:", error)
      }
    })

    return classes.sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [instances, currentMonth])

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
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
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Schedule</h1>
        <p className="text-muted-foreground mt-2">
          View your classes in calendar format
        </p>
      </div>

      {/* Calendar Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {currentMonth.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={goToPreviousMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(new Date())}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={goToNextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {monthClasses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No classes scheduled for this month</p>
            </div>
          ) : (
            <div className="space-y-4">
              {monthClasses.map((item, index) => (
                <Link
                  key={`${item.instance.id}-${item.date.getTime()}`}
                  href={`/coach/classes/${item.instance.id}`}
                >
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">
                              {formatDate(item.date)}
                            </Badge>
                            {item.instance.start_time && (
                              <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTime(item.instance.start_time)}
                                {item.instance.end_time && ` - ${formatTime(item.instance.end_time)}`}
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold mb-1">
                            {item.instance.assignment?.course?.name || "Unnamed Course"}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            {item.instance.assignment?.category?.name} &gt; {item.instance.assignment?.series?.name}
                          </p>
                          {item.instance.location && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {item.instance.location.name}
                            </p>
                          )}
                        </div>
                        <Badge variant={item.instance.status === "completed" ? "secondary" : item.instance.status === "cancelled" ? "destructive" : "default"}>
                          {item.instance.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

