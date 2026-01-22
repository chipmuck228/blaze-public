'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, FolderTree, List, Calendar, ArrowRight, Info, MapPin, Package, ShoppingCart } from "lucide-react"
import { cn } from "@/lib/utils"

const tableOfContents = [
  {
    id: "overview",
    title: "Offering-Series-Instance",
    icon: Info,
  },
  {
    id: "offering",
    title: "Offering",
    icon: Package,
  },
  {
    id: "instance",
    title: "Instance",
    icon: Calendar,
  },
  {
    id: "franchise",
    title: "Franchise",
    icon: MapPin,
  },
  {
    id: "offering-status",
    title: "Offering Status",
    icon: Package,
  },
  {
    id: "enrollment",
    title: "Enrollment",
    icon: ShoppingCart,
  },
]

export default function AdminGuidePage() {
  const [activeSection, setActiveSection] = useState<string>("overview")

  useEffect(() => {
    const handleScroll = () => {
      const sections = tableOfContents.map(item => item.id)
      const scrollPosition = window.scrollY + 200 // Offset for better UX

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = document.getElementById(sections[i])
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(sections[i])
          break
        }
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      const offset = 100 // Account for fixed header
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - offset

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      })
    }
  }

  return (
    <div className="flex gap-8 container mx-auto py-8 px-4 max-w-7xl">
      {/* Left Sidebar Navigation */}
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Table of Contents</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <nav className="space-y-1 p-4">
              {tableOfContents.map((item) => {
                const Icon = item.icon
                const isActive = activeSection === item.id
                
                return (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      isActive 
                        ? "bg-accent text-accent-foreground font-medium" 
                        : "text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="text-left">{item.title}</span>
                  </button>
                )
              })}
            </nav>
          </CardContent>
        </Card>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Admin Guide</h1>
        <p className="text-muted-foreground text-lg">
          Understanding the Offering-Series-Instance relationship and workflow
        </p>
      </div>

      {/* Overview Section */}
      <section id="overview" className="scroll-mt-24">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Understanding the Offering-Series-Instance relationship and workflow
            </CardTitle>
          <CardDescription>
            The course system is built on a simplified hierarchical structure that allows maximum flexibility and reusability
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The system follows a three-level hierarchy: <strong>Offering</strong> → <strong>Series</strong> → <strong>Instance</strong>.
              This simplified design allows course content to be created once and reused across different programs, locations, and time periods without the need for an intermediate Assignment layer.
            </p>
            
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Key Design Principles:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><strong>Offering</strong> is completely independent and global - contains only course content, no binding to categories, franchises, or series</li>
                <li><strong>Series</strong> must belong to a <strong>Category</strong> - each series is part of a category (e.g., Courses, Camps, Workshops)</li>
                <li><strong>Instance</strong> directly links Offering to Series - contains specific dates, times, capacity, and other instance-specific information</li>
                <li><strong>Cancellation Policy</strong> is managed at the Franchise level - all instances within a franchise share the same policy</li>
              </ul>
            </div>
          </div>
        </CardContent>
        </Card>
      </section>

      {/* Hierarchy Diagram */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>System Hierarchy</CardTitle>
          <CardDescription>
            Visual representation of the relationship structure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col items-center space-y-3">
              {/* Level 1: Offering */}
              <div className="flex items-center gap-3 bg-primary/10 p-4 rounded-lg w-full max-w-md">
                <Package className="h-6 w-6 text-primary" />
                <div className="flex-1">
                  <div className="font-semibold text-lg">Offering</div>
                  <div className="text-sm text-muted-foreground">Course content (name, description, base price, etc.)</div>
                  <Badge variant="outline" className="mt-1">Global & Independent</Badge>
                </div>
              </div>

              <ArrowRight className="h-5 w-5 text-muted-foreground" />

              {/* Level 2: Category & Series */}
              <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg w-full max-w-md">
                <FolderTree className="h-6 w-6 text-blue-600" />
                <div className="flex-1">
                  <div className="font-semibold text-lg">Category</div>
                  <div className="text-sm text-muted-foreground">Course type (Courses, Camps, Workshops)</div>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg w-full max-w-md">
                <List className="h-6 w-6 text-blue-600" />
                <div className="flex-1">
                  <div className="font-semibold text-lg">Series</div>
                  <div className="text-sm text-muted-foreground">Program/Session (e.g., "2025 Winter Courses")</div>
                  <Badge variant="outline" className="mt-1">Belongs to Category</Badge>
                </div>
              </div>

              <ArrowRight className="h-5 w-5 text-muted-foreground" />

              {/* Level 3: Instance */}
              <div className="flex items-center gap-3 bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg w-full max-w-md">
                <Calendar className="h-6 w-6 text-purple-600" />
                <div className="flex-1">
                  <div className="font-semibold text-lg">Instance</div>
                  <div className="text-sm text-muted-foreground">Actual class with dates, times, capacity</div>
                  <Badge variant="outline" className="mt-1">Directly links Offering + Series</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Explanation */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Offering */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Offering
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              An <strong>Offering</strong> contains the course content and properties:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Offering name and description</li>
              <li>Target audience description</li>
              <li>Learning outcomes</li>
              <li>Prerequisites</li>
              <li>Base price and currency</li>
              <li>Poster image</li>
              <li>Subcategory tags (optional)</li>
            </ul>
            <div className="bg-muted p-3 rounded text-sm">
              <strong>Key Point:</strong> Offering is completely independent and global. It can be reused across multiple Series, Categories, and Franchises. Only <strong>published</strong> offerings can be used to create instances.
            </div>
          </CardContent>
        </Card>

        {/* Category & Series */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              Category & Series
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              <strong>Category</strong> represents the course type (Courses, Camps, Workshops).
            </p>
            <p className="text-sm">
              <strong>Series</strong> is a program or session within a Category (e.g., "2025 Winter Courses").
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Series must belong to a Category</li>
              <li>Series can have start/end dates</li>
              <li>Series can be associated with a Franchise</li>
            </ul>
            <div className="bg-muted p-3 rounded text-sm">
              <strong>Key Point:</strong> Series organizes courses by time period and program.
            </div>
          </CardContent>
        </Card>

        {/* Instance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Instance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              An <strong>Instance</strong> is the actual class that students can enroll in:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Directly links to an Offering (must be published)</li>
              <li>Must belong to a Series (which belongs to a Category)</li>
              <li>Has specific dates and times</li>
              <li>Has capacity (max students)</li>
              <li>Contains instance-specific information (session count, duration, age range, etc.)</li>
              <li>Can override Offering's base price</li>
              <li>Inherits cancellation policy from Franchise</li>
            </ul>
            <div className="bg-muted p-3 rounded text-sm">
              <strong>Key Point:</strong> This is where students actually enroll and attend classes. Instance-specific details (like session count, duration, age range) are set here, not in the Offering.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflow Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Typical Workflow</CardTitle>
          <CardDescription>
            Step-by-step process for setting up courses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Create an Offering</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Go to <strong>Content Admin</strong> → <strong>Offerings</strong> → Click "Add New Offering" → Fill in offering details:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                  <li>Name, description, poster image</li>
                  <li>Target audience, learning outcomes, prerequisites</li>
                  <li>Base price and currency</li>
                  <li>Offering type (Course, Camp, Workshop, etc.)</li>
                  <li>Set status to <strong>published</strong> (required to create instances)</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Result:</strong> Offering is created and available globally. Only published offerings can be used to create instances.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Create Category and Series</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Go to <strong>Settings</strong> → <strong>Categories</strong> → Create a Category (e.g., "Courses")<br />
                  Then go to <strong>Content Admin</strong> → <strong>Programs</strong> → Create a Series (e.g., "2025 Winter Courses") and select the Category
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Result:</strong> You now have a Category and Series to organize offerings
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Create Instances</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Go to <strong>Content Admin</strong> → <strong>Programs</strong> → Find your Series → Click "Add Instance" → Select:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                  <li>Offering (from Step 1, must be published)</li>
                  <li>Fill in instance-specific details:
                    <ul className="list-disc list-inside ml-4 mt-1">
                      <li>Start/end dates</li>
                      <li>Start/end times</li>
                      <li>Days of week</li>
                      <li>Session count, duration, age range (for Course type)</li>
                      <li>Max students</li>
                      <li>Location</li>
                      <li>Price override (optional)</li>
                    </ul>
                  </li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Result:</strong> Students can now enroll in this Instance! The instance automatically inherits the cancellation policy from the Franchise.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Examples Section */}
      <Card>
        <CardHeader>
          <CardTitle>Real-World Example</CardTitle>
          <CardDescription>
            How the system works in practice
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Scenario: Setting up "Robotics 101" for Winter 2025</h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <strong>1. Create Offering:</strong>
                  <ul className="list-disc list-inside ml-4 mt-1 text-muted-foreground">
                    <li>Name: "Robotics 101"</li>
                    <li>Description: "Introduction to robotics..."</li>
                    <li>Base Price: $299</li>
                    <li>Offering Type: "Course"</li>
                    <li>Status: <strong>Published</strong> (required to create instances)</li>
                    <li>Subcategory: "RoboQuests"</li>
                  </ul>
                </div>

                <div>
                  <strong>2. Create Category & Series:</strong>
                  <ul className="list-disc list-inside ml-4 mt-1 text-muted-foreground">
                    <li>Category: "Courses"</li>
                    <li>Series: "2025 Winter Courses" (belongs to "Courses" category)</li>
                  </ul>
                </div>

                <div>
                  <strong>3. Create Instances:</strong>
                  <ul className="list-disc list-inside ml-4 mt-1 text-muted-foreground">
                    <li>Select Offering: "Robotics 101"</li>
                    <li>Select Series: "2025 Winter Courses"</li>
                    <li>Instance A: Mon/Wed/Fri, 9am-12pm, Jan 6 - Feb 28, 10 sessions, 3 hours each, Max 20 students</li>
                    <li>Instance B: Tue/Thu, 2pm-5pm, Jan 7 - Feb 27, 10 sessions, 3 hours each, Max 15 students</li>
                  </ul>
                </div>

                <div className="bg-background p-3 rounded border-l-4 border-primary">
                  <strong>Result:</strong> Students can now enroll in either Instance A or Instance B. 
                  Both instances share the same Offering content but have different schedules, session counts, and capacities.
                  The cancellation policy is inherited from the Franchise.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Important Notes */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Important Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex gap-2">
              <Badge variant="outline" className="shrink-0">Note 1</Badge>
              <p className="text-muted-foreground">
                <strong>One Offering, Multiple Uses:</strong> The same Offering can be used to create instances in different Series, 
                Categories, and Franchises, allowing you to offer the same course content across different programs, locations, and time periods.
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="shrink-0">Note 2</Badge>
              <p className="text-muted-foreground">
                <strong>Offering Must Be Published:</strong> Only offerings with status <strong>published</strong> can be used to create instances. 
                Draft offerings cannot be used until they are published.
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="shrink-0">Note 3</Badge>
              <p className="text-muted-foreground">
                <strong>Instance-Specific Information:</strong> Instance-specific details (like session count, duration, age range, target grades) 
                are set when creating the instance, not in the offering. This allows the same offering to have different configurations for different instances.
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="shrink-0">Note 4</Badge>
              <p className="text-muted-foreground">
                <strong>Cancellation Policy:</strong> Cancellation policies are managed at the Franchise level. All instances within a franchise 
                share the same cancellation policy, ensuring consistency across offerings.
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="shrink-0">Note 5</Badge>
              <p className="text-muted-foreground">
                <strong>Offering Type Filtering:</strong> When creating an instance from a Series, only offerings that match the Series' Category 
                offering type are displayed. This ensures consistency between offerings and their parent categories.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instance Section */}
      <section id="instance" className="scroll-mt-24 mt-12">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Instance Management
            </CardTitle>
            <CardDescription>
              Understanding how Course Instances work and how to manage them
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">What is an Instance?</h3>
              <p className="text-sm text-muted-foreground mb-3">
                An <strong>Instance</strong> is the actual class that students can enroll in. It represents a specific 
                occurrence of an offering with concrete dates, times, location, capacity, and instance-specific information.
              </p>
              
              <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                <p><strong>Key Characteristics:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Directly linked to a published Offering</li>
                  <li>Must belong to a Series (which belongs to a Category)</li>
                  <li>Has specific start and end dates</li>
                  <li>Has start and end times</li>
                  <li>Has days of week (e.g., Monday, Wednesday, Friday)</li>
                  <li>Contains instance-specific information (session count, duration, age range, target grades)</li>
                  <li>Has maximum student capacity</li>
                  <li>Can override the Offering's base price</li>
                  <li>Inherits cancellation policy from the Franchise</li>
                  <li>Supports iCalendar rules for recurring schedules</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Instance Status</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="border rounded-lg p-3">
                  <Badge variant="outline" className="mb-2">scheduled</Badge>
                  <p className="text-sm text-muted-foreground">Instance is scheduled but not yet started</p>
                </div>
                <div className="border rounded-lg p-3">
                  <Badge variant="outline" className="mb-2">ongoing</Badge>
                  <p className="text-sm text-muted-foreground">Instance is currently in progress</p>
                </div>
                <div className="border rounded-lg p-3">
                  <Badge variant="outline" className="mb-2">completed</Badge>
                  <p className="text-sm text-muted-foreground">Instance has finished</p>
                </div>
                <div className="border rounded-lg p-3">
                  <Badge variant="outline" className="mb-2">cancelled</Badge>
                  <p className="text-sm text-muted-foreground">Instance was cancelled</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Creating an Instance</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Go to <strong>Content Admin</strong> → <strong>Programs</strong> in the admin menu</li>
                <li>Find the Series you want to add an instance to</li>
                <li>Click "Add Instance" button</li>
                <li>Select an Offering (must be published):
                  <ul className="list-disc list-inside ml-6 mt-1">
                    <li>Only offerings matching the Series' Category offering type are shown</li>
                    <li>You can filter by offering type or search by name</li>
                  </ul>
                </li>
                <li>Fill in the instance details (fields vary by offering type):
                  <ul className="list-disc list-inside ml-6 mt-1">
                    <li>Start and end dates</li>
                    <li>Start and end times</li>
                    <li>Days of week</li>
                    <li>Session count, duration, age range (for Course type)</li>
                    <li>Maximum students</li>
                    <li>Location</li>
                    <li>Price override (optional)</li>
                    <li>Other type-specific fields (e.g., drop-in options for Workshops)</li>
                  </ul>
                </li>
                <li>Confirm and create the instance</li>
              </ol>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
              <p className="text-sm">
                <strong>💡 Tip:</strong> You can create multiple instances for the same Offering in different Series, allowing you to offer 
                the same course content at different times, locations, or with different configurations. Each instance maintains its own capacity and enrollment.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Franchise Section */}
      <section id="franchise" className="scroll-mt-24 mt-12">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Franchise System
            </CardTitle>
            <CardDescription>
              Understanding the multi-tenant Franchise architecture
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">What is a Franchise?</h3>
              <p className="text-sm text-muted-foreground mb-3">
                A <strong>Franchise</strong> represents a city-level sub-site or operational entity. It allows the system 
                to support multiple locations while maintaining unified branding and code.
              </p>
              
              <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                <p><strong>Franchise Properties:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong>Code:</strong> Unique identifier (e.g., "bellevue", "issaquah")</li>
                  <li><strong>Name:</strong> Display name (e.g., "Bellevue Robotics Academy")</li>
                  <li><strong>Timezone:</strong> Local timezone (e.g., "America/Los_Angeles")</li>
                  <li><strong>Branding Config:</strong> Custom logo, colors, contact info, social links</li>
                  <li><strong>Primary Domain:</strong> Optional subdomain (e.g., "bellevue.blazeroboticsacademy.org")</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Franchise Hierarchy</h3>
              <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
                <div className="font-semibold">Franchise (City/Region)</div>
                <div className="ml-4">
                  <div>├── Cancellation Policy (shared by all instances)</div>
                  <div>├── Course Locations (Campuses)</div>
                  <div>├── Course Series (Programs/Sessions)</div>
                  <div>│   └── Instances</div>
                  <div>└── Enrollments (Student registrations)</div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Cancellation Policy</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Each Franchise has its own <strong>cancellation policy</strong> that applies to all instances within that franchise. 
                This ensures consistency across all offerings and instances.
              </p>
              <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                <p><strong>Key Points:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Cancellation policy is managed at the Franchise level</li>
                  <li>All instances within a franchise share the same policy</li>
                  <li>Policy is displayed to students when viewing instance details</li>
                  <li>You can edit the policy in <strong>Settings</strong> → <strong>Franchises</strong></li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">How Franchise Works</h3>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div>
                  <strong>1. Data Isolation:</strong> Each Franchise has its own Series, Locations, and Instances. 
                  Data is filtered by Franchise to ensure users only see relevant content.
                </div>
                <div>
                  <strong>2. Series Association:</strong> Course Series belong to a Franchise. When creating a Series, 
                  you can optionally associate it with a Franchise.
                </div>
                <div>
                  <strong>3. Location Association:</strong> Course Locations belong to a Franchise. Each Location 
                  is tied to a specific Franchise.
                </div>
                <div>
                  <strong>4. Instance Inheritance:</strong> Instances inherit Franchise information (including cancellation policy) 
                  through their Series → Franchise relationship.
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Managing Franchises</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Go to <strong>Settings</strong> → <strong>Franchises</strong> in the admin menu</li>
                <li>View all franchises or create a new one</li>
                <li>Configure franchise settings:
                  <ul className="list-disc list-inside ml-6 mt-1">
                    <li>Code and name</li>
                    <li>Timezone</li>
                    <li>Branding configuration (logo, colors, contact info)</li>
                    <li>Primary domain (for subdomain routing)</li>
                    <li><strong>Cancellation Policy</strong> (important: applies to all instances)</li>
                  </ul>
                </li>
                <li>Associate Locations and Series with the Franchise</li>
              </ol>
            </div>

            <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg">
              <p className="text-sm">
                <strong>💡 Tip:</strong> The Franchise system enables multi-tenant operations where each city/region 
                can have its own programs, locations, and branding while sharing the same course content.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Offering Section */}
      <section id="offering" className="scroll-mt-24 mt-12">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Offering Management
            </CardTitle>
            <CardDescription>
              Understanding offerings and how to create and manage them
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">What is an Offering?</h3>
              <p className="text-sm text-muted-foreground mb-3">
                An <strong>Offering</strong> is a global, independent course content template that can be reused across different 
                Series, Categories, and Franchises. It contains the course description, learning outcomes, prerequisites, and base price.
              </p>
              
              <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                <p><strong>Offering Contains:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Name, description, and poster image</li>
                  <li>Target audience description</li>
                  <li>Learning outcomes</li>
                  <li>Prerequisites</li>
                  <li>Base price and currency</li>
                  <li>Offering type (Course, Camp, Workshop, Gift Card, etc.)</li>
                  <li>Subcategory tags (optional)</li>
                </ul>
                <p className="mt-2"><strong>Offering Does NOT Contain:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Instance-specific information (session count, duration, age range)</li>
                  <li>Cancellation policy (managed at Franchise level)</li>
                  <li>Binding to specific Series, Category, or Franchise</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Creating an Offering</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Go to <strong>Content Admin</strong> → <strong>Offerings</strong> in the admin menu</li>
                <li>Click "Add New Offering"</li>
                <li>Fill in offering details:
                  <ul className="list-disc list-inside ml-6 mt-1">
                    <li>Name, slug, description</li>
                    <li>Poster image (optional)</li>
                    <li>Offering type (Course, Camp, Workshop, etc.)</li>
                    <li>Target audience, learning outcomes, prerequisites</li>
                    <li>Base price and currency</li>
                    <li>Subcategory tags (optional)</li>
                  </ul>
                </li>
                <li>Set status to <strong>published</strong> to enable instance creation</li>
                <li>Save the offering</li>
              </ol>
            </div>

            <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg">
              <p className="text-sm">
                <strong>💡 Tip:</strong> Offerings are global and independent. Once created and published, the same offering 
                can be used to create instances in different Series, Categories, and Franchises, each with its own specific configuration.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Offering Status Section */}
      <section id="offering-status" className="scroll-mt-24 mt-12">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Offering Status
            </CardTitle>
            <CardDescription>
              Understanding offering statuses and how they affect availability
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Offering Status Types</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Offerings have different statuses that control their visibility and ability to create instances.
              </p>
              
              <div className="grid md:grid-cols-2 gap-3">
                <div className="border rounded-lg p-4">
                  <Badge variant="outline" className="mb-2">draft</Badge>
                  <p className="text-sm text-muted-foreground mb-2">
                    Offering is being created or edited. Not available for instance creation.
                  </p>
                  <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                    <li>Can be edited or deleted</li>
                    <li>Not shown in course catalog</li>
                    <li><strong>Cannot create instances</strong></li>
                  </ul>
                </div>
                
                <div className="border rounded-lg p-4">
                  <Badge variant="default" className="mb-2">published</Badge>
                  <p className="text-sm text-muted-foreground mb-2">
                    Offering is live and can be used to create instances. Students can enroll.
                  </p>
                  <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                    <li>Visible in course catalog</li>
                    <li><strong>Can create instances</strong></li>
                    <li>Students can enroll in instances</li>
                    <li>Cannot be deleted (must archive first)</li>
                  </ul>
                </div>
                
                <div className="border rounded-lg p-4">
                  <Badge variant="secondary" className="mb-2">suspended</Badge>
                  <p className="text-sm text-muted-foreground mb-2">
                    Offering is temporarily unavailable. Existing instances remain active.
                  </p>
                  <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                    <li>Not visible in course catalog</li>
                    <li>Cannot create new instances</li>
                    <li>Existing instances remain active</li>
                    <li>Can be edited and republished</li>
                  </ul>
                </div>
                
                <div className="border rounded-lg p-4">
                  <Badge variant="secondary" className="mb-2">archived</Badge>
                  <p className="text-sm text-muted-foreground mb-2">
                    Offering is no longer active but preserved for historical records.
                  </p>
                  <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                    <li>Not visible in course catalog</li>
                    <li>Cannot create new instances</li>
                    <li>Existing instances remain active</li>
                    <li>Cannot be edited</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Status Workflow</h3>
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">draft</Badge>
                  <ArrowRight className="h-4 w-4" />
                  <Badge variant="default">published</Badge>
                  <ArrowRight className="h-4 w-4" />
                  <Badge variant="secondary">suspended/archived</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Offerings typically start as draft, then are published when ready, and finally suspended or archived when no longer needed.
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Managing Offering Status</h3>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div>
                  <strong>Publishing an Offering:</strong>
                  <ol className="list-decimal list-inside ml-4 mt-1 space-y-1">
                    <li>Create or edit an offering in <strong>Content Admin</strong> → <strong>Offerings</strong></li>
                    <li>Set status to "published"</li>
                    <li>Offering becomes visible in the catalog</li>
                    <li>You can now create instances from this offering</li>
                  </ol>
                </div>
                <div>
                  <strong>Suspending an Offering:</strong>
                  <ol className="list-decimal list-inside ml-4 mt-1 space-y-1">
                    <li>Go to the offering in <strong>Content Admin</strong> → <strong>Offerings</strong></li>
                    <li>Change status to "suspended"</li>
                    <li>Offering is removed from public catalog</li>
                    <li>Existing instances remain active</li>
                    <li>No new instances can be created</li>
                  </ol>
                </div>
                <div>
                  <strong>Archiving an Offering:</strong>
                  <ol className="list-decimal list-inside ml-4 mt-1 space-y-1">
                    <li>Go to the offering in <strong>Content Admin</strong> → <strong>Offerings</strong></li>
                    <li>Change status to "archived"</li>
                    <li>Offering is removed from public catalog</li>
                    <li>Existing instances remain active</li>
                    <li>No new instances can be created</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg">
              <p className="text-sm">
                <strong>⚠️ Important:</strong> Only <strong>published</strong> offerings can be used to create instances. 
                Draft, suspended, and archived offerings cannot be used for instance creation. Only draft offerings can be deleted. 
                Published offerings must be archived first before deletion.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Enrollment Section */}
      <section id="enrollment" className="scroll-mt-24 mt-12">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Enrollment System
            </CardTitle>
            <CardDescription>
              Understanding how students enroll in courses and manage their registrations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Enrollment Statuses</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Enrollments go through different statuses as students progress through the registration and payment process.
              </p>
              
              <div className="grid md:grid-cols-2 gap-3">
                <div className="border rounded-lg p-3">
                  <Badge variant="outline" className="mb-2">cart</Badge>
                  <p className="text-sm text-muted-foreground">Added to cart, not yet checked out</p>
                </div>
                <div className="border rounded-lg p-3">
                  <Badge variant="outline" className="mb-2">reserved</Badge>
                  <p className="text-sm text-muted-foreground">Checked out, payment in progress</p>
                </div>
                <div className="border rounded-lg p-3">
                  <Badge variant="default" className="mb-2">enrolled</Badge>
                  <p className="text-sm text-muted-foreground">Payment completed, officially enrolled</p>
                </div>
                <div className="border rounded-lg p-3">
                  <Badge variant="secondary" className="mb-2">waitlisted</Badge>
                  <p className="text-sm text-muted-foreground">Instance is full, on waiting list</p>
                </div>
                <div className="border rounded-lg p-3">
                  <Badge variant="destructive" className="mb-2">cancelled</Badge>
                  <p className="text-sm text-muted-foreground">Enrollment was cancelled</p>
                </div>
                <div className="border rounded-lg p-3">
                  <Badge variant="secondary" className="mb-2">completed</Badge>
                  <p className="text-sm text-muted-foreground">Course instance has finished</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Enrollment Workflow</h3>
              <div className="bg-muted p-4 rounded-lg space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
                  <div>
                    <strong>Add to Cart:</strong> Student adds instance to cart (status: <Badge variant="outline" className="text-xs">cart</Badge>)
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 ml-3" />
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
                  <div>
                    <strong>Checkout:</strong> Student proceeds to checkout (status: <Badge variant="outline" className="text-xs">reserved</Badge>)
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 ml-3" />
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</div>
                  <div>
                    <strong>Payment:</strong> Student completes payment (status: <Badge variant="default" className="text-xs">enrolled</Badge>)
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 ml-3" />
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</div>
                  <div>
                    <strong>Attend:</strong> Student attends the course instance
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 ml-3" />
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">5</div>
                  <div>
                    <strong>Complete:</strong> Instance ends (status: <Badge variant="secondary" className="text-xs">completed</Badge>)
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Payment Status</h3>
              <div className="grid md:grid-cols-3 gap-3 text-sm">
                <div className="border rounded-lg p-3">
                  <Badge variant="outline" className="mb-2">unpaid</Badge>
                  <p className="text-muted-foreground">No payment yet</p>
                </div>
                <div className="border rounded-lg p-3">
                  <Badge variant="outline" className="mb-2">pending</Badge>
                  <p className="text-muted-foreground">Payment in progress</p>
                </div>
                <div className="border rounded-lg p-3">
                  <Badge variant="default" className="mb-2">paid</Badge>
                  <p className="text-muted-foreground">Payment completed</p>
                </div>
                <div className="border rounded-lg p-3">
                  <Badge variant="destructive" className="mb-2">failed</Badge>
                  <p className="text-muted-foreground">Payment failed</p>
                </div>
                <div className="border rounded-lg p-3">
                  <Badge variant="secondary" className="mb-2">refunded</Badge>
                  <p className="text-muted-foreground">Payment refunded</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Managing Enrollments</h3>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div>
                  <strong>Viewing Enrollments:</strong>
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li>Go to <strong>Enrollments</strong> in the admin menu</li>
                    <li>Filter by status, instance, or user</li>
                    <li>View enrollment details and payment information</li>
                  </ul>
                </div>
                <div>
                  <strong>Admin Actions:</strong>
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li>Update enrollment status</li>
                    <li>Process refunds</li>
                    <li>Cancel enrollments</li>
                    <li>Move students from waitlist to enrolled</li>
                    <li>View enrollment history</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg">
              <p className="text-sm">
                <strong>💡 Tip:</strong> The enrollment system automatically manages capacity. When an instance reaches 
                max capacity, new enrollments are placed on the waitlist. If a spot opens up, waitlisted students 
                are notified automatically.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
      </div>
    </div>
  )
}

