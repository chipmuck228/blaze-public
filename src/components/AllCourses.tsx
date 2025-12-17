'use client'
import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
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

interface ProgramCourse {
  id: string;
  title: string;
  gradeLevel: string;
  slug?: string;
}

interface Program {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  category?: {
    id: string;
    name: string;
    display_name: string;
  } | null;
  courses: ProgramCourse[];
}

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
  const [courses, setCourses] = useState<Course[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const franchise = searchParams.get("franchise");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setIsLoading(true);
        setError(null);
        if (franchise) {
          // Franchise 模式：按 Program/Series 维度加载
          const params = new URLSearchParams();
          params.set("franchise", franchise);
          const query = params.toString();
          const res = await fetch(`/api/programs${query ? `?${query}` : ""}`);
          if (!res.ok) {
            throw new Error("Failed to load programs");
          }
          const data = await res.json();
          setPrograms(data || []);
          setCourses([]);
        } else {
          // 全局模式：加载所有课程
          const res = await fetch(`/api/courses`);
          if (!res.ok) {
            throw new Error("Failed to load courses");
          }
          const data = await res.json();
          setCourses(data || []);
          setPrograms([]);
        }
      } catch (err: any) {
        console.error("Error fetching courses:", err);
        setError(err.message || "Failed to load courses");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourses();
  }, [franchise]);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
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

  const franchiseLabel = useMemo(() => {
    if (!franchise) return null;
    const code = franchise.toLowerCase();
    switch (code) {
      case "bellevue":
        return "Bellevue";
      case "belred":
        return "Bel-Red";
      case "issaquah":
        return "Issaquah";
      case "cherrycrest":
        return "Cherry Crest";
      default:
        return code.charAt(0).toUpperCase() + code.slice(1);
    }
  }, [franchise]);

  if (!mounted) {
    return (
      <div className="min-h-screen">
        <section className="container mx-auto px-4 py-12 md:py-20">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {franchiseLabel ? `Programs at ${franchiseLabel}` : "Course Catalog"}
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-2">
              Robotics | Programming | STEM
            </p>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mt-6">
              {franchiseLabel
                ? `Browse robotics and programming programs currently offered at our ${franchiseLabel} campus.`
                : "Browse all available robotics and programming courses across our campuses."}
            </p>
          </div>
        </section>
      </div>
    );
  }

  // Franchise 模式：按 Program/Series → Courses 视图展示
  if (franchise) {
    return (
      <div className="min-h-screen">
        <section className="container mx-auto px-4 py-12 md:py-20">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Programs at {franchiseLabel}
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-2">
              Robotics | Programming | STEM
            </p>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mt-6">
              Browse programs (series) and courses currently offered at our {franchiseLabel} campus.
            </p>
          </div>

          <div className="max-w-6xl mx-auto mb-8">
            <div className="bg-muted/50 rounded-lg p-6 space-y-4">
              {isLoading ? (
                <div className="text-sm text-muted-foreground">
                  Loading programs...
                </div>
              ) : error ? (
                <div className="text-sm text-destructive">
                  {error}
                </div>
              ) : null}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search programs or courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 text-base"
                />
              </div>
            </div>
          </div>

          {programs.length === 0 && !isLoading && !error ? (
            <div className="max-w-6xl mx-auto text-center text-muted-foreground py-16">
              No programs found for this campus yet.
            </div>
          ) : (
            <div className="max-w-6xl mx-auto space-y-10">
              {programs.map((program) => {
                // 简单搜索过滤：匹配 program 名称或课程标题
                const q = searchQuery.toLowerCase()
                const visibleCourses = q
                  ? program.courses.filter(
                      (c) =>
                        c.title.toLowerCase().includes(q) ||
                        program.display_name.toLowerCase().includes(q) ||
                        program.name.toLowerCase().includes(q)
                    )
                  : program.courses

                // 如果搜索时 Program 名称匹配，即使没有课程也显示 Program
                const programNameMatches = q && (
                  program.display_name.toLowerCase().includes(q) ||
                  program.name.toLowerCase().includes(q)
                )

                // 显示逻辑：
                // 1. 如果没有搜索关键词，即使没有课程也显示 Program
                // 2. 如果有搜索关键词，只有 Program 名称匹配或课程匹配时才显示
                if (visibleCourses.length === 0) {
                  // 没有可见课程时
                  if (q && !programNameMatches) {
                    // 有搜索关键词，但 Program 名称不匹配，则不显示
                    return null
                  }
                  // 否则显示（没有搜索关键词，或 Program 名称匹配搜索）
                }

                return (
                  <div key={program.id} className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <h2 className="text-2xl md:text-3xl font-bold">
                          {program.display_name}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          {program.category?.display_name
                            ? `${program.category.display_name} Program`
                            : "Program"}
                        </p>
                        {program.start_date && program.end_date && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(program.start_date).toLocaleDateString()} –{" "}
                            {new Date(program.end_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary" className="self-start md:self-auto">
                        {visibleCourses.length}{" "}
                        {visibleCourses.length === 1 ? "course" : "courses"}
                      </Badge>
                    </div>

                    {program.description && (
                      <p className="text-sm text-muted-foreground">
                        {program.description}
                      </p>
                    )}

                    {visibleCourses.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No courses available in this program.</p>
                        {q && (
                          <p className="text-sm mt-2">
                            Try adjusting your search terms.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {visibleCourses.map((course) => (
                          <Card
                            key={course.id}
                            className="flex flex-col hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                          >
                            <CardHeader>
                              <CardTitle className="text-lg leading-tight min-h-[3rem]">
                                {course.title}
                              </CardTitle>
                              {course.gradeLevel && (
                                <CardDescription className="mt-1">
                                  Grade level: {course.gradeLevel}
                                </CardDescription>
                              )}
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col justify-between">
                              <div className="mt-2 flex justify-between items-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs px-2"
                                  asChild
                                >
                                  <a
                                    href={
                                      course.slug
                                        ? `/course-catalog/${encodeURIComponent(
                                            course.slug
                                          )}`
                                        : `/course-catalog?id=${encodeURIComponent(
                                            course.id
                                          )}`
                                    }
                                  >
                                    <span className="flex items-center gap-1">
                                      <span>View Details</span>
                                      <ArrowRight className="h-3 w-3" />
                                    </span>
                                  </a>
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {franchiseLabel ? `Programs at ${franchiseLabel}` : "Course Catalog"}
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-2">
            Robotics | Programming | STEM
          </p>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mt-6">
            {franchiseLabel
              ? `Browse robotics and programming programs currently offered at our ${franchiseLabel} campus.`
              : "Browse all available robotics and programming courses across our campuses."}
          </p>
        </div>

        {/* Search and Filter Section */}
        <div className="max-w-6xl mx-auto mb-12">
          <div className="bg-muted/50 rounded-lg p-6 space-y-4">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">
                Loading courses...
              </div>
            ) : error ? (
              <div className="text-sm text-destructive">
                {error}
              </div>
            ) : null}
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
              Showing {filteredCourses.length} of {courses.length} courses
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

