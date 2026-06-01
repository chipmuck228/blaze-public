'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Redirect legacy /settings/notifications to Profile Communications (Phase 4).
 * Notification preferences are unified on Profile; only one place is kept.
 */
export default function NotificationSettingsRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/profile#communications')
  }, [router])

  return null
}
