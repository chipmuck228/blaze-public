'use client'

import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { MapPin, Calendar, ArrowRight } from "lucide-react"
import { LocationFeaturedCourses } from "@/components/location/LocationFeaturedCourses"

export default function BellevueLocationPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-16 sm:py-20">
          {/* Hero */}
          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <div className="space-y-6">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold">
                Bellevue Robotics Academy
              </h1>
              <p className="text-lg text-muted-foreground">
                Serving students in the Bellevue area with hands-on robotics, coding, and engineering programs.
              </p>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 mt-0.5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Bellevue Campus</p>
                    <p>1910 132nd Ave NE #7, Bellevue, WA 98005</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <a href="/course-catalog?franchise=bellevue">
                    View Programs
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <a href="#contact">
                    Contact Bellevue Campus
                  </a>
                </Button>
              </div>
            </div>

            {/* Highlight card */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Bellevue Highlights</CardTitle>
                <CardDescription>
                  A quick overview of what students can expect at the Bellevue campus.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground mb-1">Programs</p>
                  <p>
                    RoboQuests, LaunchPad, and RoboChamps programs for elementary and middle school students.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Schedule</p>
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    After-school and weekend classes throughout the school year.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Focus</p>
                  <p>
                    Project-based learning, teamwork, and competition-ready robotics skills.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Featured courses for this location */}
          <LocationFeaturedCourses franchiseCode="bellevue" locationName="Bellevue" />

          {/* Contact / Info section */}
          <section
            id="contact"
            className="mt-16 grid md:grid-cols-2 gap-10 items-start"
          >
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">Campus Information</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Our Bellevue campus is centrally located with convenient access from major
                routes. Parents can choose from a variety of programs designed to nurture
                creativity, problem solving, and collaboration through robotics.
              </p>
            </div>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                For detailed class schedules and availability, please visit the program catalog
                or contact the Bellevue campus directly.
              </p>
              <p>
                Email and phone contact details can be unified in the site footer, while this
                page focuses on location-specific overview and navigation.
              </p>
            </div>
          </section>
        </section>
      </main>
      <Footer />
    </>
  )
}


