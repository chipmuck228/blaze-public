"use client"

import { Suspense, type ReactNode } from "react"
import { PROGRAMS_AI_ASSISTANT_ENABLED } from "@/lib/programs-ai-config"
import { ProgramsAIAssistantProvider } from "@/contexts/programs-ai-assistant-context"
import { ProgramsAILauncher } from "@/components/programs-ai/ProgramsAILauncher"
import { ProgramsAIChatPanel } from "@/components/programs-ai/ProgramsAIChatPanel"

function ProgramsAIChatPanelLoader() {
  return (
    <Suspense fallback={null}>
      <ProgramsAIChatPanel />
    </Suspense>
  )
}

/** Fixed bottom-right programs catalog AI assistant (DeepSeek). */
export function ProgramsAIAssistant({ children }: { children?: ReactNode }) {
  if (!PROGRAMS_AI_ASSISTANT_ENABLED) {
    return <>{children}</>
  }

  return (
    <ProgramsAIAssistantProvider>
      {children}
      <ProgramsAILauncher />
      <ProgramsAIChatPanelLoader />
    </ProgramsAIAssistantProvider>
  )
}
