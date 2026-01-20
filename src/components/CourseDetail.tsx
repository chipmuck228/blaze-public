'use client'
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { CheckCircle2, Users, Target, BookOpen, Clock, Calendar, DollarSign, MapPin, ArrowRight, AlertCircle, Loader2, ShoppingCart } from "lucide-react";
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

interface InstanceDetails {
  id: string;
  start_date: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  class_time?: string;
  max_students?: number;
  available_capacity: number;
  is_full: boolean;
  location?: {
    id: string;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
  };
  franchise?: {
    id: string;
    code: string;
    name: string;
  } | null;
  category?: {
    id: string;
    name: string;
    display_name: string;
  } | null;
  program?: {
    id: string;
    name: string;
    display_name: string;
  } | null;
  course?: any;
}

export const CourseDetail = ({ course }: CourseDetailProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [isLoadingFranchises, setIsLoadingFranchises] = useState(true);
  const [selectedFranchise, setSelectedFranchise] = useState<string | null>(null);
  const [instances, setInstances] = useState<any[]>([]);
  const [isLoadingInstances, setIsLoadingInstances] = useState(false);
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [currentInstance, setCurrentInstance] = useState<InstanceDetails | null>(null);
  const [isLoadingInstance, setIsLoadingInstance] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState<{
    canEnroll: boolean;
    reason?: string;
    alreadyEnrolled?: boolean;
    prerequisitesNotMet?: boolean;
    missingPrerequisites?: any[];
  } | null>(null);

  // 从 URL 参数获取 instance ID 和 franchise
  useEffect(() => {
    const instanceIdParam = searchParams.get('instance');
    const franchiseParam = searchParams.get('franchise');
    
    console.log('[CourseDetail] URL params:', {
      instance: instanceIdParam,
      franchise: franchiseParam,
      allParams: Object.fromEntries(searchParams.entries())
    });
    
    if (instanceIdParam) {
      setSelectedInstanceId(instanceIdParam);
      // 如果有 instance ID，获取详细信息
      fetchInstanceDetails(instanceIdParam);
    } else {
      // 如果没有 instance 参数，清除 currentInstance
      setCurrentInstance(null);
      setSelectedInstanceId(null);
    }
    
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

  // 获取单个 instance 的详细信息
  const fetchInstanceDetails = async (instanceId: string) => {
    if (!instanceId) {
      console.error("fetchInstanceDetails: instanceId is empty");
      setCurrentInstance(null);
      return;
    }

    setIsLoadingInstance(true);
    try {
      console.log(`[CourseDetail] Fetching instance details for ID: ${instanceId}`);
      const res = await fetch(`/api/public/instances/${instanceId}`);
      
      if (!res.ok) {
        // 尝试解析错误响应，如果失败则使用默认错误信息
        let errorMessage = `Failed to load instance details (${res.status})`;
        try {
          const errorData = await res.json();
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          }
          console.error(`[CourseDetail] API error (${res.status}):`, errorData || 'Empty response');
        } catch (parseError) {
          // 如果响应体不是 JSON，尝试读取文本
          try {
            const text = await res.text();
            console.error(`[CourseDetail] API error (${res.status}), response text:`, text || 'Empty');
            if (text) {
              errorMessage = text;
            }
          } catch (textError) {
            console.error(`[CourseDetail] API error (${res.status}), unable to read response`);
          }
        }
        
        // 如果是 404，说明 instance 不存在，静默处理（不显示错误）
        if (res.status === 404) {
          console.warn(`[CourseDetail] Instance ${instanceId} not found (404)`);
          setCurrentInstance(null);
          return;
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await res.json();
      console.log(`[CourseDetail] Instance details loaded:`, {
        id: data.id,
        hasCourse: !!data.course,
        hasLocation: !!data.location,
        hasFranchise: !!data.franchise
      });
      
      setCurrentInstance(data);
      // 如果 instance 有 franchise，更新 selectedFranchise
      if (data.franchise) {
        setSelectedFranchise(data.franchise.code);
      }
    } catch (err: any) {
      // 只记录非 404 错误
      if (err.message && !err.message.includes('404')) {
        console.error("[CourseDetail] Error fetching instance details:", {
          instanceId,
          error: err.message || err,
          stack: err.stack
        });
      }
      setCurrentInstance(null);
    } finally {
      setIsLoadingInstance(false);
    }
  };

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
        console.log('[CourseDetail] Fetched instances:', {
          courseId: course.id,
          franchise: selectedFranchise,
          instancesCount: data?.length || 0,
          instances: data?.map((inst: any) => ({
            id: inst.id,
            start_date: inst.start_date,
            max_students: inst.max_students,
            available_capacity: inst.available_capacity,
            is_full: inst.is_full,
          })),
        });
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

  // 检查用户是否可以注册（先修条件和已注册状态）
  useEffect(() => {
    const checkEnrollmentStatus = async () => {
      if (!session?.user || !course.id) {
        setEnrollmentStatus(null);
        return;
      }

      try {
        // 检查先修条件
        const canEnrollRes = await fetch(`/api/user/courses/${course.id}/can-enroll`);
        if (canEnrollRes.ok) {
          const canEnrollData = await canEnrollRes.json();
          setEnrollmentStatus({
            canEnroll: canEnrollData.canEnroll,
            prerequisitesNotMet: !canEnrollData.canEnroll,
            missingPrerequisites: canEnrollData.missingPrerequisites || [],
            reason: !canEnrollData.canEnroll 
              ? `Missing prerequisites: ${(canEnrollData.missingPrerequisites || []).map((c: any) => c.name).join(', ')}`
              : undefined,
          });
        }
      } catch (err) {
        console.error("Error checking enrollment status:", err);
        // 如果检查失败，允许继续（保守处理）
        setEnrollmentStatus({ canEnroll: true });
      }
    };

    checkEnrollmentStatus();
  }, [session?.user, course.id]);

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

  // 处理注册按钮点击
  const handleEnrollClick = () => {
    if (!session?.user) {
      router.push('/login?callbackUrl=' + encodeURIComponent(window.location.pathname));
      return;
    }

    // 如果没有实例，提示用户
    if (instances.length === 0) {
      alert('No available instances for this course at the selected location.');
      return;
    }

    // 如果只有一个实例，直接添加到购物车
    if (instances.length === 1) {
      handleAddToCart(instances[0].id);
      return;
    }

    // 如果有多个实例，打开选择对话框
    setIsEnrollDialogOpen(true);
  };

  // 添加到购物车
  const handleAddToCart = async (instanceId?: string) => {
    const targetInstanceId = instanceId || selectedInstanceId;
    
    if (!targetInstanceId) {
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
          instance_id: targetInstanceId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsEnrollDialogOpen(false);
        setSelectedInstanceId(null);
        
        // 询问用户是否立即结账
        if (confirm('Added to cart successfully! Would you like to proceed to checkout?')) {
          router.push('/enrollments/cart');
        }
      } else {
        const error = await response.json();
        if (error.code === 'CAPACITY_FULL' && error.suggestion === 'waitlist') {
          // 询问是否加入等待列表
          if (confirm('This course is full. Would you like to join the waitlist?')) {
            handleJoinWaitlist(targetInstanceId);
          }
        } else if (error.code === 'PREREQUISITES_NOT_MET') {
          alert(error.error || 'You need to complete prerequisite courses first.');
        } else if (error.code === 'ALREADY_ENROLLED') {
          alert(error.error || 'You already have an active enrollment for this course.');
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

  // 加入等待列表
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
        setSelectedInstanceId(null);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to join waitlist');
      }
    } catch (err) {
      console.error('Error joining waitlist:', err);
      alert('Failed to join waitlist');
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // 格式化时间
  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // 获取第一个 subcategory 作为类型标识
  const courseType = course.subcategories?.[0]?.display_name || course.subcategories?.[0]?.name || 'Course';
  
  // 格式化学习成果（如果是字符串，转换为数组）
  const learningOutcomes = course.learning_outcomes 
    ? course.learning_outcomes.split('\n').filter((line: string) => line.trim())
    : [];

  // 构建 Breadcrumb
  // 格式：home/location/category/program/instance
  const buildBreadcrumb = () => {
    const items = [];
    
    // 1. Home
    items.push(
      <Link key="home" href="/" className="hover:text-primary transition-colors">
        Home
      </Link>
    );

    // 如果有 instance ID 参数（即使 currentInstance 还没加载完成），也应该显示完整层级
    const hasInstanceParam = searchParams.get('instance');
    const franchiseParam = searchParams.get('franchise');
    
    // 如果有当前 instance 或正在加载 instance，显示完整层级
    if (currentInstance || hasInstanceParam) {
      // 如果正在加载且还没有 currentInstance，尝试从 URL 参数或 franchises 列表获取 franchise 信息
      if (isLoadingInstance && !currentInstance) {
        // 尝试从 URL 参数或 franchises 列表获取 franchise 名称
        const franchiseName = franchiseParam 
          ? franchises.find(f => f.code === franchiseParam)?.name || franchiseParam
          : null;
        
        if (franchiseName) {
          items.push(
            <span key="sep1" className="mx-2">/</span>,
            <Link
              key="location"
              href={`/course-catalog?franchise=${franchiseParam}`}
              className="hover:text-primary transition-colors"
            >
              {franchiseName}
            </Link>
          );
        }
        
        items.push(
          <span key="sep" className="mx-2">/</span>,
          <span key="loading" className="text-muted-foreground">
            Loading...
          </span>
        );
        return items;
      }

      // 2. Location (Franchise)
      if (currentInstance?.franchise) {
        items.push(
          <span key="sep1" className="mx-2">/</span>,
          <Link
            key="location"
            href={`/course-catalog?franchise=${currentInstance.franchise.code}`}
            className="hover:text-primary transition-colors"
          >
            {currentInstance.franchise.name}
          </Link>
        );
      } else if (franchiseParam && !currentInstance?.franchise) {
        // 如果 URL 中有 franchise 参数但 currentInstance 还没有加载，使用 franchises 列表
        const franchiseName = franchises.find(f => f.code === franchiseParam)?.name;
        if (franchiseName) {
          items.push(
            <span key="sep1" className="mx-2">/</span>,
            <Link
              key="location"
              href={`/course-catalog?franchise=${franchiseParam}`}
              className="hover:text-primary transition-colors"
            >
              {franchiseName}
            </Link>
          );
        }
      }

      // 3. Category
      if (currentInstance?.category) {
        items.push(
          <span key="sep2" className="mx-2">/</span>,
          <span key="category" className="text-foreground">
            {currentInstance.category.display_name || currentInstance.category.name}
          </span>
        );
      }

      // 4. Program
      if (currentInstance?.program) {
        items.push(
          <span key="sep3" className="mx-2">/</span>,
          <span key="program" className="text-foreground">
            {currentInstance.program.display_name || currentInstance.program.name}
          </span>
        );
      }

      // 5. Instance (课程名称)
      items.push(
        <span key="sep4" className="mx-2">/</span>,
        <span key="instance" className="text-foreground font-medium">
          {currentInstance?.course?.name || course.name}
        </span>
      );
    } else {
      // 没有 instance，显示简单的层级
      items.push(
        <span key="sep" className="mx-2">/</span>,
        <Link key="courses" href="/#courses" className="hover:text-primary transition-colors">
          Courses
        </Link>,
        <span key="sep2" className="mx-2">/</span>,
        <span key="course" className="text-foreground">
          {course.name}
        </span>
      );
    }

    return items;
  };

  // 使用当前 instance 的课程信息（如果有），否则使用传入的 course
  // 合并两个 course 对象，优先使用 currentInstance.course 的值，但保留原始 course 中可能缺失的字段（如 poster_url）
  const displayCourse = currentInstance?.course 
    ? { ...course, ...currentInstance.course } 
    : course;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-12 md:py-20">
        <div className="max-w-4xl mx-auto space-y-16">
          
          {/* ============================================
              LEVEL 1: HERO SECTION - 页面头部信息
              ============================================ */}
          <section className="space-y-8">
            {/* Breadcrumb Navigation */}
            <nav className="text-sm text-muted-foreground flex flex-wrap items-center">
              {buildBreadcrumb()}
            </nav>

            {/* Course Header */}
            <div className="space-y-4">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-3">
                {displayCourse.subcategories && displayCourse.subcategories.length > 0 && (
                  <Badge 
                    variant="outline" 
                    className={`${getTypeColor(courseType)} border text-sm px-3 py-1`}
                  >
                    {courseType}
                  </Badge>
                )}
                {currentInstance?.category && (
                  <Badge variant="outline" className="text-sm px-3 py-1 bg-primary/10 text-primary border-primary/20">
                    {currentInstance.category.display_name || currentInstance.category.name}
                  </Badge>
                )}
                {currentInstance?.program && (
                  <Badge variant="outline" className="text-sm px-3 py-1 bg-secondary/50">
                    {currentInstance.program.display_name || currentInstance.program.name}
                  </Badge>
                )}
                {displayCourse.grade_level && (
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    Grades {displayCourse.grade_level}
                  </Badge>
                )}
                {displayCourse.duration_hours && (
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    <Clock className="h-3 w-3 mr-1 inline" />
                    {displayCourse.duration_hours}h
                  </Badge>
                )}
                {displayCourse.session_count && (
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    <Calendar className="h-3 w-3 mr-1 inline" />
                    {displayCourse.session_count} sessions
                  </Badge>
                )}
              </div>

              {/* Course Title */}
              <h1 className="text-4xl md:text-5xl font-bold">
                {displayCourse.name}
              </h1>

              {/* Instance Info Banner (如果有当前 instance) */}
              {currentInstance && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Session Details</h2>
                    <div className="flex items-center gap-3">
                      {currentInstance.is_full && (
                        <Badge variant="destructive">Full</Badge>
                      )}
                      <Button
                        size="sm"
                        onClick={() => handleAddToCart(currentInstance.id)}
                        disabled={
                          isLoadingInstance ||
                          currentInstance.is_full ||
                          isAddingToCart ||
                          !!(session?.user && enrollmentStatus && !enrollmentStatus.canEnroll)
                        }
                        title={
                          !session?.user
                            ? "Please login to enroll"
                            : currentInstance.is_full
                            ? "This session is full"
                            : enrollmentStatus && !enrollmentStatus.canEnroll
                            ? enrollmentStatus.reason || "Prerequisites not met"
                            : undefined
                        }
                      >
                        {isAddingToCart ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Adding...
                          </>
                        ) : currentInstance.is_full ? (
                          <>
                            <AlertCircle className="mr-2 h-4 w-4" />
                            Full
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            Enroll Now
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {currentInstance.location && (
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm text-muted-foreground">Location</p>
                          <p className="font-medium">{currentInstance.location.name}</p>
                          {currentInstance.location.address && (
                            <p className="text-sm text-muted-foreground">
                              {currentInstance.location.address}
                              {currentInstance.location.city && `, ${currentInstance.location.city}`}
                              {currentInstance.location.state && `, ${currentInstance.location.state}`}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    {currentInstance.start_date && (
                      <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm text-muted-foreground">Start Date</p>
                          <p className="font-medium">{formatDate(currentInstance.start_date)}</p>
                          {currentInstance.class_time && (
                            <p className="text-sm text-muted-foreground">
                              {formatTime(currentInstance.class_time)}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    {currentInstance.available_capacity !== undefined && (
                      <div className="flex items-start gap-3">
                        <Users className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm text-muted-foreground">Availability</p>
                          <p className="font-medium">
                            {currentInstance.is_full 
                              ? 'Full' 
                              : `${currentInstance.available_capacity} spots available`}
                          </p>
                        </div>
                      </div>
                    )}
                    {currentInstance.franchise && (
                      <div className="flex items-start gap-3">
                        <BookOpen className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm text-muted-foreground">Franchise</p>
                          <p className="font-medium">{currentInstance.franchise.name}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Course Image */}
            <div className="rounded-lg overflow-hidden bg-muted aspect-video relative">
              {displayCourse.poster_url ? (
                <Image
                  src={displayCourse.poster_url}
                  alt={displayCourse.name || 'Course image'}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <BookOpen className="h-24 w-24 text-muted-foreground/20" />
                </div>
              )}
            </div>
          </section>

          {/* ============================================
              LEVEL 2: QUICK OVERVIEW - 快速概览信息
              ============================================ */}
          {(displayCourse.duration_hours || displayCourse.session_count || displayCourse.age_min || displayCourse.age_max || displayCourse.base_price) && (
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Quick Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {displayCourse.duration_hours && (
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-primary/10">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Duration</p>
                        <p className="text-sm font-semibold">{displayCourse.duration_hours} hours</p>
                      </div>
                    </div>
                  </Card>
                )}
                {displayCourse.session_count && (
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-primary/10">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Sessions</p>
                        <p className="text-sm font-semibold">{displayCourse.session_count}</p>
                      </div>
                    </div>
                  </Card>
                )}
                {(displayCourse.age_min || displayCourse.age_max) && (
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-primary/10">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Age Range</p>
                        <p className="text-sm font-semibold">
                          {displayCourse.age_min && displayCourse.age_max
                            ? `${displayCourse.age_min}-${displayCourse.age_max} years`
                            : displayCourse.age_min
                            ? `${displayCourse.age_min}+ years`
                            : `Up to ${displayCourse.age_max} years`}
                        </p>
                      </div>
                    </div>
                  </Card>
                )}
                {displayCourse.base_price && (
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-primary/10">
                        <DollarSign className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Price</p>
                        <p className="text-sm font-semibold">${displayCourse.base_price.toFixed(2)}</p>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </section>
          )}

          {/* ============================================
              LEVEL 3: COURSE DETAILS - 课程详细信息
              ============================================ */}
          <section className="space-y-8">
            <h2 className="text-2xl font-semibold">Course Details</h2>
            
            {/* Description and Target Audience Cards - 大屏幕并列，小屏幕垂直堆叠 */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Description Card */}
              {displayCourse.description && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl">About This Course</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {displayCourse.description}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Target Audience */}
              {displayCourse.target_audience && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-5 w-5 text-primary" />
                      <CardTitle className="text-xl">Target Audience</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {displayCourse.target_audience}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

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
          </section>

          {/* ============================================
              LEVEL 4: ENROLLMENT INFORMATION - 注册相关信息
              ============================================ */}
          <section className="space-y-8">
            <h2 className="text-2xl font-semibold">Enrollment Information</h2>

          {/* Prerequisites */}
          {((course.prerequisites_list && course.prerequisites_list.length > 0) || displayCourse.prerequisites) && (
            <Card>
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
                {displayCourse.prerequisites && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {displayCourse.prerequisites}
                    </p>
                  </div>
                )}
                </CardContent>
              </Card>
            )}

            {/* Available Instances - 如果有当前 instance，只显示其他实例 */}
            {(!currentInstance && instances.length > 0) || (currentInstance && instances.filter(inst => inst.id !== currentInstance.id).length > 0) ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">
                    {currentInstance ? 'Other Available Sessions' : 'Available Sessions'}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {selectedFranchise 
                      ? `Showing sessions for ${franchises.find(f => f.code === selectedFranchise)?.name || selectedFranchise}`
                      : 'Showing all available sessions'}
                  </p>
                </CardHeader>
                <CardContent>
                  {isLoadingInstances ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : instances.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No available sessions at the selected location.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {instances
                        .filter((inst: any) => !currentInstance || inst.id !== currentInstance.id)
                        .map((instance: any) => (
                        <div 
                          key={instance.id} 
                          className={`p-4 rounded-lg border transition-colors ${
                            instance.is_full 
                              ? 'bg-muted/30 opacity-60' 
                              : 'bg-muted/30 hover:bg-muted/50 cursor-pointer'
                          }`}
                          onClick={() => !instance.is_full && setSelectedInstanceId(instance.id)}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              {instance.assignment?.category && instance.assignment?.series && (
                                <p className="font-semibold text-sm mb-2">
                                  {instance.assignment.category.display_name || instance.assignment.category.name} &gt; {instance.assignment.series.display_name || instance.assignment.series.name}
                                </p>
                              )}
                              <div className="space-y-1 text-sm text-muted-foreground">
                                {instance.location && (
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    <span>{instance.location.name}</span>
                                  </div>
                                )}
                                {instance.start_date && (
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    <span>Starts: {formatDate(instance.start_date)}</span>
                                  </div>
                                )}
                                {instance.class_time && (
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    <span>Time: {formatTime(instance.class_time)}</span>
                                  </div>
                                )}
                                {instance.available_capacity !== undefined && (
                                  <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    <span>
                                      {instance.is_full 
                                        ? 'Full' 
                                        : `${instance.available_capacity} spots available`}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            {instance.is_full && (
                              <Badge variant="destructive" className="shrink-0">
                                Full
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}

            {/* Cancellation Policy */}
            {displayCourse.cancellation_policy && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Cancellation Policy</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {displayCourse.cancellation_policy}
                  </p>
                </CardContent>
              </Card>
            )}
          </section>

          {/* ============================================
              LEVEL 5: CALL TO ACTION - 行动号召
              ============================================ */}
          <section className="bg-muted/50 rounded-lg p-8 text-center">
            <BookOpen className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Join us for this exciting robotics adventure and take your skills to the next level!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                variant="destructive" 
                size="lg" 
                onClick={() => {
                  // 如果有当前 instance，直接添加到购物车
                  if (currentInstance) {
                    handleAddToCart(currentInstance.id);
                  } else {
                    handleEnrollClick();
                  }
                }}
                disabled={
                  isLoadingInstance ||
                  isLoadingInstances || 
                  (currentInstance ? currentInstance.is_full : instances.length === 0) || 
                  isAddingToCart ||
                  (session?.user && enrollmentStatus && !enrollmentStatus.canEnroll) ||
                  (!currentInstance && instances.every(inst => inst.is_full))
                }
                title={
                  !session?.user 
                    ? "Please login to enroll"
                    : isLoadingInstance || isLoadingInstances
                    ? "Loading..."
                    : currentInstance && currentInstance.is_full
                    ? "This session is full. Please join the waitlist."
                    : !currentInstance && instances.length === 0
                    ? "No available sessions for this course"
                    : !currentInstance && instances.every(inst => inst.is_full)
                    ? "All sessions are full. Please join the waitlist."
                    : enrollmentStatus && !enrollmentStatus.canEnroll
                    ? enrollmentStatus.reason || "Prerequisites not met"
                    : undefined
                }
              >
                {isAddingToCart ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : !session?.user ? (
                  <>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Login to Enroll
                  </>
                ) : (currentInstance && currentInstance.is_full) || (!currentInstance && instances.every(inst => inst.is_full)) ? (
                  <>
                    <AlertCircle className="mr-2 h-4 w-4" />
                    All Sessions Full
                  </>
                ) : enrollmentStatus && !enrollmentStatus.canEnroll ? (
                  <>
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Prerequisites Required
                  </>
                ) : (
                  <>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Enroll Now
                  </>
                )}
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/#courses">
                  View All Courses
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </section>

          {/* Enroll Dialog - 选择实例 */}
          <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Select a Session</DialogTitle>
                <DialogDescription>
                  Choose a session to enroll in. Please review the details before proceeding.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 mt-4">
                {instances.map((instance: any) => (
                  <div
                    key={instance.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedInstanceId === instance.id
                        ? 'border-primary bg-primary/5'
                        : instance.is_full
                        ? 'border-muted bg-muted/30 opacity-60 cursor-not-allowed'
                        : 'border-border hover:border-primary hover:bg-muted/50'
                    }`}
                    onClick={() => !instance.is_full && setSelectedInstanceId(instance.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {instance.assignment?.category && instance.assignment?.series && (
                          <p className="font-semibold text-sm mb-2">
                            {instance.assignment.category.display_name || instance.assignment.category.name} &gt; {instance.assignment.series.display_name || instance.assignment.series.name}
                          </p>
                        )}
                        <div className="space-y-1 text-sm text-muted-foreground">
                          {instance.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span>{instance.location.name}</span>
                            </div>
                          )}
                          {instance.start_date && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>Starts: {formatDate(instance.start_date)}</span>
                            </div>
                          )}
                          {instance.class_time && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>Time: {formatTime(instance.class_time)}</span>
                            </div>
                          )}
                          {instance.available_capacity !== undefined && (
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span>
                                {instance.is_full 
                                  ? 'Full' 
                                  : `${instance.available_capacity} spots available`}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedInstanceId === instance.id && (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        )}
                        {instance.is_full && (
                          <Badge variant="destructive" className="shrink-0">
                            Full
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEnrollDialogOpen(false);
                    setSelectedInstanceId(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleAddToCart()}
                  disabled={
                    !selectedInstanceId || 
                    isAddingToCart ||
                    (selectedInstanceId && instances.find(i => i.id === selectedInstanceId)?.is_full) ||
                    (session?.user && enrollmentStatus && !enrollmentStatus.canEnroll)
                  }
                  className="flex-1"
                  title={
                    !selectedInstanceId
                      ? "Please select a session"
                      : selectedInstanceId && instances.find(i => i.id === selectedInstanceId)?.is_full
                      ? "This session is full. Please join the waitlist."
                      : enrollmentStatus && !enrollmentStatus.canEnroll
                      ? enrollmentStatus.reason || "Prerequisites not met"
                      : undefined
                  }
                >
                  {isAddingToCart ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : selectedInstanceId && instances.find(i => i.id === selectedInstanceId)?.is_full ? (
                    <>
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Session Full
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Add to Cart
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};
