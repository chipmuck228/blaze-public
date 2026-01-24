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
import { CheckCircle2, Users, Target, BookOpen, Clock, Calendar, DollarSign, MapPin, ArrowRight, ArrowLeft, AlertCircle, Loader2, ShoppingCart, ShieldCheck, Award } from "lucide-react";
import { CourseWithDetails } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase";
import { CancellationPolicy } from "./CancellationPolicy";

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
  price_override?: number;
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
    cancellation_policy?: string | null; // Phase 4: 从 franchise 获取取消政策
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
  const [programInstances, setProgramInstances] = useState<any[]>([]);
  const [previousInstance, setPreviousInstance] = useState<any | null>(null);
  const [nextInstance, setNextInstance] = useState<any | null>(null);
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

  // 获取同一个 program 的所有 instances
  const fetchProgramInstances = async (programId: string, currentInstanceId: string) => {
    try {
      console.log(`[CourseDetail] Fetching program instances for program ${programId}, current instance: ${currentInstanceId}`);
      
      // 通过 program (series) 获取所有 assignments
      const { data: assignmentsData, error: assignmentsError } = await supabaseAdmin
        .from('course_assignments')
        .select('id')
        .eq('series_id', programId)
        .eq('is_active', true);

      if (assignmentsError) {
        console.error('[CourseDetail] Error fetching assignments:', assignmentsError);
        setPreviousInstance(null);
        setNextInstance(null);
        return;
      }

      if (!assignmentsData || assignmentsData.length === 0) {
        console.log(`[CourseDetail] No assignments found for program ${programId}`);
        setPreviousInstance(null);
        setNextInstance(null);
        return;
      }

      console.log(`[CourseDetail] Found ${assignmentsData.length} assignments for program ${programId}`);
      const assignmentIds = assignmentsData.map((a: any) => a.id);

      // 获取这些 assignments 的所有 instances
      const { data: instancesData, error: instancesError } = await supabaseAdmin
        .from('course_instances')
        .select(`
          id,
          start_date,
          end_date,
          start_time,
          end_time,
          assignment:course_assignments(
            id,
            course:courses(
              id,
              name,
              slug
            )
          )
        `)
        .in('assignment_id', assignmentIds)
        .eq('is_active', true)
        .in('status', ['scheduled', 'ongoing'])
        .order('start_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (instancesError) {
        console.error('[CourseDetail] Error fetching instances:', instancesError);
        setPreviousInstance(null);
        setNextInstance(null);
        return;
      }

      if (!instancesData || instancesData.length === 0) {
        console.log(`[CourseDetail] No instances found for assignments`);
        setPreviousInstance(null);
        setNextInstance(null);
        return;
      }

      console.log(`[CourseDetail] Found ${instancesData.length} instances for program ${programId}`);

      const instances = (instancesData || []).map((inst: any) => {
        const assignment = Array.isArray(inst.assignment) ? inst.assignment[0] : inst.assignment;
        const course = assignment?.course ? (Array.isArray(assignment.course) ? assignment.course[0] : assignment.course) : null;
        return {
          id: inst.id,
          start_date: inst.start_date,
          course: course ? { id: course.id, name: course.name, slug: course.slug } : null,
        };
      });

      // 找到当前 instance 的位置
      const currentIndex = instances.findIndex((inst: any) => inst.id === currentInstanceId);
      
      console.log(`[CourseDetail] Current instance index: ${currentIndex}, total instances: ${instances.length}`);
      console.log(`[CourseDetail] Instance IDs:`, instances.map((inst: any) => inst.id));
      console.log(`[CourseDetail] Looking for instance ID: ${currentInstanceId}`);
      
      if (currentIndex === -1) {
        console.warn(`[CourseDetail] Current instance ${currentInstanceId} not found in instances list`);
        setPreviousInstance(null);
        setNextInstance(null);
        return;
      }
      
      if (currentIndex > 0) {
        const prevInst = instances[currentIndex - 1];
        setPreviousInstance(prevInst);
        console.log(`[CourseDetail] Previous instance set:`, prevInst.id, prevInst.course?.name);
      } else {
        setPreviousInstance(null);
        console.log(`[CourseDetail] No previous instance (currentIndex: ${currentIndex})`);
      }

      if (currentIndex >= 0 && currentIndex < instances.length - 1) {
        const nextInst = instances[currentIndex + 1];
        setNextInstance(nextInst);
        console.log(`[CourseDetail] Next instance set:`, nextInst.id, nextInst.course?.name);
      } else {
        setNextInstance(null);
        console.log(`[CourseDetail] No next instance (currentIndex: ${currentIndex}, total: ${instances.length})`);
      }
      
      // 验证 state 是否设置成功
      setTimeout(() => {
        console.log(`[CourseDetail] State after setting:`, {
          previousInstance: previousInstance?.id,
          nextInstance: nextInstance?.id
        });
      }, 100);
    } catch (err: any) {
      console.error('[CourseDetail] Error fetching program instances:', err);
      setPreviousInstance(null);
      setNextInstance(null);
    }
  };

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
        hasFranchise: !!data.franchise,
        hasProgram: !!data.program,
        programId: data.program?.id
      });
      
      setCurrentInstance(data);
      // 如果 instance 有 franchise，更新 selectedFranchise
      if (data.franchise) {
        setSelectedFranchise(data.franchise.code);
      }
      
      // 获取同一个 program 的所有 instances
      if (data.program?.id) {
        console.log(`[CourseDetail] Calling fetchProgramInstances with programId: ${data.program.id}, instanceId: ${instanceId}`);
        fetchProgramInstances(data.program.id, instanceId);
      } else {
        console.log(`[CourseDetail] No program ID found, clearing navigation`);
        setPreviousInstance(null);
        setNextInstance(null);
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

  // 监听 previousInstance 和 nextInstance 的变化
  useEffect(() => {
    console.log('[CourseDetail] Navigation state updated:', {
      hasPrevious: !!previousInstance,
      hasNext: !!nextInstance,
      previousId: previousInstance?.id,
      nextId: nextInstance?.id,
      previousCourse: previousInstance?.course?.name,
      nextCourse: nextInstance?.course?.name
    });
  }, [previousInstance, nextInstance]);

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
  // Phase 4: 优先使用 franchise.cancellation_policy
  const displayCourse = currentInstance?.course 
    ? { 
        ...course, 
        ...currentInstance.course,
        // Phase 4: 优先使用 franchise 的取消政策
        cancellation_policy: currentInstance.franchise?.cancellation_policy || currentInstance.course.cancellation_policy || course.cancellation_policy
      } 
    : course;

  // 获取价格和库存信息
  const basePrice = currentInstance?.price_override || displayCourse.base_price || 0;
  const availableSpots = currentInstance?.available_capacity || 0;
  const isFull = currentInstance?.is_full || false;
  
  // 获取日期和位置信息
  const dates = currentInstance?.start_date 
    ? `${formatDate(currentInstance.start_date)}${currentInstance.end_date ? ` - ${formatDate(currentInstance.end_date)}` : ''}`
    : 'TBD';
  const locations = currentInstance?.location 
    ? [currentInstance.location.name]
    : currentInstance?.franchise?.name 
    ? [currentInstance.franchise.name]
    : ['Multiple Locations'];
  
  // 获取年龄组
  const ageGroup = displayCourse.age_min && displayCourse.age_max
    ? `Ages ${displayCourse.age_min}-${displayCourse.age_max}`
    : displayCourse.age_min
    ? `Ages ${displayCourse.age_min}+`
    : displayCourse.age_max
    ? `Up to Age ${displayCourse.age_max}`
    : displayCourse.grade_level
    ? `Grades ${displayCourse.grade_level}`
    : 'All Ages';

  return (
    <div className="bg-slate-50 min-h-screen pb-24">
      {/* Sticky Header for Mobile/Quick Nav */}
      {currentInstance && (
        <div className="bg-white border-b border-slate-200 sticky top-20 z-40 px-4 py-3 shadow-sm md:hidden flex justify-between items-center">
          <span className="font-bold text-slate-900 truncate pr-4">{displayCourse.name}</span>
          <button 
            onClick={() => {
              if (currentInstance) {
                handleAddToCart(currentInstance.id);
              } else {
                handleEnrollClick();
              }
            }}
            disabled={
              isLoadingInstance ||
              isFull ||
              isAddingToCart ||
              !!(session?.user && enrollmentStatus && !enrollmentStatus.canEnroll)
            }
            className="bg-[#2563eb] text-white px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAddingToCart ? 'Adding...' : isFull ? 'Full' : 'Book Now'}
          </button>
        </div>
      )}

      {/* Hero Section */}
      <div className="bg-[#0f172a] text-white relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          {displayCourse.poster_url && (
            <>
              <Image
                src={displayCourse.poster_url}
                alt={displayCourse.name || 'Course image'}
                fill
                className="object-cover opacity-20 blur-sm scale-105"
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/80 to-transparent"></div>
            </>
          )}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-12 pb-24">
          {/* Back Link */}
          <Link 
            href={currentInstance?.franchise 
              ? `/course-catalog?franchise=${currentInstance.franchise.code}` 
              : selectedFranchise 
              ? `/course-catalog?franchise=${selectedFranchise}` 
              : '/course-catalog'} 
            className="inline-flex items-center text-slate-400 hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Programs
          </Link>
          
          <div className="flex flex-col md:flex-row gap-8 items-start">
             <div className="flex-grow">
                <div className="flex flex-wrap gap-3 mb-4">
                  {currentInstance?.category && (
                    <span className="bg-[#2563eb] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                      {currentInstance.category.display_name || currentInstance.category.name}
                    </span>
                  )}
                  <span className="bg-white/10 border border-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    {ageGroup}
                  </span>
                </div>
                <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">{displayCourse.name}</h1>
                <div className="flex flex-col sm:flex-row gap-6 text-slate-300 font-medium text-lg">
                  {dates !== 'TBD' && (
                    <div className="flex items-center">
                      <Calendar className="w-5 h-5 mr-2 text-[#38bdf8]" />
                      {dates}
                    </div>
                  )}
                  {locations.length > 0 && (
                    <div className="flex items-center">
                      <MapPin className="w-5 h-5 mr-2 text-[#38bdf8]" />
                      {locations.join(', ')}
                    </div>
                  )}
                </div>
             </div>
             
             {/* Desktop Price Card */}
             {currentInstance && (
               <div className="hidden md:block bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl min-w-[300px] text-center">
                  <p className="text-slate-300 text-sm uppercase tracking-widest font-bold mb-2">Registration Fee</p>
                  <div className="text-5xl font-black text-white mb-2">${basePrice.toFixed(2)}</div>
                  <p className="text-slate-400 text-sm mb-6">{isFull ? 'Waitlist Only' : `${availableSpots} spots remaining`}</p>
                  <button 
                    onClick={() => handleAddToCart(currentInstance.id)}
                    disabled={
                      isLoadingInstance ||
                      isFull ||
                      isAddingToCart ||
                      !!(session?.user && enrollmentStatus && !enrollmentStatus.canEnroll)
                    }
                    className="w-full bg-[#2563eb] hover:bg-blue-600 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-blue-500/30 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isAddingToCart ? (
                      <>
                        <Loader2 className="w-4 h-4 inline-block mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : isFull ? (
                      'Join Waitlist'
                    ) : (
                      'Book Your Spot'
                    )}
                  </button>
               </div>
             )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-20">
        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* Left Column: Details */}
          <div className="lg:w-2/3 space-y-8">
            {/* Overview Card */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Program Overview</h2>
              {displayCourse.description && (
                <p className="text-slate-600 text-lg leading-relaxed mb-6">
                  {displayCourse.description}
                </p>
              )}
              {displayCourse.target_audience && (
                <p className="text-slate-600 leading-relaxed mb-6">
                  {displayCourse.target_audience}
                </p>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                <div className="flex items-start">
                   <CheckCircle2 className="w-6 h-6 text-green-500 mr-3 shrink-0" />
                   <div>
                     <h4 className="font-bold text-slate-900">Hands-on Hardware</h4>
                     <p className="text-sm text-slate-500">1:1 Robot Kit Ratio for every student.</p>
                   </div>
                </div>
                <div className="flex items-start">
                   <Users className="w-6 h-6 text-blue-500 mr-3 shrink-0" />
                   <div>
                     <h4 className="font-bold text-slate-900">Small Class Sizes</h4>
                     <p className="text-sm text-slate-500">Maximum 6:1 Student-Teacher ratio.</p>
                   </div>
                </div>
                <div className="flex items-start">
                   <ShieldCheck className="w-6 h-6 text-indigo-500 mr-3 shrink-0" />
                   <div>
                     <h4 className="font-bold text-slate-900">Safe Environment</h4>
                     <p className="text-sm text-slate-500">Background-checked, certified instructors.</p>
                   </div>
                </div>
                <div className="flex items-start">
                   <Award className="w-6 h-6 text-orange-500 mr-3 shrink-0" />
                   <div>
                     <h4 className="font-bold text-slate-900">Certificate of Completion</h4>
                     <p className="text-sm text-slate-500">Awarded at the end of the session.</p>
                   </div>
                </div>
              </div>
            </div>

            {/* Learning Outcomes / Curriculum */}
            {learningOutcomes.length > 0 && (
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                 <h2 className="text-2xl font-bold text-slate-900 mb-6">What They Will Learn</h2>
                 <div className="space-y-6">
                   {learningOutcomes.slice(0, 4).map((outcome: string, week: number) => (
                     <div key={week} className="flex gap-4">
                       <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-lg shrink-0">
                         {week + 1}
                       </div>
                       <div>
                         <h4 className="font-bold text-slate-900 text-lg">Phase {week + 1}</h4>
                         <p className="text-slate-500 mt-1">
                           {outcome.trim()}
                         </p>
                       </div>
                     </div>
                   ))}
                 </div>
              </div>
            )}

            {/* Prerequisites */}
            {((course.prerequisites_list && course.prerequisites_list.length > 0) || displayCourse.prerequisites) && (
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Prerequisites</h2>
                <div className="space-y-4">
                  {course.prerequisites_list && course.prerequisites_list.length > 0 && (
                    <div className="space-y-3">
                      {course.prerequisites_list.filter(p => p.requirement_type === 'required').length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Required:</h4>
                          <div className="space-y-2">
                            {course.prerequisites_list
                              .filter(p => p.requirement_type === 'required')
                              .map((prerequisite) => (
                                <div key={prerequisite.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                                  <Link
                                    href={`/course-catalog/${prerequisite.prerequisite_course?.slug || prerequisite.prerequisite_course_id}`}
                                    className="text-sm hover:text-blue-600 transition-colors"
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
                                <div key={prerequisite.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                                  <CheckCircle2 className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                  <Link
                                    href={`/course-catalog/${prerequisite.prerequisite_course?.slug || prerequisite.prerequisite_course_id}`}
                                    className="text-sm text-slate-600 hover:text-blue-600 transition-colors"
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
                  {displayCourse.prerequisites && (
                    <div className="pt-2 border-t border-slate-200">
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {displayCourse.prerequisites}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Available Instances */}
            {(!currentInstance && instances.length > 0) || (currentInstance && instances.filter(inst => inst.id !== currentInstance.id).length > 0) ? (
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">
                  {currentInstance ? 'Other Available Sessions' : 'Available Sessions'}
                </h2>
                <p className="text-sm text-slate-500 mb-6">
                  {selectedFranchise 
                    ? `Showing sessions for ${franchises.find(f => f.code === selectedFranchise)?.name || selectedFranchise}`
                    : 'Showing all available sessions'}
                </p>
                {isLoadingInstances ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  </div>
                ) : instances.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">
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
                            ? 'bg-slate-50 opacity-60' 
                            : 'bg-slate-50 hover:bg-slate-100 cursor-pointer'
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
                            <div className="space-y-1 text-sm text-slate-600">
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
              </div>
            ) : null}

            {/* Cancellation Policy */}
            <CancellationPolicy policy={
              currentInstance?.franchise?.cancellation_policy || 
              displayCourse.cancellation_policy
            } />
          </div>

          {/* Right Column: Sidebar */}
          <div className="lg:w-1/3 space-y-6">
            
            {/* Mobile Booking Card */}
            {currentInstance && (
              <div className="md:hidden bg-white rounded-3xl p-6 shadow-lg border border-slate-200 text-center">
                  <div className="text-4xl font-black text-slate-900 mb-2">${basePrice.toFixed(2)}</div>
                  <button 
                    onClick={() => handleAddToCart(currentInstance.id)}
                    disabled={
                      isLoadingInstance ||
                      isFull ||
                      isAddingToCart ||
                      !!(session?.user && enrollmentStatus && !enrollmentStatus.canEnroll)
                    }
                    className="w-full bg-[#2563eb] text-white py-3 rounded-xl font-bold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAddingToCart ? (
                      <>
                        <Loader2 className="w-4 h-4 inline-block mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : isFull ? (
                      'Join Waitlist'
                    ) : (
                      'Book Now'
                    )}
                  </button>
              </div>
            )}

            {/* Session Details */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
               <h3 className="font-bold text-slate-900 mb-4 text-lg">Session Details</h3>
               <div className="space-y-4">
                 <div className="flex justify-between items-center py-2 border-b border-slate-50">
                   <div className="flex items-center text-slate-500">
                     <Users className="w-4 h-4 mr-2" />
                     <span>Age Group</span>
                   </div>
                   <span className="font-bold text-slate-900">{ageGroup}</span>
                 </div>
                 {displayCourse.duration_hours && (
                   <div className="flex justify-between items-center py-2 border-b border-slate-50">
                     <div className="flex items-center text-slate-500">
                       <Clock className="w-4 h-4 mr-2" />
                       <span>Duration</span>
                     </div>
                     <span className="font-bold text-slate-900">{displayCourse.duration_hours} hours</span>
                   </div>
                 )}
                 {displayCourse.session_count && (
                   <div className="flex justify-between items-center py-2 border-b border-slate-50">
                     <div className="flex items-center text-slate-500">
                       <Calendar className="w-4 h-4 mr-2" />
                       <span>Sessions</span>
                     </div>
                     <span className="font-bold text-slate-900">{displayCourse.session_count}</span>
                   </div>
                 )}
                 {currentInstance?.location && (
                   <div className="flex justify-between items-center py-2 border-b border-slate-50">
                     <div className="flex items-center text-slate-500">
                       <MapPin className="w-4 h-4 mr-2" />
                       <span>Campus</span>
                     </div>
                     <span className="font-bold text-slate-900 text-right">{currentInstance.location.name}</span>
                   </div>
                 )}
               </div>
            </div>

            {/* Need Help Card */}
            {currentInstance?.franchise && (
              <div className="bg-slate-100 rounded-3xl p-6 border border-slate-200">
                <h3 className="font-bold text-slate-900 mb-2">Need Help?</h3>
                <p className="text-slate-500 text-sm mb-4">Not sure if this is the right level for your student at our {currentInstance.franchise.name} campus?</p>
                <button className="text-blue-600 font-bold text-sm hover:underline">Contact Admissions &rarr;</button>
              </div>
            )}

            {/* Navigation: Previous/Next Instance */}
            {(previousInstance || nextInstance) && (
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between gap-4">
                  {previousInstance ? (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="flex items-center gap-2"
                    >
                      <Link
                        href={
                          (() => {
                            const params = new URLSearchParams();
                            params.set('instance', previousInstance.id);
                            if (currentInstance?.franchise) {
                              params.set('franchise', currentInstance.franchise.code);
                            }
                            if (previousInstance.course?.slug) {
                              return `/course-catalog/${encodeURIComponent(previousInstance.course.slug)}?${params.toString()}`;
                            } else if (previousInstance.course?.id) {
                              params.set('id', previousInstance.course.id);
                              return `/course-catalog?${params.toString()}`;
                            }
                            return `/course-catalog?${params.toString()}`;
                          })()
                        }
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Previous
                      </Link>
                    </Button>
                  ) : (
                    <div></div>
                  )}
                  
                  {nextInstance ? (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="flex items-center gap-2"
                    >
                      <Link
                        href={
                          (() => {
                            const params = new URLSearchParams();
                            params.set('instance', nextInstance.id);
                            if (currentInstance?.franchise) {
                              params.set('franchise', currentInstance.franchise.code);
                            }
                            if (nextInstance.course?.slug) {
                              return `/course-catalog/${encodeURIComponent(nextInstance.course.slug)}?${params.toString()}`;
                            } else if (nextInstance.course?.id) {
                              params.set('id', nextInstance.course.id);
                              return `/course-catalog?${params.toString()}`;
                            }
                            return `/course-catalog?${params.toString()}`;
                          })()
                        }
                      >
                        Next
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  ) : (
                    <div></div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

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
  );
};
