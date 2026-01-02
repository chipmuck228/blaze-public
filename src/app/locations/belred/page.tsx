'use client'

import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { MapPin, Calendar, ArrowRight } from "lucide-react"
import { LocationFeaturedCourses } from "@/components/location/LocationFeaturedCourses"

export default function BelRedLocationPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-16 sm:py-20">
          {/* Hero */}
          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <div className="space-y-6">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold">
                Bel-Red Robotics Academy
              </h1>
              <p className="text-lg text-muted-foreground">
                Conveniently located in the Bel-Red corridor, serving students from Bellevue, Redmond, and surrounding areas.
              </p>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 mt-0.5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Bel-Red Campus</p>
                    <p>Specific address details can be added here for the Bel-Red location.</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <a href="/course-catalog?franchise=belred">
                    View Programs
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <a href="#contact">
                    Contact Bel-Red Campus
                  </a>
                </Button>
              </div>
            </div>

            {/* Highlight card */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Bel-Red Highlights</CardTitle>
                <CardDescription>
                  Programs and opportunities at the Bel-Red campus.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground mb-1">Programs</p>
                  <p>
                    Robotics and coding classes tailored for students in the Bel-Red and Redmond areas.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Schedule</p>
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Weekday after-school and weekend sessions.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Focus</p>
                  <p>
                    Building strong foundations in engineering thinking and teamwork through robotics challenges.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Featured courses for this location */}
          <LocationFeaturedCourses franchiseCode="belred" locationName="Bel-Red" />

          {/* Contact / Info section */}
          <section
            id="contact"
            className="mt-16 grid md:grid-cols-2 gap-10 items-start"
          >
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">Campus Information</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                The Bel-Red campus is designed to be easily accessible for families living
                between Bellevue and Redmond, with flexible scheduling options for busy students.
              </p>
            </div>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                For more details on class offerings, recommended age ranges, and prerequisites,
                please refer to the full course catalog or contact our staff.
              </p>
            </div>
          </section>
        </section>
      </main>
      <Footer />
    </>
  )
}


