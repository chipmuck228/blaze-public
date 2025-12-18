'use client'
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { CheckCircle2, Users, Target, BookOpen, Clock, Calendar, DollarSign, MapPin, ArrowRight, AlertCircle } from "lucide-react";
import { CourseWithDetails } from "@/lib/db";

interface CourseDetailProps {
  course: CourseWithDetails;
}

const getTypeColor = (type?: string) => {
  if (!type) return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20';
  
  const lowerType = type.toLowerCase();
  if (lowerType.includes('roboquest') || lowerType.includes('rq')) {
    return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
  }
  if (lowerType.includes('launchpad') || lowerType.includes('lp')) {
    return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
  }
  if (lowerType.includes('robochamps') || lowerType.includes('rc')) {
    return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20';
  }
  return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20';
};

interface Franchise {
  id: string;
  code: string;
  name: string;
}

export const CourseDetail = ({ course }: CourseDetailProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [isLoadingFranchises, setIsLoadingFranchises] = useState(true);
  const [selectedFranchise, setSelectedFranchise] = useState<string | null>(null);
  const [instances, setInstances] = useState<any[]>([]);
  const [isLoadingInstances, setIsLoadingInstances] = useState(false);

  // 从 URL 参数获取 franchise
  useEffect(() => {
    const franchiseParam = searchParams.get('franchise');
    if (franchiseParam) {
      setSelectedFranchise(franchiseParam);
    } else {
      // Phase 2: 尝试从 localStorage 读取用户偏好
      const preferredLocation = localStorage.getItem('preferred_location');
      if (preferredLocation) {
        setSelectedFranchise(preferredLocation);
      }
    }
  }, [searchParams]);

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

  // 获取课程实例
  useEffect(() => {
    const fetchInstances = async () => {
      if (!course.id) return;
      
      setIsLoadingInstances(true);
      try {
        const params = new URLSearchParams();
        if (selectedFranchise) {
          params.set('franchise', selectedFranchise);
        }
        const res = await fetch(`/api/courses/${course.id}/instances?${params.toString()}`);
        if (!res.ok) {
          throw new Error("Failed to load instances");
        }
        const data = await res.json();
        setInstances(data || []);
      } catch (err: any) {
        console.error("Error fetching instances:", err);
        setInstances([]);
      } finally {
        setIsLoadingInstances(false);
      }
    };

    fetchInstances();
  }, [course.id, selectedFranchise]);

  // Location 选择处理
  const handleLocationChange = (locationCode: string) => {
    if (locationCode === "all" || !locationCode) {
      setSelectedFranchise(null);
      localStorage.removeItem('preferred_location');
    } else {
      setSelectedFranchise(locationCode);
      localStorage.setItem('preferred_location', locationCode);
    }
  };

  // 获取第一个 subcategory 作为类型标识
  const courseType = course.subcategories?.[0]?.display_name || course.subcategories?.[0]?.name || 'Course';
  
  // 格式化学习成果（如果是字符串，转换为数组）
  const learningOutcomes = course.learning_outcomes 
    ? course.learning_outcomes.split('\n').filter((line: string) => line.trim())
    : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-12 md:py-20">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <nav className="text-sm text-muted-foreground mb-6">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/#courses" className="hover:text-primary transition-colors">Courses</Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">{course.name}</span>
          </nav>

          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {course.subcategories && course.subcategories.length > 0 && (
                <Badge 
                  variant="outline" 
                  className={`${getTypeColor(courseType)} border text-sm px-3 py-1`}
                >
                  {courseType}
                </Badge>
              )}
              {course.grade_level && (
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  Grades {course.grade_level}
                </Badge>
              )}
              {course.duration_hours && (
                <Badge variant="outline" className="text-sm px-3 py-1">
                  <Clock className="h-3 w-3 mr-1 inline" />
                  {course.duration_hours}h
                </Badge>
              )}
              {course.session_count && (
                <Badge variant="outline" className="text-sm px-3 py-1">
                  <Calendar className="h-3 w-3 mr-1 inline" />
                  {course.session_count} sessions
                </Badge>
              )}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {course.name}
            </h1>
          </div>

          {/* Course Image - Placeholder */}
          <div className="mb-8 rounded-lg overflow-hidden bg-muted aspect-video relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <BookOpen className="h-24 w-24 text-muted-foreground/20" />
            </div>
          </div>

          {/* Quick Info Grid */}
          {(course.duration_hours || course.session_count || course.age_min || course.age_max || course.base_price) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              {course.duration_hours && (
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-primary/10">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Duration</p>
                      <p className="text-sm font-semibold">{course.duration_hours} hours</p>
                    </div>
                  </div>
                </Card>
              )}
              {course.session_count && (
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-primary/10">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Sessions</p>
                      <p className="text-sm font-semibold">{course.session_count}</p>
                    </div>
                  </div>
                </Card>
              )}
              {(course.age_min || course.age_max) && (
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-primary/10">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Age Range</p>
                      <p className="text-sm font-semibold">
                        {course.age_min && course.age_max
                          ? `${course.age_min}-${course.age_max} years`
                          : course.age_min
                          ? `${course.age_min}+ years`
                          : `Up to ${course.age_max} years`}
                      </p>
                    </div>
                  </div>
                </Card>
              )}
              {course.base_price && (
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-primary/10">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Price</p>
                      <p className="text-sm font-semibold">${course.base_price.toFixed(2)}</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Description */}
          {course.description && (
            <div className="prose prose-lg dark:prose-invert max-w-none mb-12">
              <p className="text-lg text-muted-foreground leading-relaxed">
                {course.description}
              </p>
            </div>
          )}

          {/* Key Information Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Target Audience */}
            {course.target_audience && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-5 w-5 text-primary" />
                    <CardTitle className="text-xl">Target Audience</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {course.target_audience}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Learning Outcomes */}
            {learningOutcomes.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-5 w-5 text-primary" />
                    <CardTitle className="text-xl">Learning Outcomes</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {learningOutcomes.map((outcome: string, index: number) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-muted-foreground leading-relaxed">
                          {outcome.trim()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Prerequisites */}
          {(course.prerequisites_list && course.prerequisites_list.length > 0) || course.prerequisites ? (
            <Card className="mb-12">
              <CardHeader>
                <CardTitle className="text-xl">Prerequisites</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 结构化先修课程列表 */}
                {course.prerequisites_list && course.prerequisites_list.length > 0 && (
                  <div className="space-y-3">
                    {course.prerequisites_list.filter(p => p.requirement_type === 'required').length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Required:</h4>
                        <div className="space-y-2">
                          {course.prerequisites_list
                            .filter(p => p.requirement_type === 'required')
                            .map((prerequisite) => (
                              <div key={prerequisite.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                                <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                                <Link
                                  href={`/course-catalog/${prerequisite.prerequisite_course?.slug || prerequisite.prerequisite_course_id}`}
                                  className="text-sm hover:text-primary transition-colors"
                                >
                                  {prerequisite.prerequisite_course?.name || 'Unknown Course'}
                                </Link>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                    {course.prerequisites_list.filter(p => p.requirement_type === 'recommended').length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Recommended:</h4>
                        <div className="space-y-2">
                          {course.prerequisites_list
                            .filter(p => p.requirement_type === 'recommended')
                            .map((prerequisite) => (
                              <div key={prerequisite.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                                <CheckCircle2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <Link
                                  href={`/course-catalog/${prerequisite.prerequisite_course?.slug || prerequisite.prerequisite_course_id}`}
                                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                                >
                                  {prerequisite.prerequisite_course?.name || 'Unknown Course'}
                                </Link>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* 文本描述（作为补充） */}
                {course.prerequisites && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {course.prerequisites}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          {/* Available Sessions */}
          {course.assignments && course.assignments.length > 0 && (
            <Card className="mb-12">
              <CardHeader>
                <CardTitle className="text-xl">Available Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {course.assignments.map((assignment: any) => (
                    <div key={assignment.id} className="p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                      {assignment.category && assignment.series && (
                        <p className="font-semibold text-sm mb-2">
                          {assignment.category.display_name || assignment.category.name} &gt; {assignment.series.display_name || assignment.series.name}
                        </p>
                      )}
                      {assignment.location && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{assignment.location.name}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cancellation Policy */}
          {course.cancellation_policy && (
            <Card className="mb-12">
              <CardHeader>
                <CardTitle className="text-xl">Cancellation Policy</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {course.cancellation_policy}
                </p>
              </CardContent>
            </Card>
          )}

          {/* CTA Section */}
          <div className="bg-muted/50 rounded-lg p-8 text-center">
            <BookOpen className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Join us for this exciting robotics adventure and take your skills to the next level!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="destructive" size="lg" asChild>
                <a href="https://www.blazeroboticsacademy.org/winter2026" target="_blank" rel="noreferrer noopener">
                  Enroll Now
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/#courses">
                  View All Courses
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
