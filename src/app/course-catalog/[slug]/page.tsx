import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CourseDetail } from "@/components/CourseDetail";
import { MobileLayout } from "@/app/mobile-layout";
import { notFound } from "next/navigation";
import { getCourseWithDetailsBySlug, getCourseWithDetails } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase";
import type { Metadata } from "next";
import { CourseDetailPageClient } from "./client";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ instance?: string; franchise?: string }>;
}): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const { instance } = await searchParams;
  
  // 如果 slug 是 "undefined" 或空字符串，返回默认 metadata
  if (!rawSlug || rawSlug === 'undefined') {
    return {
      title: "Course Not Found",
    };
  }
  
  // 解码 URL 编码的 slug
  const slug = decodeURIComponent(rawSlug);
  
  // 如果有 instance 参数，尝试从 instance_v2 获取 offering 信息
  if (instance) {
    try {
      const { data: instanceV2 } = await supabaseAdmin
        .from('instance_v2')
        .select(`
          offering:offerings_v2(
            id,
            name,
            slug,
            description,
            status
          )
        `)
        .eq('id', instance)
        .eq('is_active', true)
        .single()

      if (instanceV2) {
        const offering = Array.isArray(instanceV2.offering) 
          ? instanceV2.offering[0] 
          : instanceV2.offering

        if (offering && offering.status === 'published') {
          return {
            title: offering.name,
            description: offering.description || `Learn more about ${offering.name}`,
          };
        }
      }
    } catch (error) {
      console.error('[CourseDetailPage] Error fetching instance for metadata:', error);
    }
  }
  
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
  params,
  searchParams,
}: { 
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ instance?: string; franchise?: string }>;
}) {
  const { slug: rawSlug } = await params;
  const { instance: instanceId } = await searchParams;
  
  // 如果 slug 是 "undefined" 或空字符串，返回 404
  if (!rawSlug || rawSlug === 'undefined') {
    notFound();
  }
  
  // 解码 URL 编码的 slug（Next.js 应该已经解码了，但为了安全起见再次解码）
  const slug = decodeURIComponent(rawSlug);
  
  // 如果有 instance 参数，尝试从 instance_v2 获取 offering 信息
  // 然后构建一个兼容的 course 对象传递给 CourseDetail
  if (instanceId) {
    try {
      const { data: instanceV2 } = await supabaseAdmin
        .from('instance_v2')
        .select(`
          id,
          offering:offerings_v2(
            id,
            name,
            slug,
            description,
            poster_url,
            offering_type,
            status,
            base_price,
            target_audience,
            learning_outcomes,
            prerequisites
          )
        `)
        .eq('id', instanceId)
        .eq('is_active', true)
        .single()

      if (instanceV2) {
        const offering = Array.isArray(instanceV2.offering) 
          ? instanceV2.offering[0] 
          : instanceV2.offering

        if (offering && offering.status === 'published') {
          // 验证 slug 是否匹配
          if (offering.slug === slug || offering.id === slug) {
            // 构建兼容的 course 对象
            const course = {
              id: offering.id,
              name: offering.name,
              slug: offering.slug,
              description: offering.description,
              poster_url: offering.poster_url,
              status: offering.status,
              base_price: offering.base_price,
              target_audience: offering.target_audience,
              learning_outcomes: offering.learning_outcomes,
              prerequisites: offering.prerequisites,
              // 这些字段在新架构中不存在于 offering，设置为 null
              duration_hours: null,
              session_count: null,
              age_min: null,
              age_max: null,
              grade_level: null,
              cancellation_policy: null,
              subcategories: [],
              assignments: [],
              prerequisites_list: [],
            } as any;

            return <CourseDetailPageClient course={course} />;
          }
        }
      }
    } catch (error) {
      console.error('[CourseDetailPage] Error fetching instance:', error);
      // 如果出错，继续尝试从 course 表查询
    }
  }
  
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
