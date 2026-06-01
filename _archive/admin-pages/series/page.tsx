import { redirectLegacyAdmin } from "@/lib/admin-legacy-redirects"

export default function LegacyAdminSeriesRedirect() {
  redirectLegacyAdmin("/admin/blaze/programs")
}
