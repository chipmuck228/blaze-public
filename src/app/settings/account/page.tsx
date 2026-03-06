'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Redirect legacy /settings/account to /profile (Phase 4).
 * Account editing is unified on Profile; Navbar no longer links here.
 */
export default function AccountSettingsRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/profile')
  }, [router])

  return null
}
