import { NextRequest } from 'next/server'
import { streamText, UIMessage, convertToModelMessages } from 'ai'
import { google } from '@ai-sdk/google'
import { getFranchiseDetailsByCode, getFranchiseLocations } from '@/lib/db'

// Note: Using nodejs runtime because db functions may not be compatible with edge
// export const runtime = 'edge'

// 配置 Google SDK（支持代理和超时）
// Node.js 会自动使用 HTTP_PROXY 和 HTTPS_PROXY 环境变量
// 如果配置了代理，会在控制台显示
if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
  console.log('[AI Chat] Proxy configured:', {
    http: process.env.HTTP_PROXY,
    https: process.env.HTTPS_PROXY,
  })
}

export async function POST(req: NextRequest) {
  try {
    const { messages, franchiseCode }: { messages: UIMessage[]; franchiseCode: string } = await req.json()

    if (!franchiseCode) {
      return new Response('franchiseCode is required', { status: 400 })
    }

    // 获取 franchise 和 location 信息
    const franchise = await getFranchiseDetailsByCode(franchiseCode)
    if (!franchise) {
      return new Response('Franchise not found', { status: 404 })
    }

    const locations = await getFranchiseLocations(franchise.id)

    // 构建基本信息
    const primaryLocation = locations[0]
    const primaryAddress = primaryLocation
      ? [
          primaryLocation.address,
          primaryLocation.city,
          primaryLocation.state,
          primaryLocation.zip_code,
        ]
          .filter(Boolean)
          .join(', ')
      : null

    const contactPhone =
      franchise.branding_config?.contact?.phone ||
      locations.find((l) => l.phone)?.phone ||
      null

    const contactEmail =
      franchise.branding_config?.contact?.email ||
      locations.find((l) => l.email)?.email ||
      null

    const organizationIntro =
      franchise.branding_config?.hero?.description ||
      'Blaze Robotics Academy provides robotics, coding, and engineering programs for students of all ages. We offer hands-on learning experiences that prepare students for real-world robotics challenges.'

    const businessHours = franchise.branding_config?.contact?.businessHours

    // 构建 locations 列表
    const locationsList = locations
      .map((loc) => {
        const address = [loc.address, loc.city, loc.state, loc.zip_code]
          .filter(Boolean)
          .join(', ')
        return `- ${loc.name}: ${address}${loc.phone ? ` (Phone: ${loc.phone})` : ''}${loc.email ? ` (Email: ${loc.email})` : ''}`
      })
      .join('\n')

    // 构建 System Prompt
    const systemPrompt = `You are a helpful customer service assistant for Blaze Robotics Academy, specifically for the ${franchise.name || franchiseCode} campus.

Your role:
- Answer questions about the campus location, address, contact information, and general information about Blaze Robotics Academy
- Provide accurate information based on the provided context
- Be friendly, professional, and concise
- If you don't know something, admit it and suggest contacting the campus directly

About ${franchise.name || franchiseCode} campus:
- Location Name: ${franchise.name || franchiseCode}
${primaryAddress ? `- Primary Address: ${primaryAddress}` : ''}
${contactPhone ? `- Phone: ${contactPhone}` : ''}
${contactEmail ? `- Email: ${contactEmail}` : ''}
${businessHours ? `- Business Hours: ${JSON.stringify(businessHours)}` : ''}

About Blaze Robotics Academy:
${organizationIntro}

Available Locations:
${locationsList || 'No additional locations listed.'}

Important guidelines:
- Always mention the specific location name when relevant
- For questions about specific courses, schedules, or enrollment, politely redirect users to view the course catalog or contact the campus directly
- For urgent matters, suggest contacting the campus directly
- Keep answers concise and helpful
- If asked about courses, say: "I can help you with general information about our campus. For specific course details, schedules, and enrollment, please visit our course catalog or contact us directly."
- Use the contact information provided above when users ask how to reach the campus`

    // 调用 AI SDK (使用 Gemini 模型)
    const result = await streamText({
      model: google('gemini-2.5-flash'),
      system: systemPrompt,
      messages: convertToModelMessages(messages),
      temperature: 0.7,
    })

    // 返回 UIMessage 流式响应，与 @ai-sdk/react 的 useChat hook 兼容
    return result.toUIMessageStreamResponse()
  } catch (error: any) {
    console.error('Error in AI chat API:', error)
    
    // 提供更友好的错误信息
    let errorMessage = "I'm experiencing some technical difficulties. Please try again in a moment, or feel free to contact our campus directly."
    let statusCode = 500

    const errorMsg = error.message?.toLowerCase() || ''

    if (errorMsg.includes('timeout') || errorMsg.includes('connect timeout')) {
      errorMessage = "I'm having trouble connecting right now. Please check your internet connection and try again in a moment."
      statusCode = 504
    } else if (errorMsg.includes('connect') || errorMsg.includes('econnrefused') || errorMsg.includes('network')) {
      errorMessage = "I'm temporarily unavailable. Please try again in a few moments, or contact our campus directly for immediate assistance."
      statusCode = 503
    } else if (errorMsg.includes('quota') || errorMsg.includes('rate limit') || errorMsg.includes('limit')) {
      errorMessage = "I'm currently processing many requests. Please try again in a moment."
      statusCode = 429
    } else if (errorMsg.includes('unauthorized') || errorMsg.includes('forbidden')) {
      errorMessage = "I'm temporarily unavailable. Please try again in a few moments, or contact our campus directly for immediate assistance."
      statusCode = 403
    } else if (errorMsg.includes('not found') || errorMsg.includes('404')) {
      errorMessage = "I couldn't find the information you're looking for. Please try rephrasing your question or contact our campus directly."
      statusCode = 404
    }

    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }),
      {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

