'use client'

import { useState, useEffect } from 'react'
import { AIChatDialog } from './AIChatDialog'
import { MessageCircle } from 'lucide-react'

interface AIChatButtonProps {
  franchiseCode: string
  franchiseName: string
}

export function AIChatButton({ franchiseCode, franchiseName }: AIChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  // 监听自定义事件，用于从 "Contact" 按钮打开
  useEffect(() => {
    const handleOpenChat = () => {
      setIsOpen(true)
    }
    window.addEventListener('openAIChat', handleOpenChat)
    return () => {
      window.removeEventListener('openAIChat', handleOpenChat)
    }
  }, [])

  return (
    <>
      <AIChatDialog
        franchiseCode={franchiseCode}
        franchiseName={franchiseName}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
      />
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => setIsOpen(true)}
            className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors flex items-center justify-center"
            aria-label="Open AI chat"
          >
            <MessageCircle className="h-6 w-6" />
          </button>
        </div>
      )}
    </>
  )
}
