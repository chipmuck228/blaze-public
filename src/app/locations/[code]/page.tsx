import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { MapPin, ArrowRight } from "lucide-react"
import { notFound } from "next/navigation"
import { getFranchiseByCode } from "@/lib/db"
import { LocationFeaturedCourses } from "@/components/location/LocationFeaturedCourses"

interface LocationPageProps {
  params: Promise<{ code: string }>
}

export default async function GenericLocationPage({ params }: LocationPageProps) {
  const { code } = await params
  const normalizedCode = decodeURIComponent(code).toLowerCase()

  const franchise = await getFranchiseByCode(normalizedCode)

  if (!franchise) {
    notFound()
  }

  const displayName = franchise.name || normalizedCode

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-16 sm:py-20">
          {/* Hero */}
          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <div className="space-y-6">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold">
                {displayName} Robotics Academy
              </h1>
              <p className="text-lg text-muted-foreground">
                Local robotics, coding, and engineering programs for students in the {displayName} area.
              </p>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 mt-0.5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">{displayName} Campus</p>
                    <p>Specific campus address and details can be configured for this franchise.</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <a href={`/course-catalog?franchise=${encodeURIComponent(normalizedCode)}`}>
                    View Programs
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <a href="#contact">
                    Contact {displayName} Campus
                  </a>
                </Button>
              </div>
            </div>

            {/* Generic highlight card */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>{displayName} Highlights</CardTitle>
                <CardDescription>
                  A quick overview of what students can expect at the {displayName} campus.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground mb-1">Programs</p>
                  <p>
                    Age-appropriate robotics, coding, and STEM programs designed for local students.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Schedule</p>
                  <p>
                    After-school and weekend offerings during the school year, plus camps during breaks.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Focus</p>
                  <p>
                    Hands-on learning, teamwork, and preparing students for real-world robotics challenges.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Featured courses for this franchise */}
          <LocationFeaturedCourses
            franchiseCode={normalizedCode}
            locationName={displayName}
          />

          {/* Generic Contact / Info section */}
          <section
            id="contact"
            className="mt-16 grid md:grid-cols-2 gap-10 items-start"
          >
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">Campus Information</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                This campus serves families in and around {displayName}. Detailed address, parking, and
                check-in information can be configured per franchise as the site evolves.
              </p>
            </div>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                For specific class schedules and availability at {displayName}, please view the program
                catalog or reach out to the local campus team.
              </p>
            </div>
          </section>
        </section>
      </main>
      <Footer />
    </>
  )
}


