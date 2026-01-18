import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { randomBytes } from "crypto"
import { sendNewsletterEmail } from "@/lib/email"

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

        // 发送欢迎邮件（重新订阅）
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        const unsubscribeLink = `${baseUrl}/newsletter/unsubscribe?token=${unsubscribeToken}`
        
        const welcomeEmailSubject = "Welcome Back to Our Newsletter!"
        const welcomeEmailContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome Back</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
              <h1 style="color: #2563eb; margin-top: 0;">Welcome Back! 🎉</h1>
              
              <p>We're thrilled to have you back! Your subscription has been reactivated.</p>
              
              <p>You'll continue to receive our latest updates, news, and insights directly in your inbox.</p>
              
              <p style="margin-top: 30px;">Best regards,<br>The Team</p>
            </div>
            
            <div style="margin-top: 40px; padding: 20px; border-top: 1px solid #e0e0e0; text-align: center; font-size: 12px; color: #666;">
              <p style="margin: 0 0 10px 0;">
                You are receiving this email because you resubscribed to our newsletter.
              </p>
              <p style="margin: 0;">
                <a href="${unsubscribeLink}" style="color: #666; text-decoration: underline;">
                  Unsubscribe from this list
                </a>
              </p>
            </div>
          </body>
          </html>
        `
        
        // 异步发送欢迎邮件，不阻塞响应
        sendNewsletterEmail(email.toLowerCase().trim(), welcomeEmailSubject, welcomeEmailContent)
          .then(() => {
            console.log(`Welcome back email sent to ${email}`)
          })
          .catch((error) => {
            console.error(`Failed to send welcome back email to ${email}:`, error)
          })

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

    // 发送欢迎邮件（异步，不阻塞响应）
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const unsubscribeLink = `${baseUrl}/newsletter/unsubscribe?token=${unsubscribeToken}`
    
    const welcomeEmailSubject = "Welcome to Our Newsletter!"
    const welcomeEmailContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Our Newsletter</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
          <h1 style="color: #2563eb; margin-top: 0;">Welcome to Our Newsletter! 🎉</h1>
          
          <p>Thank you for subscribing to our newsletter! We're excited to have you on board.</p>
          
          <p>You'll receive the latest updates, news, and insights directly in your inbox. We promise to only send you valuable content and never spam.</p>
          
          <div style="background-color: #ffffff; padding: 20px; border-radius: 4px; margin: 20px 0;">
            <h2 style="color: #2563eb; margin-top: 0;">What to Expect:</h2>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Latest updates and announcements</li>
              <li>Exclusive content and insights</li>
              <li>Special offers and promotions</li>
              <li>Tips and best practices</li>
            </ul>
          </div>
          
          <p>If you have any questions or feedback, please don't hesitate to reach out to us.</p>
          
          <p style="margin-top: 30px;">Best regards,<br>The Team</p>
        </div>
        
        <div style="margin-top: 40px; padding: 20px; border-top: 1px solid #e0e0e0; text-align: center; font-size: 12px; color: #666;">
          <p style="margin: 0 0 10px 0;">
            You are receiving this email because you subscribed to our newsletter.
          </p>
          <p style="margin: 0;">
            <a href="${unsubscribeLink}" style="color: #666; text-decoration: underline;">
              Unsubscribe from this list
            </a>
          </p>
        </div>
      </body>
      </html>
    `
    
    // 异步发送欢迎邮件，不阻塞响应
    sendNewsletterEmail(email.toLowerCase().trim(), welcomeEmailSubject, welcomeEmailContent)
      .then(() => {
        console.log(`Welcome email sent to ${email}`)
      })
      .catch((error) => {
        console.error(`Failed to send welcome email to ${email}:`, error)
        // 不抛出错误，订阅仍然成功
      })

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
