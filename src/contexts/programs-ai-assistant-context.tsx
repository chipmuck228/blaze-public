"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

type ProgramsAIAssistantContextValue = {
  launcherCollapsed: boolean
  setLauncherCollapsed: (collapsed: boolean) => void
  chatOpen: boolean
  chatMinimized: boolean
  openChat: () => void
  closeChat: () => void
  minimizeChat: () => void
  expandChat: () => void
  toggleLauncherCollapsed: () => void
}

const ProgramsAIAssistantContext =
  createContext<ProgramsAIAssistantContextValue | null>(null)

export function ProgramsAIAssistantProvider({ children }: { children: ReactNode }) {
  const [launcherCollapsed, setLauncherCollapsed] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMinimized, setChatMinimized] = useState(false)

  const openChat = useCallback(() => {
    setChatOpen(true)
    setChatMinimized(false)
    setLauncherCollapsed(true)
  }, [])

  const closeChat = useCallback(() => {
    setChatOpen(false)
    setChatMinimized(false)
  }, [])

  const minimizeChat = useCallback(() => {
    setChatMinimized(true)
  }, [])

  const expandChat = useCallback(() => {
    setChatMinimized(false)
  }, [])

  const toggleLauncherCollapsed = useCallback(() => {
    setLauncherCollapsed((prev) => !prev)
  }, [])

  const value = useMemo(
    () => ({
      launcherCollapsed,
      setLauncherCollapsed,
      chatOpen,
      chatMinimized,
      openChat,
      closeChat,
      minimizeChat,
      expandChat,
      toggleLauncherCollapsed,
    }),
    [
      launcherCollapsed,
      chatOpen,
      chatMinimized,
      openChat,
      closeChat,
      minimizeChat,
      expandChat,
      toggleLauncherCollapsed,
    ]
  )

  return (
    <ProgramsAIAssistantContext.Provider value={value}>
      {children}
    </ProgramsAIAssistantContext.Provider>
  )
}

export function useProgramsAIAssistant(): ProgramsAIAssistantContextValue {
  const ctx = useContext(ProgramsAIAssistantContext)
  if (!ctx) {
    throw new Error(
      "useProgramsAIAssistant must be used within ProgramsAIAssistantProvider"
    )
  }
  return ctx
}

/** Safe hook for pages that may render outside provider */
export function useProgramsAIAssistantOptional():
  | ProgramsAIAssistantContextValue
  | null {
  return useContext(ProgramsAIAssistantContext)
}
