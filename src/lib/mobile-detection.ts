/**
 * 移动浏览器检测工具
 * 用于检测用户是否在移动浏览器中访问网站
 */

/**
 * 检测是否为移动浏览器
 * @returns {boolean} 是否为移动浏览器
 */
export function isMobileBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
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
  
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  return /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
}

/**
 * 检测是否为 Android 设备
 * @returns {boolean} 是否为 Android
 */
export function isAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
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

