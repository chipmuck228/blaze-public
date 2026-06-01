import { redirectLegacyAdmin } from "@/lib/admin-legacy-redirects"

export default function LegacyAdminAssignmentsRedirect() {
  redirectLegacyAdmin("/admin/guide")
}
