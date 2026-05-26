import { redirectLegacyAdmin } from "@/lib/admin-legacy-redirects"

export default function LegacyAdminOfferingsRedirect() {
  redirectLegacyAdmin("/admin/blaze/offerings")
}
