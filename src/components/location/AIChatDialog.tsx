'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { X, Send, Loader2, MessageCircle, Minimize2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I'm the AI assistant for ${franchiseName} campus. How can I help you today? I can answer questions about our location, contact information, and general information about Blaze Robotics Academy.`,
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

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
  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (!input.trim() || isLoading) return

      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: input.trim(),
      }

      // 添加用户消息
      setMessages((prev) => [...prev, userMessage])
      setInput('')
      setIsLoading(true)
      setError(null)

      // 取消之前的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // 创建新的 AbortController
      const abortController = new AbortController()
      abortControllerRef.current = abortController

      try {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            franchiseCode,
          }),
          signal: abortController.signal,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to get response')
        }

        if (!response.body) {
          throw new Error('No response body')
        }

        // 创建助手消息
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '',
        }
        setMessages((prev) => [...prev, assistantMessage])

        // 读取流式响应 (SSE 格式)
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // 保留最后一个不完整的行

          for (const line of lines) {
            if (line.startsWith('0:')) {
              // 文本流格式: 0:content
              const content = line.slice(2)
              if (content) {
                setMessages((prev) => {
                  const newMessages = [...prev]
                  const lastMessage = newMessages[newMessages.length - 1]
                  if (lastMessage && lastMessage.role === 'assistant') {
                    lastMessage.content += content
                  }
                  return newMessages
                })
              }
            } else if (line.startsWith('data: ')) {
              // SSE 格式: data: {...}
              try {
                const data = JSON.parse(line.slice(6))
                if (data.text) {
                  setMessages((prev) => {
                    const newMessages = [...prev]
                    const lastMessage = newMessages[newMessages.length - 1]
                    if (lastMessage && lastMessage.role === 'assistant') {
                      lastMessage.content = data.text
                    }
                    return newMessages
                  })
                }
              } catch {
                // 忽略 JSON 解析错误
              }
            }
          }
        }

        // 处理剩余的 buffer
        if (buffer.trim()) {
          if (buffer.startsWith('0:')) {
            const content = buffer.slice(2)
            if (content) {
              setMessages((prev) => {
                const newMessages = [...prev]
                const lastMessage = newMessages[newMessages.length - 1]
                if (lastMessage && lastMessage.role === 'assistant') {
                  lastMessage.content += content
                }
                return newMessages
              })
            }
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return // 请求被取消，不需要处理
        }
        console.error('Error sending message:', err)
        setError(err.message || 'Failed to send message')
        // 移除最后添加的助手消息（如果有错误）
        setMessages((prev) => {
          if (prev[prev.length - 1]?.role === 'assistant' && !prev[prev.length - 1].content) {
            return prev.slice(0, -1)
          }
          return prev
        })
      } finally {
        setIsLoading(false)
        abortControllerRef.current = null
      }
    },
    [input, messages, franchiseCode, isLoading]
  )

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

