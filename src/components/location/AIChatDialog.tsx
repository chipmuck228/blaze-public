'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { X, Send, Loader2, MessageCircle, Minimize2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AIChatDialogProps {
  franchiseCode?: string
  franchiseName?: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function AIChatDialog({
  franchiseCode = 'general',
  franchiseName = 'Blaze Robotics Academy',
  isOpen,
  onOpenChange,
}: AIChatDialogProps) {
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
            text: `Hello! I'm the AI assistant for ${franchiseName} campus. How can I help you today? I can answer questions about our location, contact information, and general information about Blaze Robotics Academy.`,
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

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  // 处理提交
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input.trim() })
    setInput('')
  }

  // 处理最小化
  const handleMinimize = () => {
    setIsMinimized(true)
  }

  // 处理展开
  const handleExpand = () => {
    setIsMinimized(false)
  }

  // 处理关闭
  const handleClose = () => {
    onOpenChange(false)
    setIsMinimized(false)
  }

  if (!isOpen) {
    return null
  }

  // 最小化状态：只显示图标按钮
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-[100]">
        <Button
          onClick={handleExpand}
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg"
          aria-label="Open AI chat"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
    )
  }

  // 展开状态：显示完整对话框
  return (
    <div className="fixed bottom-6 right-6 z-[100] w-[400px] h-[600px] flex flex-col bg-background border rounded-lg shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <h3 className="font-semibold">AI Assistant - {franchiseName}</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleMinimize}
            className="h-8 w-8"
            aria-label="Minimize chat"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8"
            aria-label="Close chat"
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
                  <span className="text-sm text-muted-foreground">AI is typing...</span>
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
      <form onSubmit={handleSubmit} className="p-4 border-t shrink-0">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                const form = e.currentTarget.closest('form')
                if (form) {
                  const formEvent = new Event('submit', { bubbles: true, cancelable: true })
                  form.dispatchEvent(formEvent)
                }
              }
            }}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

