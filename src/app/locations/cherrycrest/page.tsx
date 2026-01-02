'use client'

import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { MapPin, Calendar, ArrowRight } from "lucide-react"
import { LocationFeaturedCourses } from "@/components/location/LocationFeaturedCourses"

export default function CherryCrestLocationPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-16 sm:py-20">
          {/* Hero */}
          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <div className="space-y-6">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold">
                Cherry Crest Robotics Academy
              </h1>
              <p className="text-lg text-muted-foreground">
                Local robotics programs for students in the Cherry Crest and surrounding neighborhoods.
              </p>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 mt-0.5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Cherry Crest Campus</p>
                    <p>Location details for the Cherry Crest area can be added here.</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <a href="/course-catalog?franchise=cherrycrest">
                    View Programs
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <a href="#contact">
                    Contact Cherry Crest Campus
                  </a>
                </Button>
              </div>
            </div>

            {/* Highlight card */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Cherry Crest Highlights</CardTitle>
                <CardDescription>
                  Overview of the Cherry Crest campus programs and focus areas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground mb-1">Programs</p>
                  <p>
                    Age-appropriate robotics and engineering programs for elementary students near Cherry Crest.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Schedule</p>
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    After-school enrichment aligned with local school schedules.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Focus</p>
                  <p>
                    Building curiosity and confidence through playful, structured robotics experiences.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Featured courses for this location */}
          <LocationFeaturedCourses franchiseCode="cherrycrest" locationName="Cherry Crest" />

          {/* Contact / Info section */}
          <section
            id="contact"
            className="mt-16 grid md:grid-cols-2 gap-10 items-start"
          >
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">Campus Information</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                The Cherry Crest campus is focused on providing convenient, neighborhood-based
                robotics learning opportunities for young students.
              </p>
            </div>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                More detailed schedules and enrollment information can be found in the main course
                catalog. This page serves as the local landing page for Cherry Crest families.
              </p>
            </div>
          </section>
        </section>
      </main>
      <Footer />
    </>
  )
}


