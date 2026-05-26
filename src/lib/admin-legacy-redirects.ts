import { redirect } from "next/navigation"

/** Thin redirect targets for legacy admin routes (archived under _archive/admin-pages/). */
export function redirectLegacyAdmin(target: string): never {
  redirect(target)
}

export const LEGACY_ADMIN_REDIRECTS = {
  series: "/admin/blaze/programs",
  instances: "/admin/blaze/instance",
  assignments: "/admin/guide",
  offerings: "/admin/blaze/offerings",
  categories: "/admin/blaze/categories",
  franchises: "/admin/blaze/franchises",
  locations: "/admin/blaze/campuses",
  "offering-types": "/admin/blaze/offering-types",
  courses: "/admin/guide",
  subcategories: "/admin/guide",
  "offerings-assignments": "/admin/guide",
} as const
