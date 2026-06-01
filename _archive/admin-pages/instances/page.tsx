import { redirectLegacyAdmin } from "@/lib/admin-legacy-redirects"

export default function LegacyAdminInstancesRedirect() {
  redirectLegacyAdmin("/admin/blaze/instance")
}
