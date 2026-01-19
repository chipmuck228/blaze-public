'use client'

import { CourseDetail } from "@/components/CourseDetail";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MobileLayout } from "@/app/mobile-layout";
import { usePlatform } from "@/hooks/usePlatform";
import { useEffect, useState } from "react";

interface CourseDetailPageClientProps {
  course: any;
}

export function CourseDetailPageClient({ course }: CourseDetailPageClientProps) {
  const { isNative, isReady } = usePlatform();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 等待平台检测完成
  if (!mounted || !isReady) {
    return <CourseDetail course={course} />;
  }

  // 移动端：使用移动端布局
  if (isNative) {
    return (
      <MobileLayout>
        <CourseDetail course={course} />
      </MobileLayout>
    );
  }

  // Web 端：使用完整布局
  return (
    <>
      <Navbar />
      <div className="pt-14">
        <CourseDetail course={course} />
        <Footer />
      </div>
    </>
  );
}

