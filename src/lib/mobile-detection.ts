/**
 * 移动浏览器检测工具
 * 用于检测用户是否在移动浏览器中访问网站
 */

interface LegacyNavigatorWindow extends Window {
  opera?: string
  MSStream?: unknown
}

function getNavigatorUserAgent(): string {
  if (typeof window === "undefined") return ""
  const w = window as LegacyNavigatorWindow
  return navigator.userAgent || navigator.vendor || w.opera || ""
}

/**
 * 检测是否为移动浏览器
 * @returns {boolean} 是否为移动浏览器
 */
export function isMobileBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = getNavigatorUserAgent();
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
  const isSmallScreen = window.innerWidth <= 768;
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  return isMobile || (isSmallScreen && hasTouch);
}

/**
 * 获取设备断点类型
 * @returns {'mobile' | 'tablet' | 'desktop'} 设备类型
 */
export function getMobileBreakpoint(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  
  const width = window.innerWidth;
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

/**
 * 检测是否为 iOS 设备
 * @returns {boolean} 是否为 iOS
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = getNavigatorUserAgent();
  const w = window as LegacyNavigatorWindow
  return /iPad|iPhone|iPod/.test(userAgent) && !w.MSStream;
}

/**
 * 检测是否为 Android 设备
 * @returns {boolean} 是否为 Android
 */
export function isAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = getNavigatorUserAgent();
  return /Android/.test(userAgent);
}

/**
 * 检测是否支持触摸
 * @returns {boolean} 是否支持触摸
 */
export function hasTouchSupport(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

