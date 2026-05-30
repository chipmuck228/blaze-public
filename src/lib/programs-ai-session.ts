/** Client-side programs catalog AI chat session (localStorage). */

export const PROGRAMS_AI_SESSION_STORAGE_KEY = "blaze-programs-ai-session"

/** End session after 30 minutes without user or assistant activity */
export const PROGRAMS_AI_SESSION_IDLE_MS = 30 * 60 * 1000

export type ProgramsAISessionRecord = {
  sessionId: string
  startedAt: number
  lastActivityAt: number
}

function newSessionId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function createProgramsAISession(): ProgramsAISessionRecord {
  const now = Date.now()
  return {
    sessionId: newSessionId(),
    startedAt: now,
    lastActivityAt: now,
  }
}

export function isProgramsAISessionExpired(
  session: ProgramsAISessionRecord,
  idleMs: number = PROGRAMS_AI_SESSION_IDLE_MS
): boolean {
  return Date.now() - session.lastActivityAt > idleMs
}

export function loadProgramsAISession(): ProgramsAISessionRecord | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(PROGRAMS_AI_SESSION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ProgramsAISessionRecord
    if (!parsed?.sessionId || !parsed.lastActivityAt) return null
    if (isProgramsAISessionExpired(parsed)) {
      localStorage.removeItem(PROGRAMS_AI_SESSION_STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function saveProgramsAISession(session: ProgramsAISessionRecord): void {
  if (typeof window === "undefined") return
  localStorage.setItem(PROGRAMS_AI_SESSION_STORAGE_KEY, JSON.stringify(session))
}

export function touchProgramsAISession(
  session: ProgramsAISessionRecord
): ProgramsAISessionRecord {
  const updated = { ...session, lastActivityAt: Date.now() }
  saveProgramsAISession(updated)
  return updated
}

/** Load active session or create a new one if missing / expired */
export function loadOrCreateProgramsAISession(): ProgramsAISessionRecord {
  const existing = loadProgramsAISession()
  if (existing) return existing
  const created = createProgramsAISession()
  saveProgramsAISession(created)
  return created
}

/** Explicit new conversation — ends prior session and starts fresh */
export function startNewProgramsAISession(): ProgramsAISessionRecord {
  const created = createProgramsAISession()
  saveProgramsAISession(created)
  return created
}

export function clearProgramsAISession(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(PROGRAMS_AI_SESSION_STORAGE_KEY)
}
