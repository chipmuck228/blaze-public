'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, FolderTree, List, Link as LinkIcon, Calendar, ArrowRight, Info, MapPin, Package, ShoppingCart } from "lucide-react"
import { cn } from "@/lib/utils"

const tableOfContents = [
  {
    id: "overview",
    title: "Course-Series-Assignment-Instance",
    icon: Info,
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
    id: "stock-status",
    title: "Stock Status",
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
          Understanding the Course-Series-Assignment-Instance relationship and workflow
        </p>
      </div>

      {/* Overview Section */}
      <section id="overview" className="scroll-mt-24">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Understanding the Course-Series-Assignment-Instance relationship and workflow
            </CardTitle>
          <CardDescription>
            The course system is built on a hierarchical structure that allows maximum flexibility and reusability
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The system follows a four-level hierarchy: <strong>Course</strong> → <strong>Series</strong> → <strong>Assignment</strong> → <strong>Instance</strong>.
              This design allows course content to be created once and reused across different programs, locations, and time periods.
            </p>
            
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Key Design Principles:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><strong>Course</strong> is completely independent - contains only course content, no binding to categories</li>
                <li><strong>Series</strong> must belong to a <strong>Category</strong> - each series is part of a category (e.g., Courses, Camps, Workshops)</li>
                <li><strong>Assignment</strong> links Course to Category/Series/Location - enables flexible distribution</li>
                <li><strong>Instance</strong> is the actual class - specific dates, times, and capacity for enrollment</li>
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
              {/* Level 1: Course */}
              <div className="flex items-center gap-3 bg-primary/10 p-4 rounded-lg w-full max-w-md">
                <BookOpen className="h-6 w-6 text-primary" />
                <div className="flex-1">
                  <div className="font-semibold text-lg">Course</div>
                  <div className="text-sm text-muted-foreground">Course content (name, description, price, etc.)</div>
                  <Badge variant="outline" className="mt-1">Independent</Badge>
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

              {/* Level 3: Assignment */}
              <div className="flex items-center gap-3 bg-green-50 dark:bg-green-950/20 p-4 rounded-lg w-full max-w-md">
                <LinkIcon className="h-6 w-6 text-green-600" />
                <div className="flex-1">
                  <div className="font-semibold text-lg">Assignment</div>
                  <div className="text-sm text-muted-foreground">Links Course to Category/Series/Location</div>
                  <Badge variant="outline" className="mt-1">Required: Course + Category + Series</Badge>
                </div>
              </div>

              <ArrowRight className="h-5 w-5 text-muted-foreground" />

              {/* Level 4: Instance */}
              <div className="flex items-center gap-3 bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg w-full max-w-md">
                <Calendar className="h-6 w-6 text-purple-600" />
                <div className="flex-1">
                  <div className="font-semibold text-lg">Instance</div>
                  <div className="text-sm text-muted-foreground">Actual class with dates, times, capacity</div>
                  <Badge variant="outline" className="mt-1">Students enroll here</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Explanation */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Course */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Course
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              A <strong>Course</strong> contains the course content and properties:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Course name and description</li>
              <li>Target audience and age range</li>
              <li>Learning outcomes</li>
              <li>Base price</li>
              <li>Subcategory tags (optional)</li>
            </ul>
            <div className="bg-muted p-3 rounded text-sm">
              <strong>Key Point:</strong> Course is completely independent and can be reused across multiple Series and Locations.
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

        {/* Assignment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Assignment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              An <strong>Assignment</strong> links a Course to a specific Category/Series combination:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Requires: Course + Category + Series</li>
              <li>Optional: Location (default campus)</li>
              <li>Display order within the Series</li>
            </ul>
            <div className="bg-muted p-3 rounded text-sm">
              <strong>Key Point:</strong> One Course can have multiple Assignments to different Series/Locations.
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
              <li>Must be linked to an Assignment</li>
              <li>Has specific dates and times</li>
              <li>Has capacity (max students)</li>
              <li>Can override Assignment's location</li>
              <li>Can override Course's base price</li>
            </ul>
            <div className="bg-muted p-3 rounded text-sm">
              <strong>Key Point:</strong> This is where students actually enroll and attend classes.
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
                <h3 className="font-semibold mb-2">Create a Course</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Go to <strong>Stocks</strong> → Click "Add Course" → Fill in course details (name, description, price, etc.)
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Result:</strong> Course is created but not yet available for enrollment (no Assignment yet)
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
                  Go to <strong>Categories</strong> → Create a Category (e.g., "Courses")<br />
                  Then go to <strong>Series</strong> → Create a Series (e.g., "2025 Winter Courses") and select the Category
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Result:</strong> You now have a Category and Series to organize courses
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Create an Assignment</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Go to <strong>Assignments</strong> → Click "Add Assignment" → Select:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                  <li>Course (from Step 1)</li>
                  <li>Category (from Step 2)</li>
                  <li>Series (from Step 2, must match Category)</li>
                  <li>Location (optional, default campus)</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Result:</strong> Course is now available in the selected Series
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                4
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Create Instances</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Go to <strong>Instances</strong> → Click "Add Instance" → Select the Assignment (from Step 3) → Fill in:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                  <li>Start/end dates</li>
                  <li>Start/end times</li>
                  <li>Days of week</li>
                  <li>Max students</li>
                  <li>Location (can override Assignment's location)</li>
                  <li>Price override (optional)</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Result:</strong> Students can now enroll in this Instance!
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
                  <strong>1. Create Course:</strong>
                  <ul className="list-disc list-inside ml-4 mt-1 text-muted-foreground">
                    <li>Name: "Robotics 101"</li>
                    <li>Description: "Introduction to robotics..."</li>
                    <li>Base Price: $299</li>
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
                  <strong>3. Create Assignment:</strong>
                  <ul className="list-disc list-inside ml-4 mt-1 text-muted-foreground">
                    <li>Course: "Robotics 101"</li>
                    <li>Category: "Courses"</li>
                    <li>Series: "2025 Winter Courses"</li>
                    <li>Location: "Bellevue Campus" (optional)</li>
                  </ul>
                </div>

                <div>
                  <strong>4. Create Instances:</strong>
                  <ul className="list-disc list-inside ml-4 mt-1 text-muted-foreground">
                    <li>Instance A: Mon/Wed/Fri, 9am-12pm, Jan 6 - Feb 28, Max 20 students</li>
                    <li>Instance B: Tue/Thu, 2pm-5pm, Jan 7 - Feb 27, Max 15 students</li>
                  </ul>
                </div>

                <div className="bg-background p-3 rounded border-l-4 border-primary">
                  <strong>Result:</strong> Students can now enroll in either Instance A or Instance B. 
                  Both instances share the same Course content but have different schedules.
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
                <strong>One Course, Multiple Uses:</strong> The same Course can be assigned to different Series, 
                allowing you to offer the same course content in different programs or time periods.
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="shrink-0">Note 2</Badge>
              <p className="text-muted-foreground">
                <strong>Assignment is Required:</strong> You cannot create an Instance without first creating an Assignment. 
                The Assignment links the Course to a specific Series.
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="shrink-0">Note 3</Badge>
              <p className="text-muted-foreground">
                <strong>Instance Flexibility:</strong> Each Instance can override the Assignment's location and the Course's base price, 
                giving you flexibility for special cases.
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="shrink-0">Note 4</Badge>
              <p className="text-muted-foreground">
                <strong>Series Must Match Category:</strong> When creating an Assignment, the Series must belong to the selected Category. 
                The system will filter Series options based on the selected Category.
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
                A <strong>Course Instance</strong> is the actual class that students can enroll in. It represents a specific 
                occurrence of a course with concrete dates, times, location, and capacity.
              </p>
              
              <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                <p><strong>Key Characteristics:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Must be linked to a Course Assignment</li>
                  <li>Has specific start and end dates</li>
                  <li>Has start and end times</li>
                  <li>Has days of week (e.g., Monday, Wednesday, Friday)</li>
                  <li>Has maximum student capacity</li>
                  <li>Can override the Assignment's default location</li>
                  <li>Can override the Course's base price</li>
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
                <li>Go to <strong>Instances</strong> in the admin menu</li>
                <li>Click "Add Instance"</li>
                <li>Select a Course Assignment (required)</li>
                <li>Fill in the instance details:
                  <ul className="list-disc list-inside ml-6 mt-1">
                    <li>Start and end dates</li>
                    <li>Start and end times</li>
                    <li>Days of week</li>
                    <li>Maximum students</li>
                    <li>Location (optional, can override Assignment's location)</li>
                    <li>Price override (optional)</li>
                  </ul>
                </li>
                <li>Save the instance</li>
              </ol>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
              <p className="text-sm">
                <strong>💡 Tip:</strong> You can create multiple instances for the same Assignment, allowing you to offer 
                the same course at different times or locations. Each instance maintains its own capacity and enrollment.
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
                  <div>├── Course Locations (Campuses)</div>
                  <div>├── Course Series (Programs/Sessions)</div>
                  <div>│   └── Course Assignments</div>
                  <div>│       └── Course Instances</div>
                  <div>└── Enrollments (Student registrations)</div>
                </div>
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
                  <strong>4. Instance Inheritance:</strong> Instances inherit Franchise information through their 
                  Assignment → Series → Franchise chain.
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Managing Franchises</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Go to <strong>Franchises</strong> in the admin menu</li>
                <li>View all franchises or create a new one</li>
                <li>Configure franchise settings:
                  <ul className="list-disc list-inside ml-6 mt-1">
                    <li>Code and name</li>
                    <li>Timezone</li>
                    <li>Branding configuration (logo, colors, contact info)</li>
                    <li>Primary domain (for subdomain routing)</li>
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

      {/* Stock Status Section */}
      <section id="stock-status" className="scroll-mt-24 mt-12">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Stock Status (Course Status)
            </CardTitle>
            <CardDescription>
              Understanding course statuses and how they affect availability
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Course Status Types</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Courses have different statuses that control their visibility and availability in the system.
              </p>
              
              <div className="grid md:grid-cols-2 gap-3">
                <div className="border rounded-lg p-4">
                  <Badge variant="outline" className="mb-2">draft</Badge>
                  <p className="text-sm text-muted-foreground mb-2">
                    Course is being created or edited. Not visible to public.
                  </p>
                  <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                    <li>Can be edited or deleted</li>
                    <li>Not shown in course catalog</li>
                    <li>Cannot create instances</li>
                  </ul>
                </div>
                
                <div className="border rounded-lg p-4">
                  <Badge variant="default" className="mb-2">published</Badge>
                  <p className="text-sm text-muted-foreground mb-2">
                    Course is live and visible to users. Can be enrolled.
                  </p>
                  <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                    <li>Visible in course catalog</li>
                    <li>Can create instances</li>
                    <li>Students can enroll</li>
                    <li>Cannot be deleted (must archive first)</li>
                  </ul>
                </div>
                
                <div className="border rounded-lg p-4">
                  <Badge variant="secondary" className="mb-2">archived</Badge>
                  <p className="text-sm text-muted-foreground mb-2">
                    Course is no longer active but preserved for historical records.
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
                  <Badge variant="secondary">archived</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Courses typically start as draft, then are published when ready, and finally archived when no longer needed.
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Managing Course Status</h3>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div>
                  <strong>Publishing a Course:</strong>
                  <ol className="list-decimal list-inside ml-4 mt-1 space-y-1">
                    <li>Create or edit a course in <strong>Stocks</strong></li>
                    <li>Set status to "published"</li>
                    <li>Course becomes visible in the catalog</li>
                    <li>You can now create Assignments and Instances</li>
                  </ol>
                </div>
                <div>
                  <strong>Archiving a Course:</strong>
                  <ol className="list-decimal list-inside ml-4 mt-1 space-y-1">
                    <li>Go to the course in <strong>Stocks</strong></li>
                    <li>Change status to "archived"</li>
                    <li>Course is removed from public catalog</li>
                    <li>Existing enrollments remain active</li>
                    <li>No new enrollments can be created</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg">
              <p className="text-sm">
                <strong>⚠️ Important:</strong> Only draft courses can be deleted. Published courses must be archived first 
                before deletion. This prevents accidental loss of data and maintains enrollment history.
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

