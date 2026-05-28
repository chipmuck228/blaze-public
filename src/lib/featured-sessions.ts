export interface FeaturedSession {
  id: string
  title: string
  description: string | null
  poster_url: string | null
  href: string
  franchise: { code: string; name: string } | null
  category: { name: string; display_name: string } | null
}

export const FEATURED_INSTANCE_SELECT = `
  id,
  start_date,
  start_time,
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

export function mapInstanceRowToFeaturedSession(row: any): FeaturedSession | null {
  const program = Array.isArray(row.program) ? row.program[0] : row.program
  const offering = Array.isArray(row.offering) ? row.offering[0] : row.offering
  if (!program || !offering || offering.status !== "published") return null

  const offeringCategory = Array.isArray(offering.category)
    ? offering.category[0]
    : offering.category
  const programCategory = Array.isArray(program.category) ? program.category[0] : program.category
  const category = offeringCategory ?? programCategory
  const franchise = Array.isArray(program.franchise) ? program.franchise[0] : program.franchise
  if (franchise && franchise.is_active === false) return null
  if (!category?.name) return null

  const franchiseCode = franchise?.code ?? null

  return {
    id: row.id,
    title: offering.name || program.display_name || program.name,
    description: offering.description ?? program.description ?? null,
    poster_url: offering.poster_url ?? program.poster_url ?? null,
    href: buildInstanceDetailHref(row.id, category.name, franchiseCode),
    franchise: franchise
      ? { code: franchise.code ?? "", name: franchise.name ?? "" }
      : null,
    category: {
      name: category.name,
      display_name: category.display_name ?? category.name,
    },
  }
}

export function sortFeaturedInstanceRows(rows: any[]): any[] {
  return [...rows].sort((a, b) => {
    const sa = a?.start_date ?? ""
    const sb = b?.start_date ?? ""
    if (sa !== sb) return String(sa).localeCompare(String(sb))
    return String(a?.start_time ?? "").localeCompare(String(b?.start_time ?? ""))
  })
}
