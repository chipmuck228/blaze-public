"use client"

import { Button } from "@/components/ui/button"
import { PROGRAMS_AI_ASSISTANT_ENABLED } from "@/lib/programs-ai-config"
import { useProgramsAIAssistant } from "@/contexts/programs-ai-assistant-context"
import { cn } from "@/lib/utils"

type OpenProgramsAIChatButtonProps = {
  className?: string
  children?: React.ReactNode
}

export function OpenProgramsAIChatButton({
  className,
  children = "Chat with AI Assistant",
}: OpenProgramsAIChatButtonProps) {
  if (!PROGRAMS_AI_ASSISTANT_ENABLED) return null

  const { openChat } = useProgramsAIAssistant()

  return (
    <Button
      type="button"
      onClick={openChat}
      className={cn(
        "bg-white text-blue-600 px-12 py-5 rounded-full font-black text-xl hover:scale-105 transition-all shadow-xl whitespace-nowrap h-auto",
        className
      )}
    >
      {children}
    </Button>
  )
}
