import { NextRequest } from 'next/server'
import { streamText } from 'ai'
import { google } from '@ai-sdk/google'
import { getFranchiseDetailsByCode, getFranchiseLocations } from '@/lib/db'

// Note: Using nodejs runtime because db functions may not be compatible with edge
// export const runtime = 'edge'

export async function POST(req: NextRequest) {
  try {
    const { messages, franchiseCode } = await req.json()

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
      model: google('gemini-1.5-pro'),
      system: systemPrompt,
      messages: messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: 0.7,
    })

    // Use toTextStreamResponse for useChat hook compatibility
    return result.toTextStreamResponse()
  } catch (error: any) {
    console.error('Error in AI chat API:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

