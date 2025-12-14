'use client'
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AllCourses } from "@/components/AllCourses";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { CourseDetail } from "@/components/CourseDetail";
import { Loader2 } from "lucide-react";

function CourseDetailById() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const courseId = searchParams.get('id');
  const [course, setCourse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (courseId) {
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
  }, [courseId, router]);

  if (!courseId) {
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
  return (
    <>
      <Navbar />
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }>
        <CourseDetailById />
      </Suspense>
      <Footer />
    </>
  );
}
