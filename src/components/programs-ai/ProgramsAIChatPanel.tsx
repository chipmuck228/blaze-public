"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { usePathname, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Bot,
  ChevronDown,
  Loader2,
  MessageCircle,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PROGRAMS_AI_WELCOME_MESSAGE } from "@/lib/programs-ai-prompt"
import type { ProgramsAIChatContext } from "@/lib/programs-ai-prompt"
import {
  loadOrCreateProgramsAISession,
  startNewProgramsAISession,
  touchProgramsAISession,
  type ProgramsAISessionRecord,
} from "@/lib/programs-ai-session"
import { useProgramsAIAssistant } from "@/contexts/programs-ai-assistant-context"
import { ProgramsAIChatMarkdown } from "@/components/programs-ai/ProgramsAIChatMarkdown"

function welcomeMessage() {
  return {
    id: "welcome",
    role: "assistant" as const,
    parts: [{ type: "text" as const, text: PROGRAMS_AI_WELCOME_MESSAGE }],
  }
}

function resolvePageContext(
  pathname: string,
  categorySlug: string | null
): ProgramsAIChatContext {
  if (pathname.includes("/instance/")) {
    return {
      page: "instance",
      categorySlug,
      locationCode: null,
    }
  }
  if (pathname.startsWith("/category/")) {
    return { page: "category", categorySlug, locationCode: null }
  }
  return { page: "programs", categorySlug: null, locationCode: null }
}

export function ProgramsAIChatPanel() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { chatOpen, chatMinimized, minimizeChat, expandChat } =
    useProgramsAIAssistant()

  const [session, setSession] = useState<ProgramsAISessionRecord | null>(null)
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const categorySlug = useMemo(() => {
    const match = pathname.match(/^\/category\/([^/]+)/)
    return match?.[1] ?? null
  }, [pathname])

  const locationCode = searchParams.get("location")

  const chatContext = useMemo(
    () => ({
      ...resolvePageContext(pathname, categorySlug),
      locationCode,
    }),
    [pathname, categorySlug, locationCode]
  )

  useEffect(() => {
    setSession(loadOrCreateProgramsAISession())
  }, [])

  const sessionId = session?.sessionId ?? "programs-ai-pending"

  const { messages, sendMessage, status, error, setMessages } = useChat({
    id: sessionId,
    transport: new DefaultChatTransport({
      api: "/api/ai/programs-chat",
      body: {
        context: chatContext,
        sessionId,
      },
    }),
    messages: [welcomeMessage()],
  })

  const isLoading = status === "streaming" || status === "submitted"

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, chatOpen, chatMinimized])

  const handleNewConversation = useCallback(() => {
    const next = startNewProgramsAISession()
    setSession(next)
    setMessages([welcomeMessage()])
    setInput("")
  }, [setMessages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    const text = input.trim()
    setInput("")
    if (session) {
      setSession(touchProgramsAISession(session))
    }
    await sendMessage({ text })
    if (session) {
      setSession(touchProgramsAISession(session))
    }
  }

  if (!chatOpen) return null

  return (
    <div
      className={cn(
        "fixed z-[100] flex flex-col shadow-2xl overflow-hidden border border-slate-200/80 bg-white",
        "right-4 sm:right-6 w-[min(100vw-2rem,400px)] rounded-2xl",
        chatMinimized
          ? "bottom-4 sm:bottom-6 h-auto"
          : "bottom-4 sm:bottom-6 h-[min(72vh,560px)]"
      )}
      role="dialog"
      aria-label="Blaze Robotics AI assistant chat"
    >
      <div className="relative bg-gradient-to-br from-[#1d4ed8] via-[#2563eb] to-[#3b82f6] text-white px-4 pt-3 pb-4 shrink-0">
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.08) 8px, rgba(255,255,255,0.08) 16px)",
          }}
        />
        <div className="relative flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center shrink-0 border border-white/30">
              <Bot className="h-5 w-5 text-white" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">Blaze Robotics</p>
              <p className="text-xs text-blue-100 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                Online · replies in a few minutes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={handleNewConversation}
              title="New conversation"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={chatMinimized ? expandChat : minimizeChat}
              title={chatMinimized ? "Expand chat" : "Minimize chat"}
              aria-expanded={!chatMinimized}
            >
              <ChevronDown
                className={cn(
                  "h-5 w-5 transition-transform",
                  chatMinimized && "rotate-180"
                )}
              />
            </Button>
          </div>
        </div>
        <div className="relative mt-3 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium border border-white/25">
            <MessageCircle className="h-4 w-4" />
            Chat
          </div>
        </div>
      </div>

      {!chatMinimized && (
        <>
          <ScrollArea className="flex-1 min-h-0 bg-white">
            <div className="p-4 space-y-3">
              {messages.map((message) => {
                const isUser = (message.role as string) === "user"
                return (
                  <div
                    key={message.id}
                    className={cn("flex gap-2", isUser ? "justify-end" : "justify-start")}
                  >
                    {!isUser && (
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="h-4 w-4 text-blue-600" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                        isUser
                          ? "bg-[#2563eb] text-white rounded-br-md"
                          : "bg-slate-100 text-slate-800 rounded-bl-md"
                      )}
                    >
                      {message.parts.map((part, i) => {
                        if (part.type !== "text") return null
                        const text = part.text
                        if (isUser) {
                          return (
                            <p
                              key={`${message.id}-${i}`}
                              className="whitespace-pre-wrap"
                            >
                              {text}
                            </p>
                          )
                        }
                        return (
                          <ProgramsAIChatMarkdown
                            key={`${message.id}-${i}`}
                            content={text}
                          />
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              {isLoading && (
                <div className="flex gap-2">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  </div>
                  <div className="bg-slate-100 rounded-2xl px-3 py-2 text-sm text-slate-500">
                    Thinking…
                  </div>
                </div>
              )}
              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  Something went wrong. Please try again or start a new conversation.
                </p>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <form
            onSubmit={handleSubmit}
            className="p-3 border-t border-slate-100 bg-slate-50/80 shrink-0"
          >
            <div className="rounded-xl border border-slate-200 bg-white p-2 focus-within:ring-2 focus-within:ring-blue-500/30">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message…"
                rows={2}
                disabled={isLoading}
                className="min-h-[52px] resize-none border-0 shadow-none focus-visible:ring-0 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    void handleSubmit(e)
                  }
                }}
              />
              <div className="flex items-center justify-end pt-1">
                <Button
                  type="submit"
                  size="icon"
                  className="h-9 w-9 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8]"
                  disabled={!input.trim() || isLoading}
                  aria-label="Send message"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </form>
        </>
      )}

      {chatMinimized && (
        <button
          type="button"
          className="w-full py-2 text-center text-xs text-slate-500 hover:bg-slate-50"
          onClick={expandChat}
        >
          Tap to continue chatting
        </button>
      )}
    </div>
  )
}
