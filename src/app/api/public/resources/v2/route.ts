import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * GET /api/public/resources/v2
 * 返回按分类聚合的、仅启用的资源，供 /resources 页面使用。
 */
export async function GET() {
  try {
    const { data: categories, error: catError } = await supabaseAdmin
      .from("v2_resource_category")
      .select("id, display_name, display_order")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("id", { ascending: true })

    if (catError) {
      console.error("Error fetching resource categories:", catError)
      return NextResponse.json(
        { error: catError.message || "Failed to fetch" },
        { status: 500 }
      )
    }

    if (!categories || categories.length === 0) {
      return NextResponse.json({ categories: [] }, { status: 200 })
    }

    const { data: resources, error: resError } = await supabaseAdmin
      .from("v2_resource")
      .select("id, resource_category_id, title, description, icon, icon_color, document_url, document_label, open_in_new_tab, display_order")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("title", { ascending: true })

    if (resError) {
      console.error("Error fetching resources:", resError)
      return NextResponse.json(
        { error: resError.message || "Failed to fetch" },
        { status: 500 }
      )
    }

    const resourceList = resources || []
    const byCategory = new Map<string, typeof resourceList>([])
    for (const r of resourceList) {
      const cid = r.resource_category_id as string
      if (!byCategory.has(cid)) byCategory.set(cid, [])
      byCategory.get(cid)!.push(r)
    }

    const result = categories.map((c) => ({
      id: c.id,
      display_name: c.display_name,
      display_order: c.display_order,
      resources: (byCategory.get(c.id) || []).map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        icon: r.icon,
        icon_color: r.icon_color,
        document_url: r.document_url,
        document_label: r.document_label ?? "Download",
        open_in_new_tab: r.open_in_new_tab !== false,
      })),
    }))

    return NextResponse.json({ categories: result }, { status: 200 })
  } catch (error: unknown) {
    console.error("Error in public resources API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch" },
      { status: 500 }
    )
  }
}
