/**
 * Programs catalog AI assistant feature flag.
 * Set NEXT_PUBLIC_PROGRAMS_AI_ASSISTANT_ENABLED=true to show UI and allow chat API.
 */
export function parseProgramsAIAssistantEnabled(
  raw: string | undefined
): boolean {
  if (raw == null || raw.trim() === "") return false
  const v = raw.trim().toLowerCase()
  if (v === "false" || v === "0" || v === "no" || v === "off") return false
  return v === "true" || v === "1" || v === "yes" || v === "on"
}

export const PROGRAMS_AI_ASSISTANT_ENABLED = parseProgramsAIAssistantEnabled(
  process.env.NEXT_PUBLIC_PROGRAMS_AI_ASSISTANT_ENABLED
)
