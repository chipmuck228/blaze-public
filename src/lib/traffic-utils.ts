/**
 * Traffic analytics utilities — attribution, UA parsing, session cookie.
 * Single source of truth per .cursor/rules/traffic-analytics.mdc
 */

export type TrafficSourceType =
  | 'direct'
  | 'google'
  | 'bing'
  | 'duckduckgo'
  | 'yahoo'
  | 'baidu'
  | 'social'
  | 'other'

export type TrafficChannel =
  | 'direct'
  | 'organic_search'
  | 'social'
  | 'other_referral'

export interface TrafficAttribution {
  source_type: TrafficSourceType
  channel: TrafficChannel
  referrer_domain: string | null
  platform: string | null
}

export const ORGANIC_SEARCH_SOURCE_TYPES: TrafficSourceType[] = [
  'google',
  'bing',
  'duckduckgo',
  'yahoo',
  'baidu',
]

const SEARCH_DOMAIN_RULES: Array<{ source_type: TrafficSourceType; patterns: string[] }> = [
  { source_type: 'google', patterns: ['google.com', 'google.'] },
  { source_type: 'bing', patterns: ['bing.com', 'bing.'] },
  { source_type: 'duckduckgo', patterns: ['duckduckgo.com'] },
  { source_type: 'yahoo', patterns: ['yahoo.com', 'search.yahoo.com'] },
  { source_type: 'baidu', patterns: ['baidu.com'] },
]

const SOCIAL_DOMAIN_RULES: Array<{ platform: string; patterns: string[] }> = [
  { platform: 'Facebook', patterns: ['facebook.com', 'fb.com', 'm.facebook.com'] },
  { platform: 'Instagram', patterns: ['instagram.com'] },
  { platform: 'X (Twitter)', patterns: ['twitter.com', 'x.com', 't.co'] },
  { platform: 'LinkedIn', patterns: ['linkedin.com', 'lnkd.in'] },
  { platform: 'YouTube', patterns: ['youtube.com', 'youtu.be'] },
  { platform: 'Xiaohongshu', patterns: ['xiaohongshu.com', 'xhslink.com'] },
  { platform: 'TikTok', patterns: ['tiktok.com'] },
  { platform: 'Pinterest', patterns: ['pinterest.com', 'pin.it'] },
  { platform: 'Reddit', patterns: ['reddit.com'] },
  { platform: 'WeChat', patterns: ['weixin.qq.com'] },
]

/** Paths excluded from public traffic collection */
export const TRAFFIC_TRACK_SKIP_PREFIXES = [
  '/admin',
  '/coach',
  '/teacher-portal',
  '/api',
]

export function shouldSkipTrafficPath(pagePath: string): boolean {
  return TRAFFIC_TRACK_SKIP_PREFIXES.some((prefix) => pagePath.startsWith(prefix))
}

function hostnameMatches(domain: string, patterns: string[]): boolean {
  const host = domain.toLowerCase()
  return patterns.some((p) => host === p || host.endsWith(`.${p}`) || host.includes(p))
}

export function parseReferrerHostname(referrer: string | null | undefined): string | null {
  if (!referrer?.trim()) return null
  try {
    return new URL(referrer).hostname.toLowerCase()
  } catch {
    return null
  }
}

function isSameSiteReferrer(referrerDomain: string, currentDomain: string): boolean {
  const current = currentDomain.toLowerCase().replace(/^www\./, '')
  const ref = referrerDomain.toLowerCase().replace(/^www\./, '')
  return ref === current || ref === `www.${current}` || current === `www.${ref}`
}

export function channelFromSourceType(sourceType: string): TrafficChannel {
  if (sourceType === 'direct') return 'direct'
  if ((ORGANIC_SEARCH_SOURCE_TYPES as string[]).includes(sourceType)) {
    return 'organic_search'
  }
  if (sourceType === 'social') return 'social'
  return 'other_referral'
}

export function formatSourceTypeLabel(sourceType: string): string {
  const labels: Record<string, string> = {
    direct: 'Direct',
    google: 'Google',
    bing: 'Bing',
    duckduckgo: 'DuckDuckGo',
    yahoo: 'Yahoo',
    baidu: 'Baidu',
    social: 'Social',
    other: 'Other',
  }
  return labels[sourceType] ?? sourceType.charAt(0).toUpperCase() + sourceType.slice(1)
}

export function formatChannelLabel(channel: TrafficChannel): string {
  const labels: Record<TrafficChannel, string> = {
    direct: 'Direct',
    organic_search: 'Search engines',
    social: 'Social media',
    other_referral: 'Other referrals',
  }
  return labels[channel]
}

export function platformLabelFromVisit(
  sourceType: string,
  referrerDomain: string | null
): string | null {
  if (sourceType === 'social' && referrerDomain) {
    for (const rule of SOCIAL_DOMAIN_RULES) {
      if (hostnameMatches(referrerDomain, rule.patterns)) {
        return rule.platform
      }
    }
    return referrerDomain
  }
  if ((ORGANIC_SEARCH_SOURCE_TYPES as string[]).includes(sourceType)) {
    return formatSourceTypeLabel(sourceType)
  }
  return null
}

/**
 * Classify visit attribution from referrer (and optional site host).
 */
export function classifyTrafficAttribution(
  referrer: string | null | undefined,
  currentDomain: string
): TrafficAttribution {
  const referrerDomain = parseReferrerHostname(referrer)
  const domain = currentDomain.toLowerCase().replace(/^www\./, '')

  if (!referrerDomain) {
    return {
      source_type: 'direct',
      channel: 'direct',
      referrer_domain: null,
      platform: null,
    }
  }

  if (isSameSiteReferrer(referrerDomain, domain)) {
    return {
      source_type: 'direct',
      channel: 'direct',
      referrer_domain: referrerDomain,
      platform: null,
    }
  }

  for (const rule of SEARCH_DOMAIN_RULES) {
    if (hostnameMatches(referrerDomain, rule.patterns)) {
      return {
        source_type: rule.source_type,
        channel: 'organic_search',
        referrer_domain: referrerDomain,
        platform: formatSourceTypeLabel(rule.source_type),
      }
    }
  }

  for (const rule of SOCIAL_DOMAIN_RULES) {
    if (hostnameMatches(referrerDomain, rule.patterns)) {
      return {
        source_type: 'social',
        channel: 'social',
        referrer_domain: referrerDomain,
        platform: rule.platform,
      }
    }
  }

  return {
    source_type: 'other',
    channel: 'other_referral',
    referrer_domain: referrerDomain,
    platform: null,
  }
}

/** @deprecated Use classifyTrafficAttribution — kept for TrafficTracker */
export function classifySource(referrer: string | null, currentDomain: string): string {
  return classifyTrafficAttribution(referrer, currentDomain).source_type
}

export function classifyDevice(
  screenWidth: number,
  userAgent: string
): 'mobile' | 'desktop' | 'tablet' {
  const ua = userAgent.toLowerCase()

  if (
    ua.includes('mobile') ||
    ua.includes('android') ||
    ua.includes('iphone') ||
    ua.includes('ipod')
  ) {
    if (ua.includes('ipad') || (ua.includes('android') && screenWidth >= 768)) {
      return 'tablet'
    }
    return 'mobile'
  }

  if (ua.includes('ipad') || ua.includes('tablet')) {
    return 'tablet'
  }

  if (screenWidth < 768) {
    return 'mobile'
  }
  if (screenWidth < 1024) {
    return 'tablet'
  }
  return 'desktop'
}

export function classifyBrowser(userAgent: string): string {
  const ua = userAgent.toLowerCase()

  if (ua.includes('chrome') && ua.includes('mobile')) {
    return 'Chrome Mobile'
  }
  if (ua.includes('safari') && (ua.includes('iphone') || ua.includes('ipad'))) {
    return 'Mobile Safari'
  }
  if (ua.includes('chrome') && !ua.includes('edg')) {
    return 'Chrome'
  }
  if (ua.includes('edg') || ua.includes('edge')) {
    return 'Edge'
  }
  if (ua.includes('firefox')) {
    return 'Firefox'
  }
  if (ua.includes('safari')) {
    return 'Safari'
  }
  if (ua.includes('opera') || ua.includes('opr')) {
    return 'Opera'
  }

  return 'Others'
}

export function classifyOS(userAgent: string): string {
  const ua = userAgent.toLowerCase()

  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
    return 'iOS'
  }
  if (ua.includes('android')) {
    return 'Android'
  }
  if (ua.includes('mac os') || ua.includes('macintosh')) {
    return 'macOS'
  }
  if (ua.includes('windows')) {
    return 'Windows'
  }
  if (ua.includes('linux')) {
    return 'Linux'
  }

  return 'Other'
}

export function getCurrentDomain(): string {
  if (typeof window !== 'undefined') {
    return window.location.hostname
  }
  return ''
}

export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') {
    return ''
  }

  const cookieName = 'traffic_session_id'
  const cookies = document.cookie.split('; ')

  const existingCookie = cookies.find((row) => row.startsWith(`${cookieName}=`))
  if (existingCookie) {
    return existingCookie.split('=')[1]
  }

  const sessionId = crypto.randomUUID()
  const maxAge = 30 * 24 * 60 * 60
  document.cookie = `${cookieName}=${sessionId}; max-age=${maxAge}; path=/; SameSite=Lax`

  return sessionId
}

/** Build sorted breakdown rows for admin charts */
export function buildVisitBreakdown(
  counts: Record<string, number>,
  total: number,
  labelFn: (key: string) => string,
  limit = 10
): Array<{ name: string; visits: number; percentage: number }> {
  return Object.entries(counts)
    .map(([key, visits]) => ({
      name: labelFn(key),
      visits,
      percentage: total > 0 ? Math.round((visits / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, limit)
}
