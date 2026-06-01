'use client'
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AllCourses } from "@/components/AllCourses";
import { AllCoursesMobile } from "@/components/mobile/AllCoursesMobile";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { CourseDetail } from "@/components/CourseDetail";
import { Loader2 } from "lucide-react";
import { MobileLayout } from "@/app/mobile-layout";
import { usePlatform } from "@/hooks/usePlatform";

function CourseCatalogContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isNative, isReady } = usePlatform();
  const courseId = searchParams.get('id');
  const instanceId = searchParams.get('instance');
  const [course, setCourse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 如果有 ?id=xxx 或 ?instance=xxx 参数，显示单个课程详情
  useEffect(() => {
    // 如果有 instance 参数，从 instance API 获取 course 信息
    if (instanceId) {
      console.log(`[CourseCatalogPage] Fetching instance ${instanceId} to get course info`);
      fetch(`/api/public/instances/${instanceId}`)
        .then(res => {
          if (!res.ok) {
            return res.json().then(err => {
              console.error(`[CourseCatalogPage] Instance API error (${res.status}):`, err);
              throw new Error(err.error || 'Instance not found');
            });
          }
          return res.json();
        })
        .then(data => {
          console.log(`[CourseCatalogPage] Instance data received:`, {
            hasCourse: !!data.course,
            courseId: data.course?.id,
            courseName: data.course?.name
          });
          // instance API 返回的数据中包含 course 信息
          if (data.course) {
            setCourse(data.course);
          } else {
            console.error('[CourseCatalogPage] Course not found in instance data:', data);
            throw new Error('Course not found in instance data');
          }
          setIsLoading(false);
        })
        .catch((err) => {
          console.error('[CourseCatalogPage] Error loading instance:', err);
          setIsLoading(false);
          // 不自动跳转，让用户看到错误信息
          // router.push('/course-catalog');
        });
    } 
    // 如果有 id 参数，从 course API 获取 course 信息
    else if (courseId) {
      fetch(`/api/courses/${courseId}`)
        .then(res => {
          if (!res.ok) {
            throw new Error('Course not found');
          }
          return res.json();
        })
        .then(data => {
          setCourse(data);
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
          router.push('/course-catalog');
        });
    } else {
      setIsLoading(false);
    }
  }, [courseId, instanceId, router]);

  // 如果没有 ?id=xxx 或 ?instance=xxx 参数，显示课程列表
  // AllCourses 组件会自己读取 ?franchise=xxx 参数来决定显示哪个校区的课程
  if (!courseId && !instanceId) {
    // 移动端：使用移动端优化的课程列表
    if (isReady && isNative) {
      return <AllCoursesMobile />;
    }
    // Web 端：使用完整课程列表
    return <AllCourses />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!course) {
    return null;
  }

  return <CourseDetail course={course} />;
}

export default function CourseCatalogPage() {
  const { isNative, isReady } = usePlatform();

  // 移动端：使用移动端布局
  if (isReady && isNative) {
    return (
      <MobileLayout>
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }>
          <CourseCatalogContent />
        </Suspense>
      </MobileLayout>
    );
  }

  // Web 端：使用完整布局
  return (
    <>
      <Navbar />
      <div className="pt-14">
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }>
          <CourseCatalogContent />
        </Suspense>
        <Footer />
      </div>
    </>
  );
}
