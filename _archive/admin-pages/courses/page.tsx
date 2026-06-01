import { redirectLegacyAdmin } from "@/lib/admin-legacy-redirects"

export default function LegacyAdminCoursesRedirect() {
  redirectLegacyAdmin("/admin/guide")
}
