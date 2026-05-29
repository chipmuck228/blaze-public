'use client'
import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Search, Filter, ArrowRight, Sparkles, MapPin, X, Calendar, Clock, Users, BookOpen } from "lucide-react";
import Image from "next/image";
import { PUBLIC_USER_AUTH_ENABLED } from "@/lib/public-user-auth";

interface Course {
  id: string;
  title: string;
  type: 'RoboQuest' | 'LaunchPad' | 'RoboChamps';
  gradeLevel: string;
  slug?: string;
  featured?: boolean;
  poster_url?: string | null;
}

interface Instance {
  id: string;
  assignment_id?: string;
  location_id?: string;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  max_students?: number;
  current_students?: number;
  available_spots: number;
  is_full: boolean;
  status: string;
  price_override?: number;
  location?: {
    id: string;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
  };
  offering?: {
    id: string;
    name: string;
    slug?: string;
    description?: string;
    poster_url?: string | null;
    offering_type?: string;
    base_price?: number;
  };
}

interface ProgramCourse {
  id: string;
  title: string;
  gradeLevel: string;
  slug?: string;
  instances?: Instance[];
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

interface Franchise {
  id: string;
  code: string;
  name: string;
}

export const AllCourses = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [isLoadingFranchises, setIsLoadingFranchises] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const franchise = searchParams.get("franchise");

  useEffect(() => {
    setMounted(true);
  }, []);

  // 获取所有 franchises
  useEffect(() => {
    const fetchFranchises = async () => {
      try {
        setIsLoadingFranchises(true);
        const res = await fetch("/api/public/franchises");
        if (!res.ok) {
          throw new Error("Failed to load franchises");
        }
        const data = await res.json();
        setFranchises(data || []);
      } catch (err: any) {
        console.error("Error fetching franchises:", err);
      } finally {
        setIsLoadingFranchises(false);
      }
    };

    fetchFranchises();
  }, []);

  // Phase 2: 用户偏好记忆 - 从 localStorage 读取并应用用户上次选择的 location
  useEffect(() => {
    if (mounted && !franchise && franchises.length > 0) {
      // 只有在没有 URL 参数时才应用偏好
      const preferredLocation = localStorage.getItem('preferred_location');
      if (preferredLocation) {
        // 验证该 location 是否仍然有效
        const isValidLocation = franchises.some(f => f.code === preferredLocation);
        if (isValidLocation) {
          // 使用 router.replace 避免添加到历史记录
          const params = new URLSearchParams(searchParams.toString());
          params.set("franchise", preferredLocation);
          router.replace(`/course-catalog?${params.toString()}`);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, franchise, franchises.length]);

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

  const handleEnroll = async (instanceId: string) => {
    if (!PUBLIC_USER_AUTH_ENABLED) return;
    if (!session?.user) {
      router.push('/login?callbackUrl=' + encodeURIComponent(window.location.pathname + window.location.search));
      return;
    }

    setIsEnrolling(instanceId);
    try {
      const response = await fetch('/api/enrollments/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ instance_id: instanceId }),
      });

      if (response.ok) {
        // 成功添加到购物车
        alert('Course added to cart successfully!');
        // 可选：刷新购物车数量或跳转到购物车页面
        router.push('/enrollments/cart');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add course to cart');
      }
    } catch (err) {
      console.error('Error adding to cart:', err);
      alert('Failed to add course to cart');
    } finally {
      setIsEnrolling(null);
    }
  };

  const hasActiveFilters = searchQuery || selectedType || selectedGrade;

  // Location 筛选器变化处理
  const handleLocationChange = (locationCode: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (locationCode === "all" || !locationCode) {
      params.delete("franchise");
      // Phase 2: 清除用户偏好
      localStorage.removeItem('preferred_location');
    } else {
      params.set("franchise", locationCode);
      // Phase 2: 保存用户偏好
      localStorage.setItem('preferred_location', locationCode);
    }
    router.push(`/course-catalog?${params.toString()}`);
  };

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
    const selectedFranchise = franchises.find(f => f.code === franchise);
    
    return (
      <div className="min-h-screen">
        <section className="container mx-auto px-4 py-12 md:py-20">
          <div className="max-w-4xl mx-auto text-center mb-8">
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
              {programs
                .filter((program) => program.id && typeof program.id === 'string' && program.id.trim() !== '')
                .map((program) => {
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
                  <div key={program.id || `program-${program.name}`} className="space-y-4">
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
                        {visibleCourses.reduce((sum, course) => sum + (course.instances?.length || 0), 0)}{" "}
                        {visibleCourses.reduce((sum, course) => sum + (course.instances?.length || 0), 0) === 1 ? "instance" : "instances"}
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
                      <div className="space-y-6">
                        {visibleCourses
                          .filter((course) => course.id && typeof course.id === 'string' && course.id.trim() !== '')
                          .map((course) => {
                          const instances = course.instances || []
                          const totalInstances = instances.length
                          
                          return (
                            <div key={course.id || `course-${course.title}`} className="space-y-3">
                              {/* Course Header */}
                              <div className="flex items-start justify-between gap-4 pb-2 border-b">
                                <div className="flex-1">
                                  <h3 className="text-lg font-semibold">{course.title}</h3>
                                  {course.gradeLevel && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      Grade level: {course.gradeLevel}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Instances List */}
                              {instances.length === 0 ? (
                                <div className="text-center py-4 text-sm text-muted-foreground">
                                  No instances available for this course.
                                </div>
                              ) : (
                                <div className="grid md:grid-cols-2 gap-4">
                                  {instances
                                    .filter((instance) => instance.id && typeof instance.id === 'string' && instance.id.trim() !== '') // 过滤掉没有 id 或空字符串的 instances
                                    .map((instance, index) => {
                                    const formatDate = (dateStr: string) => {
                                      return new Date(dateStr).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                      })
                                    }
                                    
                                    const formatTime = (timeStr?: string) => {
                                      if (!timeStr) return ''
                                      const [hours, minutes] = timeStr.split(':')
                                      const hour = parseInt(hours)
                                      const ampm = hour >= 12 ? 'PM' : 'AM'
                                      const displayHour = hour % 12 || 12
                                      return `${displayHour}:${minutes} ${ampm}`
                                    }

                                    return (
                                      <Card
                                        key={instance.id || `instance-${index}`}
                                        className="hover:shadow-md transition-all duration-200 overflow-hidden"
                                      >
                                        <CardContent className="p-4">
                                          <div className="flex gap-4">
                                            {/* Poster Image */}
                                            <div className="relative w-24 h-24 shrink-0 rounded-lg overflow-hidden">
                                              {instance.offering?.poster_url ? (
                                                <Image
                                                  src={instance.offering.poster_url}
                                                  alt={instance.offering.name || course.title}
                                                  fill
                                                  className="object-cover"
                                                  sizes="96px"
                                                  loading="lazy"
                                                />
                                              ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                                  <BookOpen className="h-8 w-8 text-primary/40" />
                                                </div>
                                              )}
                                            </div>
                                            
                                            {/* Instance Details */}
                                            <div className="flex-1 min-w-0 space-y-3">
                                              {/* Date Range */}
                                              <div className="flex items-center gap-2 text-sm">
                                                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                                                <span className="font-medium">
                                                  {formatDate(instance.start_date)} - {formatDate(instance.end_date)}
                                                </span>
                                              </div>

                                              {/* Time */}
                                              {(instance.start_time || instance.end_time) && (
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                  <Clock className="h-4 w-4 shrink-0" />
                                                  <span>
                                                    {formatTime(instance.start_time)} - {formatTime(instance.end_time)}
                                                  </span>
                                                </div>
                                              )}

                                              {/* Location */}
                                              {instance.location && (
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                  <MapPin className="h-4 w-4 shrink-0" />
                                                  <span>{instance.location.name}</span>
                                                </div>
                                              )}

                                              {/* Capacity */}
                                              <div className="flex items-center gap-2 text-sm">
                                                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                                                <span className={instance.is_full ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                                                  {instance.is_full 
                                                    ? 'Full' 
                                                    : `${instance.available_spots} of ${instance.max_students || 0} spots available`
                                                  }
                                                </span>
                                              </div>

                                              {/* Actions */}
                                              <div className="flex gap-2 pt-2">
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 text-xs"
                                                asChild
                                              >
                                                <a
                                                  href={
                                                    (() => {
                                                      const params = new URLSearchParams()
                                                      params.set('instance', instance.id)
                                                      if (franchise) {
                                                        params.set('franchise', franchise)
                                                      }
                                                      const queryString = params.toString()
                                                      
                                                      if (course.slug) {
                                                        return `/course-catalog/${encodeURIComponent(course.slug)}?${queryString}`
                                                      } else {
                                                        params.set('id', course.id)
                                                        return `/course-catalog?${params.toString()}`
                                                      }
                                                    })()
                                                  }
                                                >
                                                  View Details
                                                </a>
                                              </Button>
                                              {PUBLIC_USER_AUTH_ENABLED ? (
                                              <Button
                                                size="sm"
                                                className="flex-1 text-xs"
                                                onClick={() => handleEnroll(instance.id)}
                                                disabled={instance.is_full || instance.status !== "scheduled" || isEnrolling === instance.id}
                                              >
                                                {isEnrolling === instance.id ? (
                                                  'Adding...'
                                                ) : instance.is_full ? (
                                                  'Full'
                                                ) : (
                                                  'Enroll'
                                                )}
                                              </Button>
                                              ) : null}
                                              </div>
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })}
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
        <div className="max-w-4xl mx-auto text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Course Catalog
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-2">
            Robotics | Programming | STEM
          </p>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mt-6">
            Browse all available robotics and programming courses across our campuses.
          </p>
        </div>

        {/* Location Selection Banner */}
        {!franchise && (
          <div className="max-w-6xl mx-auto mb-8">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-base mb-1">
                      Find courses near you
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Select your campus to see available classes and schedules
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {!isLoadingFranchises && franchises.length > 0 && (
                    <Select
                      value={franchise || "all"}
                      onValueChange={handleLocationChange}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select campus" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Campuses</SelectItem>
                        {franchises
                          .filter((f) => f.id && typeof f.id === 'string' && f.id.trim() !== '' && f.code && typeof f.code === 'string' && f.code.trim() !== '')
                          .map((f) => (
                          <SelectItem key={f.id} value={f.code}>
                            {f.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

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
            
            {/* Location Filter (when viewing all courses) */}
            {!franchise && !isLoadingFranchises && franchises.length > 0 && (
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium whitespace-nowrap">
                  Campus:
                </label>
                <Select
                  value={franchise || "all"}
                  onValueChange={handleLocationChange}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Campuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Campuses</SelectItem>
                    {franchises
                      .filter((f) => f.id && typeof f.id === 'string' && f.id.trim() !== '' && f.code && typeof f.code === 'string' && f.code.trim() !== '')
                      .map((f) => (
                      <SelectItem key={f.id} value={f.code}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
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
                {courses
                  .filter((course) => course.id && typeof course.id === 'string' && course.id.trim() !== '')
                  .map((course) => (
                  <Card
                    key={course.id || `course-${course.title}`}
                    className={`flex flex-col hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden ${
                      course.featured ? 'ring-2 ring-primary/20' : ''
                    }`}
                  >
                    {course.poster_url && (
                      <div className="relative w-full h-48">
                        <Image
                          src={course.poster_url}
                          alt={course.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          loading="lazy"
                          placeholder="blur"
                          blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2U1ZTdlYiIvPjwvc3ZnPg=="
                        />
                      </div>
                    )}
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

