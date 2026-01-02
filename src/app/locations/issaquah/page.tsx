'use client'

import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { MapPin, Calendar, ArrowRight } from "lucide-react"
import { LocationFeaturedCourses } from "@/components/location/LocationFeaturedCourses"

export default function IssaquahLocationPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-16 sm:py-20">
          {/* Hero */}
          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <div className="space-y-6">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold">
                Issaquah Robotics Academy
              </h1>
              <p className="text-lg text-muted-foreground">
                Robotics and STEM programs for students in the Issaquah and Sammamish communities.
              </p>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 mt-0.5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Issaquah Campus</p>
                    <p>Issaquah-area location details can be added here.</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <a href="/course-catalog?franchise=issaquah">
                    View Programs
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <a href="#contact">
                    Contact Issaquah Campus
                  </a>
                </Button>
              </div>
            </div>

            {/* Highlight card */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Issaquah Highlights</CardTitle>
                <CardDescription>
                  Local programs and opportunities at the Issaquah campus.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground mb-1">Programs</p>
                  <p>
                    Hands-on robotics and coding classes designed for students in Issaquah and Sammamish.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Schedule</p>
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    After-school and weekend programs aligned with local school calendars.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Focus</p>
                  <p>
                    Encouraging creativity and confidence through real-world robotics challenges.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Featured courses for this location */}
          <LocationFeaturedCourses franchiseCode="issaquah" locationName="Issaquah" />

          {/* Contact / Info section */}
          <section
            id="contact"
            className="mt-16 grid md:grid-cols-2 gap-10 items-start"
          >
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">Campus Information</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                The Issaquah campus focuses on providing accessible robotics education to families
                in Issaquah, Sammamish, and nearby neighborhoods.
              </p>
            </div>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                Detailed class schedules for Issaquah will be available in the course catalog. Parents
                can explore different difficulty levels and program types to find the best fit for their students.
              </p>
            </div>
          </section>
        </section>
      </main>
      <Footer />
    </>
  )
}


