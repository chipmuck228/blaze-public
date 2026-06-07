/**
 * Admin UI labels for user-visible strings (sidebar, page titles, form labels).
 * v2 mode: Web hierarchy terms (Program, Activity). v3 mode: v3 table names (Stage, Series).
 *
 * @see product-hierarchy.mdc
 * @see CATALOG_SCHEMA / NEXT_PUBLIC_CATALOG_SCHEMA
 */
import { isCatalogV3, isCatalogV3Client } from "@/lib/catalog-db"

export type AdminUiLabelEntry = { singular: string; plural: string }

export type AdminUiLabels = {
  franchise: AdminUiLabelEntry
  campus: AdminUiLabelEntry
  category: AdminUiLabelEntry
  program: AdminUiLabelEntry
  instance: AdminUiLabelEntry
  offering: AdminUiLabelEntry
  offeringType: AdminUiLabelEntry
}

/** Web-aligned labels (CATALOG_SCHEMA=v2) */
const ADMIN_UI_LABELS_V2: AdminUiLabels = {
  franchise: { singular: "Campus", plural: "Campuses" },
  campus: { singular: "Location", plural: "Locations" },
  category: { singular: "Program", plural: "Programs" },
  program: { singular: "Activity", plural: "Activities" },
  instance: { singular: "Session", plural: "Sessions" },
  offering: { singular: "Offering", plural: "Offerings" },
  offeringType: { singular: "Offering Type", plural: "Offering Types" },
}

/** v3 catalog table semantics (CATALOG_SCHEMA=v3) */
const ADMIN_UI_LABELS_V3: AdminUiLabels = {
  franchise: { singular: "Campus", plural: "Campuses" },
  campus: { singular: "Location", plural: "Locations" },
  category: { singular: "Stage", plural: "Stages" },
  program: { singular: "Series", plural: "Series" },
  instance: { singular: "Session", plural: "Sessions" },
  offering: { singular: "Offering", plural: "Offerings" },
  offeringType: { singular: "Offering Type", plural: "Offering Types" },
}

function isCatalogV3ForAdminUi(): boolean {
  if (typeof window !== "undefined") {
    return isCatalogV3Client()
  }
  return isCatalogV3()
}

export function getAdminUiLabels(): AdminUiLabels {
  return isCatalogV3ForAdminUi() ? ADMIN_UI_LABELS_V3 : ADMIN_UI_LABELS_V2
}

/** @deprecated Prefer getAdminUiLabels() in client components; property access resolves at call time on server. */
export const adminUiLabels: AdminUiLabels = new Proxy({} as AdminUiLabels, {
  get(_target, prop) {
    const labels = getAdminUiLabels()
    const key = prop as keyof AdminUiLabels
    return labels[key]
  },
})

export type AdminUiLabelKey = keyof AdminUiLabels

/** Singular or plural label for an admin entity key. */
export function adminLabel(
  key: AdminUiLabelKey,
  opts?: { plural?: boolean; count?: number }
): string {
  const entry = getAdminUiLabels()[key]
  if (opts?.count !== undefined) {
    return opts.count === 1 ? entry.singular : entry.plural
  }
  return opts?.plural ? entry.plural : entry.singular
}

/** Action phrase: e.g. adminActionVerb("Add", "program") → "Add Series" (v3) */
export function adminActionVerb(verb: string, key: AdminUiLabelKey): string {
  return `${verb} ${adminLabel(key)}`
}

/** Manage phrase: e.g. adminManage("instance") → "Manage Sessions" */
export function adminManage(key: AdminUiLabelKey): string {
  return `Manage ${adminLabel(key, { plural: true })}`
}
