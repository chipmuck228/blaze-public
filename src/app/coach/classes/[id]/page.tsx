'use client'

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, MapPin, Clock, Users, BookOpen, ArrowLeft, Download } from "lucide-react"
import Link from "next/link"
import { InstanceCalendar } from "@/components/admin/InstanceCalendar"
import { CourseInstanceWithDetails } from "@/lib/db"

export default function ClassDetailsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const instanceId = params.id as string
  const [instance, setInstance] = useState<CourseInstanceWithDetails | null>(null)
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

    if (status === "authenticated" && instanceId) {
      fetchInstance()
    }
  }, [status, session, router, instanceId])

  const fetchInstance = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/coach/instances/${instanceId}`)
      if (response.ok) {
        const data = await response.json()
        setInstance(data)
      } else if (response.status === 404) {
        router.push("/coach/classes")
      }
    } catch (error) {
      console.error("Error fetching instance:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportCalendar = async () => {
    try {
      const response = await fetch(`/api/coach/instances/${instanceId}/export`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `course-instance-${instanceId}.ics`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error("Error exporting calendar:", error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatTime = (timeString?: string) => {
    if (!timeString) return "N/A"
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

  if (!instance) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Class not found</p>
            <Link href="/coach/classes">
              <Button className="mt-4" variant="outline">
                Back to Classes
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/coach/classes">
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Classes
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">
            {instance.assignment?.course?.name || "Unnamed Course"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {instance.assignment?.category?.name} &gt; {instance.assignment?.series?.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportCalendar} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Calendar
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge variant={instance.status === "completed" ? "secondary" : instance.status === "cancelled" ? "destructive" : "default"}>
                {instance.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date Range
              </p>
              <p className="text-sm">
                {formatDate(instance.start_date)} - {formatDate(instance.end_date)}
              </p>
            </div>
            {instance.start_time && (
              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Time
                </p>
                <p className="text-sm">
                  {formatTime(instance.start_time)} - {formatTime(instance.end_time)}
                </p>
              </div>
            )}
            {instance.location && (
              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </p>
                <p className="text-sm">{instance.location.name}</p>
                {instance.location.address && (
                  <p className="text-sm text-muted-foreground">
                    {instance.location.address}
                    {instance.location.city && `, ${instance.location.city}`}
                    {instance.location.state && `, ${instance.location.state}`}
                    {instance.location.zip_code && ` ${instance.location.zip_code}`}
                  </p>
                )}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Students
              </p>
              <p className="text-sm">
                {instance.current_students} / {instance.max_students || "∞"} students
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Course Details */}
        {instance.assignment?.course && (
          <Card>
            <CardHeader>
              <CardTitle>Course Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {instance.assignment.course.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="text-sm">{instance.assignment.course.description}</p>
                </div>
              )}
              {instance.assignment.course.target_audience && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Target Audience</p>
                  <p className="text-sm">{instance.assignment.course.target_audience}</p>
                </div>
              )}
              {instance.assignment.course.learning_outcomes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Learning Outcomes</p>
                  <p className="text-sm">{instance.assignment.course.learning_outcomes}</p>
                </div>
              )}
              {instance.assignment.course.prerequisites && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Prerequisites</p>
                  <p className="text-sm">{instance.assignment.course.prerequisites}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Class Schedule */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Class Schedule</CardTitle>
            <CardDescription>View all scheduled class dates</CardDescription>
          </CardHeader>
          <CardContent>
            <InstanceCalendar instance={instance} />
          </CardContent>
        </Card>

        {/* Notes */}
        {instance.notes && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{instance.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

