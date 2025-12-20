'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from 'ai/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { X, Send, Loader2, MessageCircle, Minimize2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AIChatDialogProps {
  franchiseCode: string
  franchiseName: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function AIChatDialog({
  franchiseCode,
  franchiseName,
  isOpen,
  onOpenChange,
}: AIChatDialogProps) {
  const [isMinimized, setIsMinimized] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/ai/chat',
    body: {
      franchiseCode,
    },
    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: `Hello! I'm the AI assistant for ${franchiseName} campus. How can I help you today? I can answer questions about our location, contact information, and general information about Blaze Robotics Academy.`,
      },
    ],
  })

  // 自动滚动到最新消息
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

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
      <div className="fixed bottom-6 right-6 z-50">
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
    <div className="fixed bottom-6 right-6 z-50 w-[400px] h-[600px] flex flex-col bg-background border rounded-lg shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
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
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[80%] rounded-lg px-4 py-2',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
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
                <p className="text-sm">Sorry, something went wrong. Please try again.</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
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
                handleSubmit(e)
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

