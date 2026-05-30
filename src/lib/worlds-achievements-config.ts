/**
 * Home page VEX Worlds achievements band.
 * Set NEXT_PUBLIC_WORLDS_ACHIEVEMENTS_SECTION_ENABLED=true to show WorldsAchievementsSection.
 */
export function parseWorldsAchievementsSectionEnabled(
  raw: string | undefined
): boolean {
  if (raw == null || raw.trim() === "") return false
  const v = raw.trim().toLowerCase()
  if (v === "false" || v === "0" || v === "no" || v === "off") return false
  return v === "true" || v === "1" || v === "yes" || v === "on"
}

export const WORLDS_ACHIEVEMENTS_SECTION_ENABLED =
  parseWorldsAchievementsSectionEnabled(
    process.env.NEXT_PUBLIC_WORLDS_ACHIEVEMENTS_SECTION_ENABLED
  )
