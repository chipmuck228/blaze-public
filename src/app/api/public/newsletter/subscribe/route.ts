import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { randomBytes } from "crypto"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email } = body

    // 验证邮箱格式
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    // 检查是否已订阅
    const { data: existing } = await supabaseAdmin
      .from("newsletter_subscribers")
      .select("id, is_active")
      .eq("email", email.toLowerCase().trim())
      .single()

    if (existing) {
      if (existing.is_active) {
        return NextResponse.json(
          { error: "Email already subscribed" },
          { status: 400 }
        )
      } else {
        // 重新订阅：更新现有记录
        const unsubscribeToken = randomBytes(32).toString("hex")
        const { error: updateError } = await supabaseAdmin
          .from("newsletter_subscribers")
          .update({
            is_active: true,
            subscribed_at: new Date().toISOString(),
            unsubscribed_at: null,
            unsubscribe_token: unsubscribeToken,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)

        if (updateError) {
          throw updateError
        }

        return NextResponse.json(
          { success: true, message: "Successfully resubscribed to newsletter" },
          { status: 200 }
        )
      }
    }

    // 创建新订阅
    const unsubscribeToken = randomBytes(32).toString("hex")
    const { error: insertError } = await supabaseAdmin
      .from("newsletter_subscribers")
      .insert({
        email: email.toLowerCase().trim(),
        is_active: true,
        unsubscribe_token: unsubscribeToken,
      })

    if (insertError) {
      console.error("Error creating subscription:", insertError)
      return NextResponse.json(
        { error: "Failed to subscribe. Please try again later." },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, message: "Successfully subscribed to newsletter" },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error in newsletter subscribe:", error)
    return NextResponse.json(
      { error: error.message || "Failed to subscribe" },
      { status: 500 }
    )
  }
}
