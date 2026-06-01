import { redirectLegacyAdmin } from "@/lib/admin-legacy-redirects"

export default function LegacyAdminOfferingsAssignmentsRedirect() {
  redirectLegacyAdmin("/admin/guide")
}
