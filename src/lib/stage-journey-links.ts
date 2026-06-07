import { getStageJourneyByStageName } from "@/lib/stage-journey-config"

/** Append ?location= for journey pages when user has a campus context. */
export function appendCampusToNavLink(link: string, campusCode: string | null | undefined): string {
  const trimmed = link.trim()
  if (!campusCode?.trim()) return trimmed
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed

  const hashIdx = trimmed.indexOf("#")
  const beforeHash = hashIdx >= 0 ? trimmed.slice(0, hashIdx) : trimmed
  const hash = hashIdx >= 0 ? trimmed.slice(hashIdx) : ""

  const [path, query = ""] = beforeHash.split("?")
  if (!path.startsWith("/journey/")) return trimmed

  const params = new URLSearchParams(query)
  params.set("location", campusCode.toLowerCase().trim())
  const qs = params.toString()
  return `${path}?${qs}${hash}`
}

/** Journey URL for a stage from v3_stage.link or config fallback, with optional campus. */
export function journeyHrefForStage(
  stageLink: string | null | undefined,
  stageName: string,
  campusCode: string
): string {
  const fromLink = stageLink?.trim()
  const fromConfig = getStageJourneyByStageName(stageName)?.journeyPath
  const base = fromLink || fromConfig || `/journey/${encodeURIComponent(stageName)}`
  return appendCampusToNavLink(base, campusCode)
}
