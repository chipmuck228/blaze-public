"use client"

import { Button } from "@/components/ui/button"
import {
  Bot,
  ChevronRight,
  MessageCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useProgramsAIAssistant } from "@/contexts/programs-ai-assistant-context"

export function ProgramsAILauncher() {
  const {
    launcherCollapsed,
    chatOpen,
    openChat,
    toggleLauncherCollapsed,
    setLauncherCollapsed,
  } = useProgramsAIAssistant()

  if (chatOpen && launcherCollapsed) {
    return null
  }

  if (launcherCollapsed) {
    return (
      <button
        type="button"
        onClick={() => setLauncherCollapsed(false)}
        className={cn(
          "fixed z-[90] bottom-4 right-4 sm:bottom-6 sm:right-6",
          "h-14 w-14 rounded-full bg-[#2563eb] text-white shadow-lg",
          "flex items-center justify-center hover:bg-[#1d4ed8] transition-all",
          "hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
        )}
        aria-label="Open Blaze Robotics assistant"
      >
        <MessageCircle className="h-7 w-7" />
      </button>
    )
  }

  return (
    <div
      className={cn(
        "fixed z-[90] bottom-4 right-4 sm:bottom-6 sm:right-6",
        "flex items-stretch gap-0 max-w-[min(calc(100vw-2rem),420px)]"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3 bg-white rounded-2xl shadow-xl border border-slate-200/90",
          "pl-4 pr-2 py-3"
        )}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 leading-snug">
            Need help? Blaze Robotics is online!
          </p>
          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            Online
          </p>
        </div>
        <Button
          type="button"
          className="rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold px-5 shrink-0"
          onClick={openChat}
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          Chat
        </Button>
        <button
          type="button"
          onClick={toggleLauncherCollapsed}
          className="ml-1 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 shrink-0"
          aria-label="Collapse assistant"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <div
        className="hidden sm:flex items-center justify-center -ml-2"
        aria-hidden
      >
        <div className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 border-4 border-white shadow-md flex items-center justify-center">
          <Bot className="h-7 w-7 text-white" />
        </div>
      </div>
    </div>
  )
}
