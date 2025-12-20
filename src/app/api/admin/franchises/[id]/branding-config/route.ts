import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import type { FranchiseBrandingConfig } from "@/lib/db"

// 更新 franchise 的 branding_config
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { branding_config }: { branding_config: FranchiseBrandingConfig } = body

    if (!branding_config) {
      return NextResponse.json(
        { error: "Missing branding_config" },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from("franchises")
      .update({ branding_config })
      .eq("id", id)
      .select("id, code, name, branding_config")
      .single()

    if (error) {
      console.error("Error updating branding config:", error)
      return NextResponse.json(
        { error: error.message || "Failed to update branding config" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error("Error updating branding config:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update branding config" },
      { status: 500 }
    )
  }
}

