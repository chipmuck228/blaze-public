import { redirectLegacyAdmin } from "@/lib/admin-legacy-redirects"

export default function LegacyAdminFranchisesRedirect() {
  redirectLegacyAdmin("/admin/blaze/franchises")
}
