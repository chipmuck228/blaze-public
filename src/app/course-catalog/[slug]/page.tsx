import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CourseDetail } from "@/components/CourseDetail";
import { MobileLayout } from "@/app/mobile-layout";
import { notFound } from "next/navigation";
import { getCourseWithDetailsBySlug, getCourseWithDetails } from "@/lib/db";
import type { Metadata } from "next";
import { CourseDetailPageClient } from "./client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  
  // 如果 slug 是 "undefined" 或空字符串，返回默认 metadata
  if (!rawSlug || rawSlug === 'undefined') {
    return {
      title: "Course Not Found",
    };
  }
  
  // 解码 URL 编码的 slug
  const slug = decodeURIComponent(rawSlug);
  
  // 检查是否是 ID 格式（UUID）
  const isId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
  
  const course = isId 
    ? await getCourseWithDetails(slug)
    : await getCourseWithDetailsBySlug(slug);

  if (!course) {
    return {
      title: "Course Not Found",
    };
  }

  // 公开页面只显示 published 状态的课程
  if (course.status !== 'published') {
    return {
      title: "Course Not Found",
    };
  }

  return {
    title: course.name,
    description: course.description || `Learn more about ${course.name}`,
  };
}

export default async function CourseDetailPage({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}) {
  const { slug: rawSlug } = await params;
  
  // 如果 slug 是 "undefined" 或空字符串，返回 404
  if (!rawSlug || rawSlug === 'undefined') {
    notFound();
  }
  
  // 解码 URL 编码的 slug（Next.js 应该已经解码了，但为了安全起见再次解码）
  const slug = decodeURIComponent(rawSlug);
  
  // 检查是否是 ID 格式（UUID），如果是则使用 ID 查询，否则使用 slug
  const isId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
  
  const course = isId 
    ? await getCourseWithDetails(slug)
    : await getCourseWithDetailsBySlug(slug);

  if (!course) {
    notFound();
  }

  // 公开页面只显示 published 状态的课程
  if (course.status !== 'published') {
    notFound();
  }

  return <CourseDetailPageClient course={course} />;
}
