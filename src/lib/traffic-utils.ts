/**
 * Traffic Analytics 工具函数
 * 用于解析 User-Agent、分类访问来源、设备类型等
 */

// 访问来源分类
export function classifySource(referrer: string | null, currentDomain: string): string {
  if (!referrer || referrer === '') {
    return 'direct'
  }

  try {
    const referrerUrl = new URL(referrer)
    const referrerDomain = referrerUrl.hostname

    // 如果 referrer 是当前域名，视为直接访问
    if (referrerDomain === currentDomain || referrerDomain === `www.${currentDomain}`) {
      return 'direct'
    }

    // Google 搜索
    if (referrerDomain.includes('google.com') || referrerDomain.includes('google.')) {
      return 'google'
    }

    // Bing 搜索
    if (referrerDomain.includes('bing.com') || referrerDomain.includes('bing.')) {
      return 'bing'
    }

    // 社交媒体
    const socialDomains = [
      'facebook.com',
      'instagram.com',
      'twitter.com',
      'x.com',
      'linkedin.com',
      'youtube.com',
      'xiaohongshu.com',
      'tiktok.com',
      'pinterest.com',
    ]

    if (socialDomains.some((domain) => referrerDomain.includes(domain))) {
      return 'social'
    }

    return 'other'
  } catch {
    // URL 解析失败，视为其他来源
    return 'other'
  }
}

// 设备类型分类（基于屏幕尺寸和 User-Agent）
export function classifyDevice(
  screenWidth: number,
  userAgent: string
): 'mobile' | 'desktop' | 'tablet' {
  // 简单的 User-Agent 检测
  const ua = userAgent.toLowerCase()

  // 移动设备关键词
  if (
    ua.includes('mobile') ||
    ua.includes('android') ||
    ua.includes('iphone') ||
    ua.includes('ipod')
  ) {
    // 进一步判断是否为平板
    if (ua.includes('ipad') || (ua.includes('android') && screenWidth >= 768)) {
      return 'tablet'
    }
    return 'mobile'
  }

  // 平板设备关键词
  if (ua.includes('ipad') || ua.includes('tablet')) {
    return 'tablet'
  }

  // 基于屏幕尺寸判断
  if (screenWidth < 768) {
    return 'mobile'
  } else if (screenWidth < 1024) {
    return 'tablet'
  } else {
    return 'desktop'
  }
}

// 浏览器类型分类（基于 User-Agent）
export function classifyBrowser(userAgent: string): string {
  const ua = userAgent.toLowerCase()

  // Chrome Mobile
  if (ua.includes('chrome') && ua.includes('mobile')) {
    return 'Chrome Mobile'
  }

  // Mobile Safari
  if (ua.includes('safari') && (ua.includes('iphone') || ua.includes('ipad'))) {
    return 'Mobile Safari'
  }

  // Chrome (桌面版)
  if (ua.includes('chrome') && !ua.includes('edg')) {
    return 'Chrome'
  }

  // Edge
  if (ua.includes('edg') || ua.includes('edge')) {
    return 'Edge'
  }

  // Firefox
  if (ua.includes('firefox')) {
    return 'Firefox'
  }

  // Safari (桌面版)
  if (ua.includes('safari')) {
    return 'Safari'
  }

  // Opera
  if (ua.includes('opera') || ua.includes('opr')) {
    return 'Opera'
  }

  return 'Others'
}

// 操作系统分类（基于 User-Agent）
export function classifyOS(userAgent: string): string {
  const ua = userAgent.toLowerCase()

  // iOS
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
    return 'iOS'
  }

  // Android
  if (ua.includes('android')) {
    return 'Android'
  }

  // macOS
  if (ua.includes('mac os') || ua.includes('macintosh')) {
    return 'macOS'
  }

  // Windows
  if (ua.includes('windows')) {
    return 'Windows'
  }

  // Linux
  if (ua.includes('linux')) {
    return 'Linux'
  }

  return 'Other'
}

// 获取当前域名
export function getCurrentDomain(): string {
  if (typeof window !== 'undefined') {
    return window.location.hostname
  }
  return ''
}

// 生成或获取 Session ID
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') {
    return ''
  }

  const cookieName = 'traffic_session_id'
  const cookies = document.cookie.split('; ')

  // 查找现有的 session_id
  const existingCookie = cookies.find((row) => row.startsWith(`${cookieName}=`))
  if (existingCookie) {
    return existingCookie.split('=')[1]
  }

  // 生成新的 session_id
  const sessionId = crypto.randomUUID()
  const maxAge = 30 * 24 * 60 * 60 // 30 天
  document.cookie = `${cookieName}=${sessionId}; max-age=${maxAge}; path=/; SameSite=Lax`

  return sessionId
}
