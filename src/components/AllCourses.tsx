'use client'
import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Search, Filter, ArrowRight, Sparkles } from "lucide-react";

interface Course {
  id: string;
  title: string;
  type: 'RoboQuest' | 'LaunchPad' | 'RoboChamps';
  gradeLevel: string;
  slug?: string;
  featured?: boolean;
}

const allCourses: Course[] = [
  // Grade K-2
  { id: '1', title: "Mars Math with VEX GO", type: "RoboQuest", gradeLevel: "1-3", slug: "rq-go-mars", featured: true },
  { id: '2', title: "Introduction to Robotics with VEX GO", type: "RoboQuest", gradeLevel: "K-2", slug: "rq-go-intro" },
  
  // Grade 3-5
  { id: '3', title: "Introduction to Python via VEX IQ", type: "RoboChamps", gradeLevel: "4-6", featured: true },
  { id: '4', title: "Mastery Robotics Programming", type: "RoboChamps", gradeLevel: "3-5" },
  { id: '5', title: "Mastery Lifts & Arms with VEX IQ", type: "RoboChamps", gradeLevel: "3-5, 6-8" },
  { id: '6', title: "Mastery Drivetrains with VEX IQ", type: "RoboChamps", gradeLevel: "3-5, 6-8" },
  { id: '7', title: "Introduction to Programming via VEX IQ", type: "LaunchPad", gradeLevel: "3-5" },
  { id: '8', title: "Introduction to Robotics with VEX IQ", type: "LaunchPad", gradeLevel: "3-4, 5-7" },
  { id: '9', title: "Mars Math with VEX GO", type: "RoboQuest", gradeLevel: "1-3" },
  
  // Grade 6-7
  { id: '10', title: "VEX IQ to VEX V5 Transition Readiness", type: "RoboChamps", gradeLevel: "6-8", featured: true },
  { id: '11', title: "Introduction to C++ via VEX V5", type: "RoboChamps", gradeLevel: "6-8" },
  { id: '12', title: "Introduction to Python via VEX IQ", type: "RoboChamps", gradeLevel: "4-6" },
  { id: '13', title: "Mastery Lifts & Arms with VEX V5", type: "RoboChamps", gradeLevel: "6-8" },
  { id: '14', title: "Mastery Lifts & Arms with VEX IQ", type: "RoboChamps", gradeLevel: "3-5, 6-8" },
  { id: '15', title: "Mastery Drivetrains with VEX IQ", type: "RoboChamps", gradeLevel: "3-5, 6-8" },
  { id: '16', title: "Mastery Drivetrains with VEX V5", type: "RoboChamps", gradeLevel: "6-8" },
  { id: '17', title: "Introduction to Robotics with VEX V5", type: "LaunchPad", gradeLevel: "6-8, 9-11" },
  { id: '18', title: "Introduction to Robotics with VEX IQ", type: "LaunchPad", gradeLevel: "3-4, 5-7" },
  
  // Grade 8-10
  { id: '19', title: "Introduction to C++ via VEX V5", type: "RoboChamps", gradeLevel: "6-8", featured: true },
  { id: '20', title: "Mastery Lifts & Arms with VEX V5", type: "RoboChamps", gradeLevel: "6-8" },
  { id: '21', title: "Mastery Lifts & Arms with VEX IQ", type: "RoboChamps", gradeLevel: "3-5, 6-8" },
  { id: '22', title: "Mastery Drivetrains with VEX IQ", type: "RoboChamps", gradeLevel: "3-5, 6-8" },
  { id: '23', title: "Mastery Drivetrains with VEX V5", type: "RoboChamps", gradeLevel: "6-8" },
  { id: '24', title: "Introduction to Robotics with VEX V5", type: "LaunchPad", gradeLevel: "6-8, 9-11" },
];

const gradeGroups = [
  { label: "K-2", grades: ["K-2", "1-3"] },
  { label: "3-5", grades: ["3-5", "3-4, 5-7", "4-6"] },
  { label: "6-7", grades: ["6-8", "3-5, 6-8", "4-6", "6-8, 9-11"] },
  { label: "8-10", grades: ["6-8", "3-5, 6-8", "6-8, 9-11"] },
];

const getTypeColor = (type: Course['type']) => {
  switch (type) {
    case 'RoboQuest':
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
    case 'LaunchPad':
      return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
    case 'RoboChamps':
      return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20';
    default:
      return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20';
  }
};

export const AllCourses = () => {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredCourses = useMemo(() => {
    return allCourses.filter((course) => {
      const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = !selectedType || course.type === selectedType;
      const matchesGrade = !selectedGrade || 
        gradeGroups.find(g => g.label === selectedGrade)?.grades.includes(course.gradeLevel);
      return matchesSearch && matchesType && matchesGrade;
    });
  }, [searchQuery, selectedType, selectedGrade]);

  const coursesByGrade = useMemo(() => {
    const grouped: Record<string, Course[]> = {};
    gradeGroups.forEach((group) => {
      grouped[group.label] = filteredCourses.filter((course) =>
        group.grades.includes(course.gradeLevel)
      );
    });
    return grouped;
  }, [filteredCourses]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedType(null);
    setSelectedGrade(null);
  };

  const hasActiveFilters = searchQuery || selectedType || selectedGrade;

  if (!mounted) {
    return (
      <div className="min-h-screen">
        <section className="container mx-auto px-4 py-12 md:py-20">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Winter 2026
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-2">
              Robotics | Programming | 3D Design & Printing
            </p>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mt-6">
              Welcome to our Winter 2026 Robotics & Programming Programs! Designed for students in grades K-12, 
              our courses focus on skill-building and practical learning in robotics, providing a structured 
              learning path from exploration to competition readiness.
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Winter 2026
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-2">
            Robotics | Programming | 3D Design & Printing
          </p>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mt-6">
            Welcome to our Winter 2026 Robotics & Programming Programs! Designed for students in grades K-12, 
            our courses focus on skill-building and practical learning in robotics, providing a structured 
            learning path from exploration to competition readiness.
          </p>
        </div>

        {/* Search and Filter Section */}
        <div className="max-w-6xl mx-auto mb-12">
          <div className="bg-muted/50 rounded-lg p-6 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Filter by:</span>
              </div>
              
              {/* Type Filter */}
              <div className="flex flex-wrap gap-2">
                {(['RoboQuest', 'LaunchPad', 'RoboChamps'] as const).map((type) => (
                  <Button
                    key={type}
                    variant={selectedType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedType(selectedType === type ? null : type)}
                    className="h-8"
                  >
                    {type}
                  </Button>
                ))}
              </div>

              {/* Grade Filter */}
              <div className="flex flex-wrap gap-2">
                {gradeGroups.map((group) => (
                  <Button
                    key={group.label}
                    variant={selectedGrade === group.label ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedGrade(selectedGrade === group.label ? null : group.label)}
                    className="h-8"
                  >
                    Grades {group.label}
                  </Button>
                ))}
              </div>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-8 ml-auto"
                >
                  Clear Filters
                </Button>
              )}
            </div>

            {/* Results Count */}
            <div className="text-sm text-muted-foreground">
              Showing {filteredCourses.length} of {allCourses.length} courses
            </div>
          </div>
        </div>

        {/* Courses by Grade Level */}
        {gradeGroups.map((group) => {
          const courses = coursesByGrade[group.label];
          if (courses.length === 0) return null;

          return (
            <div key={group.label} className="max-w-6xl mx-auto mb-16">
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-2xl md:text-3xl font-bold">
                  Grade Levels {group.label}
                </h2>
                <Badge variant="secondary" className="text-sm">
                  {courses.length} {courses.length === 1 ? 'course' : 'courses'}
                </Badge>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <Card
                    key={course.id}
                    className={`flex flex-col hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${
                      course.featured ? 'ring-2 ring-primary/20' : ''
                    }`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Badge
                          variant="outline"
                          className={`${getTypeColor(course.type)} border text-xs`}
                        >
                          {course.type}
                        </Badge>
                        {course.featured && (
                          <Badge variant="outline" className="border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-400">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Featured
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg leading-tight min-h-[3rem]">
                        {course.title}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        Grades {course.gradeLevel}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                      <div className="mt-auto pt-4">
                        <Button
                          variant="ghost"
                          className="w-full justify-between group"
                          asChild
                        >
                          <a
                            href={course.slug ? `/course-catalog/${course.slug}` : "https://www.blazeroboticsacademy.org/winter2026"}
                            {...(course.slug ? {} : { target: "_blank", rel: "noreferrer noopener" })}
                          >
                            Learn More
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}

        {/* No Results */}
        {filteredCourses.length === 0 && (
          <div className="max-w-2xl mx-auto text-center py-16">
            <p className="text-xl text-muted-foreground mb-4">
              No courses found matching your criteria.
            </p>
            <Button onClick={clearFilters} variant="outline">
              Clear Filters
            </Button>
          </div>
        )}

        {/* CTA Section */}
        <div className="max-w-4xl mx-auto mt-20 mb-12">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl md:text-3xl mb-2">
                Ready to Get Started?
              </CardTitle>
              <CardDescription className="text-base">
                Explore our comprehensive curriculum designed for students from K-12
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <a href="https://www.blazeroboticsacademy.org/winter2026" target="_blank" rel="noreferrer noopener">
                  Enroll Now
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="/#courses">
                  View Featured Courses
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

