import { redirectLegacyAdmin } from "@/lib/admin-legacy-redirects"

export default function LegacyAdminSubcategoriesRedirect() {
  redirectLegacyAdmin("/admin/guide")
}
