'use client'
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Separator } from "./ui/separator";
import { ArrowRight, Loader2, BookOpen, Users, Clock, DollarSign, Calendar, CheckCircle2, MapPin, ShoppingCart } from "lucide-react";
import Image from "next/image";

interface Course {
  id: string;
  title: string;
  type?: 'RoboQuest' | 'LaunchPad' | 'RoboChamps';
  gradeLevel: string;
  description?: string;
  slug?: string;
  poster_url?: string | null;
}

interface CourseDetails {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  target_audience?: string;
  learning_outcomes?: string;
  prerequisites?: string;
  prerequisites_list?: Array<{
    id: string;
    requirement_type: 'required' | 'recommended' | 'optional';
    prerequisite_course?: {
      id: string;
      name: string;
      slug?: string;
    };
  }>;
  cancellation_policy?: string;
  base_price?: number;
  duration_hours?: number;
  session_count?: number;
  age_min?: number;
  age_max?: number;
  grade_level?: string;
  subcategories?: Array<{ id: string; name: string; display_name: string }>;
  assignments?: Array<{
    id: string;
    category?: { name: string; display_name: string };
    series?: { name: string; display_name: string };
    location?: { name: string };
  }>;
}

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

interface CourseInstance {
  id: string;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  location?: { name: string };
  assignment?: {
    location?: { name: string };
  };
  available_capacity: number;
  is_full: boolean;
}

export const Courses = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [courseDetails, setCourseDetails] = useState<CourseDetails | null>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
  // Enrollment states
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);
  const [courseInstances, setCourseInstances] = useState<CourseInstance[]>([]);
  const [isLoadingInstances, setIsLoadingInstances] = useState(false);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [franchiseCode, setFranchiseCode] = useState<string | null>(null);

  useEffect(() => {
    // 从 URL 路径推断当前 franchise（仅作简单匹配，未来可用全局上下文）
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/locations/bellevue')) setFranchiseCode('bellevue');
      else if (path.startsWith('/locations/belred')) setFranchiseCode('belred');
      else if (path.startsWith('/locations/issaquah')) setFranchiseCode('issaquah');
      else if (path.startsWith('/locations/cherrycrest')) setFranchiseCode('cherrycrest');
      else setFranchiseCode(null);
    }
  }, []);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams();
        if (franchiseCode) {
          params.set('franchise', franchiseCode);
        }
        const query = params.toString();
        const response = await fetch(`/api/courses/featured${query ? `?${query}` : ''}`);
        if (!response.ok) {
          throw new Error('Failed to fetch courses');
        }
        const data = await response.json();
        setCourses(data);
      } catch (err) {
        console.error('Error fetching courses:', err);
        setError(err instanceof Error ? err.message : 'Failed to load courses');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const fetchCourseDetails = async (courseId: string) => {
    setIsDetailsLoading(true);
    try {
      const response = await fetch(`/api/courses/${courseId}`);
      if (response.ok) {
        const data = await response.json();
        setCourseDetails(data);
      }
    } catch (err) {
      console.error('Error fetching course details:', err);
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const handleLearnMore = (courseId: string) => {
    setSelectedCourseId(courseId);
    setIsSheetOpen(true);
    fetchCourseDetails(courseId);
  };

  const handleEnroll = async (courseId: string) => {
    // 检查用户是否登录
    if (!session?.user) {
      router.push('/login?callbackUrl=' + encodeURIComponent(window.location.pathname));
      return;
    }

    setEnrollingCourseId(courseId);
    setIsEnrollDialogOpen(true);
    setIsLoadingInstances(true);
    setSelectedInstanceId(null);

    try {
      const params = new URLSearchParams();
      if (franchiseCode) {
        params.set("franchise", franchiseCode);
      }
      const query = params.toString();
      const response = await fetch(
        `/api/courses/${courseId}/instances${query ? `?${query}` : ""}`
      );
      if (response.ok) {
        const instances = await response.json();
        setCourseInstances(instances);
        
        // 如果只有一个实例，自动选择
        if (instances.length === 1) {
          setSelectedInstanceId(instances[0].id);
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to load course instances');
        setIsEnrollDialogOpen(false);
      }
    } catch (err) {
      console.error('Error fetching instances:', err);
      alert('Failed to load course instances');
      setIsEnrollDialogOpen(false);
    } finally {
      setIsLoadingInstances(false);
    }
  };

  const handleAddToCart = async () => {
    if (!selectedInstanceId) {
      alert('Please select a course instance');
      return;
    }

    setIsAddingToCart(true);
    try {
      const response = await fetch('/api/enrollments/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instance_id: selectedInstanceId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert('Added to cart successfully!');
        setIsEnrollDialogOpen(false);
        // 可选：跳转到购物车页面
        // router.push('/enrollments/cart');
      } else {
        const error = await response.json();
        if (error.code === 'CAPACITY_FULL' && error.suggestion === 'waitlist') {
          // 询问是否加入等待列表
          if (confirm('This course is full. Would you like to join the waitlist?')) {
            handleJoinWaitlist(selectedInstanceId);
          }
        } else {
          alert(error.error || 'Failed to add to cart');
        }
      }
    } catch (err) {
      console.error('Error adding to cart:', err);
      alert('Failed to add to cart');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleJoinWaitlist = async (instanceId: string) => {
    try {
      const response = await fetch('/api/enrollments/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instance_id: instanceId,
        }),
      });

      if (response.ok) {
        alert('Added to waitlist successfully!');
        setIsEnrollDialogOpen(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to join waitlist');
      }
    } catch (err) {
      console.error('Error joining waitlist:', err);
      alert('Failed to join waitlist');
    }
  };

  return (
    <section id="courses" className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-24 sm:py-32">
      <div className="flex flex-col md:flex-row justify-between items-center mb-12">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Featured{" "}
            <span 
              className="inline bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(to bottom, hsl(var(--primary) / 0.6), hsl(var(--primary)))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Courses
            </span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Explore our Winter 2026 Robotics & Programming Programs
          </p>
        </div>
        <Button
          variant="outline"
          className="mt-4 md:mt-0"
          asChild
        >
          <a href="/course-catalog">
            View All Courses
            <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Failed to load courses. Please try again later.</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No courses available at the moment.</p>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Card key={course.id} className="flex flex-col hover:shadow-lg transition-shadow overflow-hidden">
                {course.poster_url && (
                  <div className="relative w-full h-48">
                    <Image
                      src={course.poster_url}
                      alt={course.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    {course.type && (
                      <Badge 
                        variant="outline" 
                        className={`${getTypeColor(course.type)} border`}
                      >
                        {course.type}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="shrink-0">
                      Grades {course.gradeLevel}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl leading-tight">
                    {course.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  {course.description && (
                    <CardDescription className="mb-4 text-base">
                      {course.description}
                    </CardDescription>
                  )}
                  <div className="mt-auto space-y-2">
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={() => handleEnroll(course.id)}
                    >
                      <BookOpen className="mr-2 h-4 w-4" />
                      Enroll
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-center group"
                      onClick={() => handleLearnMore(course.id)}
                    >
                      Learn More
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* More Courses Button - Mobile */}
          <div className="mt-8 text-center md:hidden">
            <Button
              variant="default"
              size="lg"
              asChild
            >
              <a href="/course-catalog">
                View All Courses
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </>
      )}

      {/* Course Details Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
          <div className="flex flex-col h-full">
            {/* Header Section with proper padding */}
            <SheetHeader className="px-6 pt-6 pb-4 border-b bg-muted/30">
              {isDetailsLoading ? (
                <>
                  <SheetTitle className="text-xl">Loading Course Details</SheetTitle>
                  <SheetDescription className="mt-2">
                    Please wait while we fetch the course information.
                  </SheetDescription>
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                </>
              ) : courseDetails ? (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <SheetTitle className="text-2xl font-bold leading-tight mb-3 pr-8">
                        {courseDetails.name}
                      </SheetTitle>
                      <div className="flex flex-wrap items-center gap-2">
                        {courseDetails.grade_level && (
                          <Badge variant="secondary" className="text-xs">
                            Grades {courseDetails.grade_level}
                          </Badge>
                        )}
                        {courseDetails.subcategories && courseDetails.subcategories.length > 0 && (
                          <>
                            {courseDetails.subcategories.map((sub) => (
                              <Badge
                                key={sub.id}
                                variant="outline"
                                className={`text-xs ${getTypeColor(
                                  sub.name.toLowerCase().includes('roboquest') || sub.name.toLowerCase().includes('rq')
                                    ? 'RoboQuest'
                                    : sub.name.toLowerCase().includes('launchpad') || sub.name.toLowerCase().includes('lp')
                                    ? 'LaunchPad'
                                    : sub.name.toLowerCase().includes('robochamps') || sub.name.toLowerCase().includes('rc')
                                    ? 'RoboChamps'
                                    : undefined
                                )}`}
                              >
                                {sub.display_name || sub.name}
                              </Badge>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <SheetTitle className="text-xl">Course Details</SheetTitle>
                  <SheetDescription className="mt-2">
                    Unable to load course information.
                  </SheetDescription>
                  <div className="text-center py-12 text-muted-foreground">
                    <p>Failed to load course details</p>
                  </div>
                </>
              )}
            </SheetHeader>

            {/* Content Section with proper padding */}
            {courseDetails && (
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                {/* Quick Info Summary */}
                <div className="grid grid-cols-2 gap-3">
                  {courseDetails.duration_hours && (
                    <Card className="p-3 border shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-primary/10">
                          <Clock className="h-4 w-4 text-primary shrink-0" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground mb-0.5">Duration</p>
                          <p className="text-sm font-semibold truncate">{courseDetails.duration_hours} hours</p>
                        </div>
                      </div>
                    </Card>
                  )}
                  {courseDetails.session_count && (
                    <Card className="p-3 border shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-primary/10">
                          <Calendar className="h-4 w-4 text-primary shrink-0" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground mb-0.5">Sessions</p>
                          <p className="text-sm font-semibold truncate">{courseDetails.session_count} sessions</p>
                        </div>
                      </div>
                    </Card>
                  )}
                  {(courseDetails.age_min || courseDetails.age_max) && (
                    <Card className="p-3 border shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-primary/10">
                          <Users className="h-4 w-4 text-primary shrink-0" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground mb-0.5">Age Range</p>
                          <p className="text-sm font-semibold truncate">
                            {courseDetails.age_min && courseDetails.age_max
                              ? `${courseDetails.age_min}-${courseDetails.age_max} years`
                              : courseDetails.age_min
                              ? `${courseDetails.age_min}+ years`
                              : `Up to ${courseDetails.age_max} years`}
                          </p>
                        </div>
                      </div>
                    </Card>
                  )}
                  {courseDetails.base_price && (
                    <Card className="p-3 border shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-primary/10">
                          <DollarSign className="h-4 w-4 text-primary shrink-0" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground mb-0.5">Price</p>
                          <p className="text-sm font-semibold truncate">${courseDetails.base_price.toFixed(2)}</p>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>

                {/* Tabs for organized content */}
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="details">Details</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-6 mt-6">
                    {/* Description */}
                    {courseDetails.description && (
                      <div>
                        <h3 className="font-semibold mb-3 text-base">Description</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
                          {courseDetails.description}
                        </p>
                      </div>
                    )}

                    {/* Target Audience - Condensed */}
                    {courseDetails.target_audience && (
                      <div>
                        <h3 className="font-semibold mb-3 text-base">Target Audience</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                          {courseDetails.target_audience}
                        </p>
                      </div>
                    )}

                    {/* Available Sessions - Quick View */}
                    {courseDetails.assignments && courseDetails.assignments.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3 text-base">Available Sessions</h3>
                        <div className="space-y-2">
                          {courseDetails.assignments.slice(0, 3).map((assignment) => (
                            <Card key={assignment.id} className="p-3 border shadow-sm hover:shadow-md transition-shadow">
                              {assignment.category && assignment.series && (
                                <p className="font-medium text-sm mb-1 truncate">
                                  {assignment.category.display_name || assignment.category.name} &gt; {assignment.series.display_name || assignment.series.name}
                                </p>
                              )}
                              {assignment.location && (
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  <p className="text-xs text-muted-foreground truncate">
                                    {assignment.location.name}
                                  </p>
                                </div>
                              )}
                            </Card>
                          ))}
                          {courseDetails.assignments.length > 3 && (
                            <p className="text-xs text-muted-foreground text-center py-2">
                              +{courseDetails.assignments.length - 3} more sessions available
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="details" className="space-y-6 mt-6">
                    {/* Learning Outcomes */}
                    {courseDetails.learning_outcomes && (
                      <div>
                        <h3 className="font-semibold mb-3 text-base">Learning Outcomes</h3>
                        <div className="p-4 rounded-lg bg-muted/50 border">
                          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-6">
                            {courseDetails.learning_outcomes}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Prerequisites */}
                    {(courseDetails.prerequisites_list && courseDetails.prerequisites_list.length > 0) || courseDetails.prerequisites ? (
                      <div>
                        <h3 className="font-semibold mb-3 text-base">Prerequisites</h3>
                        <div className="p-4 rounded-lg bg-muted/50 border space-y-3">
                          {/* 结构化先修课程列表 */}
                          {courseDetails.prerequisites_list && courseDetails.prerequisites_list.length > 0 && (
                            <div className="space-y-2">
                              {courseDetails.prerequisites_list
                                .filter((p: any) => p.requirement_type === 'required')
                                .map((prerequisite: any) => (
                                  <div key={prerequisite.id} className="flex items-center gap-2 text-sm">
                                    <span className="text-primary">•</span>
                                    <span className="font-medium">
                                      {prerequisite.prerequisite_course?.name || 'Unknown Course'}
                                    </span>
                                    <Badge variant="outline" className="text-xs">Required</Badge>
                                  </div>
                                ))}
                              {courseDetails.prerequisites_list
                                .filter((p: any) => p.requirement_type === 'recommended')
                                .map((prerequisite: any) => (
                                  <div key={prerequisite.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span>•</span>
                                    <span>{prerequisite.prerequisite_course?.name || 'Unknown Course'}</span>
                                    <Badge variant="secondary" className="text-xs">Recommended</Badge>
                                  </div>
                                ))}
                            </div>
                          )}
                          {/* 文本描述（作为补充） */}
                          {courseDetails.prerequisites && (
                            <div className="pt-2 border-t">
                              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                                {courseDetails.prerequisites}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}

                    {/* Cancellation Policy */}
                    {courseDetails.cancellation_policy && (
                      <div>
                        <h3 className="font-semibold mb-3 text-base">Cancellation Policy</h3>
                        <div className="p-4 rounded-lg bg-muted/50 border">
                          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-4">
                            {courseDetails.cancellation_policy}
                          </p>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* Footer Section with action buttons */}
            {courseDetails && (
              <div className="px-6 py-4 border-t bg-muted/30 space-y-2">
                <Button
                  className="w-full"
                  onClick={() => handleEnroll(courseDetails.id)}
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  Enroll Now
                </Button>
                {courseDetails.slug ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    asChild
                  >
                    <a href={`/course-catalog/${courseDetails.slug}`}>
                      View Full Details
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    asChild
                  >
                    <a href={`/course-catalog?id=${courseDetails.id}`}>
                      View Full Details
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Enrollment Dialog */}
      <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Course Instance</DialogTitle>
            <DialogDescription>
              Choose a time and location for this course
            </DialogDescription>
          </DialogHeader>

          {isLoadingInstances ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : courseInstances.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No available instances for this course.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {courseInstances.map((instance) => (
                <Card
                  key={instance.id}
                  className={`cursor-pointer transition-all ${
                    selectedInstanceId === instance.id
                      ? 'ring-2 ring-primary'
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedInstanceId(instance.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">
                            {new Date(instance.start_date).toLocaleDateString()} - {new Date(instance.end_date).toLocaleDateString()}
                          </h3>
                          {instance.is_full ? (
                            <Badge variant="destructive">Full</Badge>
                          ) : (
                            <Badge variant="secondary">
                              {instance.available_capacity} spots left
                            </Badge>
                          )}
                        </div>
                        {instance.start_time && instance.end_time && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {instance.start_time} - {instance.end_time}
                          </p>
                        )}
                        {(instance.location?.name || instance.assignment?.location?.name) && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {instance.location?.name || instance.assignment?.location?.name}
                          </p>
                        )}
                      </div>
                      {selectedInstanceId === instance.id && (
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsEnrollDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddToCart}
                  disabled={!selectedInstanceId || isAddingToCart || courseInstances.find(i => i.id === selectedInstanceId)?.is_full}
                  className="flex-1"
                >
                  {isAddingToCart ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Add to Cart
                    </>
                  )}
                </Button>
              </div>

              {selectedInstanceId && courseInstances.find(i => i.id === selectedInstanceId)?.is_full && (
                <Button
                  variant="secondary"
                  onClick={() => handleJoinWaitlist(selectedInstanceId)}
                  className="w-full"
                >
                  Join Waitlist Instead
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

