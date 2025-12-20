'use client'

import { Button } from '@/components/ui/button'

interface ContactButtonProps {
  displayName: string
}

export function ContactButton({ displayName }: ContactButtonProps) {
  const handleClick = () => {
    // 触发 AI Chat Dialog 打开
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('openAIChat')
      window.dispatchEvent(event)
    }
  }

  return (
    <Button variant="outline" size="lg" onClick={handleClick}>
      Contact {displayName}
    </Button>
  )
}

