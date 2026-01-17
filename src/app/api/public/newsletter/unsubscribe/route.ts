import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    // 验证 token 是否存在
    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Unsubscribe token is required" },
        { status: 400 }
      )
    }

    // 验证 token 格式（64 字符十六进制）
    const tokenRegex = /^[a-f0-9]{64}$/i
    if (!tokenRegex.test(token)) {
      return NextResponse.json(
        { error: "Invalid unsubscribe token format" },
        { status: 400 }
      )
    }

    // 查询订阅者
    const { data: subscriber, error: queryError } = await supabaseAdmin
      .from("newsletter_subscribers")
      .select("id, email, is_active")
      .eq("unsubscribe_token", token)
      .single()

    if (queryError || !subscriber) {
      return NextResponse.json(
        { error: "Invalid or expired unsubscribe token" },
        { status: 404 }
      )
    }

    // 检查是否已退订
    if (!subscriber.is_active) {
      return NextResponse.json(
        { error: "You have already unsubscribed from the newsletter" },
        { status: 400 }
      )
    }

    // 执行退订操作
    const { error: updateError } = await supabaseAdmin
      .from("newsletter_subscribers")
      .update({
        is_active: false,
        unsubscribed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscriber.id)

    if (updateError) {
      console.error("Error unsubscribing:", updateError)
      return NextResponse.json(
        { error: "Failed to unsubscribe. Please try again later." },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: "Successfully unsubscribed",
        email: subscriber.email,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error in newsletter unsubscribe:", error)
    return NextResponse.json(
      { error: error.message || "Failed to unsubscribe" },
      { status: 500 }
    )
  }
}
