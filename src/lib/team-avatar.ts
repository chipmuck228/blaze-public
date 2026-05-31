/**
 * Resolve team member avatar for display and API responses.
 * teams.image_url (admin upload / manual) wins over users.image when usable.
 * Legacy relative paths under /public (e.g. /Dave-W-1.png) are treated as missing.
 */
export function isUsableTeamImageUrl(url: string | null | undefined): boolean {
  const trimmed = (url ?? "").trim()
  if (!trimmed) return false
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return true
  // Archived public/ team files — root-relative paths are no longer served
  if (trimmed.startsWith("/")) return false
  return true
}

export function resolveTeamMemberImageUrl(
  teamImageUrl: string | null | undefined,
  userImage: string | null | undefined
): string {
  const team = (teamImageUrl ?? "").trim()
  const user = (userImage ?? "").trim()
  if (isUsableTeamImageUrl(team)) return team
  if (isUsableTeamImageUrl(user)) return user
  return ""
}
