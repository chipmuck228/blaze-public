import { redirectLegacyAdmin } from "@/lib/admin-legacy-redirects"

export default function LegacyAdminCategoriesRedirect() {
  redirectLegacyAdmin("/admin/blaze/categories")
}
