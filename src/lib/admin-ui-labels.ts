/**
 * Admin UI labels aligned with Web product hierarchy (see product-hierarchy.mdc).
 * Use for user-visible strings only — not API paths, DB columns, or TS identifiers.
 */
export const adminUiLabels = {
  /** v2_franchise */
  franchise: { singular: "Campus", plural: "Campuses" },
  /** v2_campus */
  campus: { singular: "Location", plural: "Locations" },
  /** v2_category */
  category: { singular: "Program", plural: "Programs" },
  /** v2_program */
  program: { singular: "Activity", plural: "Activities" },
  /** v2_instance */
  instance: { singular: "Session", plural: "Sessions" },
  offering: { singular: "Offering", plural: "Offerings" },
  offeringType: { singular: "Offering Type", plural: "Offering Types" },
} as const

export type AdminUiLabelKey = keyof typeof adminUiLabels

/** Singular or plural label for an admin entity key. */
export function adminLabel(
  key: AdminUiLabelKey,
  opts?: { plural?: boolean; count?: number }
): string {
  const entry = adminUiLabels[key]
  if (opts?.count !== undefined) {
    return opts.count === 1 ? entry.singular : entry.plural
  }
  return opts?.plural ? entry.plural : entry.singular
}

/** Action phrase: e.g. adminActionVerb("Add", "program") → "Add Activity" */
export function adminActionVerb(verb: string, key: AdminUiLabelKey): string {
  return `${verb} ${adminLabel(key)}`
}

/** Manage phrase: e.g. adminManage("instance") → "Manage Sessions" */
export function adminManage(key: AdminUiLabelKey): string {
  return `Manage ${adminLabel(key, { plural: true })}`
}
