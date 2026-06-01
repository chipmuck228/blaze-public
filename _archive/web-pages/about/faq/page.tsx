'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Legacy URL: /about/faq redirects to /faq (canonical FAQ page for SEO).
 * Primary redirect is configured in next.config.ts (301); this is a fallback.
 */
export default function AboutFaqRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/faq')
  }, [router])

  return null
}
