/**
 * Normalize external image URLs for next/image and Vercel image optimization.
 * Amilia/RackCDN imports often store paths like https://host.ssl.cf2.rackcdn.com//file.png
 */
export function normalizeRemoteImageUrl(url: string | null | undefined): string | null {
  const raw = String(url ?? "").trim()
  if (!raw) return null
  try {
    const parsed = new URL(raw)
    parsed.pathname = parsed.pathname.replace(/\/{2,}/g, "/")
    return parsed.toString()
  } catch {
    return raw.replace(/([^:]\/)\/+/g, "$1")
  }
}
