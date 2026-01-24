'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { X, Send, Loader2, Minimize2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AIAssessmentDialogProps {
  franchiseCode?: string
  franchiseName?: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function AIAssessmentDialog({
  franchiseCode = 'general',
  franchiseName = 'Blaze Robotics Academy',
  isOpen,
  onOpenChange,
}: AIAssessmentDialogProps) {
  const [isMinimized, setIsMinimized] = useState(false)
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/ai/chat',
      body: {
        franchiseCode,
      },
    }),
    messages: [
      {
        id: 'welcome',
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: `Hello! I'm here to help you find the perfect program for your student. I can assess their experience level, age, grade, and interests to recommend the best fit from our programs at ${franchiseName}. 

To get started, please tell me:
- Your student's age or grade level
- Their previous experience with robotics or programming (if any)
- What interests them most (building robots, coding, competitions, etc.)

Let's find the perfect program together!`,
          },
        ],
      },
    ],
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  // 将技术性错误转换为用户友好的消息
  const getFriendlyErrorMessage = (error: Error | undefined): string => {
    if (!error) return 'Sorry, something went wrong. Please try again.'

    const errorMessage = error.message.toLowerCase()

    // 网络连接错误
    if (
      errorMessage.includes('timeout') ||
      errorMessage.includes('network') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('connection')
    ) {
      return "I'm having trouble connecting right now. Please check your internet connection and try again in a moment."
    }

    // API 错误
    if (
      errorMessage.includes('api') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('forbidden')
    ) {
      return "I'm temporarily unavailable. Please try again in a few moments, or contact our campus directly for immediate assistance."
    }

    // 服务器错误
    if (
      errorMessage.includes('server') ||
      errorMessage.includes('500') ||
      errorMessage.includes('internal')
    ) {
      return "I'm experiencing some technical difficulties. Please try again in a moment, or feel free to contact our campus directly."
    }

    // 配额/限制错误
    if (
      errorMessage.includes('quota') ||
      errorMessage.includes('limit') ||
      errorMessage.includes('rate limit')
    ) {
      return "I'm currently processing many requests. Please try again in a moment."
    }

    // 默认友好消息
    return "I encountered an issue processing your request. Please try again, or contact our campus directly for assistance."
  }

  // 自动滚动到最新消息
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    await sendMessage(userMessage)
  }

  if (!isOpen) return null

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-end justify-center sm:items-center',
        isMinimized && 'pointer-events-none'
      )}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog */}
      <div
        className={cn(
          'relative w-full sm:w-[500px] h-[600px] sm:h-[700px] bg-background border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col',
          isMinimized && 'translate-y-[calc(100%-60px)]'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">AI</span>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">AI Program Assessment</h3>
              <p className="text-xs text-muted-foreground">{franchiseName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-8 w-8"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-4">
            {messages.map((message) => {
              const isUser = (message.role as string) === 'user'
              return (
                <div
                  key={message.id}
                  className={cn(
                    'flex',
                    isUser ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[80%] rounded-lg px-4 py-2',
                      isUser
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    )}
                  >
                    {message.parts.map((part, i) => {
                      if (part.type === 'text') {
                        return (
                          <p key={`${message.id}-${i}`} className="text-sm whitespace-pre-wrap">
                            {part.text}
                          </p>
                        )
                      }
                      return null
                    })}
                  </div>
                </div>
              )
            })}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            {error && (
              <div className="flex justify-start">
                <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-2">
                  <p className="text-sm">
                    {getFriendlyErrorMessage(error)}
                  </p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tell me about your student..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={!input.trim() || isLoading} size="icon">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
