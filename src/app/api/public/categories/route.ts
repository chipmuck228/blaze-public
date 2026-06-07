import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { supabaseAdmin } from "@/lib/supabase"
import { catalogTables } from "@/lib/catalog-db"

// 获取所有活跃的课程类别（公开 API）- table via catalogTables.stage (v2_category / v3_stage)
export async function GET() {
  try {
    console.log(`[${catalogTables.stage}] Fetching categories...`);
    
    // 检查环境变量
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl) {
      console.error(`[${catalogTables.stage}] Missing NEXT_PUBLIC_SUPABASE_URL`);
      return NextResponse.json(
        { error: "Server configuration error: Missing Supabase URL" },
        { status: 500 }
      );
    }
    
    // 从 v2_category 表获取活跃类别（is_active = true），按 display_order 升序（0 起）
    const { data, error } = await supabaseAdmin
      .from(catalogTables.stage)
      .select('id, name, display_name, description, poster_url, link, is_active, display_order')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error(`[${catalogTables.stage}] Supabase error:`, {
        message: getErrorMessage(error),
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw new Error(`Failed to fetch categories: ${getErrorMessage(error)}`)
    }

    console.log(`[${catalogTables.stage}] Successfully fetched ${data?.length || 0} categories`);
    return NextResponse.json({ categories: data || [] }, { status: 200 })
  } catch (error: unknown) {
    console.error(`[${catalogTables.stage}] Error fetching categories:`, {
      message: getErrorMessage(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      cause: error instanceof Error ? error.cause : undefined,
      error,
    });
    
    // 如果是网络错误，返回更友好的错误信息
    const causeCode =
      error instanceof Error && error.cause && typeof error.cause === "object" && "code" in error.cause
        ? String((error.cause as { code?: string }).code)
        : undefined
    if (
      getErrorMessage(error).includes("fetch failed") ||
      (error instanceof Error && error.name === "TypeError") ||
      causeCode === "ECONNREFUSED"
    ) {
      console.error(`[${catalogTables.stage}] Network connection error - Supabase may be unreachable`);
      return NextResponse.json(
        { error: "Database connection failed. Please check your network connection and try again later." },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch categories" },
      { status: 500 }
    )
  }
}

