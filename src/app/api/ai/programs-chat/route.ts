import { NextRequest } from "next/server"
import { streamText, convertToModelMessages, type UIMessage } from "ai"
import { createDeepSeek } from "@ai-sdk/deepseek"
import {
  buildProgramsAISystemPrompt,
  type ProgramsAIChatContext,
} from "@/lib/programs-ai-prompt"
import { PROGRAMS_AI_ASSISTANT_ENABLED } from "@/lib/programs-ai-config"

const deepseekProvider = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
})

export async function POST(req: NextRequest) {
  try {
    if (!PROGRAMS_AI_ASSISTANT_ENABLED) {
      return new Response(
        JSON.stringify({ error: "Programs assistant is disabled." }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      )
    }

    if (!process.env.DEEPSEEK_API_KEY) {
      return new Response(
        JSON.stringify({
          error:
            "Programs assistant is not configured. Set DEEPSEEK_API_KEY on the server.",
        }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      )
    }

    const body = await req.json()
    const messages = body.messages as UIMessage[]
    const context = (body.context || {
      page: "programs",
    }) as ProgramsAIChatContext
    const sessionId = body.sessionId as string | undefined

    if (!messages?.length) {
      return new Response("messages are required", { status: 400 })
    }

    const systemPrompt = buildProgramsAISystemPrompt(context)

    const result = await streamText({
      model: deepseekProvider(
        process.env.DEEPSEEK_MODEL || "deepseek-chat"
      ),
      system: systemPrompt,
      messages: convertToModelMessages(messages),
      temperature: 0.7,
    })

    if (sessionId) {
      console.log("[programs-chat] session", sessionId)
    }

    return result.toUIMessageStreamResponse()
  } catch (error: unknown) {
    console.error("[programs-chat]", error)
    const message =
      error instanceof Error ? error.message : "Programs assistant failed"
    let userMessage =
      "I'm having trouble responding right now. Please try again in a moment."
    let statusCode = 500

    const lower = message.toLowerCase()
    if (lower.includes("timeout") || lower.includes("connect")) {
      userMessage =
        "Connection timed out. Please check your network and try again."
      statusCode = 504
    } else if (lower.includes("rate") || lower.includes("quota")) {
      userMessage = "Too many requests. Please wait a moment and try again."
      statusCode = 429
    } else if (lower.includes("unauthorized") || lower.includes("401")) {
      userMessage = "Assistant is temporarily unavailable."
      statusCode = 503
    }

    return new Response(
      JSON.stringify({
        error: userMessage,
        details: process.env.NODE_ENV === "development" ? message : undefined,
      }),
      { status: statusCode, headers: { "Content-Type": "application/json" } }
    )
  }
}
