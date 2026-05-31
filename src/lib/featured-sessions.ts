import { normalizeRemoteImageUrl } from "@/lib/normalize-image-url"
import type { StringKeyRecord } from "@/lib/typed-error"

export interface FeaturedSession {
  id: string
  title: string
  description: string | null
  poster_url: string | null
  href: string
  /** Web Campus — `v2_franchise` */
  franchise: { code: string; name: string } | null
  /** Web Location — `v2_campus` physical site */
  webLocation: { name: string; display_name: string } | null
  category: { name: string; display_name: string } | null
}

export const FEATURED_INSTANCE_SELECT = `
  id,
  start_date,
  start_time,
  campus_id,
  campus:v2_campus(
    id,
    name,
    display_name
  ),
  program:v2_program!inner(
    id,
    name,
    display_name,
    description,
    poster_url,
    franchise_id,
    category:v2_category(
      id,
      name,
      display_name
    ),
    franchise:v2_franchise(
      id,
      code,
      name,
      is_active
    )
  ),
  offering:v2_offering(
    id,
    name,
    description,
    poster_url,
    status,
    category:v2_category(
      id,
      name,
      display_name
    )
  )
`

export function categoryNameToSlug(name: string): string {
  return (name || "").replace(/_/g, "-")
}

export function buildInstanceDetailHref(
  instanceId: string,
  categoryName: string,
  franchiseCode?: string | null
): string {
  const slug = categoryNameToSlug(categoryName)
  const base = `/category/${encodeURIComponent(slug)}/instance/${encodeURIComponent(instanceId)}`
  if (franchiseCode) {
    return `${base}?location=${encodeURIComponent(franchiseCode)}`
  }
  return base
}

export function mapInstanceRowToFeaturedSession(row: unknown): FeaturedSession | null {
  if (!row || typeof row !== "object") return null
  const record = row as Record<string, unknown>
  const program = (Array.isArray(record.program) ? record.program[0] : record.program) as
    | Record<string, unknown>
    | undefined
  const offering = (Array.isArray(record.offering) ? record.offering[0] : record.offering) as
    | Record<string, unknown>
    | undefined
  if (!program || !offering || offering.status !== "published") return null

  const offeringCategory = (Array.isArray(offering.category)
    ? offering.category[0]
    : offering.category) as Record<string, unknown> | undefined
  const programCategory = (Array.isArray(program.category) ? program.category[0] : program.category) as
    | Record<string, unknown>
    | undefined
  const category = offeringCategory ?? programCategory
  const franchise = (Array.isArray(program.franchise) ? program.franchise[0] : program.franchise) as
    | Record<string, unknown>
    | undefined
  if (franchise && franchise.is_active === false) return null
  if (!category?.name || typeof category.name !== "string") return null

  const franchiseCode =
    typeof franchise?.code === "string" ? franchise.code : null
  const campus = (Array.isArray(record.campus) ? record.campus[0] : record.campus) as
    | Record<string, unknown>
    | undefined
  const instanceId = typeof record.id === "string" ? record.id : String(record.id ?? "")

  return {
    id: instanceId,
    title: String(offering.name || program.display_name || program.name || ""),
    description: (offering.description ?? program.description ?? null) as string | null,
    poster_url:
      normalizeRemoteImageUrl(
        typeof offering.poster_url === "string" ? offering.poster_url : null
      ) ??
      normalizeRemoteImageUrl(
        typeof program.poster_url === "string" ? program.poster_url : null
      ),
    href: buildInstanceDetailHref(instanceId, category.name, franchiseCode),
    franchise: franchise
      ? {
          code: String(franchise.code ?? ""),
          name: String(franchise.name ?? ""),
        }
      : null,
    webLocation: campus
      ? {
          name: String(campus.name ?? ""),
          display_name: String(campus.display_name ?? campus.name ?? ""),
        }
      : null,
    category: {
      name: category.name,
      display_name: String(category.display_name ?? category.name),
    },
  }
}

export function sortFeaturedInstanceRows(rows: unknown[]): unknown[] {
  return [...rows].sort((a, b) => {
    const rowA = (a && typeof a === "object" ? a : {}) as Record<string, unknown>
    const rowB = (b && typeof b === "object" ? b : {}) as Record<string, unknown>
    const sa = rowA.start_date ?? ""
    const sb = rowB.start_date ?? ""
    if (sa !== sb) return String(sa).localeCompare(String(sb))
    return String(rowA.start_time ?? "").localeCompare(String(rowB.start_time ?? ""))
  })
}
