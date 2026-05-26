import { redirectLegacyAdmin } from "@/lib/admin-legacy-redirects"

export default function LegacyAdminLocationsRedirect() {
  redirectLegacyAdmin("/admin/blaze/campuses")
}
