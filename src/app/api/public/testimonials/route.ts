import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message: unknown }).message
    if (typeof msg === "string") return msg
  }
  return String(error)
}

// GET /api/public/testimonials?franchise=code
// 返回所有可用的 testimonials，如果指定了 franchise，则返回该 franchise 的 testimonials 和通用的（franchise_id 为 NULL）的
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const franchiseCode = searchParams.get("franchise")

    let query = supabaseAdmin
      .from("testimonials")
      .select(`
        id,
        user_id,
        franchise_id,
        comment,
        display_order,
        user:users(
          id,
          name,
          email,
          image
        )
      `)
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false })

    // 如果指定了 franchise code，获取该 franchise 的 ID
    if (franchiseCode) {
      const { data: franchiseV2 } = await supabaseAdmin
        .from("v2_franchise")
        .select("id")
        .eq("code", franchiseCode.toLowerCase())
        .eq("is_active", true)
        .maybeSingle()

      if (franchiseV2) {
        // 获取该 franchise 的 testimonials 和通用的（franchise_id 为 NULL）的
        query = query.or(`franchise_id.eq.${franchiseV2.id},franchise_id.is.null`)
      } else {
        // 如果 franchise 不存在，只返回通用的
        query = query.is("franchise_id", null)
      }
    } else {
      // 如果没有指定 franchise，返回所有（包括通用的和特定 franchise 的）
      // 这里我们返回所有，或者只返回通用的，根据需求决定
      // 为了保持向后兼容，返回所有活跃的
    }

    const { data, error } = await query

    if (error) {
      throw new Error(toErrorMessage(error))
    }

    const rows = data || []
    const franchiseIds = [
      ...new Set(
        rows
          .map((row) => row.franchise_id as string | null)
          .filter((id): id is string => Boolean(id))
      ),
    ]
    const franchiseById = new Map<string, { id: string; code: string; name: string }>()
    if (franchiseIds.length > 0) {
      const { data: franchises, error: franchiseError } = await supabaseAdmin
        .from("v2_franchise")
        .select("id, code, name")
        .in("id", franchiseIds)
      if (franchiseError) {
        throw new Error(getErrorMessage(franchiseError))
      }
      for (const f of franchises || []) {
        franchiseById.set(f.id, f)
      }
    }

    // 格式化返回数据
    const testimonials = rows.map((testimonial) => {
      const user = Array.isArray(testimonial.user)
        ? testimonial.user[0]
        : testimonial.user
      const franchise = testimonial.franchise_id
        ? franchiseById.get(testimonial.franchise_id as string)
        : undefined
      return {
        id: testimonial.id,
        user_id: testimonial.user_id,
        name: user?.name || "Anonymous",
        email: user?.email || null,
        image_url: user?.image || null,
        comment: testimonial.comment,
        franchise_id: testimonial.franchise_id || null,
        franchise_code: franchise?.code || null,
        franchise_name: franchise?.name || null,
      }
    })

    return NextResponse.json({ testimonials }, { status: 200 })
  } catch (error: unknown) {
    console.error("Error fetching testimonials:", error)
    return NextResponse.json(
      { error: toErrorMessage(error) || "Failed to fetch testimonials" },
      { status: 500 }
    )
  }
}
